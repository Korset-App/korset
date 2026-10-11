import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { classifyCatalogText } from '../../src/domain/catalog/textRecovery.js';

const script = join(process.cwd(), 'scripts/preview-catalog-text-recovery.mjs');
const base = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ean: '5449000000996', name: 'Молоко', category: 'dairy_eggs', ingredients_raw: 'молоко', description: 'Молочный продукт', source_primary: 'label', source_confidence: 'high', is_verified: false, needs_review: false, normalized_marker: false, updated_at: '2026-10-11T00:00:00Z' };
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(rows = [base], options = {}) {
  const root = await mkdtemp(join(process.cwd(), 'scratch', 'catalog-text-test-'));
  const snapshot = join(root, 'snapshot');
  await mkdir(snapshot);
  const page = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
  await writeFile(join(snapshot, 'page-001.jsonl'), page);
  const manifest = { scope: { active: true, normalized: false, excludedCategories: ['personal_care', 'household'] }, expected_rows: rows.length, capture_started_at: '2026-10-11T00:00:00Z', capture_finished_at: '2026-10-11T00:01:00Z', complete: true, pages: [{ path: 'page-001.jsonl', count: rows.length, sha256: hash(page) }], historical_checkpoint: { totalErrors: 15 }, ...options };
  await writeFile(join(snapshot, 'manifest.json'), JSON.stringify(manifest));
  return { root, snapshot, output: join(root, 'output'), manifest };
}

test('classifies missing text, duplication and explicit composition conservatively', () => {
  assert.deepEqual(classifyCatalogText({ ...base, ingredients_raw: null, description: null }).reasons, ['ingredient_missing', 'description_missing']);
  assert.ok(classifyCatalogText({ ...base, ingredients_raw: 'Молоко, сахар', description: 'Состав: молоко, сахар' }).reasons.includes('composition_in_description'));
  assert.ok(classifyCatalogText({ ...base, ingredients_raw: 'Свежее молоко высокой жирности', description: 'Свежее молоко высокой жирности для семьи' }).reasons.includes('text_duplication'));
  assert.ok(!classifyCatalogText({ ...base, ingredients_raw: 'молоко', description: 'Вкусное молоко' }).reasons.includes('text_duplication'));
  assert.ok(classifyCatalogText({ ...base, ingredients_raw: 'Идеально для всей семьи. Очень вкусно', description: 'Описание' }).reasons.includes('marketing_in_ingredients'));
  assert.ok(classifyCatalogText({ ...base, ingredients_raw: 'Очень вкусный продукт', description: 'Описание' }).reasons.includes('marketing_in_ingredients'));
  assert.ok(!classifyCatalogText({ ...base, ingredients_raw: 'сахар, какао; усилитель вкуса и аромата — экстракт натуральной ванили', description: 'Описание' }).reasons.includes('marketing_in_ingredients'));
  assert.ok(!classifyCatalogText({ ...base, ingredients_raw: 'ароматизатор со вкусом клубники', description: 'Описание' }).reasons.includes('marketing_in_ingredients'));
  assert.ok(classifyCatalogText({ ...base, description: 'Описание без точки\nСостав: молоко' }).reasons.includes('composition_in_description'));
});

test('verified and source flags do not hide missing ingredients or imply clean data', () => {
  const result = classifyCatalogText({ ...base, ingredients_raw: null, source_primary: null, is_verified: true, normalized_marker: true });
  assert.ok(result.reasons.includes('ingredient_missing'));
  assert.equal(result.evidence.source_primary, null);
  assert.equal(result.evidence.is_verified, true);
  assert.equal(result.evidence.normalized_marker, true);
  assert.equal(result.evidence.ingredient_provenance, 'unverified_by_snapshot');
  assert.equal(result.action, 'review_only');
  assert.equal('updatePayload' in result, false);
});

