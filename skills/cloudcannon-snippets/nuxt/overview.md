# Snippets (Nuxt) — entry point

Nuxt-specific snippet guidance: MDC components in Nuxt Content markdown. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## Which path the site is on

| Content is…                                                           | Snippet work                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown the site renders itself (markdown-it, remark), no components | Root guidance only — raw HTML snippets per [../snippets.md](../snippets.md#raw-snippets-for-inline-html-in-md-files), including the renderer check |
| Nuxt Content markdown with no MDC components                          | [§ Markdown settings](#markdown-settings) only                                                                                                     |
| Nuxt Content markdown with MDC components (`::callout`, `:icon{}`)    | [§ Markdown settings](#markdown-settings), then [§ MDC components to snippets](#mdc-components-to-snippets)                                        |

## Goal of the SSG layer

Nuxt Content already has one shared place for components: every component in `components/content/`, or registered globally, is available to every markdown file with no import. Keep that. A component content uses must live there.

## Markdown settings

Nuxt Content parses markdown with GFM and keeps raw HTML. Set the root `markdown` block to match, by the rule in [cloudcannon-configuration/configuration-gotchas.md § Match `markdown.options` to the site's renderer](../../cloudcannon-configuration/configuration-gotchas.md#match-markdownoptions-to-the-sites-renderer-and-the-toolbar-to-markdownoptions):

```yaml
markdown:
  engine: commonmark
  options:
    html: true
    table: true
    strikethrough: true
```

Leave `subscript` and `superscript` off: GFM reads a single `~text~` as strikethrough, not subscript.

## MDC components to snippets

There is no built-in snippet import for MDC. Each component content uses gets a raw snippet — see [../raw.md](../raw.md).

**MUST:** give every MDC component in content a `_snippets` entry, or keep its files out of the Content Editor — see [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for).
**Why:** CloudCannon's markdown editor doesn't know MDC. Unmatched `::name` lines become paragraph text, and a YAML props block inside a component reads as a heading or a rule, so saving the file rewrites the component into plain markdown.

List the component names and the syntax each is written in:

```sh
grep -rhoE '^\s*:{2,}[a-zA-Z][a-zA-Z0-9-]*' content | sort | uniq -c
grep -rhoE '(^|[^:]):[a-zA-Z][a-zA-Z0-9-]*\{' content | sort | uniq -c
```

The first lists block components with their colon depth; the second lists inline components.

### Block component with props and a body

```md
::callout{type="info"}
Body **markdown**
::
```

```yaml
_snippets:
  callout:
    snippet: "::callout[[props]]\n[[body]]\n::"
    inline: false
    preview:
      text: Callout
    params:
      props:
        parser: key_values
        options:
          models:
            - editor_key: type
              type: string
          format:
            root_boundary:
              start: "{"
              end: "}"
            remove_empty_root_boundary: true
            root_value_delimiter: "="
            root_pair_delimiter:
              - " "
            string_boundary:
              - '"'
            allow_implied_values: true
      body:
        parser: content
        options:
          editor_key: body
          allow_nested: true
          trim_text: true
    _inputs:
      type:
        type: select
        options:
          values: [info, warning, success]
      body:
        type: markdown
```

### Syntax forms

| Form in content                                                   | Snippet                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `::name{key="value"}` with a body                                 | As above                                                                                                                   |
| `::name{key="value"}` with no body, closed by `::`                | The same, without the `body` param: `"::name[[props]]\n::"`                                                                |
| A YAML props block (`---` … `---`) as the component's first lines | Rewrite to `{key="value"}` when every prop is a string or boolean; it renders the same. Ask the user first                 |
| A prop that takes an array or object (`:items='[…]'`)             | Move the value into the component, or keep the file out of the Content Editor                                              |
| Named slots (`#title`)                                            | A literal `\n#title\n` between two `content` params, one per slot                                                          |
| Nested blocks (`:::card` inside `::cards`)                        | Keep the file out of the Content Editor, or move its sections into page-builder blocks → [§ Nested blocks](#nested-blocks) |
| Inline components (`:icon{name="x"}`)                             | A snippet with `inline: true` and no body                                                                                  |
| Attribute shorthand (`{.class #id}`)                              | Leave it out of edited files; it has no keys for `key_values`                                                              |

### Nested blocks

**MUST:** keep a file with nested MDC blocks out of the Content Editor, with `_enabled_editors` that leaves out `content` → [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for). Or move its sections into page-builder blocks.
**Why:** a snippet can't round-trip nested MDC. The outer snippet either closes at the first inner `:::` block, or parses but corrupts the file on save by merging the inner blocks' closing and opening markers.

## Verification

- [ ] Every name from the greps has a `_snippets` entry, or its file is limited to source and data editing with the reason recorded
- [ ] `snippet: true` is in `_editables.content` — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] `nuxt generate` passes
- [ ] One content file per snippet type opened in the Content Editor, edited and saved; the diff touches only the edited value
