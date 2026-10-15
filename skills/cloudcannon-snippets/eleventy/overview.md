# Snippets (Eleventy)

Eleventy-specific snippet guidance: shortcodes and includes in the Content Editor. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## The SSG layer is already done

A shortcode registered in the Eleventy config (`addShortcode`, `addPairedShortcode`, and their Liquid-, Nunjucks- and async-specific variants) is available in every content file the template engine processes, and an include is any file in the includes directory. Content needs no import. The only work is the CloudCannon layer: a `_snippets` entry per tag that teaches the editor its syntax.

## Which engine reads the content

**MUST:** pick Liquid or Nunjucks templates from the engine that processes each content file, not from the shortcode's definition.
**Why:** the same `{% name … %}` tag is a Liquid tag in one file and a Nunjucks tag in another, and the two template families parse arguments differently.

| Content file                                       | Engine                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `.md`                                              | `markdownTemplateEngine` in the Eleventy config — `liquid` unless set                                                           |
| `.html`                                            | `htmlTemplateEngine` — `liquid` unless set                                                                                      |
| `.liquid` / `.njk`                                 | Liquid / Nunjucks                                                                                                               |
| Any file with `templateEngineOverride` in its data | The engine it names, first in the list (`njk,md` is Nunjucks); `md` alone runs no template engine, so its tags are literal text |

The override can come from front matter or a directory data file (`*.11tydata.json`), so check both.

**MUST NOT:** give one shortcode both a Liquid and a Nunjucks `_snippets` entry. Use the template for the engine the shortcode's content uses. When content in both engines uses a positional shortcode, configure only the Nunjucks template (`eleventy_nunjucks_shortcode_positional_args`), since only its output builds in both, and convert space-separated calls (`{% pill "a" "b" %}`) to commas first.
**Why:** the editor doesn't pick an entry by the page's engine. The first entry listed matches the shortcode on every page, and a snippet inserted through the other entry is deleted on save. The Liquid template inserts `{% pill, "a" "b" %}`, which fails a Nunjucks build (`unexpected token: ,`). The Nunjucks template writes `{% pill "a", "b" %}`, which builds in both engines but doesn't match space-separated calls.

## Every tag in content must be accounted for

**MUST:** give every shortcode and include used in content a `_snippets` entry.
**Why:** without one, the editor has no way to edit the tag's arguments or contents.

List what content uses. The grep counts opening tags only; drop Liquid and Nunjucks keywords (`if`, `for`, `assign`, `set`, `end*`) from the result:

```bash
grep -rhoE '\{%-? *[a-zA-Z0-9_]+' <content dirs> | sed -E 's/\{%-? *//' | sort | uniq -c | sort -rn
```