test('CLI preserves exact identity and marks absent historical IDs unknown', async () => {
  const f = await fixture([{ ...base, ingredients_raw: null, is_verified: true }]);
  const run = spawnSync(process.execPath, [script, '--snapshot', f.snapshot, '--output', f.output], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const queue = JSON.parse((await readFile(join(f.output, 'queue.jsonl'), 'utf8')).trim());
  const summary = JSON.parse(await readFile(join(f.output, 'summary.json'), 'utf8'));
  assert.equal(queue.id, base.id);
  assert.equal(queue.ean, base.ean);
  assert.equal(queue.history_applied, 'unknown');
  assert.equal(queue.action, 'review_only');
  assert.match(queue.inputHash, /^[a-f0-9]{64}$/);
  assert.equal(summary.historical_checkpoint.totalErrors, 15);
  assert.doesNotMatch(run.stdout, /5449000000996|Молоко/);
});

test('explicit applied audit log marks only matching IDs', async () => {
  const f = await fixture([{ ...base, ingredients_raw: null }, { ...base, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', ean: '5449000054227', ingredients_raw: null }]);
  const log = join(f.root, 'audit.jsonl');
  await writeFile(log, JSON.stringify({ id: base.id, status: 'applied' }) + '\n');
  const run = spawnSync(process.execPath, [script, '--snapshot', f.snapshot, '--output', f.output, '--log', log], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const queue = (await readFile(join(f.output, 'queue.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(queue.map(row => row.history_applied), ['yes', 'unknown']);
});

test('rejects apply, corrupt pages, duplicate IDs and escaping paths before output', async () => {
  const f = await fixture([{ ...base, ingredients_raw: null }]);
  const args = ['--snapshot', f.snapshot, '--output', f.output];
  assert.notEqual(spawnSync(process.execPath, [script, ...args, '--apply'], { encoding: 'utf8' }).status, 0);
  await writeFile(join(f.snapshot, 'page-001.jsonl'), '{}\n');
  assert.notEqual(spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' }).status, 0);
  const dup = await fixture([base, base]);
  assert.notEqual(spawnSync(process.execPath, [script, '--snapshot', dup.snapshot, '--output', dup.output], { encoding: 'utf8' }).status, 0);
  const escape = await fixture();
  escape.manifest.pages[0].path = '../page-001.jsonl';
  await writeFile(join(escape.snapshot, 'manifest.json'), JSON.stringify(escape.manifest));
  assert.notEqual(spawnSync(process.execPath, [script, '--snapshot', escape.snapshot, '--output', escape.output], { encoding: 'utf8' }).status, 0);
  for (const changed of [
    { id: 'not-a-uuid' },
    { category: 'dairy' },
    { normalized_marker: true },
  ]) {
    const invalid = await fixture([{ ...base, ...changed }]);
    assert.notEqual(spawnSync(process.execPath, [script, '--snapshot', invalid.snapshot, '--output', invalid.output], { encoding: 'utf8' }).status, 0);
  }
});

test('bad EAN remains exact and is queued for identity review', async () => {
  const f = await fixture([{ ...base, ean: '5449-000000996' }]);
  const run = spawnSync(process.execPath, [script, '--snapshot', f.snapshot, '--output', f.output], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const row = JSON.parse((await readFile(join(f.output, 'queue.jsonl'), 'utf8')).trim());
  assert.equal(row.ean, '5449-000000996');
  assert.ok(row.reasons.includes('identity_invalid_ean'));
});

test('unflagged rows are counted without certification as clean', async () => {
  const f = await fixture();
  const run = spawnSync(process.execPath, [script, '--snapshot', f.snapshot, '--output', f.output], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(await readFile(join(f.output, 'summary.json'), 'utf8'));
  assert.equal(summary.unflagged_rows, 1);
  assert.equal(summary.assessment, 'not_certified_clean');
});

test('resumes an identical incomplete queue and refuses to overwrite a complete run', async () => {
  const f = await fixture([{ ...base, ingredients_raw: null }]);
  const args = [script, '--snapshot', f.snapshot, '--output', f.output];
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  const expectedQueue = await readFile(join(f.output, 'queue.jsonl'), 'utf8');
  const complete = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.notEqual(complete.status, 0);
  assert.equal(await readFile(join(f.output, 'queue.jsonl'), 'utf8'), expectedQueue);
  const { unlink } = await import('node:fs/promises');
  await unlink(join(f.output, 'summary.json'));
  const resumed = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(await readFile(join(f.output, 'queue.jsonl'), 'utf8'), expectedQueue);
});

test('pre-existing output lock refuses publish without deleting lock or writing results', async () => {
  const f = await fixture([{ ...base, ingredients_raw: null }]);
  await mkdir(f.output);
  await writeFile(join(f.output, '.preview.lock'), 'another writer');
  const run = spawnSync(process.execPath, [script, '--snapshot', f.snapshot, '--output', f.output], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.equal(await readFile(join(f.output, '.preview.lock'), 'utf8'), 'another writer');
  await assert.rejects(readFile(join(f.output, 'queue.jsonl'), 'utf8'), { code: 'ENOENT' });
  await assert.rejects(readFile(join(f.output, 'summary.json'), 'utf8'), { code: 'ENOENT' });
});
