# Build and Test (Hugo)

Phase 5: prove the migrated site builds the same pages as before, and hand off. The generic handoff rules are in [../handoff.md](../handoff.md).

## Build verification checklist

- [ ] **Clean build.** Delete `public/` and `resources/_gen/`, then run the full build command (`npm run build`, or `hugo`). It completes with no errors and no new warnings.
- [ ] **Warnings sorted by owner.** `hugo --logLevel info` names the file behind each warning. Warnings from module or `_vendor/` paths are the theme's; fix only the project's.
- [ ] **Fresh-machine build (vendored module sites).** Build a fresh copy with no Go on `PATH` and an empty `HUGO_CACHEDIR` (`HUGO_CACHEDIR=$(mktemp -d)`). It builds the same pages.
- [ ] **Page parity.** Compare page lists against the parity baseline from [audit.md § 1](audit.md#1-hugo-version-modules-and-themes): `diff <(cd public && find . -name '*.html' | sort) <(cd "$BASELINE" && find . -name '*.html' | sort)`. If the baseline was never saved, build it now: `git archive <pre-migration commit> | tar -x -C "$(mktemp -d)"`, apply only the Hugo upgrade fixes, make `node_modules` available (install, or symlink the project's), and build. Don't use a fixed `/tmp` path — concurrent runs overwrite each other.
- [ ] **Text and image parity.** For each page, compare visible text and `<img` counts between the build and the baseline. A drop is content lost in a move to front matter or a partial.
- [ ] **Regions are in the output.** `grep -rhoE 'data-editable="?[a-z-]+' public --include='*.html' | sort | uniq -c` shows each region type you wired, and `data-component=` appears on page-builder items. Keep the grep to HTML — the stylesheet and `live-editing.js` contain the same strings — and keep the optional quote: `--minify` strips attribute quotes. Quote the `--include` glob so zsh doesn't expand it.
- [ ] **Images resolve on the preview domain.** `grep -rhoE 'src="?https?://[^/" >]+' public --include='*.html' | sort -u` lists no host other than real third-party ones.
      **Why:** a theme that renders images with `.Permalink` makes them absolute to `baseURL`. With a placeholder `baseURL`, every image breaks in the editor while CSS still loads, and `<img>` counts don't notice.
- [ ] **Schema round-trip.** For each collection, copy every content file into a scratch build with its schema's keys filled in with their defaults, and compare the list pages against the normal build. A post that disappears is a template comparing a key as a string — see [configuration-gotchas.md § The first edit writes every schema key](../../cloudcannon-configuration/configuration-gotchas.md#the-first-edit-writes-every-schema-key).
- [ ] **Editor-mode build.** Run the `ENV_CLIENT` build from [visual-editing.md § Local checks](../../cloudcannon-visual-editing/hugo/visual-editing.md#local-checks) and confirm no image count drops.
- [ ] **Renderer published.** `public/_cloudcannon/` contains `hugo_renderer.wasm.<hash>.gz`, `hugo-worker.<hash>.js` and `live-editing.<hash>.js`.
- [ ] **Config validates.** `npx @cloudcannon/cli validate` passes.
- [ ] **Search index.** If the site uses Pagefind, the build command runs it after Hugo and `public/pagefind/` exists.

Use `grep -o … | wc -l`, not `grep -c`, when counting in minified HTML — `--minify` puts a page on one line.

## CloudCannon build command

| Site has                                        | `build.build_command`                                                           | `build.install_command` |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| No `package.json`                               | `hugo`                                                                          | —                       |
| `package.json` with a production `build` script | `npm run build`                                                                 | `npm i`                 |
| `package.json` without a `build` script         | `hugo`                                                                          | `npm i`                 |
| A module-cache dependency the editor needs      | `hugo mod vendor && <the above>` (or the vendor step in the npm `build` script) | as above                |
| An npm Hugo (`hugo-extended`, `hugo-bin`)       | `npm run build` — the npm Hugo runs, whatever `hugo_version` says               | `npm i`                 |

- **Build** production with the site's real `baseURL`. Ignore the `hugo -b /` the CLI suggests: that's for the local dev server only. Absolute URLs point at `baseURL` even in the editor, so how well editing works depends on the theme using relative URLs — the image check above catches the worst case.
- **Vendor** in the build command when the editor needs a module-cache dependency ([Themes, modules and vendoring](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#themes-modules-and-vendoring)), and gitignore `_vendor/`. Committing `_vendor/` instead also works, and removes the build's need for Go.
- **Put** every step in the build command — see [build-commands.md](../../cloudcannon-configuration/build-commands.md). Keep `HUGO_CACHEDIR` and the `resources/` preserved path from the CLI baseline so Hugo modules and processed images are cached between builds.

## Common issues

### The build fails on CloudCannon but not locally

Check `build.hugo_version` in `.cloudcannon/initial-site-settings.json` — without it (or with the ignored `hugoVersion` spelling) CloudCannon builds with its default Hugo. For an existing site, change it in **Site Settings > Builds**.

### The build fails fetching the renderer

The module is pinned to a commit rather than a release tag — see [troubleshooting.md](../../cloudcannon-visual-editing/hugo/troubleshooting.md#build).

### Stale bundles in `public/`

Hugo never deletes old fingerprinted files from `public/`, so a local `public/_cloudcannon/` fills up with old `live-editing.*.js` bundles. Build into a clean directory before inspecting it; CloudCannon's builds start clean.

### `hugo mod` fails on CloudCannon

`hugo mod` commands (`vendor`, `get`) need Go on the build image. A committed `_vendor/` removes that dependency. Keep the `go` directive in `go.mod` at or below the image's Go — a newer one still builds, but downloads a Go toolchain first.
