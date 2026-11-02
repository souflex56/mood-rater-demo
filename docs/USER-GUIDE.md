# User guide

[Overview](../README.md) | [简体中文](USER-GUIDE.zh-CN.md) | [Documentation](README.md)

## Choose audio and a question

Open the [annotation workspace](https://mood-rater-audio.baysky.chatgpt.site/annotate). Choose a bundled recording or add local files in a browser-supported audio format. Four 60-second examples are included; see their [sources and licenses](../public/audio/README.md).

Choose **emotion expressed by the audio** (perceived emotion) or **emotion you feel while listening** (felt emotion). This question is fixed once you start recording. Create a new session to change it.

| Limit | Default |
| --- | --- |
| Local audio | 30 minutes and 100 MiB per file |
| Local collection | 20 distinct files in the current tab |
| Configured library | Up to 50 clips |
| JSON import | Up to 100 MiB |

## Record ratings

Press **Start recording**, then click on the emotion map as the audio plays. Valence increases from negative/unpleasant on the left to positive/pleasant on the right. Arousal increases from low activation at the bottom to high activation at the top. Both use **0–1**; arousal does not mean volume.

The nearby words guide your choice; they are not automatic emotion predictions. You can also use touch, arrow keys or the independent sliders. Switch English/Chinese at any time.

Listening without recording does not change data. Every pass starts with missing values until your first input. After that, the most recent rating holds until your next input or the end of the pass. Blank timeline regions mean missing ratings, not neutral emotion.

## Review and revise

Pause and seek to hear a section again. **Record from here** starts another pass that replaces the interval you record, including any initial gap before its first input. Outside that interval, earlier ratings remain. **Undo** revokes the latest pass while keeping its raw history.

Pausing, seeking, buffering, hiding the page or reaching the audio end stops recording. Start it again explicitly to continue. Exact boundary and interruption rules are in the [protocol](PROTOCOL.md).

## Save and resume

Drafts are saved to this browser’s IndexedDB. Each audio clip has its own session. Drafts are not synchronized across devices or browsers, and clearing site storage removes them. Save errors are shown in the interface.

Local audio bytes are not saved with the draft. After refreshing, select the original file again; the tool checks its SHA-256 fingerprint before reconnecting it. Switching to a different clip does not overwrite another clip’s draft.

## Export and import

| Format | Use |
| --- | --- |
| **JSON** | Keep a backup of raw ratings, edit history, notes, audio identity and interface settings; import it to restore a session |
| **CSV** | Analyze the derived 10 Hz time series; missing samples stay missing, and held values retain their source-event time |

Importing a free-session JSON creates a new local session with source provenance. It does not overwrite an existing session. Legacy JSON preserves unknown metadata as unknown. Export important work before clearing browser data or moving to another site address.

## Data boundaries

In the default app, local audio and annotations are not uploaded to the research API. Hosting the app still involves ordinary requests for pages and bundled recordings. The optional participant-submission backend is disabled by default and needs its own [deployment and owner setup](DEPLOYMENT.md).

The tool records human ratings. Bundled recordings have no reference emotion scores, and the software does not perform diagnostic scoring or automatic emotion recognition. For research use, review the [protocol and its limits](PROTOCOL.md#7-relationship-to-the-paper--与论文的关系).
