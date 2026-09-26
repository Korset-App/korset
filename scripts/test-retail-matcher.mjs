import {
  cleanTokens,
  extractNormalizedWeight,
  extractFatPercent,
  areWeightsCompatible,
  InvertedIndex
} from './utils/retail-tokenizer.mjs';

function testMatcher() {
  console.log('=== Testing Retail Tokenizer & Inverted Index ===\n');

  const testCases = [
    {
      donor: {
        source: 'arbuz',
        id: '1',
        name: 'Сыр Hochland мягкий в рассоле Фетакса 480 г',
        brand: 'Hochland'
      },
      master: 'Сыр мягкий Hochland Фетакса в рассоле 45% 480гр пэт',
      shouldMatch: true
    },
    {
      donor: {
        source: 'arbuz',
        id: '2',
        name: 'Яйца Казгер-Құс куриные, отборное, в лотке 30 шт',
        brand: 'Казгер-Құс'
      },
      master: 'Яйцо куриное Казгер Кус отборное 30шт к/у',
      shouldMatch: true
    },
    {
      donor: {
        source: 'korzina',
        id: '3',
        name: 'Молоко Простоквашино 3,2%, 950мл',
        brand: 'Простоквашино'
      },
      master: 'Молоко питьевое Простоквашино ультрапастеризованное 3,2% 950мл т/п',
      shouldMatch: true
    },
    {
      donor: {
        source: 'korzina',
        id: '4',
        name: 'Молоко Простоквашино 2,5%, 950мл',
        brand: 'Простоквашино'
      },
      master: 'Молоко питьевое Простоквашино 3,2% 950мл т/п',
      shouldMatch: false // Different fat percent!
    },
    {
      donor: {
        source: 'arbuz',
        id: '5',
        name: 'Шоколад Казахстанский Рахат, 100 г',
        brand: 'Рахат'
      },
      master: 'Шоколад Казахстанский 100гр м/у',
      shouldMatch: true
    }
  ];

  const index = new InvertedIndex();
  for (const tc of testCases) {
    const d = tc.donor;
    d.cleanTokens = cleanTokens(d.name);
    d.weight = extractNormalizedWeight(d.name);
    d.fatPercent = extractFatPercent(d.name);
    index.addDonor(d);
  }

  for (const tc of testCases) {
    const masterTokens = cleanTokens(tc.master);
    const masterWeight = extractNormalizedWeight(tc.master);
    const masterFat = extractFatPercent(tc.master);

    const results = index.search(masterTokens, masterWeight, masterFat);
    const topResult = results[0];
    const isMatch = topResult && topResult.donor.id === tc.donor.id;

    console.log(`Master: "${tc.master}"`);
    console.log(`  Tokens: [${masterTokens.join(', ')}] | Weight: ${JSON.stringify(masterWeight)} | Fat: ${masterFat}%`);
    if (topResult) {
      console.log(`  Top candidate: "${topResult.donor.name}" (score: ${topResult.score.toFixed(3)}, jaccard: ${topResult.jaccard.toFixed(3)})`);
    } else {
      console.log(`  No candidate found`);
    }

    const testPassed = isMatch === tc.shouldMatch;
    console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'} (expected: ${tc.shouldMatch ? 'MATCH' : 'NO_MATCH'})\n`);
  }
}

testMatcher();
