# Migration Scripts

Deterministic migration steps automated as shell scripts. Run these before or during the relevant phase to save time and improve consistency.

All scripts accept an optional `[project-dir]` argument (defaults to the current directory).

## Scripts

### `audit-astro.sh` (Phase 1: Audit)

Gathers audit data for an Astro site. Runs CloudCannon CLI commands (`configure detect-ssg`, `configure detect-collections`, `configure detect-build-commands`) then supplements with project metadata the CLI doesn't cover: dependency versions, package manager, Node version, page routes, data files, content config location, and dash-index file detection.

```bash
bash audit-astro.sh /path/to/project
```

The output is structured text the agent uses as a starting point for `.cloudcannon/migration/audit.md`. The agent still handles schema field analysis, component hierarchy, visual editing candidates, and flags/gotchas.

### `audit-hugo.sh` (Phase 1: Audit)

Gathers audit data for a Hugo site. Runs the same CloudCannon CLI commands with `--ssg hugo`, then adds what the CLI doesn't cover: Hugo version (and a misspelled `hugoVersion` in the site settings), config files, routing and Goldmark settings, modules and themes, Bookshop markers, content sections, `_index.md` files and bundles, front matter formats, data files, layouts split into page templates / partials / shortcodes, and the editor-runtime risks — asset pipeline calls, `.Content` in partials, positional CSS selectors, global JS bindings, inline scripts in partials.

```bash
bash audit-hugo.sh /path/to/project
```

The output is the starting point for `.cloudcannon/migration/audit.md`; the agent still does the judgment work in [hugo/audit.md](../hugo/audit.md).

### `rename-dash-index.sh` (Phase 3: Content) — Astro only

Renames `-index.md` / `-index.mdx` files to `index.md` / `index.mdx` under `src/content/`. This enables CloudCannon's `[slug]` URL collapsing on listing pages.

```bash
bash rename-dash-index.sh /path/to/project
```

After running, the agent still needs to update helper functions (`getSinglePage`, `getListPage` callers) to use `"index"` instead of `"-index"`.

## Scripts in other skills

- **`setup-editable-regions.sh`** — Lives in the `cloudcannon-visual-editing` skill's `scripts/` directory. Installs `@cloudcannon/editable-regions`, wires the Astro integration, and creates the `registerComponents.ts` stub. Astro only — Hugo's setup is a module import, see [cloudcannon-visual-editing/hugo/visual-editing.md](../../cloudcannon-visual-editing/hugo/visual-editing.md).
