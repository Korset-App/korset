/**
 * Clients for National Catalog (НКТ) and 1C Registry (barcode-list.ru).
 */

import https from 'https';
import { URL } from 'url';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const NPC_API_KEY = process.env.NPC_API_KEY;

function httpPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 15000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

function httpGet(urlStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9',
        ...headers,
      },
      timeout: 15000,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

/**
 * Queries National Catalog of Goods (НКТ).
 */
export async function queryNpc(query, size = 10) {
  if (!NPC_API_KEY || !query) return [];
  try {
    const res = await httpPost(
      'https://nationalcatalog.kz/gw/search/api/v1/search',
      { 'X-API-KEY': NPC_API_KEY },
      { query: String(query).slice(0, 90), page: 1, size }
    );
    if (res.status !== 200 || !res.body?.items) return [];

    return res.body.items.map(item => {
      const brandAttr = (item.attributes || []).find(a => a.code === 'brand')?.valueRu || '';
      const producerAttr = (item.attributes || []).find(a => a.code === 'a4282e5d')?.valueRu || '';
      const producerBin = (item.attributes || []).find(a => a.code === 'producer_identifier')?.valueRu || '';
      const country = (item.attributes || []).find(a => a.code === 'country')?.valueRu || '';
      const qtyVal = (item.attributes || []).find(a => a.code === 'quantity')?.valueRu || '';
      const unit = (item.attributes || []).find(a => a.code === 'measure_unit')?.valueRu || '';

      return {
        source: 'npc',
        id: item.id,
        gtin: item.gtin && /^\d{8,14}$/.test(item.gtin) ? item.gtin.trim() : null,
        ntin: item.ntin,
        nameRu: item.nameRu || item.shortNameRu || '',
        nameKk: item.nameKk || item.shortNameKk || '',
        brand: brandAttr || item.brand || '',
        producer: producerAttr,
        producerBin,
        country,
        categoryRu: item.categoryNameRuL4 || item.categoryNameRuL3 || item.categoryNameRuL1 || '',
        quantityStr: qtyVal && unit ? `${qtyVal} ${unit}` : '',
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * Queries 1C / Microinvest Barcode Registry (barcode-list.ru).
 */
export async function queryBarcodeListRu(query) {
  if (!query) return [];
  try {
    const cleanQ = String(query).slice(0, 80);
    const encoded = encodeURIComponent(cleanQ).replace(/%20/g, '+');
    const url = `https://barcode-list.ru/barcode/RU/%D0%9F%D0%BE%D0%B8%D1%81%D0%BA.htm?barcode=${encoded}`;
    const res = await httpGet(url);
    if (res.status !== 200 || !res.body) return [];

    const results = [];
    // Match table rows:
    // e.g. <tr> ... <td>4870028002821</td> ... <td>Шоколад Казахстанский...</td>
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = res.body.match(rowRegex) || [];

    for (const row of rows) {
      // Find barcode: 8 to 14 digits inside td or a
      const bcMatch = row.match(/(?:>|\b)(\d{8}|\d{12,14})(?:<|\b)/);
      if (!bcMatch) continue;
      const barcode = bcMatch[1];

      // Strip HTML tags to get clean text
      const plain = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const parts = plain.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);

      // Extract item name (usually after barcode and index)
      // Example row plain: "1 4870028002821 Шоколад Казахстанский Nuts 0,100кг x 40 ШТ. 106"
      const nameMatch = plain.replace(barcode, ' ').replace(/^\s*\d+\s+/, '').replace(/\s+\d+\s*$/, '').trim();
      if (nameMatch && nameMatch.length > 3) {
        results.push({
          source: 'barcode_list_ru',
          barcode,
          name: nameMatch,
          rawRow: plain,
        });
      }
    }

    return results;
  } catch (e) {
    return [];
  }
}
