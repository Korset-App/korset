import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { classifyCatalogText } from '../src/domain/catalog/textRecovery.js';
import { proposeCatalogText } from '../src/domain/catalog/textProposals.js';
import { readSnapshot, publish } from './preview-catalog-text-recovery.mjs';

const fail = message => { throw new Error(message); };
const hash = value => createHash('sha256').update(value).digest('hex');

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--snapshot' || args[2] !== '--output' || !args[1] || !args[3] || args[1].startsWith('--') || args[3].startsWith('--')) fail('Expected --snapshot PATH --output PATH only');
  const snapshotPath = resolve(args[1]);
  const outputPath = resolve(args[3]);
  if (outputPath === snapshotPath || outputPath.startsWith(snapshotPath + sep)) fail('Output must be outside the snapshot');
  const { manifest, records } = await readSnapshot(snapshotPath);
  const queue = [];
  const classifierReasonCounts = {};
  const proposalRuleCounts = {};
  const deferredReasonCounts = {};
  let proposals = 0;
  let deferred = 0;
  for (const { row, inputHash } of records) {
    const classification = classifyCatalogText(row);
    if (!classification.reasons.length) continue;
    for (const reason of classification.reasons) classifierReasonCounts[reason] = (classifierReasonCounts[reason] ?? 0) + 1;
    const result = proposeCatalogText(row, classification, inputHash);
    queue.push(result);
    if (result.status === 'candidate') {
      proposals += 1;
      proposalRuleCounts[result.rule] = (proposalRuleCounts[result.rule] ?? 0) + 1;
    } else {
      deferred += 1;
      deferredReasonCounts[result.reason] = (deferredReasonCounts[result.reason] ?? 0) + 1;
    }
  }
  const summary = {
    snapshot_sha256: hash(JSON.stringify(manifest)),
    capture_started_at: manifest.capture_started_at,
    capture_finished_at: manifest.capture_finished_at,
    scanned_rows: records.length,
    proposals,
    deferred,
    unflagged: records.length - queue.length,
    classifier_reason_counts: classifierReasonCounts,
    proposal_rule_counts: proposalRuleCounts,
    deferred_reason_counts: deferredReasonCounts,
    assessment: 'review_only_not_source_confirmed',
    action: 'review_only',
  };
  await publish(outputPath, queue, summary);
  process.stdout.write(JSON.stringify({ scanned_rows: summary.scanned_rows, proposals, deferred, unflagged: summary.unflagged, proposal_rule_counts: proposalRuleCounts, deferred_reason_counts: deferredReasonCounts }) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
