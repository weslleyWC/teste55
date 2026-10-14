import { spawn } from 'node:child_process';
import { createOrlaServer } from '../server/index.js';
const backend = createOrlaServer();
backend.server.on('error', error => { console.error('Não foi possível iniciar o servidor social:', error.message); process.exit(1); });
await backend.listen();
console.log('Servidor social iniciado na porta 3001');
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit' });
let stopping = false;
async function stop(code = 0) { if (stopping) return; stopping = true; vite.kill('SIGTERM'); await backend.close(); process.exit(code); }
vite.on('exit', code => stop(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
