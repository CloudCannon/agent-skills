# Human Traversal Guide

How to navigate this skill — for humans reviewing agent behaviour or learning the doc structure.

## File Map

```
SKILL.md                         (61)   ENTRY POINT — phases, SSG table, naming conventions
GUIDE.md                                THIS FILE — orientation for humans

── Core reference (cross-SSG) ──────────────────────────────────
editable-regions.md              (71)   Region types, attribute reference, decision tree
editable-regions-internals.md    (219)  ON DEMAND — lifecycle trace, JS API, quirks
gadget-guide.md                  (133)  Gadget CLI commands and options
collection-urls.md               (91)   URL patterns — placeholders, trailing slash, troubleshooting
structures.md                    (250)  Structures — inline vs split, previews, field completeness
snippets.md                      (251)  Snippet concepts — when to use, config patterns

── Snippets sub-docs ───────────────────────────────────────────
snippets/built-in-templates.md   (97)   MDX templates vs import bundle, parser internals
snippets/raw.md                  (350)  Raw snippet syntax, all parser types
snippets/template-based.md       (119)  Template-based snippet workflow
snippets/gotchas.md              (138)  Snippet pitfalls and debugging

── Astro SSG ───────────────────────────────────────────────────
astro/overview.md                (52)   ENTRY POINT for Astro — phase links
astro/audit.md                   (103)  Phase 1: site analysis
astro/configuration.md           (321)  Phase 2: CC config, schemas, inputs, add options
astro/configuration-gotchas.md   (246)  Phase 2 gotchas: icon fields, numeric values, etc.
astro/page-building.md           (202)  Phase 2/4: pages collection, page builder, BlockRenderer
astro/content.md                 (106)  Phase 3: content restructuring
astro/snippets.md                (269)  Phase 2: Astro-specific snippet configuration
astro/visual-editing.md          (742)  Phase 4: editable regions, component registration
astro/build.md                   (47)   Phase 5: build verification

── Scripts ─────────────────────────────────────────────────────
scripts/README.md                (44)   Script inventory
scripts/*.sh                            Automation scripts (audit, rename, setup)
```

Numbers in parentheses are approximate line counts.

## Reading Order Per Phase

### Phase 1: Audit
1. `SKILL.md` → detect SSG
2. `astro/overview.md` → phase summary
3. `astro/audit.md` → full audit procedure

### Phase 2: Configuration
1. `gadget-guide.md` → generate baseline
2. `astro/configuration.md` → customize config (schemas, inputs, collections)
3. `collection-urls.md` → if any collection produces pages
4. `astro/page-building.md` → if audit identified pages for content collection or page builder
5. `structures.md` → if site has array-based components (3+ block types)
6. `snippets.md` → `astro/snippets.md` → if site uses MDX components in content
7. `astro/configuration-gotchas.md` → reference during and after configuration

### Phase 3: Content
1. `astro/content.md`
2. `structures.md` → field completeness rule

### Phase 4: Visual Editing
1. `editable-regions.md` → region types and attribute reference
2. `astro/visual-editing.md` → full Astro integration
3. `astro/page-building.md` → if page builder (BlockRenderer, array editables)

### Phase 5: Build
1. `astro/build.md`

## Decision Tree: When to Read Optional Docs

```
Does the site use MDX components in content?
├─ Yes → read snippets.md, then astro/snippets.md
│        Does a component have nested children (e.g. Tabs > Tab)?
│        ├─ Yes → read snippets/raw.md (repeating parser)
│        └─ No  → snippets/template-based.md may suffice
└─ No  → skip all snippet docs

Does the site have inline HTML in .md files (<figure>, <video>, etc.)?
├─ Yes → read snippets/raw.md
└─ No  → skip

Does the site have 3+ reusable block components?
├─ Yes → read astro/page-building.md + structures.md
└─ No  → skip page builder, use schema-based pages

Is the visual editor behaving unexpectedly?
├─ Yes → read editable-regions-internals.md (lifecycle, API quirks)
└─ No  → editable-regions.md is sufficient

Is a page not loading in the visual editor?
├─ Yes → check collection-urls.md § Troubleshooting
└─ No  → skip
```

## Cross-Reference Map

```
SKILL.md
  └─→ astro/overview.md
        ├─→ astro/audit.md
        ├─→ astro/configuration.md
        │     ├─→ gadget-guide.md
        │     ├─→ collection-urls.md
        │     ├─→ astro/page-building.md ←─→ astro/visual-editing.md
        │     ├─→ structures.md ←── astro/content.md
        │     ├─→ astro/snippets.md → snippets.md → snippets/*
        │     └─→ astro/configuration-gotchas.md
        ├─→ astro/content.md
        ├─→ astro/visual-editing.md
        │     ├─→ editable-regions.md
        │     │     └─→ editable-regions-internals.md (on demand)
        │     └─→ astro/page-building.md
        └─→ astro/build.md
```