| Tag is…                                                                  | Configure with                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| A shortcode or include with standard argument syntax                     | A `_snippets` entry using an Eleventy template — see [§ Shortcodes](#shortcodes) and [§ Includes](#includes) |
| A shortcode with non-standard syntax (filters in arguments, expressions) | A raw snippet — see [../raw.md](../raw.md)                                                                   |
| `{% raw %}`                                                              | See [§ Raw tags in content](#raw-tags-in-content)                                                            |
| `{% bookshop %}` / `{% bookshop_include %}`                              | The site is on Bookshop — see [§ Bookshop tags](#bookshop-tags)                                              |

## No `_snippets_imports`

Write explicit `_snippets` entries that name a template. Leave `_snippets_imports` out — see [../gotchas.md § `_snippets_imports`](../gotchas.md#_snippets_imports-can-match-unintended-content). CloudCannon's Eleventy docs show `eleventy_liquid: true` / `eleventy_nunjucks: true` in every example, but the templates resolve by name without them, as every built-in template does. The CLI baseline writes no `_snippets_imports` for Eleventy, so there is nothing to remove.

## Shortcodes

Pick the template from the engine, whether the shortcode wraps content, and how it takes arguments. The template table is in [../built-in-templates.md § Eleventy shortcodes and includes](../built-in-templates.md#eleventy-shortcodes-and-includes).

```yaml
_snippets:
  youtube:
    template: eleventy_liquid_shortcode_positional_args
    inline: false
    preview:
      text: YouTube video
      icon: smart_display
    definitions:
      shortcode_name: youtube
      positional_args:
        - editor_key: video_id
          type: string
  callout:
    template: eleventy_liquid_paired_shortcode_positional_args
    inline: false
    preview:
      text: Callout
      icon: announcement
    definitions:
      shortcode_name: callout
      content_key: body
      positional_args:
        - editor_key: style
          type: string
    _inputs:
      body:
        type: markdown
```

These match `{% youtube "abc123" %}` and `{% callout "warning" %}…{% endcallout %}`.

- **Read** the shortcode's function in the Eleventy config. Each parameter is a positional argument, in order. A paired shortcode's first parameter is the inner content, not an argument.
- **Use** a named-args template only for a Nunjucks shortcode that content calls with `key="value"` arguments. Eleventy passes those as one object, the function's last parameter. Liquid shortcodes take positional arguments only.
- **Mark** parameters the function treats as optional (a default value, an `if` guard) with `optional: true`.
- **Type** parameters the function compares with `true`/`false` or a number as `boolean` or `number`. A quoted value (`"true"`) is a string.
- **Round-trip** one use of each positional shortcode with two or more arguments before configuring the rest: open the file in the Content Editor, change one argument, insert a new instance, save, and check the diff. Edits keep the separators content already has; inserts use the template's own. Eleventy's Liquid and Nunjucks accept different separators, and the wrong one breaks the build.

## Includes

An include in content becomes a snippet the same way. `eleventy_liquid_include` and `eleventy_liquid_render` take `named_args` for the variables the tag passes; `eleventy_nunjucks_include` takes no arguments, since a Nunjucks include sees the page's own variables.

```yaml
_snippets:
  notice:
    template: eleventy_liquid_include
    inline: false
    preview:
      text: Notice
      icon: info
    definitions:
      include_name: notice
      named_args:
        - editor_key: message
          type: string
```

Set `include_name` to the name exactly as content writes it, including any directory and extension (`partials/notice.liquid`). Edits keep the include's existing syntax; inserts write `{% include 'name', key: "value" %}`, which Eleventy's Liquid reads correctly.

## Raw tags in content

`{% raw %}…{% endraw %}` keeps template syntax literal, usually in a post that documents Liquid or Nunjucks. Its snippets, `eleventy_liquid_raw` and `eleventy_nunjucks_raw`, come only from the import bundles, not from templates. When content uses `{% raw %}`, import just the one it needs:

```yaml
_snippets_imports:
  eleventy_liquid:
    include:
      - eleventy_liquid_raw
```

An `include` list keeps the import to that one entry — the exception in [../gotchas.md § `_snippets_imports`](../gotchas.md#_snippets_imports-can-match-unintended-content). The import still turns on the bundle's catch-all: any tag in content with no `_snippets` entry then shows as an "Unknown Shortcode" card instead of plain text. The card keeps the tag intact on save, but its arguments can't be edited, so give every tag an entry as [§ Every tag in content must be accounted for](#every-tag-in-content-must-be-accounted-for) requires. If content uses no `{% raw %}`, omit `_snippets_imports`.

## Bookshop tags

`{% bookshop %}` and `{% bookshop_include %}` in content mean the site is on Bookshop — see the [`cloudcannon-bookshop`](../../cloudcannon-bookshop/SKILL.md) skill. On a site that stays on Bookshop, configure them with `eleventy_liquid_bookshop_component` and `eleventy_liquid_bookshop_include`. A migration off Bookshop turns each into a real shortcode with its own explicit `_snippets` entry.

## Shortcodes and editable regions

A shortcode in a content body renders inside the `@content` region. It is editable there as a snippet; it is not a component region, and it can't be re-rendered on its own. For a section editors should compose from blocks, use a page-builder include instead — see [cloudcannon-visual-editing/eleventy/visual-editing-reference.md § Page builder blocks in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#page-builder-blocks-in-eleventy).

## Verification

- [ ] Every tag name from the grep above has a `_snippets` entry, or is a keyword
- [ ] Each entry's template family (Liquid or Nunjucks) matches the engine that processes the files using it
- [ ] `_snippets_imports` is absent, or holds only an `include` list of raw snippets
- [ ] `snippet: true` is in `_editables.content` (and any other toolbar that should insert snippets) — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] `markdown.options.escape_snippets_in_code_blocks: true` if any content shows tag syntax in code blocks — see [../gotchas.md](../gotchas.md#snippets-matching-inside-code-blocks)
- [ ] One content file per snippet type opened in the Content Editor, edited, and saved; the diff touches only the edited value
