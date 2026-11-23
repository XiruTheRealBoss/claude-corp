// Pure state reducer: Claude Code hook events -> city of companies.
const DEPTS = [
  // floor order, bottom to top (CEO sits on the top floor "diretoria")
  { id: 'brainstorming', nome: 'Brainstorming' },
  { id: 'pesquisa', nome: 'Pesquisa & Referências' },
  { id: 'planejamento', nome: 'Planejamento' },
  { id: 'prototipo', nome: 'Protótipo & Design' },
  { id: 'desenvolvimento', nome: 'Desenvolvimento' },
  { id: 'qualidade', nome: 'Qualidade (QA)' },
  { id: 'lancamento', nome: 'Lançamento' },
  { id: 'diretoria', nome: 'Diretoria' },
];

// keyword -> [cargo, departamento, acessório]
const ROLES = [
  [/pesquis|research|explor|refer|busca|scout/i, 'Pesquisador', 'pesquisa', 'lupa'],
  [/brainstorm|criativ|ideia|idea/i, 'Criativo', 'brainstorming', 'lampada'],
  [/gerente|planej|plan|pm\b|produto|product|scrum/i, 'Gerente de Projeto', 'planejamento', 'prancheta'],
  [/arquitet|architect/i, 'Arquiteto', 'planejamento', 'regua'],
  [/artist|arte|ilustr|desenh|art\b/i, 'Artista', 'prototipo', 'lapis'],
  [/design|ui|ux|prot[oó]tip|prototype|wireframe/i, 'Designer', 'prototipo', 'pincel'],
  [/qa\b|test|revis|review|qualid|secur|seguran|audit/i, 'QA', 'qualidade', 'escudo'],
  [/market|lan[cç]a|launch|redat|writer|copy|doc/i, 'Marketing', 'lancamento', 'megafone'],
  [/dev|desenvolv|program|engenh|engineer|code|c[oó]dig|implement|backend|frontend/i, 'Desenvolvedor', 'desenvolvimento', 'notebook'],
];
const TYPE_HINT = { Explore: 'pesquisador', Plan: 'planejador', 'security-reviewer': 'qa', 'design-reviewer': 'design', 'project-manager': 'gerente' };

function parseRole(description = '', subagentType = '') {
  const m = description.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  const label = m ? m[1] : '';
  const task = m ? m[2] : description;
  // the written job title wins; agent type and task text are only fallbacks
  const hit = [label, TYPE_HINT[subagentType], description].filter(Boolean).map(p => ROLES.find(([re]) => re.test(p))).find(Boolean);
  const [, cargo, dept, acc] = hit || [null, 'Analista', 'desenvolvimento', 'cracha'];
  return { cargo: label || cargo, dept, acc, task: task || description };
}

const projectKey = (cwd = '?') => cwd.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const baseName = (cwd = '?') => cwd.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop();
const short = (s, n = 90) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function building(state, ev) {
  const key = projectKey(ev.cwd);
  if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('bad cwd');
  let b = Object.hasOwn(state.buildings, key) ? state.buildings[key] : null;
  if (!b) {
    b = state.buildings[key] = {
      key, cwd: ev.cwd, nome: baseName(ev.cwd), missao: '', fase: 'brainstorming',
      createdAt: ev.ts, workers: {}, docs: [], log: [],
    };
    b.workers.ceo = { id: 'ceo', cargo: 'CEO', dept: 'diretoria', acc: 'gravata', task: 'Liderar a empresa', status: 'idle', boss: null, tools: 0 };
  }
  if (ev.corp) { // contents of .corp/empresa.json, attached by hook.js
    if (ev.corp.nome) b.nome = short(ev.corp.nome, 40);
    if (ev.corp.missao) b.missao = short(ev.corp.missao, 160);
    if (ev.corp.fase && DEPTS.some(d => d.id === ev.corp.fase)) { b.fase = ev.corp.fase; b.faseDoCeo = true; }
  }
  b.updatedAt = ev.ts;
  return b;
}

const log = (b, ts, txt) => { b.log.unshift({ ts, txt }); b.log.length = Math.min(b.log.length, 60); };

function workerFor(b, ev) {
  if (ev.agent_id) {
    const w = Object.values(b.workers).find(w => w.agentId === ev.agent_id);
    if (w) return w;
  }
  return b.workers.ceo;
}

