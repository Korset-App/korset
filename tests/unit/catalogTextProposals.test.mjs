import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { proposeCatalogText } from '../../src/domain/catalog/textProposals.js';

const base = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', ean: '5449000000996', category: 'dairy_eggs', description: 'Натуральный молочный продукт.\nСостав: молоко, соя, E 330. Может содержать следы орехов. Не содержит глютен.', ingredients_raw: 'молоко, соя, E 330. Может содержать следы орехов. Не содержит глютен.', normalized_marker: false, updated_at: '2026-10-11T00:00:00Z' };
const hash = value => createHash('sha256').update(value).digest('hex');
const classify = () => ({ reasons: ['composition_in_description'], evidence: { ingredient_provenance: 'unverified_by_snapshot' } });

test('retains warning prefix and changes description only for exact terminal repeat', () => {
  const row = { ...base, description: 'Содержит молоко и сою.\n' + base.description };
  const result = proposeCatalogText(row, classify(row), 'inputhash');
  assert.equal(result.status, 'candidate');
  assert.equal(result.action, 'review_only');
  assert.equal(result.before.ingredients_raw, result.after.ingredients_raw);
  assert.equal(result.after.description, 'Содержит молоко и сою.\nНатуральный молочный продукт.');
  assert.equal(result.spans.retained.text + result.spans.deleted.text, row.description);
  assert.match(result.spans.deleted.text, /E 330\. Может содержать следы орехов\. Не содержит глютен\./u);
});

test('missing ingredient proposal preserves extracted text and denies source confirmation', () => {
  const row = { ...base, ingredients_raw: null, description: 'Тауар туралы сипаттама.\nҚұрамы: сүт, соя, E 330. Құрамында жаңғақ іздері болуы мүмкін.' };
  const result = proposeCatalogText(row, { reasons: ['ingredient_missing', 'composition_in_description'], evidence: {} }, 'inputhash');
  assert.equal(result.status, 'candidate');
  assert.equal(result.after.ingredients_raw, 'сүт, соя, E 330. Құрамында жаңғақ іздері болуы мүмкін.');
  assert.equal(result.after.description, row.description);
  assert.equal(result.provenance.source_confirmed, false);
});

test('defers mismatches, multiple labels, metadata, marketing, tiny and empty prefix', () => {
  const descriptions = [
    'Хорошее молоко. Состав: молоко, сахар',
    'Хорошее молоко. Состав: молоко. Құрамы: сүт',
    'Хорошее молоко. Состав: молоко. Производитель: Завод',
    'Хорошее молоко. Состав: молоко. Пищевая ценность: 100 ккал',
    'Хорошее молоко. Состав: молоко. Условия хранения: 4 градуса',
    'Хорошее молоко. Состав: молоко. Срок годности: 2 дня',
    'Хорошее молоко. Состав: молоко. Страна: Казахстан',
    'Хорошее молоко. Состав: молоко. ТОО «Кублей» - одно из крупнейших перерабатывающих предприятий, созданная в 1992 году.',
    'Хорошее молоко. Состав: идеальный вкусный выбор для всей семьи.',
    'Хорошее молоко. Состав: соль',
    'Состав: молоко, соя, E 330. Может содержать следы орехов. Не содержит глютен.',
  ];
  for (const description of descriptions) assert.equal(proposeCatalogText({ ...base, description }, classify(base), 'hash').status, 'deferred', description);
  assert.equal(proposeCatalogText({ ...base, description: 'Описание: натуральное молоко без добавок и красителей' }, { reasons: ['text_duplication'], evidence: {} }, 'hash').status, 'deferred');
});

test('case and whitespace equivalence only, punctuation changes defer', () => {
  assert.equal(proposeCatalogText({ ...base, description: 'Натуральное молоко.\nСостав: МОЛОКО,   СОЯ, E 330. Может содержать следы орехов. Не содержит глютен.' }, classify(base), 'hash').status, 'candidate');
  assert.equal(proposeCatalogText({ ...base, description: 'Натуральное молоко. Состав: молоко; соя, E 330. Может содержать следы орехов. Не содержит глютен.' }, classify(base), 'hash').status, 'deferred');
});

test('defers embedded nutrition and storage headings without a direct colon', () => {
  const suffixes = [
    'молоко, сахар. Пищевая ценность на 100 грамм: Белки: 2 г.',
    'молоко, сахар. Условия хранения хранить при температуре от 2 до 6 градусов.',
    'молоко, сахар. Срок годности составляет 30 суток.',
    'молоко, сахар. Страна происхождения Казахстан.',
  ];
  for (const suffix of suffixes) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'metadata_after_composition');
  }
  const legitimate = 'молоко, эмульгатор: соевый лецитин. Может содержать следы орехов.';
  const row = { ...base, ingredients_raw: legitimate, description: `Натуральный молочный продукт. Состав: ${legitimate}` };
  assert.equal(proposeCatalogText(row, classify(row), 'hash').status, 'candidate');
});

test('defers unbalanced recipe brackets', () => {
  for (const suffix of ['молоко, сахар (эмульгатор: соевый лецитин', 'молоко, сахар (эмульгатор: лецитин))']) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'unbalanced_composition_brackets');
  }
});

test('defers incomplete terminal punctuation and obvious truncation', () => {
  for (const end of [',', ';', ':', '-', '—', '...', '…']) {
    const suffix = `рис шлифованный, сыворотка молочная сухая${end}`;
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'incomplete_composition_tail', end);
  }
});

