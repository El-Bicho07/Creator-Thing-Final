const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[35m%s\x1b[0m', '   ComIdea — Comment-to-Content Engine (Full Stack)');
console.log('\x1b[36m%s\x1b[0m', '==================================================');

const isWindows = process.platform === 'win32';

// 1. Start FastAPI backend (port 8000)
console.log('\x1b[32m%s\x1b[0m', '[BACKEND] Launching FastAPI uvicorn server on http://localhost:8000...');
const backendCmd = 'python';
const backendArgs = ['-m', 'uvicorn', 'backend.app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'];

const backend = spawn(backendCmd, backendArgs, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: isWindows
});

// 2. Start Next.js frontend (port 3000)
console.log('\x1b[34m%s\x1b[0m', '[FRONTEND] Launching Next.js App Router on http://localhost:3000...');
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, '..', 'frontend'),
  stdio: 'inherit',
  shell: isWindows
});

const cleanup = () => {
  console.log('\nShutting down ComIdea dev services...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
