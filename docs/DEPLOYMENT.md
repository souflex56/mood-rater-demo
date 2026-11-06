# Self-hosting

[简体中文](DEPLOYMENT.zh-CN.md) | [Overview](../README.md) | [Customization](CUSTOMIZATION.md)

Run Mood Rater on a Node.js server or in a Docker container, using a host you choose. The public website is a demonstration, not a required hosting platform.

The default app supports annotation, local drafts, JSON/CSV export and the bundled examples without accounts, cloud storage or provider credentials. Research collection stays disabled in `config/project.json`.

## Choose a deployment

| Method | Requirements | Output to run |
| --- | --- | --- |
| Node.js | Node.js 22.13+; a server or managed Node host | The complete `dist/standalone/` directory |
| Docker | A Docker host; HTTPS proxy for public access | The image built from the root `Dockerfile` |
| Static hosting | GitHub Pages or another HTTPS static host; research disabled | The complete `dist/static/` directory |
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

The Node.js target requires its server bundle; uploading only `dist/client/` or `public/` is not a supported Node deployment. Use the separate static target below for file-only hosting.

## Static hosting / GitHub Pages

The demo can run entirely from static files. Playback, annotation, interval editing, browser drafts and JSON/CSV export stay in the browser. Research collection must remain disabled. The static build uses the installed Next.js exporter in a temporary copy, excludes server-only endpoints and writes only publishable files to `dist/static/`; Node.js and Cloudflare source routes remain available for their own builds.

```sh
npm ci --include=dev
npm run build:static
npm run test:static
```

Publish **only `dist/static/`**, not the source checkout or the rest of `dist/`. For a project URL such as `https://your-account.github.io/mood-rater-demo/`, build with `NEXT_PUBLIC_BASE_PATH=/mood-rater-demo npm run build:static`. For a custom domain served at `/`, leave the variable empty. This prefix changes links and audio requests without changing saved audio identities. Rebuild when changing between a repository path and a custom domain.

The `Deploy static demo` GitHub Actions workflow builds, verifies and publishes the static artifact on pushes to `main`; it can also be run manually. Enable **Settings → Pages → Source → GitHub Actions** before its first run. It obtains the root/subpath from Pages settings automatically and requires no hosting credentials. The `github-pages` environment must allow `main`. Under GitHub's current policy, Pages is free for public repositories within its usage limits; a separately purchased domain still has its own renewal cost.

Use the published HTTPS address for audio and annotation acceptance tests. GitHub Pages availability from mainland networks must be checked on visitors' actual networks; this build does not claim a particular regional availability. A changed origin does not automatically share browser drafts: export JSON from the old address before switching.

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

[The public demo](https://rater.zaoan.today/annotate/) uses the static GitHub Pages target. Once the static-hosting changes are merged into `main`, pushes to `main` publish it through `Deploy static demo`. The Node.js self-hosting target remains available separately. The earlier Sites integration is preserved on the [maintainer demo branch](https://github.com/souflex56/mood-rater-demo/tree/codex/hosted-demo).

The Pages custom domain is `rater.zaoan.today`. In Namecheap Advanced DNS, its record is **CNAME Record**, Host **`rater`**, Value **`souflex56.github.io`**, TTL **Automatic**. Replace the former Sites CNAME target rather than adding a second record for the same Host. Do not include a protocol or repository path in the Value. Set the custom domain in GitHub Pages before changing DNS, then rebuild so Pages uses the root path, wait for its certificate, and enable **Enforce HTTPS**. Custom Actions deployments do not require a `CNAME` file in the repository.
