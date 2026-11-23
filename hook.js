// Claude Code hook: forwards every event to the Claude Corp server. Silent and fast when the app is closed.
const fs = require('fs');
const path = require('path');
const PORT = +process.env.CORP_PORT || 4747;

let raw = '';
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', async () => {
  let ev;
  try { ev = JSON.parse(raw); } catch { return; }
  if (fs.existsSync(path.join(__dirname, 'debug'))) fs.appendFileSync(path.join(__dirname, 'debug'), JSON.stringify({ ...ev, tool_response: String(JSON.stringify(ev.tool_response)).slice(0, 300) }) + '\n');
  const fp = String(ev.tool_input?.file_path || '').replace(/\\/g, '/');
  if (ev.hook_event_name === 'SessionStart' || fp.includes('/.corp/')) {
    try { ev.corp = JSON.parse(fs.readFileSync(path.join(ev.cwd, '.corp', 'empresa.json'), 'utf8')); } catch { /* no company file yet */ }
  }
  const r = ev.tool_response;
  if (r && r.agentId) ev.launched = { agentId: r.agentId, isAsync: !!r.isAsync }; // Agent tool result: links the hire to its subagent
  delete ev.tool_response; // can be huge, the city does not need it
  try {
    const token = fs.readFileSync(path.join(__dirname, 'token'), 'utf8');
    const r = await fetch(`http://127.0.0.1:${PORT}/event`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-corp-token': token },
      body: JSON.stringify(ev), signal: AbortSignal.timeout(800),
    });
    // company mode only when our own server answered; the prompt text comes from the local file, never the network
    if (r.ok && ev.hook_event_name === 'SessionStart') {
      const context = fs.readFileSync(path.join(__dirname, 'protocolo.md'), 'utf8');
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }));
    }
  } catch { /* app closed: company mode off, Claude Code works as usual */ }
});
