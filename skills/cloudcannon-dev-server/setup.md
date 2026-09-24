# Setup

Prerequisites, what `cloudcannon dev` does, and how to build a site for it.

## Prerequisites

| Need            | Install                     | Notes                                             |
| --------------- | --------------------------- | ------------------------------------------------- |
| Node            | —                           | 24+ (the current LTS)                             |
| CloudCannon CLI | `npm i -g @cloudcannon/cli` | `dev` needs **no** login — it never calls the API |

Where a global install is not possible, `npx @cloudcannon/cli dev` works, as does a local
install plus `PATH="$PWD/node_modules/.bin:$PATH"`.

## What `cloudcannon dev` does and does not do

**MUST build the site yourself, and rebuild it after every change.**
**Why:** `cloudcannon dev <dir>` serves `<dir>`. It never runs the SSG build or any step
around it. Serving a directory nothing is regenerating
gives the user an editor whose saves reach disk and then appear to vanish.

```sh
cloudcannon dev _site --port 10101
```

| Flag                             | Default     | Notes                                                           |
| -------------------------------- | ----------- | --------------------------------------------------------------- |
| `--host`                         | `127.0.0.1` | Bind address only                                               |
| `--port`                         | `10101`     | Fails if the port is taken; it never falls back to another      |
| `--live-sync` / `--no-live-sync` | on          | Push disk changes into the app over SSE                         |
| `--app-sync` / `--no-app-sync`   | on          | Accept writes from the app. With it off, every POST returns 403 |
| `--verbose`                      | off         | Log every request — method, path, status, duration              |

The positional output path must resolve **inside** the current directory, and the source root is
always the working directory — there is no `--source` flag. Run it from the site root.

There is no build flag. When one lands, it replaces everything below and
[scripts/](scripts/README.md) with it.

## Build commands

**MUST detect the build with the CLI rather than by looking for config files.**
**Why:** `cloudcannon configure detect-build-commands` is the product's own detection, it knows
every SSG the CLI knows, and it reports why it chose each answer. A second table of config
filenames maintained here would silently drift from it.

```sh
cloudcannon configure detect-build-commands
```

```json
{
  "build": [{ "value": "npm run build", "attribution": "found in your `package.json` file" }],
  "output": [{ "value": "dist", "attribution": "most common for Astro sites" }]
}
```

Take the first suggestion for each. Where the site disagrees, `cloudcannon configure detect-ssg`
shows the scores behind the guess — but the user's own `package.json` script is the better answer
whenever there is one. Build with that script, not the bare SSG command: generators and
post-build steps live in it, so it matches what CloudCannon runs. See
[`cloudcannon-configuration` § Build and install commands](../cloudcannon-configuration/build-commands.md).

If the site has `.cloudcannon/prebuild` or `postbuild` files, a local build skips them. Tell the
user, and see [build-commands.md § `.cloudcannon/` hook files](../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files)
for moving them into the build script.

There is no `paths.output` key in `cloudcannon.config.yml`; the output directory is not readable
from there.

## Rebuilding on change

Two routes, and the user picks:

| Route       | Run                                           | When                                                        |
| ----------- | --------------------------------------------- | ----------------------------------------------------------- |
| **Manual**  | The build command again, in a second terminal | Slow builds, or a post-build step that rewrites the output  |
| **Watched** | [`watch-build.mjs`](scripts/README.md)        | Editing in the browser, wanting the preview to follow along |

Either way the preview reloads itself once the output directory changes — see
[dev-server-api.md § Events](dev-server-api.md#events). Nothing needs to restart, and the manual
route needs no script at all.

Every rebuild costs the whole build script, which is seconds to minutes when a post-build step
rewrites the whole output — the Rosey pipeline from
[make-site-multilingual](../make-site-multilingual/SKILL.md), say. On those sites, prefer the
manual route.

**MUST NOT replace the build command with the SSG's own watch build.** Two reasons:

- A watch build never cleans its output directory, so a renamed or deleted page leaves its old
  file behind and the server keeps serving it.
- A watch build runs only the SSG, so every step the `build` script chains around it — search
  indexing, output rewriting — never runs on later saves.

## Ports

| Port    | What                                                                                 |
| ------- | ------------------------------------------------------------------------------------ |
| `10101` | Dev server: the CMS app, the `/__api` surface, and the built site, all on one origin |

Override with `--port`.

**MUST NOT treat a healthy response on the port as proof the site is yours.**
**Why:** `/__api/details` answers with `siteName` — the project directory's basename, titleized —
and a relative `outputDir`. Two projects can answer identically, and a whole session can be spent
measuring someone else's site. Start the server on a port you chose, and if it fails because the
port is taken, move to another one rather than stopping a server you did not start.

## Running in a container or sandbox

- **Nothing can be installed globally.** Install the CLI anywhere and run it through `npx`, or
  prepend `node_modules/.bin` to `PATH`.
- **`watch-build.mjs` uses recursive `fs.watch`.** On Linux that consumes inotify watches. It
  watches source directories only, not `node_modules`, but a low `fs.inotify.max_user_watches`
  can still bite — use the manual route there.
