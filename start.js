// node start.js -> used by the /empresa skill.
// Starts the Claude Corp city if it is off (and opens its window once), then prints the company protocol
// so the current Claude Code session works as the CEO.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const PORT = +process.env.CORP_PORT || 4747;
const URL = `http://localhost:${PORT}`;

const up = () => new Promise(resolve => {
  const q = http.get({ host: '127.0.0.1', port: PORT, path: '/', headers: { host: `127.0.0.1:${PORT}` }, timeout: 600 }, res => { res.resume(); resolve(res.statusCode === 200); });
  q.on('error', () => resolve(false));
  q.on('timeout', () => { q.destroy(); resolve(false); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const detached = (cmd, args) => spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();

(async () => {
  let started = false;
  if (!await up()) {
    detached(process.execPath, [path.join(__dirname, 'server.js')]);
    for (let i = 0; i < 30 && !await up(); i++) await sleep(150);
    started = true;
  }
  const running = await up();
  if (running && started && !process.argv.includes('--no-open')) {
    if (process.platform === 'win32') detached('cmd', ['/c', 'start', '', 'msedge', `--app=${URL}`]);
    else detached(process.platform === 'darwin' ? 'open' : 'xdg-open', [URL]);
  }
  let hooks = false;
  try { hooks = fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8').includes('claude-corp'); } catch { /* no settings yet */ }

  console.log(running ? `Cidade: ${started ? 'ligada agora' : 'já estava ligada'} em ${URL}` : 'Cidade: NÃO ligou (veja se a porta está livre e rode node server.js para ver o erro).');
  if (!hooks) console.log(`Hooks: NÃO instalados. Peça ao usuário para rodar: node "${path.join(__dirname, 'install.js')}" e abrir uma sessão nova.`);
  console.log('\n' + fs.readFileSync(path.join(__dirname, 'protocolo.md'), 'utf8'));
})();
