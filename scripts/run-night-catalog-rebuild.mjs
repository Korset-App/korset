/**
 * Master Night Orchestrator for Clean Catalog v2 Rebuild.
 * Runs complete verification of 13,104 products, expands with Kazakh staples,
 * and generates the morning audit report.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n======================================================`);
    console.log(`[START] Running: node ${scriptPath} ${args.join(' ')}`);
    console.log(`======================================================\n`);

    const p = spawn('node', [scriptPath, ...args], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: false,
    });

    p.on('close', code => {
      if (code === 0) {
        console.log(`\n[DONE] ${scriptPath} exited successfully (code 0).`);
        resolve();
      } else {
        console.error(`\n[ERROR] ${scriptPath} exited with code ${code}.`);
        reject(new Error(`Script ${scriptPath} failed with code ${code}`));
      }
    });

    p.on('error', err => reject(err));
  });
}

async function main() {
  const startTime = Date.now();
  console.log(`[ORCHESTRATOR] Starting overnight clean catalog rebuild at ${new Date().toISOString()}`);

  // Stage 1: Build Clean Catalog from 13,104 products
  console.log('\n>>> STAGE 1: Full Zero-Tolerance scan and verification of ~13,104 products...');
  await runScript(path.join(__dirname, 'build-clean-catalog-v2.mjs'));

  // Stage 2: Expand with top staple Kazakh brands
  console.log('\n>>> STAGE 2: Expanding catalog with essential Kazakh grocery staples...');
  await runScript(path.join(__dirname, 'expand-clean-catalog-essentials.mjs'));

  const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`[NIGHT RUN COMPLETE] All stages finished in ${elapsedMinutes} minutes.`);
  console.log(`======================================================`);
}

main().catch(err => {
  console.error('[FATAL] Night orchestrator failed:', err);
  process.exit(1);
});
