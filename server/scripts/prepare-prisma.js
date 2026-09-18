import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

console.log(`[Prisma Init] Database URL detected: ${isPostgres ? 'PostgreSQL (Cloud)' : 'SQLite (Local)'}`);

const schemaFile = isPostgres ? 'prisma/schema.postgresql.prisma' : 'prisma/schema.prisma';

try {
  console.log(`[Prisma Init] Running 'npx prisma generate --schema=${schemaFile}'...`);
  execSync(`npx prisma generate --schema=${schemaFile}`, {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[Prisma Init] Client generated successfully.');
} catch (error) {
  console.error('[Prisma Init] Error during prisma generate:', error);
  process.exit(1);
}
