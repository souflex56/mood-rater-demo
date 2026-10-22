# Development and deployment / 开发与部署

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [API contract](API.md) · [Verification record](VERIFICATION.md)

Expected public URL / 预期公开地址：[mood-rater-audio.baysky.chatgpt.site](https://mood-rater-audio.baysky.chatgpt.site).

This is the configured release target. A source commit, a successful build, a deployment request and a verified public release are separate states. Use the deployment result and live acceptance evidence to establish the current status; this document alone does not claim publication has succeeded.

这是预期发布目标。源码提交、构建通过、发起部署和线上验收分别是不同状态。请根据部署结果与真实线上证据确认当前状态；本文本身不宣称发布已经成功。

## Architecture / 架构

| Layer / 层 | Responsibility / 职责 |
| --- | --- |
| React + TypeScript + Vinext | Bilingual UI, audio controls, local annotation and application routes / 双语界面、播放、本地标注及应用路由 |
| Browser IndexedDB v2 | `sessions` drafts and `participations` credentials; no audio bytes / 草稿和研究参与凭据，不保存音频字节 |
| Sites identity gateway | ChatGPT login and trusted forwarded identity for the owner / 为所有者提供 ChatGPT 登录及可信身份 |
| Cloudflare Worker | Authorization, study workflow, resumable upload and export / 权限、研究流程、可续传上传及导出 |
| D1 binding `DB` | Studies, ordered assets, participants, upload/submission indexes and stats / 研究、音频顺序、参与者、上传和提交索引及统计 |
| R2 binding `BUCKET` | Research audio, upload chunks and immutable full annotation packages / 研究音频、分块上传和完整不可变标注包 |

The binding names and Sites project association are declared in `.openai/hosting.json`. `vite.config.ts` provides placeholder database/bucket settings for local emulation. Production resource IDs are supplied by the Sites deployment workflow; the placeholder D1 ID is not a production database.

绑定名称与 Sites 项目关联保存在 `.openai/hosting.json`。`vite.config.ts` 的占位数据库、存储桶配置用于本地模拟；生产资源由 Sites 部署流程注入，占位 D1 ID 不是生产数据库。

## Local development / 本地开发

Use Node.js 22.13+ and npm. From the upgrade checkout / 使用 Node.js 22.13+ 和 npm，在升级 checkout 中执行：

```sh
npm run install:ci
npm run build
```

The build generates `dist/server/wrangler.json` and `dist/client`. The Sites packaging helper adds hosting metadata and SQL migrations to `.openai` in the deployment archive. To initialize a **fresh local database once**, run:

构建生成 Worker 配置和静态资源。Sites 打包辅助程序再将托管元数据和 SQL 迁移放入发布包的 `.openai` 目录。**仅在首次初始化空的本地数据库时**执行：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
  d1 execute DB --local \
  --config dist/server/wrangler.json \
  --persist-to .wrangler/state \
  --file drizzle/0000_safe_rage.sql
```

The initial SQL creates tables; it is not an idempotent reset command. Do not reapply it to an initialized database. Keep `.wrangler/state` when restarting the server. For schema changes, generate and review new migration files with `npm run db:generate`, then apply only migrations not already applied.

初始 SQL 用于创建表，不是可重复执行的重置命令。已有数据库不应重复执行。重启时保留 `.wrangler/state`。修改结构时，可用 `npm run db:generate` 生成并审阅新迁移，再仅应用尚未执行的文件。

For the local researcher dashboard, create an untracked `.dev.vars` with this **development-only** setting, then start the dev server:

如需本地研究后台，在不跟踪的 `.dev.vars` 中加入以下**仅限开发环境**配置，再启动开发服务：

```dotenv
ADMIN_USER_ID=local_seedy
```

```sh
npm run dev
```

The portable profile defaults to `http://127.0.0.1:5173`. Open `/admin` and use its sign-in link; the local middleware supplies the test identity only on loopback in a development build. Ordinary participants use `/study/<invitation-token>` without signing in. `npm run start` previews the built Worker locally, but does not install the development sign-in middleware; use the dev server for local administrator integration tests.

portable 配置默认使用 `http://127.0.0.1:5173`。打开 `/admin` 并使用页面登录入口；本地中间件只在开发构建、回环地址中提供测试身份。普通参与者通过 `/study/<邀请 token>` 访问，无需登录。`npm run start` 可本地预览构建后的 Worker，但不包含开发登录中间件；本地后台集成测试应使用开发服务。

Never use `local_seedy` as a production owner. `.env.example` documents the real configuration keys without values; `.dev.vars`, `.env*`, local database files and build outputs are excluded from Git.

生产环境不得使用 `local_seedy` 作为所有者。`.env.example` 只记录配置项，不保存真实值；本地环境变量、数据库及构建目录不提交到 Git。

## Sites release and owner binding / Sites 发布与所有者绑定

1. **Prepare reviewed source.** Record the commit, run checks, and package source with the lockfile, app, worker, scripts, migrations and `.openai/hosting.json`. Exclude `.git`, `node_modules`, `.dev.vars`, local environment files, `.wrangler`, output archives and local execution state. / **准备已审阅源码。** 记录提交并执行检查，打包应用、Worker、脚本、锁文件、迁移与托管配置，排除凭据、Git 元数据、依赖、缓存和本地数据库。
2. **Deploy through the Sites workflow.** Use the existing project association rather than creating an unrelated site. The workflow installs/builds the source, allocates `DB` and `BUCKET`, applies packaged migrations, and provides the deployment outcome. Confirm the platform reports those resources and migrations ready. / **通过 Sites 发布。** 沿用已有项目关联；由平台安装构建、配置 D1/R2 并应用迁移。核对平台实际返回的资源与迁移结果。
3. **Configure the real owner before collecting research data.** Set either `ADMIN_USER_ID` to the verified site-scoped ChatGPT user ID, or `ADMIN_BOOTSTRAP_EMAIL` to the designated owner’s verified login email. These are server settings, not public client variables. / **采集研究数据前配置真实所有者。** 设置经过确认的网站用户 ID，或指定所有者的已验证登录邮箱；两者均属于服务端配置。
4. **Bind administration.** With the bootstrap-email route, the matching signed-in user opens `/admin` and selects “Activate my dashboard.” `POST /api/admin/bootstrap` atomically stores `settings.admin_user_id`; arbitrary first visitors cannot claim ownership. An explicitly configured `ADMIN_USER_ID` overrides the stored setting. Remove bootstrap configuration after binding if it is no longer needed. / **绑定后台。** 使用指定邮箱方式时，由匹配账号登录并激活；数据库原子写入唯一所有者，不能由任意首位访客认领。显式用户 ID 优先于数据库设置。
5. **Complete public acceptance.** Open a clean browser session, load the actual public assets, verify free annotation, and run a small researcher→participant→submission→export loop. Record the deployed source identity and URLs used. / **完成真实线上验收。** 使用干净浏览器核对资源及自由标注，再验证研究创建到参与、提交、后台导出的完整闭环，并记录线上源码身份与地址。

Production identity relies on the Sites gateway stripping untrusted forwarded identity headers and supplying authenticated ones. Do not expose the origin Worker as a separate public administration endpoint that trusts arbitrary incoming identity headers. Production secrets must not appear in the archive or repository.

生产身份依赖 Sites 网关移除不可信身份头并注入已验证身份。不要将信任任意传入身份头的源 Worker 另行公开为管理入口。真实凭据不应出现在源码包或仓库中。

This repository has no separate automatic GitHub-to-Sites release pipeline. Pushing a commit alone does not publish the website.

此仓库未配置独立的 GitHub 到 Sites 自动发布流水线，推送提交本身不会发布网站。

## Custom domain redirect / 自有域名跳转

The user’s domain has not been provided in this implementation. Once provided, configure its HTTPS redirect to the verified Sites address and preserve the **path and query string**. Test a direct study invitation, not only the homepage; `/study/<token>` must reach that same study after redirection. Keep research invitation credentials out of unrelated logs or analytics.

本次实现尚未提供自有域名。获得域名后，将其 HTTPS 跳转指向已验证的 Sites 地址，并保留**路径和查询参数**。除了首页，还应测试完整研究邀请，确保 `/study/<token>` 跳转后仍进入对应研究。避免将邀请凭据写入无关日志或分析服务。

## Validation and release / 验证与上线核对

Run the ordinary checks / 常规检查：

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

With local migrations and the development owner configured, the following scripts **create fixtures in the local D1/R2 emulator**. They explicitly require localhost; do not redirect them at a production environment:

配置本地迁移和开发所有者后，可执行以下脚本。它们会**在本地 D1/R2 模拟器创建测试数据**，并明确要求 localhost，不应改为指向生产环境：

```sh
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-smoke.mjs
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-recovery.mjs
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-capacity.mjs
```

The recovery fixture needs Python 3 and direct access to the local SQLite database to inject a temporary failure. The capacity fixture defaults to 1,000 small submissions, processed in batches of 10, plus one 30-minute/108,000-event package. It verifies pagination and exports. `MOOD_CAPACITY_COUNT` can reduce the count for a shorter check. Neither fixture demonstrates 1,000 simultaneous people, production throughput, cross-region availability or psychometric validity.

恢复脚本需要 Python 3 和本地 SQLite 访问，用于临时注入失败。容量脚本默认按每批 10 份处理 1,000 份小型提交，另验证一份 30 分钟、108,000 个事件的数据包，以及分页和导出。可通过 `MOOD_CAPACITY_COUNT` 缩小规模。上述测试均不证明 1,000 人同时在线、生产吞吐、跨地区可用性或心理测量有效性。

Browser acceptance should cover file loading, pointer/touch/keyboard input, seek/re-record/undo, non-grid gaps, reload and tab-close recovery, storage failure, submission retry and permissions. Check Chinese/English layouts on desktop and mobile. Record which browsers and networks were actually tested instead of assuming universal compatibility. The current evidence is maintained in [VERIFICATION.md](VERIFICATION.md).

浏览器验收应覆盖载入、鼠标／触控／键盘、跳转／重录／撤销、非网格缺口、刷新和关闭标签页恢复、保存失败、提交重试与权限，并检查桌面和手机上的中英界面。明确记录实际测试过的浏览器与网络，不假定所有环境均可用。当前证据见 [VERIFICATION.md](VERIFICATION.md)。

## Recovery and comparison / 恢复与对比

R2 storage and D1 indexes do not share a transaction. Submission completion stores and verifies the immutable R2 package first, then marks the D1 row ready. Retrying the same submission reconciles an R2 success followed by a D1 failure. Do not manually delete pending upload parts to “fix” a pending submission. Exported results and earlier submitted revisions remain available when a study is closed.

R2 与 D1 不共享事务。提交先保存并校验 R2 不可变数据包，再把 D1 索引标为完成。使用相同提交重试可修复 R2 已成功、D1 未更新的状态。不要为“修复待完成状态”而手动删除上传分块。研究关闭后，既有结果和历史提交仍可导出。

The original main baseline is commit `8e7ac2ffd99af7494a62193b25f434e36226d35d`; the upgrade is isolated on `codex/mood-rater-v2`. `/legacy/` serves the original UI, and root `mood-rater-final.html` remains the original standalone file. A source rollback and a database rollback are different operations: preserve production data and migration history when changing application versions. See [BASELINE.md](BASELINE.md).

原始 main 基线为提交 `8e7ac2ffd99af7494a62193b25f434e36226d35d`，升级独立保存在 `codex/mood-rater-v2`。`/legacy/` 提供原版界面，根目录 HTML 保留独立运行能力。源码回退与数据库回退是两回事；更换应用版本时，应保留生产数据与迁移历史。详见 [BASELINE.md](BASELINE.md)。
