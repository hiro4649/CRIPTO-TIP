# P0 YouTube Super Chat Fixture Normalizer

## Current Scope

Adds a local-only fixture normalizer for YouTube Super Chat-shaped test input.

This PR normalizes safe fixture data into `support.received` without persistence or downstream side effects.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: a5834a7bed21ec2117905204fe7aed0210c21b97

CI: pre_pr

Quality-gate: pre_pr

Quality-gate artifact: pre_pr

Tests: local_pre_pr

## Testing

- `corepack pnpm exec vitest run apps/api/src/p0-youtube-superchat-fixture-normalizer.test.ts`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/codex-v126-self-test.mjs`
- `node scripts/codex-v125-self-test.mjs`
- `node scripts/codex-v124-self-test.mjs`
- `node scripts/codex-v123-self-test.mjs`
- `node scripts/write-test-summary.mjs`
- `node scripts/check-evidence-placeholders.mjs`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-quality-gate-self-protection.mjs`
- `node scripts/codex-secret-safety-scan.mjs`

## Safety

No package.json change.
No pnpm-lock change.
No DB driver dependency.
No Redis or Kafka dependency.
No real DB.
No migrations.
No contracts change.
No workflow change.
No real YouTube API.
No real OAuth.
No network call.
No screen scraping.
No real RPC.
No wallet/RPC/deploy change.
No IRIS Core call.
No VOXWEAVE call.
No TTS, Live2D, renderer, OBS, or WebSocket delivery.
No support event persistence.
No affinity mutation.
No reaction enqueue.
No overlay enqueue.
No outbox enqueue.
No external execution.
No runtime readiness claim.
No production readiness claim.
No legal compliance claim.
No YouTube policy compliance claim.
No owner approval created.
No GitHub approval review created.
No merge authority created.

## Human Confirmation

This is not human/project-owner approval.
This is not GitHub approval review.
This does not create owner approval record.
This does not create merge authority.
