# Comparison baseline / 对比基线

Original commit: `8e7ac2ffd99af7494a62193b25f434e36226d35d`.

`main` contains the current application. The original version remains recoverable at the commit above and in `public/legacy/`.

- Visit `/legacy/` to run the byte-for-byte original interface.
- Open `public/legacy/index.html` directly for the original standalone application. Its bytes match the baseline `mood-rater-final.html`; duplicate legacy files have been removed from the repository root.
- Compare code with `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD`.
- Original documentation: `/legacy/README.zh-CN.md`.

原始示例音频依赖第三方网址。旧版与新版的浏览器数据不互通；新版可导入旧版 JSON。
