import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

// Pick a currently-free port once, then hand it to every Playwright process
// via EXPO_WEB_PORT so the config, web server, and workers all agree on it.
const port = await new Promise((resolve, reject) => {
  const srv = createServer();
  srv.once('error', reject);
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

const child = spawn('yarn', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_WEB_PORT: String(port) },
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 0));
