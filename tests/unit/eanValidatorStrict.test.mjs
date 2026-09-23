import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBarcodeStrict,
  calculateEan13Checksum,
  calculateEan8Checksum,
  isRestrictedOrWeightedEan,
} from '../../scripts/utils/ean-validator.mjs';

describe('Strict EAN Validator', () => {
  it('validates genuine Kazakh EAN-13 barcodes (prefix 487)', () => {
    // 4870003001016 - 3 Zhelaniya mayonnaise
    // Let's verify checksum:
    const body = '487000300101';
    const check = calculateEan13Checksum(body);
    const validEan = body + check;
    const res = validateBarcodeStrict(validEan);
    assert.equal(res.valid, true);
    assert.equal(res.country, 'KZ');
    assert.equal(res.isKZ, true);
  });

  it('rejects invalid checksums', () => {
    const res = validateBarcodeStrict('4870003001019'); // wrong check digit
    assert.equal(res.valid, false);
    assert.equal(res.reason, 'invalid_checksum');
  });

  it('rejects restricted weight scale prefixes (20-29)', () => {
    assert.equal(isRestrictedOrWeightedEan('2012345678901'), true);
    assert.equal(isRestrictedOrWeightedEan('2999999999999'), true);
    const res = validateBarcodeStrict('2012345678901');
    assert.equal(res.valid, false);
    assert.equal(res.reason, 'restricted_weight_scale_prefix');
  });

  it('validates EAN-8 barcodes', () => {
    const body = '5449147'; // Coca-Cola
    const check = calculateEan8Checksum(body);
    assert.equal(check, 2);
    const res = validateBarcodeStrict('54491472');
    assert.equal(res.valid, true);
    assert.equal(res.type, 'EAN-8');
  });

  it('rejects non-numeric or malformed barcodes', () => {
    assert.equal(validateBarcodeStrict('arbuz_12345').valid, false);
    assert.equal(validateBarcodeStrict('12345').valid, false);
    assert.equal(validateBarcodeStrict('').valid, false);
    assert.equal(validateBarcodeStrict(null).valid, false);
  });
});
