import { normalizeBrand, extractNormalizedWeight, areWeightsCompatible, cleanTokens, calculateTokenOverlap } from './utils/product-matcher.mjs';

function test() {
  console.log('=== Testing Product Matcher Utilities ===\n');

  // Test Brands
  const brandTests = [
    ['Lactel', 'lactel'],
    ['Лактель', 'lactel'],
    ['АО "Рахат"', 'rakhat'],
    ['Рахат', 'rakhat'],
    ['Rakhat', 'rakhat'],
    ['Баян Сулу', 'bayansulu'],
    ['Баян сұлу', 'bayansulu'],
    ['Bayan Sulu', 'bayansulu'],
    ['ТОО "Первомайские Деликатесы"', 'pervomayskie']
  ];

  console.log('Brand normalization tests:');
  let brandPass = 0;
  for (const [raw, expected] of brandTests) {
    const res = normalizeBrand(raw);
    const pass = res === expected;
    if (pass) brandPass++;
    console.log(`  "${raw}" -> "${res}" (Expected: "${expected}") [${pass ? 'PASS' : 'FAIL'}]`);
  }

  // Test Weights
  console.log('\nWeight extraction tests:');
  const weightTests = [
    ['Молоко Lactel 2,5% 1 л', { ml: 1000 }],
    ['Конфеты Storck Toffifee белый шоколад, 125 г', { grams: 125 }],
    ['Шоколад Рахат Казахстанский 100г', { grams: 100 }],
    ['Нарезка Первомайские Деликатесы 200 г', { grams: 200 }],
    ['Вода Asu 1.5 л', { ml: 1500 }],
    ['Мука Цесна 2кг', { grams: 2000 }],
    ['Сок Добрый 0.33 л', { ml: 330 }]
  ];

  let weightPass = 0;
  for (const [title, expected] of weightTests) {
    const res = extractNormalizedWeight(title);
    const matchG = expected.grams ? res?.grams === expected.grams : true;
    const matchMl = expected.ml ? res?.ml === expected.ml : true;
    const pass = matchG && matchMl;
    if (pass) weightPass++;
    console.log(`  "${title}" -> ${JSON.stringify(res)} [${pass ? 'PASS' : 'FAIL'}]`);
  }

  // Test Overlap
  console.log('\nToken overlap tests:');
  const pairTests = [
    [
      'Молоко Lactel с витамином D 2,5% 1 л',
      'Молоко питьевое ультрапастеризованное 2,5% Lactel 1л',
      'Lactel'
    ],
    [
      'Конфеты Storck Toffifee белый шоколад, 125 г',
      'Конфеты Toffifee лесной орех в карамели белый шоколад 125г',
      'Storck'
    ],
    [
      'Шоколад Рахат Казахстанский темный 100г',
      'Шоколад Рахат Казахстанский молочный 100г',
      'Рахат'
    ]
  ];

  for (const [t1, t2, brand] of pairTests) {
    const tok1 = cleanTokens(t1, brand);
    const tok2 = cleanTokens(t2, brand);
    const overlap = calculateTokenOverlap(tok1, tok2);
    console.log(`  Overlap: ${(overlap * 100).toFixed(1)}%`);
    console.log(`    1: "${t1}" (${tok1.join(', ')})`);
    console.log(`    2: "${t2}" (${tok2.join(', ')})`);
  }
}

test();
