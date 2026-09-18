import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

console.log(`[Prisma Init] Database URL detected: ${isPostgres ? 'PostgreSQL (Cloud)' : 'SQLite (Local)'}`);

const schemaFile = isPostgres ? 'prisma/schema.postgresql.prisma' : 'prisma/schema.prisma';
const schemaPath = path.resolve(serverDir, schemaFile);

try {
  let prismaCli = '';
  try {
    prismaCli = require.resolve('prisma/build/index.js');
  } catch {
    prismaCli = '';
  }

  const genCmd = prismaCli
    ? `"${process.execPath}" "${prismaCli}" generate --schema="${schemaPath}"`
    : `npx prisma generate --schema="${schemaPath}"`;

  console.log(`[Prisma Init] Running: ${genCmd}`);
  execSync(genCmd, {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[Prisma Init] Client generated successfully.');
} catch (error) {
  console.warn('[Prisma Init] Warning during prisma generate (client may already be generated):', error?.message || error);
}

