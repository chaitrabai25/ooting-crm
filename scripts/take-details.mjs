import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { prisma } from '../server/dist/db/prisma.js';
import { config } from '../server/dist/config/index.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\ootng\\.gemini\\antigravity\\brain\\8e08250e-8fc7-4147-a9ed-79302477c0d0';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const user = await prisma.user.findFirst();
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  const pkg = await prisma.package.findFirst();

  console.log('Launching headless Chrome for detailed day view...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100',
    'http://localhost:5000/login'
  ]);

  let version = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      version = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) break;
    } catch {}
  }

  const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const res = JSON.parse(event.data);
    if (res.id && callbacks.has(res.id)) {
      callbacks.get(res.id)(res);
      callbacks.delete(res.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise(resolve => ws.onopen = resolve);
  await send('Page.enable');
  await send('Runtime.enable');

  await sleep(2000);
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('ooting_crm_token', ${JSON.stringify(token)});
      localStorage.setItem('ooting_crm_user', JSON.stringify(${JSON.stringify(user)}));
    `
  });

  // Navigate to Itinerary PDF
  await send('Page.navigate', { url: `http://localhost:5000/packages/${pkg.id}/itinerary-pdf` });
  
  // Wait for #itinerary-document
  for (let i = 0; i < 20; i++) {
    const res = await send('Runtime.evaluate', {
      expression: 'Boolean(document.querySelector("#itinerary-document"))',
      returnByValue: true
    });
    if (res.result?.value === true) break;
    await sleep(600);
  }
  await sleep(2000);

  // Scroll down to Day 1 / Day 2 cards to show colorful chips
  await send('Runtime.evaluate', {
    expression: `
      const dayCard = document.querySelector('.itinerary-day-card') || document.querySelector('#itinerary-document');
      if (dayCard) {
        dayCard.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    `
  });
  await sleep(1000);

  const shotRes = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (shotRes && shotRes.result && shotRes.result.data) {
    const buffer = Buffer.from(shotRes.result.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, 'doc_itinerary_details.png');
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath} (${buffer.length} bytes)`);
  }

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
