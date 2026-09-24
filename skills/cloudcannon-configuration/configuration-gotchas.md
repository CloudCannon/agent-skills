# Configuration Gotchas

Cross-SSG patterns and pitfalls in `cloudcannon.config.yml`. What differs per SSG lives in that SSG's own `configuration-gotchas.md` — [Astro](astro/configuration-gotchas.md), [Hugo](hugo/configuration-gotchas.md).

**Quick reference for the four most-missed rules:**

1. Array item previews: `[*]` only for plain arrays — structured arrays need preview on the structure value ([§ Array item previews](#array-item-previews---vs-structure-value))
2. Every `type: markdown` needs explicit `options:` ([SKILL.md common mistakes](SKILL.md#common-mistakes))
3. Data files that hold like-shaped items must be arrays, not objects keyed by slug ([astro/configuration.md § Content specifics](astro/configuration.md#content-specifics))
4. Divergent top-level keys break structure matching ([structures.md § Common mistakes](structures.md#common-mistakes))

## Configure icon fields as select inputs

When a template uses an icon library (e.g. Iconify sets like `tabler:*` and `flat-color-icons:*`), configure the `icon` input as a `select` with `allow_create: true` rather than a plain `text` field. Non-technical editors can't guess icon names, but they can pick from a curated list with friendly display names.

### Setup steps

1. Grep content files for every unique `icon:` value used in the template.
2. Add them as object values with `name` (human-readable label) and `id` (the Iconify value).
3. Set `value_key: id` so the stored value is the Iconify ID, not the whole object.
4. Set `preview.text` to show the friendly name in the dropdown.
5. Set `allow_create: true` so developers can still type custom icon names.
6. Add a `comment` linking to the icon set's browser (e.g. Iconify) so developers know where to find new names.

**Deriving friendly names:** strip the collection prefix (`tabler:`, `flat-color-icons:`), replace hyphens with spaces, title-case. For icons from secondary collections, add a suffix (e.g. "Template (Color)" for `flat-color-icons:template` vs "Template" for `tabler:template`).

### Inline values (fewer than ~20 icons)

For small icon sets, list the values directly on the input:

```yaml
_inputs:
  icon:
    type: select
    comment: "Pick an icon or type a custom [Iconify](https://icon-sets.iconify.design/) name"
    options:
      allow_create: true
      value_key: id
      preview:
        text:
          - key: name
      values:
        - name: Rocket
          id: tabler:rocket
        - name: Check
          id: tabler:check
        - name: Template (Color)
          id: flat-color-icons:template
```

### Data file values (~20+ icons)

When there are ~20 or more unique icons, move the list into a data file so editors can manage it without touching the CC config. Steps:

1. Create a data file (e.g. `data/icons.json`) containing the icon objects:

```json
[
  { "name": "Rocket", "id": "tabler:rocket" },
  { "name": "Check", "id": "tabler:check" },
  { "name": "Template (Color)", "id": "flat-color-icons:template" }
]
```

2. Expose the file in `data_config`:

```yaml
data_config:
  icons:
    path: data/icons.json
```

3. Add the data file to a collection in `collections_config` so editors can browse and add new icons:

```yaml
collections_config:
  data:
    path: data
    glob:
      - icons.json
    disable_add: true
```

4. Reference the data set on the input using `values: data.icons`:

```yaml
_inputs:
  icon:
    type: select
    comment: "Pick an icon or type a custom [Iconify](https://icon-sets.iconify.design/) name"
    options:
      allow_create: true
      value_key: id
      preview:
        text:
          - key: name
      values: data.icons
```

The rest of the input config (`allow_create`, `value_key`, `preview`) stays the same as the inline approach.

### Where the input definition goes

**MUST:** define `icon` on every structure value that has an `icon` field — in that value's own `_inputs` — rather than relying on one root-level entry to reach it.

Structures are designed to be portable: a structure value should carry its own input configuration and behave the same wherever it is used, not change based on configuration outside it. A root-level `_inputs.icon` does currently cascade into structure values, but that is behaviour likely to change, so treat the structure value as the place the input lives.

To avoid repeating the definition, put it in an input configuration file once and pull it into each structure value with `_inputs_from_glob`. The file must end in `.cloudcannon.inputs.yml`:

```yaml
# .cloudcannon/inputs/icon.cloudcannon.inputs.yml
icon:
  type: select
  comment: "Pick an icon or type a custom [Iconify](https://icon-sets.iconify.design/) name"
  options:
    allow_create: true
    value_key: id
    preview:
      text:
        - key: name
    values: data.icons
```

```yaml
# in each structure value (inline, or a *.cloudcannon.structure-value.yml file)
- label: Feature
  value:
    title:
    icon:
  _inputs_from_glob:
    - /.cloudcannon/inputs/icon.cloudcannon.inputs.yml
```

Page-level fields outside any structure (front matter `icon` on a collection's files) still take their input from `collections_config.<name>._inputs` or the root, as usual.

**Why:** the failure mode is not a wrong entry, it is a missing one. A migration that configures `icon` on the five widget-level fields it happened to look at, and leaves the per-item `icon` inside a dozen structure values undefined, gives editors a free-text box on exactly the fields they use most — and it looks correct in the config, because the entries that exist are right.

**Check:** every structure value with a key whose values come from a fixed set — `icon`, `variant`, `target`, `size`, `align`, `theme`, `columns` — has an `_inputs` entry for it, directly or via `_inputs_from_glob`. Sweep `cloudcannon.config.yml` and the `*.cloudcannon.structure-value.yml` files for those keys and confirm each one; a field with no matching entry is a text box.

**Common miss:** Do NOT use `values: data.icons[*].id` — this extracts only the raw ID strings (e.g. `tabler:rocket`), losing the `name` field entirely. Editors see cryptic Iconify IDs in the dropdown instead of friendly names like "Rocket". Use `values: data.icons` (the full objects) with `value_key: id` so the stored value is the ID but the dropdown displays the name via `preview.text`.

## Configure CSS class fields as select inputs

When a frontmatter field stores Tailwind/CSS classes that control visual appearance (icon colors, badge variants, card themes), configure it as a `select` with friendly labels. Editors shouldn't need to know CSS class names.

The pattern follows the same approach as icon selects: use `value_key: id` so the stored value is the raw class string, `preview.text` to show the friendly name, and `allow_empty: true` when the field has a component-level fallback default.

```yaml
_inputs:
  iconClass:
    type: select
    comment: Color theme for the icon background
    options:
      allow_empty: true
      value_key: id
      preview:
        text:
          - key: name
      values:
        - name: Blue
          id: bg-blue-500/10 text-blue-400
        - name: Purple
          id: bg-purple-500/10 text-purple-400
        - name: Pink
          id: bg-pink-500/10 text-pink-400
```

Common candidates: `iconClass`, `badgeClass`, `variant`, `colorScheme`, `theme` — any field where the template uses CSS classes to control visual styling. Grep content files for the field to collect the distinct values, then create friendly labels.

## Configure variant / enum-like fields as select inputs

When a frontmatter field has a small, closed set of valid values (`variant: primary | secondary | tertiary | link`, `target: _self | _blank`, `size: sm | md | lg`, `align: left | center | right`, `theme: light | dark`, `position: left | center | right`, etc.), configure it as a `select` input. Plain `type: text` lets editors type "main" or "Primary " (trailing space) and silently break the rendered output — components branch on exact string equality.

Identifying these fields:

- Anything the component code uses inside a switch/ternary/`class:list` against literal values (`variant === 'primary'`, `target === '_blank'`, etc.).
- Component prop types declared as `'a' | 'b' | 'c'` unions in TypeScript.
- Tailwind-style "pick a treatment" props that aren't an arbitrary class string (those go in the CSS-class section above) but a named option that the component then maps to classes internally.

If the option set is shared across more than one structure (variants, link targets), put it in `_select_data` once and reference it.

```yaml
_select_data:
  variants:
    - name: Primary
      id: primary
    - name: Secondary
      id: secondary
    - name: Tertiary
      id: tertiary
    - name: Link
      id: link
  link_targets:
    - name: Same window
      id: _self
    - name: New window
      id: _blank

_structures:
  _actions:
    style: modal
    values:
      - label: Action
        value:
          variant: primary
          text: Action
          href: "#"
          target: _self
        _inputs:
          variant:
            type: select
            options:
              value_key: id
              preview:
                text:
                  - key: name
              values: _select_data.variants
          target:
            type: select
            options:
              allow_empty: true
              value_key: id
              preview:
                text:
                  - key: name
              values: _select_data.link_targets
```

If the option set is local to one structure (e.g. a `columns: 2 | 3 | 4` field on a Features widget), inline the values:

```yaml
_inputs:
  columns:
    type: select
    options:
      value_key: id
      preview:
        text:
          - key: name
      values:
        - name: Two columns
          id: 2
        - name: Three columns
          id: 3
        - name: Four columns
          id: 4
```

`allow_create: true` is appropriate for icon fields (developers may want a custom Iconify name). For variants and other component-API enums, leave `allow_create: false` (the default) — typing a value the component doesn't recognise is always a bug.

Placement follows the same rule as icons: define the input on each structure value that has the key, and share one definition across them with `_inputs_from_glob`. See [§ Where the input definition goes](#where-the-input-definition-goes).

## Quote numeric values that map to text inputs

YAML parses bare numbers (`price: 29`) as integers, not strings. If the corresponding CloudCannon input is `type: text` (or defaults to text), CC throws "This text input is misconfigured. This input must have a text value." This affects both structure default values and content file frontmatter.

**Fix:** Either quote the value as a string (`price: "29"`) or configure the input as `type: number`. Quoting as a string is usually better — it's simpler and avoids breaking component code that does string operations on the value.

Common culprits: `price`, `amount`, `count`, `order`, `rating`. Structure default values follow the same rule.

## Verify the CloudCannon CLI's `source` path

**MUST NOT:** add `source` to `cloudcannon.config.yml`, and remove it if the CloudCannon CLI generates one.
**Why:** `source` is deployment-specific (monorepos). The CloudCannon root defaults to the repo root, so config can already reference any path in the repo.

## Title-derived slugs and `{title|slugify|lowercase}`

Some templates compute URLs from titles at build time using a custom slugify function. Don't assume CC's `slugify` filter produces identical output.

CC's `slugify` replaces non-alphanumeric characters with hyphens and collapses them. A typical custom function may remove non-alphanumeric characters instead. For simple titles both produce the same result, but for titles with apostrophes or special characters they diverge:

- "What's New" → CC slugify: `what-s-new` (apostrophe → hyphen) vs custom: `whats-new` (apostrophe removed)

**Recommendation:** Compare the custom function's algorithm against CC's `slugify` filter behavior. If they differ for edge cases, add a frontmatter field with the pre-computed slug value and use it in the CC URL pattern (e.g. `{permalink}`). This is safer than `{title|slugify|lowercase}`.

## Folder-per-post content and CC URL placeholders

When content uses a folder-per-post structure (e.g. `blog/getting-started/index.md`), CC's `[slug]` placeholder resolves to an empty string, because the filename is `index`. So `url: "/blog/[slug]/"` produces `/blog/` for every post — wrong.

The fix depends on how the SSG derives the output path from the folder — see your SSG's `collection-urls.md` or `configuration-gotchas.md`. Astro: [astro/configuration-gotchas.md § Folder-per-post](astro/configuration-gotchas.md#folder-per-post-content-and-cc-url-placeholders). Hugo: [hugo/collection-urls.md § Page bundles](hugo/collection-urls.md#page-bundles).

## `_editables` key-to-schema mapping

`_editables` has five keys, each backed by a different schema. The available toolbar options depend on which key — mixing them is the most common `_editables` mistake.

| Editable key | Schema          | Inline formatting (bold/italic/link/...) | Block formatting (lists, blockquote) | `format` dropdown | Image options      |
| ------------ | --------------- | ---------------------------------------- | ------------------------------------ | ----------------- | ------------------ |
| `content`    | `BlockEditable` | ✅                                       | ✅                                   | ✅                | ✅                 |
| `block`      | `BlockEditable` | ✅                                       | ✅                                   | ✅                | ✅                 |
| `text`       | `TextEditable`  | ✅                                       | ❌                                   | ❌                | ❌                 |
| `image`      | `ImageEditable` | n/a                                      | n/a                                  | n/a               | image options only |
| `link`       | `LinkEditable`  | n/a                                      | n/a                                  | n/a               | n/a                |

**`_editables.text` is inline-only.** It does NOT have `bulletedlist`, `numberedlist`, `blockquote`, `format`, `table`, or any block-level option — only inline formatting (`bold`, `italic`, `link`, `strike`, `subscript`, `superscript`, `underline`, `undo`, `redo`, `removeformat`, `copyformatting`, `remove_custom_markup`, `allow_custom_markup`). If you need block-level controls, use `_editables.content` or `_editables.block`. See [../SKILL.md § Do this before writing any configuration](SKILL.md#do-this-before-writing-any-configuration) for schema details.

**Headings are a `format` string, not boolean keys.** `heading2: true` / `heading3: true` are not in the schema. Use `format: "p h1 h2 h3 h4 h5 h6"` (space-separated) in `ToolbarOptions`.

## Set `markdown.options.table` when content has Markdown tables

CloudCannon defaults `markdown.options.table` to `false`, meaning the rich text editor outputs `<table>` HTML. If the site's content files already use Markdown table syntax (`| col | col |`), set this to `true` so tables survive round-tripping through the editor.

Grep content directories for the pipe-delimited pattern:

```bash
rg '^\|.*\|' <content dir>   # src/content/, content/, …
```

```yaml
markdown:
  engine: commonmark
  options:
    table: true
```

You also need `table: true` in `_editables.content` so the table button appears in the rich text toolbar. Because CloudCannon treats any omitted `_editables` key as `false` once you define one, you must re-declare all the defaults you want to keep:

```yaml
_editables:
  content:
    blockquote: true
    bold: true
    bulletedlist: true
    format: p h1 h2 h3 h4 h5 h6
    image: true
    italic: true
    link: true
    numberedlist: true
    removeformat: true
    snippet: true
    table: true
```

`markdown.options.table` controls serialization (Markdown vs HTML); `_editables.content.table` controls the toolbar button.

## Rich text input toolbar options follow the same "omitted = false" rule as `_editables`

The "define one key, all omitted keys become false" behavior applies not just to `_editables.content` but also to individual `_inputs.*.options` on `type: html` and `type: markdown` inputs. Adding `styles` (or any other toolbar option) to an input strips the default inline formatting toolbar unless you re-declare the options you want.

When configuring `type: html` inputs with `options.styles` for editor CSS, always include the inline formatting defaults alongside it:

```yaml
_inputs:
  title:
    type: html
    options:
      styles: .cloudcannon/styles/editor.css
      allow_custom_markup: true
      bold: true
      italic: true
      underline: true
      strike: true
      subscript: true
      superscript: true
      link: true
      removeformat: true
      undo: true
      redo: true
```

For heading-level fields (title, subtitle), intentionally omit block-level options (lists, blockquote, format, image) — only inline formatting is appropriate. For body-level fields, include the full set as you would with `_editables.content`.

## `_enabled_editors` order is the default editor

The first entry in `_enabled_editors` is the editor a file opens in. See [astro/configuration.md § \_enabled_editors order](astro/configuration.md#_enabled_editors-order-determines-the-default) for the per-collection defaults.

## Data references require three connected pieces

Exposing a data file (icons, site settings, etc.) to editors requires three things, and missing any one silently breaks (no error in the editor, but the data either never appears or can't be edited):

1. **The file** — e.g. `data/icons.json`
2. **`data_config` entry** — registers it as a data set CC can read: `icons: { path: data/icons.json }`
3. **Consumer** — either an `_inputs` reference (`values: data.icons`) or a `collections_config` entry so editors can browse/edit it

If the data file should appear in the sidebar, it also needs a `collections_config` entry for its parent directory AND a matching `collection_groups` reference. That's potentially four pieces that must all agree.

**Common miss pattern:** Creating the file and the input reference but forgetting the `data_config` entry. Or defining `data_config` and `collection_groups` but no `collections_config` entry.

## `collection_groups` requires matching `collections_config` entries

`collection_groups` only organizes collections that are already defined in `collections_config` — it does not create them. If you reference a collection name in `collection_groups` that has no `collections_config` entry, it silently does nothing.

A common case: data files handled via `data_config` still need to belong to a collection configured in `collections_config` if you want them to appear as a browsable group in the sidebar. Group related data files into the same collection where it makes sense.

## Always link arrays to structures explicitly

See [structures.md § Mandatory rules](structures.md#the-four-rules-read-first) — every array input needs `type: array` + `options.structures: _structures.<name>` (full path, not bare name). Arrays of primitives (`string[]`) are the exception: they take no structure, but need a `<field>[*]` input for the item type (e.g. `features[*]: { type: text }`) so the array still works once emptied.

## Add preview icon fallbacks on structures

When a structure preview uses `image` from a field that may be empty (e.g. `avatar`), add an `icon` entry so CC shows a meaningful fallback. Without it, editors see a blank preview.

```yaml
preview:
  text:
    - key: name
  icon:
    - format_quote
  image:
    - key: avatar
```

## Configure object inputs with preview icons

See [astro/configuration.md § Object inputs need preview icons](astro/configuration.md#object-inputs-need-preview-icons) for the core recommendation.

**Key collisions:** A key like `image` may be a string path (`type: image`) in some contexts and an object (`{ src, alt }`) in others. Keep the simpler/more common definition globally and use `file_config` or scoped keys for the other.

## Array item previews — `[*]` vs structure value

Where the preview lives depends on whether the array has `structures:`.

| Array shape                                                                                        | Preview location                                                                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Plain array — no `structures:`                                                                     | `arrayName[*]` in `_inputs`                                                         |
| Structured array — `structures: _structures._foo` OR inline `structures: { style, values: [...] }` | Inside the structure value itself, alongside `label` / `icon` / `value` / `_inputs` |

`[*]` previews on a structured array validate clean and silently do nothing. If you see arrays with `structures:` and a matching `[*]` preview block, the `[*]` is dead weight — delete it and move the config onto the structure value. See [structures.md § Previews](structures.md#previews).

Do **not** add `type: object` to `arrayName[*]` for snippet array items — the repeating parser already defines the item shape.

```yaml
# ✓ Plain array — [*] preview is correct here
_inputs:
  tab_items:
    type: array
  tab_items[*]:
    options:
      preview:
        text:
          - key: name
        icon: tab

# ✓ Structured array — preview goes on the structure value
_structures:
  _nav_items:
    style: modal
    values:
      - label: Nav link
        icon: link
        preview:
          text: [{ key: name }, Nav link]
          icon: [link]
        value: { name: Link label, href: / }
```

## Data-only markdown collections

When `.md` files don't build to a page (team members, testimonials, authors used purely as data), set `_enabled_editors: [data]` to restrict editing to the data editor. Alternatively, convert these files to `.yml` or `.json`. A `.md` file can still have editable body content and be data-only — what matters is whether the SSG builds a page from it, not whether the body is used.

## `_inputs` key collision across nesting levels

`_inputs` matches by key name regardless of nesting depth. Use dot syntax to disambiguate when the same key appears with different types:

```yaml
_inputs:
  theme_color.primary:
    type: color
  font_family.primary:
    type: text
```

## Data inputs must follow the JSON, not a template

Before finalizing `file_config` for a data file, grep the actual JSON keys and ensure every key has a matching input. Copying `colors.primary` / `colors.secondary` / `colors.accent` / `colors.background` from a reference template is only correct if the JSON actually has those keys. Mismatches fail silently in both directions — "the editor works but a few fields aren't styled right" is easy to miss on a fast visual pass.

| Mismatch                       | Symptom                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Input defined, key not in JSON | Input is silently ignored. No warning, no editor UI, no-op at build.                                                      |
| Key in JSON, no input defined  | Falls through to a plain text field. Editors see a raw text box where a color picker / switch / image uploader should be. |

**Recipe:** before committing `file_config`, list every leaf key path in each JSON file and cross-reference against the `_inputs` scope:

```bash
jq -r 'paths(scalars) | join(".")' <data dir>/*.json | sort -u
# YAML data files: yq -o=json '.' <file> | jq -r 'paths(scalars) | join(".")'
```

Every path in the output should either have a corresponding `_inputs` entry (scoped via `file_config` or matched by global `_inputs`) or be intentionally left untyped. Keys in `_inputs` that do NOT appear in the JSON are dead config — remove them.

**Applies equally when the template changes:** removing a color key from JSON means removing the matching input in the same commit.
