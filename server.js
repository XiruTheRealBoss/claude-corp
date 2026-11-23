// Claude Corp server: receives hook events, keeps the city state, streams it to the UI (SSE).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { apply } = require('./core');

const PORT = +process.env.CORP_PORT || 4747;
const STATE_FILE = path.join(__dirname, 'state.json');
const PROTOCOL = fs.readFileSync(path.join(__dirname, 'protocolo.md'), 'utf8');

let state = { buildings: {} };
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }

const clients = new Set();
const send = (msg) => { const data = `data: ${JSON.stringify(msg)}\n\n`; for (const c of clients) c.write(data); };
let saveTimer;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFile(STATE_FILE, JSON.stringify(state), () => {}), 500); };

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let ev;
      try { ev = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
      if (!ev || typeof ev.cwd !== 'string' || typeof ev.hook_event_name !== 'string') { res.writeHead(400).end(); return; }
      ev.ts = Date.now();
      const { focus } = apply(state, ev);
      send({ type: 'state', state });
      if (focus) send({ type: 'focus', ...focus });
      save();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(ev.hook_event_name === 'SessionStart' ? { context: PROTOCOL } : {}));
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
    delete state.buildings[decodeURIComponent(req.url.slice(10))];
    send({ type: 'state', state }); save(); res.end('ok'); return;
  }
  const file = req.url === '/' ? 'index.html' : null;
  if (!file) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(__dirname, 'public', file)).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`Claude Corp em http://localhost:${PORT}`));
