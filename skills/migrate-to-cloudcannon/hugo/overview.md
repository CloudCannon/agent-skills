# Hugo Migration Guide

Guidance for migrating a Hugo site to CloudCannon. Follow the phases in order. Before starting, run [../scripts/audit-hugo.sh](../scripts/audit-hugo.sh) to gather site information automatically.

> **Coverage note — read this first.** This guide covers Bookshop-based sites, sites that own their `layouts/`, and sites whose templates come from a theme in `themes/` or a module in the module cache. The build side is covered for all of them, including which files reach the editor's bundle. The two known failures are both on module sites: a module-cache dependency is missing from the editor entirely, and a `version` key on a module import breaks every component — see [Themes, modules and vendoring](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#themes-modules-and-vendoring). Editor-side behaviour on theme and module sites is only partly verified: treat gaps there as unverified rather than not-applicable, and record what you find in `.cloudcannon/migration/`.

## Hugo scope

This guide covers Hugo sites that:

- Build with a Hugo inside the editable-regions module's declared range (0.120 or later). A recent Hugo is recommended; ask the user before upgrading — see [visual-editing.md § Upgrading Hugo first](../../cloudcannon-visual-editing/hugo/visual-editing.md#upgrading-hugo-first)
- Keep content under `content/` as Markdown with YAML, TOML or JSON front matter
- Keep their own templates under `layouts/`, or take them from a theme under `themes/` or a Hugo module
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
