/**
 * Scraper for the Official Halal Damu Registry (ДУМК «Халал Даму»).
 * Source: https://halaldamu.kz/reestr/
 * Retrieves all registered halal-certified enterprises in Kazakhstan.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_FILE = path.join(__dirname, '..', 'data', 'halal_damu_companies.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchPage(page) {
  const postData = `action=load_companies&page=${page}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'halaldamu.kz',
      port: 443,
      path: '/wp-admin/admin-ajax.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          resolve({ error: 'invalid_json', raw: b.slice(0, 200) });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

function parseCards(html) {
  const items = [];
  const cardRegex = /<div class="reestr__right_item"[\s\S]*?<\/div>\s*<\/div>/gi;
  // Fallback split if above regex doesn't match cleanly:
  const rawCards = html.split('<div class="reestr__right_item"');

  for (let i = 1; i < rawCards.length; i++) {
    const chunk = rawCards[i];
    const linkMatch = chunk.match(/href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : '';

    const logoMatch = chunk.match(/<img[^>]+src="([^"]+)"/);
    const logo = logoMatch ? logoMatch[1] : '';

    const nameMatch = chunk.match(/<b>([\s\S]*?)<\/b>/);
    let name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/«|»|"/g, '').trim() : '';

    const categoryMatch = chunk.match(/<p>([\s\S]*?)<\/p>/);
    const category = categoryMatch ? categoryMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const active = chunk.includes('reestr-active') || chunk.includes('Активен') || chunk.includes('certified');

    if (name) {
      items.push({
        name,
        category,
        link,
        logo,
        isActive: active,
      });
    }
  }

  return items;
}

async function run() {
  console.log('=== SCRAPING DUMK HALAL DAMU OFFICIAL REGISTRY ===');
  const allCompanies = [];
  let page = 1;

  while (true) {
    console.log(`Fetching page ${page}...`);
    try {
      const resp = await fetchPage(page);
      if (!resp.success || !resp.data?.html || resp.data.html.trim().length === 0) {
        console.log(`Page ${page} returned empty HTML or success=false. Finished!`);
        break;
      }

      const cards = parseCards(resp.data.html);
      if (cards.length === 0) {
        console.log(`Page ${page} had no parsed cards. Finished!`);
        break;
      }

      allCompanies.push(...cards);
      console.log(`[Page ${page}] Parsed ${cards.length} companies (Total: ${allCompanies.length}).`);
      page++;
      await sleep(350);
    } catch (e) {
      console.error(`Error on page ${page}:`, e.message);
      await sleep(2000);
      page++;
      if (page > 100) break; // safety cutoff
    }
  }

  // Deduplicate by name
  const seen = new Set();
  const deduped = [];
  for (const c of allCompanies) {
    const key = c.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`\n=== SUCCESS: Saved ${deduped.length} unique Halal Damu companies to ${OUT_FILE} ===`);

  // Category breakdown
  const catCounts = {};
  for (const c of deduped) {
    catCounts[c.category] = (catCounts[c.category] || 0) + 1;
  }
  console.log('\nTop Categories:');
  Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([cat, cnt]) => console.log(` - ${cat || 'Без категории'}: ${cnt}`));
}

run();
