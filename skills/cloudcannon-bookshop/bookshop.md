# How Bookshop works

The concepts every Bookshop site shares. Template syntax and file locations differ per SSG — [Astro](astro/bookshop.md), [Hugo](hugo/bookshop.md).

## The pieces

| Piece                 | What it is                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component library     | A directory of components, each a template plus a `*.bookshop.yml` (and optionally a `.scss`). Its root is the parent of `bookshop/bookshop.config.cjs` |
| `bookshop.config.cjs` | Names the live-editing engine (`engines: { "@bookshop/hugo-engine": {} }`) and optional `ignoreFilePatterns`                                            |
| The SSG plugin        | Lets the site's templates render library components — a Hugo module, an Astro integration, a Jekyll gem, an Eleventy plugin                             |
| `@bookshop/generate`  | Runs in `.cloudcannon/postbuild`, after the site builds. Writes `_structures` into the build output and injects the live-editing script                 |
| The live engine       | A browser build of the SSG's renderer that re-renders components in the Visual Editor as the editor types                                               |
| `_bookshop_name`      | The key in front matter that names which component a block is                                                                                           |

## Component names

A component's name is its path under `components/`, without the extension. A repeated last segment collapses: `components/home/hero/hero.hugo.html` is `home/hero`. That name is the `_bookshop_name` value in content and the component path in every call.

## `*.bookshop.yml`

One per component. The format can also be `.yaml`, `.toml`, `.json`, `.js` or `.cjs`.

```yaml
spec:
  structures: [content_blocks]
  label: Counter
  description: Counter section
  icon: functions
  tags: [stats]

blueprint:
  title: Scale your
  numbers:
    - number: 200
      text: Venture capital raised
  button: bookshop:button

preview:
  title: Scale your business

_inputs:
  numbers:
    comment: Up to four
```

| Key               | Meaning                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec.structures` | Which `_structures.<key>` lists this component joins. An array input pointing at `_structures.content_blocks` can then add it                           |
| `spec.label` etc. | Picker metadata. Every other `spec.*` key passes through onto the structure value too                                                                   |
| `blueprint`       | The component's props and their values when it is added. Should list every prop the template reads                                                      |
| `preview`         | Values merged over the blueprint for the component browser only. CloudCannon never sees it                                                              |
| `_inputs`, `_*`   | Passed through to the structure value, and cascaded into the structures generated for nested arrays                                                     |
| `bookshop:<name>` | In a blueprint: a nested component slot. `[bookshop:<name>]` is an array of them; `bookshop:structure:<key>` a slot for any component in that structure |

A `<name>.preview.<ext>` or `<name>.icon.<ext>` image beside the component becomes the picker thumbnail.

## What `@bookshop/generate` does

**MUST:** treat everything it produces as absent from the repo. It runs after the build, on CloudCannon, and writes into the output.
**Why:** the committed `cloudcannon.config.yml` often has `_structures` keys with no `values` — the values only ever existed in the built site.

- **Structures.** One structure value per `*.bookshop.yml`, merged into the build's `_cloudcannon/info.json`, with `id_key: _bookshop_name`. The blueprint becomes `value`, with `_bookshop_name` added.
- **Blueprint rewrites.** An array of objects becomes an empty array plus a generated structure for its items, using the first item as the item's value. A `bookshop:<name>` slot becomes an object input pointing at a generated `_structures._bookshop_single_component_<name>`, with a `null` value. A `!` suffix (`bookshop:button!`) starts it filled in instead.
- **Live editing.** Every built page containing Bookshop's HTML comments gets the live-editing script, and `_cloudcannon/bookshop-live.js` is built.
- **Thumbnails** are copied into the output and set on the structure values.

It fails without `_cloudcannon/info.json` in the output, so it only runs on CloudCannon, not locally.

## Live editing

Bookshop wraps each component call in HTML comments at build time. In the Visual Editor, the live engine reads those comments, re-renders the components whose data changed, and swaps the new markup into the page.

- **Only the library reaches the editor.** The live engine renders library components and shared helpers; site templates outside the library aren't available. Hugo sites can add files through `extraFiles` in `bookshop.config.cjs`.
- **Data passes straight through.** Logic in a layout between front matter and the component call (reassigning, filtering) breaks live editing for that component. Put the logic inside the component.
- **Site data needs `data_config`** in `cloudcannon.config.yml` to be available to live renders.
- **Templates can branch on live editing** through the SSG's flag (`env_bookshop_live`, `ENV_BOOKSHOP_LIVE`) — for code that can't run in the browser.

## Visual data bindings

Bookshop makes each top-level component clickable in the editor by adding `data-cms-bind` attributes to its elements **in the browser**, not in the built HTML. Clicking one opens that component's data in the sidebar. `--disable-bindings` on `@bookshop/generate` turns them off.

`data-cms-bind` or `data-cms-edit` in the site's source was written by hand — CloudCannon's older visual data bindings, independent of Bookshop.

## Shared helpers

A library also has `shared/<ssg>/` templates — helpers rendered by name rather than selected by `_bookshop_name`. The usual one is `page`, which loops over `content_blocks` and renders each block as its component. Arrays of components have to render through a helper or a component for adding and reordering to work live.

## Versions

**MUST:** keep every Bookshop package at the same version — the npm packages, and the Hugo module or Jekyll gem — pinned exactly.
**Why:** they release together. The live engine comes from the site's `node_modules` while the rest comes with `@bookshop/generate`, and a mismatch logs a version error in the editor's console.

`npx @bookshop/up@latest` upgrades all of them together.

## Component browser

`npx @bookshop/browser` serves a local browser of every component with its `preview` data. A page can embed it; `@bookshop/generate` then hosts it on CloudCannon. It is a development aid — nothing on the site depends on it.
