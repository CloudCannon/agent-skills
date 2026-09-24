# Snippets (Hugo)

Hugo-specific snippet guidance: shortcodes in the Content Editor. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## The SSG layer is already done

A Hugo shortcode needs no import step and no plugin — anything in `layouts/shortcodes/` (or a theme's) is available in every content file. The only work is the CloudCannon layer: a `_snippets` entry per shortcode that teaches the editor its syntax.

## Every shortcode in content must be accounted for

**MUST:** give every shortcode used in content either a `_snippets` entry or a built-in import.
**Why:** an unconfigured shortcode shows in the Content Editor as an "Unknown shortcode" block — editors can move or delete it, but not edit its arguments or contents.

List what content uses — the audit script does this — then configure each:

```bash
grep -rhoE '\{\{[<%] */?[a-zA-Z0-9_-]+' content | sed -E 's/\{\{[<%] *\/?//' | sort | uniq -c | sort -rn
```

| Shortcode is…                                             | Configure with                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| One of Hugo's built-ins (`youtube`, `vimeo`, `figure`, …) | `_snippets_imports.hugo.include` — see [§ Built-in shortcodes](#built-in-shortcodes)      |
| The site's own, standard argument syntax                  | A `_snippets` entry using a Hugo template — see [§ Custom shortcodes](#custom-shortcodes) |
| The site's own, non-standard syntax                       | A raw snippet — see [../raw.md](../raw.md)                                                |

## Built-in shortcodes

CloudCannon ships snippet definitions for Hugo's built-in shortcodes, named `hugo_<shortcode>` (`hugo_youtube`, `hugo_vimeo`, `hugo_figure`). Load them with `_snippets_imports`, **naming only the ones the content uses, plus any you deliberately offer editors**:

```yaml
_snippets_imports:
  hugo:
    include:
      - hugo_figure
      - hugo_youtube
```

This is the Hugo exception to [../gotchas.md § `_snippets_imports`](../gotchas.md#_snippets_imports-can-match-unintended-content): the import is how built-in shortcodes get snippet support at all, and an `include` list keeps it to the entries you chose. The CLI baseline writes `hugo: { exclude: [hugo_instagram] }`, which imports everything else — replace it with an `include` list. `hugo_instagram` needs an Instagram API key in the Hugo config to work, so leave it out unless the site has one.

If content uses no shortcodes and none are offered, omit `_snippets_imports` altogether.

Full list and options: [Snippets using Hugo shortcodes](https://cloudcannon.com/documentation/articles/snippets-using-hugo-shortcodes/).

## Custom shortcodes

Pick the template from the shortcode's delimiters, whether it wraps content, and how it takes arguments. The template table is in [../built-in-templates.md § Hugo shortcodes](../built-in-templates.md#hugo-shortcodes).

```yaml
_snippets:
  alert:
    template: hugo_shortcode_named_args
    inline: false
    preview:
      text: Alert
      icon: announcement
    definitions:
      shortcode_name: alert
      named_args:
        - editor_key: message
          source_key: alert_message
          type: string
        - editor_key: color
          type: string
          optional: true
    _inputs:
      color:
        type: select
        options:
          values: data.colors
          value_key: value
```

- **Read** the shortcode's template (`layouts/shortcodes/<name>.html`) for every `.Get "<arg>"` or `.Params.<arg>` — each is a named arg. `.Get 0`, `.Get 1` are positional args, in order.
- **Check** for `.Inner` — a shortcode that reads it is paired, and needs a `paired` template with a `content_key`.
- **Match** the delimiters the content uses: `{{< >}}` passes inner content through as-is, `{{% %}}` renders it as markdown first. They are different templates.
- **Mark** arguments the template treats as optional (`with .Get "x"`, `default`) with `optional: true`, and set `remove_empty: true` on named args that shouldn't be written when empty.

## Shortcodes and editable regions

A shortcode in a content body renders inside the `@content` region. It is editable there as a snippet; it is not a component region, and it can't be re-rendered on its own. For a section editors should compose from blocks, use a page-builder partial instead — see [migrate-to-cloudcannon/hugo/page-building.md](../../migrate-to-cloudcannon/hugo/page-building.md).

## Verification

- [ ] Every shortcode name from the grep above has an `include` entry or a `_snippets` entry
- [ ] `_snippets_imports.hugo` uses `include`, not `true` or `exclude`
- [ ] `snippet: true` is in `_editables.content` (and any other toolbar that should insert snippets) — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] `markdown.options.escape_snippets_in_code_blocks: true` if any content shows shortcode syntax in code blocks — see [../gotchas.md](../gotchas.md#snippets-matching-inside-code-blocks)
- [ ] One content file per snippet type opened in the Content Editor, edited, and saved; the diff touches only the edited value
