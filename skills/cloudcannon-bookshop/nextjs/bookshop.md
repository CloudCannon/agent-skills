# Bookshop in Next.js

Next.js's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece                | Location                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library              | `component-library/`, holding `bookshop/bookshop.config.js` and `components/<path>/<name>.bookshop.yml` — no templates                                    |
| `bookshop.config.js` | Names no engine; it only marks the library root for `@bookshop/generate`                                                                                  |
| Components           | The site's React components, at a path matching the Bookshop name (`components/home/hero.jsx` for `home/hero`)                                            |
| Blocks renderer      | A site component that loops over `content_blocks` and picks each block's component by `_bookshop_name` — through a glob import of `components/`, or a map |
| `@bookshop/generate` | `npx @bookshop/generate` in `.cloudcannon/postbuild`; `package.json` may list no `@bookshop/*` package                                                    |
| Live editing         | `CloudCannonConnect` from `@cloudcannon/react-connector`, in `pages/_app.*`                                                                               |
| Click-to-edit        | `data-cms-bind` on each block's root element, from a binding string the blocks renderer passes in                                                         |

## What doesn't apply

- **The SSG plugin.** Bookshop has none for Next.js; the blocks renderer resolves components itself.
- **The live engine and its script.** `@bookshop/generate` finds no Bookshop comments in Next's output, logs "No live editing connected as no pages contained Bookshop components", and writes structures only.
- **Shared helpers, `live_render` and the live-editing flag.** Nothing renders through Bookshop.
- **Version matching.** With no engine or plugin, `@bookshop/generate` is the only Bookshop code that runs.

## Maintaining

[../maintaining.md](../maintaining.md) applies, with these changes:

- **Create** the React component at the path the blocks renderer resolves, as well as the `*.bookshop.yml`.
- **Pass** the component's root element the binding string the renderer provides, as the other components do.
