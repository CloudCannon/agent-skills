# Setup

Prerequisites, what `cloudcannon dev` does, and how to build a site for it.

## Prerequisites

| Need            | Install                     | Notes                                             |
| --------------- | --------------------------- | ------------------------------------------------- |
| Node            | —                           | 24+, as the CLI requires                          |
| CloudCannon CLI | `npm i -g @cloudcannon/cli` | `dev` needs **no** login — it never calls the API |

Where a global install is not possible, `npx @cloudcannon/cli dev` works, as does a local
install plus `PATH="$PWD/node_modules/.bin:$PATH"`.

## What `cloudcannon dev` does and does not do

**MUST build the site yourself, and rebuild it after every change.**
**Why:** `cloudcannon dev <dir>` serves `<dir>`. It never runs the SSG build and never runs
`.cloudcannon/prebuild` or `.cloudcannon/postbuild`. Serving a directory nothing is regenerating
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
whenever there is one.

There is no `paths.output` key in `cloudcannon.config.yml`; the output directory is not readable
from there.

## Rebuilding on change

Two routes, and the user picks:

| Route       | Run                                           | When                                                        |
| ----------- | --------------------------------------------- | ----------------------------------------------------------- |
| **Manual**  | The build command again, in a second terminal | Slow builds, or a postbuild that rewrites the whole output  |
| **Watched** | [`watch-build.mjs`](scripts/README.md)        | Editing in the browser, wanting the preview to follow along |

Either way the preview reloads itself once the output directory changes — see
[dev-server-api.md § Events](dev-server-api.md#events). Nothing needs to restart, and the manual
route needs no script at all.

**MUST NOT replace the build command with the SSG's own watch build.** Two reasons:

- A watch build never cleans its output directory, so a renamed or deleted page leaves its old
  file behind and the server keeps serving it.
- A watch build is one long-running process, so a site's hooks would run once at startup and
  never again — every later save would serve a build with no postbuild applied.

## The postbuild

CloudCannon runs `.cloudcannon/prebuild` and `.cloudcannon/postbuild` around `build_command`,
which is why `build_command` must not invoke them — see
[`cloudcannon-configuration` § The build command MUST NOT invoke a hook](../cloudcannon-configuration/build-hooks.md#the-build-command-must-not-invoke-a-hook).
Locally nothing else runs them, so compose them around the build:

```sh
bash .cloudcannon/prebuild && npm run build && bash .cloudcannon/postbuild
```

| Site                                      | Build the site with                        |
| ----------------------------------------- | ------------------------------------------ |
| No hooks                                  | The build command alone                    |
| A local-parity script that runs the hooks | That script, so nothing fires twice        |
| Hooks present, nothing runs them          | `prebuild && build && postbuild`, composed |

Check `package.json` for a parity script before composing — a site that has one has already
decided the order.

**MUST NOT assume a bare build command is enough on a site with a postbuild.**
**Why:** on a site whose postbuild rewrites the output rather than adding to it — moving the
build aside and regenerating it — a rebuild that skips the hook replaces the generated output
with the plain build, and everything the postbuild produced disappears.

`.cloudcannon/preinstall` is never run locally: it runs before dependencies install, which no
build sequence started here can reach. Say so rather than skipping it silently.

Every rebuild then costs a full hook chain, which is seconds to minutes where the postbuild
rewrites the whole output. On those sites, prefer the manual route.

For the Rosey pipeline — the most common postbuild of this shape — see
[make-site-multilingual](../make-site-multilingual/SKILL.md).

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
