# Optional research backend / 可选研究后台

[Self-hosting](../../docs/DEPLOYMENT.md) | [中文自托管](../../docs/DEPLOYMENT.zh-CN.md) | [API](../../docs/API.md)

This is an optional **Cloudflare Workers + D1 + R2** adapter for invitations and centralized submissions. The default Node.js/Docker app does not load it. It has no dependency on the public demonstration host or its identity provider.

这是邀请与集中提交功能的可选 Cloudflare 适配。默认 Node.js/Docker 应用不加载它，也不依赖公开演示站的托管或登录服务。

## Configure storage / 配置存储

1. Create your own D1 database and R2 bucket. / 创建自己的 D1 数据库和 R2 存储桶。
2. Edit `deploy/cloudflare/wrangler.jsonc`: set your Worker name, D1 database ID/name and R2 bucket name. Keep bindings named `DB` and `BUCKET`. The zero database ID is a placeholder for local emulation. / 修改配置中的 Worker 名称、数据库 ID/名称和存储桶名称；绑定名保持 `DB`、`BUCKET`。全零 ID 仅供本地模拟。
3. Set `researchEnabled: true` in `config/project.json`. / 在项目配置中明确启用研究后台。

```sh
npm ci
npm run build:cloudflare
npx wrangler d1 migrations apply DB --local --config deploy/cloudflare/wrangler.jsonc
npm run dev:cloudflare
```

Apply pending migrations to your own remote database before publishing:

发布前，在自己的远端数据库应用尚未执行的迁移：

```sh
npx wrangler d1 migrations apply DB --remote --config deploy/cloudflare/wrangler.jsonc
npx wrangler deploy --config dist/server/wrangler.json
```

Authenticate Wrangler with your own Cloudflare account. These are optional provider commands, not steps required by the default app.

Wrangler 使用部署者自己的 Cloudflare 账号；默认应用无需执行这些平台命令。

## Identity adapter / 身份适配

The owner endpoint accepts identity only from a trusted authentication proxy. Use an identity service of your choice in front of the Worker; it must strip incoming client versions of the following headers and supply its own only after authenticating the visitor:

后台仅接受可信身份代理提供的所有者身份。身份服务由部署者自选，代理必须移除客户端传入的以下身份头，并在完成认证后自行注入：

| Header | Value |
| --- | --- |
| `X-Mood-Rater-Auth-Key` | Shared secret, at least 32 characters / 至少 32 字符的共享密钥 |
| `X-Mood-Rater-User-Id` | Stable authenticated user ID / 稳定的已认证用户 ID |
| `X-Mood-Rater-User-Email` | Verified email / 已验证邮箱 |
| `X-Mood-Rater-User-Name` | Optional display name / 可选显示名 |

Set `AUTH_PROXY_SECRET` as a Worker secret, using the same random value held by the proxy. It must never be exposed to browser code. Requests with a missing/wrong key, or an unconfigured/short secret, remain anonymous. Configure `ADMIN_USER_ID` for the owner, or `ADMIN_BOOTSTRAP_EMAIL` for the verified owner to activate administration. Other authenticated users do not gain owner access.

通过 Worker secret 设置 `AUTH_PROXY_SECRET`，与代理持有的随机密钥一致，不能暴露给浏览器。缺少或使用错误密钥、未配置或过短密钥时，均按匿名请求处理。所有者使用 `ADMIN_USER_ID` 固定指定，或通过 `ADMIN_BOOTSTRAP_EMAIL` 由匹配的已验证账号激活；其他已登录用户不会取得管理权限。

```sh
npx wrangler secret put AUTH_PROXY_SECRET --config deploy/cloudflare/wrangler.jsonc
npx wrangler secret put ADMIN_USER_ID --config deploy/cloudflare/wrangler.jsonc
```

`AUTH_SIGN_IN_PATH` and `AUTH_SIGN_OUT_PATH` may name same-origin proxy routes such as `/login` and `/logout`. They are optional links, not built-in login endpoints. Serve the proxy and Worker through HTTPS. Keep direct origin requests subject to the same secret validation.

可通过 `AUTH_SIGN_IN_PATH`、`AUTH_SIGN_OUT_PATH` 指定同源的代理登录与退出路径，如 `/login`、`/logout`；这些是可选链接，不是应用内置的登录接口。代理与 Worker 使用 HTTPS，直接访问源站时也需通过密钥校验。

## Local integration checks / 本地集成检查

Create an ignored `deploy/cloudflare/.dev.vars` with a **local test secret** and `ADMIN_USER_ID=local-research-owner`. Start `npm run dev:cloudflare` with local migrations applied. Then run the fixtures with the matching secret in `MOOD_TEST_PROXY_SECRET`:

在不跟踪的 `deploy/cloudflare/.dev.vars` 中设置本地测试用 `AUTH_PROXY_SECRET`，并设置 `ADMIN_USER_ID=local-research-owner`。完成本地迁移后启动 Worker，再使用匹配的 `MOOD_TEST_PROXY_SECRET` 运行：

```sh
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-smoke.mjs
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-recovery.mjs
MOOD_API_BASE=http://127.0.0.1:5173 node tests/backend-capacity.mjs
```

These fixtures only accept localhost and create local data. The recovery check requires Python 3. Capacity fixtures do not certify production throughput or simultaneous users. Before collecting data, verify your authentication proxy, owner permissions, consent, upload/retry and export workflow in your own environment. This repository supplies the adapter contract; it does not provision or certify a third-party identity service.

这些脚本仅接受 localhost，会创建本地数据；恢复检查需要 Python 3。容量样例不证明生产吞吐或同时在线人数。正式采集前，需在自己的环境验证身份代理、所有者权限、同意参与、上传/重试及导出流程。仓库提供适配协议，不代为配置或认证第三方身份服务。
