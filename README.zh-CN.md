# Mood Rater · 音频时变情绪标注

[English](README.md) · [标注协议](docs/PROTOCOL.md) · [部署说明](docs/DEPLOYMENT.md) · [研究 API](docs/API.md)

Mood Rater 用于记录聆听音频时，感知情绪或自身感受如何随时间变化。新版在Simin Yang博士研究实现的基础上，增加中英界面、连续效价—唤醒度标注、本地草稿、区间重录和研究邀请流程。

升级在独立 Git worktree 的 `codex/mood-rater-v2` 分支开发，原始 `main` 基线保留。公开网站：[mood-rater-audio.baysky.chatgpt.site](https://mood-rater-audio.baysky.chatgpt.site)。2026-10-22 已验证公开页面与线上标注。正式采集研究数据前，所有者仍需完成首次 ChatGPT 登录及后台激活。

## 可以做什么

- **自由标注：** 载入本地音频，选择感知情绪或自身感受，试听、录制、修改，再导出 JSON 或 CSV。自由模式的音频和标注不会上传至研究 API。
- **参与研究：** 打开邀请链接，阅读说明并同意参与，对指定音频标注，最后主动提交。参与者无需注册账号。
- **管理研究：** 指定所有者通过 ChatGPT 登录，编辑双语说明、上传和排列音频、发布邀请、新建研究版本并导出结果。
- **选择适合的操作方式：** 支持鼠标、触屏、方向键和独立滑块。界面首次跟随浏览器语言，之后可随时切换。
- **先做短暂练习：** 20 秒合成音示例与正式草稿、提交分开，仅用于熟悉操作，不是经过验证的研究刺激材料。

## 开始标注

1. 打开 `/annotate`；也可通过 `/annotate?demo=1` 进入练习。
2. 选择音频，明确标注对象：**音频表达出的情绪**，或**聆听时我自身的感受**。开始记录后，该会话的标注对象固定；研究任务由研究者统一设置。
3. 点击「开始标注」并移动圆点。横轴效价从左侧不愉悦到右侧愉悦；纵轴唤醒度从下方低唤醒到上方高唤醒。两个维度均采用 **0–1**。
4. 暂停、定位并回听。点击「从此处重新标注」可替换一个区间；「撤销」会撤销最近一轮录制。
5. 检查轨迹、缺口和覆盖率，再导出。研究参与者可点击「提交标注」；只有服务器确认后，才表示结果已经收到。

仅试听不会修改数据。每轮首次输入前为空缺；输入后保持最近评分，直到下次输入或该轮结束。新一轮没有输入的部分也会用空缺覆盖原记录。具体时间边界见[完整协议](docs/PROTOCOL.md)。

## 本地开发

需要 Node.js **22.13 或更新版本**与 npm。安装锁定依赖：

```sh
npm run install:ci
```

首次使用新 checkout 时，先按[本地数据库初始化](docs/DEPLOYMENT.md#local-development--本地开发)操作，然后启动：

```sh
npm run dev
```

本地 portable 配置默认使用 [localhost:5173](http://127.0.0.1:5173)。如果配置不同，以终端实际输出地址为准。新版需要服务端运行；保留的旧版 HTML 仍可独立打开。

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

技术栈为 React、TypeScript 和 Vinext，通过 Sites 使用 Cloudflare Workers、D1 和 R2。浏览器 IndexedDB 保存草稿与研究参与凭据；原始标注采样点不会逐行写入 D1。

## 数据、限制与恢复

| 项目 | 当前实现 |
| --- | --- |
| 音频 | 每个文件最长 30 分钟、最大 100 MiB；格式取决于浏览器支持 |
| 研究素材 | 每项研究最多 100 个音频 |
| 输入记录 | 指针移动最高按 30 Hz 采集；按下、抬起及明确的键盘／滑块操作可额外产生事件 |
| 派生序列 | 10 Hz，阶梯保持；缺失值保留为空 |
| 研究提交 | 压缩排版后的 JSON 最大 32 MiB，总原始事件数最多 150,000 |
| JSON 导入 | 界面允许最大 100 MiB，恢复前校验结构 |
| 本地保存 | 浏览器 IndexedDB，可用性和容量取决于浏览器 |
| 结果导出 | 单份 JSON／CSV，或按条件批量导出 JSONL／CSV；保留此前提交版本 |

刷新后，需要重新选择原本地音频，系统会校验 SHA-256 指纹。音频文件本身不会保存到 IndexedDB。研究参与凭据保存在同一浏览器、同一设备，关闭标签页后仍可恢复研究草稿。清除网站存储会同时移除草稿和凭据，请及时导出重要内容。

导入自由标注 JSON 时会分配新的本地会话 ID，并保留来源会话信息，避免旧导出覆盖较新的草稿。导入旧版 JSON 会保留原始点击记录和源数据；未知的音频身份、时长、标注对象仍标为未知。选择新音频不会反向证明它就是旧记录使用的音频。

持有研究邀请链接的人可访问对应音频；结果仅限指定研究所有者访问。研究者应为每项研究提供合适的参与说明、保留安排和联系方式。本工具不包含自动情绪识别、诊断评分、服务器转码或论文统计分析流程。

## 研究出处

Simin Yang、Courtney N. Reed、Elaine Chew、Mathieu Barthet：**“Examining Emotion Perception Agreement in Live Music Performance.”** *IEEE Transactions on Affective Computing*，**14**(2)，1442–1460，2023。DOI：[10.1109/TAFFC.2021.3093787](https://doi.org/10.1109/TAFFC.2021.3093787)。论文于 2021 年提前在线发表。

[IEEE 页面](https://ieeexplore.ieee.org/document/9468946) · [作者预印本](https://siminyang6.wordpress.com/wp-content/uploads/2021/07/journalpaper_tac_preprint_0628.pdf) · [BibTeX](public/citation.bib)

原研究使用带时间戳的点击标注，部分分析采用 1 Hz 阶梯重采样。新版的连续拖动、通用音频、区间编辑和 10 Hz 导出属于工程扩展，既不是完整实验协议的复现，也不能直接支持原论文的信度结论。可选情绪词及中文翻译只作方位提示，并非经过独立验证的量表。

## 与原版对比

- 打开 `/legacy/` 使用保留的原版界面；旧版示例音频可能依赖第三方网址。
- `mood-rater-final.html` 保持为原始独立 HTML 文件。
- 阅读[原始中文说明](public/legacy/README.zh-CN.md)与[对比基线记录](docs/BASELINE.md)。
- 用 `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD` 查看已提交的升级差异；用 `git status --short` 识别尚未提交的内容。

仓库包含标注协议与输入校验测试，以及本地后端流程、故障恢复和容量测试。容量脚本覆盖一份 30 分钟、108,000 个事件的会话，以及按每批 10 份处理的 1,000 份小型提交。这是本地功能容量检查，**不代表通过 1,000 人同时在线或生产可用性认证**。详见[验证与上线核对](docs/DEPLOYMENT.md#validation-and-release--验证与上线核对)。
