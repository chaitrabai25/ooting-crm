import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const tscPath = path.resolve(serverDir, '../node_modules/typescript/bin/tsc');

console.log('[Compiler] Starting tsc compilation...');
try {
  const out = execSync(`node "${tscPath}"`, {
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
