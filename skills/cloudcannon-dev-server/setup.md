# Setup

Prerequisites, what `cloudcannon dev` does, and how to build and watch a site for it.

## Prerequisites

| Need            | Install                     | Notes                                             |
| --------------- | --------------------------- | ------------------------------------------------- |
| Node            | —                           | 24+, as the CLI requires                          |
| CloudCannon CLI | `npm i -g @cloudcannon/cli` | `dev` needs **no** login — it never calls the API |

Where a global install is not possible, `npx @cloudcannon/cli dev` works, as does a local
install plus `PATH="$PWD/node_modules/.bin:$PATH"`.

## What `cloudcannon dev` does and does not do

**MUST build the site, and keep rebuilding it, yourself.**
**Why:** `cloudcannon dev <dir>` serves `<dir>`. It never runs the SSG build and never runs
`.cloudcannon/postbuild`. Serving a directory nothing is regenerating gives the user an editor
whose saves reach disk and then appear to vanish.

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

## Build and watch commands

[cc-serve.sh](scripts/cc-serve.sh) does all of it: resolves the output directory and build
command, builds, starts the rebuild watcher, then serves.

```sh
bash scripts/cc-serve.sh /path/to/site --port 10101
```

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

`cc-serve.sh` takes the first suggestion for each. Override either where it guesses wrong:

```sh
bash scripts/cc-serve.sh . --output build --build-cmd "jekyll build"
```

**MUST NOT look for the output directory in `cloudcannon.config.yml`.**
**Why:** `paths` configures asset directories only, and has seven valid keys — `static`,
`uploads`, `uploads_filename`, `dam_uploads`, `dam_uploads_filename`, `dam_static`,
`uploads_use_relative_path`. There is no `paths.output`. A config that sets one is not read by
anything. See [cloudcannon-configuration](../cloudcannon-configuration/SKILL.md).

### Rebuilding on change

`cc-serve.sh` rebuilds by re-running the whole build command through
[watch-build.mjs](scripts/watch-build.mjs). That is slower per change than an SSG's native watch
mode, and it is the default because it is the only mechanism every SSG has — Astro, for one, has
no `astro build --watch`.

Where the SSG does have a native watch build, `--watch-cmd` is faster than rebuilding from
scratch:

| SSG      | Native watch build           |
| -------- | ---------------------------- |
| Eleventy | `npx @11ty/eleventy --watch` |
| Hugo     | `hugo --watch`               |
| Jekyll   | `jekyll build --watch`       |
| Astro    | None — use the default       |

```sh
bash scripts/cc-serve.sh . --watch-cmd "npx @11ty/eleventy --watch"
```

**A watch build never cleans the output directory.** A page that is renamed or deleted leaves its
old file behind, and the server keeps serving it. Restart with a fresh build to clear them.

## The postbuild

**MUST NOT assume the watcher runs `.cloudcannon/postbuild`.**
**Why:** it re-runs the build command only. On a site whose postbuild rewrites the output rather
than adding to it — moving the build aside and regenerating it — the first rebuild after a save
replaces the generated output with the plain build, and everything the postbuild produced
disappears.

`cc-serve.sh` runs the postbuild once at startup, then prints a warning naming this. To keep it
inside the loop, put it in the build command:

```sh
bash scripts/cc-serve.sh . --build-cmd "npm run build && bash .cloudcannon/postbuild"
```

That makes every save cost a full postbuild chain, which is seconds to minutes where the
postbuild rewrites the whole output. It is the right trade only when the user is editing
something the postbuild transforms.

**MUST run the postbuild in a subshell.**
**Why:** CloudCannon _sources_ that file in production, so options it sets leak into the caller —
a top-level `set -euo pipefail` inside it kills the run. `cc-serve.sh` already does this; a
hand-rolled equivalent must too.

For the Rosey pipeline — the most common postbuild of this shape — see
[make-site-multilingual](../make-site-multilingual/SKILL.md).

## Ports

| Port    | What                                                                                 |
| ------- | ------------------------------------------------------------------------------------ |
| `10101` | Dev server: the CMS app, the `/__api` surface, and the built site, all on one origin |

Override with `--port`, or set `CC_DEV_PORT`.

**MUST NOT treat a healthy response on the port as proof the site is yours.**
**Why:** `/__api/details` answers with `siteName` — the project directory's basename, titleized —
and a relative `outputDir`. Two projects can answer identically, and a whole session can be spent
measuring someone else's site. `cc-serve.sh` writes a token into its own output directory and
reads it back through `/__output/` instead, and refuses the port rather than stopping a server it
did not start.

## Running in a container or sandbox

- **Nothing can be installed globally.** Install the CLI anywhere and run it through `npx`, or
  prepend `node_modules/.bin` to `PATH` — `cc-serve.sh` calls `cloudcannon dev`, so it has to be
  resolvable.
- **The watcher uses recursive `fs.watch`.** On Linux this consumes inotify watches; a large
  `node_modules` in the watched tree is already excluded, but a low `fs.inotify.max_user_watches`
  will still bite.
