# Documentation / 文档导航

[English overview](../README.md) | [中文概览](../README.zh-CN.md) | [Live demo / 在线体验](https://mood-rater-audio.baysky.chatgpt.site/annotate)

## Use the tool / 使用工具

| Guide / 指南 | Covers / 内容 |
| --- | --- |
| [User guide](USER-GUIDE.md) / [中文使用指南](USER-GUIDE.zh-CN.md) | Audio, recording, revisions, saving and export / 音频、标注、修改、保存与导出 |
| [Annotation protocol / 标注协议](PROTOCOL.md) | Rating questions, clocks, interval boundaries, missing values and data formats / 标注对象、时钟、区间边界、空缺与数据格式 |
| [Audio credits / 音频来源](../public/audio/README.md) | Recordings, licenses, excerpt intervals and reproducibility / 录音、许可、节选区间与复现 |
| [Research paper / 研究论文](https://ieeexplore.ieee.org/document/9468946) | Simin Yang and colleagues’ study informing the design / 工具设计所参考的 Simin Yang 等人的研究；[BibTeX](../public/citation.bib) |

## Adapt and deploy / 定制与部署

| Guide / 指南 | Covers / 内容 |
| --- | --- |
| [Customization / 自定义配置](CUSTOMIZATION.md) | Replace the audio library and configure your project / 替换音频库与项目配置 |
| [VA interface / 坐标图配置](VA-CUSTOMIZATION.md) | Emotion words, coordinates, axes, colors and session snapshots / 参考词、坐标、坐标轴、配色与会话快照 |
| [Deployment / 部署](DEPLOYMENT.md) | Local development, build, hosting and optional research setup / 本地开发、构建、托管与可选研究配置 |
| [Research API / 研究接口](API.md) | Invitations, participants, uploads and owner access / 邀请、参与者、上传与后台权限 |

## Find the code / 代码位置

| Path / 路径 | Responsibility / 职责 |
| --- | --- |
| `app/` | Pages and annotation workspace / 页面与标注工作区 |
| `lib/` | Annotation, export, persistence and optional server logic / 标注、导出、保存与可选后台逻辑 |
| `config/` | Editable audio and interface settings / 可编辑音频与界面配置 |
| `public/audio/` | Bundled recordings and attribution / 内置录音与署名 |
| `public/legacy/` | Original standalone interface / 原版独立界面 |
| `components/`, `hooks/` | Shared UI components and hooks / 通用组件 |
| `worker/`, `db/`, `drizzle/` | Worker entry point, storage schema and migrations / Worker 入口、数据库定义与迁移 |
| `scripts/`, `.openai/` | Build, local runtime and hosting integration / 构建、本地运行与托管集成 |
| `tests/` | Annotation, persistence, configuration and audio checks / 标注、保存、配置与音频检查 |

[Contribution guide / 贡献指南](../CONTRIBUTING.md) includes development commands and review expectations. [Third-party notices / 第三方许可说明](../THIRD_PARTY_NOTICES.md) identifies material with separate licenses.

## Maintainer records / 维护记录

These are dated implementation and verification records, not getting-started instructions. / 以下是特定版本的实现与验收记录，首次使用无需阅读。

- [Original baseline / 原版基线](BASELINE.md)
- [UI review / 界面审阅记录](UI-REVIEW.md)
- [Verification history / 验收记录](VERIFICATION.md)
- [Speech music-screening report / 语音配乐筛查](audio-music-screening-2026-10-28.json)
