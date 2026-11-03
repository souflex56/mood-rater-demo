# Self-hosting

[简体中文](DEPLOYMENT.zh-CN.md) | [Overview](../README.md) | [Customization](CUSTOMIZATION.md)

Run Mood Rater on a Node.js server or in a Docker container, using a host you choose. The public website is a demonstration, not a required hosting platform.

The default app supports annotation, local drafts, JSON/CSV export and the bundled examples without accounts, cloud storage or provider credentials. Research collection stays disabled in `config/project.json`.

## Choose a deployment

| Method | Requirements | Output to run |
| --- | --- | --- |
| Node.js | Node.js 22.13+; a server or managed Node host | The complete `dist/standalone/` directory |
| Docker | A Docker host; HTTPS proxy for public access | The image built from the root `Dockerfile` |
| Optional research backend | Cloudflare Workers, D1/R2 and your authentication proxy | [Separate adapter](../deploy/cloudflare/README.md) |

## Node.js

From a clean clone:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3000**. The build creates a standalone bundle with its runtime dependencies and public assets. You can copy the entire `dist/standalone/` directory to another Node.js host and run:

```sh
node server.js
```

The production process reads `PORT` (default `3000`) and `HOST` (default `0.0.0.0`). Configure those through your host or service manager. Vinext uses `HOST`, not `HOSTNAME`.

For a managed Node service, set the install command to `npm ci --include=dev`, the build command to `npm run build`, and the start command to `npm start`. Development dependencies are needed during the build. No environment file, database initialization or identity service is needed for the default app.

The server bundle is required; uploading only `dist/client/` or `public/` is not a supported deployment of this version.

## Docker

```sh
docker build -t mood-rater .
docker run --rm -p 127.0.0.1:3000:3000 mood-rater
```

Open **http://127.0.0.1:3000**. The multi-stage image runs the standalone bundle as an unprivileged user. Supply your own container name, domain and restart policy when operating it as a service. The image does not contain local environment files, hosting metadata, database state or the comparison worktree.

## Public access and saved data

Put your Node process or container behind your host’s HTTPS endpoint or reverse proxy. HTTPS is needed for secure browser APIs on public origins; loopback HTTP is suitable for local use. Route application paths and static assets to the same service.

Audio selected from a local file is not uploaded. Drafts live in the visitor’s browser, not on the server, and they do not contain local audio bytes. Export JSON before changing domain, browser or device; import it on the new origin and select the original audio again. Clearing browser storage deletes drafts. See the [user guide](USER-GUIDE.md).

You control access to your deployment. The default app does not create shared accounts, cross-device sync or a centralized submissions database.

## Optional collection service

The Worker backend is an explicit alternative build target, with D1/R2 storage and a trusted identity proxy chosen by the deployer. It is not enabled by the Node.js or Docker instructions above. Read the [Cloudflare adapter guide](../deploy/cloudflare/README.md) before enabling `researchEnabled`.

Other server backends require a storage and authentication adapter. The repository does not claim that its existing D1/R2 backend runs unchanged on every hosting provider.

## Verify your deployment

```sh
npm test
npm run typecheck
npm run build
npm run test:self-host
```

The self-hosting check copies the standalone bundle to a temporary directory, starts it without the source checkout, and checks pages, recordings, the initial interface and disabled collection endpoints. CI also builds and starts the Docker image. For UI changes, verify audio playback, annotation, re-recording, undo, reload and JSON/CSV export in English and Chinese.

For ordinary development, use `npm run dev` at **http://127.0.0.1:5173**. This is a development server; use the production bundle for hosting.

## Demonstration website

[The public demo](https://mood-rater-audio.baysky.chatgpt.site/annotate) demonstrates the tool. Its existing hosting integration is preserved on the [maintainer demo branch](https://github.com/souflex56/mood-rater-demo/tree/codex/hosted-demo). It is separate from the default self-hosting workflow on `main`. Updating this repository does not automatically republish that demonstration.
