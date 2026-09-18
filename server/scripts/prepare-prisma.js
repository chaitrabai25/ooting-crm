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
const isSqlite = dbUrl.startsWith('file:');

let dbType = 'MySQL (Local / Cloud Production)';
let schemaFile = 'prisma/schema.prisma'; // Primary MySQL schema

if (isPostgres) {
  dbType = 'PostgreSQL (Cloud)';
  schemaFile = 'prisma/schema.postgresql.prisma';
} else if (isSqlite) {
  dbType = 'SQLite (Legacy Local)';
  schemaFile = 'prisma/schema.sqlite.prisma';
}

console.log(`[Prisma Init] Database Engine: ${dbType}`);
console.log(`[Prisma Init] Target Schema: ${schemaFile}`);
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