const isAgentTool = n => n === 'Agent' || n === 'Task';

// Returns { focus } when the UI should zoom into a worker (a question).
function apply(state, ev) {
  const b = building(state, ev);
  const ceo = b.workers.ceo;
  const name = ev.hook_event_name;
  const ti = ev.tool_input || {};
  let focus = null;

  if (name === 'SessionStart') {
    log(b, ev.ts, 'Expediente aberto: o CEO chegou ao prédio.');
  } else if (name === 'UserPromptSubmit' && /^\s*<[a-z-]+>/.test(ev.prompt || '')) {
    ceo.status = 'working'; // harness message (task notification etc.), not a client request
  } else if (name === 'UserPromptSubmit') {
    ceo.status = 'working'; ceo.question = null;
    ceo.task = short(ev.prompt, 120);
    log(b, ev.ts, `Pedido do cliente: "${short(ev.prompt, 70)}"`);
  } else if (name === 'PreToolUse' && isAgentTool(ev.tool_name)) {
    const r = parseRole(ti.description, ti.subagent_type);
    const task = short(r.task, 120);
    // several agents hired for the same task form a squad: they sit together under the first one
    const peer = Object.values(b.workers).find(w => w.id !== 'ceo' && w.status !== 'done' && w.task.toLowerCase() === task.toLowerCase());
    const lead = peer && (b.workers[peer.squad] || peer);
    const head = Object.values(b.workers).find(w => w.dept === r.dept && w.head);
    const id = 'w' + (Object.keys(b.workers).length);
    b.workers[id] = {
      id, cargo: head || lead ? r.cargo : `Diretor(a) · ${r.cargo}`, dept: lead ? lead.dept : r.dept, acc: r.acc, task,
      status: 'working', boss: lead ? lead.id : head ? head.id : 'ceo', head: !head && !lead, squad: lead ? lead.id : undefined, tools: 0,
      subagentType: ti.subagent_type || 'general-purpose', toolUseId: ev.tool_use_id, hiredAt: ev.ts,
    };
    if (r.dept !== 'diretoria' && DEPTS.findIndex(d => d.id === r.dept) > DEPTS.findIndex(d => d.id === b.fase) && !b.faseDoCeo) b.fase = r.dept; // guess the phase only until the CEO declares one
    ceo.status = 'working';
    log(b, ev.ts, `CEO contratou ${b.workers[id].cargo}: ${short(r.task, 60)}`);
  } else if (name === 'SubagentStart') {
    // shortcut: links by matching subagent_type to the oldest unlinked hire; parallel hires of the same type may swap names.
    const w = Object.values(b.workers).filter(w => !w.agentId && w.status === 'working' && w.toolUseId && (w.subagentType === ev.agent_type || !ev.agent_type)).sort((a, c) => a.hiredAt - c.hiredAt)[0];
    if (w) w.agentId = ev.agent_id;
  } else if (name === 'PostToolUse' && isAgentTool(ev.tool_name)) {
    const w = Object.values(b.workers).find(w => w.toolUseId === ev.tool_use_id);
    if (w && ev.launched) w.agentId = ev.launched.agentId;
    if (ev.launched?.isAsync) return { focus }; // background agent: SubagentStop marks it done
    if (w && w.status !== 'done') { w.status = 'done'; w.question = null; log(b, ev.ts, `${w.cargo} entregou: ${short(w.task, 60)}`); }
  } else if (name === 'SubagentStop') {
    const w = Object.values(b.workers).find(w => w.agentId === ev.agent_id);
    if (w && w.status !== 'done') { w.status = 'done'; w.question = null; log(b, ev.ts, `${w.cargo} entregou: ${short(w.task, 60)}`); }
  } else if (name === 'PreToolUse' || name === 'PostToolUse') {
    const w = workerFor(b, ev);
    if (w.status === 'done') return { focus };
    w.question = null; w.status = 'working';
    if (name === 'PreToolUse') {
      w.tools++; w.lastTool = ev.tool_name;
      if (ev.tool_name === 'Skill') log(b, ev.ts, `${w.cargo} consultou o manual (skill): ${short(ti.skill, 40)}`);
      if (/^Web(Search|Fetch)$/.test(ev.tool_name)) log(b, ev.ts, `${w.cargo} buscou referência: ${short(ti.query || ti.url, 50)}`);
      if (ev.tool_name === 'AskUserQuestion') {
        w.status = 'asking'; w.question = short(ti.questions?.[0]?.question || 'Tenho uma dúvida', 140);
        focus = { building: b.key, worker: w.id, text: w.question };
      }
    }
    const fp = (ti.file_path || '').replace(/\\/g, '/');
    if (name === 'PostToolUse' && /(Write|Edit)/.test(ev.tool_name) && fp.includes('/.corp/')) {
      const doc = fp.split('/.corp/')[1];
      if (!b.docs.includes(doc)) { b.docs.push(doc); log(b, ev.ts, `Documento entregue: ${doc}`); }
    }
  } else if (name === 'Notification') {
    const w = workerFor(b, ev);
    w.status = 'asking'; w.question = short(ev.message || 'Preciso de você', 140);
    focus = { building: b.key, worker: w.id, text: w.question };
    log(b, ev.ts, `${w.cargo} tem uma dúvida: ${short(w.question, 60)}`);
  } else if (name === 'Stop') {
    ceo.status = 'idle'; ceo.question = null;
    log(b, ev.ts, 'CEO entregou o trabalho ao cliente.');
  }
  return { focus };
}

