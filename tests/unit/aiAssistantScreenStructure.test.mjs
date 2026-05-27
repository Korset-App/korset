import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('src/screens/AIAssistantScreen.jsx', 'utf8')
const styles = readFileSync('src/screens/AIAssistantScreen.css', 'utf8')

test('AIAssistantScreen keeps screen styling in a dedicated CSS file', () => {
  assert.match(source, /import '\.\/AIAssistantScreen\.css'/)
  assert.equal(source.includes('style={{'), false)
  assert.equal(source.includes('<style>'), false)
})

test('AIAssistantScreen header has a real sticky glass foundation', () => {
  assert.match(styles, /\.ai-header\s*{[\s\S]*position:\s*sticky;/)
  assert.match(styles, /\.ai-header\s*{[\s\S]*top:\s*0;/)
  assert.match(styles, /\.ai-header\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-header\s*{[\s\S]*-webkit-backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-header\s*{[\s\S]*env\(safe-area-inset-top/)
  assert.match(styles, /\.ai-header::after\s*{[\s\S]*content:\s*'';/)
})

test('AIAssistantScreen empty state has a dedicated atmosphere shell', () => {
  assert.match(source, /className="ai-empty-state"/)
  assert.match(source, /t\('ai\.empty\.eyebrow'\)/)
  assert.match(source, /t\('ai\.empty\.title'\)/)
  assert.match(source, /t\('ai\.empty\.description'/)
  assert.match(styles, /\.ai-screen::before\s*{[\s\S]*radial-gradient/)
  assert.match(styles, /\.ai-screen::after\s*{[\s\S]*radial-gradient/)
  assert.match(styles, /\.ai-empty-panel\s*{[\s\S]*backdrop-filter:\s*blur\(/)
})
