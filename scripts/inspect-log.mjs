import fs from 'fs';
import readline from 'readline';

async function inspectLog() {
  const rl = readline.createInterface({
    input: fs.createReadStream('data/ai_vision_enrichment_log.jsonl'),
    crlfDelay: Infinity
  });
  let enriched = 0;
  let rejected = 0;
  const sampleEnriched = [];
  const sampleRejected = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (r.image_url) {
      enriched++;
      if (sampleEnriched.length < 5) sampleEnriched.push(r);
    } else {
      rejected++;
      if (sampleRejected.length < 5) sampleRejected.push(r);
    }
  }

  console.log('Total Enriched:', enriched, 'Total Rejected:', rejected);
  console.log('\n--- SAMPLE ENRICHED ITEMS (Approved by AI Vision) ---');
  sampleEnriched.forEach((e, idx) => {
    console.log(`[${idx+1}] Target: ${e.name} (Source: ${e.source})`);
    console.log(`    Packshot: ${e.image_url}`);
    console.log(`    Brand: ${e.brand} | Halal: ${e.halal_status}`);
    console.log(`    Ingredients: ${(e.ingredients_raw || '').slice(0, 100)}...`);
    console.log(`    AI Rationale: ${e.ai_verification?.rationale}`);
  });

  console.log('\n--- SAMPLE REJECTED ITEMS (Caught & Saved from error) ---');
  sampleRejected.forEach((rj, idx) => {
    console.log(`[${idx+1}] Target: ${rj.name}`);
    console.log(`    Candidate: ${rj.candidate_title} (${rj.candidate_source})`);
    console.log(`    AI Rationale: ${rj.verdict?.rationale}`);
  });
}

inspectLog().catch(console.error);
