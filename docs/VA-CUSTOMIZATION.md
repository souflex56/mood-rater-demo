# VA interface configuration / VA 界面配置

[Audio and project customization / 音频与项目配置](CUSTOMIZATION.md) · [Public demo / 公开演示](https://mood-rater-audio.baysky.chatgpt.site/annotate)

The square VA plane preserves the original Mood Rater's red, orange, blue and green color families in a softer palette that fits the cream and sage interface. The original saturated palette remains available as a separate preset. Guided labels come from the exact 97-word list and Chinese translations supplied by the project owner. The old source comment says 95, but the array contains 97 distinct entries. No coordinates have been invented for words absent from that list, including the illustrative word “sweet” in the supplied thesis excerpt.

正方形 VA 平面保留原版红、橙、蓝、绿四类颜色，以较柔和的色调融入米白、鼠尾草绿界面；另存原版高饱和配色预设。引导词完整采用项目所有者提供的 97 个词、坐标和中文翻译；原代码注释写作 95，实际数组为 97 个不同词。论文描述中的 “sweet” 只是示例，不在所给词表中，因此未编造它的坐标。

## Files and extension points / 文件与接口

| File / 文件 | Edit here / 修改内容 |
| --- | --- |
| [`config/emotion-tags.json`](../config/emotion-tags.json) | Word IDs, English/Chinese labels, valence and arousal coordinates / 词 ID、中英文、效价与唤醒坐标 |
| [`config/va-interface.json`](../config/va-interface.json) | Circle diameter ratio, maximum label count, four background colors, X/Y names and endpoint labels / 圆圈直径比例、标签数量上限、四角配色、X/Y 轴名称及端点文案 |
| [`config/va-interface-original.json`](../config/va-interface-original.json) | Optional original palette preset, with the original profile ID and version / 原始配色可选预设，保留原配置 ID 与版本 |
| [`lib/va-config.ts`](../lib/va-config.ts) | Typed configuration validation, proximity selection and original color interpolation / 类型、配置校验、邻近筛选与原版颜色插值 |
| `Annotator` component's `interfaceProfile` prop | Supply another validated profile without modifying the interaction code / 传入其他配置，无需改交互实现 |

Changing the JSON defaults changes **new sessions after rebuilding and deploying**. New sessions retain a complete `interfaceProfile` snapshot, including tags and coordinates. Restored sessions use their snapshot so a later configuration edit does not silently change the guide shown to that session. Older exports without a profile remain readable; their historical configuration is unknown, and the current default is used for further interaction.

修改 JSON 默认配置后，重新构建发布即可用于**新会话**。新会话保存完整 `interfaceProfile` 快照，包含词表及坐标；恢复时使用快照，避免后续配置修改悄悄改变原会话的引导。无配置快照的历史数据仍能读取，其历史界面配置未知，继续操作时采用当前默认配置。

```tsx
import Annotator from '@/app/components/Annotator';
import { defaultVAInterface, parseVAInterfaceProfile } from '@/lib/va-config';

const custom = structuredClone(defaultVAInterface);
custom.config.id = 'my-study-va';
custom.config.version = 1;
custom.config.guide.diameterRatio = 1 / 8;
custom.config.guide.maxTags = 5;
custom.config.axes.x.name = { en: 'Valence', 'zh-CN': '效价' };
custom.config.background.topLeft = [190, 100, 102];
// Modify custom.tags or its label/valence/arousal fields here.
const profile = parseVAInterfaceProfile(custom);

export default function CustomAnnotationPage() {
  return <Annotator interfaceProfile={profile} />;
}
```

Axis names are presentation labels: changing their text does not swap axes, alter the 0–1 coordinates, or rename the exported `valence`/`arousal` fields. Colors use RGB channels from 0 to 255. Values and labels are validated as data, not executed as HTML or CSS. Use a new profile ID/version when changing a research interface.

轴名称只改变展示文案，不交换横纵轴、不改变 0–1 坐标，也不更名导出的 `valence`／`arousal` 字段。RGB 通道范围为 0–255。配置作为数据校验，不执行其中的 HTML 或 CSS。研究界面发生变更时，应更新配置 ID／版本。

All text captions sit outside the interactive square. The configured X name and a right arrow appear below it; the Y name and an up arrow appear on the far left, with upright text in both languages. Quadrant captions sit above and below the square's corners and are derived from the configured endpoint labels: X low / Y high, X high / Y high, X low / Y low, and X high / Y low. They describe directions and are separate from the emotion tag list; changing endpoint labels updates the quadrant captions.

所有说明文字均在交互正方形外。X 轴名称及向右箭头置于底部，Y 轴名称及向上箭头置于最左侧，中英文均正向显示。四象限说明位于四角上方或下方，由配置中的端点标签组合：X 低／Y 高、X 高／Y 高、X 低／Y 低、X 高／Y 低。它们说明方向，与情绪词表分开；修改端点文案会同步更新象限说明。

## Spatial guidance / 空间引导

For a selected point `(v, a)`, each tag's distance is `sqrt((v-tag.v)^2 + (a-tag.a)^2)`. The default circle has **diameter = plane width / 8**, hence **radius = 1/16 = 0.0625** in normalized square coordinates. Select only tags inside or on that boundary, sort by distance, then keep at most five. Equal-distance ties follow the file's tag order. An empty circle produces no emotion tags; it does not choose a nearest word from outside the circle.

以所选点为圆心，按二维欧氏距离筛选。默认**直径 = 平面宽度的 1/8**，所以归一化**半径 = 1/16 = 0.0625**。只选择圈内或边界上的词，按距离从近到远取最多 5 个；等距时按文件顺序。圈内没有词就不显示情绪词，不从圈外补选。

The selection circle retains the selected VA location even near an edge. Nearby words appear inline below the plane, separated by commas without numbering, in nearest-first order; narrow screens allow natural wrapping. The plane does not show tag anchors or connecting lines. Their stored coordinates still determine eligibility and ranking. Labels are guidance, not a classification of the listener. A word preview before recording does not create a rating. While recording, pointer, keyboard and slider inputs retain their actual coordinates and times.

圆圈保留所选 VA 位置，靠近边缘时也不移动数据坐标。附近词语在平面下方并列显示，以逗号分隔，按距离从近到远排序，窄屏自然换行；平面内不显示词语锚点或连线，词语的保存坐标仍用于筛选和排序。词语用于引导，不是对聆听者的分类。录制前预览词语不会产生评分；录制时保存鼠标、键盘和滑块实际输入的坐标与时间。

The default `mood-rater-soft-va` version 2 uses top-left muted red `[190,100,102]`, top-right warm orange `[219,174,101]`, bottom-left blue `[91,134,173]`, and bottom-right sage green `[147,177,125]`. It keeps the original two-stage interpolation and channel rounding. The optional `mood-rater-original-va` version 1 preset retains the original RGB values: `[180,0,0]`, `[220,120,0]`, `[0,40,120]`, and `[120,180,60]`, in the same corner order. Existing saved sessions continue to use their exact saved palette.

默认 `mood-rater-soft-va` 第 2 版采用左上柔红 `[190,100,102]`、右上暖橙 `[219,174,101]`、左下蓝色 `[91,134,173]`、右下鼠尾草绿 `[147,177,125]`，沿用原版的两阶段插值及通道取整。可选的 `mood-rater-original-va` 第 1 版预设按同样顺序保留原 RGB：`[180,0,0]`、`[220,120,0]`、`[0,40,120]`、`[120,180,60]`。已有会话继续使用其保存的原始配色快照。

To choose the original preset for new sessions, replace the `profile` in the component example above with:

如需为新会话选用原始配色，将上方组件示例中的 `profile` 替换为：

```tsx
import originalConfig from '@/config/va-interface-original.json';

const profile = parseVAInterfaceProfile({
  ...structuredClone(defaultVAInterface),
  config: originalConfig,
});
```

The thesis excerpt supplied by the owner describes editorial ILM tags mapped to ANEW mean VA coordinates. This repository preserves the owner's supplied mapping; it does not assert independent verification of every word against an external ANEW database. The original standalone demo's radius 0.15 / three-word rule is left unchanged in `/legacy/`; the upgraded interface follows the supplied thesis rule above.

所有者提供的论文段落将词语描述为 ILM 编辑标签，并按 ANEW 平均 VA 值定位。本项目完整保留所给映射，不宣称已逐词独立核验外部 ANEW 数据库。`/legacy/` 继续保留原单页的半径 0.15／最多 3 个词规则；新版按上述论文规则实现。

## Per-input UTC / 每次输入的 UTC 时间

New raw events contain `utcTimestamp` in ISO 8601 UTC alongside `mediaTime` (audio seconds), `monotonicTime` (browser milliseconds), `valence` and `arousal`. UTC uses the device clock; it is not a server-synchronized time or a substitute for audio position. Historical input without UTC remains unknown; importing it never stamps it with the import time.

新原始事件保存 ISO 8601 UTC 格式的 `utcTimestamp`，同时保留音频秒数 `mediaTime`、浏览器毫秒时钟 `monotonicTime` 及 VA 坐标。UTC 来自设备时钟，不表示服务器校时，也不替代音频位置。旧记录缺少 UTC 时保持未知，不用导入时间补造。

JSON retains original event UTC and the interface snapshot. Derived CSV uses `source_event_utc_timestamp`: repeated held rows reference the UTC of their original input; they are not new clicks or new observations.

JSON 保存原始 UTC 和界面快照。派生 CSV 的 `source_event_utc_timestamp` 指向原始输入时间；保持值重复引用同一事件，不意味着这些行是新的点击或新观测。
