# 自托管部署

[English](DEPLOYMENT.md) | [项目概览](../README.zh-CN.md) | [自定义配置](CUSTOMIZATION.md)

你可以在自选的 Node.js 服务器或 Docker 环境运行 Mood Rater。公开网站仅供演示，不是使用者必须采用的托管平台。

默认应用支持标注、本地草稿、JSON/CSV 导出和内置录音，不需要账号、云端存储或平台凭据。`config/project.json` 中的研究采集保持关闭。

## 选择部署方式

| 方式 | 需要 | 运行内容 |
| --- | --- | --- |
| Node.js | Node.js 22.13+，自有服务器或托管 Node 服务 | 完整的 `dist/standalone/` 目录 |
| Docker | Docker 主机；公开访问时配 HTTPS 代理 | 根目录 `Dockerfile` 构建的镜像 |
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

部署时需要完整的服务器运行包，不能只上传 `dist/client/` 或 `public/`。

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

[公开演示站](https://mood-rater-audio.baysky.chatgpt.site/annotate)仅展示工具功能。已有演示托管配置保存在[维护者演示分支](https://github.com/souflex56/mood-rater-demo/tree/codex/hosted-demo)，与 `main` 的默认自托管流程分开维护。更新本仓库不会自动重新发布该演示站。
