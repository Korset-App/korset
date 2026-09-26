// Russian Porter Stemmer (Clean, lightweight, deterministic)
export function stemRussian(word) {
  let w = word.toLowerCase().replace(/ё/g, 'е');
  if (w.length <= 3) return w;

  // Find RV (region after first vowel)
  const vowelMatch = w.match(/[аеиоуыэюя]/);
  if (!vowelMatch) return w;
  const rvStart = vowelMatch.index + 1;
  let rv = w.slice(rvStart);
  let start = w.slice(0, rvStart);

  // Step 1: Perfective gerund
  let s1 = rv.replace(/(?:в|вши|вшись)$/, '');
  if (s1 === rv) {
    // Reflexive
    rv = rv.replace(/(?:ся|сь)$/, '');
    // Adjective
    const adj = rv.replace(/(?:ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/, '');
    if (adj !== rv) {
      rv = adj;
      // Participle after adjective
      rv = rv.replace(/(?:ивш|ывш|ующ)$/, '');
    } else {
      // Verb
      const verb = rv.replace(/(?:ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь)$/, '');
      if (verb !== rv) {
        rv = verb;
      } else {
        // Noun endings
        rv = rv.replace(/(?:а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/, '');
      }
    }
  } else {
    rv = s1;
  }

  // Step 2: "и"
  rv = rv.replace(/и$/, '');

  // Step 3: Derivational
  const derivMatch = rv.match(/[аеиоуыэюя]/);
  if (derivMatch) {
    rv = rv.replace(/(?:ост|ость)$/, '');
  }

  // Step 4: Superlative & softening
  rv = rv.replace(/(?:ейш|ейше)$/, '');
  rv = rv.replace(/нн$/, 'н');
  rv = rv.replace(/ь$/, '');

  return start + rv;
}
