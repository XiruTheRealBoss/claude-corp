// Claude Corp server: receives hook events, keeps the city state, streams it to the UI (SSE).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { apply } = require('./core');

const PORT = +process.env.CORP_PORT || 4747;
const STATE_FILE = path.join(__dirname, 'state.json');
const TOKEN_FILE = path.join(__dirname, 'token');
// shared secret with hook.js: web pages can't read this file, so they can't post fake events
const TOKEN = require('crypto').randomBytes(24).toString('hex');
fs.writeFileSync(TOKEN_FILE, TOKEN, { mode: 0o600 });
const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]); // blocks DNS rebinding

let state = { buildings: {} };
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }

const clients = new Set();
const send = (msg) => { const data = `data: ${JSON.stringify(msg)}\n\n`; for (const c of clients) c.write(data); };
let saveTimer;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFile(STATE_FILE, JSON.stringify(state), () => {}), 500); };

const server = http.createServer((req, res) => {
  if (!HOSTS.has(req.headers.host)) { res.writeHead(403).end(); return; }
  if (req.method === 'POST' && req.url === '/event') {
    if (req.headers['x-corp-token'] !== TOKEN) { res.writeHead(403).end(); return; }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let ev;
      try { ev = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
      if (!ev || typeof ev.cwd !== 'string' || typeof ev.hook_event_name !== 'string') { res.writeHead(400).end(); return; }
      ev.ts = Date.now();
      let focus;
      try { ({ focus } = apply(state, ev)); } catch (e) { console.error(e); res.writeHead(400).end(); return; }
      send({ type: 'state', state });
      if (focus) send({ type: 'focus', ...focus });
      save();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}'); // hook.js reads protocolo.md itself; the server never supplies prompt text
    });
    return;
  }
  if (req.url === '/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'DELETE' && req.url.startsWith('/building/')) { // demolish a building
    let key; try { key = decodeURIComponent(req.url.slice(10)); } catch { res.writeHead(400).end(); return; }
    if (Object.hasOwn(state.buildings, key)) delete state.buildings[key];
    send({ type: 'state', state }); save(); res.end('ok'); return;
  }
  const file = req.url === '/' ? 'index.html' : null;
  if (!file) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`Claude Corp em http://localhost:${PORT}`));
