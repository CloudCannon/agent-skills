# Bookshop in Eleventy

Eleventy's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece          | Location                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library        | `component-library/`, or wherever `bookshopLocations` points — the path is relative to the Eleventy input directory                               |
| Config         | `<library>/bookshop/bookshop.config.{js,cjs}`, naming `@bookshop/eleventy-engine`                                                                 |
| Components     | `<library>/components/<path>/<name>.eleventy.liquid` (or the flat `components/<path>.eleventy.liquid`)                                            |
| Shared helpers | `<library>/shared/eleventy/<name>.eleventy.liquid`                                                                                                |
| Plugin         | The Eleventy config: `eleventyConfig.addPlugin(pluginBookshop({ bookshopLocations: ["component-library"] }))`, from `@bookshop/eleventy-bookshop` |
| Styles         | `bookshop-sass` (from `@bookshop/sass`) compiles every component's `.scss` into one file, run from an npm script or `.cloudcannon/prebuild`       |

Bookshop on Eleventy renders Liquid only. A site with Nunjucks templates uses Bookshop from its Liquid files alone.

## Template tags

| Tag                                                            | Does                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `{% bookshop "hero" title: page_title %}`                      | Renders component `hero` with those props             |
| `{% bookshop "hero" bind: hero %}`                             | Renders `hero` with every key of the object as a prop |
| `{% bookshop "{{block._bookshop_name}}" bind: block %}`        | Renders the component the block names                 |
| `{% bookshop_include "page" content_blocks: content_blocks %}` | Renders shared helper `page`                          |
| `{% bookshop_component_browser %}`                             | Embeds the component browser in a page                |

A layout's page builder is usually the `page` helper call, with the helper looping over the blocks:

```liquid
{% for block in content_blocks %}
  {% bookshop "{{block._bookshop_name}}" bind: block %}
{% endfor %}
```

Components read their props directly: `{{ title }}`.

## Live editing in Eleventy

The live engine is LiquidJS in the browser, holding only the library's files and Bookshop's own `slug`, `url` and `markdownify` filters. Filters, shortcodes and tags from the Eleventy config aren't there unless they are added as LiquidJS plugins through the engine's `plugins` option in `bookshop.config`.

- **Branch** on `env_bookshop_live` for anything the editor can't run — image shortcodes, plugin tags, filters the library doesn't define.
- **Write** the dynamic name as `"{{block._bookshop_name}}"`, with no spaces inside the braces, and pass the data with `bind:`. The live engine reads the name up to the first space, so `"{{ block._bookshop_name }}"` builds but never renders live.
- **Read** site data and `collections` from inside the component, not from a layout that passes them in. Give each data file a `data_config` entry. Collections carry front matter only — no `templateContent`.

## Adding a component

`npx @bookshop/init --component <path>`, run in the library root, creates `<name>.eleventy.liquid`, `<name>.bookshop.yml` and `<name>.scss`. Then follow [../maintaining.md § Adding a component](../maintaining.md#adding-a-component).

## Upgrading

`npx @bookshop/up@latest` moves every `@bookshop/*` package, `@bookshop/eleventy-bookshop` included, to one version.
