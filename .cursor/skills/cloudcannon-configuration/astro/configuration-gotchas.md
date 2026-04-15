# Configuration Gotchas (Astro)

Common patterns and pitfalls discovered during Astro migrations.

## Configure icon fields as select inputs

When a template uses an icon library (e.g. `astro-icon` with Iconify sets like `tabler:*` and `flat-color-icons:*`), configure the `icon` input as a `select` with `allow_create: true` rather than a plain `text` field. Non-technical editors can't guess icon names, but they can pick from a curated list with friendly display names.

1. Grep the content files for every unique `icon:` value used in the template.
2. Add them as object values with `name` (human-readable label) and `id` (the actual Iconify value).
3. Set `value_key: id` so the stored value is the Iconify ID, not the whole object.
4. Set `preview.text` to show the friendly name in the dropdown.
5. Set `allow_create: true` so developers can still type custom icon names.
6. Add a `comment` linking to the icon set's browser (e.g. Iconify) so developers know where to find new names.

Derive friendly names from the icon ID: strip the collection prefix (`tabler:`, `flat-color-icons:`), replace hyphens with spaces, title-case. For icons from secondary collections, add a suffix to distinguish them (e.g. "Template (Color)" for `flat-color-icons:template` vs "Template" for `tabler:template`).

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

**Common mistake:** Do NOT use `values: data.icons[*].id` — this extracts only the raw ID strings (e.g. `tabler:rocket`), losing the `name` field entirely. Editors see cryptic Iconify IDs in the dropdown instead of friendly names like "Rocket". Use `values: data.icons` (the full objects) with `value_key: id` so the stored value is the ID but the dropdown displays the name via `preview.text`.

A single global `icon` input definition covers all fields that accept icon names.

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

## Quote numeric values that map to text inputs

YAML parses bare numbers (`price: 29`) as integers, not strings. If the corresponding CloudCannon input is `type: text` (or defaults to text), CC throws "This text input is misconfigured. This input must have a text value." This affects both structure default values and content file frontmatter.

**Fix:** Either quote the value as a string (`price: "29"`) or configure the input as `type: number`. Quoting as a string is usually better — it's simpler and avoids breaking component code that does string operations on the value.

Common culprits: `price`, `amount`, `count`, `order`, `rating`. Structure default values follow the same rule.

## Verify Gadget's `source` path

