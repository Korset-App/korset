import { createHash } from 'node:crypto';
import { readFile, mkdir, open, rename, stat, realpath, unlink } from 'node:fs/promises';
import { resolve, join, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { classifyCatalogText } from '../src/domain/catalog/textRecovery.js';
import { CATEGORIES } from '../src/domain/product/categoryMap.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--snapshot', '--output', '--log'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--') || options[key]) fail('Expected --snapshot, --output and optional --log only');
    options[key] = args[i + 1];
  }
  if (!options['--snapshot'] || !options['--output']) fail('Both --snapshot and --output are required');
  return options;
}

function pagePath(snapshot, relativePath) {
  if (typeof relativePath !== 'string' || !/^page-[0-9]+\.jsonl$/u.test(relativePath) || isAbsolute(relativePath) || relativePath.includes('..') || relativePath.includes(sep)) fail('Invalid page path');
  return join(snapshot, relativePath);
}

function parseJson(value, label) {
  try { return JSON.parse(value); } catch { return fail(`Invalid JSON in ${label}`); }
}

export async function readSnapshot(snapshot) {
  const manifest = parseJson(await readFile(join(snapshot, 'manifest.json'), 'utf8'), 'manifest');
  if (!isObject(manifest) || manifest.complete !== true || manifest.scope?.active !== true || manifest.scope?.normalized !== false ||
      !Array.isArray(manifest.scope?.excludedCategories) || !['personal_care', 'household'].every(category => manifest.scope.excludedCategories.includes(category)) ||
      !Number.isSafeInteger(manifest.expected_rows) || manifest.expected_rows < 0 ||
      !validDate(manifest.capture_started_at) || !validDate(manifest.capture_finished_at) ||
      Date.parse(manifest.capture_finished_at) < Date.parse(manifest.capture_started_at) ||
      !Array.isArray(manifest.pages) || !manifest.pages.length || !isObject(manifest.historical_checkpoint)) fail('Invalid or incomplete snapshot manifest');
  const records = [];
  const ids = new Set();
  const paths = new Set();
  const snapshotRealPath = await realpath(snapshot);
  for (const page of manifest.pages) {
    if (!isObject(page) || !Number.isSafeInteger(page.count) || page.count < 0 || !/^[a-f0-9]{64}$/u.test(page.sha256) || paths.has(page.path)) fail('Invalid page entry');
    paths.add(page.path);
    const path = pagePath(snapshot, page.path);
    if (resolve(await realpath(path)) !== resolve(join(snapshotRealPath, page.path))) fail('Page path escapes snapshot');
    const content = await readFile(path);
    if (hash(content) !== page.sha256) fail('Page hash mismatch');
    const lines = content.toString('utf8').split('\n');
    if (lines.at(-1) === '') lines.pop();
    if (lines.length !== page.count || lines.some(line => !line.trim())) fail('Page count mismatch');
    for (const line of lines) {
      const row = parseJson(line, page.path);
      if (!isObject(row) || typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(row.id) ||
          !Object.hasOwn(row, 'ean') || (typeof row.ean !== 'string' && row.ean !== null) || ids.has(row.id) ||
          !Object.hasOwn(CATEGORIES, row.category) || manifest.scope.excludedCategories.includes(row.category) || row.normalized_marker !== false) fail('Invalid, duplicate or out-of-scope record');
      ids.add(row.id);
      records.push({ row, inputHash: hash(line) });
    }
  }
  if (records.length !== manifest.expected_rows) fail('Snapshot row count mismatch');
  return { manifest, records };
}

async function readAppliedLogs(paths) {
  const ids = new Set();
  for (const path of paths) {
    const contents = await readFile(resolve(path), 'utf8');
    for (const line of contents.split(/\r?\n/u)) {
      if (!line.trim()) continue;
      const item = parseJson(line, 'audit log');
      if (!isObject(item) || typeof item.id !== 'string' || !item.id) fail('Invalid audit log record');
      if (item.status === 'applied' || item.applied === true) ids.add(item.id);
    }
  }
  return ids;
}

export async function publish(output, queue, summary) {
  await mkdir(output, { recursive: true });
  const lockPath = join(output, '.preview.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') fail('Output is locked; use a new unique output directory');
    throw error;
  }
  try { await publishUnderLock(output, queue, summary); }
  finally {
    await lock.close();
    await unlink(lockPath);
  }
}

async function publishUnderLock(output, queue, summary) {
  const queueContents = queue.map(item => JSON.stringify(item)).join('\n') + (queue.length ? '\n' : '');
  const summaryContents = JSON.stringify(summary, null, 2) + '\n';
  let existingQueue = null;
  try { existingQueue = await readFile(join(output, 'queue.jsonl'), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await stat(join(output, 'summary.json')); fail('Output already complete; use a new directory'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existingQueue !== null && existingQueue !== queueContents) fail('Incomplete output differs from current snapshot; use a new directory');
  const suffix = `${process.pid}-${Date.now()}`;
  const queueTemp = join(output, `.queue-${suffix}.tmp`);
  const summaryTemp = join(output, `.summary-${suffix}.tmp`);
  if (existingQueue === null) {
    const queueFile = await open(queueTemp, 'wx');
    try { await queueFile.writeFile(queueContents); await queueFile.sync(); }
    finally { await queueFile.close(); }
    await rename(queueTemp, join(output, 'queue.jsonl'));
  }
  const summaryFile = await open(summaryTemp, 'wx');
  try { await summaryFile.writeFile(summaryContents); await summaryFile.sync(); }
  finally { await summaryFile.close(); }
  await rename(summaryTemp, join(output, 'summary.json'));
}

async function main() {
  const args = process.argv.slice(2);
  const logPaths = [];
  const filtered = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--log') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) fail('Expected path after --log');
      logPaths.push(args[++i]);
    } else filtered.push(args[i]);
  }
  const options = parseArgs(filtered);
  const snapshotPath = resolve(options['--snapshot']);
  const outputPath = resolve(options['--output']);
  if (outputPath === snapshotPath || outputPath.startsWith(snapshotPath + sep)) fail('Output must be outside the snapshot');
  const { manifest, records } = await readSnapshot(snapshotPath);
  const appliedIds = await readAppliedLogs(logPaths);
  const counts = {};
  const queue = [];
  for (const { row, inputHash } of records) {
    const result = classifyCatalogText(row);
    if (!result.reasons.length) continue;
    for (const reason of result.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
    queue.push({ id: row.id, ean: row.ean, ...result, inputHash, history_applied: appliedIds.has(row.id) ? 'yes' : 'unknown' });
  }
  const summary = {
    snapshot_sha256: hash(JSON.stringify(manifest)),
    capture_started_at: manifest.capture_started_at,
    capture_finished_at: manifest.capture_finished_at,
    scanned_rows: records.length,
    review_rows: queue.length,
    unflagged_rows: records.length - queue.length,
    assessment: 'not_certified_clean',
    reason_counts: counts,
    history_applied_known: queue.filter(item => item.history_applied === 'yes').length,
    history_unknown: queue.filter(item => item.history_applied === 'unknown').length,
    historical_checkpoint: manifest.historical_checkpoint,
    action: 'review_only',
  };
  await publish(outputPath, queue, summary);
  process.stdout.write(JSON.stringify({ scanned_rows: summary.scanned_rows, review_rows: summary.review_rows, reason_counts: counts }) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
