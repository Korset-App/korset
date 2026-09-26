import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHECKPOINT = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_checkpoint_clean.jsonl');
const TARGET = path.join(__dirname, '..', 'data', 'korset_master_catalog_v4_final.jsonl');

if (!fs.existsSync(CHECKPOINT)) {
  console.error('Checkpoint file not found:', CHECKPOINT);
  process.exit(1);
}

console.log('Restoring master catalog from checkpoint:');
console.log('Source:', CHECKPOINT);
console.log('Target:', TARGET);

fs.copyFileSync(CHECKPOINT, TARGET);

function getHash(file) {
  const content = fs.readFileSync(file);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const cHash = getHash(CHECKPOINT);
const tHash = getHash(TARGET);

console.log('Checkpoint SHA256:', cHash);
console.log('Target SHA256:    ', tHash);
console.log('Rollback successful:', cHash === tHash);
