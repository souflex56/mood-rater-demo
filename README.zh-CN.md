# Mood Rater · 音频时变情绪标注

**[公开首页](https://mood-rater-audio.baysky.chatgpt.site) · [打开标注演示](https://mood-rater-audio.baysky.chatgpt.site/annotate) · [自定义指南](docs/CUSTOMIZATION.md) · [English](README.md)**

Mood Rater 是用于记录音频情绪随时间变化的中英双语浏览器演示，基于 Simin Yang 的博士研究，为音频标注提供可复用的起点。**使用公开演示或运行默认本地应用，无需账号、数据库配置或研究者激活。**

升级在独立 Git worktree 的 `codex/mood-rater-v2` 分支开发。原始 `main` 基线和[原版界面](https://mood-rater-audio.baysky.chatgpt.site/legacy/)均保留，可随时对比。

## 开始体验

1. 打开[标注演示](https://mood-rater-audio.baysky.chatgpt.site/annotate)，选择内置示例或载入本地音频。可在选择列表中保留多个片段，每个片段分别标注。
2. 确定对象：**音频表达出的情绪**，或**聆听时我自身的感受**。开始记录后，该会话的标注对象固定。
3. 点击「开始标注」，随情绪变化移动圆点。横轴效价由左向右增加；纵轴唤醒度由下向上增加。均采用 **0–1**。
4. 暂停、定位并回听。「从此处重新标注」可替换区间；「撤销」会撤销最近一轮录制。
5. 导出 **JSON** 保留原始输入、编辑历史和界面配置；导出 **CSV** 获取派生时间序列。

支持鼠标、触屏、方向键和独立滑块，可随时切换中英界面。仅试听不会修改数据。每轮首次输入前为空缺；之后保持最近评分，直到下次输入或该轮结束。空缺不会自动补齐。时间边界详见[标注协议](docs/PROTOCOL.md)。

正方形 VA 平面采用柔和红、橙、蓝、绿配色，另存原始配色预设。**97 个引导词**完整保留所给坐标与翻译。以点击位置为圆心，**直径为平面宽度的 1/8**，选择圈内最多五个词，在平面下方按距离竖排；圈内没有词就不显示情绪词。新输入同时记录音频时间和设备 UTC。

## 本地运行

需要 Node.js **22.13 或更新版本**及 npm：

```sh
npm run install:ci
npm run dev
```

打开终端输出的网址，通常为 [localhost:5173](http://127.0.0.1:5173)。默认演示不需要环境变量文件、登录或初始化 D1。新版通过开发服务器运行；`mood-rater-final.html` 仍是原始独立 HTML。

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

技术栈为 React、TypeScript 和 Vinext。草稿存于浏览器 IndexedDB，默认流程不会向研究 API 上传音频或标注结果。

## 为自己的项目定制

阅读[完整自定义指南](docs/CUSTOMIZATION.md)，或先看[网页概览](https://mood-rater-audio.baysky.chatgpt.site/customize)。

| 文件 | 用途 |
| --- | --- |
| [`config/audio-library.json`](config/audio-library.json) | 音频集合、片段身份及中英文案 |
| [`config/emotion-tags.json`](config/emotion-tags.json) | 引导词、翻译及 VA 坐标 |
| [`config/va-interface.json`](config/va-interface.json) | 圆圈直径、标签数量、四角配色、X/Y 轴名及端点文案 |
| [`config/va-interface-original.json`](config/va-interface-original.json) | 完整保留原始配色的预设 |
| [`config/project.json`](config/project.json) | 默认关闭的可选研究收集功能开关 |

音频与界面配置独立于标注引擎。新会话保存界面快照，修改默认配置不会改变已有会话的引导。轴名只是展示文案，不交换横纵轴，也不更名导出的 `valence`、`arousal` 字段。详见 [VA 配置](docs/VA-CUSTOMIZATION.md)。

## 数据与恢复

| 项目 | 默认演示行为 |
| --- | --- |
| 内置集合 | 三段合成音示例；配置列表最多 50 个片段 |
| 本地集合 | 当前标签页最多 20 个不同文件 |
| 音频 | 每文件最长 30 分钟、最大 100 MiB；格式取决于浏览器支持 |
| 输入记录 | 指针移动最高 30 Hz；按下、抬起及键盘／滑块输入可额外产生事件 |
| 派生序列 | 10 Hz，阶梯保持；缺失值保留为空 |
| 草稿 | 浏览器 IndexedDB，可用空间取决于浏览器 |
| 导出 | 每会话 JSON 包含原始输入与配置；CSV 包含派生采样 |
| JSON 导入 | 界面支持最大 100 MiB，恢复前校验 |

本地音频文件本身不存入 IndexedDB。刷新后需重新选择原文件，系统校验保存的 SHA-256 指纹。清除网站存储会移除草稿，请及时导出重要内容。内置合成音仅供熟悉操作，不是经过验证的研究刺激材料或标准情绪示例。

导入自由标注 JSON 时分配新的本地 ID 并保留来源信息，避免旧导出覆盖新工作。旧版 JSON 保留原始观测与未知元数据；选择新音频不会反向确定旧记录的音频。本工具不包含自动情绪识别、诊断评分或论文统计分析流程。

## 可选研究收集

仓库保留研究邀请、参与者提交和所有者后台，供进阶部署使用。`config/project.json` 中 `researchEnabled` **默认为 `false`**，这些功能不属于普通演示流程。

如需运营收集服务，在自己的部署中启用开关，再按[部署及所有者配置](docs/DEPLOYMENT.md)和[研究 API](docs/API.md)准备 D1/R2 与授权所有者。后端本地流程、故障恢复及容量测试不代表生产可用性或 1,000 人同时在线认证。

## 研究出处

Simin Yang、Courtney N. Reed、Elaine Chew、Mathieu Barthet：**“Examining Emotion Perception Agreement in Live Music Performance.”** *IEEE Transactions on Affective Computing*，**14**(2)，1442–1460，2023。DOI：[10.1109/TAFFC.2021.3093787](https://doi.org/10.1109/TAFFC.2021.3093787)。论文于 2021 年提前在线发表。

[IEEE 页面](https://ieeexplore.ieee.org/document/9468946) · [作者预印本](https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf) · [BibTeX](public/citation.bib)

原研究使用带时间戳的点击标注，部分分析采用 1 Hz 阶梯重采样。连续拖动、通用音频、区间编辑和 10 Hz 导出属于工程扩展，既不是完整实验协议复现，也不能直接支持原论文的信度结论。引导词帮助定位所给 VA 空间，软件不会根据词语推断聆听者情绪。

## 与原版对比

- 打开 [`/legacy/`](https://mood-rater-audio.baysky.chatgpt.site/legacy/) 使用原版界面；其示例音频可能依赖第三方网址。
- `mood-rater-final.html` 保留为原始独立 HTML 文件。
- 阅读[原始中文说明](public/legacy/README.zh-CN.md)与[基线记录](docs/BASELINE.md)。
- 用 `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD` 查看已提交差异；`git status --short` 显示未提交内容。