module.exports = { apply, parseRole, DEPTS, projectKey };

if (require.main === module) { // self-check: node core.js
  const assert = require('assert');
  assert.equal(parseRole('[Artista] Criar logo').acc, 'lapis');
  assert.equal(parseRole('[Pesquisador] refs').dept, 'pesquisa');
  assert.equal(parseRole('find files', 'Explore').cargo, 'Pesquisador');
  assert.equal(parseRole('[QA] contar', 'Explore').dept, 'qualidade');
  for (const [t, acc] of [['Desenvolvedor', 'notebook'], ['Designer', 'pincel'], ['Gerente de Projeto', 'prancheta'], ['Criativo', 'lampada'], ['Marketing', 'megafone'], ['Arquiteto', 'regua']])
    assert.equal(parseRole(`[${t}] x`).acc, acc, t);
  assert.equal(parseRole('qualquer coisa').cargo, 'Analista');
  const s = { buildings: {} }, base = { cwd: 'C:\\x\\Loja', session_id: 's', ts: 1 };
  apply(s, { ...base, hook_event_name: 'UserPromptSubmit', prompt: 'faça uma loja' });
  apply(s, { ...base, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't1', tool_input: { description: '[Designer] protótipo', subagent_type: 'general-purpose' } });
  apply(s, { ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'general-purpose' });
  const r = apply(s, { ...base, hook_event_name: 'Notification', agent_id: 'a1', message: 'Qual cor?' });
  const b = s.buildings['c:/x/loja'];
  assert.equal(r.focus.worker, 'w1');
  assert.equal(b.workers.w1.status, 'asking');
  assert.equal(b.fase, 'prototipo');
  apply(s, { ...base, hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 't1', launched: { agentId: 'a1', isAsync: true } });
  assert.equal(b.workers.w1.status, 'asking'); // async launch is not a delivery
  apply(s, { ...base, hook_event_name: 'SubagentStop', agent_id: 'a1' });
  assert.equal(b.workers.w1.status, 'done');
  apply(s, { ...base, hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: 'C:\\x\\Loja\\.corp\\03-planejamento.md' }, corp: { nome: 'Loja S.A.', fase: 'planejamento' } });
  assert.deepEqual(b.docs, ['03-planejamento.md']);
  assert.equal(b.nome, 'Loja S.A.');
  apply(s, { ...base, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't2', tool_input: { description: '[QA] testes' } });
  assert.equal(b.fase, 'planejamento'); // CEO-declared phase wins over guessing
  apply(s, { ...base, hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't3', tool_input: { description: '[Desenvolvedor] testes' } });
  const sq = Object.values(b.workers).find(w => w.toolUseId === 't3'), lead = Object.values(b.workers).find(w => w.toolUseId === 't2');
  assert.equal(sq.squad, lead.id); assert.equal(sq.dept, lead.dept); assert.equal(sq.boss, lead.id); // same task -> squad
  console.log('core ok');
}
