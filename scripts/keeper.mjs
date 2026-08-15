import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

function startServer() {
  const child = spawn('node', [
    '/home/z/my-project/node_modules/next/dist/bin/next',
    'dev', '-p', '3000'
  ], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code) => {
    writeFileSync('/tmp/next-crash.log', `[${new Date().toISOString()}] Server exited with code ${code}. Restarting in 3s...\n`, { flag: 'a' });
    setTimeout(startServer, 3000);
  });

  return child;
}

startServer();
