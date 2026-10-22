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

## Public release / 公开发布

On 2026-10-22, Sites confirmed the deployment succeeded at https://mood-rater-audio.baysky.chatgpt.site and the audience was set to public. Independent cookie-free HTTP checks returned 200 for `/`, `/annotate`, `/about`, `/research`, `/legacy/`, `/demo.wav` and `/api/identity`. Identity was anonymous; `/api/admin/studies` returned401, including with forged local-test cookies and identity headers. The deployed demo audio matched the local bytes. The hosted legacy HTML preserved the original content; the hosting provider appends its own security script, so the raw HTTP response hash differs from the source.

The public browser successfully switched to Chinese, opened practice, played the real audio, recorded two keyboard inputs and displayed a completed trace (99% coverage, one pass).

The production administrator login currently requires the owner to finish ChatGPT sign-in and dashboard activation. The full research collection loop was verified locally, but is not yet certified end-to-end in production. No production participant data was seeded for these checks. Custom-domain redirect is pending the domain details.

公开页面与音频录制已真实验证；研究后台仍需所有者首次登录激活，生产研究闭环尚未完成验收。测试未写入生产参与者记录。自有域名跳转等待域名信息。
