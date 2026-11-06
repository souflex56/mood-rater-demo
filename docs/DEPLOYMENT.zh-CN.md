# 自托管部署

[English](DEPLOYMENT.md) | [项目概览](../README.zh-CN.md) | [自定义配置](CUSTOMIZATION.md)

你可以在自选的 Node.js 服务器或 Docker 环境运行 Mood Rater。公开网站仅供演示，不是使用者必须采用的托管平台。

默认应用支持标注、本地草稿、JSON/CSV 导出和内置录音，不需要账号、云端存储或平台凭据。`config/project.json` 中的研究采集保持关闭。

## 选择部署方式

| 方式 | 需要 | 运行内容 |
| --- | --- | --- |
| Node.js | Node.js 22.13+，自有服务器或托管 Node 服务 | 完整的 `dist/standalone/` 目录 |
| Docker | Docker 主机；公开访问时配 HTTPS 代理 | 根目录 `Dockerfile` 构建的镜像 |
| 静态托管 | GitHub Pages 等 HTTPS 静态托管；研究采集关闭 | 完整的 `dist/static/` 目录 |
| 可选研究后台 | Cloudflare Workers、D1/R2 和自选身份代理 | [独立适配说明](../deploy/cloudflare/README.md) |

## Node.js

克隆仓库后执行：

```sh
npm ci
npm run build
npm start
```

打开 **http://127.0.0.1:3000**。构建生成的独立运行包包含所需运行依赖和公开素材，也可以将完整的 `dist/standalone/` 目录复制到另一台 Node.js 主机，在该目录运行：

```sh
node server.js
```

生产进程读取 `PORT`（默认 `3000`）和 `HOST`（默认 `0.0.0.0`），可在托管平台或服务管理器中设置。Vinext 使用 `HOST`，不是 `HOSTNAME`。

在托管 Node 服务中，安装命令设为 `npm ci --include=dev`，构建命令为 `npm run build`，启动命令为 `npm start`。构建时需要开发依赖。默认应用不需要环境变量文件、数据库初始化或身份服务。

Node.js 部署需要完整的服务器运行包，不能只上传 `dist/client/` 或 `public/`。纯文件托管请使用下面独立的静态构建。

## 静态托管与 GitHub Pages

当前演示版可以完全由静态文件运行。音频播放、点击标注、区间修改、本地草稿和 JSON/CSV 导出仍在浏览器完成，研究采集需保持关闭。静态脚本在临时副本中调用已安装的 Next.js 导出器，排除需要服务器的接口，仅将可发布文件写入 `dist/static/`。Node.js 和 Cloudflare 构建仍使用原有源码路由。

```sh
npm ci --include=dev
npm run build:static
npm run test:static
```

只发布 **`dist/static/`**，不要上传源码或整个 `dist/`。若使用 `https://你的账号.github.io/mood-rater-demo/` 这样的项目地址，执行 `NEXT_PUBLIC_BASE_PATH=/mood-rater-demo npm run build:static`。自定义域名从根路径 `/` 提供服务时，将该变量留空。路径前缀会作用于页面链接和音频请求，不会改变草稿中的音频标识；在项目子路径与自定义域名之间切换时需重新构建。

仓库内的 `Deploy static demo` 工作流会在推送到 `main` 或初次适配分支 `codex/static-free-hosting` 时构建、检查并发布静态文件。首次运行前，在 **Settings → Pages → Source** 选择 **GitHub Actions**。工作流自动读取 Pages 的根路径或项目子路径，不需要额外托管密钥。`github-pages` 环境必须允许当前发布分支。按 GitHub 当前政策，公开仓库的 Pages 在使用额度内免费；自购域名仍有续费成本。

使用发布后的 HTTPS 地址验证音频和标注。大陆连通性需要在访问者实际网络上检查，静态改造不代表任何特定地区的访问承诺。更换访问地址前，先从旧地址导出 JSON；浏览器草稿不会自动跨站共享。

## Docker

```sh
docker build -t mood-rater .
docker run --rm -p 127.0.0.1:3000:3000 mood-rater
```

打开 **http://127.0.0.1:3000**。多阶段镜像以非特权用户运行独立构建包。长期运行时，请按自己的环境配置容器名称、域名及重启策略。镜像不包含本地环境变量文件、托管平台元数据、数据库状态或对比工作树。

## 公开访问与数据保存

通过托管平台的 HTTPS 入口或反向代理访问 Node 进程、容器。公开域名需要 HTTPS 才能正常使用安全上下文下的浏览器 API；本地可使用回环地址的 HTTP。应用路由和静态素材应交由同一个服务处理。

本地选择的音频不会上传，草稿保存在访问者的浏览器，不在服务器上，也不包含本地音频文件。更换域名、浏览器或设备前，请先导出 JSON；在新地址导入，并重新选择原音频。清除浏览器存储会删除草稿。详见[使用指南](USER-GUIDE.zh-CN.md)。

部署者自行决定网站的访问权限。默认应用不提供共享账号、跨设备同步或集中提交数据库。

## 可选研究采集

研究后台是明确选择后才启用的 Worker 构建目标，使用 D1/R2 存储，并由部署者配置可信身份代理。上述 Node.js 和 Docker 部署不会启用它。开启 `researchEnabled` 前，请先阅读 [Cloudflare 适配指南](../deploy/cloudflare/README.md)。

使用其他后端，需要适配存储与身份服务；现有 D1/R2 后台不能原样运行在所有托管平台上。

## 部署检查

```sh
npm test
npm run typecheck
npm run build
npm run test:self-host
```

自托管检查会将独立运行包复制到临时目录，在不依赖源码目录的情况下启动，并检查页面、录音、原始界面及研究采集关闭状态。CI 还会构建并启动 Docker 镜像。修改界面时，应在中英文下检查播放、标注、局部重录、撤销、刷新及 JSON/CSV 导出。

日常开发使用 `npm run dev`，地址为 **http://127.0.0.1:5173**；对外托管使用生产构建包。

## 公开演示

[公开演示站](https://rater.zaoan.today/annotate/)使用 GitHub Pages 静态构建。静态托管改动合并到 `main` 后，推送到 `main` 会通过 `Deploy static demo` 自动发布。Node.js 自托管方式仍可独立使用。原有 Sites 配置保存在[维护者演示分支](https://github.com/souflex56/mood-rater-demo/tree/codex/hosted-demo)。

Pages 自定义域名为 `rater.zaoan.today`。在 Namecheap Advanced DNS 中，该记录为 **CNAME Record**，Host 填 **`rater`**，Value 填 **`souflex56.github.io`**，TTL 选 **Automatic**。替换原有 Sites 的 CNAME 目标，不要给同一 Host 新增第二条记录；Value 不含协议或仓库路径。先在 GitHub Pages 设置域名，再修改 DNS 并重新构建，使 Pages 使用根路径；证书签发后开启 **Enforce HTTPS**。使用自定义 Actions 工作流发布时，仓库不需要 `CNAME` 文件。
