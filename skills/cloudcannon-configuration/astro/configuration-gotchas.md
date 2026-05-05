# Configuration Gotchas (Astro)

> **Quick rules:** (1) Array item previews: `[*]` only for plain arrays — structured arrays need preview on the structure value: [§ Array item previews](#array-item-previews--vs-structure-value). (2) Every `type: markdown` needs explicit `options:`: [SKILL.md common mistakes](../SKILL.md#common-mistakes). (3) Data files that hold like-shaped items must be arrays, not objects keyed by slug: [configuration.md § Content specifics](configuration.md#content-specifics). (4) Divergent top-level keys break structure matching: [structures.md § Common mistakes](../structures.md#common-mistakes).

## Configure icon fields as select inputs

**MUST:** When a template uses an icon library (e.g. `astro-icon` with Iconify sets), configure the `icon` input as `type: select` with `allow_create: true`.
**Why:** Non-technical editors can't guess Iconify names. A curated dropdown with friendly display names is usable; a raw text field isn't.

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

1. Create a data file (e.g. `src/data/icons.json`) containing the icon objects:

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
    path: src/data/icons.json
```

3. Add the data file to a collection in `collections_config` so editors can browse and add new icons:

```yaml
collections_config:
  data:
    path: src/data
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

A single global `icon` input definition covers all fields that accept icon names.

**Common miss:** Do NOT use `values: data.icons[*].id` — this extracts only the raw ID strings (e.g. `tabler:rocket`), losing the `name` field entirely. Editors see cryptic Iconify IDs in the dropdown instead of friendly names like "Rocket". Use `values: data.icons` (the full objects) with `value_key: id` so the stored value is the ID but the dropdown displays the name via `preview.text`.

## Configure CSS class fields as select inputs

**MUST:** When a frontmatter field stores Tailwind/CSS classes that control visual appearance (icon colors, badge variants, card themes), configure it as a `select` with friendly labels.
**Why:** Editors shouldn't need to know CSS class names.

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

## Quote numeric values that map to text inputs

**MUST:** Quote numeric values (`price: "29"`) when the corresponding CloudCannon input is `type: text`, or configure the input as `type: number`.
**Why:** YAML parses bare numbers (`price: 29`) as integers, not strings. If the input is `type: text` (or defaults to text), CC throws "This text input is misconfigured. This input must have a text value." This affects both structure default values and content file frontmatter.

Quoting as a string is usually better — it's simpler and avoids breaking component code that does string operations on the value.

Common culprits: `price`, `amount`, `count`, `order`, `rating`. Structure default values follow the same rule.

## Verify the CloudCannon CLI's `source` path

Agents should never add `source` and should remove it if the CloudCannon CLI generates one. See [configuration.md § Review the generated config](configuration.md#review-the-generated-config).

## Title-derived slugs and `{title|slugify|lowercase}`

**MUST NOT:** Assume CC's `slugify` filter produces identical output to a template's custom slugify function.
**Why:** CC's `slugify` replaces non-alphanumeric characters with hyphens and collapses them. A typical custom function may remove non-alphanumeric characters instead. For simple titles both produce the same result, but for titles with apostrophes or special characters they diverge:

- "What's New" → CC slugify: `what-s-new` (apostrophe → hyphen) vs custom: `whats-new` (apostrophe removed)

**Recommendation:** Compare the custom function's algorithm against CC's `slugify` filter behavior. If they differ for edge cases, add a frontmatter field with the pre-computed slug value and use it in the CC URL pattern (e.g. `{permalink}`). This is safer than `{title|slugify|lowercase}`.

**Astro 4 gotcha: `slug` is reserved.** In Astro 4's legacy content collections (`src/content/config.ts`), the `slug` field is reserved by Astro. Adding `slug` to the Zod schema throws `ContentSchemaContainsSlugError`. Use a different field name like `permalink` instead. This restriction does not apply to Astro 5+ with the `glob()` loader.

## Folder-per-post content and CC URL placeholders

**MUST NOT:** Use `[slug]` in a CC `url` pattern when content uses a folder-per-post structure (e.g. `blog/01-getting-started/index.md`).
**Why:** CC's `[slug]` placeholder resolves to an empty string (because the filename is `index`). `url: "/blog/[slug]/"` produces `/blog/` for every post.

**Preferred fix:** Flatten to flat files (`blog/01-getting-started.md`). This lets Astro auto-generate slugs from filenames and CC's `[slug]` works natively. See [content.md § Flattening folder-per-post content](content.md#flattening-folder-per-post-content) for the full checklist.

**Fallback (when flattening isn't practical):** Add a `slug` field to each content file's frontmatter matching the folder name, then use `{slug}` (data placeholder) in the CC URL pattern. For legacy Astro collections, `slug` in frontmatter overrides the auto-generated slug without needing to be in the Zod schema. Include `slug` in the CC schema template so new posts get the field.

## `_editables` key-to-schema mapping

**MUST NOT:** Mix toolbar options between `_editables` keys — each key is backed by a different schema and supports different options.
**Why:** `_editables` has five keys, each backed by a different schema. The available toolbar options depend on which key; mixing them is the most common `_editables` mistake.

| Editable key | Schema          | Inline formatting (bold/italic/link/...) | Block formatting (lists, blockquote) | `format` dropdown | Image options      |
| ------------ | --------------- | ---------------------------------------- | ------------------------------------ | ----------------- | ------------------ |
| `content`    | `BlockEditable` | yes                                      | yes                                  | yes               | yes                |
| `block`      | `BlockEditable` | yes                                      | yes                                  | yes               | yes                |
| `text`       | `TextEditable`  | yes                                      | no                                   | no                | no                 |
| `image`      | `ImageEditable` | n/a                                      | n/a                                  | n/a               | image options only |
| `link`       | `LinkEditable`  | n/a                                      | n/a                                  | n/a               | n/a                |

**`_editables.text` is inline-only.** It does NOT have `bulletedlist`, `numberedlist`, `blockquote`, `format`, `table`, or any block-level option — only inline formatting (`bold`, `italic`, `link`, `strike`, `subscript`, `superscript`, `underline`, `undo`, `redo`, `removeformat`, `copyformatting`, `remove_custom_markup`, `allow_custom_markup`). If you need block-level controls, use `_editables.content` or `_editables.block`. Source: [`src/editables.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/editables.ts).

**Headings are a `format` string, not boolean keys.** `heading2: true` / `heading3: true` are not in the schema. Use `format: "p h1 h2 h3 h4 h5 h6"` (space-separated) in `ToolbarOptions`.

## Set `markdown.options.table` when content has Markdown tables

**MUST:** Set `markdown.options.table: true` when the site's content files already use Markdown table syntax (`| col | col |`).
**Why:** CloudCannon defaults `markdown.options.table` to `false`, meaning the rich text editor outputs `<table>` HTML. Without setting this to `true`, tables don't survive round-tripping through the editor.

Grep content directories for the pipe-delimited pattern:

```bash
rg '^\|.*\|' src/content/
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

**MUST:** Re-declare inline formatting defaults whenever you set any toolbar option on `_inputs.*.options` for `type: html` or `type: markdown` inputs.
**Why:** The "define one key, all omitted keys become false" behavior applies not just to `_editables.content` but also to individual `_inputs.*.options` on `type: html` and `type: markdown` inputs. Adding `styles` (or any other toolbar option) to an input strips the default inline formatting toolbar unless you re-declare the options you want.

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

See [configuration.md § \_enabled_editors order](configuration.md#_enabled_editors-order-determines-the-default).

## Data references require three connected pieces

**MUST:** Wire up all three pieces (file, `data_config` entry, consumer) when exposing a data file to editors.
**Why:** Missing any one silently breaks — the editor shows no error, but the data either never appears or can't be edited.

Exposing a data file (icons, site settings, etc.) to editors requires three things:

1. **The file** — e.g. `src/data/icons.json`
2. **`data_config` entry** — registers it as a data set CC can read: `icons: { path: src/data/icons.json }`
3. **Consumer** — either an `_inputs` reference (`values: data.icons`) or a `collections_config` entry so editors can browse/edit it

If the data file should appear in the sidebar, it also needs a `collections_config` entry for its parent directory AND a matching `collection_groups` reference. That's potentially four pieces that must all agree.

**Common miss pattern:** Creating the file and the input reference but forgetting the `data_config` entry. Or defining `data_config` and `collection_groups` but no `collections_config` entry.

## `collection_groups` requires matching `collections_config` entries

**MUST:** Every collection name referenced in `collection_groups` must have a matching entry in `collections_config`.
**Why:** `collection_groups` only organizes collections that are already defined in `collections_config` — it does not create them. If you reference a collection name in `collection_groups` that has no `collections_config` entry, it silently does nothing.

A common case: data files handled via `data_config` still need to belong to a collection configured in `collections_config` if you want them to appear as a browsable group in the sidebar. Group related data files into the same collection where it makes sense.

## Always link arrays to structures explicitly

See [structures.md § Mandatory rules](../structures.md#mandatory-rules-read-first) — every array input needs `type: array` + `options.structures: _structures.<name>` (full path, not bare name).

## Add preview icon fallbacks on structures

**MUST:** Add an `icon` entry alongside `image` in structure previews when the image field may be empty (e.g. `avatar`).
**Why:** CC falls back to the icon when the image field is empty; without it, editors see a blank preview.

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

See [configuration.md § Object inputs need preview icons](configuration.md#object-inputs-need-preview-icons) for the core recommendation.

**Key collisions:** A key like `image` may be a string path (`type: image`) in some contexts and an object (`{ src, alt }`) in others. Keep the simpler/more common definition globally and use `file_config` or scoped keys for the other.

## Array item previews — `[*]` vs structure value

Where the preview lives depends on whether the array has `structures:`.

| Array shape                                                                                        | Preview location                                                                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Plain array — no `structures:`                                                                     | `arrayName[*]` in `_inputs`                                                         |
| Structured array — `structures: _structures._foo` OR inline `structures: { style, values: [...] }` | Inside the structure value itself, alongside `label` / `icon` / `value` / `_inputs` |

`[*]` previews on a structured array validate clean and silently do nothing. If you see arrays with `structures:` and a matching `[*]` preview block, the `[*]` is dead weight — delete it and move the config onto the structure value. See [structures.md § Previews](../structures.md#previews). _(L38)_

**MUST NOT:** Add `type: object` to `arrayName[*]` for snippet array items — the repeating parser already defines the item shape.

```yaml
# ✅ Plain array — [*] preview is correct here
_inputs:
  tab_items:
    type: array
  tab_items[*]:
    options:
      preview:
        text:
          - key: name
        icon: tab

# ✅ Structured array — preview goes on the structure value
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

**MUST:** Set `_enabled_editors: [data]` on collections of `.md` files that don't build to a page (team members, testimonials, authors used purely as data). Alternatively, convert these files to `.yml` or `.json`.
**Why:** Data-only files shouldn't expose the content/visual editors — they have no rendered page. What matters is whether Astro builds a page from the file, not whether the body is used; a `.md` file can still have editable body content and be data-only.

## `_inputs` key collision across nesting levels

**MUST:** Use dot syntax to disambiguate when the same key name appears with different types at different nesting levels.
**Why:** `_inputs` matches by key name regardless of nesting depth, so a single `primary` entry would apply to every `primary` key in the data, regardless of context.

```yaml
_inputs:
  theme_color.primary:
    type: color
  font_family.primary:
    type: text
```

## TypeScript config files are not CC-editable

**MUST NOT:** Expect TypeScript config files (e.g. `as const` objects) to be editable in CloudCannon's data editor.
**Why:** CC reads data from `.json`, `.yml`, `.toml`, and frontmatter — not from `.ts` sources. Some Astro templates store site configuration in TypeScript files; these must be converted or wrapped.

Options, in order of preference:

1. **Leave as-is** — document as developer-only. Best for small blogs where the config rarely changes.
2. **Convert to JSON** — extract the config into a `.json` file, import it in TypeScript, configure as `data_config` in CC.
3. **Hybrid** — move frequently-edited fields to JSON while keeping developer-only settings in TypeScript.

**Imported assets in TypeScript config:** When the config imports images (e.g. `import ogImage from "@/assets/og-image.png"`), these can't be expressed in JSON. Copy the image to `public/` and reference it as a static path string (e.g. `"/og-image.png"`). Components that consume the value (like `Seo.astro`) typically already handle both `ImageMetadata` objects and string paths via `typeof image === "string"` branching. Keep the TypeScript file as a thin re-export wrapper: `import data from "@/data/site-settings.json"; export const siteConfig = data;` — this preserves all existing import paths while making the data CC-editable.

## Pages collection: including `.astro` pages

**MUST:** Pick the pages approach based on the audit classification — content collection for templates with many structured pages, `src/pages/` collection for blog-focused templates with a few static pages.
**Why:** The two approaches have different trade-offs; picking the wrong one either forces unnecessary refactoring or leaves pages unreachable to editors.

There are two distinct approaches for pages in CloudCannon:

- **`src/content/pages/` collection**: For templates with structured data that should become content collection entries. See [page-building.md](page-building.md).
- **`src/pages/` collection**: For templates where static pages stay as `.astro` files with source editables. Simpler, but no Zod validation and limited to source editables for `.astro` pages.

```yaml
pages:
  path: src/pages
  icon: wysiwyg
  url: "/[slug]/"
  glob:
    - "*.md"
    - "index.astro"
  _enabled_editors:
    - visual
  disable_add: true
```

Only include `.astro` pages that actually have editable regions. The `[slug]` pattern handles `index.astro` correctly — resolves to `/`.

### Prefer one unified pages collection

**MUST:** Default to including both content collection pages (`src/content/pages/*.md`) and source-editable `.astro` pages (`src/pages/contact.astro`) in a single `pages` collection rather than creating a separate `static_pages` collection.
**Why:** A unified collection avoids confusing editors with two "pages" buckets in the sidebar.

Use `_enabled_editors` and schemas to differentiate behavior within the collection:

- `.md` content collection pages: `_enabled_editors: [visual, content, data]`, structured schemas
- `.astro` source-editable pages: `_enabled_editors: [visual]`, `disable_add: true` on those entries

Only split into separate collections when there's a genuine UX reason — for example, dozens of `.astro` pages that would clutter the main pages list, or fundamentally different workflows where combining them would confuse editors.

### Deciding whether to enable page creation

| Setting             | When                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disable_add: true` | Template is blog-focused and standalone pages are one-offs with hardcoded layouts; enabling creation would give editors a broken or unstyled result. |
| Default (allow add) | Template has a generic page layout that works for arbitrary content; new `.md` pages render correctly with the existing layout and navigation.       |

**MUST NOT:** Use `add_options: []` to hide the Add button — it has no effect. Use `disable_add: true`.

### Source editables vs. refactoring to `.md`

| Approach                                        | When                                                                                                                                         | Effort                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Source editables** (`data-editable="source"`) | Long-form prose only. 1–2 inline string edits on a page whose layout _is_ the body.                                                          | Low — no structural changes.       |
| **Refactor to `.md`**                           | Default for unique-layout pages with 2+ content sections. Extract into `pages` collection with structured frontmatter + page-builder schema. | Medium — move content, add schema. |

**Decision rule:** Page builder is the default; source-editable is the exception. Run the page through the [audit.md classification census](../../migrating-to-cloudcannon/astro/audit.md#classifying-static-pages-source-editables-vs-content-collection) and [page-building.md § When to reach for page builder](../../migrating-to-cloudcannon/astro/page-building.md#when-to-reach-for-page-builder).

## `z.union` silently matches the wrong schema when fields have defaults

**MUST:** Use `z.discriminatedUnion("_schema", [...])` for schema unions, and declare `_schema` explicitly in every content file.
**Why:** Schemas with many `.default()` and `.nullish()` fields validate successfully against data intended for a different variant. An earlier schema in a plain `z.union` "wins" because all its fields validate; fields from the correct schema are silently absent at runtime (`data.show_form === undefined`), conditional rendering breaks, and blocks of the page disappear.

See the [decision table in configuration.md § Schemas](configuration.md#zod-zunion-vs-zdiscriminatedunion).

## Data inputs must follow the JSON, not a template

**MUST:** Every `_inputs` key in a data file's `file_config` corresponds to an actual key in the JSON. Every JSON leaf key has a matching input (or is intentionally left untyped).
**Why:** Mismatches fail silently in both directions, and "the editor works but a few fields aren't styled right" is easy to miss on a fast visual pass.

| Mismatch                       | Symptom                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Input defined, key not in JSON | Input is silently ignored. No warning, no editor UI, no-op at build.                                                      |
| Key in JSON, no input defined  | Falls through to a plain text field. Editors see a raw text box where a color picker / switch / image uploader should be. |

**Recipe:** before committing `file_config`, list every leaf key path in each JSON file and cross-reference against the `_inputs` scope:

```bash
jq -r 'paths(scalars) | join(".")' src/data/*.json | sort -u
```

Every path in the output should either have a corresponding `_inputs` entry (scoped via `file_config` or matched by global `_inputs`) or be intentionally left untyped. Keys in `_inputs` that do NOT appear in the JSON are dead config — remove them.

**Applies equally when the template changes:** removing a color key from JSON means removing the matching input in the same commit.
