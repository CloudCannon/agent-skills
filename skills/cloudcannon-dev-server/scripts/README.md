# Scripts

One launcher and the watcher it starts. The Node script is ESM with no dependencies, and nothing
here opens a browser.

Run them from this directory, or with an absolute path.

## `cc-serve.sh`

Starts the local editing loop: build once, run `.cloudcannon/postbuild` if present, start the
rebuild watcher, serve the output under `cloudcannon dev`. Ctrl-C stops the watcher and the
server together.

```sh
bash cc-serve.sh /path/to/site --port 10101
```

| Flag             | Meaning                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `--output`       | Output directory, for an SSG whose layout is not detected                |
| `--build-cmd`    | Command that builds the site, for an SSG whose build is not detected     |
| `--watch-cmd`    | Replace the default watcher with the SSG's own watch build               |
| `--port`         | Dev server port (default 10101, or `CC_DEV_PORT`)                        |
| `--no-build`     | Skip the initial build                                                   |
| `--no-postbuild` | Skip `.cloudcannon/postbuild`                                            |
| `--no-watch`     | Serve without rebuilding — the editor's saves will not reach the preview |

It gets the build command and output directory from
`cloudcannon configure detect-build-commands`, taking the first suggestion for each, so detection
covers every SSG the CLI knows and never drifts from it. It does **not** read the output directory
from `cloudcannon.config.yml`: there is no `paths.output` key.

**Before it trusts a port**, it writes a token into its own output directory and reads it back
through `/__output/`. A matching token means this site is already served, and it reuses it; a
mismatch means another project holds the port, and it refuses rather than stopping a server it
did not start.

Runs the postbuild in a subshell — CloudCannon sources that file in production, so shell options
set inside it would otherwise leak into the caller.

## `watch-build.mjs`

Re-runs the build command whenever a source file changes. `cc-serve.sh` starts this; run it
directly only to rebuild against a server started some other way.

```sh
node watch-build.mjs --build-cmd "npm run build" --output _site
```

| Flag          | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `--build-cmd` | Shell command that builds the site (required)               |
| `--output`    | Output directory to ignore, relative to `--root` (required) |
| `--root`      | Directory to watch (default: cwd)                           |
| `--debounce`  | Quiet period before rebuilding, in ms (default 300)         |

It ignores the output directory, `node_modules`, `.git`, `.cache`, `.astro` and `.netlify`.
Ignoring the output directory is what stops the build's own writes retriggering it.

A change arriving mid-build queues one more pass rather than being dropped, so an edit saved
while a build is running is never missed.

## `lib/`

| File       | Purpose                                                         |
| ---------- | --------------------------------------------------------------- |
| `args.mjs` | Flag parsing (repeats accumulate into arrays), `--help`, output |
