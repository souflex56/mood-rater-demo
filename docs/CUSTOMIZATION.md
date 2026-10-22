# Customize Mood Rater / 自定义 Mood Rater

[Public demo / 公开演示](https://mood-rater-audio.baysky.chatgpt.site/annotate) · [English README](../README.md) · [中文说明](../README.zh-CN.md) · [VA details / VA 详细配置](VA-CUSTOMIZATION.md)

The default app is a local annotation demo. It needs no login, database initialization or researcher activation. Configuration changes affect your rebuilt deployment; the public customization page is a guide, not an editor of the hosted site.

默认应用是本地标注演示，无需登录、初始化数据库或激活研究者。修改配置后需重新构建自己的部署；公开自定义页面提供指南，不会在线修改托管网站。

## 1. Run the demo / 运行演示

With Node.js 22.13 or newer / 使用 Node.js 22.13 或更新版本：

```sh
npm run install:ci
npm run dev
```

Open the URL printed by the server, normally `http://127.0.0.1:5173`. Keep `config/project.json` set to `{"researchEnabled": false}` for the demo workflow. The optional service setup in [DEPLOYMENT.md](DEPLOYMENT.md) is only needed when operating research collection.

打开终端输出的网址，通常为 `http://127.0.0.1:5173`。演示流程保持 `config/project.json` 为 `{"researchEnabled": false}`；只有运行研究收集服务时，才需要 [DEPLOYMENT.md](DEPLOYMENT.md) 中的可选服务配置。

## 2. Choose an audio collection / 配置音频集合

[`config/audio-library.json`](../config/audio-library.json) defines the public clip picker. The supplied three examples are **Tone steps / 阶梯音**, **Soft pulses / 轻柔脉冲**, and **Layered tones / 叠层音**. They are synthetic sounds for learning the interaction, with no assigned emotional meaning or experimental validation.

[`config/audio-library.json`](../config/audio-library.json) 定义公开音频选择列表。内置的阶梯音、轻柔脉冲、叠层音是用于熟悉操作的合成音，不预设情绪含义，也未作实验效度验证。

Put audio files under `public/audio/` and use same-origin root-relative URLs. For example, `public/audio/my-clip.wav` is served as `/audio/my-clip.wav`:

将音频放在 `public/audio/`，使用同源、以 `/` 开头的路径。例如 `public/audio/my-clip.wav` 对应 `/audio/my-clip.wav`：

```json
{
  "version": 1,
  "clips": [
    {
      "id": "my-clip-v1",
      "title": { "en": "My audio clip", "zh-CN": "我的音频片段" },
      "url": "/audio/my-clip.wav",
      "mimeType": "audio/wav",
      "demoOnly": true
    }
  ]
}
```

- Keep IDs unique and stable for unchanged audio; use a new ID when replacing a stimulus. The manifest supports up to 50 clips.
- `demoOnly` identifies an example clip; it does not make the file private or establish that it is suitable for a study.
- `duration` (seconds) and `size` (bytes) are optional catalog hints. Actual media duration and bytes are checked on selection.
- Hosted clip URLs must be same-origin root-relative paths. External URLs, traversal and unknown configuration fields are rejected.
- Visitors may also select or drop up to 20 unique local files in the current tab. Each clip has its own session, draft and export; local files are not uploaded. Each file must be within 100 MiB and 30 minutes and playable by the browser.

文件 ID 应唯一：音频未变时保持稳定，替换刺激材料时使用新 ID。清单最多 50 个片段。`demoOnly` 用于标记示例，不会把文件设为私密，也不表示其适用于研究。`duration`（秒）和 `size`（字节）只是可选目录提示，选择时检查实际文件。清单只接受同源根路径，拒绝外部 URL、路径穿越及未知字段。

访客也可一次选择或拖入本地文件，当前标签页最多保留 20 个不同文件；每个片段独立保存会话、草稿和导出结果。本地音频不会上传，每个文件不超过 100 MiB、30 分钟，并需浏览器支持。

Files in `public/` are public on a hosted deployment. Add only material you can distribute there. Local selections stay in the browser; after refreshing, select the originals again to reconnect their drafts by SHA-256.

部署后的 `public/` 文件可被公开访问，请放入可公开分发的音频。本地选择保留在浏览器中，刷新后需重新选择原文件，由 SHA-256 校验并关联草稿。

## 3. Set guide words and the VA interface / 配置词表与 VA 界面

| File / 文件 | Setting / 配置内容 |
| --- | --- |
| [`config/emotion-tags.json`](../config/emotion-tags.json) | Tag identity, bilingual labels and normalized VA coordinates / 词 ID、中英标签与归一化 VA 坐标 |
| [`config/va-interface.json`](../config/va-interface.json) | Circle size, maximum tags, corner colors, axis names and endpoints / 圆圈、标签数、四角颜色、轴名与端点 |
| [`config/va-interface-original.json`](../config/va-interface-original.json) | Original-color preset / 原版配色预设 |

The default guide circle has diameter `0.125` of the square width, hence radius `0.0625`. Only up to five tags inside the circle are selected, nearest first. Tags appear inline below the plane, separated by commas and wrapping naturally on narrow screens. All captions sit outside the square: the X name with a right arrow below it, the Y name with an up arrow on the far left, and four quadrant captions above/below its corners. Quadrant captions combine the configured X/Y endpoint names; they are orientation labels, not additional emotion tags. Editing the endpoints updates these captions too.

默认引导圆直径为正方形宽度的 `0.125`，半径为 `0.0625`。按距离取圈内最多五个词，在平面下方用逗号分隔并列显示，窄屏自然换行。所有说明文字均在正方形外：X 轴名及向右箭头在底部，Y 轴名及向上箭头在最左侧，四象限说明位于四角的上方或下方。四象限文案由配置中的 X/Y 端点名组合生成，用于说明方向，不是新增的情绪标签；修改端点时也会同步变化。

Use a new interface ID/version when changing a study’s guidance. New sessions snapshot the full interface and tag list; old sessions retain their saved configuration. Axis-name changes affect labels only, not the 0–1 scale or exported field names. See [VA-CUSTOMIZATION.md](VA-CUSTOMIZATION.md) for the schema, validation limits, original-color preset and interpolation rules.

修改研究引导条件时应更新界面 ID／版本。新会话保存完整界面和词表快照，旧会话继续使用原配置。修改轴名只影响展示，不改变 0–1 量表或导出字段名。详细结构、校验、原版预设和插值规则见 [VA-CUSTOMIZATION.md](VA-CUSTOMIZATION.md)。

The homepage illustration follows `neutral → peaceful → tender → cheerful → enthusiastic → aggressive → anger` at their configured VA positions. It repeats every 13 seconds and fades its entire trail before restarting. The sequence and timing live in [`hero-trajectory-data.ts`](../app/components/hero-trajectory-data.ts); labels and coordinates use matching IDs from `emotion-tags.json`. If one of these IDs is omitted from a custom list, the illustration uses that word's original supplied coordinates and label. This is a decorative demonstration, not recorded annotation data.

首页示意动画按 `neutral → peaceful → tender → cheerful → enthusiastic → aggressive → anger` 的配置坐标移动，每 13 秒循环一次，重启前整条轨迹逐渐淡出。顺序和时间参数在 [`hero-trajectory-data.ts`](../app/components/hero-trajectory-data.ts)；文字和坐标优先采用 `emotion-tags.json` 中同 ID 的词。自定义词表缺少某个 ID 时，示意动画保留该词原始坐标与文案。它只用于演示，不是采集的标注数据。

## 4. Reuse the component / 复用组件

Supply independent, validated audio and interface profiles / 分别传入经过校验的音频清单与界面配置：

```tsx
import Annotator from '@/app/components/Annotator';
import audioManifest from '@/config/audio-library.json';
import { parseAudioLibrary } from '@/lib/audio-library';
import { defaultVAInterface, parseVAInterfaceProfile } from '@/lib/va-config';

const audioLibrary = parseAudioLibrary(audioManifest);
const interfaceProfile = parseVAInterfaceProfile(structuredClone(defaultVAInterface));

export default function MyAnnotationPage() {
  return <Annotator audioLibrary={audioLibrary} interfaceProfile={interfaceProfile} />;
}
```

Before publishing your changes, run / 发布修改前执行：

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Then inspect the actual page, select each configured clip, record a short trace and export a result. A successful build alone does not verify that a hosted audio file is available or playable.

随后在实际页面选择各片段、录制短轨迹并导出结果。构建成功本身不能证明托管音频可访问或可播放。

## Optional collection service / 可选收集服务

The repository retains research invitations, participant submissions and the owner dashboard, but the demo defaults to `researchEnabled: false`. Enabling collection in a separate deployment requires changing that flag, provisioning D1/R2 and configuring the authorized owner. See [deployment](DEPLOYMENT.md) and [API](API.md). None of this is required for local annotation and export.

仓库保留研究邀请、参与者提交和所有者后台，但演示默认 `researchEnabled: false`。独立部署收集服务时，需修改该开关，准备 D1/R2，并配置授权所有者，见[部署说明](DEPLOYMENT.md)和 [API](API.md)。本地标注与导出不需要这些步骤。

Keep the [research attribution and implementation limits](../README.md#research-reference) when adapting the tool. New audio collections, translations or interface designs are not automatically validated by the cited paper.

定制工具时请保留[研究出处及实现边界](../README.zh-CN.md#研究出处)。新增音频集合、翻译或界面设计并不自动获得所引论文的效度支持。
