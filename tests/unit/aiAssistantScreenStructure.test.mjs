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

test('AIAssistantScreen renders capability cards from the shared model', () => {
  assert.match(
    source,
    /import \{ GENERAL_AI_CAPABILITIES \} from '\.\.\/domain\/ai\/generalCapabilities\.js'/
  )
  assert.match(source, /GENERAL_AI_CAPABILITIES\.map\(\(capability\)/)
  assert.match(source, /className="ai-capability-carousel"/)
  assert.match(source, /className="ai-capability-card"/)
  assert.match(source, /t\(capability\.titleKey\)/)
  assert.match(source, /t\(capability\.descriptionKey\)/)
  assert.match(source, /sendMessage\(t\(capability\.promptKey\)\)/)
  assert.match(styles, /\.ai-capability-carousel\s*{[\s\S]*grid-auto-flow:\s*column;/)
  assert.match(styles, /\.ai-capability-carousel\s*{[\s\S]*grid-template-rows:\s*repeat\(2,/)
  assert.match(styles, /\.ai-capability-card\s*{[\s\S]*min-height:/)
})

test('AIAssistantScreen composer has a premium glass dock without image controls', () => {
  assert.match(source, /className="ai-composer__dock"/)
  assert.equal(source.includes('photo_camera'), false)
  assert.equal(source.includes('attach_file'), false)
  assert.match(styles, /\.ai-composer\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-composer__dock\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-composer__dock\s*{[\s\S]*border-radius:/)
  assert.match(styles, /\.ai-composer__input\s*{[\s\S]*background:\s*transparent;/)
  assert.match(styles, /\.ai-composer__send:not\(:disabled\):active\s*{[\s\S]*transform:/)
})

test('AIAssistantScreen active chat state has polished resilient message styling', () => {
  assert.match(styles, /\.ai-message-row--assistant\s*{[\s\S]*align-items:\s*flex-start;/)
  assert.match(styles, /\.ai-bubble--assistant\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-bubble--assistant\s*{[\s\S]*overflow-wrap:\s*anywhere;/)
  assert.match(styles, /\.ai-bubble--user\s*{[\s\S]*linear-gradient/)
  assert.match(styles, /\.ai-product-card\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-product-card:active\s*{[\s\S]*transform:/)
  assert.match(styles, /\.ai-follow-up-chip\s*{[\s\S]*transition:/)
  assert.match(styles, /\.ai-typing__bubble\s*{[\s\S]*backdrop-filter:\s*blur\(/)
})

test('AIAssistantScreen activates local-only history UI from the IndexedDB store', () => {
  assert.match(
    source,
    /import \{ createIndexedDBAIChatHistoryStore \} from '\.\.\/domain\/ai\/localChatHistory\.js'/
  )
  assert.match(source, /const \[historyOpen, setHistoryOpen\] = useState\(false\)/)
  assert.match(source, /const \[historyItems, setHistoryItems\] = useState\(\[\]\)/)
  assert.match(
    source,
    /const \[messagesStoreSlug, setMessagesStoreSlug\] = useState\(activeStoreSlug\)/
  )
  assert.match(source, /if \(messagesStoreSlug !== activeStoreSlug\) return undefined/)
  assert.match(source, /historyStoreRef\.current\s*\.upsertConversation\(/)
  assert.match(source, /historyStoreRef\.current\s*\.listConversations\(activeStoreSlug\)/)
  assert.match(source, /historyStoreRef\.current\s*\.getConversation\(id\)/)
  assert.match(source, /historyStoreRef\.current\s*\.deleteConversation\(id\)/)
  assert.match(source, /historyStoreRef\.current\s*\.clearStoreConversations\(activeStoreSlug\)/)
})

test('AIAssistantScreen history bottom sheet supports new, open, delete, clear, and empty states', () => {
  assert.match(source, /aria-label=\{t\('ai\.history\.open'\)\}/)
  assert.match(source, /className="ai-history-sheet"/)
  assert.match(source, /t\('ai\.history\.newChat'\)/)
  assert.match(source, /t\('ai\.history\.emptyTitle'\)/)
  assert.match(source, /openConversation\(item\.id\)/)
  assert.match(source, /requestDeleteConversation\(item\.id\)/)
  assert.match(source, /confirmDeleteConversation\(item\.id\)/)
  assert.match(source, /onClick=\{confirmClearStoreHistory\}/)
  assert.match(styles, /\.ai-history-backdrop\s*{[\s\S]*position:\s*fixed;/)
  assert.match(styles, /\.ai-history-sheet\s*{[\s\S]*backdrop-filter:\s*blur\(/)
  assert.match(styles, /\.ai-history-item\s*{[\s\S]*border:/)
  assert.match(styles, /\.ai-history-danger\s*{[\s\S]*color:/)
})

test('AIAssistantScreen voice-to-text inserts transcription into composer without auto-send', () => {
  assert.match(
    source,
    /import \{ askGeneralAI, transcribeVoiceInput \} from '\.\.\/services\/ai\.js'/
  )
  assert.match(source, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/)
  assert.match(source, /new MediaRecorder\(stream, recorderOptions\)/)
  assert.match(source, /transcribeVoiceInput\(/)
  assert.match(source, /setInput\(transcription\.text\)/)
  assert.doesNotMatch(source, /sendMessage\(transcription\.text\)/)
  assert.match(source, /t\('ai\.voice\.privacyNotice'\)/)
  assert.match(source, /aria-label=\{\s*voiceProcessing[\s\S]*getVoicePanelLabel\(\)[\s\S]*t\(/)
  assert.match(source, /className=\{`ai-voice-button\$\{recording \? ' is-recording' : ''\}/)
  assert.match(styles, /\.ai-voice-button\s*{[\s\S]*border:/)
  assert.match(styles, /\.ai-voice-status\s*{[\s\S]*font-size:/)
})

test('AIAssistantScreen voice UI announces recording states with distinct labels', () => {
  assert.match(source, /const getVoicePanelLabel = \(\) => \{/)
  assert.match(
    source,
    /if \(error === 'insecure_context'\) return t\('ai\.voice\.errorInsecureContext'\)/
  )
  assert.match(
    source,
    /if \(error === 'transcription_unavailable'\) return t\('ai\.voice\.errorUnavailable'\)/
  )
  assert.match(source, /setInput\(draft\)/)
  assert.match(source, /setVoiceStatus\('draft_inserted'\)/)
  assert.match(source, /t\('ai\.voice\.draftInserted'\)/)
  assert.match(source, /if \(voiceStatus === 'requesting'\) return t\('ai\.voice\.requesting'\)/)
  assert.match(source, /if \(voiceStatus === 'uploading'\) return t\('ai\.voice\.uploading'\)/)
  assert.match(source, /role="status"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.ai-voice-wave__bar\.is-active\s*{[\s\S]*animation:/)
})

test('AIAssistantScreen voice UI transitions smoothly from recording to processing', () => {
  assert.match(
    source,
    /const voiceProcessing = voiceStatus === 'uploading' \|\| voiceStatus === 'transcribing'/
  )
  assert.match(source, /setRecording\(false\)\s*\n\s*setVoiceLevel\(0\.32\)/)
  assert.match(source, /ai-voice-panel--\$\{voiceProcessing \? 'processing' : 'recording'\}/)
  assert.match(
    source,
    /className=\{`ai-voice-button\$\{recording \? ' is-recording' : ''\}\$\{voiceProcessing \? ' is-processing' : ''\}`\}/
  )
  assert.match(
    source,
    /aria-label=\{\s*voiceProcessing[\s\S]*getVoicePanelLabel\(\)[\s\S]*recording \? 'ai\.voice\.stop'/
  )
  assert.match(source, /\{voiceProcessing \? 'progress_activity' : recording \? 'stop' : 'mic'\}/)
  assert.match(source, /className="ai-voice-panel__progress"/)
  assert.match(styles, /\.ai-voice-panel\s*{[\s\S]*animation:\s*ai-voice-panel-in/)
  assert.match(styles, /\.ai-voice-panel--processing\s*{[\s\S]*border-color:/)
  assert.match(styles, /\.ai-voice-panel__progress::after\s*{[\s\S]*animation:\s*ai-voice-progress/)
  assert.match(
    styles,
    /\.ai-voice-button\.is-processing\s*{[\s\S]*animation:\s*ai-voice-button-processing/
  )
})
