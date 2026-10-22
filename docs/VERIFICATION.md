# Verification record / 验收记录

Local verification: 2026-10-22. This record describes observed checks, not a guarantee of production capacity.

## Axis and homepage motion revision / 坐标轴与首页动画修订

Verified locally on 2026-10-22 after the demo-first revision:

- The configured Y name is attached to the upper vertical centerline; the configured X name is on the right horizontal centerline. English and Chinese remain upright. At 320 × 568 the axis names and quadrant captions were readable without overlapping.
- Nearby guidance retains its radius, limit and distance ordering. It renders as one unnumbered vertical list with commas between entries. Browser inspection found no generated counters or bullets; a five-word example included strength, thoughtful, care, hopeful and bright.
- The homepage retains the original curve and composition, now with a 24-second drawing/moving-point loop and six sequential floating tags from the configured list. Chinese labels stayed within their cards in the browser; the hero fit the 390-pixel phone preview.
- Two sampled animation frames showed point progress from 53.44% to 64.79% and a corresponding trace-dash change. Pausing set all eight animations to paused; later inspection retained exactly 65.2146% point progress and the same trace offset. Resume worked. Reduced-motion CSS provides a complete static path and endpoint; OS preference switching was not separately tested.
- TypeScript and focused lint passed. This revision changes presentation only; audio data and annotation rules are unchanged.

## Current demo-first revision / 当前演示版修订

Verified locally on 2026-10-22 after the revisions recorded below:

- The homepage hero and right-hand trajectory illustration remain byte-identical to the preceding version. Navigation now has an explicit Home entry and a customization guide, with no public study-participation or administration entry.
- `researchEnabled: false` disables research collection by default. Cookie-free local checks returned the anonymous disabled identity, 404 for `/api/admin/studies`, and a demo notice for `/admin`, `/research` and `/study/demo`.
- All 42 Node tests and TypeScript checking passed. The seven added tests cover manifest validation, URL and size limits, independent hosted identities, local fingerprint matching, draft isolation, and the three distinct generated WAV assets. The modified component/module files passed focused ESLint.
- Browser selection measured the three actual sample durations as 12, 15 and 18 seconds. The third sample played normally. Recording two keyboard inputs on Tone steps, switching to Soft pulses, and returning restored exactly two inputs/one pass; Soft pulses remained empty. The JSON export identified `library-tone-steps`, its SHA-256 and both original input UTC/audio-time values.
- A real multiple-file chooser loaded two local WAVs. Both remained playable after switching between them. Files stayed local; this did not create participant submissions.
- The four quadrant captions use upright horizontal text derived from the configured endpoints. In a 1280 × 720 browser, the square measured 272 × 272 pixels and document horizontal overflow was zero. Fine adjustment was collapsed by default.
- Browser previews at 390 × 844 and 320 × 568 showed the complete square and five bilingual reference words together below it. These are viewport checks, not physical-device certification.
- The original standalone HTML and `/legacy/` source remain byte-identical. The original main baseline remains isolated from the upgrade branch.

公开网站当前以演示和自定义为目标，后台默认关闭；下文后台、上线和旧版布局记录是先前阶段的历史验收，不代表当前开启研究收集。当前发布的确切版本以 Sites 部署结果和线上核验为准。

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

## Guided VA revision / 引导词界面修订

Verified locally on 2026-10-22:

- All 34 Node tests and TypeScript passed. The five guidance tests compare all 97 tags, translations and coordinates against the retained original HTML; check exact original RGB interpolation; and verify circle boundaries, distance ordering, the five-tag limit, empty regions and configuration validation.
- The local backend smoke test passed with interface snapshots and input UTC preserved through submission and export, including the original UTC on held CSV rows.
- Browser measurement found a 582.0625 × 582.0625 pixel VA plane and a 72.75 pixel guide diameter (12.5%, subject to CSS pixel rounding). A click at (0.82, 0.65) displayed admire, talent, care, confident and ambitious in distance order, with SVG anchors at their configured VA coordinates.
- At (0, 0), no emotion tags appeared and the circle center remained on the corner, clipped by the plane rather than moved inward. English/Chinese axis labels and bilingual guide words were inspected. Loading another audio reset the preview point.
- A browser-generated JSON export from the synthetic demo audio contained two keyboard inputs, each with its actual audio time and a distinct UTC timestamp, plus the 97-tag interface snapshot. UTC uses the device clock; it is not independently synchronized server time.
- Restored sessions retain their saved interface profile. Newly created sessions use the current configured profile, avoiding accidental inheritance of an older restored profile.

These checks used local synthetic data. The square's responsive CSS is implemented, but this revision was not separately tested on a physical mobile device.

## Compact guidance revision / 紧凑引导界面修订

Verified on 2026-10-22 after the guided VA revision above:

- Reference words now form a single vertical list directly below the square. On-plane labels, anchor dots and leader lines are removed. The selection circle, distance filter and maximum of five words are unchanged.
- Same-origin browser previews at 390 × 844 and 320 × 568 displayed the entire square and five bilingual guide words together. A 1366 × 768 laptop preview and a normal 1280 × 720 browser were also inspected. The normal browser reported zero horizontal document overflow; the five list rows shared one left edge and were spaced 22 pixels apart. These are browser viewport checks, not physical iPhone/Android device certification.
- The desktop square was 272 × 272 pixels at a 720-pixel viewport height; phone previews used 280- and 228-pixel squares. The square and guide panel share the same responsive width, capped by both available width and viewport height.
- Muted red/orange/blue/green defaults use profile `mood-rater-soft-va` version 2. The exact original preset remains available in `config/va-interface-original.json`; existing saved profile snapshots keep their colors.
- Practice playback, two actual keyboard inputs and stopping the recording worked in the browser. All 35 Node tests and TypeScript passed. No recording/data protocol changes were made in this presentation revision.
