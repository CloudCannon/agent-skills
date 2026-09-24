# Migrating from Bookshop (Hugo)

Hugo's delta from [../migrating-from-bookshop.md](../migrating-from-bookshop.md), which owns the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

## Move components into `layouts/partials/`

**MUST:** move each `component-library/components/<path>/<name>.hugo.html` to `layouts/partials/<path>.html`, keeping the grouped path.
**Why:** `_name` is both the structure key and the partial path, and the editor resolves `data-component` against `layouts/partials/`. Keeping the Bookshop path keeps every content value valid.

| Bookshop file                                                  | Partial                                                                            | `_name`      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| `component-library/components/home/hero/hero.hugo.html`        | `layouts/partials/home/hero.html`                                                  | `home/hero`  |
| `component-library/components/left-right/left-right.hugo.html` | `layouts/partials/left-right.html`                                                 | `left-right` |
| `component-library/components/<path>/<name>.scss`              | `assets/scss/components/<name>.scss` — see [§ Component styles](#component-styles) | —            |
| `component-library/shared/hugo/page.hugo.html`                 | Delete — the page layout's `range` replaces it                                     | —            |

## Rewrite the Bookshop template calls

| Bookshop                                                                                                                                  | Editable regions                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ``{{ partial "bookshop_bindings" `.Params.content_blocks` }}`` + `{{ partial "bookshop_partial" (slice "page" .Params.content_blocks) }}` | The page-builder dispatcher in [visual-editing-reference.md § Page builder blocks in Hugo](visual-editing-reference.md#page-builder-blocks-in-hugo)                                                                                                                                                                 |
| `{{ partial "bookshop" . }}` (dispatch on `._bookshop_name`)                                                                              | `{{ partial ._name . }}`                                                                                                                                                                                                                                                                                            |
| `{{ partial "bookshop" (slice "processed-image" $props) }}`                                                                               | `{{ partial "processed-image" $props }}`                                                                                                                                                                                                                                                                            |
| ``{{ partial "bookshop_bindings" `…` }}`` before a standalone component in a page template                                                | Remove it. Wrap the partial call in `<editable-component data-component="<path>" data-prop="<key>">`, and pass the `data-prop` value as the partial's context                                                                                                                                                       |
| `{{ partial "bookshop" (slice "<name>" (dict "Params" .Params.x "tags" .Params.tags)) }}`                                                 | **Reshape the partial** so its context is exactly the `data-prop` value: `{{ partial "<name>" .Params.x }}`, reading anything else (taxonomies, page fields) through `page.Params` — [visual-editing-reference.md § The partial's context](visual-editing-reference.md#the-partials-context-is-the-data-prop-value) |
| `site.Params.env_bookshop_live`                                                                                                           | `site.Params.ENV_CLIENT`                                                                                                                                                                                                                                                                                            |
| `{{ $files := partial "bookshop_scss" . }}` in `<head>`                                                                                   | See [§ Component styles](#component-styles)                                                                                                                                                                                                                                                                         |

Bookshop's bindings made components clickable without any attributes, so a rewritten call has no regions yet. Add them per the census — [visual-editing.md](visual-editing.md).

## Component styles

`bookshop_scss` concatenated every component's `.scss` in `resources.Match` order. Replace it so the compiled CSS is unchanged:

- **SCSS site** — `@import` each moved file from the site's SCSS entry, in the order Bookshop's `resources.Match "bookshop/components/**.scss"` returned them — order changes which rule wins.
- **Tailwind or plain-CSS site** — the main stylesheet can't import SCSS. Give the components their own entry (`assets/scss/components.scss`) compiled with `css.Sass`, linked beside the main stylesheet.
- **Diff** the compiled CSS against the Bookshop build before moving on.

Bookshop components often emit a per-instance `<style>` block with interpolated values. Move the rule into the component's stylesheet and pass the value as a custom property on the root (`style="--hover-brightness: {{ .hover_brightness }}"`). That keeps the partial single-root for its array-item wrapper, and two instances no longer override each other.

## Swap the modules

Remove both Bookshop module imports and the local component-library replacement from the site config, then import editable-regions. YAML:

```yaml
# remove
module:
  replacements: local/component-library -> ../component-library
  imports:
    - path: local/component-library
    - path: github.com/cloudcannon/bookshop/hugo/v3

# add
module:
  imports:
    - path: github.com/CloudCannon/editable-regions
```

TOML:

```toml
# remove
[module]
replacements = "local/component-library -> ../component-library"
[[module.imports]]
path = 'local/component-library'
[[module.imports]]
path = 'github.com/cloudcannon/bookshop/hugo/v3'

# add
[[module.imports]]
path = 'github.com/CloudCannon/editable-regions'
```

- [ ] Run `hugo mod get github.com/CloudCannon/editable-regions@v0.0.21`, then `hugo mod tidy` to drop Bookshop from `go.mod` and `go.sum`.
- [ ] Delete `component-library/` (it may have its own `config.toml` and `go.mod`).
- [ ] Remove the npm scripts that ran `@bookshop/browser` alongside `hugo server`.

**Common miss:** a Bookshop Hugo site is often pinned to an old Hugo. Upgrade and build it unchanged before the swap — [visual-editing.md § Upgrading Hugo first](visual-editing.md#upgrading-hugo-first).
