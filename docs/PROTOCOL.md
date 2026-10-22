# Annotation protocol / 标注协议

[English overview](../README.md) · [中文概览](../README.zh-CN.md) · [API](API.md)

This document describes the implemented v2 behavior. It separates original user observations from derived data and from claims made by the associated research paper.

本文描述 v2 的实际实现，区分用户原始观测、派生数据与相关论文的研究结论。

## 1. Question, axes and clocks / 标注对象、坐标与时钟

A session records either **perceived emotion** (`perceived`: what the audio expresses) or **felt emotion** (`felt`: the listener’s own experience). Free sessions default to perceived emotion. A research study assigns the question. Once a recording pass exists, the interface locks that question; switching it requires a new session. Legacy observations may have `emotionTarget: "unknown"`.

每个会话记录**感知情绪**（音频表达出的情绪，`perceived`）或**自身感受**（聆听者自己的体验，`felt`）。自由模式默认前者，研究模式由研究者设置。创建录制轮次后，界面固定该对象；需要更换时应建立新会话。旧版记录的标注对象可以为 `unknown`。

| Field / 字段 | Meaning / 含义 |
| --- | --- |
| `valence` | 0 = unpleasant/negative; 1 = pleasant/positive / 0 为不愉悦或负向，1 为愉悦或正向 |
| `arousal` | 0 = low activation; 1 = high activation / 0 为低唤醒，1 为高唤醒；不等同于音量 |
| `mediaTime` | Audio playback position in seconds / 音频播放位置，单位秒 |
| `monotonicTime` | Browser `performance.now()` timestamp in milliseconds / 浏览器单调时钟，单位毫秒 |
| `createdAt`, `updatedAt` | ISO wall-clock timestamps / ISO 格式的日历时间 |

Playback is fixed at 1×. Media time is the annotation timeline; wall-clock time is not substituted for it. Separate passes may have different monotonic-clock origins after a page reload. The interface does not estimate or compensate for human response delay.

播放固定为 1×。标注轨迹使用媒体时间，不用日历时间替代。页面重新加载后，不同轮次的单调时钟起点可能不同。系统不估计或补偿人的反应延迟。

## 2. Original observations and held values / 原始观测与保持值

Recording starts only after the user presses Record. Listening, moving the point before recording, or moving a slider while playback is paused does not create observations. Pointer movement is throttled to approximately 30 Hz; pointer down/up are captured explicitly, as are keyboard and slider changes. Consequently, raw input is irregular and 30 Hz is not an absolute bound on all event types.

只有点击开始标注后才记录。仅试听、录制前移动圆点或暂停时操作滑块不会产生观测。指针移动按约 30 Hz 节流；按下、抬起、键盘和滑块操作会明确记录。因此原始事件并非等间隔，30 Hz 也不是所有事件合计的绝对上限。

Each `RatingEvent` retains an ID, within-pass sequence, media time, monotonic time, two coordinates, and input method. Finite input coordinates are clamped to 0–1. Out-of-order media or monotonic timestamps are not silently reordered by the live recorder. Two observations at the same media time are both retained; the later sequence determines the effective value.

每个 `RatingEvent` 保留 ID、轮内顺序、媒体时间、单调时间、两个坐标及输入方式。有限坐标值限制在 0–1；实时记录器不会悄悄重排倒退的媒体时间或单调时间。同一媒体时刻的两次输入都保留，较后一次决定有效评分。

Before a pass’s first input, its value is missing. Afterwards, the most recent original value is held until another input or the pass end. Releasing the pointer therefore continues the last rating; it does not create a new observation at every displayed or exported frame. A neutral-looking initial pointer position is not recorded as a neutral response.

每轮首次输入前为空缺；输入后保持最近原始评分，直到下次输入或该轮结束。松手后继续使用最近评分，但每个显示帧、导出采样点不因此成为新增观测。圆点初始位于中间，也不代表已经记录了中性评分。

## 3. Editing and interruption / 修改与中断

