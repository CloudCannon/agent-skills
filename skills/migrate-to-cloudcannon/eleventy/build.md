# Build and Test (Eleventy)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the Eleventy additions: proving the migrated site builds the same pages as before, and Eleventy's build command.

## Build verification checklist

- [ ] **Clean build.** Delete `_site/` (or the configured output directory) before running the full build script, not between its steps.
      **Why:** Eleventy never deletes old output, so a page that no longer builds still sits in `_site/` and passes every check. CSS steps often write into `_site/` before Eleventy runs, so clear it only at the start.
- [ ] **Page parity.** Compare page lists against the parity baseline from [audit.md § 1](audit.md#1-eleventy-version-config-and-directories): `diff <(cd _site && find . -name '*.html' | sort) <(cd "$BASELINE" && find . -name '*.html' | sort)`. If the baseline was never saved, build it now from the pre-migration commit: `git archive <commit> | tar -x -C "$(mktemp -d)"`, make `node_modules` available (install, or symlink the project's), and build. Don't use a fixed `/tmp` path — concurrent runs overwrite each other.
- [ ] **Text and image parity.** For each page, compare visible text and `<img` counts between the build and the baseline. A drop is content lost in a move to front matter or an include.
- [ ] **Regions and editor bundle.** Run [visual-editing.md § Local checks](../../cloudcannon-visual-editing/eleventy/visual-editing.md#local-checks) against the final build.
- [ ] **Path prefix.** On a site with `pathPrefix`, the built pages load CSS, images and (Liquid path) `register-components.js` under the prefix.

## CloudCannon build command

| Site has                                                               | `build.build_command`                        |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| A `build` script that runs Eleventy and every other step (CSS, search) | `npm run build`                              |
| A `build` script that misses a step the `start` script runs            | Fix the `build` script, then `npm run build` |
| No `build` script                                                      | `npx @11ty/eleventy`                         |

- **Set** `build.install_command` per [build-commands.md § Package manager](../../cloudcannon-configuration/build-commands.md#package-manager).
- **Check** `build.output_path` in `.cloudcannon/initial-site-settings.json` matches the configured output directory (`_site` by default).
- **Check** `build.node_version` gives Node 20.19 or later on the Liquid path — the plugin needs it.

## Common issues

### Pages that no longer exist still pass

A stale `_site/` from an earlier build — see the clean-build check above. CloudCannon's builds start clean, so the page 404s there.

### A data file prints nothing after Phase 3

A YAML data file with no `addDataExtension` registration — see [content.md § Data files](content.md#data-files).
