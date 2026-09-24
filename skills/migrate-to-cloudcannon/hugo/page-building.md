# Page Building (Hugo)

How to turn a Hugo site's unique-layout pages into a page-builder `pages` collection. When to reach for a page builder at all is SSG-agnostic — see [astro/page-building.md § When to reach for page builder](../astro/page-building.md#when-to-reach-for-page-builder).

## The shape

| Piece               | Hugo                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| Content             | `content_blocks:` array in the page's front matter, each item with `_name`             |
| Blocks              | One partial per block type, at `layouts/partials/<_name>.html`                         |
| Dispatcher          | A `range` over `.Params.content_blocks` in the page layout, calling `partial ._name .` |
| Editor re-rendering | Automatic — `data-component` is the partial path; no registration                      |
| Add-block menu      | `_structures.content_blocks` with `id_key: _name`                                      |

## Steps

1. **Create** a partial per block type under `layouts/partials/`, grouping related ones in subdirectories (`blocks/hero.html`, `home/hero.html`). The partial receives the block's front matter as `.`.
2. **Add** the dispatcher to every layout that renders page-builder pages — typically `_default/single.html` for leaf pages and `_default/list.html` (or `index.html`) for the home page and section list pages:

   ```go-html-template
   {{ define "main" }}
     <div data-editable="array" data-prop="content_blocks" data-component-key="_name">
       {{ range .Params.content_blocks }}
         <div data-editable="array-item" data-id="{{ ._name }}" data-component="{{ ._name }}">
           {{ partial ._name . }}
         </div>
       {{ end }}
     </div>
   {{ end }}
   ```

   The region attributes can wait for Phase 4, but the `range` and `partial ._name .` belong here.

3. **Move** each page's content into `content_blocks` in its content file — `content/_index.md` for the home page, `content/about.md` for `/about/`.
4. **Write** `_structures.content_blocks` with one value per block type, `_name` set to the partial path — see [structures.md](../../cloudcannon-configuration/structures.md).
5. **Point** the `pages` collection at `content`, excluding sections that have their own collection — see [configuration.md](../../cloudcannon-configuration/hugo/configuration.md#collections-from-content-sections).
6. **Build** and compare against the pre-migration output.

## Common mistakes

| Excuse                                                        | Reality                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I'll call the home page `content/home.md`"                   | Hugo builds the home page from `content/_index.md`. A `home.md` builds to `/home/`.                                                                                                  |
| "I'll make a `homepage` collection"                           | One `pages` collection holds the home page, about, contact and landing pages, with several schemas if needed.                                                                        |
| "The dispatcher only needs to be in `single.html`"            | `_index.md` pages — the home page and section list pages — render through the list layout. Put the dispatcher in both, or in a shared partial both call.                             |
| "I'll look the partial up from a map of `_name` → partial"    | Name partials by their `_name` instead. `partial ._name .` needs no map, and the editor resolves the same name.                                                                      |
| "The block can render `.Content`"                             | `.Content` is empty in the editor. A block renders only its own front matter.                                                                                                        |
| "I'll put `data-editable=\"array-item\"` inside each partial" | It belongs on the dispatcher's wrapper — see [Wrapper elements around partials](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#wrapper-elements-around-partials). |

## Reference blocks vs inline blocks

A block that renders shared content (a CTA used on every page) should read it from a data file rather than duplicate it into every page's `content_blocks`. The trade-off is the same as in Astro — [astro/page-building.md § Reference blocks vs inline blocks](../astro/page-building.md#reference-blocks-vs-inline-blocks).
