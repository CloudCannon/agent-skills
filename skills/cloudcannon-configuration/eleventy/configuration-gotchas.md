# Configuration Gotchas (Eleventy)

Eleventy-specific pitfalls. The cross-SSG gotchas — select inputs, numeric values, `_editables`, markdown tables, data references, previews, schema defaults — live in [../configuration-gotchas.md](../configuration-gotchas.md). Read that file first.

## Choose rich text inputs from the template engine

The rule is in [../configuration-gotchas.md § Choose text, markdown or html inputs](../configuration-gotchas.md#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field). Eleventy's two template languages escape output differently, so `{{ description }}` means a different input in each:

| Template renders the field                                           | Liquid (`.liquid`, and `.html` / `.md` by default)                             | Nunjucks (`.njk`)   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| `{{ description }}`                                                  | Unescaped: `html` when the content holds markup, `text` / `textarea` otherwise | `text` / `textarea` |
| `{{ description \| safe }}`                                          | —                                                                              | `html`              |
| Through the site's markdown filter (`{{ description \| markdown }}`) | `markdown`                                                                     | `markdown`          |

**MUST NOT:** treat `{{ description }}` in a Liquid template as escaped.
**Why:** Eleventy's Liquid prints values as raw HTML, while its Nunjucks escapes them. A field the content fills with tags or entities renders them as markup in Liquid and as literal text in Nunjucks, so the same field needs a different input on each.

- **Check** `htmlTemplateEngine` and `markdownTemplateEngine` in the Eleventy config before reading an `.html` or `.md` file's row: either can switch that file to Nunjucks.
- **Find** the markdown filter's name in the config (`addFilter("markdown", …)`, often built on `markdown-it`). Eleventy ships none, so every site names its own.
- **Read** the whole pipeline: `{{ description | markdown | safe }}` is still `markdown`.

## Markdown options for markdown-it

The rule is in [../configuration-gotchas.md § Match `markdown.options`](../configuration-gotchas.md#match-markdownoptions-to-the-sites-renderer-and-the-toolbar-to-markdownoptions). Eleventy renders Markdown with markdown-it, which reads tables and `~~strikethrough~~` but has no subscript or superscript syntax without plugins (`markdown-it-sub`, `markdown-it-sup`). Set `table` and `strikethrough` to `true`; set `subscript` and `superscript` only when the site loads those plugins.

**MUST:** check the `html` option of every markdown-it instance the site creates: the one passed to `setLibrary("md", …)` and the one behind its markdown filter.
**Why:** Eleventy's own instance sets `html: true`, but a site's own instance starts from markdown-it's default `html: false`, which escapes tags. Toolbar formatting saved as HTML (`<u>`, and any key left off) then shows as literal tags on the page. Either set `html: true` on the instance, or turn those toolbar buttons off.
