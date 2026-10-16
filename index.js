/**
 * Ooting CRM - Hostinger Production Startup File
 * -------------------------------------------------------------
 * Bridges Hostinger Node.js Application Manager (Passenger, LiteSpeed, PM2, Cloud, VPS)
 * directly into the compiled backend API and full-stack static asset server.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compiledServerPath = path.resolve(__dirname, 'server/dist/index.js');

if (!fs.existsSync(compiledServerPath)) {
  console.error('======================================================================');
  console.error(' [Hostinger Startup Error] Compiled server entrypoint not found!');
  console.error(` Expected location: ${compiledServerPath}`);
  console.error(' Please ensure the project is built before running: npm run build');
  console.error('======================================================================');
  process.exit(1);
}

// Start the production server
await import('./server/dist/index.js');
