# Verification record / 验收记录

Local verification: 2026-10-22. This record describes observed checks, not a guarantee of production capacity.

## Automated checks / 自动检查

- TypeScript type checking, ESLint (zero warnings/errors) and production Vinext build passed.
- 23 Node tests passed: recording boundaries, overlap/undo, missing versus held samples, immutable raw input, randomized interval oracle, strict import/export, legacy provenance, validation limits, CSV formula escaping and unavailable browser storage.
- Local API smoke test passed: anonymous/admin isolation, spoofed authentication headers, cross-origin mutation rejection, audio upload resume and byte ranges, study version immutability, consent, checksummed submission, idempotency, owner-only exports and closing studies.
- Local storage recovery test passed: an injected database failure after object storage writes returned a retriable failure; the subsequent retry recovered the same submission.
- Local capacity fixture passed: one 30-minute session with 108,000 raw events (18,077,579 input bytes), and 1,000 additional synthetic submissions. Pagination returned 1,001 records over 21 pages; the filtered stream exported 1,000 JSONL records. This is local data-volume validation in bounded batches, **not 1,000 simultaneous production users**.

## Browser checks / 浏览器检查

Verified in the desktop Chromium-based browser against the isolated local worktree:

- English/Chinese navigation, homepage, research citation and original demo.
- Real audio file selection, practice isolation, keyboard VA input, recording, timeline, seek and undo.
- IndexedDB upgrade preserves existing drafts; participation credentials survive reopening.
- Research dashboard sign-in, creation, bilingual draft edits, audio upload and invitation publication.
- Participant consent, audio selection, recording through natural end, submission confirmation, and matching received result in the dashboard (99% coverage, two actual inputs).

Browser actions used synthetic audio and local test data. No real participant records were created. Mobile devices, Safari, geographic accessibility and production concurrency require separate validation.

## Baseline / 对比基线

The original main checkout remained clean at `8e7ac2ffd99af7494a62193b25f434e36226d35d`. `public/legacy/index.html` is byte-identical to the original `mood-rater-final.html`.

See [deployment guidance](DEPLOYMENT.md) for the production release process. Publication status must be checked against the hosting deployment and live URL; a successful local build alone does not establish it.
