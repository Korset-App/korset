import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JSONL_PATH = path.join(__dirname, '..', 'data', 'clean_catalog_v2.jsonl');

async function sync() {
  console.log('=== SYNCING SUPABASE CLEAN_PRODUCTS_V2 TO LOCAL JSONL ===');
  const tempPath = JSONL_PATH + '.tmp';
  const writeStream = fs.createWriteStream(tempPath, { flags: 'w', encoding: 'utf-8' });

  let offset = 0;
  const PAGE_SIZE = 1000;
  let totalWritten = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from('clean_products_v2')
      .select('*')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      writeStream.write(JSON.stringify(row) + '\n');
      totalWritten++;
    }

    console.log(`Exported ${totalWritten} records...`);
    offset += PAGE_SIZE;
  }

  writeStream.end();
  await new Promise(r => writeStream.on('finish', r));

  fs.renameSync(tempPath, JSONL_PATH);
  console.log(`=== SYNC COMPLETE: ${totalWritten} records saved to ${JSONL_PATH} ===`);
}

sync();