A `RecordingPass` has an ID, creation order, `start`, `end`, original events, a revocation flag and an end reason. Its effective interval is **`[start, end)`**. The latest non-revoked pass wins wherever passes overlap. Selection happens on continuous media-time intervals before the 10 Hz grid is applied.

每个 `RecordingPass` 保存 ID、创建顺序、起止时刻、原始事件、撤销标志和结束原因。有效区间为 **`[start, end)`**。有重叠时，采用最新创建且未撤销的轮次。先在连续媒体时间上解析覆盖关系，再生成 10 Hz 序列。

- A new pass replaces its whole interval, including missing values before its first input. / 新轮次覆盖整个区间，包括首次输入前的空缺。
- A positive-duration pass with no input erases the effective data in that interval. / 有时长但没有输入的轮次，会使对应区间的有效数据变为空缺。
- A zero-duration pass does not overwrite a region. / 零时长轮次不覆盖任何区间。
- Outside the new interval, the previous effective trace resumes. / 新区间之外恢复此前有效轨迹。
- Undo revokes the most recent non-revoked pass; repeated undo walks back through the history. Original events are retained. / 撤销将最近未撤销轮次标记为撤销，可连续执行；原始事件仍保留。

**Example / 例子:** An old pass covers `[0,1)` with valence 0.2 from time 0, then 0.4 from time 0.5. A newer pass covers `[0.3,0.7)` and first records 0.9 at 0.45. The final trace is 0.2 on `[0,0.3)`, missing on `[0.3,0.45)`, 0.9 on `[0.45,0.7)`, and 0.4 on `[0.7,1)`. Its exact valid coverage is 85%. Undo restores the old pass.

旧轮次覆盖 `[0,1)`：0 秒起为 0.2，0.5 秒起为 0.4。新轮次覆盖 `[0.3,0.7)`，首次输入在 0.45 秒，为 0.9。最终轨迹为：`[0,0.3)` 使用 0.2，`[0.3,0.45)` 空缺，`[0.45,0.7)` 使用 0.9，`[0.7,1)` 使用 0.4。有效覆盖率为 85%；撤销后恢复旧轮次。

Pause, seek, playback end, buffering, a hidden page, playback error, or a detected rendering interruption ends recording. The implementation detects an animation-frame gap over 500 ms as an interruption. It does not automatically resume recording after a seek or interruption. Seeking uses the previous reliable playback position to close the current pass, so skipped audio is not overwritten.

暂停、跳转、播放结束、缓冲、页面隐藏、播放错误及检测到的渲染中断都会结束录制。实现将动画帧间隔超过 500 毫秒视为中断。跳转或中断后不会自动恢复录制。跳转时使用此前可靠播放位置结束当前轮次，避免覆盖跳过的音频。

An interruption can finalize a boundary just before an already-captured input. That input remains in raw history if it is within the audio duration, but it contributes no value or coverage outside the finalized interval. An open pass has no trustworthy future end: the core derives only as far as its latest observed media timestamp. Live previews use a temporary closed copy at the current reliable position. A restored interrupted draft closes its previously open pass conservatively.

中断可能使最终边界略早于某个已经记录的输入。只要该输入仍位于音频时长内，就保留在原始历史中，但不会在最终区间之外贡献评分或覆盖率。未结束的轮次不能推断未来终点：核心仅计算到最近观测时间；实时预览通过在当前可靠位置临时关闭副本实现。恢复中断草稿时，会保守结束此前未关闭的轮次。

## 4. Derived data and statistics / 派生数据与统计

`protocol` declares scale `[0,1]`, `sampleRateHz: 10`, `resampling: "zero_order_hold"`, and protocol version 1. `schemaVersion: 2` describes the session data structure, not the protocol version or the browser database version.

`protocol` 指定 `[0,1]` 量表、10 Hz、`zero_order_hold` 和协议版本 1。`schemaVersion: 2` 是会话结构版本，与协议版本、浏览器数据库版本分别管理。

