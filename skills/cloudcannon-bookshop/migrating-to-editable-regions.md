# Migrating to editable regions

Replace Bookshop with `@cloudcannon/editable-regions` on a site that uses Bookshop components. This file owns the step order and the cross-SSG mapping. What differs per SSG lives in that SSG's `migrating-to-editable-regions.md` — [Astro](astro/migrating-to-editable-regions.md), [Hugo](hugo/migrating-to-editable-regions.md).

**MUST:** check the SSG's row in [SKILL.md § SSG support](SKILL.md#ssg-support) first. If editable regions can't re-render that SSG's components, stop — the site stays on Bookshop; see [maintaining.md](maintaining.md).

## Steps

Run these in order. Each ends with a build that matches the baseline.

| #   | Step                                    | Work                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Baseline                                | Build the unmodified site on the target SSG version — [§ Baseline](#baseline)                                                                                                                                                                                                                                                                           |
| 2   | Structures                              | Write `_structures` from what Bookshop generated — [§ Writing `_structures`](#writing-_structures-from-bookshopyml)                                                                                                                                                                                                                                     |
| 3   | Rename, resolve and dispatch — one step | Rename `_bookshop_name` ([§ Renaming](#renaming-_bookshop_name)), make every component resolvable by the SSG under its name, and replace the Bookshop dispatcher with a plain native loop. **Any one alone breaks the build** — Bookshop's dispatcher selects on `_bookshop_name`. No `data-editable` attributes yet — they follow the census in step 5 |
| 4   | Remove Bookshop                         | [§ Removing Bookshop](#removing-bookshop). Do it now, not at the end: while Bookshop is installed it can still rewrite components and supply dependencies, so later builds prove less                                                                                                                                                                   |
| 5   | Add regions                             | Install the SSG's editable-regions integration, then run the census and add regions as for any site — [cloudcannon-visual-editing](../cloudcannon-visual-editing/SKILL.md), with [§ Regions on a former Bookshop site](#regions-on-a-former-bookshop-site)                                                                                              |
| 6   | Verify                                  | Diff against the baseline, then try the editor locally — [cloudcannon-dev-server](../cloudcannon-dev-server/SKILL.md)                                                                                                                                                                                                                                   |

**Inside `migrate-to-cloudcannon`** — the site is joining CloudCannon in the same task — the steps land in its phases: step 1 in Phase 1, step 2 in Phase 2, steps 3 and 4 in Phase 3, step 5 in Phase 4, step 6 in Phase 5.

**Large sites** — split the work across conversations as [migrate-to-cloudcannon/chunking.md](../migrate-to-cloudcannon/chunking.md) describes. Step 3 is one unit: don't split it.

## Baseline

- **Record** the page count, every page's visible text and `<img>` count, inline `style` attributes, and the compiled CSS.
- **Build** the unmodified site twice from a clean cache (delete the SSG's cache and output directories first), or once more in a fresh copy — an in-place rebuild can hide order changes. Compare a paginated listing whose order changes (posts sharing a date) as one set across all its pages; a "first N" of an unsorted collection only by item count.
- **Diff** against this after every later step, not only at the end.
- **On Tailwind v4**, automatic source detection scans every file git doesn't ignore — templates, `.cloudcannon/migration/` notes, downloaded schemas. A utility appearing or vanishing in the CSS diff is usually a word added to or removed from a scanned file. Exclude `.cloudcannon/` with `@source not` before the baseline.

## What Bookshop did that you now do explicitly

| Bookshop did                                                                         | Replace with                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rendered components live in the editor through its engine                            | Component regions. The component must be resolvable by the SSG's editable-regions integration — see [editable-regions.md § EditableComponent](../cloudcannon-visual-editing/editable-regions.md#editablecomponent) |
| Made every component clickable through bindings                                      | Explicit `data-editable` regions on every field and list. Run the section census as for any site                                                                                                                   |
| Synthesised `_structures` from `*.bookshop.yml` at build time (`@bookshop/generate`) | Hand-authored `_structures` in `cloudcannon.config.yml` — see [§ Writing `_structures` from `*.bookshop.yml`](#writing-_structures-from-bookshopyml)                                                               |
| Selected a component with `_bookshop_name`                                           | `_name`, used as the `id_key` of every structure and the array's `data-component-key` — see [§ Renaming `_bookshop_name`](#renaming-_bookshop_name)                                                                |
| Passed props its dispatcher computed (an index, a count, the page body)              | Region attributes on the component's wrapper — the SSG file says which                                                                                                                                             |
| Exposed a live-editing flag to templates                                             | The SSG's `ENV_CLIENT` — see [visual-editing-reference.md § Detecting the editor](../cloudcannon-visual-editing/visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic)                    |
| Collected co-located component styles (Hugo, Jekyll, Eleventy)                       | The site's own stylesheet pipeline — the SSG file says how                                                                                                                                                         |

## Writing `_structures` from `*.bookshop.yml`

**MUST:** hand-write a structure value for every component before removing the Bookshop build hook.
**Why:** `@bookshop/generate` built `_structures` at build time and they were never committed. The committed config may have `_structures.content_blocks` with no `values`, or inputs pointing at `_structures.<key>` that doesn't exist — delete the hook without writing them and the "Add" modal is silently empty.

### See what Bookshop generated

**MUST:** start from `@bookshop/generate`'s real output, not from reading the `*.bookshop.yml` files.
**Why:** it rewrote blueprints and cascaded `_inputs` into structures it generated for nested arrays. Reading the source files misses both — [bookshop.md § What `@bookshop/generate` does](bookshop.md#what-bookshopgenerate-does).

Run it in a scratch directory, never in the site:

```sh
G=$(mktemp -d)
mkdir -p "$G/site/_cloudcannon" && echo '{}' > "$G/site/_cloudcannon/info.json"
cp -R <library root> "$G/"    # the directory holding bookshop/bookshop.config.cjs — component-library/, or src/ on Astro
cd "$G" && npx @bookshop/generate@<site's Bookshop version> --skip-live --skip-components
```

`$G/site/_cloudcannon/info.json` now holds `_structures` exactly as the editor received them.

### Map each component onto a structure value

Each `*.bookshop.yml` with a non-empty `spec.structures` became one structure value. One with no `spec.structures` is a standalone component and gets none.

| `*.bookshop.yml` key                       | Structure value key                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `spec.structures: [<key>]`                 | Which `_structures.<key>` the value goes in                                                                                   |
| `spec.label`                               | `label`                                                                                                                       |
| `spec.description`                         | `description`                                                                                                                 |
| `spec.icon`                                | `icon` — validate it against the schema's icon enum                                                                           |
| `spec.tags`                                | `tags`                                                                                                                        |
| Any other `spec.*` key                     | The same key on the structure value — validate it                                                                             |
| `blueprint`                                | `value`, plus the component key (`_name: <component name>`), in the shape the generated output had                            |
| `_inputs`, any other `_*`                  | The same key on the structure value — or on an item structure, see below                                                      |
| The YAML `preview:` key                    | Drop it — it only fed Bookshop's component browser                                                                            |
| `<name>.preview.*` / `<name>.icon.*` image | Move it to a path the site serves and set `picker_preview.gallery.image`, or drop it — Bookshop only copied it into the build |

| Blueprint value                                   | Generated as                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Array of objects                                  | `[]` in `value`, plus an item structure built from the first item, linked through `_inputs.<key>.options.structures` |
| `bookshop:structure:<key>`                        | `null` in `value`, `_inputs.<field>: { type: object, options: { structures: _structures.<key> } }`                   |
| `[bookshop:structure:<key>]`                      | `[]` in `value`, the same input with `type: array`                                                                   |
| `bookshop:<component>` / `[bookshop:<component>]` | The same, pointing at a generated `_structures._bookshop_single_component_<component>` — write that structure too    |
| Any of the above with `!`                         | Starts filled in with that component's blueprint instead of empty                                                    |

```yaml
_structures:
  content_blocks:
    id_key: _name
    values:
      - label: Counter
        description: Counter section
        icon: functions
        value:
          _name: global/counter
          title: Scale your
          numbers: []
        _inputs:
          numbers:
            type: array
            options:
              structures: _structures.counter_numbers
  counter_numbers:
    values:
      - label: Number
        value:
          number: "200"
          text: Venture capital raised
        _inputs:
          number:
            type: text
```

**MUST:** keep the shape of `value` the generated output had — empty arrays, `null` slots. Then add a `preview` to each value as [structures.md](../cloudcannon-configuration/structures.md) requires; Bookshop never generated one.
**Why:** copying the raw blueprint pre-fills every new block with the first array item, and fills slots Bookshop left empty.

Then, for each structure value:

- **Validate** the result against the configuration schema — see [cloudcannon-configuration](../cloudcannon-configuration/SKILL.md). Bookshop never validated `spec.icon` or input options, so invalid values carried over are common.
- **Place** every `_inputs` key where its field is. Keys may name fields at any depth, or dotted paths. A key that names no field in `value` often names a field of an array item — Bookshop cascaded it into the item structure — so move it there. Delete it only if nothing has the field — see [configuration-gotchas.md § An `_inputs` key that names no field is ignored](../cloudcannon-configuration/configuration-gotchas.md#an-_inputs-key-that-names-no-field-is-ignored).
- **Diff** the keys in content against `value`. Keys content has and the blueprint never did are either dead (no template reads them — leave them out) or live (add them to `value`).
- **Check** blueprint values against the region type that will edit them. Bookshop rendered a bare number (`number: 200`) fine; a text region bound to it shows an error card — see [editable-regions.md § Value types per region](../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Link** each array input to its structure — see [structures.md](../cloudcannon-configuration/structures.md).

## Renaming `_bookshop_name`

**MUST:** rename the key and keep the value. `_bookshop_name: home/hero` becomes `_name: home/hero`.
**Why:** the value is the component path, and a grouped path (`home/hero`, `about/hero`) keeps components with the same short name apart. Flattening them means renaming components and rewriting every content value.

- **Rename** the key everywhere it appears — content files, schema files, structure values, pages outside any collection, and component code that reads it (nested buttons often do). `grep -rn _bookshop_name . --exclude-dir=node_modules` lists them.
- **Set** `id_key: _name` on every structure, nested ones included, and `data-component-key="_name"` on each component array.
- **Keep** each component resolvable under the same name — the SSG file says how.

**Common miss:** a dispatcher that guards its lookup (`Component && …`) makes a missed rename vanish silently rather than fail the build. Only the baseline diff catches it.

## Removing Bookshop

Do this straight after step 3.

- [ ] Remove `npx @bookshop/generate` from `.cloudcannon/postbuild`. Move every other hook step — in `postbuild` or `prebuild` — into the build command, see [build-commands.md](../cloudcannon-configuration/build-commands.md). If the build script runs steps in parallel (`run-p build:*`), chain the moved steps after it with `&&`. Delete a hook once it is empty.
- [ ] Remove the SSG's Bookshop plugin, module or integration.
- [ ] Remove the `@bookshop/*` dependencies.
- [ ] Build straight away. A package the site uses but never declared (`sass`, often) may have arrived only through Bookshop — install each missing one as a direct dependency, at the version the baseline resolved (`npm ls <package>` in the baseline), so the output doesn't change.
- [ ] Remove the Bookshop npm scripts (`bookshop`, `update-bookshop`). A `new-component` script writes `*.bookshop.yml` files nothing reads now — remove it, or rewrite it to write a structure value.
- [ ] Remove each `*.bookshop.yml` once its structure value is written, the `bookshop/` config directory, and the component library directory once it is empty.
- [ ] Remove path aliases only the Bookshop dispatcher used (`tsconfig.json`, site config), component-library paths in CSS tooling config (Tailwind `content`, PostCSS), and Bookshop entries in `.gitignore`.
- [ ] Build, and diff against the baseline.

## Regions on a former Bookshop site

The census and checklists in [cloudcannon-visual-editing](../cloudcannon-visual-editing/SKILL.md) apply unchanged. These differ:

- **Bookshop's coverage is not a census.** Its bindings made whole components clickable; every field now needs its own region. Text that was hardcoded under Bookshop gets a census row and the usual treatment decision.
- **Inputs** — give every field that a region edits its own `_inputs` entry: `markdown` with `options` if it holds formatting, `text` or `textarea` if it doesn't. The input sets the region's toolbar — see [configuration-gotchas.md § Set region toolbars on the input](../cloudcannon-configuration/configuration-gotchas.md#set-region-toolbars-on-the-input-not-in-_editablestext-or-block).
- **Data files shared partials read** need `data_config` entries. Bookshop's covered only data its live engine read — check every data file a header, footer or other shared partial reads.
- **Hand-written `data-cms-bind` / `data-cms-edit`** are CloudCannon's older bindings, not Bookshop, and keep working beside regions. Converting them is a census decision. Bookshop's own bindings were added in the browser and never appear in source.

## Common mistakes

| Excuse                                                                 | Reality                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "The committed config already has `_structures`"                       | Check it has `values`, and that the page-builder input links to it. Bookshop generated them at build time.            |
| "Bookshop made it editable, so it's editable"                          | Bookshop's bindings are gone. Every field needs its own region, and every section a census row.                       |
| "I'll flatten the component names while I'm here"                      | Every content file stores the name. Keep the grouped path and rename only the key.                                    |
| "The `_inputs` came across from the `.bookshop.yml`, so they're right" | They were never validated, and some belong on array-item structures. Check each key against where its field is.       |
| "This `_inputs` key names no field, so I'll delete it"                 | Check the array items first. Bookshop cascaded component inputs into item structures.                                 |
| "I'll rename `_bookshop_name` now and fix the templates later"         | The build breaks the moment the key changes. Rename, resolve and dispatch in one step.                                |
| "I'll leave Bookshop installed until the regions are done"             | It keeps rewriting components and supplying dependencies, so every build until then proves less. Remove it at step 4. |
