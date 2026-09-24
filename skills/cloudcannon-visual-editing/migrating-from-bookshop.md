# Migrating from Bookshop

Replace Bookshop with `@cloudcannon/editable-regions` on a site that already uses Bookshop components. This file owns the cross-SSG mapping. What differs per SSG lives in that SSG's `migrating-from-bookshop.md` — [Hugo](hugo/migrating-from-bookshop.md).

Read it during the audit (Phase 1). The work lands across the migration phases in this order:

| Phase             | Bookshop work                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2. Configuration  | Write `_structures` from `*.bookshop.yml` — [§ Writing `_structures`](#writing-_structures-from-bookshopyml)                                                                                                                                                      |
| 3. Content        | **Together, in one step:** rename `_bookshop_name`, move the components to where the SSG resolves them, and replace the Bookshop dispatcher with the SSG's native one. Renaming alone breaks the build, because Bookshop's dispatcher selects on `_bookshop_name` |
| 4. Visual editing | Add the regions Bookshop wired implicitly, then [§ Removing Bookshop](#removing-bookshop)                                                                                                                                                                         |

Throughout, compare against the unmodified site built on the target SSG version — the parity baseline.

## Detecting Bookshop

| Signal                                                                                  | Where                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A `component-library/` directory holding `*.bookshop.yml` files                         | Repo root                                            |
| `@bookshop/*` packages (`@bookshop/generate`, `@bookshop/browser`, an engine)           | `package.json`                                       |
| `npx @bookshop/generate` in a build hook                                                | `.cloudcannon/postbuild`                             |
| `_bookshop_name` keys                                                                   | Content front matter, usually under `content_blocks` |
| Bookshop template calls (`bookshop`, `bookshop_bindings`, `bookshop_partial`)           | Layouts — see your SSG's file for the exact syntax   |
| `bookshop-live.js`, `bookshop-hosted.js`, `bookshop.css` in `.gitignore`                | Repo root                                            |
| `data-cms-bind` / `data-cms-edit` attributes (CloudCannon's older visual data bindings) | Components and layouts                               |

## What Bookshop did that you now do explicitly

| Bookshop did                                                                         | Replace with                                                                                                                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rendered components live in the editor through its engine                            | Component regions. The component must be resolvable by the SSG's editable-regions integration — see [editable-regions.md § EditableComponent](editable-regions.md#editablecomponent) |
| Made every component clickable through bindings                                      | Explicit `data-editable` regions on every field and list. Run the section census as for any site — Bookshop coverage is not a census                                                 |
| Synthesised `_structures` from `*.bookshop.yml` at build time (`@bookshop/generate`) | Hand-authored `_structures` in `cloudcannon.config.yml` — see [§ Writing `_structures` from `*.bookshop.yml`](#writing-_structures-from-bookshopyml)                                 |
| Selected a component with `_bookshop_name`                                           | `_name` (or any key), used as both the structure `id_key` and the array's `data-component-key` — see [§ Renaming `_bookshop_name`](#renaming-_bookshop_name)                         |
| Exposed a live-editing flag to templates                                             | The SSG's `ENV_CLIENT` — see [visual-editing-reference.md § Detecting the editor](visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic)                    |
| Collected co-located component styles                                                | The site's own stylesheet pipeline. Move each component's stylesheet in with the rest                                                                                                |

## Writing `_structures` from `*.bookshop.yml`

**MUST:** hand-write a structure value for every component before removing the Bookshop build hook.
**Why:** `@bookshop/generate` built `_structures` at build time and they were never committed. A committed config can show `_structures.content_blocks` with `style: modal` and no `values` — delete the hook without writing them and the "Add" modal is silently empty.

Each `*.bookshop.yml` maps onto one structure value:

| `*.bookshop.yml` key       | Structure value key                                         |
| -------------------------- | ----------------------------------------------------------- |
| `spec.structures: [<key>]` | Which `_structures.<key>` the value goes in                 |
| `spec.label`               | `label`                                                     |
| `spec.description`         | `description`                                               |
| `spec.icon`                | `icon` — validate it against the schema's icon enum         |
| `spec.tags`                | `tags`                                                      |
| `blueprint`                | `value`, plus the component key (`_name: <component name>`) |
| `_inputs`                  | `_inputs` on the structure value                            |
| `preview`                  | Drop it — it only fed Bookshop's component browser          |

```yaml
_structures:
  content_blocks:
    id_key: _name
    style: modal
    values:
      - label: Counter
        description: Counter section
        icon: functions
        value:
          _name: global/counter
          title: Scale your
          numbers:
            - number: "200"
              text: Venture capital raised
        _inputs:
          numbers[*].number:
            type: text
```

Then, for each structure value:

- **Validate** the result against the configuration schema — see [cloudcannon-configuration](../cloudcannon-configuration/SKILL.md). Bookshop never validated `spec.icon` or input options, so invalid values carried over are common.
- **Check** that every `_inputs` key names a field in `value`. The schema can't catch a key that names nothing, and an `_inputs` entry on a misspelled path silently never applies.
- **Check** blueprint values against the region type that will edit them. Bookshop rendered a bare number (`number: 200`) fine; a text region bound to it shows an error card. Quote display figures as strings and pin the input to `type: text`.
- **Link** each array input to its structure — see [structures.md](../cloudcannon-configuration/structures.md).

## Renaming `_bookshop_name`

**MUST:** rename the key and keep the value. `_bookshop_name: home/hero` becomes `_name: home/hero`.
**Why:** the value is the component path, and a grouped path (`home/hero`, `about/hero`) keeps components with the same short name apart. Flattening them means renaming components and rewriting every content value.

- **Rename** the key in every content file, schema file, and structure `value`.
- **Set** `id_key: _name` on the structure and `data-component-key="_name"` on the page-builder array, so one key selects the structure and names the component.
- **Keep** each component resolvable under the same name — the SSG file says where it has to live.

## Removing Bookshop

Do this after the structures are written and the regions are in place.

- [ ] Remove `npx @bookshop/generate` from `.cloudcannon/postbuild`. Move any other step in it (search indexing) into the build command — see [build-commands.md](../cloudcannon-configuration/build-commands.md). Delete the hook if it is then empty.
- [ ] Remove the `@bookshop/*` dependencies and the Bookshop npm scripts (`bookshop`, `new-component`, `update-bookshop`).
- [ ] Remove the SSG's Bookshop plugin or module and the `component-library/` directory.
- [ ] Remove the Bookshop entries from `.gitignore`.
- [ ] Remove every `data-cms-bind` and `data-cms-edit` attribute, replacing each with the matching region — `grep -rn 'data-cms-' layouts component-library`.
- [ ] Add `_editables.text` and `_editables.block` if regions use those `data-type`s — a Bookshop site usually defines only `_editables.content`. See [configuration-gotchas.md § `_editables`](../cloudcannon-configuration/configuration-gotchas.md#_editables-key-to-schema-mapping).
- [ ] Build, and diff the text and `<img>` count of every page against the Bookshop build. Moving component markup is where regressions come from.

## Common mistakes

| Excuse                                                                 | Reality                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "The committed config already has `_structures`"                       | Check it has `values`. Bookshop generated them at build time; the committed file often has the key and nothing under it. |
| "Bookshop made it editable, so it's editable"                          | Bookshop's bindings are gone. Every field needs its own region, and every section a census row.                          |
| "I'll flatten the component names while I'm here"                      | Every content file stores the name. Keep the grouped path and rename only the key.                                       |
| "The `_inputs` came across from the `.bookshop.yml`, so they're right" | They were never validated. Check each key against the structure's `value` fields.                                        |
