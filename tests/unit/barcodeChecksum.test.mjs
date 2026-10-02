import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidBarcodeChecksum } from '../../src/utils/barcodeChecksum.js'

// Official ZXing UPC-E encoder fixtures; these are not catalog records.
// https://github.com/zxing/zxing/blob/master/core/src/test/java/com/google/zxing/oned/UPCEWriterTestCase.java
test('UPC-E uses the expanded UPC-A checksum while preserving the scanned digits', () => {
  assert.equal(isValidBarcodeChecksum('05096893', 'UPC_E'), true)
  assert.equal(isValidBarcodeChecksum('12345670', 'UPC_E'), true)
  assert.equal(isValidBarcodeChecksum('05096894', 'UPC_E'), false)
  assert.equal(isValidBarcodeChecksum('25096893', 'UPC_E'), false)
})

test('EAN and UPC-A checksums keep rejecting corrupted digits', () => {
  assert.equal(isValidBarcodeChecksum('5901234123457'), true)
  assert.equal(isValidBarcodeChecksum('5901234123458'), false)
})
