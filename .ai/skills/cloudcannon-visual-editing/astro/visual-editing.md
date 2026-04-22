# Visual Editing (Astro)

Workflow for adding CloudCannon Visual Editor support to an Astro site using `@cloudcannon/editable-regions`. Pattern details and code examples live in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the general editable regions API, see [../editable-regions.md](../editable-regions.md).

## Setup steps

Run the setup script to handle steps 1-3 automatically:

```bash
bash .ai/skills/cloudcannon-visual-editing/scripts/setup-editable-regions.sh .
```

This installs the package (falling back to `--legacy-peer-deps` if needed), adds the Astro integration to `astro.config.mjs`, and creates `src/cloudcannon/registerComponents.ts`. Verify the results — especially that `editableRegions()` was placed inside the integrations array, not after it. Then add a conditional import in the base layout so `registerComponents` only loads inside CloudCannon's Visual Editor:

```astro
<script>
  if (window.inEditorMode) {
    import("../cloudcannon/registerComponents").catch((error) => {
      console.warn("Failed to load CloudCannon component registration:", error);
    });
  }
</script>
```

`window.inEditorMode` is set to `true` by CloudCannon inside the Visual Editor iframe. The dynamic `import()` keeps the registration code out of the production bundle entirely — it only loads when the page is being edited. Use a relative path for the import (not `@cloudcannon/...` which looks like an npm scope).

