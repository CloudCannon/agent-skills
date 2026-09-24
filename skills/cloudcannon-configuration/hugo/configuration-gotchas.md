# Configuration Gotchas (Hugo)

Hugo-specific pitfalls. The cross-SSG gotchas — select inputs, numeric values, `_editables`, markdown tables, data references, previews — live in [../configuration-gotchas.md](../configuration-gotchas.md). Read that file first.

## Match Goldmark in the markdown options

**MUST:** set each CloudCannon `markdown.options` key to match the site's Goldmark setting.
**Why:** CloudCannon converts between HTML and Markdown when editors use the rich text editor; Hugo renders the saved Markdown with Goldmark. Where they disagree, content changes on save — tables turn into raw HTML, which Goldmark's default `unsafe: false` then drops as `<!-- raw HTML omitted -->` without an error.

| Hugo setting (`markup.goldmark.…`) | Hugo default | CloudCannon `markdown.options` key                                                                 |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `renderer.unsafe`                  | `false`      | `html` — same value. With `false`, also keep toolbar options that emit HTML off                    |
| `renderer.hardWraps`               | `false`      | `breaks` — same value                                                                              |
| `extensions.table`                 | `true`       | `table` — same value, plus `table: true` in `_editables.content`                                   |
| `extensions.strikethrough`         | `true`       | `strikethrough` — same value                                                                       |
| `extensions.linkify`               | `true`       | `linkify` — same value                                                                             |
| `extensions.typographer`           | `true`       | `typographer: false` — Goldmark curls quotes at render time, so keep straight quotes in the source |

Read the site config (`hugo config | grep -A20 goldmark` prints the effective values) and set every row; the CLI baseline sets `table`, `strikethrough` and `linkify` to `false`. The generic rule is in [../configuration-gotchas.md § Markdown tables](../configuration-gotchas.md#set-markdownoptionstable-when-content-has-markdown-tables).

## Keep taxonomies top-level

**MUST NOT:** nest a taxonomy key (`tags`, `categories`, or anything under `taxonomies:` in the site config) inside an object, even to group it with a component's fields.
**Why:** Hugo builds term pages only from top-level front matter keys. A nested `post_hero.tags` renders fine in the hero and silently drops the post from every tag page.

```yaml
# ✓ taxonomy at the top level; the hero reads it from the page
tags: [hugo, cloudcannon]
post_hero:
  title: …
```

**Common miss:** nesting fields under one key so a component region can bind them (`data-prop="post_hero"`) and sweeping `tags` in with them. Pass the taxonomy to the partial separately instead.

## Quote numbers a text region displays

**MUST:** store a number shown through a text region as a string, and pin its input to `type: text`.
**Why:** a text region rejects any value that isn't a string — a bare YAML number (`price: 199`) shows an error card in the Visual Editor. Quoting alone isn't enough: without `type: text`, CloudCannon infers a number input and writes a number back on the next save.

```yaml
# content
price: "199"
# cloudcannon.config.yml, on the structure value
_inputs:
  price:
    type: text
```

Counters and prices are the usual cases. The figures still work anywhere the template does arithmetic on them — convert with `int` or `float` in the template (`{{ int .price }}`). The cross-SSG rule for text inputs is [../configuration-gotchas.md § Quote numeric values](../configuration-gotchas.md#quote-numeric-values-that-map-to-text-inputs).

## Match the site's front matter format

Hugo accepts YAML (`---`), TOML (`+++`) and JSON (`{ }`) front matter, and a site can mix them. CloudCannon reads and writes all three, but writes back in the format each file already uses.

- **Match** each schema file to the format of the collection it seeds.
- **Check** for mixed formats (`grep -rl '^+++' content | head`) before writing `_inputs` — a key's type can differ between formats (TOML has native dates; YAML dates can be strings).

## Hide Hugo's routing and build front matter

Hide the keys that change how Hugo builds a page rather than what it shows — editors changing them move or remove pages:

```yaml
_inputs:
  layout:
    hidden: true
  type:
    hidden: true
  aliases:
    hidden: true
  build:
    hidden: true
  cascade:
    hidden: true
```

Leave `draft`, `weight` and `date` visible — editors legitimately change them — with a `comment` on `draft` noting that draft pages are not built and can't open in the Visual Editor. Leave `slug` and `url` visible only if the collection's `url` pattern uses them ([collection-urls.md § Front matter that changes the URL](collection-urls.md#front-matter-that-changes-the-url)).
