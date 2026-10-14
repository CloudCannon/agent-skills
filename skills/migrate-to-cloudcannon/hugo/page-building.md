# Page Building (Hugo)

Read [../page-building.md](../page-building.md) first. This file covers only the Hugo differences: block partials, the dispatcher and the content files.

For pages a theme or module renders, see [audit.md § Classifying static pages](audit.md#classifying-static-pages) first.

## The shape

| Piece               | Hugo                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| Content             | `content_blocks:` array in the page's front matter, each item with `_name`             |
| Blocks              | One partial per block type, at `layouts/partials/<_name>.html`                         |
| Dispatcher          | A `range` over `.Params.content_blocks` in the page layout, calling `partial ._name .` |
| Editor re-rendering | Automatic — `data-component` is the partial path; no registration                      |
| Add-block menu      | `_structures.content_blocks` with `id_key: _name`                                      |

## Steps

1. **Create** a partial per block type under `layouts/partials/` — even on a site that uses `layouts/_partials/`, see [What the editor can re-render](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#what-the-editor-can-re-render) — grouping related ones in subdirectories (`blocks/hero.html`, `home/hero.html`). The partial receives the block's front matter as `.`.
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

   Write the region attributes now, along with the `range` and `partial ._name .` — the census gate covers existing page templates, not the dispatcher and block partials written here ([visual-editing.md § Section census](../../cloudcannon-visual-editing/visual-editing.md#section-census)).

3. **Move** each page's content into `content_blocks` in its content file — `content/_index.md` for the home page, `content/about.md` for `/about/`.
4. **Write** `_structures.content_blocks` with one value per block type, `_name` set to the partial path — see [structures.md](../../cloudcannon-configuration/structures.md).
5. **Point** the `pages` collection at `content`, excluding sections that have their own collection — see [configuration.md](../../cloudcannon-configuration/hugo/configuration.md#collections-from-content-sections).
6. **Build** and compare against the pre-migration output.

## Common mistakes

| Excuse                                                        | Reality                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I'll call the home page `content/home.md`"                   | Hugo builds the home page from `content/_index.md`. A `home.md` builds to `/home/`.                                                                                                  |
| "I'll make a `homepage` collection"                           | Use one `pages` collection — see [../audit.md § Census table](../audit.md#census-table).                                                                                             |
| "The dispatcher only needs to be in `single.html`"            | `_index.md` pages — the home page and section list pages — render through the list layout. Put the dispatcher in both, or in a shared partial both call.                             |
| "I'll look the partial up from a map of `_name` → partial"    | Name partials by their `_name` instead. `partial ._name .` needs no map, and the editor resolves the same name.                                                                      |
| "The block can render `.Content`"                             | `.Content` is empty in the editor. A block renders only its own front matter.                                                                                                        |
| "I'll put `data-editable=\"array-item\"` inside each partial" | It belongs on the dispatcher's wrapper — see [Wrapper elements around partials](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#wrapper-elements-around-partials). |