**Astro 4 compatibility:** The integration requires Astro 5+. For Astro 4, skip the integration — `data-editable` HTML attributes still work but component re-rendering is not available. See [visual-editing-reference.md § How the Astro integration works](visual-editing-reference.md#how-the-astro-integration-works).

When the site uses a page builder with a `BlockRenderer`, create a shared `src/cloudcannon/componentMap.ts` — see [visual-editing-reference.md § Component re-rendering](visual-editing-reference.md#component-re-rendering).

### Package exports reference

| Import path | Purpose |
|---|---|
| `@cloudcannon/editable-regions/astro-integration` | Astro integration for `astro.config.mjs` (build-time) |
| `@cloudcannon/editable-regions/astro` | `registerAstroComponent()` for client-side component re-rendering |
| `@cloudcannon/editable-regions/astro-react-renderer` | Side-effect import: registers a catch-all React renderer (needed when React components are used inside registered Astro components) |
| `@cloudcannon/editable-regions/react` | `registerReactComponent()` for standalone React component re-rendering |

## Section census

> **Hard gate.** Do not write a single `data-editable` attribute until a section census exists at `migration/visual-editing.md` and covers every page listed below. An empty or TODO'd census fails this gate — produce the table first, then implement.

Before writing any editable attributes, produce a census of every visible section on every key page. Document the census in `migration/visual-editing.md`. The census prevents sections from being accidentally skipped — every section must have an explicit treatment decision.

**Key pages to census:** Homepage, blog listing, blog detail, portfolio/project listing, project detail, contact, about, and any other unique page templates. Include shared partials that appear on multiple pages (header, footer, CTA banner, navigation).

**For each section, document:**

| Column | Description |
|---|---|
| **Page** | Which page the section appears on |
| **Section** | Descriptive name (e.g. "Hero", "Features grid", "FAQ accordion", "Footer links") |
| **Treatment** | One of: `text`, `image`, `array`, `component`, `source`, `data-file`, `combined` (multiple types), `sidebar-only` |
| **Binding plan** | The actual `data-prop` paths and any registered-component name. Required when the treatment is `data-file`, `array`, `component`, or involves a `select` referencing another data file. Forces the wiring decision *before* writing any HTML. Examples: `@data[footer].columns` parent + relative `heading`/`links`/`label` inside items; `@data[cta]` on `<editable-component data-component="call-to-action">`; `data-prop="author"` on `<editable-component data-component="author-card">` (registered component does the slug lookup). Hyphen `—` is fine for `text`/`image`/`source` rows where the binding is obvious from the field name. |
| **Data completeness** | Are ALL visible/configurable values in the data source? List any hardcoded values in the template that should also be in the data (icons, colors, link targets, label text) |
| **Justification** | Required when treatment is `sidebar-only`. Must cite a specific technical reason, not just "complex" or "not worth it" |

**Rules for `sidebar-only` justification:**

- "Uses third-party npm components" is NOT sufficient alone. First try wrapping the section in `<editable-component>` for re-rendering. See [visual-editing-reference.md § Third-party component fields](visual-editing-reference.md#third-party-component-fields)
- Valid reasons: component genuinely cannot be wrapped (shadow DOM, framework incompatibility after attempting conversion), AND the section is still wrapped in `editable-component` for sidebar-triggered re-rendering
- Every `sidebar-only` section should still have array editables for CRUD if it renders a list

**Example census:**

| Page | Section | Treatment | Binding plan | Data completeness | Justification |
|---|---|---|---|---|---|
| Homepage | Hero | component + text + image + array | `<editable-component data-component="hero" data-prop="banner">`; nested `data-prop="title"`, `data-prop-src="image"`, `data-prop="actions"` array | All values in content collection | — |
| Homepage | Features grid | component + array (nested text per item) | `data-prop="features"` parent; relative `data-prop="title"`, `data-prop="description"`, `data-prop-src="icon"` inside items | Icons, titles, descriptions all in frontmatter | — |
| Homepage | Featured Projects | component + source (title, button) | `<editable-component data-component="featured-projects">`; source editables on hardcoded heading/button | Heading and button text hardcoded in component — extract to data or use source editables | — |
| Homepage | FAQ | component + array | `data-prop="faqs"` parent; relative `data-prop="question"`, `data-prop="answer"` inside items | All values in frontmatter; heading/description need text editables | — |
| All pages | Header / Navigation | data-file | `<editable-component data-component="nav" data-prop="@data[navigation]">`; nested array on `items` with relative paths | Nav items in data file? Icons? Mobile menu? | — |
| All pages | Footer link columns | data-file + array | `@data[footer].columns` on parent **only**; relative `heading`, `links` (inner array), `label` (inside links). Static logo column lives outside the array wrapper | All link text, URLs, column headings in data file? | — |
| All pages | Footer CTA banner | data-file + component | `<editable-component data-component="call-to-action" data-prop="@data[cta]">` | Title, link text, URL in data file? | — |
| Post / Project detail | Share block | source OR data-file | source: `data-editable="source" data-path="..." data-key="share_heading"` etc. | Heading, description above social buttons. Hardcoded page-template text is a common miss. | — |
| Post / Project detail | Author card | data-file + component | Slug stored as `author: <slug>` in frontmatter; rendered via registered `AuthorCard` (lookup inside) wrapped in `<editable-component data-component="author-card" data-prop="author">`. **Anti-pattern:** lookup in page template, object passed to static component | Name, bio, avatar pulled from `src/data/authors.json` via a `select` input. Inline author objects in page templates are a miss. | — |

After completing the census, implement the editable regions section by section. Update the census with any changes made during implementation.

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] The `editableRegions()` integration is in the `integrations` array in `astro.config.mjs` (inside the array, not after it)
- [ ] `src/cloudcannon/registerComponents.ts` exists with commented-out examples
- [ ] Base layout conditionally imports `registerComponents` inside `if (window.inEditorMode)`
- [ ] `src/icons/` directory exists (required by `astro-icon` even if empty)
- [ ] `astro build` passes cleanly after setup

## Completeness checklist

> **Rule: if an editor can see it on the page, an editor must be able to edit it.** Every item below enforces this rule. Hardcoded headings, labels, or paragraphs are not "developer-only" — they are an unfinished migration. A section is either editable or has a written exception in `migration/visual-editing.md` explaining why.

Work through every item after implementing editable regions. Each item links to the relevant pattern documentation.

### Universal (every migration)

- [ ] **Editor enablement**: Every collection with editable attributes on its rendered pages has `visual` in `_enabled_editors`
  → [configuration.md](../../cloudcannon-configuration/astro/configuration.md)
- [ ] **Census coverage**: Every section in the census has editable regions OR a documented justification that meets the `sidebar-only` rules above
- [ ] **Array containers**: Every array rendered from frontmatter/data has `data-editable="array"` + `data-prop` on the container AND `data-editable="array-item"` on each item
  → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Nested editables in array items**: Every array item has nested `data-editable="text"` / `data-editable="image"` (or `<editable-text>` / `<editable-image>`) on its visible fields (title, description, image). Array CRUD alone is NOT sufficient — without nested editables, items only get add/remove/reorder controls, no inline text editing or image picking
  → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Array path scope**: Inside `data-editable="array-item"`, every nested `data-prop` is **relative** to the item (`data-prop="heading"`, `data-prop="links"`) — never a full path with an index (`data-prop="@data[footer].columns[0].heading"` or the template-literal form). The `@data[...]` prefix appears once on the parent array editable and never repeats inside items. Same rule for nested arrays inside data files
  → [Arrays inside data files](visual-editing-reference.md#arrays-inside-data-files)
- [ ] **Array container purity**: Every `data-editable="array"` wrapper contains **only** elements produced by the array (`data-editable="array-item"` rows plus optional `<template>` blueprints). Static siblings (logo column, summary block, "see all" link) live *outside* the array wrapper
  → [Don't mix array items with non-array siblings](visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings)
- [ ] **Image editables**: Every image rendered from frontmatter/data has an `<editable-image>` wrapper or `data-editable="image"` on the `<img>` itself
  → [Image editing](visual-editing-reference.md#image-editing)
- [ ] **Child component labels**: Components with hardcoded section titles, button text, or icons are either: (a) extracted to frontmatter/data and made editable, or (b) have source editables on the hardcoded text. Don't skip labels just because they're in a child component
  → [Section titles and buttons](visual-editing-reference.md#section-titles-and-buttons-in-child-components)
- [ ] **Registration wiring**: Every component in `registerComponents.ts` is actually referenced via `data-component` in a template. Unused registrations = missed wiring
  → [Component re-rendering](visual-editing-reference.md#component-re-rendering)
- [ ] **Shared partials backed by data**: CTA, footer, navigation, and other cross-page sections are backed by data files with `@data[key]` editables. Verify EACH sub-section of the partial independently — don't mark the footer done because the CTA inside it works
  → [Component editables backed by data files](visual-editing-reference.md#component-editables-backed-by-data-files)
- [ ] **Data file completeness**: For components backed by data files, ALL visible/configurable values are in the data file — not hardcoded in the template. Check icons, colors, link targets, label text, image paths
  → [Component editables backed by data files](visual-editing-reference.md#component-editables-backed-by-data-files)
- [ ] **Cross-collection select wiring**: Every `select` input that references another data file (`author`, `category`, `team_member`) renders through a **registered component** that does the slug lookup *internally*, wrapped in `<editable-component data-component="..." data-prop="<slug-field>">`. Build-time lookup in the page template with the resolved object passed to a static child component is broken — sidebar changes update the frontmatter but the displayed card stays stale
  → [Cross-collection select inputs](visual-editing-reference.md#cross-collection-select-inputs)
- [ ] **Markdown body content**: Pages rendering markdown body (via `<Content />`, `entry.render()`, or `<slot />` in layouts) have `data-editable="text" data-type="block" data-prop="@content"` on the wrapper element
  → [Content body editing](visual-editing-reference.md#content-body-editing)
- [ ] **Slot content hosts**: Editable slot content uses a concrete DOM host (`<editable-text>`, `<span>`) not `<Fragment>`
  → [Text editing](visual-editing-reference.md#text-editing)
- [ ] **Source editables**: Hardcoded text in page templates has `data-editable="source"` with `data-path` and `data-key`. Don't skip content just because it's not in a collection
  → [Source editables](visual-editing-reference.md#source-editables-for-hardcoded-content)
- [ ] **Conditional guards**: Every `data-editable` element whose field can be undefined/null is wrapped in a conditional
  → [Guard optional fields](visual-editing-reference.md#guard-optional-fields)
- [ ] **Inline vs block text**: `data-type` matches the field's input config — block-level inputs need `data-type="block"` on a block-level host element (not `<p>`)
  → [Text editing](visual-editing-reference.md#text-editing)
- [ ] **Component prop contract**: Registered components accept spread props matching the shape of their `data-prop` value — not a named wrapper prop
  → [Component prop contract](visual-editing-reference.md#component-prop-contract)
- [ ] **Cross-collection editable guard**: Shared components used for both frontmatter items and programmatic cross-collection content have an `editable` prop to conditionally strip editable attributes
  → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **`<template>` blueprints**: Primitive-only arrays that can be empty at build time have `<template>` children. Page-builder arrays with registered components do NOT need templates
  → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Data file input config**: Every data file in `data_config` has a `file_config` entry with proper input types and structure references
  → [configuration.md](../../cloudcannon-configuration/astro/configuration.md)

### Page builder only (skip if not applicable)

- [ ] **Array wrapper attributes**: `data-component-key="_type"` alongside `data-editable="array"` and `data-prop="content_blocks"`. `data-id-key` can be omitted when it matches `data-component-key`
  → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Block items**: Both `data-editable="array-item"` and `data-component={_type}` on each block element
  → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Widget nested editables**: Widget components have text/image regions on their key fields
  → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Sub-arrays in widgets**: Widget arrays (`items`, `actions`, `steps`) have `data-editable="array"` + `data-prop` on the container and `data-editable="array-item"` on each item
  → [Sub-arrays within widget components](visual-editing-reference.md#sub-arrays-within-widget-components)
- [ ] **UI component variants**: All numbered variants of shared components have editable attributes
  → [Sub-arrays within widget components](visual-editing-reference.md#sub-arrays-within-widget-components)
- [ ] **Shared component map**: `src/cloudcannon/componentMap.ts` exists and both `BlockRenderer.astro` and `registerComponents.ts` import from it
  → [Component re-rendering](visual-editing-reference.md#astro-components)
- [ ] **Registration keys match `_type`**: Every key uses the exact `_type` string from content files
  → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **All block types registered**: Every `_type` value in content files has a `componentMap` entry
  → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Build output verification**: `dist/` contains `data-component-key`, `data-component=`, and `data-editable="array-item"` attributes (grep to verify)

## Pre-handoff sweep

Before declaring the migration complete, run these three verifications. This is the net that catches shared sections that slipped through the section census and completeness checklist.

- [ ] **Census walk-through.** Re-open `migration/visual-editing.md` and walk every census row. Each row's treatment is implemented in the repo — not just proposed. Rows with `sidebar-only` justification are written out with a technical reason.
- [ ] **Shared-UI table walk-through.** Open [../../migrating-to-cloudcannon/astro/cc-friendly-conventions.md § Shared-UI treatment table](../../migrating-to-cloudcannon/astro/cc-friendly-conventions.md#shared-ui-treatment-table) and verify every row against the repo: the named data file exists in `src/data/`, is wired in `data_config` with a `file_config` entry, the component reads from the data file, and editables are in place. If a row doesn't apply (the site has no footer, no CTA, etc.), note it explicitly in `migration/visual-editing.md`.
- [ ] **Build grep.** Run `grep -rE "data-editable|data-prop" dist/` and confirm matches for every shared section name you expect: footer, cta, share, author, any other shared partials. If a name is missing, the section wasn't wired up.

Use grep counts, not line counts (`grep -oE`, not `grep -c`), when verifying — compressed HTML puts everything on one line, so `grep -c` always returns 1.
