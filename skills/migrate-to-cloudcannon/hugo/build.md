# Build and Test (Hugo)

Phase 5: prove the migrated site builds the same pages as before, and hand off. The generic handoff rules are in [../handoff.md](../handoff.md).

## Build verification checklist

- [ ] **Clean build.** Delete `public/` and `resources/_gen/`, then run the full build command (`npm run build`, or `hugo`). It completes with no errors and no new warnings.
- [ ] **Page parity.** Compare page lists against the parity baseline from [audit.md § 1](audit.md#1-hugo-version-modules-and-themes): `diff <(cd public && find . -name '*.html' | sort) <(cd "$BASELINE" && find . -name '*.html' | sort)`. If the baseline was never saved, build it now: `git archive <pre-migration commit> | tar -x -C "$(mktemp -d)"`, apply only the Hugo upgrade fixes, make `node_modules` available (install, or symlink the project's), and build. Don't use a fixed `/tmp` path — concurrent runs overwrite each other.
- [ ] **Text and image parity.** For each page, compare visible text and `<img` counts between the build and the baseline. A drop is content lost in a move to front matter or a partial.
- [ ] **Regions are in the output.** `grep -roE 'data-editable="[a-z-]+"' public | sort | uniq -c` shows each region type you wired, and `data-component=` appears on page-builder items.
- [ ] **Editor-mode build.** Run the `ENV_CLIENT` build from [visual-editing.md § Local checks](../../cloudcannon-visual-editing/hugo/visual-editing.md#local-checks) and confirm no image count drops.
- [ ] **Renderer published.** `public/_cloudcannon/` contains `hugo_renderer.wasm.<hash>.gz` and `live-editing.<hash>.js`.
- [ ] **Config validates.** `npx @cloudcannon/cli validate` passes.
- [ ] **Search index.** If the site uses Pagefind, the build command runs it after Hugo and `public/pagefind/` exists.

Use `grep -o … | wc -l`, not `grep -c`, when counting in minified HTML — `--minify` puts a page on one line.

## CloudCannon build command

| Site has                                | `build.build_command` | `build.install_command` |
| --------------------------------------- | --------------------- | ----------------------- |
| No `package.json`                       | `hugo`                | —                       |
| `package.json` with a `build` script    | `npm run build`       | `npm i`                 |
| `package.json` without a `build` script | `hugo`                | `npm i`                 |

Put every step in the build command — see [build-commands.md](../../cloudcannon-configuration/build-commands.md). Keep `HUGO_CACHEDIR` and the `resources/` preserved path from the CLI baseline so Hugo modules and processed images are cached between builds.

## Common issues

### The build fails on CloudCannon but not locally

Check `build.hugo_version` in `.cloudcannon/initial-site-settings.json` — without it (or with the ignored `hugoVersion` spelling) CloudCannon builds with its default Hugo. For an existing site, change it in **Site Settings > Builds**.

### The build fails fetching the renderer

The module is pinned to a commit rather than a release tag — see [troubleshooting.md](../../cloudcannon-visual-editing/hugo/troubleshooting.md#build).

### Stale bundles in `public/`

Hugo never deletes old fingerprinted files from `public/`, so a local `public/_cloudcannon/` fills up with old `live-editing.*.js` bundles. Build into a clean directory before inspecting it; CloudCannon's builds start clean.