test('defers factory and promotional narratives inside composition', () => {
  for (const suffix of [
    'какао, сахар. Кондитерская фабрика КДВ «Яшкино» являетс',
    'какао, сахар. ЭКО-СИСТЕМА ЗДОРОВОГО ПИТАНИЯ! Растим среди потребителей интерес и прививаем поле',
  ]) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').status, 'deferred');
  }
});

test('defers legal manufacturer identifiers inside composition', () => {
  for (const legalName of ['ООО', 'АО', 'ОАО', 'ПАО', 'ЗАО', 'Акционерное общество']) {
    const suffix = `молоко, сахар. ${legalName} «Продукты» выпускает этот товар`;
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'narrative_in_composition', legalName);
  }
});

test('requires terminal full stop without claiming a missing end is proven truncation', () => {
  for (const suffix of ['мука, сахар, какао кусо', 'рыба, соль, мука пшенична', 'крупа рисовая, молоко, аген', 'молоко, сахар']) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'terminal_completion_unproven');
  }
});

test('defers incomplete description prefix without repairing punctuation', () => {
  for (const end of [',', ';', ':', '-', '—', '...', '…']) {
    const description = `Лед с ароматом арбуза и яблока${end} Состав: ${base.ingredients_raw}`;
    const row = { ...base, description };
    const result = proposeCatalogText(row, classify(row), 'hash');
    assert.equal(result.reason, 'incomplete_description_prefix', end);
    assert.equal(result.before.description, description);
    assert.equal('after' in result, false);
  }
});

test('defers non-warning sentences after first composition sentence', () => {
  for (const suffix of [
    'мука, сахар. В любой непонятной ситуации – хрустай печенье.',
    'молоко, соль. «СЕЛО ЗЕЛЁНОЕ» - выбор каждой семьи.',
  ]) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, 'additional_sentence_requires_review');
  }
  const warning = 'молоко, соя. Может содержать следы орехов. Не содержит глютен.';
  const row = { ...base, ingredients_raw: warning, description: `Натуральный молочный продукт. Состав: ${warning}` };
  const result = proposeCatalogText(row, classify(row), 'hash');
  assert.equal(result.status, 'candidate');
  assert.equal(result.after.ingredients_raw, warning);
});

test('preserves a standalone E-additive sentence after safety warnings', () => {
  const suffix = 'молоко, соя. Может содержать следы орехов. Не содержит глютен. E 330.';
  const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
  const result = proposeCatalogText(row, classify(row), 'hash');
  assert.equal(result.status, 'candidate');
  assert.equal(result.after.ingredients_raw, suffix);
  assert.equal(result.spans.candidate.text.trim(), suffix);
});

test('defers asterisk footnotes and direct storage instruction', () => {
  const cases = [
    ['молоко, закваска B. Lactis*. Может содержать следы глютена. * Эксклюзивные БИО - это миллиарды би', 'ambiguous_asterisk'],
    ['молоко, сахар. Хранить при температуре 2–6 °C', 'metadata_after_composition'],
  ];
  for (const [suffix, reason] of cases) {
    const row = { ...base, ingredients_raw: suffix, description: `Натуральный молочный продукт. Состав: ${suffix}` };
    assert.equal(proposeCatalogText(row, classify(row), 'hash').reason, reason);
  }
  const legitimate = 'молоко, эмульгатор: соевый лецитин. Может содержать следы орехов.';
  const row = { ...base, ingredients_raw: legitimate, description: `Натуральный молочный продукт. Состав: ${legitimate}` };
  assert.equal(proposeCatalogText(row, classify(row), 'hash').status, 'candidate');
});

test('CLI refuses apply and preserves complete output', async () => {
  const root = await mkdtemp(join(process.cwd(), 'scratch', 'catalog-proposal-test-'));
  const snapshot = join(root, 'snapshot');
  const output = join(root, 'output');
  await mkdir(snapshot);
  const page = JSON.stringify(base) + '\n';
  await writeFile(join(snapshot, 'page-001.jsonl'), page);
  await writeFile(join(snapshot, 'manifest.json'), JSON.stringify({ scope: { active: true, normalized: false, excludedCategories: ['personal_care', 'household'] }, expected_rows: 1, capture_started_at: '2026-10-11T00:00:00Z', capture_finished_at: '2026-10-11T00:01:00Z', complete: true, pages: [{ path: 'page-001.jsonl', count: 1, sha256: hash(page) }], historical_checkpoint: {} }));
  const script = join(process.cwd(), 'scripts/preview-catalog-text-proposals.mjs');
  const args = [script, '--snapshot', snapshot, '--output', output];
  assert.notEqual(spawnSync(process.execPath, [...args, '--apply'], { encoding: 'utf8' }).status, 0);
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  assert.doesNotMatch(first.stdout, /5449000000996|молоко/iu);
  const original = await readFile(join(output, 'queue.jsonl'), 'utf8');
  const result = JSON.parse(original.trim());
  assert.equal(result.before.description, base.description);
  assert.equal(result.inputHash, hash(JSON.stringify(base)));
  assert.equal(result.row_updated_at, base.updated_at);
  assert.notEqual(spawnSync(process.execPath, args, { encoding: 'utf8' }).status, 0);
  assert.equal(await readFile(join(output, 'queue.jsonl'), 'utf8'), original);
});
