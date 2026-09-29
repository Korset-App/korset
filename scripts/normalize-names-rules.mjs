import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Suffixes at the end of product names (or preceding trailing spaces/punctuation)
// Covered formats from plan:
// м/у, к/у, д/п, т/п, пэт, ст/б, ж/б, пауч, ведро, шоубокс, флоу-пак, п/б, с/б, лам, орг.уп, пп
const END_SUFFIX_RE = /\s+(?:[мМkK][/][уУyY]|[кК][/][уУ]|[дД][/][пП]|[тТ][/][пП]|[пП][эЭ][тТ]|[сС][тТ][/][бБ]|[жЖ][/][бБ]|[пП][аА][уУ][чЧ]|[вВ][еЕ][дД][рР][оО]|[шШ][оО][уУ][бБ][оО][кК][сС]|[фФ][лЛ][оО][уУ]-[пП][аА][кК]|[пП][/][бБ]|[сС][/][бБ]|[лЛ][аА][мМ]|[оО][рР][гГ][.]?[уУ][пП]|[пП][пП])\s*$/i;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes a product name deterministically without AI.
 * 
 * Rules:
 * 1. Decode HTML entities and unify spaces.
 * 2. Remove trade packaging suffixes from the end of the name.
 * 3. Normalize weights and volumes (40гр -> 40г, 250 мл -> 250мл, 1 л -> 1л).
 * 4. Normalize percentages and spacing.
 * 5. Clean up duplicate brand names (e.g. "Makfa Makfa" -> "Makfa").
 * 6. Sentence case: ensure the first letter is capitalized.
 * 7. Invariants: do not touch verified items, do not reduce name below 4 chars.
 */
