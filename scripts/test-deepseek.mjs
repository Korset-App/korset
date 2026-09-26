import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const dsMatch = env.match(/OPENAI_API_KEY=([^\r\n]+)/) || env.match(/DEEPSEEK_API_KEY=([^\r\n]+)/);
console.log('DeepSeek / OpenAI Key present:', Boolean(dsMatch));

if (dsMatch) {
  const key = dsMatch[1].replace(/['"]/g, '').trim();
  console.log('Key prefix:', key.slice(0, 7) + '...');
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5
      })
    });
    console.log('DeepSeek API status:', r.status);
    const j = await r.json();
    console.log('DeepSeek response:', j.choices?.[0]?.message?.content);
  } catch (e) {
    console.error('DeepSeek error:', e.message);
  }
}
