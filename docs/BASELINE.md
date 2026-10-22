# Comparison baseline / 对比基线

Original commit: `8e7ac2ffd99af7494a62193b25f434e36226d35d`.

The original main checkout is unchanged. Upgrade branch: `codex/mood-rater-v2`.

- Visit `/legacy/` to run the byte-for-byte original interface.
- The root `mood-rater-final.html` remains the original standalone application.
- Compare code with `git diff 8e7ac2ffd99af7494a62193b25f434e36226d35d...HEAD`.
- Original documentation: `/legacy/README.zh-CN.md`.

原始示例音频依赖第三方网址。旧版与新版的浏览器数据不互通；新版可导入旧版 JSON。
