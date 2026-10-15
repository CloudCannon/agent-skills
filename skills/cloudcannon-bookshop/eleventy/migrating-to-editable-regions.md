# Migrating to editable regions (Eleventy)

Eleventy's delta from [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md), which owns the step order, the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

`<includes>` below is the Eleventy includes directory: `_includes/` under the input directory unless the config sets `dir.includes`.

## What each step means in Eleventy

| Step in the base file                   | Eleventy work                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                | Baseline on Eleventy 3 and Node 20.19 or later, which the plugin needs. On an older Eleventy, ask the user before upgrading — [cloudcannon-visual-editing/eleventy/visual-editing.md § Setup steps — Liquid path](../../cloudcannon-visual-editing/eleventy/visual-editing.md#setup-steps--liquid-path) |
| Structures                              | The library root to copy into the scratch directory is the `bookshopLocations` directory. Write each value to a file beside its include — [§ Structure files](#structure-files)                                                                                                                         |
| Rename, resolve and dispatch — one step | [Install the plugin](#install-the-plugin-before-the-rewrite) first, then rename `_bookshop_name` → `_type`, [move the components](#move-components-into-the-includes-directory) and [rewrite the Bookshop tags](#rewrite-the-bookshop-tags). Region attributes wait for step 5                          |
| Remove Bookshop                         | Replace `bookshop-sass` — [§ Component styles](#component-styles) — then [remove the Bookshop plugin](#remove-the-bookshop-plugin)                                                                                                                                                                      |
| Add regions                             | Finish the setup in [cloudcannon-visual-editing/eleventy/visual-editing.md](../../cloudcannon-visual-editing/eleventy/visual-editing.md) — stubs and the script tag; the plugin is already installed. Then [§ Before adding regions](#before-adding-regions)                                            |

## Install the plugin before the rewrite

**MUST:** install `@cloudcannon/editable-regions` and add its Eleventy plugin before rewriting any `{% bookshop %}` tag — steps 3 and 4 of [cloudcannon-visual-editing/eleventy/visual-editing.md § Setup steps — Liquid path](../../cloudcannon-visual-editing/eleventy/visual-editing.md#setup-steps--liquid-path).
**Why:** the rewritten tags use `{% includeWith %}`, which the plugin registers. Without it the build fails on an unknown tag.

The plugin also writes `register-components.js` into the output. Leave that file out of the baseline diff.

## Move components into the includes directory

**MUST:** move each `<library>/components/<path>/<name>.eleventy.liquid` to `<includes>/<path>.liquid`, keeping the grouped path.
**Why:** `_type` is both the structure key and the include path, and the plugin resolves `data-component` as an include path — [cloudcannon-visual-editing/eleventy/visual-editing-reference.md § Component names are include paths](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#component-names-are-include-paths). Keeping the Bookshop path keeps every content value valid.

| Bookshop file                                                        | Include                                                                                       | `_type`      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------ |
| `component-library/components/home/hero/hero.eleventy.liquid`        | `_includes/home/hero.liquid`                                                                  | `home/hero`  |
| `component-library/components/left-right/left-right.eleventy.liquid` | `_includes/left-right.liquid`                                                                 | `left-right` |
| `component-library/components/<path>/<name>.scss`                    | The site's Sass directory, keeping the grouped path — [§ Component styles](#component-styles) | —            |
| `component-library/shared/eleventy/page.eleventy.liquid`             | Delete — the layout's loop replaces it                                                        | —            |
| `component-library/shared/eleventy/<name>.eleventy.liquid`           | `_includes/<name>.liquid`                                                                     | —            |

**Use** the `.liquid` extension, not `.html`. A name without an extension resolves to a `.liquid` include only; an `.html` include would need `.html` in every `_type` value.

**Check** each target path before moving. If an include already exists there, stop and ask the user: renaming a component means rewriting every content value that names it.

## Rewrite the Bookshop tags

| Bookshop                                                                                    | Editable regions                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{% bookshop_include "page" content_blocks: content_blocks %}` and the `page` helper's loop | `{% for block in content_blocks %}{% includeWith block._type, block %}{% endfor %}` in the layout. The region attributes from [§ Page builder blocks in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#page-builder-blocks-in-eleventy) come at step 5                              |
| `{% bookshop "{{block._bookshop_name}}" bind: block %}` anywhere else                       | `{% includeWith block._type, block %}`                                                                                                                                                                                                                                                                               |
| `{% bookshop "hero" bind: hero %}`                                                          | `{% includeWith "hero", hero %}`                                                                                                                                                                                                                                                                                     |
| `{% bookshop "image" image_path: page_image %}`                                             | `{% include "image", image_path: page_image %}`                                                                                                                                                                                                                                                                      |
| `{% bookshop "hero" bind: hero heading: page_title %}` — `bind` plus extra props            | **Reshape** so the component's data is one stored object, or use a plain `{% include %}`. `includeWith` spreads one object and drops anything else — [§ The include's data is the `data-prop` value](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-includes-data-is-the-data-prop-value) |
| `{% bookshop_include "<helper>" … %}`                                                       | `{% include "<helper>", … %}`                                                                                                                                                                                                                                                                                        |
| `{% if env_bookshop_live %}`                                                                | `{% if ENV_CLIENT %}` — [§ `ENV_CLIENT` in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#env_client-in-eleventy)                                                                                                                                                                   |
| A page holding `{% bookshop_component_browser %}`                                           | Delete the page and its stylesheet                                                                                                                                                                                                                                                                                   |

`includeWith` takes a variable or property, never an inline object. A markdown filter named `renderContent` must be renamed now: the plugin reserves the name, and the editor would show raw markdown — [§ Reserved names](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#reserved-names).

Bookshop's bindings made components clickable without any attributes, so a rewritten tag has no regions yet. Add them per the census at step 5.

## Structure files

Write each structure value to `<includes>/<path>.cloudcannon.structure-value.yml`, beside its include, and collect them per structure with `values_from_glob`:

```yaml
_structures:
  content_blocks:
    values_from_glob:
      - /src/_includes/sections/*.cloudcannon.structure-value.yml
  hero_blocks:
    values_from_glob:
      - /src/_includes/heroes/*.cloudcannon.structure-value.yml
```

- **Scope** each glob to its components' directories with a non-recursive `*`. A `**` glob pulls in nested components, such as buttons, that belong to other structures.
- **List** a component that joins several `spec.structures` by its own file path in each structure's `values_from_glob`. Don't copy the file.
- **Use** `values_from_glob`, not `_structures_from_glob`. `_structures_from_glob` loads whole named structures from a file, not one value per component, and pointing it at structure-value files leaves the Add modal empty — [structures.md § `values_from_glob` vs `_structures_from_glob`](../../cloudcannon-configuration/structures.md#values_from_glob-vs-_structures_from_glob).

## Component styles

`bookshop-sass` imported the library's `shared/styles/**/*.scss` first, then `components/**/*.scss`, each sorted by path, compiled them, and wrapped the output in `@media all, bookshop { … }`. Replace it so the compiled rules are unchanged:

- **Move** each component's `.scss` into the site's Sass directory, keeping the grouped path.
- **Write** an index that `@import`s the shared styles, then the components, in Bookshop's order, and import it from the site's Sass entry.
- **Add** `sass` as an explicit dev dependency. It often arrived only through `@bookshop/sass`; without it, the build's `sass` script may run a different global install.
- **Diff** the compiled CSS against the baseline. The only change should be the missing `@media all, bookshop` wrapper.

## Remove the Bookshop plugin

- [ ] Remove `addPlugin(pluginBookshop(…))` and its `require` or `import` from the Eleventy config.
- [ ] Remove `bookshop-sass` and `@bookshop/generate` from npm scripts, `.cloudcannon/prebuild` and `.cloudcannon/postbuild`.
- [ ] Remove every `@bookshop/*` package, `@bookshop/eleventy-bookshop` included.
- [ ] Delete the library directory once it is empty, and drop it from any `addPassthroughCopy`, `addWatchTarget` or ignore list.
- [ ] Run `grep -ri bookshop . --exclude-dir=node_modules --exclude-dir=_site`. Nothing should remain.

## Before adding regions

Bookshop's live engine rendered each component with the data its tag passed. The editable-regions plugin renders an include with only the data at its `data-prop`. Check every former component for these before writing region attributes:

- **Parent-scope reads.** A variable the include uses but its tag never passed works in the build and is `undefined` in the editor — [§ The include's data is the `data-prop` value](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-includes-data-is-the-data-prop-value).
- **Data built in the template.** An object assembled with `capture` and a YAML filter, then passed to a component, has no data path. Store the shape the component needs in content and in the structure value instead.
- **Helpers the editor can't run.** Image shortcodes and Node-only packages need a stub and an `ENV_CLIENT` branch — [§ The config runs in the browser](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-config-runs-in-the-browser).