Agents should never add `source` and should remove it if Gadget generates one. See [configuration.md § Review the generated config](configuration.md#review-the-generated-config).

## Title-derived slugs and `{title|slugify|lowercase}`

Some templates compute URLs from titles at build time using a custom slugify function. Don't assume CC's `slugify` filter produces identical output.

CC's `slugify` replaces non-alphanumeric characters with hyphens and collapses them. A typical custom function may remove non-alphanumeric characters instead. For simple titles both produce the same result, but for titles with apostrophes or special characters they diverge:

- "What's New" → CC slugify: `what-s-new` (apostrophe → hyphen) vs custom: `whats-new` (apostrophe removed)

**Recommendation:** Compare the custom function's algorithm against CC's `slugify` filter behavior. If they differ for edge cases, add a frontmatter field with the pre-computed slug value and use it in the CC URL pattern (e.g. `{permalink}`). This is safer than `{title|slugify|lowercase}`.

**Astro 4 gotcha: `slug` is reserved.** In Astro 4's legacy content collections (`src/content/config.ts`), the `slug` field is reserved by Astro. Adding `slug` to the Zod schema throws `ContentSchemaContainsSlugError`. Use a different field name like `permalink` instead. This restriction does not apply to Astro 5+ with the `glob()` loader.

## Folder-per-post content and CC URL placeholders

When content uses a folder-per-post structure (e.g. `blog/01-getting-started/index.md`), CC's `[slug]` placeholder resolves to an empty string (because the filename is `index`). This means `url: "/blog/[slug]/"` produces `/blog/` for every post — wrong.

**Preferred fix:** Flatten to flat files (`blog/01-getting-started.md`). This lets Astro auto-generate slugs from filenames and CC's `[slug]` works natively. See [content.md § Flattening folder-per-post content](content.md#flattening-folder-per-post-content) for the full checklist.

**Fallback (when flattening isn't practical):** Add a `slug` field to each content file's frontmatter matching the folder name, then use `{slug}` (data placeholder) in the CC URL pattern. For legacy Astro collections, `slug` in frontmatter overrides the auto-generated slug without needing to be in the Zod schema. Include `slug` in the CC schema template so new posts get the field.

## Set `markdown.options.table` when content has Markdown tables

CloudCannon defaults `markdown.options.table` to `false`, meaning the rich text editor outputs `<table>` HTML. If the site's content files already use Markdown table syntax (`| col | col |`), set this to `true` so tables survive round-tripping through the editor. Grep content directories for the pipe-delimited pattern:

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

The "define one key, all omitted keys become false" behavior applies not just to `_editables.content` but also to individual `_inputs.*.options` on `type: html` and `type: markdown` inputs. This means adding `styles` (or any other toolbar option) to an input strips the default inline formatting toolbar unless you re-declare the options you want.

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

The first item in `_enabled_editors` is the editor that opens by default when a user clicks a file. `[data, visual]` opens the data editor; `[visual, data]` opens the visual editor. Page builder collections should almost always have `visual` first. See [configuration.md § _enabled_editors order](configuration.md#_enabled_editors-order-determines-the-default).

## Data references require three connected pieces

Exposing a data file (icons, site settings, etc.) to editors requires three things, and missing any one silently breaks:

1. **The file** — e.g. `src/data/icons.json`
2. **`data_config` entry** — registers it as a data set CC can read: `icons: { path: src/data/icons.json }`
3. **Consumer** — either an `_inputs` reference (`values: data.icons`) or a `collections_config` entry so editors can browse/edit it

If the data file should appear in the sidebar, it also needs a `collections_config` entry for its parent directory AND a matching `collection_groups` reference. That's potentially four pieces that must all agree.

**Common miss pattern:** Creating the file and the input reference but forgetting the `data_config` entry. Or defining `data_config` and `collection_groups` but no `collections_config` entry.

## `collection_groups` requires matching `collections_config` entries

`collection_groups` only organizes collections that are already defined in `collections_config` -- it does not create them. If you reference a collection name in `collection_groups` that has no `collections_config` entry, it silently does nothing. A common case: data files handled via `data_config` still need to belong to a collection configured in `collections_config` if you want them to appear as a browsable group in the sidebar. Group related data files into the same collection where it makes sense.

## Always link arrays to structures explicitly

Don't rely on CC's naming-convention heuristic (where an array key `foo` auto-matches `_structures.foo`). Use `type: array` with `options.structures` to make the link visible and intentional.

## Add preview icon fallbacks on structures

When a structure preview uses `image` from a field that may be empty (e.g. `avatar`), add an `icon` entry so CC shows a meaningful fallback:

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

## Array item previews go on `[*]`, not on the array

Target `arrayName[*]` (the item), not `arrayName` (the array itself). Do **not** add `type: object` to `arrayName[*]` for snippet array items — the repeating parser already defines the item shape.

```yaml
_inputs:
  tab_items:
    type: array
  tab_items[*]:
    options:
      preview:
        text:
          - key: name
        icon: tab
```

## Data-only markdown collections

When `.md` files don't build to a page (team members, testimonials, authors used purely as data), set `_enabled_editors: [data]` to restrict editing to the data editor. Alternatively, convert these files to `.yml` or `.json`. Note that a `.md` file can still have editable body content and be data-only — what matters is whether Astro builds a page from it, not whether the body is used.

## `_inputs` key collision across nesting levels

`_inputs` matches by key name regardless of nesting depth. Use dot syntax to disambiguate when the same key appears with different types:

```yaml
_inputs:
  theme_color.primary:
    type: color
  font_family.primary:
    type: text
```

## TypeScript config files are not CC-editable

Some Astro templates store site configuration in TypeScript files with `as const` objects. These cannot be edited in CloudCannon's data editor.

Options, in order of preference:
1. **Leave as-is** — document as developer-only. Best for small blogs where the config rarely changes.
2. **Convert to JSON** — extract the config into a `.json` file, import it in TypeScript, configure as `data_config` in CC.
3. **Hybrid** — move frequently-edited fields to JSON while keeping developer-only settings in TypeScript.

**Imported assets in TypeScript config:** When the config imports images (e.g. `import ogImage from "@/assets/og-image.png"`), these can't be expressed in JSON. Copy the image to `public/` and reference it as a static path string (e.g. `"/og-image.png"`). Components that consume the value (like `Seo.astro`) typically already handle both `ImageMetadata` objects and string paths via `typeof image === "string"` branching. Keep the TypeScript file as a thin re-export wrapper: `import data from "@/data/site-settings.json"; export const siteConfig = data;` — this preserves all existing import paths while making the data CC-editable.

## Pages collection: including `.astro` pages

There are two distinct approaches for pages in CloudCannon:

- **`src/content/pages/` collection**: For templates with structured data that should become content collection entries. See [page-building.md](page-building.md).
- **`src/pages/` collection**: For templates where static pages stay as `.astro` files with source editables. Simpler, but no Zod validation and limited to source editables for `.astro` pages.

Choose based on the audit classification. Templates with many structured pages typically need the content collection approach. Blog-focused templates with a few static pages use this simpler approach.

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

When a site has both content collection pages (`src/content/pages/*.md`) and source-editable `.astro` pages (`src/pages/contact.astro`), **default to including both in a single `pages` collection** rather than creating a separate `static_pages` collection. A unified collection avoids confusing editors with two "pages" buckets in the sidebar.

Use `_enabled_editors` and schemas to differentiate behavior within the collection:
- `.md` content collection pages: `_enabled_editors: [visual, content, data]`, structured schemas
- `.astro` source-editable pages: `_enabled_editors: [visual]`, `disable_add: true` on those entries

Only split into separate collections when there's a genuine UX reason — for example, dozens of `.astro` pages that would clutter the main pages list, or fundamentally different workflows where combining them would confuse editors.

### Deciding whether to enable page creation

**Disable page creation (`disable_add: true`)** when:
- The template is blog-focused and standalone pages are one-offs with hardcoded layouts
- Enabling creation would give editors a broken or unstyled result

**Enable page creation** when:
- The template has a generic page layout that works for arbitrary content
- New `.md` pages would render correctly with the existing layout and navigation

Use `disable_add: true` to hide the Add button. Do not use `add_options: []` for this purpose -- it has no effect.

### Source editables vs. refactoring to `.md`

**Source editables:** Add `data-editable="source"` attributes directly. Low effort, no structural changes needed. See [visual-editing-reference.md § Source editables](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#source-editables-for-hardcoded-content).

**Refactor to `.md`:** When a page has a handful of distinct sections that editors should control, extract the content into a `.md` file with structured frontmatter.

**Decision rule:** If the page has a few pieces of hardcoded text in a fixed layout, use source editables. If the page has structured data that editors need CRUD control over, the content collection approach is usually better -- see [page-building.md](page-building.md).

## `z.union` silently matches the wrong schema when fields have defaults

When combining multiple page schemas with `z.union`, schemas with many `.default()` and `.nullish()` fields validate successfully against data intended for a different variant. For example, a contact page with `_schema: contact` and `show_form: true` might be parsed by `pageBuilderSchema` (which doesn't have `show_form`) because `pageBuilderSchema` validates first — all its fields have defaults and `show_form` is simply ignored.

Symptoms: fields from the correct schema are silently absent at runtime (`data.show_form === undefined`), conditional rendering breaks, and blocks of the page disappear.

**Fix:** Use `z.discriminatedUnion("_schema", [...])` with a literal `_schema` field in each schema. This forces Zod to match on the `_schema` value rather than validating fields. Requires every content file to declare `_schema` explicitly. See [configuration.md § Fallback](configuration.md#fallback-merge-unique-pages-into-pages-with-a-zunion).