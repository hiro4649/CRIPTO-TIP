# P0 YouTube Live Chat Cursor Context Hardening

## Current Scope

Hardens the local YouTube Live Chat fixture cursor context before page fixtures are bridged into `support.received`.

This PR requires `character_id`, binds cursor identity to stream/video/live-chat/character, and removes the cursor-path hard-coded character context.

## Current-Head Evidence

Head SHA: current_pr_head

Base SHA: db34b576e60aedd6da6fed4c8e3549b8b3fd1623

CI: pre_pr

Quality-gate: pre_pr

Quality-gate artifact: pre_pr

Tests: local_pre_pr

## Local Testing

- `corepack pnpm exec vitest run apps/api/src/p0-youtube-live-chat-fixture-cursor-boundary.test.ts`: pass, 1 file, 3 tests
- `corepack pnpm typecheck`: pass
- `corepack pnpm install`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm test`: pass, 97 files, 1953 passed, 6 skipped
- `npm test`: pass, 97 files, 1953 passed, 6 skipped
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/write-test-summary.mjs`: pass
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-youtube-live-chat-cursor-context-hardening.md`: pass, output manually corrected to current scoped PR body
- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/check-quality-gate-self-protection.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `node scripts/codex-v126-self-test.mjs`: pass
- `node scripts/codex-v125-self-test.mjs`: pass
- `node scripts/codex-v124-self-test.mjs`: pass
- `node scripts/codex-v123-self-test.mjs`: pass
- `forge test`: unavailable locally, non-blocking; GitHub contracts check required

## Safety

No package.json change.
No pnpm-lock change.
No DB driver dependency.
No real DB.
No migrations.
No contracts change.
No workflow change.
No support persistence from page fixtures.
No real YouTube API.
No real OAuth.
No network call.
No screen scraping.
No real RPC.
No wallet/RPC/deploy change.
No IRIS Core call.
No VOXWEAVE call.
No TTS, Live2D, renderer, OBS, or WebSocket delivery.
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
