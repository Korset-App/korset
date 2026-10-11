const compositionLabel = /(?:^|[^\p{L}])((?:состав|құрамы)\s*:)/giu;
const metadataLabel = /(?:^|[\s.;!?])(?:производитель|изготовитель|пищевая\s+ценность|энергетическая\s+ценность|условия\s+хранения|срок\s+годности|страна(?:\s+происхождения)?|хранить\s+при|өндіруші|тағамдық\s+құндылығы|сақтау\s+шарттары|жарамдылық\s+мерзімі|өндірілген\s+ел)(?=\s|:|$)/iu;
const narrative = /(?:^|[^\p{L}])(?:тоо|тoo|ип|ақ|жшс|компани\p{L}*|предприяти\p{L}*|фабрик\p{L}*|производител\p{L}*|изготовител\p{L}*|созданн\p{L}*|основанн\p{L}*|крупнейш\p{L}*|перерабатывающ\p{L}*|бренд\p{L}*|истори\p{L}*|экосистем\p{L}*|растим|потребител\p{L}*|привива\p{L}*)(?=$|[^\p{L}])/iu;
const legalNarrative = /(?:^|[^\p{L}])(?:ооо|ао|оао|пао|зао|акционерное\s+общество)(?=$|[^\p{L}])/iu;
const marketing = /(?:^|[^\p{L}])(?:идеальн\p{L}*|вкусн\p{L}*|полезн\p{L}*|лучш\p{L}*|самы\p{L}*|выбор\p{L}*|отличн\p{L}*|тамаш\p{L}*|дәмді|пайдалы)(?=$|[^\p{L}])/iu;
const warningSentence = /^(?:может\s+содержать|могут\s+содержаться|возможно\s+наличие|не\s+содержит|содержит|құрамында|іздері\s+болуы\s+мүмкін)/iu;
const additiveSentence = /^E\s*-?\s*\d{3,4}(?:\s*,\s*E\s*-?\s*\d{3,4})*\.?$/iu;
const equivalent = value => value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('ru');
const meaningful = value => value.trim().length >= 12 && (value.match(/\p{L}+/gu) ?? []).length >= 2;
const balanced = value => {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const char of value) {
    if ('([{'.includes(char)) stack.push(char);
    else if (Object.hasOwn(pairs, char) && stack.pop() !== pairs[char]) return false;
  }
  return stack.length === 0;
};

export function proposeCatalogText(row, classification, inputHash) {
  const description = typeof row.description === 'string' ? row.description : null;
  const ingredients = typeof row.ingredients_raw === 'string' ? row.ingredients_raw : null;
  const base = {
    id: row.id,
    ean: row.ean,
    row_updated_at: row.updated_at ?? null,
    inputHash,
    classifier_reasons: classification.reasons,
    classifier_evidence: classification.evidence,
    action: 'review_only',
    before: { description: row.description ?? null, ingredients_raw: row.ingredients_raw ?? null },
    provenance: { origin: 'existing_snapshot_description', source_confirmed: false, external_source_checked: false },
  };
  const defer = reason => ({ ...base, status: 'deferred', reason });
  if (classification.reasons.includes('identity_invalid_ean')) return defer('identity_invalid_ean');
  if (classification.reasons.includes('marketing_in_ingredients')) return defer('marketing_in_ingredients');
  if (!description) return defer('description_missing');
  const labels = [...description.matchAll(compositionLabel)].map(match => ({ start: match.index + match[0].length - match[1].length, end: match.index + match[0].length }));
  if (labels.length > 1) return defer('multiple_composition_labels');
  if (!labels.length) return defer('explicit_composition_label_missing');
  const label = labels[0];
  const prefix = description.slice(0, label.start);
  const suffix = description.slice(label.end);
  if (!meaningful(prefix)) return defer('meaningful_prefix_missing');
  if (/[,;:—–-]$|\.{2,}$|…$/u.test(prefix.trimEnd())) return defer('incomplete_description_prefix');
  if (!meaningful(suffix)) return defer('composition_too_short');
  if (/[,;:—–-]$|\.{2,}$|…$/u.test(suffix.trim())) return defer('incomplete_composition_tail');
  if (!balanced(suffix)) return defer('unbalanced_composition_brackets');
  if (suffix.includes('*')) return defer('ambiguous_asterisk');
  if (metadataLabel.test(suffix)) return defer('metadata_after_composition');
  if (narrative.test(suffix) || legalNarrative.test(suffix)) return defer('narrative_in_composition');
  const laterSentences = suffix.trim().split(/\.\s+(?=\S)/u).slice(1);
  if (laterSentences.some(sentence => !warningSentence.test(sentence) && !additiveSentence.test(sentence))) return defer('additional_sentence_requires_review');
  if (marketing.test(suffix)) return defer('marketing_in_composition');
  if (!suffix.trim().endsWith('.')) return defer('terminal_completion_unproven');
  const spans = {
    retained: { start: 0, end: label.start, text: prefix },
    label: { start: label.start, end: label.end, text: description.slice(label.start, label.end) },
    candidate: { start: label.end, end: description.length, text: suffix },
  };
  if (ingredients?.trim()) {
    if (equivalent(suffix) !== equivalent(ingredients)) return defer('existing_ingredients_mismatch');
    const retained = prefix.trimEnd();
    return {
      ...base, status: 'candidate', rule: 'remove_exact_repeated_terminal_composition',
      after: { description: retained, ingredients_raw: row.ingredients_raw },
      spans: { ...spans, retained: { start: 0, end: retained.length, text: retained }, deleted: { start: retained.length, end: description.length, text: description.slice(retained.length) } },
      rationale: 'The terminal composition matches existing ingredients after whitespace and case normalization only; retain the nonempty description prefix.',
    };
  }
  return {
    ...base, status: 'candidate', rule: 'extract_missing_ingredients_from_description',
    after: { description: row.description, ingredients_raw: suffix.trim() },
    spans,
    rationale: 'Verbatim terminal composition is available in the existing description; independent source confirmation is absent.',
  };
}
