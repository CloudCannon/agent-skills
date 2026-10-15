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
