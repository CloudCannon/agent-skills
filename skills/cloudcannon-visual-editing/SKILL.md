---
name: cloudcannon-visual-editing
description: >-
  Use when adding Visual Editor support to a CloudCannon site, setting up
  editable regions, debugging visual editing issues, or making page sections
  editable in the CloudCannon preview.
---

# CloudCannon Visual Editing

`@cloudcannon/editable-regions` makes page elements interactive in CloudCannon's Visual Editor. Covers the editable regions API, integration setup, and SSG-specific patterns for wiring up text, image, array, and component editables.

## When to use

- Adding Visual Editor support to a new or existing CloudCannon site
- Making page sections editable (text, images, arrays, components)
- Setting up component re-rendering for live preview
- Debugging editable regions that aren't appearing or updating
- Adding editable regions to shared partials backed by data files

## Docs

| Doc                                                            | When to read                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [editable-regions.md](editable-regions.md)                     | Start here. Region types, attribute reference, when to use components vs primitives |
| [editable-regions-internals.md](editable-regions-internals.md) | Only when debugging. Lifecycle traces, JavaScript API reference                     |

**SSG-specific:**

| SSG   | Doc                                                                    | Purpose                                                                    |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Astro | [astro/visual-editing.md](astro/visual-editing.md)                     | Setup workflow, section census, infrastructure + completeness checklists   |
| Astro | [astro/visual-editing-reference.md](astro/visual-editing-reference.md) | Pattern reference (read sections on demand as the checklist links to them) |

**Scripts:**

| Script                                                                 | Purpose                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [scripts/setup-editable-regions.sh](scripts/setup-editable-regions.sh) | Installs package, wires Astro integration, creates `registerComponents.ts` stub |

## Workflow

See the SSG-specific workflow doc (e.g. [astro/visual-editing.md](astro/visual-editing.md)) — it owns the setup steps, section census format, and the completeness checklist. Region-type reference and attribute details live in [editable-regions.md](editable-regions.md).

## Checklists are mandatory

**MUST:** read the SSG workflow doc's completeness checklist before starting, then verify every item before marking the phase done.
**Why:** visual editing silently degrades — an unregistered component, a missing nested editable inside an array, or a sidebar-only section without a documented justification all look fine until an editor opens the page.

## Common mistakes

| Symptom / mistake                                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Used `data-editable="content"`                                                                                                                                            | Not a valid region type. Valid types: `text`, `image`, `array`, `array-item`, `component`, `source`. For the markdown body use `data-editable="text" data-type="block" data-prop="@content"`.                                                                                                                                                                                                                                            |
| Put defaults in template `\|\|` fallbacks instead of schema frontmatter                                                                                                   | `data-editable` regions display the stored field value, not the rendered HTML. Empty-string/missing field + template fallback = production renders default, editor shows blank. Put default values in the collection schema (and in structure-value defaults for page-builder blocks), not `{x \|\| "Default"}` fallbacks. Keep a `?.trim() \|\|` safety net for legacy entries, and backfill existing content files.                    |
| Assumed a component registered in `componentMap.ts` would live-update in the editor                                                                                       | Registration only enables page-builder instantiation as a `_type` block. Inline live-editing still requires `data-editable` attributes on every rendered text/image field and `data-editable="array"` + `array-item` + nested `text` on every `.map()`. These are independent concerns.                                                                                                                                                  |
| Used `data-editable="source"` with `data-path` / `data-key` for a shared-data field                                                                                       | The canonical pattern in CloudCannon's Astro integration is `data-editable="text"` (or `image`, `array`, …) with `data-prop="@data[<key>]..."`, where `<key>` is registered in `data_config` in `cloudcannon.config.yml`. `source` has different semantics; `@data[<key>]` routes through the same channel as frontmatter edits.                                                                                                         |
| Changed a schema default without backfilling existing content                                                                                                             | `data-editable` shows the stored value. Existing entries keep the old (often empty) value; only brand-new entries get the new default. Always pair the schema change with a backfill script.                                                                                                                                                                                                                                             |
| Editing a static-placement section mutates a top-level frontmatter field instead of the nested key (e.g. `heading` instead of `ctaBox.heading`), or appears to do nothing | Component is registered in `componentMap.ts` and statically placed in a page/layout but is missing its `<editable-component data-component="<name>" data-prop="<key>">` wrapper. A `propPrefix`-style prop is the wrong fix — it builds correct `data-prop` strings at compile time but the component never re-renders on field change. Wrap with `<editable-component>`; remove any `propPrefix` / `scope()` helper from the component. |
| "Multiselect appears to work but selection is ignored — same output regardless of what's selected"                                                                        | Component has an `if (length === 0) showAll` fallback. Combined with a ref-comparison bug, the filtered array always empties and the fallback always fires. Remove the fallback. Empty array = render nothing. Seed defaults in `.cloudcannon/schemas/<collection>.md`.                                                                                                                                                                  |
| "Multiselect of refs renders nothing or renders all — selection appears not to work"                                                                                      | `reference()` fields are `{collection, id}` objects at runtime, not strings. Comparing `entry.id === ref` is string-vs-object → always false → empty filter result. Use `getEntry(ref)` for one ref or `entry.data.x.some(r => r.id === currentId)` for membership. Type Props as `{collection: string; id: string}[]`, never `string[]`.                                                                                                |
| Component renders fine in `astro build` but a field is missing from `Astro.props` in the visual editor                                                                    | The CC schema file (`.cloudcannon/schemas/<collection>.md`) gates which frontmatter fields are forwarded on re-render. Adding a hidden `_input` in `cloudcannon.config.yml` does NOT fix this — `_inputs` control sidebar UI, not prop forwarding. Add the missing key (with a sensible default) inside the correct nested object in the schema file.                                                                                    |
