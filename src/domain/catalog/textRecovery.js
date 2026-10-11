const text = value => typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
const normalized = value => text(value).toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function classifyCatalogText(row) {
  const ingredients = text(row.ingredients_raw);
  const description = text(row.description);
  const ingredientKey = normalized(ingredients);
  const descriptionKey = normalized(description);
  const reasons = [];
  if (!ingredients) reasons.push('ingredient_missing');
  if (!description) reasons.push('description_missing');
  if (ingredientKey.length >= 24 && descriptionKey.length >= 24 && (
    ingredientKey === descriptionKey ||
    (ingredientKey.length >= 30 && descriptionKey.includes(ingredientKey)) ||
    (descriptionKey.length >= 30 && ingredientKey.includes(descriptionKey))
  )) reasons.push('text_duplication');
  if (/(?:^|[^\p{L}])(?:полез\p{L}*|вкусн\p{L}*|идеальн\p{L}*|лучши\p{L}*|самы\p{L}*)(?=$|[^\p{L}])/iu.test(ingredients)) reasons.push('marketing_in_ingredients');
  if (/(?:^|[^\p{L}])(?:состав|құрамы)\s*:/iu.test(row.description ?? '')) reasons.push('composition_in_description');
  if (typeof row.ean !== 'string' || !/^\d{8,14}$/u.test(row.ean)) reasons.push('identity_invalid_ean');
  return {
    reasons,
    action: 'review_only',
    evidence: {
      source_primary: row.source_primary ?? null,
      source_confidence: row.source_confidence ?? null,
      is_verified: row.is_verified === true,
      needs_review: row.needs_review === true,
      normalized_marker: row.normalized_marker === true,
      ingredient_provenance: 'unverified_by_snapshot',
      updated_at: row.updated_at ?? null,
    },
  };
}
