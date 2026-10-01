# Bookshop in Hugo

Hugo's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece          | Location                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library        | `component-library/`, with its own `config.toml` and `go.mod` — it is a Hugo module                                                                                    |
| Config         | `component-library/bookshop/bookshop.config.cjs`, naming `@bookshop/hugo-engine`                                                                                       |
| Components     | `component-library/components/<path>/<name>.hugo.html` (or the flat `components/<path>.hugo.html`)                                                                     |
| Shared helpers | `component-library/shared/hugo/<name>.hugo.html`                                                                                                                       |
| Module wiring  | The site config: a `replacements` line pointing a local module path at `../component-library`, then imports of that path and `github.com/cloudcannon/bookshop/hugo/v3` |
| Module version | `go.mod` — `github.com/cloudcannon/bookshop/hugo/v3 vX.Y.Z`, matching the npm packages                                                                                 |

The library's `config.toml` mounts itself at `layouts/partials/bookshop` and `assets/bookshop`, which is how the site's templates reach it.

## Template calls

| Call                                                                     | Does                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{{ partial "bookshop" (slice "hero" (dict "title" .Params.title)) }}`   | Renders component `hero` with those props                                                                                                                          |
| `{{ partial "bookshop" . }}`                                             | Renders the component named by `._bookshop_name`, with the map as its props                                                                                        |
| `{{ partial "bookshop_partial" (slice "page" .Params.content_blocks) }}` | Renders shared helper `page`                                                                                                                                       |
| ``{{ partial "bookshop_bindings" `.Params.content_blocks` }}``           | Connects the next call to live editing. The argument is a **string** repeating the next call's data expression. Only needed in site layouts, not inside components |
| `{{ $f := partial "bookshop_scss" . }}`                                  | Returns every component's `.scss` (shared styles first), for the site's Sass pipeline                                                                              |

A layout's page builder is usually the pair:

```go-html-template
{{ partial "bookshop_bindings" `.Params.content_blocks` }}
{{ partial "bookshop_partial" (slice "page" .Params.content_blocks) }}
```

Components read their props directly: `{{ .title }}`.

## Live editing in Hugo

The live engine is real Hugo compiled to WebAssembly, holding only the library's files.

- **Branch** on `site.Params.env_bookshop_live` for anything the editor can't run — `resources.Get` returns nil and `site.GetPage` is unavailable there.
- **Read** data through `site.Data`, not `.Site.Data`, and give the data file a `data_config` entry.
- **Add** a site partial or shortcode the library needs through `extraFiles` on the engine in `bookshop.config.cjs`.
- **Keep** HTML comments when minifying: `minify.tdewolff.html.keepComments: true`. Without it Bookshop's markers are stripped and live editing never connects.

## Adding a component

`npx @bookshop/init --component <path>`, run in `component-library/`, creates `<name>.hugo.html`, `<name>.bookshop.yml` and `<name>.scss`. Then follow [../maintaining.md § Adding a component](../maintaining.md#adding-a-component).

## Upgrading

`npx @bookshop/up@latest` moves the npm packages and the Hugo module together (it runs `hugo mod get` for you). A Bookshop Hugo site is often pinned to an old Hugo — check the site's Hugo version window before upgrading either.
