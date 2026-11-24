# Bookshop in Nuxt

Nuxt's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece                | Location                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library              | `component-library/`, holding `bookshop/bookshop.config.js` and `components/<path>/<name>.bookshop.yml` — no templates                                                  |
| `bookshop.config.js` | Names no engine; it only marks the library root for `@bookshop/generate`                                                                                                |
| Components           | The site's Vue components, at a path matching the Bookshop name (`components/home/hero/hero.vue` for `home/hero`), registered globally (`components: { global: true }`) |
| Blocks loop          | A page that loops over `content_blocks` with `<component :is>`, turning each `_bookshop_name` into the component's auto-import name (`home/hero` → `HomeHero`)          |
| `@bookshop/generate` | `npx @bookshop/generate` in `.cloudcannon/postbuild`; `package.json` may list no `@bookshop/*` package                                                                  |
| Live editing         | `onCloudCannonChanges` from `@cloudcannon/visual-editor-connector`, in the page that renders the blocks                                                                 |
| Click-to-edit        | `data-cms-bind` on each block's root element, from a `dataBinding` prop the blocks loop passes in                                                                       |

## What doesn't apply

- **The SSG plugin.** Bookshop has none for Nuxt; the blocks loop resolves components itself.
- **The live engine and its script.** `@bookshop/generate` finds no Bookshop comments in Nuxt's output and writes structures only.
- **Shared helpers, `live_render` and the live-editing flag.** Nothing renders through Bookshop.
- **Version matching.** With no engine or plugin, `@bookshop/generate` is the only Bookshop code that runs.

## Maintaining

[../maintaining.md](../maintaining.md) applies, with these changes:

- **Create** the Vue component at the path the blocks loop resolves, as well as the `*.bookshop.yml`.
- **Bind** the component's root element to the `dataBinding` prop, as the other components do.
