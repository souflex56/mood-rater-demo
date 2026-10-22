# Mood Rater · Audio emotion annotation

[简体中文](README.zh-CN.md) · [VA configuration](docs/VA-CUSTOMIZATION.md) · [Annotation protocol](docs/PROTOCOL.md) · [Deployment](docs/DEPLOYMENT.md) · [Research API](docs/API.md)

Mood Rater records how perceived or felt emotion changes while someone listens to audio. This edition extends Simin Yang’s doctoral research implementation with an English/Chinese interface, continuous valence–arousal annotation, local drafts, interval re-recording, and an invitation-based research workflow.

The upgrade is developed on `codex/mood-rater-v2` in a separate Git worktree. The original `main` baseline is preserved. Public site: [mood-rater-audio.baysky.chatgpt.site](https://mood-rater-audio.baysky.chatgpt.site). Public routes and annotation were verified on 2026-10-22; the owner must complete the first ChatGPT sign-in and dashboard activation before collecting research data.

## What you can do

- **Annotate freely:** load local audio, choose perceived or felt emotion, listen, record, revisit a section, and export JSON or CSV. Free-mode audio and annotations are not uploaded to the research API.
- **Participate in research:** follow an invitation, read the information and consent, annotate the assigned audio, and explicitly submit. Participants do not need accounts.
- **Manage a study:** the designated owner signs in with ChatGPT to configure bilingual instructions, upload and order audio, publish invitations, create new study versions, and export results.
- **Use the controls that suit you:** mouse/touch dragging, arrow keys, and separate sliders. Interface language follows the browser initially and can be changed at any time.
- **Learn with a short practice:** the 20-second synthetic example is separate from drafts and submissions. It is an interaction demo, not a validated research stimulus.

The square VA plane restores the original red/orange/blue/green gradient and all 97 supplied guide tags. A circle of diameter 1/8 of the plane width selects up to five nearby labels; empty regions show no tags. Tag positions, circle size, colors and bilingual axis labels are independently configurable. New inputs record UTC alongside audio time. See [customization](docs/VA-CUSTOMIZATION.md).

## Start annotating

1. Open `/annotate`, or use `/annotate?demo=1` for practice.
2. Choose an audio file and decide what to rate: **emotion expressed by the audio** or **emotion you feel while listening**. The question is fixed once recording begins; studies set it for everyone.
3. Press **Start recording** and move the point. Valence runs from unpleasant to pleasant, left to right; arousal runs from low to high, bottom to top. Both use **0–1**.
4. Pause and seek to review. Press **Record from here** to replace a section, or **Undo** to revoke the latest recording pass.
5. Review gaps and coverage, then export. A research participant can choose **Submit annotation**; only the server’s confirmation means the result has been received.

Listening without recording does not edit data. Before the first input in each pass, values are missing. After an input, its value is held until the next input or the end of that pass. A newer pass also replaces old values with missing data where the newer pass has no input. See the [full protocol](docs/PROTOCOL.md).

## Local development

Use Node.js **22.13 or newer** and npm. Install the locked dependencies:

```sh
npm run install:ci
```

For a fresh checkout, follow [local database initialization](docs/DEPLOYMENT.md#local-development--本地开发), then run:

```sh
npm run dev
```

The portable local profile defaults to [localhost:5173](http://127.0.0.1:5173). Use the URL printed by the server if its configuration differs. The v2 application needs a server; the preserved original HTML remains standalone.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The stack is React, TypeScript and Vinext, with Cloudflare Workers/D1/R2 through Sites. IndexedDB stores browser drafts and research participation credentials; raw annotation samples are not placed in D1 rows.

## Data, limits and recovery

| Item | Current implementation |
| --- | --- |
| Audio | Up to 30 minutes and 100 MiB per file; browser-supported audio formats |
| Research materials | Up to 100 audio assets per study |
| Input capture | Pointer moves are throttled to 30 Hz; pointer down/up and explicit keyboard/slider inputs can add events |
| Derived series | 10 Hz, zero-order hold; missing values remain missing |
| Research submission | Up to 32 MiB of compact JSON and 150,000 total raw events |
| JSON import | Up to 100 MiB in the interface; validated before restoration |
| Local persistence | Browser IndexedDB; storage availability and quota depend on the browser |
| Result export | Single JSON/CSV, or filtered bulk JSONL/CSV; earlier submitted revisions retained |

Re-select the original local audio after refreshing; its SHA-256 fingerprint is checked. Audio files themselves are not saved in IndexedDB. Research participation credentials remain on the same browser/device so saved research drafts can be resumed after a tab is closed. Clearing site storage removes both drafts and credentials. Export important work.

Imported free sessions receive a new local session ID, with source-session provenance, so importing an older export does not silently overwrite newer work. Legacy JSON retains the original point observations and source payload; unknown audio identity, duration and annotation target remain unknown. Selecting new audio does not retroactively assign it to legacy observations.

Research audio is available to people who possess its invitation URL. Results are restricted to the designated research owner. The researcher should provide appropriate information, retention arrangements and contact details for each study. The tool has no automatic emotion recognition, diagnostic scoring, server transcoding or built-in paper-analysis pipeline.

## Research reference

Simin Yang, Courtney N. Reed, Elaine Chew, and Mathieu Barthet. **“Examining Emotion Perception Agreement in Live Music Performance.”** *IEEE Transactions on Affective Computing*, **14**(2), 1442–1460, 2023. DOI: [10.1109/TAFFC.2021.3093787](https://doi.org/10.1109/TAFFC.2021.3093787). First published online in 2021.

[IEEE record](https://ieeexplore.ieee.org/document/9468946) · [Author preprint](https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf) · [BibTeX](public/citation.bib)

The original work used time-stamped clicks and, in part of its analysis, 1 Hz step resampling. Continuous dragging, general audio, interval editing and 10 Hz exports are engineering extensions. They do not reproduce the full experimental protocol or establish the reliability claims of the paper. The supplied emotion tags guide selection at their mapped VA positions; the software does not infer a listener’s emotion from these words.

## Compare with the original

- Open `/legacy/` for the preserved original interface; its example audio may depend on a third-party URL.
- Keep using `mood-rater-final.html` as the original standalone file.
- Read the [original Chinese README](public/legacy/README.zh-CN.md) and [baseline record](docs/BASELINE.md).
- Compare committed upgrade changes with `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD`; use `git status --short` to identify work not yet committed.

The repository includes focused protocol/validation tests and local backend smoke, recovery and capacity fixtures. The capacity fixture exercises one 30-minute, 108,000-event session and 1,000 small submissions in batches of 10. This is a local functional capacity check, **not certification of 1,000 concurrent users or production availability**. See [validation and release checks](docs/DEPLOYMENT.md#validation-and-release--验证与上线核对).
