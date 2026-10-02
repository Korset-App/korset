// Render the B2B sales deck (scratch/deck/deck.html) to a PDF for cold outreach.
// Each slide is one 1600x900 page. Uses Playwright (already in node_modules).
// Re-run after any edit in deck.html or any asset swap.
//
// node scripts/render-deck.mjs

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'scratch', 'deck', 'deck.html');
const pdfPath = path.join(root, 'scratch', 'deck', 'deck.pdf');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1700, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

await page.pdf({
  path: pdfPath,
  width: '1600px',
  height: '900px',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
console.log('Rendered →', pdfPath);