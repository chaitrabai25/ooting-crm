import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.resolve(serverDir, '../.env') });
dotenv.config({ path: path.resolve(serverDir, '.env') });

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const isMysql = dbUrl.startsWith('mysql://');
const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

let dbType = 'MySQL (Local / Cloud Production)';
let sourceSchema = 'prisma/schema.mysql.prisma';

if (isPostgres) {
  dbType = 'PostgreSQL (Cloud)';
  sourceSchema = 'prisma/schema.postgresql.prisma';
} else if (isSqlite) {
  dbType = 'SQLite (Local / Render Fallback)';
  sourceSchema = 'prisma/schema.sqlite.prisma';

  // Ensure verified pre-seeded SQLite database file exists
  const backupDb = path.resolve(serverDir, 'prisma', 'backup', 'ooting.db.backup');
  if (fs.existsSync(backupDb)) {
    const candidatePaths = [
      path.resolve(serverDir, 'prisma', 'ooting.db'),
      path.resolve(serverDir, 'ooting.db'),
      path.resolve(serverDir, '..', 'ooting.db'),
    ];
    for (const dest of candidatePaths) {
      try {
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(dest) || fs.statSync(dest).size < 10000) {
          fs.copyFileSync(backupDb, dest);
          console.log(`[Prisma Init] Seeded database from verified backup to: ${dest}`);
        }
      } catch (copyErr) {
        console.warn(`[Prisma Init] Could not seed database to ${dest}:`, copyErr?.message);
      }
    }
  }
}

console.log(`[Prisma Init] Database Engine: ${dbType}`);
console.log(`[Prisma Init] Active Schema: ${sourceSchema}`);

// Synchronize active schema to primary schema.prisma
const sourcePath = path.resolve(serverDir, sourceSchema);
const targetPath = path.resolve(serverDir, 'prisma', 'schema.prisma');

try {
  if (fs.existsSync(sourcePath)) {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`[Prisma Init] Synchronized ${sourceSchema} -> prisma/schema.prisma`);
  }
} catch (syncErr) {
  console.warn('[Prisma Init] Warning synchronizing schema:', syncErr?.message);
}

try {
  let prismaCli = '';
  try {
    prismaCli = require.resolve('prisma/build/index.js');
  } catch {
    prismaCli = '';
  }

  const genCmd = prismaCli
    ? `"${process.execPath}" "${prismaCli}" generate --schema="${targetPath}"`
    : `npx prisma generate --schema="${targetPath}"`;

  console.log(`[Prisma Init] Running: ${genCmd}`);
  const out = execSync(genCmd, {
    cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  if (out) console.log(out.toString());
  console.log('[Prisma Init] Prisma Client generated successfully.');
} catch (error) {
  console.warn('[Prisma Init] Warning during prisma generate:', error?.message || error);
}

