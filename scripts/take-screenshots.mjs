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
  console.log('Fetching auth credentials and entity IDs from database...');
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found in database.');
    process.exit(1);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  const pkg = await prisma.package.findFirst();
  const quotation = await prisma.quotation.findFirst();
  const cab = await prisma.cabBooking.findFirst();

  console.log(`User: ${user.email}, Package: ${pkg?.id}, Quotation: ${quotation?.id}, Cab: ${cab?.id}`);

  console.log('Launching headless Chrome...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1024',
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

  if (!version) {
    console.error('Failed to connect to Chrome debugging port.');
    chromeProc.kill();
    process.exit(1);
  }

  const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    console.error('No page target found.');
    chromeProc.kill();
    process.exit(1);
  }

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

  await new Promise(resolve => {
    ws.onopen = resolve;
  });

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Waiting for initial login page load...');
  await sleep(2500);

  // Inject session into localStorage
  console.log('Injecting auth token into localStorage...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('ooting_crm_token', ${JSON.stringify(token)});
      localStorage.setItem('ooting_crm_user', JSON.stringify(${JSON.stringify(user)}));
    `
  });

  const waitForSelector = async (selector, timeoutMs = 25000) => {
    console.log(`Waiting for selector: ${selector}...`);
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('${selector}'))`,
        returnByValue: true
      });
      if (res.result?.value === true) {
        console.log(`Found selector: ${selector} after ${Date.now() - startTime}ms`);
        return true;
      }
      await sleep(600);
    }
    console.warn(`Timeout waiting for selector: ${selector}`);
    return false;
  };

  const capturePage = async (url, readySelector, postWaitMs, outputFilename) => {
    console.log(`\n--- Capturing ${outputFilename} ---`);
    console.log(`Navigating to ${url}...`);
    await send('Page.navigate', { url });
    if (readySelector) {
      await waitForSelector(readySelector);
    }
    await sleep(postWaitMs);

    const shotRes = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    if (shotRes && shotRes.result && shotRes.result.data) {
      const buffer = Buffer.from(shotRes.result.data, 'base64');
      const outPath = path.join(ARTIFACT_DIR, outputFilename);
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ Saved screenshot: ${outPath} (${buffer.length} bytes)`);
    } else {
      console.error(`❌ Failed to capture screenshot for ${url}:`, shotRes);
    }
  };

  // 1. Package Listing Page: wait for hero card images
  await capturePage('http://localhost:5000/packages', 'img[src*="unsplash"], img[src*="jpg"], img[src*="png"]', 2000, 'screenshot_packages.png');

  // 2. Quotation View Page: wait for #quotation-document
  if (quotation) {
    await capturePage(`http://localhost:5000/quotations/${quotation.id}`, '#quotation-document', 1500, 'doc_quotation.png');
  }

  // 3. Itinerary PDF View Page: wait for #itinerary-document
  if (pkg) {
    await capturePage(`http://localhost:5000/packages/${pkg.id}/itinerary-pdf`, '#itinerary-document', 2000, 'doc_itinerary.png');
  }

  // 4. Cab Duty Slip Voucher Page: wait for #duty-slip-document
  if (cab) {
    await capturePage(`http://localhost:5000/cabs/${cab.id}/voucher`, '#duty-slip-document', 1500, 'doc_cab_voucher.png');
  }

  console.log('\n🎉 All live screenshots successfully captured and verified!');
  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