export function normalizeProductName(rawName, brand = null, specsJson = {}) {
  if (!rawName || typeof rawName !== 'string') return null;

  // Invariant: check if already normalized or verified
  if (specsJson?.name_normalized === true) return rawName;
  if (specsJson?.v4_master_provenance?.name_verified === true) return rawName;
  if (specsJson?.name_verified === true) return rawName;

  let name = rawName;

  // 0. Decode HTML entities (e.g. &#039; -> ', &quot; -> ", &amp; -> &)
  name = name
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // Replace non-breaking spaces (\u00A0) and tabs with standard space
  name = name.replace(/[\u00A0\t]/g, ' ');

  // 1. Remove trade package suffixes from the end of name
  let prev;
  do {
    prev = name;
    name = name.replace(END_SUFFIX_RE, '');
    name = name.replace(/[,;.-]\s*$/, '').trim();
  } while (name !== prev);

  // 2. Normalize weights and volumes (using Cyrillic-safe lookahead instead of \b)
  // 40гр -> 40г
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*[гГ][рР](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1г');
  // 40 г -> 40г (closing space before 'г', avoiding Russian words starting with г)
  name = name.replace(/(\d+(?:[.,]\d+)?)\s+[гГ](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1г');
  // 250 мл -> 250мл
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*[мМ][лЛ](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1мл');
  // 1 кг -> 1кг
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*[кК][гГ](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1кг');
  // 1 л / 1.5 л -> 1л / 1.5л (avoiding Russian words starting with л)
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*[лЛ](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1л');
  // 100 шт -> 100шт
  name = name.replace(/(\d+)\s*[шШ][тТ](?![а-яА-ЯёЁa-zA-Z])[.]?/g, '$1шт');

  // Format percentages (e.g. "0,8%, 260мл" -> "0,8% 260мл", "3.2 %" -> "3.2%")
  name = name.replace(/(\d+(?:[.,]\d+)?)\s*%\s*,?/g, '$1% ');

  // 3. Remove consecutive duplicate brand occurrences (e.g. "Makfa Makfa" -> "Makfa")
  if (brand && typeof brand === 'string' && brand.trim().length >= 3) {
    const brandTrimmed = brand.trim();
    const doubleBrandRegex = new RegExp(`\\b(${escapeRegex(brandTrimmed)})\\s+\\1\\b`, 'i');
    name = name.replace(doubleBrandRegex, '$1');
  }

  // 4. Remove duplicate brand prefix ONLY if:
  // - name starts with brand + ' '
  // - what remains contains substantive product words (not just weights or single letters)
  if (brand && typeof brand === 'string' && brand.trim().length >= 3) {
    const brandTrimmed = brand.trim();
    const lowerName = name.toLowerCase();
    const lowerBrand = brandTrimmed.toLowerCase();
    if (lowerName.startsWith(lowerBrand + ' ')) {
      const remainder = name.slice(brandTrimmed.length).trim();
      const substantive = remainder
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:г|гр|кг|мл|л|шт|%)\b/gi, '')
        .replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '')
        .trim();
      // Only strip if remainder has at least 5 letters of real product name
      if (substantive.length >= 5) {
        name = remainder;
      }
    }
  }

  // 5. Clean up multiple spaces, trim, remove trailing punctuation
  name = name.replace(/\s+/g, ' ').trim();
  name = name.replace(/[,;.-]\s*$/, '').trim();

  // 6. Sentence case: capitalize first letter if not already
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Invariant: if result is too short, return rawName
  if (name.length < 4) {
    return rawName;
  }

  return name;
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  console.log(`\n======================================================`);
  console.log(`📦 CATALOG NAME NORMALIZATION — PHASE 1 (RULE-BASED)`);
  console.log(`Mode:  ${isDryRun ? '🧪 DRY RUN (no DB writes)' : '🚀 LIVE APPLY (writing to Supabase)'}`);
  if (maxLimit > 0) console.log(`Limit: First ${maxLimit} records only`);
  console.log(`======================================================\n`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const logPath = path.join(__dirname, `normalize-log-${dateStr}.jsonl`);
  const logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });

  const startAfterArg = process.argv.find(a => a.startsWith('--start-after='));
  let lastId = startAfterArg ? startAfterArg.split('=')[1] : '00000000-0000-0000-0000-000000000000';
  if (startAfterArg) console.log(`Resuming from ID: ${lastId}`);

  let totalProcessed = 0;
  let totalChanged = 0;
  let totalSkippedTooShort = 0;
  let totalSkippedVerified = 0;
  let totalErrors = 0;

  const samples = [];
  const BATCH_SIZE = 500;

  async function fetchBatchWithRetry(sbClient, currentLastId, limit, maxRetries = 4) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error } = await sbClient
        .from('global_products')
        .select('id, ean, name, brand, specs_json')
        .eq('is_active', true)
        .gt('id', currentLastId)
        .order('id')
        .limit(limit);

      if (!error) return { data, error: null };
      console.warn(`[Retry ${attempt}/${maxRetries}] Fetch failed at ${currentLastId}: ${error.message}. Waiting ${attempt * 3}s...`);
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
    return { data: null, error: new Error(`Failed to fetch after ${maxRetries} attempts`) };
  }

  while (true) {
    const fetchLimit = maxLimit > 0 ? Math.min(BATCH_SIZE, maxLimit - totalProcessed) : BATCH_SIZE;
    if (fetchLimit <= 0) break;

    const { data, error } = await fetchBatchWithRetry(sb, lastId, fetchLimit);

    if (error) {
      console.error(`DB Fetch error at lastId ${lastId}:`, error.message);
      totalErrors++;
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    const batchUpdates = [];

    for (const item of data) {
      totalProcessed++;
      const currentSpecs = item.specs_json || {};

      // Check invariants
      if (currentSpecs.name_normalized === true || 
          currentSpecs.v4_master_provenance?.name_verified === true ||
          currentSpecs.name_verified === true) {
        totalSkippedVerified++;
        continue;
      }

      const rawName = item.name;
      const normalized = normalizeProductName(rawName, item.brand, currentSpecs);

      if (!normalized || normalized.length < 4) {
        totalSkippedTooShort++;
        logStream.write(JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'skipped_too_short',
          id: item.id,
          ean: item.ean,
          rawName
        }) + '\n');
        continue;
      }

      if (normalized !== rawName) {
        totalChanged++;
        const newSpecs = {
          ...currentSpecs,
          name_normalized: true,
          name_normalized_at: new Date().toISOString()
        };

        batchUpdates.push({
          id: item.id,
          ean: item.ean,
          name: normalized,
          specs_json: newSpecs,
          oldName: rawName
        });

        if (samples.length < 30) {
          samples.push({
            id: item.id,
            ean: item.ean,
            brand: item.brand,
            before: rawName,
            after: normalized
          });
        }

        logStream.write(JSON.stringify({
          timestamp: new Date().toISOString(),
          status: isDryRun ? 'dry_run_change' : 'applied',
          id: item.id,
          ean: item.ean,
          brand: item.brand,
          before: rawName,
          after: normalized
        }) + '\n');
      }
    }

    lastId = data[data.length - 1].id;

    // Apply batch updates if live mode and there are updates
    if (isApply && batchUpdates.length > 0) {
      const CONCURRENCY = 25;
      for (let c = 0; c < batchUpdates.length; c += CONCURRENCY) {
        const chunk = batchUpdates.slice(c, c + CONCURRENCY);
        await Promise.all(chunk.map(async (update) => {
          const { error: updateErr } = await sb
            .from('global_products')
            .update({
              name: update.name,
              specs_json: update.specs_json
            })
            .eq('id', update.id);

          if (updateErr) {
            console.error(`Failed to update product ${update.id} (${update.ean}):`, updateErr.message);
            totalErrors++;
          }
        }));
      }
    }

    if (totalProcessed % 2000 === 0 || totalProcessed >= maxLimit || data.length < fetchLimit) {
      console.log(`[Progress] Processed: ${totalProcessed} | Changed: ${totalChanged} | Skipped Verified: ${totalSkippedVerified} | Skipped Short: ${totalSkippedTooShort}`);
    }

    if (maxLimit > 0 && totalProcessed >= maxLimit) {
      break;
    }
  }

  logStream.end();

  console.log(`\n======================================================`);
  console.log(`📊 NORMALIZATION SUMMARY (${isDryRun ? 'DRY RUN' : 'APPLIED'})`);
  console.log(`======================================================`);
  console.log(`Total active examined:   ${totalProcessed}`);
  console.log(`Names changed:           ${totalChanged} (${Math.round((totalChanged / (totalProcessed || 1)) * 100)}%)`);
  console.log(`Names unchanged:         ${totalProcessed - totalChanged - totalSkippedVerified - totalSkippedTooShort}`);
  console.log(`Skipped verified:        ${totalSkippedVerified}`);
  console.log(`Skipped too short (<4):  ${totalSkippedTooShort}`);
  console.log(`DB Errors:               ${totalErrors}`);
  console.log(`Detailed audit log:      ${logPath}`);

  console.log(`\n📝 EXAMPLES OF NORMALIZED NAMES (${samples.length}):\n`);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    console.log(`[${i + 1}] EAN: ${s.ean} (Brand: ${s.brand || 'none'})`);
    console.log(`   BEFORE: "${s.before}"`);
    console.log(`   AFTER:  "${s.after}"\n`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('normalize-names-rules.mjs')) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
