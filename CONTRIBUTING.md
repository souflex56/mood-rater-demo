# Contributing

[中文](#中文) | [Project overview](README.md) | [Code map](docs/README.md#find-the-code--代码位置)

Reports, translations, documentation and focused code changes are welcome. For a larger change, open an issue first so the scope can be discussed. English and Chinese are both welcome.

## Develop locally

Fork and clone the repository, then use Node.js 22.13+ and npm:

```sh
npm run install:ci
npm run dev
```

Before opening a pull request, run the checks relevant to your change:

```sh
npm test
npm run typecheck
npm run build
```

Install **FFmpeg** when changing bundled audio. `npm test` skips the decoded-audio check if FFmpeg is unavailable; an audio change needs that check to run. The [audio credits](public/audio/README.md) describe reproduction and required attribution.

## Prepare a pull request

- Describe the problem, the resulting behavior and the checks you ran. Include screenshots for UI changes.
- Keep English and Chinese copy aligned. Do not alter the annotation question, timestamps, missing-data rules or exports as an incidental copy change. Consult the [protocol](docs/PROTOCOL.md) for data changes.
- Add regression coverage when behavior changes; documentation-only edits do not need new tests.
- Keep credentials, local databases, build output and participant data out of commits. Use a small synthetic example to reproduce data issues.

Project code uses the [MIT license](LICENSE). Preserve notices for third-party material and provide recording rights, source URLs and attribution with any new audio. GitHub checks test and build the app; they do not publish the website. Production publication is a separate maintainer action.

## 中文

欢迎反馈问题、改进翻译和文档，或提交范围明确的代码修改。较大的改动请先开 Issue 讨论；中英文均可。

Fork 并克隆仓库后，使用 Node.js 22.13+ 和 npm，依次执行上方的安装与开发命令。提交 PR 前，根据改动运行测试、类型检查与构建。修改内置音频时需要安装 **FFmpeg**，确保音频解码检查实际执行；缺少 FFmpeg 时该检查会跳过。

PR 请说明解决的问题、最终行为与验证结果；界面修改附截图。中英文案保持一致，文案修改不应顺带改变标注对象、时间戳、空缺规则和导出格式。行为变更需要相应回归验证，纯文档修改无需新增测试。

不要提交凭据、本地数据库、构建产物或参与者数据。复现数据问题请使用小型模拟样例。项目代码采用 MIT；第三方代码保留许可，新增录音需附来源、使用权限和署名。GitHub 检查只测试和构建，网站发布由维护者另行操作。
