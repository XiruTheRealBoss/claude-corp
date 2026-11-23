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
console.log(process.argv[2] === 'remove' ? 'Claude Corp removido.' : `Claude Corp instalado em ${file} (backup: settings.json.bak-claude-corp)`);
