# Hugo Migration Guide

Guidance for migrating a Hugo site to CloudCannon. Follow the phases in order. Before starting, run [../scripts/audit-hugo.sh](../scripts/audit-hugo.sh) to gather site information automatically.

> **Coverage note — read this first.** This guide was built from migrating two Bookshop-based Hugo sites to editable regions. The Bookshop path and everything the two sites exercised (page builders, data-file headers and footers, blog posts, the asset pipeline) are covered. A Hugo site that never used Bookshop, and a site whose templates come from a module in the module cache, have not been run end to end yet. Treat gaps there as unverified rather than not-applicable, and record what you find in `.cloudcannon/migration/`.

## Hugo scope

This guide covers Hugo sites that:

- Build with Hugo **0.150.0 or later** — or can be upgraded to it. Editable regions requires it; see [visual-editing.md § Upgrading Hugo first](../../cloudcannon-visual-editing/hugo/visual-editing.md#upgrading-hugo-first)
- Keep content under `content/` as Markdown with YAML, TOML or JSON front matter
- Keep their own templates under `layouts/`, or in a theme under `themes/`
- Produce static output in `public/` (or `publishDir`)

A multilingual Hugo site (a `languages` block in the site config) also needs [`make-site-multilingual`](../../make-site-multilingual/SKILL.md), independent of these phases.

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map sections, layouts, partials, data files, modules and the build pipeline.

See [audit.md](audit.md).

### Phase 2: Configuration

Generate a baseline with the CloudCannon CLI, then customize it from the audit. If content uses shortcodes, configure snippets in this phase too.

**Read the `cloudcannon-configuration` skill** — its Hugo entry point is [cloudcannon-configuration/hugo/overview.md](../../cloudcannon-configuration/hugo/overview.md). For shortcodes, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/hugo/overview.md](../../cloudcannon-snippets/hugo/overview.md).

### Phase 3: Content

Restructure content files where needed so they work in the CMS.

See [content.md](content.md), and [page-building.md](page-building.md) for pages that become page-builder entries.

### Phase 4: Visual editing

Add the `editable-regions` Hugo module for inline editing in CloudCannon's Visual Editor.

**Read the `cloudcannon-visual-editing` skill** — its Hugo entry point is [cloudcannon-visual-editing/hugo/overview.md](../../cloudcannon-visual-editing/hugo/overview.md).

### Phase 5: Build and test

Validate the migration end to end — [build.md](build.md) — then hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site with well-structured front matter may skip Phase 3.
- Visual editing (Phase 4) is optional but high-value.
