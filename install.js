// node install.js        -> adds Claude Corp hooks to ~/.claude/settings.json (backup first)
// node install.js remove -> removes them
const fs = require('fs');
const os = require('os');
const path = require('path');

const file = path.join(os.homedir(), '.claude', 'settings.json');
const cmd = `node "${path.join(__dirname, 'hook.js').replace(/\\/g, '/')}"`;
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Notification', 'Stop'];

const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
fs.mkdirSync(path.dirname(file), { recursive: true });
if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak-claude-corp');
settings.hooks ||= {};

for (const e of EVENTS) {
  const list = (settings.hooks[e] || []).filter(g => !g.hooks?.some(h => String(h.command).includes('claude-corp')));
  if (process.argv[2] !== 'remove') list.push({ ...(e.includes('ToolUse') ? { matcher: '*' } : {}), hooks: [{ type: 'command', command: cmd, timeout: 5 }] });
  if (list.length) settings.hooks[e] = list; else delete settings.hooks[e];
}
fs.writeFileSync(file, JSON.stringify(settings, null, 2));

// the /empresa skill, pointing at this folder
const skillDir = path.join(os.homedir(), '.claude', 'skills', 'empresa');
const skillFile = path.join(skillDir, 'SKILL.md');
const ours = fs.existsSync(skillFile) && fs.readFileSync(skillFile, 'utf8').includes('Claude Corp');
if (process.argv[2] === 'remove') {
  if (ours) fs.rmSync(skillDir, { recursive: true });
} else if (fs.existsSync(skillFile) && !ours) {
  console.log(`Aviso: já existe outra skill em ${skillDir}; não mexi nela.`);
} else {
  fs.mkdirSync(skillDir, { recursive: true });
  const app = __dirname.replace(/\\/g, '/');
  fs.writeFileSync(skillFile, fs.readFileSync(path.join(__dirname, 'skill', 'SKILL.md'), 'utf8').replaceAll('{{APP}}', app));
}
console.log(process.argv[2] === 'remove' ? 'Claude Corp removido (hooks e skill /empresa).' : `Claude Corp instalado: hooks em ${file} (backup: settings.json.bak-claude-corp) e skill /empresa.`);