Samples occur at `i / 10` seconds for all grid points strictly before the audio duration. The audio endpoint is excluded. Non-grid edit boundaries are honored: even an edit shorter than 100 ms may change exact coverage or one sampled value.

采样时刻为 `i / 10` 秒，只保留严格早于音频时长的网格点，不包含音频终点。非网格边界同样有效：即使修改区间短于 100 毫秒，也可能影响精确覆盖率或某个采样值。

| Derived field / 派生字段 | Meaning / 含义 |
| --- | --- |
| `valence`, `arousal` | Effective values, or `null` for missing / 有效评分；空缺为 `null` |
| `sourceEventId` | Original event responsible for the held value / 保持值对应的原始事件 |
| `passId` | Winning pass; may exist even when its value is missing / 有效轮次；评分缺失时仍可能有轮次 ID |
| `valueOrigin: new_event` | Grid timestamp coincides with the original event / 网格时刻与原始事件重合 |
| `valueOrigin: held` | The original event occurred earlier / 原始事件发生在更早时刻 |
| `valueOrigin: missing` | No effective observation / 没有有效观测 |

An off-grid observation may first appear as `held` at the next grid point. Its exact original time remains available through `sourceEventId`; it is not rounded into a new input.

非网格时刻的输入，在下一个网格点可能直接显示为 `held`。可通过 `sourceEventId` 找到原始精确时间，不会将它取整后当成新增输入。

Coverage is exact valid duration divided by total audio duration, not the fraction of rounded grid samples. `eventCount` includes all raw events, including overwritten/revoked events; `passCount` counts non-revoked positive-duration passes. `revision` advances with edits and metadata changes and is not the number of submitted versions. Partial and empty research annotations are accepted, with their actual coverage.

覆盖率是有效时长除以音频总时长，不是网格采样点的有效比例。`eventCount` 包含所有原始事件，包括被覆盖或撤销的输入；`passCount` 统计未撤销且有正时长的轮次。`revision` 随编辑与元数据变更递增，不等于提交版本数量。研究模式允许部分标注和空标注，并记录实际覆盖率。

## 5. Files, imports and provenance / 文件、导入与来源

- **Free-session JSON:** session metadata, audio identity, raw events, complete pass history, export description, derived samples and summary. Blob URLs are omitted because they expire with the tab. Derived values are recomputed during import rather than trusted. / **自由会话 JSON：** 包含会话、音频身份、原始事件、完整轮次历史、导出说明、派生序列和统计；省略随页面失效的 Blob URL。导入时重新计算派生值，不直接相信导入的统计。
- **Free-session CSV:** labelled `derived_10hz` rows, metadata, media time, VA values, origin and source IDs. Missing coordinates are empty fields. / **自由会话 CSV：** 每行标为 `derived_10hz`，包含元数据、媒体时间、VA 值、来源类型与 ID；缺失坐标为空字段。
- **Research package:** immutable JSON `{schemaVersion, submittedAt, inputSha256, session, samples, stats}`. The server validates assignment/protocol and recomputes samples and coverage. Server-authoritative audio metadata is used in the stored session. / **研究数据包：** 保存不可变 JSON；服务端核对研究分配与协议，重新计算序列及覆盖率，并采用服务端权威音频元数据。
- **Bulk export:** JSONL preserves full packages and submission metadata; CSV contains the effective 10 Hz series. All matching ready versions are included, not only the latest one. / **批量导出：** JSONL 保留完整数据包与提交元数据；CSV 保存有效 10 Hz 序列。包含所有符合条件的完成版本，不仅是最新版本。

The UI imports a free session under a new local ID and records `importedFromSessionId`. This prevents an older imported revision from colliding with a newer saved draft. Research sessions should be resumed through their original invitation and participant credential.

界面为导入的自由会话创建新本地 ID，并记录 `importedFromSessionId`，避免较旧导入版本与已有较新草稿冲突。研究会话应通过原邀请和参与凭据恢复。

