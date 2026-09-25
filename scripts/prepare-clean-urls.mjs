import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapPath = path.join(__dirname, '..', 'data', 'master_eans_to_semeiniy_urls.json');
const eanToUrl = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Extract all unique product URLs
const urls = [...new Set(Object.values(eanToUrl))];
console.log(`Loaded ${urls.length} unique, verified product URLs for Master Catalog FMCG.`);

const outPath = path.join(__dirname, '..', 'data', 'semeiniy_clean_master_urls.json');
fs.writeFileSync(outPath, JSON.stringify(urls, null, 2));
console.log(`Saved clean target URLs to ${outPath}`);
