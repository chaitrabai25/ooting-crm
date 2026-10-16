import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');

let tscCmd = 'npx tsc';
const candidatePaths = [
  path.resolve(serverDir, 'node_modules/typescript/bin/tsc'),
  path.resolve(serverDir, '../node_modules/typescript/bin/tsc'),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    tscCmd = `node "${p}"`;
    break;
  }
}

console.log(`[Compiler] Starting compilation with: ${tscCmd}...`);
try {
  const out = execSync(tscCmd, {
    cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });
  if (out) console.log(out);
  console.log('[Compiler] Successfully compiled TypeScript to dist/ with exit code 0.');
} catch (error) {
  console.error('[Compiler] Compilation failed!');
  if (error.stdout) console.log('[Compiler stdout]:', error.stdout.toString());
  if (error.stderr) console.error('[Compiler stderr]:', error.stderr.toString());
  process.exit(1);
}
