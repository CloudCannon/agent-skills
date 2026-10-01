# Visual Editing Workflow

The SSG-agnostic half of the Phase 4 workflow: the section census, the completeness checklist and the pre-handoff sweep. Setup, infrastructure checks and each SSG's extra checklist items live in that SSG's `visual-editing.md` — [astro/visual-editing.md](astro/visual-editing.md), [hugo/visual-editing.md](hugo/visual-editing.md). A **registered component** is a component the SSG's integration can re-render ([editable-regions.md § EditableComponent](editable-regions.md#editablecomponent)).

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page. An empty or TODO'd census fails this gate — produce the table first, then implement.
>
> The gate covers the templates that already render the site. Block components written new for a page builder in Phase 3 can carry their region attributes from the start, since the census rows for them are the block list itself.

Before adding regions to existing templates, produce a census of every visible section on every key page. The census prevents sections from being skipped — every section must have an explicit treatment decision.

**Key pages to census:** Homepage, blog listing, blog detail, portfolio/project listing, project detail, contact, about, and any other unique page templates. Include shared partials that appear on multiple pages (header, footer, CTA banner, navigation).

**For each section, document:**

| Column                | Description                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**              | Which page the section appears on                                                                                                                                                                                                                                                                                                                  |
| **Section**           | Descriptive name (e.g. "Hero", "Features grid", "FAQ accordion", "Footer links")                                                                                                                                                                                                                                                                   |
| **Treatment**         | One of: `text`, `image`, `array`, `component`, `source`, `data-file`, `combined` (multiple types), `sidebar-only`                                                                                                                                                                                                                                  |
| **Binding plan**      | The actual `data-prop` paths and any registered-component name. Required for `data-file`, `array`, `component`, or `select`-into-another-data-file treatments. Hyphen `—` is fine for `text`/`image`/`source` rows where the binding is obvious. See [§ Binding plan by treatment](#binding-plan-by-treatment) for the pattern per treatment type. |
| **Data completeness** | Are ALL visible/configurable values in the data source? List any hardcoded values in the template that should also be in the data (icons, colors, link targets, label text)                                                                                                                                                                        |
| **Justification**     | Required when treatment is `sidebar-only`. Must cite a specific technical reason, not just "complex" or "not worth it"                                                                                                                                                                                                                             |

### Binding plan by treatment

| Treatment                             | Binding plan pattern                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` / `image` / `source`           | Hyphen `—` — binding is obvious from the field name (or from `data-path` / `data-key` on source editables).                                           |
| `array` (frontmatter)                 | `data-prop="<array-field>"` on the parent; relative `data-prop` on inner editables inside each item.                                                  |
| `data-file`                           | `@data[<key>]` on the parent wrapper. Descendants use relative paths — never repeat `@data[...]` inside items.                                        |
| `component`                           | `<editable-component data-component="<name>" data-prop="<field>">`, where `<name>` is a registered component.                                         |
| `data-file + component`               | `<editable-component data-component="<name>" data-prop="@data[<key>]">`. E.g. `@data[cta]` on `<editable-component data-component="call-to-action">`. |
| `select → component`                  | `data-prop="<slug-field>"` on `<editable-component data-component="<name>">`. The registered component does the slug lookup internally.               |
| `combined` (e.g. `data-file + array`) | `@data[<key>].<array>` on the parent; relative paths inside items. Static siblings (logo column, "see all" link) live outside the array wrapper.      |

### Rules for `sidebar-only` justification

"Uses third-party components" is NOT sufficient on its own — most third-party components can still be wrapped in `<editable-component>` for sidebar-triggered re-rendering. See [visual-editing-reference.md § Third-party component fields](visual-editing-reference.md#third-party-component-fields).

**Valid reasons:**

- The component genuinely can't be wrapped (shadow DOM, framework incompatibility after attempting conversion) AND the section is still wrapped in `<editable-component>` for re-rendering.
- Wiring the field would mean overriding a large template the site doesn't own (a theme's) for little editing gain.
- The image is a CSS `background-image`, with no `<img>` to put an image region on.

Every `sidebar-only` section that renders a list still needs array editables for CRUD.

### Example census

| Page                  | Section             | Treatment                                | Binding plan                                                                                                                                                                                                                                                                      | Data completeness                                                                                                              | Justification |
| --------------------- | ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Homepage              | Hero                | component + text + image + array         | `<editable-component data-component="hero" data-prop="banner">`; nested `data-prop="title"`, `data-prop-src="image"`, `data-prop="actions"` array                                                                                                                                 | All values in content collection                                                                                               | —             |
| Homepage              | Features grid       | component + array (nested text per item) | `data-prop="features"` parent; relative `data-prop="title"`, `data-prop="description"`, `data-prop-src="icon"` inside items                                                                                                                                                       | Icons, titles, descriptions all in frontmatter                                                                                 | —             |
| Homepage              | Featured Projects   | component + source (title, button)       | `<editable-component data-component="featured-projects">`; source editables on hardcoded heading/button                                                                                                                                                                           | Heading and button text hardcoded in component — extract to data or use source editables                                       | —             |
| Homepage              | FAQ                 | component + array                        | `data-prop="faqs"` parent; relative `data-prop="question"`, `data-prop="answer"` inside items                                                                                                                                                                                     | All values in frontmatter; heading/description need text editables                                                             | —             |
| All pages             | Header / Navigation | data-file                                | `<editable-component data-component="nav" data-prop="@data[navigation]">`; nested array on `items` with relative paths                                                                                                                                                            | Nav items in data file? Icons? Mobile menu?                                                                                    | —             |
| All pages             | Footer link columns | data-file + array                        | `@data[footer].columns` on parent **only**; relative `heading`, `links` (inner array), `label` (inside links). Static logo column lives outside the array wrapper                                                                                                                 | All link text, URLs, column headings in data file?                                                                             | —             |
| All pages             | Footer CTA banner   | data-file + component                    | `<editable-component data-component="call-to-action" data-prop="@data[cta]">`                                                                                                                                                                                                     | Title, link text, URL in data file?                                                                                            | —             |
| Post / Project detail | Share block         | source OR data-file                      | source: `data-editable="source" data-path="..." data-key="share_heading"` etc.                                                                                                                                                                                                    | Heading, description above social buttons. Hardcoded page-template text is a common miss.                                      | —             |
| Post / Project detail | Author card         | data-file + component                    | Slug stored as `author: <slug>` in frontmatter; rendered via a registered `author-card` component (lookup inside) wrapped in `<editable-component data-component="author-card" data-prop="author">`. **Anti-pattern:** lookup in page template, object passed to static component | Name, bio, avatar pulled from an `authors` data file via a `select` input. Inline author objects in page templates are a miss. | —             |

After completing the census, implement the editable regions section by section. Update the census with any changes made during implementation.

## Completeness checklist

> **Rule:** if an editor can see it on the page, an editor must be able to edit it. Every item below enforces this rule. Hardcoded headings, labels, or paragraphs are not "developer-only" — they are an unfinished migration. A section is either editable or has a written exception in `.cloudcannon/migration/visual-editing.md`.

Work through every item after implementing editable regions, then the extra items in the SSG's `visual-editing.md`. Each item links to the relevant pattern documentation.

### Universal (every migration)

- [ ] **Editor enablement**: Every collection with editable attributes on its rendered pages has `visual` in `_enabled_editors`
- [ ] **Census coverage**: Every section in the census has editable regions OR a documented justification that meets the [`sidebar-only` rules](#rules-for-sidebar-only-justification)
- [ ] **Array containers**: Every array rendered from frontmatter/data has `data-editable="array"` + `data-prop` on the container AND `data-editable="array-item"` on each item
      → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Per-loop census** — for each loop in a registered component:
  - [ ] iterating element has `data-editable="array" data-prop="<key>"`
  - [ ] each iterated row has `data-editable="array-item"`
  - [ ] each text field inside the row has `data-editable="text" data-prop="<rowKey>"`
  - [ ] each image inside the row has `data-editable="image" data-prop="<rowKey>"`
  - [ ] **Verify**: in visual mode, clicking a row outlines the row; clicking a field inside outlines the field. If nothing highlights, markers are missing — sidebar-editable ≠ visual-editable.
        → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Nested editables in array items**: Every array item has nested `data-editable="text"` / `data-editable="image"` (or `<editable-text>` / `<editable-image>`) on its visible fields.
      → [Array editing](visual-editing-reference.md#array-editing)
- [ ] **Array path scope**: Inside `data-editable="array-item"`, every nested `data-prop` is **relative** to the item (`data-prop="heading"`, `data-prop="links"`).
      → [Arrays inside data files](visual-editing-reference.md#arrays-inside-data-files)
- [ ] **Array container purity**: Every `data-editable="array"` wrapper contains **only** elements produced by the array (`data-editable="array-item"` rows plus optional `<template>` blueprints).
      → [Don't mix array items with non-array siblings](visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings)
- [ ] **Image editables**: Every image rendered from frontmatter/data has an `<editable-image>` wrapper or `data-editable="image"` on the `<img>` itself
      → [Image editing](visual-editing-reference.md#image-editing)
- [ ] **Child component labels**: Components with hardcoded section titles, button text, or icons are either: (a) extracted to frontmatter/data and made editable, or (b) have source editables on the hardcoded text.
      → [Section titles and buttons](visual-editing-reference.md#section-titles-and-buttons-in-child-components)
- [ ] **Shared partials backed by data**: CTA, footer, navigation, and other cross-page sections are backed by data files with `@data[key]` editables.
      → [Component editables backed by data files](visual-editing-reference.md#component-editables-backed-by-data-files)
- [ ] **Data file completeness**: For components backed by data files, ALL visible/configurable values are in the data file — not hardcoded in the template.
      → [Component editables backed by data files](visual-editing-reference.md#component-editables-backed-by-data-files)
- [ ] **Cross-collection select wiring**: Every `select` input that references another data file (`author`, `category`, `team_member`) renders through a **registered component** that does the slug lookup _internally_, wrapped in `<editable-component data-component="..." data-prop="<slug-field>">`.
      → [Cross-collection select inputs](visual-editing-reference.md#cross-collection-select-inputs)
- [ ] **`_inputs` type audit:** grep `data-prop=` in every template and check each field's inferred input against its region. A field needs an `_inputs` entry only when CloudCannon would infer the wrong type (a bare number bound to a `text` region), not one per region (see [structures.md § Scoped `_inputs`](../cloudcannon-configuration/structures.md#scoped-_inputs)). Which mismatches show an error card is in [editable-regions.md § Value types per region](editable-regions.md#value-types-per-region). When the same key has different types in different places, scope the entry to the collection or file (`collections_config.<c>._inputs`, `file_config`) instead of the global `_inputs`.
- [ ] **Schema-file seed audit:** every field the template wires must appear in `.cloudcannon/schemas/<collection>.md` default frontmatter with a sensible placeholder. Otherwise "Add new" creates pages missing half their editable regions.
- [ ] **Markdown body content**: Pages rendering the markdown body have `data-editable="text" data-type="block" data-prop="@content"` on the wrapper element
      → [Text editing](visual-editing-reference.md#text-editing)
- [ ] **Source editables**: Hardcoded text in page templates has `data-editable="source"` with `data-path` and `data-key`.
      → [Source editables](visual-editing-reference.md#source-editables-for-hardcoded-content)
- [ ] **Conditional guards**: Every `data-editable` element whose field can be undefined/null is wrapped in a conditional
      → [Guard optional fields](visual-editing-reference.md#guard-optional-fields)
- [ ] **Inline vs block text**: `data-type` matches the field's input config — block-level inputs need `data-type="block"` on a block-level host element (not `<p>`)
      → [Text editing](visual-editing-reference.md#text-editing)
- [ ] **Component prop contract**: Registered components take the shape of their `data-prop` value directly — not a named wrapper prop
      → [Component prop contract](visual-editing-reference.md#component-prop-contract)
- [ ] **Cross-collection editable guard**: Shared components used for both frontmatter items and programmatic cross-collection content can switch their editable attributes off
      → [Cross-collection items on a page](visual-editing-reference.md#cross-collection-items-on-a-page)
- [ ] **`<template>` blueprints**: Primitive-only arrays that can be empty at build time have `<template>` children.
      → [When HTML `<template>` blueprints are needed](visual-editing-reference.md#when-html-template-blueprints-are-needed)
- [ ] **Data file input config**: Every data file in `data_config` has a `file_config` entry with proper input types and structure references

### Page builder only (skip if not applicable)

- [ ] **Array wrapper attributes**: `data-component-key="_type"` alongside `data-editable="array"` and `data-prop="content_blocks"`. `data-id-key` can be omitted when it matches `data-component-key`
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Block items**: Both `data-editable="array-item"` and `data-component` on each block element
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Widget nested editables**: Widget components have text/image regions on their key fields
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Sub-arrays in widgets**: Widget arrays (`items`, `actions`, `steps`) have `data-editable="array"` + `data-prop` on the container and `data-editable="array-item"` on each item
      → [Sub-arrays within widget components](visual-editing-reference.md#sub-arrays-within-widget-components)
- [ ] **UI component variants**: All numbered variants of shared components have editable attributes
      → [Sub-arrays within widget components](visual-editing-reference.md#sub-arrays-within-widget-components)
- [ ] **Component keys match the discriminator**: Every block's `data-component` resolves to the registered component for its discriminator value in content
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **All block types registered**: Every discriminator value in content files has a registered component
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks)
- [ ] **Build output verification**: the build output contains `data-component-key`, `data-component=`, and `data-editable="array-item"` attributes (grep to verify)

## Pre-handoff sweep

Before declaring the migration complete, run these three verifications. This is the net that catches shared sections that slipped through the section census and completeness checklist.

- [ ] **Census walk-through.** Re-open `.cloudcannon/migration/visual-editing.md` and walk every census row. Each row's treatment is implemented in the repo — not just proposed. Rows with `sidebar-only` justification are written out with a technical reason.
- [ ] **Shared-UI table walk-through.** Open [../migrate-to-cloudcannon/cc-friendly-conventions.md § Shared-UI treatment table](../migrate-to-cloudcannon/cc-friendly-conventions.md#shared-ui-treatment-table) and verify every row against the repo: the named data file exists, is wired in `data_config` with a `file_config` entry, the component reads from the data file, and editables are in place. If a row doesn't apply (the site has no footer, no CTA, etc.), note it explicitly in `.cloudcannon/migration/visual-editing.md`.
- [ ] **Build grep.** Grep the build output for `data-editable|data-prop` and confirm matches for every shared section name you expect: footer, cta, share, author, any other shared partials. If a name is missing, the section wasn't wired up.

Use grep counts, not line counts (`grep -oE`, not `grep -c`), when verifying — compressed HTML puts everything on one line, so `grep -c` always returns 1.
