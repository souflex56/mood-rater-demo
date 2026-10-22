# Mood Rater · Audio emotion annotation

**[Public homepage](https://mood-rater-audio.baysky.chatgpt.site) · [Open the demo](https://mood-rater-audio.baysky.chatgpt.site/annotate) · [Customization guide](docs/CUSTOMIZATION.md) · [简体中文](README.zh-CN.md)**

Mood Rater is a bilingual browser demo for tracing how emotion changes while listening to audio. It builds on Simin Yang’s doctoral research and provides a reusable starting point for audio annotation. **No account, database setup or researcher activation is needed to use the public demo or run the default local app.**

The upgrade lives on `codex/mood-rater-v2` in a separate Git worktree. The original `main` baseline and [original interface](https://mood-rater-audio.baysky.chatgpt.site/legacy/) remain available for comparison.

## Try it

1. Open the [demo](https://mood-rater-audio.baysky.chatgpt.site/annotate). Choose a bundled example or load local audio. You can keep multiple clips in the picker, with a separate session for each.
2. Choose what to rate: **emotion expressed by the audio** or **emotion you feel while listening**. The question is fixed once recording begins.
3. Press **Start recording**, then move the point as the emotion changes. Valence runs left to right; arousal runs bottom to top. Both use **0–1**.
4. Pause and seek to review. **Record from here** replaces a section; **Undo** revokes the latest recording pass.
5. Export **JSON** for raw inputs, editing history and interface settings, or **CSV** for the derived time series.

Mouse/touch, arrow keys and separate sliders are supported. Switch English/Chinese at any time. Listening without recording does not change data. Each new pass is blank until its first input; later values hold until the next input or pass end. Gaps remain missing. See the [annotation protocol](docs/PROTOCOL.md).

The square VA plane uses muted red, orange, blue and green, with an exact original-color preset available. All **97 guide words** retain their supplied coordinates and translations. A circle with **diameter = plane width / 8** selects at most five words inside it, listed below the plane nearest-first. An empty circle shows no words. New inputs include audio time and device-clock UTC.

## Run locally

Use Node.js **22.13 or newer** and npm:

```sh
npm run install:ci
npm run dev
```

Open the server’s printed URL, normally [localhost:5173](http://127.0.0.1:5173). The default demo does not require an environment file, login or D1 initialization. The v2 app uses a development server; `mood-rater-final.html` remains the original standalone file.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The stack is React, TypeScript and Vinext. Browser IndexedDB stores drafts; the default workflow does not send audio or results to the research API.

## Customize for your project

Start with the [full customization guide](docs/CUSTOMIZATION.md) or the [public overview](https://mood-rater-audio.baysky.chatgpt.site/customize).

| File | Purpose |
| --- | --- |
| [`config/audio-library.json`](config/audio-library.json) | Audio collection, clip identities and bilingual labels |
| [`config/emotion-tags.json`](config/emotion-tags.json) | Guide words, translations and VA positions |
| [`config/va-interface.json`](config/va-interface.json) | Circle diameter, label count, four colors, X/Y names and endpoints |
| [`config/va-interface-original.json`](config/va-interface-original.json) | Exact original palette preset |
| [`config/project.json`](config/project.json) | Optional research collection flag, off by default |

Audio and interface configuration are separate from the annotation engine. New sessions retain their interface snapshot; changing defaults does not change saved sessions’ guidance. Axis names are display text: they do not swap axes or rename exported `valence`/`arousal` fields. See [VA configuration](docs/VA-CUSTOMIZATION.md).

## Data and recovery

| Item | Default demo behavior |
| --- | --- |
| Bundled library | Three synthetic examples; configurable list of up to 50 clips |
| Local collection | Up to 20 unique local files in the current tab |
| Audio | Up to 30 minutes and 100 MiB per file; browser-supported formats |
| Input capture | Pointer movement up to 30 Hz; down/up and explicit keyboard/slider actions can add events |
| Derived series | 10 Hz zero-order hold; missing values remain missing |
| Drafts | Browser IndexedDB; available space depends on the browser |
| Export | Per-session JSON with raw inputs/configuration; CSV with derived samples |
| JSON import | Up to 100 MiB in the interface, validated before restoration |

Local audio files are not saved in IndexedDB. Re-select the original file after refreshing; its saved SHA-256 fingerprint is checked. Clearing site storage removes drafts, so export important work. Bundled synthetic examples teach the controls; they are not validated research stimuli or normative emotion examples.

Imported free sessions receive a new local ID and source-session provenance, avoiding overwrite of newer work. Legacy JSON preserves original observations and unknown metadata. Choosing new audio does not retroactively identify legacy audio. The tool does not perform automatic emotion recognition, diagnostic scoring or the paper’s statistical analysis.

## Optional research collection

The invitation, participant submission and owner dashboard implementation remains available for advanced deployments. It is **disabled by default** through `config/project.json` (`researchEnabled: false`) and is not part of the normal demo flow.

To operate a collection service, enable the flag in your own deployment and follow [deployment and owner configuration](docs/DEPLOYMENT.md) and the [research API](docs/API.md). That optional workflow requires D1/R2 and authorized owner setup. Local smoke, recovery and capacity fixtures do not certify production availability or 1,000 concurrent users.

## Research reference

Simin Yang, Courtney N. Reed, Elaine Chew, and Mathieu Barthet. **“Examining Emotion Perception Agreement in Live Music Performance.”** *IEEE Transactions on Affective Computing*, **14**(2), 1442–1460, 2023. DOI: [10.1109/TAFFC.2021.3093787](https://doi.org/10.1109/TAFFC.2021.3093787). First published online in 2021.

[IEEE record](https://ieeexplore.ieee.org/document/9468946) · [Author preprint](https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf) · [BibTeX](public/citation.bib)

The original work used time-stamped clicks and, in part of its analysis, 1 Hz step resampling. Continuous dragging, general audio, interval editing and 10 Hz exports are engineering extensions. They do not reproduce the full experimental protocol or establish the paper’s reliability claims. The tags guide selection at their supplied VA positions; the software does not infer a listener’s emotion from these words.

## Compare with the original

- Open [`/legacy/`](https://mood-rater-audio.baysky.chatgpt.site/legacy/); its example audio may depend on a third-party URL.
- `mood-rater-final.html` remains the original standalone file.
- Read the [original Chinese README](public/legacy/README.zh-CN.md) and [baseline record](docs/BASELINE.md).
- Compare committed changes with `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD`; `git status --short` identifies uncommitted work.
