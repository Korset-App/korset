import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain';
const entries = fs.readdirSync(brainDir).map(d => {
  const p = path.join(brainDir, d);
  const stat = fs.statSync(p);
  return { id: d, time: stat.mtime };
}).sort((a, b) => b.time - a.time);

const top10 = entries.slice(0, 10);
let out = '';
for (const entry of top10) {
  const transcriptPath = path.join(brainDir, entry.id, '.system_generated', 'logs', 'transcript.jsonl');
  let allPrompts = [];
  if (fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        if (j.type === 'USER_INPUT') {
          allPrompts.push(j.content.slice(0, 200).replace(/\n/g, ' '));
        }
      } catch (e) {}
    }
  }
  out += `ID: ${entry.id} | Date: ${entry.time.toISOString()} | Prompts: ${allPrompts.length}\n`;
  allPrompts.slice(0, 3).forEach((p, idx) => {
    out += `  P${idx+1}: ${p}\n`;
  });
}
fs.writeFileSync('top10.txt', out, 'utf8');
console.log('Saved top10.txt');
