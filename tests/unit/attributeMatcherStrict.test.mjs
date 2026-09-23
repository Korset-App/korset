import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractQuantityAndUnit,
  extractFatPercent,
  checkZeroToleranceMatch,
} from '../../scripts/utils/attribute-matcher.mjs';

describe('Strict Attribute Matcher', () => {
  it('extracts mass, volume and units accurately', () => {
    assert.deepEqual(extractQuantityAndUnit('Майонез 380г Провансаль'), {
      raw: '380г',
      normalizedValue: 380,
      baseUnit: 'g',
      display: '380 г',
    });

    assert.deepEqual(extractQuantityAndUnit('Молоко пастеризованное 1 л'), {
      raw: '1 л',
      normalizedValue: 1000,
      baseUnit: 'ml',
      display: '1 л',
    });

    assert.deepEqual(extractQuantityAndUnit('Сливки 10% 500 мл'), {
      raw: '500 мл',
      normalizedValue: 500,
      baseUnit: 'ml',
      display: '500 мл',
    });
  });

  it('extracts fat percentage correctly', () => {
    assert.equal(extractFatPercent('Молоко 3.2% 1л'), 3.2);
    assert.equal(extractFatPercent('Сметана 15% 200г'), 15);
    assert.equal(extractFatPercent('Майонез Провансаль 67%'), 67);
    assert.equal(extractFatPercent('Шоколад молочный 100г'), null);
  });

  it('rejects match when weight or volume differs (same brand)', () => {
    const target = {
      name: 'Майонез 3 Желания Провансаль 67% 380г',
      brand: '3 Желания',
      quantity: '380 г',
    };
    const cand190g = {
      name: 'Майонез Провансаль 3 Желания 190 г',
      brand: '3 Желания',
      quantity: '190 г',
    };

    const res = checkZeroToleranceMatch(target, cand190g);
    assert.equal(res.isMatch, false);
    assert.match(res.reason, /quantity_mismatch/);
  });

  it('rejects match when fat percent differs (same brand & volume)', () => {
    const target = {
      name: 'Молоко ФудМастер 3.2% 1 л',
      brand: 'ФудМастер',
      quantity: '1 л',
    };
    const cand25 = {
      name: 'Молоко ФудМастер 2.5% 1 л',
      brand: 'ФудМастер',
      quantity: '1 л',
    };

    const res = checkZeroToleranceMatch(target, cand25);
    assert.equal(res.isMatch, false);
    assert.match(res.reason, /fat_percent_mismatch/);
  });

  it('accepts exact zero-tolerance match', () => {
    const target = {
      name: 'Шоколад Казахстанский темный 100г',
      brand: 'Рахат',
      quantity: '100 г',
    };
    const cand = {
      name: 'Шоколад темный Казахстанский Рахат 100 гр',
      brand: 'Рахат',
      quantity: '100 г',
    };

    const res = checkZeroToleranceMatch(target, cand);
    assert.equal(res.isMatch, true);
    assert.equal(res.reason, 'exact_zero_tolerance_match');
  });
});
