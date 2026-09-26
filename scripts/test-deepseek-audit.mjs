import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const dsKey = env.match(/OPENAI_API_KEY=["']?([^"'\r\n]+)/)?.[1] ||
              env.match(/DEEPSEEK_API_KEY=["']?([^"'\r\n]+)/)?.[1];

const testPairs = [
  {
    pairId: 1,
    master: { name: 'Соус Heinz Барбекю 220мл пэт', brand: 'Heinz', weight: '220мл' },
    donor: { name: 'Соус Барбекю Heinz, 230г', brand: 'Heinz', weight: '230г' }
  },
  {
    pairId: 2,
    master: { name: 'Молоко Зенченко 2,5% 900мл ф/п', brand: 'Зенченко', weight: '900мл' },
    donor: { name: 'Молоко 2,5% Зенченко и К, 0,9л', brand: 'Зенченко и К', weight: '0,9л' }
  },
  {
    pairId: 3,
    master: { name: 'Паштет Podravka куриный с паприкой 100гр ж/б', brand: 'Podravka', weight: '100гр' },
    donor: { name: 'Паштет куриный с овощами Podravka, 100г', brand: 'Podravka', weight: '100г' }
  },
  {
    pairId: 4,
    master: { name: 'Краска для волос Palette 9-14 Жемчужный светло-русый 110мл к/у П', brand: 'Palette', weight: '110мл' },
    donor: { name: 'Крем-краска для волос Palette, пепельный светло-русый 8-1', brand: 'Palette', weight: '' }
  }
];

async function testAudit() {
  const prompt = `You are a strict FMCG grocery product auditor in Kazakhstan.
Verify whether the Master product and the Donor product refer to the EXACT SAME physical retail item sold on shelf.

Rules:
1. Brand must match (e.g. Rakhat == Рахат, Hochland == Хохланд, Lactel == Лактель).
2. Flavor, recipe, sub-variety must match 100%. (e.g. Strawberry != Peach; Dark != Milk; Still != Sparkling; 2.5% fat != 3.2% fat).
3. Weight / Package volume must match within reasonable pack tolerance (e.g. 100g != 200g; 1L != 0.5L).
4. Ignore retail packaging abbreviations (e.g. м/у, к/у, пэт, т/п, д/п, ж/б).

Pairs to audit:
${JSON.stringify(testPairs, null, 2)}

Respond with JSON:
{
  "results": [
    {
      "pairId": number,
      "isMatch": boolean,
      "rationale": "short explanation in Russian"
    }
  ]
}`;

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + dsKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  const j = await res.json();
  const parsed = JSON.parse(j.choices[0].message.content);
  console.log('DeepSeek V3 Audit Results:');
  for (const r of parsed.results) {
    console.log(`[Pair #${r.pairId}] ${r.isMatch ? '✅ MATCH' : '❌ REJECT'}: ${r.rationale}`);
  }
}

testAudit().catch(console.error);
