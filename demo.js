// node demo.js -> sends a fake company workday to the running server (to try the city without Claude Code).
const cwd = 'C:/demo/LojaDeBolos';
const steps = [
  { hook_event_name: 'SessionStart' },
  { hook_event_name: 'UserPromptSubmit', prompt: 'Quero um site de encomendas para minha loja de bolos' },
  { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: cwd + '/.corp/empresa.json' }, corp: { nome: 'Doce Byte Ltda.', missao: 'Encomendas de bolo em 3 cliques.', fase: 'brainstorming' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't1', tool_input: { description: '[Criativo] Brainstorm de conceitos', subagent_type: 'general-purpose' } },
  { hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 't1' },
  { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: cwd + '/.corp/01-brainstorming.md' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't2', tool_input: { description: '[Pesquisador] Referências de sites de confeitaria', subagent_type: 'Explore' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: 'frontend-design' } },
  { hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 't2' },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't3', tool_input: { description: '[Gerente de Projeto] Escopo e cronograma', subagent_type: 'Plan' } },
  { hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 't3' },
  { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: cwd + '/.corp/03-planejamento.md' }, corp: { nome: 'Doce Byte Ltda.', fase: 'prototipo' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't4', tool_input: { description: '[Artista] Logo e paleta', subagent_type: 'general-purpose' } },
  { hook_event_name: 'SubagentStart', agent_id: 'a4', agent_type: 'general-purpose' },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't5', tool_input: { description: '[Designer] Protótipo da página de pedido', subagent_type: 'general-purpose' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't6', tool_input: { description: '[Desenvolvedor] Carrinho de encomendas', subagent_type: 'general-purpose' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't7', tool_input: { description: '[Desenvolvedor] Carrinho de encomendas', subagent_type: 'general-purpose' } },
  { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 't8', tool_input: { description: '[QA] Carrinho de encomendas', subagent_type: 'general-purpose' } },
  { hook_event_name: 'Notification', agent_id: 'a4', message: 'O logo deve ser rosa ou marrom-chocolate?' },
];
(async () => {
  for (const s of steps) {
    await fetch('http://127.0.0.1:4747/event', { method: 'POST', body: JSON.stringify({ cwd, session_id: 'demo', ...s }) });
    await new Promise(r => setTimeout(r, 350));
  }
  console.log('demo enviada');
})();
