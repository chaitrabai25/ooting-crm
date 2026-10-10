import { ensureColumns } from '../dist/db/migrations.js';

async function main() {
  console.log('[Migration] Ensuring all production database columns exist...');
  await ensureColumns();
  console.log('[Migration] Column verification completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
