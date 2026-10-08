# Configuration Gotchas

Cross-SSG patterns and pitfalls in `cloudcannon.config.yml`. What differs per SSG lives in that SSG's own `configuration-gotchas.md` — [Astro](astro/configuration-gotchas.md), [Hugo](hugo/configuration-gotchas.md).

**Quick reference for the four most-missed rules:**

1. Array item previews: set `preview` on the structure's `values[]` entry, at the same level as `label` and `value`; `[*]` only sets the item type of an array of primitives ([§ Array item previews](#array-item-previews---vs-structure-value))
2. Every `type: markdown` needs explicit `options:` ([§ Choose text, markdown or html inputs](#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field))
3. Data files that hold like-shaped items must be arrays, not objects keyed by slug ([configuration.md § Content specifics](configuration.md#content-specifics))
4. Divergent top-level keys break structure matching ([structures.md § Common mistakes](structures.md#common-mistakes))

## Collections and paths

### Verify the CloudCannon CLI's `source` path

**MUST NOT:** add `source` to `cloudcannon.config.yml`, and remove it if the CloudCannon CLI generates one.
**Why:** `source` is deployment-specific (monorepos). The CloudCannon root defaults to the repo root, so config can already reference any path in the repo.

### Keep collection globs disjoint

**MUST:** make sure no file matches the `path` and `glob` of two collections.
**Why:** a file belongs to one collection only. It appears in just one of them, and the other looks empty for that file with no error.

### Folder-per-post content and CC URL placeholders

When content uses a folder-per-post structure (e.g. `blog/getting-started/index.md`), CC's `[slug]` placeholder resolves to an empty string, because the filename is `index`. So `url: "/blog/[slug]/"` produces `/blog/` for every post — wrong.

The fix depends on how the SSG derives the output path from the folder — see your SSG's `collection-urls.md` or `configuration-gotchas.md`. Astro: [astro/configuration-gotchas.md § Folder-per-post](astro/configuration-gotchas.md#folder-per-post-content-and-cc-url-placeholders). Hugo: [hugo/collection-urls.md § Page bundles](hugo/collection-urls.md#page-bundles).

#### A folder-per-post glob must also match a flat file

**MUST:** give a folder-per-post collection a glob that also matches a flat file in the collection folder (`**/*.md`, or no glob), plus a `create.path` that makes the folder: `"[relative_base_path]/{title|slugify}/index.[ext]"`.
**MUST NOT:** use a folder-only glob such as `**/index.md`.
**Why:** a new entry starts as a flat file with a temporary name. A folder-only glob doesn't match it, so the entry gets none of the collection's settings — `create.path`, `instance_value` and upload paths are all ignored — it's created flat, and then it vanishes from the list.

Keep `disable_add_folder: true` on these collections so editors can't add stray folders. It doesn't stop `create.path` from making the entry's folder.

#### A flat glob needs `disable_add_folder`

**MUST:** give a collection whose glob excludes subfolders (`*.md`) `disable_add_folder: true` and a flat `create.path` (`"[relative_base_path]/{title|slugify}.[ext]"`).
**Why:** a file created in a subfolder doesn't match the glob and vanishes from the list.

### Title-derived slugs and `{title|slugify|lowercase}`

Some templates compute URLs from titles at build time using a custom slugify function. Don't assume CC's `slugify` filter produces identical output.

CC's `slugify` replaces non-alphanumeric characters with hyphens and collapses them. A typical custom function may remove non-alphanumeric characters instead. For simple titles both produce the same result, but for titles with apostrophes or special characters they diverge:

- "What's New" → CC slugify: `what-s-new` (apostrophe → hyphen) vs custom: `whats-new` (apostrophe removed)

**Recommendation:** Compare the custom function's algorithm against CC's `slugify` filter behavior. If they differ for edge cases, add a frontmatter field with the pre-computed slug value and use it in the CC URL pattern (e.g. `{permalink}`). This is safer than `{title|slugify|lowercase}`.

### `_enabled_editors` order is the default editor

The first entry in `_enabled_editors` is the editor an existing file opens in. Put `visual` first in every collection that builds pages:

| Collection                               | `_enabled_editors`        |
| ---------------------------------------- | ------------------------- |
| Page builder                             | `[visual, data]`          |
| Body-text pages that build (posts, docs) | `[visual, content, data]` |
| Files that build no page                 | `[data]`                  |

**Common miss:** `data` first on a page collection, so every page opens in the Data Editor instead of the Visual Editor.

New files open in the add option's `editor` instead — see [configuration.md § New files and the Add button](configuration.md#new-files-and-the-add-button).

### Data-only markdown collections

When `.md` files don't build to a page (team members, testimonials, authors used purely as data), set `_enabled_editors: [data]` to restrict editing to the data editor. Alternatively, convert these files to `.yml` or `.json`. A `.md` file can still have editable body content and be data-only — what matters is whether the SSG builds a page from it, not whether the body is used.

### `collection_groups` requires matching `collections_config` entries

`collection_groups` only organizes collections that are already defined in `collections_config` — it does not create them. If you reference a collection name in `collection_groups` that has no `collections_config` entry, it silently does nothing.

A common case: data files handled via `data_config` still need to belong to a collection configured in `collections_config` if you want them to appear as a browsable group in the sidebar. Group related data files into the same collection where it makes sense.

### Data files: editing and datasets are separate

A data file is registered in two independent ways. Each fails silently when missing.

- **To edit it**, it belongs to a collection like any other, with no output URL: a `collections_config` entry, inputs per file or on the collection, and a `collection_groups` reference to show it in a sidebar group.
- **To use it as data**, it needs a `data_config` entry (`icons: { path: data/icons.json }`). This exposes it as a dataset to `values: data.<name>` selects, `@data[<name>]` editable regions, and the Visual Editor API.

A file can need either or both. **Common miss:** a select with `values: data.icons` or a region bound to `@data[icons]` with no `data_config` entry. There's no error; the options or the region are just empty.

### Single `data` collection or split?

Default: **one `data` collection** for the site's data directory, with `disable_url: true` and per-file `file_config` overrides. One sidebar entry, tailored inputs per file, low config surface. Set the glob to the formats the data files use.

```yaml
collections_config:
  data:
    path: data
    glob:
      - "**/*.json"
    disable_url: true
    icon: settings
    _enabled_editors:
      - data

file_config:
  - glob: data/theme.json
    _inputs:
      $:
        type: object
        options:
          preview:
            icon: palette
      # ... per-file inputs
  - glob: data/navigation.json
    _inputs:
      $:
        type: object
        options:
          preview:
            icon: menu
      # ...
```

Split into per-file collections only when:

- The files have radically different edit cadences or permissions
- Editors actively complain they can't find a specific file under "Data"
- You need different `_enabled_editors` per file that `file_config` can't express

"Each file gets its own sidebar icon" is not a strong enough reason — `file_config.$.options.preview.icon` handles per-file icons inside a single collection.

## Inputs

### Choose text, markdown or html inputs from how the template renders the field

**MUST:** pick a string field's input type from how its template outputs the value, not only from what the current content holds.
**Why:** the input decides what editors can write. A rich text input on a field the template escapes lets editors add formatting that prints as literal `**asterisks**` or `<strong>` tags; a `textarea` on a field the template renders as markdown hides formatting the page supports.

| Template outputs the value                | Input                                        |
| ----------------------------------------- | -------------------------------------------- |
| Escaped, as plain text                    | `text` (one line) or `textarea` (multi-line) |
| Through a markdown renderer, then as HTML | `markdown`                                   |
| As raw HTML, with no markdown step        | `html`                                       |

The syntax for each row is SSG-specific — [Astro](astro/configuration.md#customize-the-config), [Hugo](hugo/configuration-gotchas.md#choose-rich-text-inputs-from-the-template-filter).

- **Expect** template and content to agree. Markdown or HTML in a field the template escapes already prints literally on the live site — a bug in the original. Record it and ask the user whether to fix the template or the content; don't pick the input from the content alone. Plain text in a field the template renders as markdown is not a mismatch — `markdown` is still right.
- **Scope** the input per structure when the same key renders differently in different blocks (`hero.description` as `markdown`, `description` as `textarea` elsewhere) — see [§ Where the input definition goes](#where-the-input-definition-goes).
- **Give** every `markdown` and `html` input explicit `options` — see [§ Rich text input toolbar options](#rich-text-input-toolbar-options-follow-the-same-omitted--false-rule-as-_editables). The same `options` set the toolbar of any region bound to the field — see [§ Set region toolbars on the input](#set-region-toolbars-on-the-input-not-in-_editablestext-or-block).

**Common miss:** a global `_inputs.description: { type: html }` because one block renders it as HTML. Every other block that escapes `description` now offers a rich text editor whose output prints as tags.

### Quote numeric values that map to text inputs

YAML parses bare numbers (`price: 29`) as integers, not strings. If the corresponding CloudCannon input is `type: text` (or defaults to text), CC throws "This text input is misconfigured. This input must have a text value." This affects both structure default values and content file frontmatter.

**Fix:** Either quote the value as a string (`price: "29"`) or configure the input as `type: number`. Quoting as a string is usually better — it's simpler and avoids breaking component code that does string operations on the value.

Common culprits: `price`, `amount`, `count`, `order`, `rating`. Structure default values follow the same rule.

### An `_inputs` key that names no field is ignored

**MUST:** list the field paths the content actually has, and diff them against the `_inputs` keys. For a structure value, every key in its `_inputs` must name a key at any depth in its `value` — a nested field name (`heading`) or a dotted path (`button.text`) both apply. A key for a field on an array item belongs on that item's structure, not on the parent's value.
**Why:** an `_inputs` key that matches nothing is valid config, so the schema check passes — and the input never applies. The field it was meant for falls back to an inferred text box.

```bash
# Top-level front matter keys in use across a collection (YAML front matter)
find <collection dir> -name '*.md' -exec sed -n '/^---$/,/^---$/p' {} \; | grep -oE '^[A-Za-z_][A-Za-z0-9_]*:' | sort -u
```

[§ Data inputs must follow the data file](#data-inputs-must-follow-the-data-file-not-a-template) is the same check for data files.

### `_inputs` key collision across nesting levels

`_inputs` matches by key name regardless of nesting depth — [inputs.md § How a key matches a field](inputs.md#how-a-key-matches-a-field) lists every key form. Use dot syntax to disambiguate when the same key appears with different types:

```yaml
_inputs:
  theme_color.primary:
    type: color
  font_family.primary:
    type: text
```

A dotted key takes precedence over a plain key that also matches: `menu.main.weight` wins over `weight` for that field. Use it to scope a short, common name (`weight`, `url`, `name`) that means different things in different places.

The same applies inside one structure value's `_inputs`. A contact block whose `email` is an object holding `heading` and its own `email` string can't type both with a plain `email` key — it matches the object and the string. Type the object with `email` and the string with `email.email`, or leave `type` off both and let CloudCannon infer them from the value.

### Data inputs must follow the data file, not a template

Before finalizing the `_inputs` for a data file, list the file's actual keys and check each one against the inputs that reach it. Copying `colors.primary` / `colors.secondary` / `colors.accent` / `colors.background` from a reference template is only correct if the file actually has those keys. Mismatches fail silently in both directions — "the editor works but a few fields aren't styled right" is easy to miss on a fast visual pass.

| Mismatch                       | Symptom                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Input defined, key not in file | Input is silently ignored. No warning, no editor UI.                                                                      |
| Key in file, no input defined  | Falls through to a plain text field. Editors see a raw text box where a color picker / switch / image uploader should be. |

A data file's inputs merge from every level of the configuration cascade that covers it, so check them all — the levels are in [inputs.md § Where `_inputs` live](inputs.md#where-_inputs-live).

**Recipe:** list every leaf key path in the file, then cross-reference it against those levels:

```bash
jq -r 'paths(scalars) | join(".")' <data dir>/*.json | sort -u
# YAML data files: yq -o=json '.' <file> | jq -r 'paths(scalars) | join(".")'
```

Every path should either match an `_inputs` key at a level that covers the file, or be intentionally left untyped. Remove any input scoped to this file (its collection, schema, `file_config` entry or the file itself) that matches no path; it's dead config. A global key that matches nothing here may still match other files.

**Applies equally when the template changes:** removing a key from a data file means removing its matching input in the same commit.

### The first edit writes every schema key

**MUST:** make every key whose schema default would change what the site builds (`draft: true`, a boolean a template filters on) explicit in the existing files before editors start.
**Why:** the first edit to a file fills in every field its schema defines, with the schema's default. A file that relied on a key being absent — and a template that treats "absent" differently from `false` — changes on that first edit, before the editor touched the field.

- **Check** each boolean and enum the schema adds against how the templates read it. A template that compares against a string (`"true"`) or tests whether the key exists treats a written `false` differently from no key.
- **Leave** a key out of the schema when that difference matters and the template can't be changed.
- **Say** "the first edit", not "the first save": on the local dev server every edit is written to disk at once.

The SSG's gotchas file gives the grep for its template syntax — Hugo: [hugo/configuration-gotchas.md § Booleans compared as strings](hugo/configuration-gotchas.md#booleans-compared-as-strings).

### Dated content: `instance_value: NOW`

**MUST:** give the date input on a schema for dated content (posts, events, news) `instance_value: NOW`.
**Why:** a new file otherwise gets an empty date. Hugo builds an empty date as year 0001, so the new post sorts last.

```yaml
_inputs:
  date:
    type: datetime
    instance_value: NOW
```

## Select inputs

### Editor-owned option lists

**MUST:** configure the options of every `select` and `multiselect`. Choose where they live by asking who adds a new option:

| Situation                                                                                                                                   | Home                                                                                                                                                                       | Examples                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Editors should see or change the list — an editor could need a new option while writing                                                     | A dataset: a data file registered in `data_config`, in a collection so editors can open it, and `values: data.<name>` on the input. Seed it from the values already in use | Tags, categories, series, authors, locations    |
| The list is large or complex (many entries, or entries with more than a value, such as label + value + icon), and only developers change it | A dataset in `data_config` with `values: data.<name>`. Leave it out of collections so editors can't change it                                                              | A full icon set generated from the site's icons |
| A small, fixed list the code branches on — adding an option needs a code change                                                             | `_select_data`, or `values` inline on the input                                                                                                                            | Colour schemes, layout variants, button styles  |

When unsure, ask whether a non-developer would ever say "I need a new one of these". If yes, it's a dataset editors can open. Size alone never makes a list editor-owned, but a large or complex developer-owned list still reads better as a dataset than as `_select_data`.

**MUST NOT:** leave an input with `values: []` or no `values`, even with `allow_create: true`.
**Why:** an empty field renders as a misconfiguration error and the dropdown offers nothing. A value typed through `allow_create` is saved to that one file only and never joins the list.

**MUST:** wire a dataset explicitly with `values: data.<name>`.
**Why:** don't rely on CloudCannon matching an input to a dataset by name. A `select` named `my_colors` with a dataset `colors` gets no options — only its stored value and an empty dropdown.

A dataset needs a `data_config` entry, and editing its file needs a collection — see [§ Data files: editing and datasets are separate](#data-files-editing-and-datasets-are-separate). The icon recipe below is a worked example of both dataset rows.

### Configure icon fields as select inputs

When a template uses an icon library (e.g. Iconify sets like `tabler:*` and `flat-color-icons:*`), configure the `icon` input as a `select` with `allow_create: true` rather than a plain `text` field. Non-technical editors can't guess icon names, but they can pick from a curated list with friendly display names.

#### Setup steps

1. Grep content files for every unique `icon:` value used in the template.
2. Add them as object values with `name` (human-readable label) and `id` (the Iconify value).
3. Set `value_key: id` so the stored value is the Iconify ID, not the whole object.
4. Set `preview.text` to show the friendly name in the dropdown.
5. Set `allow_create: true` so developers can still type custom icon names.
6. Add a `comment` linking to the icon set's browser (e.g. Iconify) so developers know where to find new names.

**Deriving friendly names:** strip the collection prefix (`tabler:`, `flat-color-icons:`), replace hyphens with spaces, title-case. For icons from secondary collections, add a suffix (e.g. "Template (Color)" for `flat-color-icons:template` vs "Template" for `tabler:template`).

#### Inline values

When the icon set is a short list only developers change, list the values directly on the input (or in `_select_data`):

```yaml
# Input shape — placement is in § Where the input definition goes
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

#### Dataset values

When editors add icons, or the list is long or carries more than an ID, move it into a dataset ([§ Editor-owned option lists](#editor-owned-option-lists)):

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

3. If editors should add icons, add the data file to a collection in `collections_config` so they can open it. Skip this step for a developer-owned list:

```yaml
collections_config:
  data:
    path: data
    glob:
      - icons.json
    disable_add: true
```

4. Reference the dataset on the input using `values: data.icons`:

```yaml
# Input shape — placement is in § Where the input definition goes
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

#### Where the input definition goes

**MUST:** define `icon` on every structure value that has an `icon` field — in that value's own `_inputs` — rather than relying on one root-level entry to reach it.

A structure value carries its own input configuration — see [inputs.md § Where `_inputs` live](inputs.md#where-_inputs-live).

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

### Configure CSS class fields as select inputs

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

### Configure variant / enum-like fields as select inputs

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

## Rich text toolbars

### `_editables` key-to-schema mapping

`_editables` has five keys, each backed by a different schema. The available toolbar options depend on which key — mixing them is the most common `_editables` mistake.

| Editable key | Schema          | Inline formatting (bold/italic/link/...) | Block formatting (lists, blockquote) | `format` dropdown | Image options      |
| ------------ | --------------- | ---------------------------------------- | ------------------------------------ | ----------------- | ------------------ |
| `content`    | `BlockEditable` | Yes                                      | Yes                                  | Yes               | Yes                |
| `block`      | `BlockEditable` | Yes                                      | Yes                                  | Yes               | Yes                |
| `text`       | `TextEditable`  | Yes                                      | No                                   | No                | No                 |
| `image`      | `ImageEditable` | n/a                                      | n/a                                  | n/a               | image options only |
| `link`       | `LinkEditable`  | n/a                                      | n/a                                  | n/a               | n/a                |

**`_editables.text` is inline-only** (`TextEditable`): `bold`, `italic`, `link`, `strike`, `subscript`, `superscript`, `underline`, `undo`, `redo`, `removeformat`, `copyformatting`, `remove_custom_markup`, `allow_custom_markup`. Lists, `blockquote`, `format` and `table` exist only on `_editables.content`, `_editables.block`, and a `markdown`/`html` input's `options`. It's only a fallback in any case: a region takes its whole toolbar, inline and block, from its field's input `options` → [§ Set region toolbars on the input](#set-region-toolbars-on-the-input-not-in-_editablestext-or-block).

**Headings are a `format` string, not boolean keys.** `heading2: true` / `heading3: true` are not in the schema. Use `format: p h1 h2 h3` (space-separated) in any of those three places.

#### Set region toolbars on the input, not in `_editables.text` or `.block`

**MUST:** when a `text` or `block` region edits a field, give that field a `markdown` (or `html`) input with its own `options`.
**Why:** a region uses its input's `options`. `_editables.text` / `.block` are only a fallback for inputs with none. The fallback reaches the region but not the sidebar input for the same field, so the two offer different toolbars. With no rich text input at all, the region saves HTML into what the sidebar shows as a plain text field.

| Surface                                                                  | Toolbar                                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Content Editor, source regions, `data-prop="@content"` regions           | `_editables.content`                                                                                                |
| `text` / `block` region on a key whose input has `options`               | The input's `options` — the sidebar shows the same                                                                  |
| `text` / `block` region on a `markdown` / `html` input with no `options` | `_editables.text` / `.block`, else CloudCannon's defaults. The sidebar shows CloudCannon's default markdown toolbar |
| `text` / `block` region on a key with no rich text input                 | CloudCannon's default toolbar; saves HTML. The sidebar shows a plain text input with raw tags                       |

`data-type="span"` regions have no toolbar; this covers `text` and `block` regions.

**Common miss:** adding `label` or `comment` to an input and expecting it to control the toolbar — only `options` does.

### Rich text input toolbar options follow the same "omitted = false" rule as `_editables`

The "define one key, all omitted keys become false" behavior applies not just to `_editables.content` but also to individual `_inputs.*.options` on `type: html` and `type: markdown` inputs. Adding `styles` (or any other toolbar option) to an input strips the default inline formatting toolbar unless you re-declare the options you want. Once an input has any option, `_editables.text` / `.block` stop applying to that field's regions too — see [§ Set region toolbars on the input](#set-region-toolbars-on-the-input-not-in-_editablestext-or-block).

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

### Set `markdown.options.table` when content has Markdown tables

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

## Structures and previews

### Always link arrays to structures explicitly

See [structures.md § Mandatory rules](structures.md#the-four-rules-read-first) — every array input needs `type: array` + `options.structures: _structures.<name>` (full path, not bare name). Arrays of primitives (`string[]`) are the exception: they take no structure, but need a `<field>[*]` input for the item type (e.g. `features[*]: { type: text }`) so the array still works once emptied.

### Array item previews — `[*]` vs structure value

**MUST:** give an array of objects a structure, and set the item `preview` on its `values[]` entry, at the same level as `label`, `icon`, `_inputs` and `value`.
**Why:** when an array has `structures:`, CloudCannon uses the structure value's preview and ignores an `arrayName[*]` preview. It validates clean and does nothing. A structure also labels the Add button and keeps the item shape once the array is emptied.

`[*]` is for the item type of an array of primitives (`features[*]: { type: text }`) — see [structures.md § The four rules](structures.md#the-four-rules-read-first). A `[*]` preview on an array with `structures:` is dead config: delete it and set the preview on the structure's `values[]` entry.

```yaml
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

The same applies to a snippet's repeating-parser array — see [../cloudcannon-snippets/raw.md § repeating](../cloudcannon-snippets/raw.md#repeating--repeat-a-child-pattern-as-array-items) — and to a top-level array data file — see [inputs.md § The file root](inputs.md#the-file-root).

### Add preview icon fallbacks on structures

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

### Configure object inputs with preview icons

Object inputs without a `preview.icon` show a generic icon in the data editor. Configure `type: object` with `options.preview.icon` on any object key that editors will see — both top-level data file objects and nested objects inside structures. Use [Material Icons](https://fonts.google.com/icons) names.

```yaml
_inputs:
  callToAction:
    type: object
    options:
      preview:
        icon: ads_click
```

**Key collisions:** A key like `image` may be a string path (`type: image`) in some contexts and an object (`{ src, alt }`) in others. Keep the simpler/more common definition globally and use `file_config` or scoped keys for the other.

## File hygiene

### No YAML merge keys

**MUST NOT:** use YAML merge keys (`<<: *anchor`) in `cloudcannon.config.yml`. Reuse a block with a plain alias (`key: *anchor`), and define each anchor above its first use.
**Why:** the CloudCannon CLI parses YAML 1.2, which has no merge keys — `validate` reports `unexpected property <<`. An alias used before its anchor fails with `Unresolved alias`.

```yaml
_editables:
  content: &toolbar
    bold: true
    italic: true
    link: true
collections_config:
  blog:
    _editables:
      content: *toolbar
```

### Keep edited files free of comments

**MUST:** keep comments out of the data, config and content files editors change. Put explanations in an `_inputs` `comment`, or in the editor README.
**Why:** saving a file reserialises it. Comments are lost and formatting is normalised; key order is kept. See [cloudcannon-dev-server/troubleshooting.md § Writing](../cloudcannon-dev-server/troubleshooting.md#writing).

## Invalid keys

Look up a key here when `npx @cloudcannon/cli validate` flags it. These are keys agents have written that the schema doesn't have; the JSON schemas are authoritative — see [json-schemas.md](json-schemas.md).

| Wrong                                                                               | Correct                                                                                                                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disable_url_preview: true`                                                         | `disable_url: true`, which turns off the collection's output URL.                                                                                                                  |
| `output: false`                                                                     | Omit `url` and set `disable_url: true`, or use `data_config` instead of a collection.                                                                                              |
| `type: hidden`                                                                      | `hidden: true` beside `type`, on any input; `hidden: "<query>"` hides it conditionally.                                                                                            |
| `options.max` on a `text` or `textarea` input                                       | `options.max_length`, paired with `min_length`.                                                                                                                                    |
| `_editables.text` with block keys (`bulletedlist`, `blockquote`, `format`, `table`) | `_editables.text` is inline-only — see [§ `_editables` key-to-schema mapping](#_editables-key-to-schema-mapping).                                                                  |
| `heading2: true`, `heading3: true`                                                  | `format: "p h1 h2 h3"`, a space-separated string — see [§ `_editables` key-to-schema mapping](#_editables-key-to-schema-mapping).                                                  |
| `options.collections: [team]`                                                       | `values: collections.team` with `value_key` and `preview` — see [inputs.md § Select values from a collection](inputs.md#select-values-from-a-collection).                          |
| `options.structures: my_blocks`                                                     | The full path, `_structures.my_blocks` — see [structures.md § The four rules](structures.md#the-four-rules-read-first).                                                            |
| `timezone: "+10:00"`                                                                | A top-level IANA name such as `Australia/Melbourne`, defaulting to `Etc/UTC` — see [configuration.md § Review the generated config](configuration.md#review-the-generated-config). |
| `paths.collections`, `paths.data`                                                   | `collections_config.<name>.path` and `data_config.<name>.path`.                                                                                                                    |
| `paths.output`                                                                      | No such key: `paths` holds asset directories only, and the build tool sets the output directory.                                                                                   |
| A Material Symbols name outside the schema's enum, such as `place`                  | A name from the enum, such as `location_on`; an invalid name falls back to the default icon — check it with the icon recipe in [json-schemas.md](json-schemas.md#query-recipes).   |