Legacy input accepts the original `{timestamp,totalRatings,ratings}` JSON. Its exact point values/times and original payload are retained. Unknown audio identity, duration and target are not inferred; `duration:0` means unknown here. Monotonic time uses an explicitly documented zero placeholder. No continuous trace or coverage is fabricated. Legacy CSV rows are labelled `raw_legacy`. These records remain available for export; selecting audio creates a new session.

旧版导入接受原始 `{timestamp,totalRatings,ratings}` JSON，保留原始点值、时间及源数据。不推断未知音频身份、时长和标注对象；此处 `duration:0` 表示未知。单调时间使用已注明的零占位值，不制造连续轨迹或覆盖率。旧版 CSV 行标为 `raw_legacy`。这些记录可继续导出，选择音频时建立新会话。

## 6. Storage and research boundaries / 保存与研究边界

Free-mode audio is played from the selected local file; annotation payloads stay in IndexedDB until exported. Autosave runs periodically and after recording stops. Storage errors are surfaced; local storage is not a substitute for an exported backup. Audio bytes are not persisted. Reconnecting a known local file checks SHA-256. This browser is the storage boundary: clearing site data or using another device does not preserve drafts automatically.

自由模式使用本地文件播放，标注数据保存在 IndexedDB，按周期及停止录制后自动保存。保存错误会明确提示；本地存储不能替代导出备份。音频字节不持久保存，重新关联已知本地文件时校验 SHA-256。存储范围限于当前浏览器：清除网站数据或更换设备后，草稿不会自动保留。

Research consent creates a random anonymous participant ID and a bearer credential, bound to one study. The browser stores credentials in the `participations` IndexedDB store; the server stores their hash. Notes, raw inputs and edit history are uploaded only after Submit. A stable submission ID binds to exact payload bytes; retries resume the same upload, while changed payloads create another immutable submission. R2 persistence/checksum verification precedes the D1 ready index. Only `ready` confirms completion.

同意参与后，系统创建随机匿名编号和绑定单项研究的访问凭据。浏览器将凭据保存在 IndexedDB 的 `participations` 中，服务器只保存其哈希。只有提交后才上传备注、原始输入及修改历史。稳定提交 ID 绑定精确数据字节；重试续传同一提交，数据改变则创建新的不可变提交。先在 R2 持久保存并校验，再更新 D1 的完成索引，只有 `ready` 才表示完成。

Published study instructions and materials are fixed. New versions receive distinct study/audio identities and invitations. Closing stops new participants and new submission initializations; already-initialized uploads can still finish. Invitations grant access to study materials, not other participants’ results. The designated owner can read/export submitted results. There is no real-time multi-tab merge, cross-device sync, automatic emotion inference or statistical inference pipeline.

研究发布后，说明和素材固定；新版本使用不同的研究、音频身份和邀请。关闭后停止新增参与者及新提交初始化，已初始化上传仍可完成。邀请链接允许访问研究材料，不允许读取他人结果；指定所有者可读取、导出提交结果。系统不提供多标签页实时合并、跨设备同步、自动情绪推断或统计推断流程。

## 7. Relationship to the paper / 与论文的关系

Reference: S. Yang, C. N. Reed, E. Chew, and M. Barthet, “Examining Emotion Perception Agreement in Live Music Performance,” *IEEE Transactions on Affective Computing*, 14(2), 1442–1460, 2023; early access 2021. [DOI](https://doi.org/10.1109/TAFFC.2021.3093787) · [Author preprint](https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf).

The original study’s time-stamped click collection and 1 Hz step-resampling analysis inform the design. The new 10 Hz continuous-input interface, general-audio support, editing and translations are extensions. Software tests verify implementation behavior; they do not validate psychometric reliability, response accuracy, cross-language equivalence or reproduction of the paper’s findings.

原研究的带时间戳点击采集及 1 Hz 阶梯重采样分析为设计提供依据。新版 10 Hz 派生、连续输入、通用音频、编辑和翻译均属于扩展。软件测试验证实现行为，不证明心理测量信度、反应准确性、跨语言等价性或论文结论得到复现。
