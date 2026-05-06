import test from 'node:test'
import assert from 'node:assert/strict'

import { localizeError, validatePassword, isValidEmail } from '../../src/utils/authHelpers.js'

const t = (key) => key

test('localizeError — empty/null message', () => {
  assert.deepEqual(localizeError('', t), { text: '', key: null })
  assert.deepEqual(localizeError(null, t), { text: '', key: null })
  assert.deepEqual(localizeError(undefined, t), { text: '', key: null })
})

test('localizeError — known error keys', () => {
  const cases = [
    ['Invalid login credentials', 'auth.errInvalidCredentials'],
    ['Email not confirmed', 'auth.errEmailNotConfirmed'],
    ['User already registered', 'auth.errAlreadyRegistered'],
    ['signup_disabled', 'auth.errSignupDisabled'],
    ['rate_limit', 'auth.errOtpRateLimit'],
    ['Rate limit exceeded', 'auth.errOtpRateLimit'],
    ['Email rate limit exceeded', 'auth.errOtpRateLimit'],
  ]
  for (const [msg, expectedKey] of cases) {
    const result = localizeError(msg, t)
    assert.equal(result.key, expectedKey, `Expected key ${expectedKey} for message "${msg}"`)
    assert.equal(result.text, expectedKey, `Expected text ${expectedKey} for message "${msg}"`)
  }
})

test('localizeError — provider duplicate email', () => {
  const result = localizeError('User already registered via provider google', t)
  assert.equal(result.key, 'auth.errEmailDuplicate')
})

test('localizeError — unknown error falls back to general', () => {
  const result = localizeError('something completely unexpected', t)
  assert.equal(result.key, 'auth.errorGeneral')
  assert.equal(result.text, 'auth.errorGeneral')
})

test('localizeError — case-insensitive matching', () => {
  const result = localizeError('INVALID LOGIN CREDENTIALS', t)
  assert.equal(result.key, 'auth.errInvalidCredentials')
})

test('validatePassword — valid passwords', () => {
  assert.equal(validatePassword('Password1'), true)
  assert.equal(validatePassword('abc123XYZ'), true)
  assert.equal(validatePassword('a1b2c3d4e5'), true)
})

test('validatePassword — invalid passwords', () => {
  assert.equal(validatePassword('pass1'), false, 'too short')
  assert.equal(validatePassword('password'), false, 'no digit')
  assert.equal(validatePassword('12345678'), false, 'no letter')
  assert.equal(validatePassword(''), false, 'empty')
  assert.equal(validatePassword('Ab1'), false, '3 chars')
})

test('isValidEmail — valid emails', () => {
  assert.equal(isValidEmail('user@example.com'), true)
  assert.equal(isValidEmail('test@mail.kz'), true)
  assert.equal(isValidEmail('a@b.co'), true)
  assert.equal(isValidEmail('  user@example.com  '), true, 'trims whitespace')
})

test('isValidEmail — invalid emails', () => {
  assert.equal(isValidEmail('abc'), false, 'no @')
  assert.equal(isValidEmail('abc@'), false, 'no domain')
  assert.equal(isValidEmail('abc@def'), false, 'no TLD')
  assert.equal(isValidEmail(''), false, 'empty')
  assert.equal(isValidEmail('   '), false, 'whitespace only')
})
