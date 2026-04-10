# Migration Scripts

Deterministic migration steps automated as shell scripts. Run these before or during the relevant phase to save time and improve consistency.

All scripts accept an optional `[project-dir]` argument (defaults to the current directory).

## Scripts

### `audit-astro.sh` (Phase 1: Audit)

Gathers audit data for an Astro site. Runs Gadget commands (`detect-ssg`, `collections`, `build`) then supplements with project metadata Gadget doesn't cover: dependency versions, package manager, Node version, page routes, data files, content config location, and dash-index file detection.

```bash
bash audit-astro.sh /path/to/project
```

The output is structured text the agent uses as a starting point for `migration/audit.md`. The agent still handles schema field analysis, component hierarchy, visual editing candidates, and flags/gotchas.

### `rename-dash-index.sh` (Phase 3: Content)

Renames `-index.md` / `-index.mdx` files to `index.md` / `index.mdx` under `src/content/`. This enables CloudCannon's `[slug]` URL collapsing on listing pages.

```bash
bash rename-dash-index.sh /path/to/project
```

After running, the agent still needs to update helper functions (`getSinglePage`, `getListPage` callers) to use `"index"` instead of `"-index"`.

### `setup-editable-regions.sh` (Phase 4: Visual Editing)

Installs `@cloudcannon/editable-regions`, adds the Astro integration to `astro.config.mjs`, and creates `src/cloudcannon/registerComponents.ts` with commented-out examples.

```bash
bash setup-editable-regions.sh /path/to/project
```

Tries a normal `npm install` first; falls back to `--legacy-peer-deps` only if peer dependency conflicts occur. After running, the agent still needs to import the registerComponents script from the base layout and add editable region attributes to templates.
