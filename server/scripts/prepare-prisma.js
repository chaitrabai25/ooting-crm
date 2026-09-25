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

const CLOUD_TIDB_URL = 'mysql://2AJqT6QgbdvDayf.root:7xCl3FL0jIFUVu5D@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/ooting_crm?sslaccept=strict';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = CLOUD_TIDB_URL;
}

const dbUrl = process.env.DATABASE_URL || CLOUD_TIDB_URL;
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const isMysql = dbUrl.startsWith('mysql://');
const isSqlite = dbUrl.startsWith('file:') || (!isPostgres && !isMysql);

let dbType = 'MySQL (Local / Cloud Production)';
let sourceSchema = 'prisma/schema.mysql.prisma';

if (isPostgres) {
  dbType = 'PostgreSQL (Cloud)';
  sourceSchema = 'prisma/schema.postgresql.prisma';
} else if (isMysql) {
  dbType = 'MySQL (Local / Cloud Production)';
  sourceSchema = 'prisma/schema.mysql.prisma';
} else if (isSqlite) {
  dbType = 'SQLite (Local / Fallback)';
  sourceSchema = 'prisma/schema.sqlite.prisma';
}

console.log(`[Prisma Init] Database Engine: ${dbType}`);
console.log(`[Prisma Init] Active Schema: ${sourceSchema}`);

// Synchronize active schema to primary schema.prisma without touching database files
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
