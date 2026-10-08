# Configuration

Read first when writing or customizing `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json`. These are the steps for every SSG: generate a baseline, review it, customize it, then verify it. The SSG's own `configuration.md` adds what differs; its `overview.md` gives the reading order.

Read the [Verification checklist](#verification-checklist) before you start, so you know what to aim for. The phase isn't done until every item in it, and in the SSG's checklist, is checked.

## Generate a baseline

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg <ssg>
```

The individual `detect-*` subcommands, for cross-checking the audit, are in [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md). A site that already has CloudCannon config keeps it — see [SKILL.md § Do this before writing any configuration](SKILL.md#do-this-before-writing-any-configuration).

When the CLI is unavailable (sandbox network limits, a version mismatch), write the config by hand from the audit. The review and customization below still apply.

## Review the generated config

| Key                  | Rule                                                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`             | Remove it if the CLI wrote one — see [configuration-gotchas.md § `source`](configuration-gotchas.md#verify-the-cloudcannon-clis-source-path).                                                                           |
| `collections_config` | One entry per content collection from the audit, with no defunct keys (`output: true`, `singular_key`, `parser`, `collections_config_override`); a collection with a `url` outputs pages, `disable_url: true` stops it. |
| `paths`              | Asset directories only; a collection's path goes on its `collections_config` entry and a dataset's on its `data_config` entry.                                                                                          |
| `timezone`           | Replace the CLI's value (the machine it ran on) with the site's own timezone as an IANA name such as `Australia/Melbourne`, and ask when the site doesn't set one.                                                      |

**Why `timezone` matters:** CloudCannon reads and writes date fields in this zone.

### Build settings

Put `ssg` at the root of `.cloudcannon/initial-site-settings.json`, and nest every other build key (`install_command`, `build_command`, `output_path` and the runtime versions) under `build`. The flat format, with `build_command` at the root, is defunct. The values for each key are in the SSG's `configuration.md`.

- **Put** every pre- and post-build step in the build command — see [build-commands.md](build-commands.md).
- **Change** an existing CloudCannon site's build settings with `cloudcannon sites update-build-config` or in **Site Settings > Builds > Configuration** — see [`cloudcannon-cli` § Changing build configuration](../cloudcannon-cli/commands.md#changing-build-configuration). The file is read only when the site is first created.

## Customize the config

The baseline has collections and paths, but no input types, structures, select data or toolbars. Customize it from the audit.

### Fix content when the config needs it

Add or normalize a field in the content files when the config needs it to work: a `slug` key for a `{slug}` URL, `_schema` on every file, one `date` format. Leave structural changes (moving files, new fields that change rendering, reorganizing collections) to the content phase.

**Why:** settling for config that works around inconsistent content leaves it wrong or fragile.

### Customization checklist

- **`_inputs`:** give every field editors see an explicit input — see [§ Configure every field explicitly](#configure-every-field-explicitly) and [inputs.md](inputs.md). Pick `text`, `textarea`, `markdown` or `html` from how the template renders the field — see [configuration-gotchas.md § Choose text, markdown or html inputs](configuration-gotchas.md#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field). A field whose value comes from a fixed set (`variant`, `target`, `size`, `align`, `theme`, `columns`) is a `select` — see [configuration-gotchas.md § Configure variant / enum-like fields as select inputs](configuration-gotchas.md#configure-variant--enum-like-fields-as-select-inputs).
- **`_structures`:** every array and object input needs one, except an array of primitives, which takes a `<field>[*]` input — see [structures.md § The four rules](structures.md#the-four-rules-read-first).
- **`icon`:** give every collection one that reflects its purpose (`wysiwyg` for pages, `post_add` for posts, `settings` for data). Icons come from a fixed subset of Material Symbols, and an invalid name falls back to the default, so check the name in the JSON schema (`place` isn't in it; `location_on` is).
- **`collection_groups`:** group the collections in the sidebar. A group only shows collections that have a `collections_config` entry — see [configuration-gotchas.md § `collection_groups`](configuration-gotchas.md#collection_groups-requires-matching-collections_config-entries).
- **`_editables`:** set `_editables.content` for the Content Editor. Set a region's toolbar on its field's input `options` — see [configuration-gotchas.md § Set region toolbars on the input](configuration-gotchas.md#set-region-toolbars-on-the-input-not-in-_editablestext-or-block). Defining one toolbar key turns every omitted key off, in `_editables` and in input `options` alike — see [configuration-gotchas.md § Rich text input toolbar options](configuration-gotchas.md#rich-text-input-toolbar-options-follow-the-same-omitted--false-rule-as-_editables).
- **Editor styles:** when the audit found styled HTML in content fields (spans with classes for accent colours or emphasis), define semantic classes in `.cloudcannon/styles/editor.css` and reference it from `type: html` inputs with `options.styles`. Editors then apply the style from the toolbar.
- **`markdown`:** set `markdown.options.table: true` when content has Markdown tables — see [configuration-gotchas.md § Markdown tables](configuration-gotchas.md#set-markdownoptionstable-when-content-has-markdown-tables).
- **`_snippets`:** configure snippets for non-standard syntax in markdown content — see the [`cloudcannon-snippets`](../cloudcannon-snippets/SKILL.md) skill.
- **Select options:** configure the options of every `select` and `multiselect`, in a dataset or `_select_data` — see [configuration-gotchas.md § Editor-owned option lists](configuration-gotchas.md#editor-owned-option-lists). For values with friendly display names, use objects with `value_key: id` — see [configuration-gotchas.md § Configure icon fields as select inputs](configuration-gotchas.md#configure-icon-fields-as-select-inputs). When the values are a collection's files, read [inputs.md § Select values from a collection](inputs.md#select-values-from-a-collection).
- **Schemas:** define each collection's schemas per [schemas.md](schemas.md), and what editors can create per [§ New files and the Add button](#new-files-and-the-add-button).
- **Data files:** register datasets in `data_config` and put editable data files in a collection — see [configuration-gotchas.md § Data files: editing and datasets are separate](configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **`file_config`:** write it as an array of entries, each with a `glob` (`- glob: data/theme.json`). The map keyed by file path is invalid. Use it for inputs on data and config files, and where key names would collide at a broader level; `$` is the file root — see [inputs.md § The file root](inputs.md#the-file-root).

### Configure every field explicitly

Give every field editors see an `_inputs` entry with the right type: `textarea` for multi-line text, `datetime` for dates, `image` for image paths, and so on.

**Why:** a field with no entry falls back to CloudCannon's inference from its name and value, which is often wrong. Inference is a fallback, not configuration.

When unsure whether a field is for editors, check whether its value shows as visible text on the built page. If it does, give it an input. Hide only fields the build uses internally, such as a lookup key — see [§ Hide developer-only fields](#hide-developer-only-fields). Where the full field list comes from is in the SSG's `configuration.md`.

### Hide developer-only fields

Hide `layout`, `_schema` and other routing or rendering keys:

```yaml
_inputs:
  layout:
    hidden: true
  _schema:
    hidden: true
```

Scope `hidden` as narrowly as the fields need: a global `hidden` on a common key such as `url` also hides fields that editors need elsewhere — see [inputs.md § Where `_inputs` live](inputs.md#where-_inputs-live).

### Consolidate single-file collections

Remove each collection that holds only one file. Move a lone page into the `pages` collection, with its own schema when its fields differ (see [schemas.md](schemas.md)), and move section data shared across pages (a CTA, testimonials) into a data file. The SSG's `configuration.md` has the steps.

**Why:** a collection of one adds a sidebar entry with nothing to browse.

### Split nested subdirectories into their own collections

When `pages` holds subdirectories that are distinct groups with their own URL prefix (`pages/services/`, `pages/landing/`), give each its own collection. Each gets a sidebar entry and its own URL pattern.

1. **Exclude** the subdirectories from `pages` with glob negation:

   ```yaml
   pages:
     path: content/pages
     glob:
       - "!services/**"
       - "!landing/**"
     url: "/[slug]/"
   ```

2. **Add** a collection for each subdirectory, with its own `path` and `url`:

   ```yaml
   services:
     path: content/pages/services
     url: "/services/[slug]/"
   landing:
     path: content/pages/landing
     url: "/landing/[slug]/"
   ```

3. **Add** the new collections to `collection_groups`, under the same heading as `pages`.

## New files and the Add button

Without `add_options`, a collection's **+ Add** menu lists its schemas. Defining `add_options` replaces the menu with the options you list. A schema left out still applies to the existing files that use it.

Use `add_options` when:

- **A schema is for existing files only:** an index page, or a one-off page whose route is hard-coded. Leave it out of the menu.
- **The collection offers several page types:** name, order and give an icon to each.
- **New files go somewhere else:** a subfolder (`base_path`) or another collection (`collection`, such as drafts).

```yaml
collections_config:
  people:
    path: data/people
    add_options:
      - name: Staff Member
        schema: staff
        icon: badge
      - name: Author
        schema: author
        icon: edit
        base_path: authors
```

Each option takes `name` and `icon` (both default to the schema's), `schema`, `editor` (`visual`, `content` or `data`), `base_path`, `collection` and `default_content_file`. `schema` wins over `default_content_file` when both are set. An option with `href` and no `schema` is a link.

To hide the Add button, set `disable_add: true` on the collection. `add_options: []` has no effect.

### Give every creatable option somewhere to open

Each option editors can create from needs an editor that works on a file that hasn't been built yet:

| Collection                                                         | Set                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Pages edited in the Visual Editor, such as page builders           | `new_preview_url` on the schema: a built page that uses the same layout |
| Body-text collections (posts, docs, articles), and any with drafts | `editor: content` on the add option                                     |

**Why:** a new file has no output URL until it's built, so the Visual Editor shows the home page instead. A draft is never built, so it has no page to preview at all; the Content Editor doesn't need one.

```yaml
schemas:
  page_builder:
    path: .cloudcannon/schemas/page-builder.md
    name: Page Builder
    new_preview_url: /services/
```

`editor` on an add option sets the editor for new files only. Existing files open in the first `_enabled_editors` entry, so keep `visual` first in most collections — see [configuration-gotchas.md § `_enabled_editors` order](configuration-gotchas.md#_enabled_editors-order-is-the-default-editor).

## Editor README

Write `.cloudcannon/README.md` for editors. It shows on the Site Dashboard, so it's the first thing they see. Cover:

- **The site:** what it is and what content it manages
- **Quick links:** a `cloudcannon:collections/<name>` link to each collection
- **Collections:** what each holds, how to create, edit and delete items, and which editors it offers
- **Data files:** what each `data_config` file controls
- **Site settings:** where site-wide settings live (theme, navigation, social links)
- **New pages:** if a schema sets `new_preview_url`, that a new page previews an existing page until it's built
- **Rich text components:** if the site has `_snippets`, the components editors can insert

Write in plain language. Leave out technical terms such as YAML, front matter, schema and SSG, and the SSG's name and tools.

## Verification checklist

Work through these, then the SSG's checklist, before moving to the next phase. One check per line.

### Blocking gates

- [ ] [Structures — mandatory rules](structures.md#the-four-rules-read-first) all pass: field completeness, array and object structure linkage, preview blocks, nested object preview icons
- [ ] `npx @cloudcannon/cli validate` passes

### Files

- [ ] `cloudcannon.config.yml` exists and is valid YAML
- [ ] Build settings are nested under `"build"` in `.cloudcannon/initial-site-settings.json`
- [ ] The build command alone produces the complete output — see [build-commands.md § Checks](build-commands.md#checks)
- [ ] `.cloudcannon/README.md` exists with editor-facing documentation

### Collections

- [ ] `collections_config` has an entry for every collection from the audit
- [ ] No defunct keys: `output: true`, `singular_key`, `parser`, `collections_config_override`
- [ ] No non-content directories in `collections_config` (`lib`, `source`)
- [ ] No collection contains only a single file — see [§ Consolidate single-file collections](#consolidate-single-file-collections)
- [ ] `collection_groups` organize collections into logical sidebar groups
- [ ] Every collection has a `url` pattern with the correct trailing slash, or `disable_url: true` — see [collection-urls.md](collection-urls.md)
- [ ] Collections with content in subdirectories: the build output matches the URL pattern
- [ ] Index pages whose fields differ from the items have their own schema — see [schemas.md § Index pages](schemas.md#index-pages)

### Inputs

- [ ] `_inputs` configured for common field types (images, dates, dropdowns, hidden fields)
- [ ] Every input has explicit config, with no reliance on type inference from the field name
- [ ] Every `select` and `multiselect` has its options configured — see [configuration-gotchas.md § Editor-owned option lists](configuration-gotchas.md#editor-owned-option-lists)
- [ ] Icon fields are `type: select` with `allow_create: true`, `value_key: id` and named values — see [configuration-gotchas.md § Configure icon fields as select inputs](configuration-gotchas.md#configure-icon-fields-as-select-inputs)
- [ ] Enum-like keys inside structure `value:` blocks — `icon`, `variant`, `target`, `size`, `align`, `theme`, `columns` — each have an `_inputs` entry on the structure value itself. Sweep `cloudcannon.config.yml` and every `*.cloudcannon.structure-value.yml` for those keys — see [configuration-gotchas.md § Where the input definition goes](configuration-gotchas.md#where-the-input-definition-goes)
- [ ] Numeric front matter values mapped to `text` inputs are quoted as strings
- [ ] Developer-only fields (`layout`, `_schema`, routing and rendering keys) have `hidden: true`
- [ ] `file_config` entries use the array format (`- glob: ...`)

### Images

- [ ] `paths.uploads` matches where the site stores images

### Editors

- [ ] Each collection's `_enabled_editors` has the preferred default editor first — see [configuration-gotchas.md § `_enabled_editors` order](configuration-gotchas.md#_enabled_editors-order-is-the-default-editor)
- [ ] Collections of `.md` files that don't build to a page have `_enabled_editors: [data]`

### Content specifics

- [ ] `<br />` tags in plain-text front matter that simulate lists are converted to HTML lists in `type: html` fields, or split into arrays. `<br />` in rich text fields is fine
- [ ] `markdown.options.table` is `true` if any content file has Markdown-syntax tables
- [ ] Every boolean, switch or enum field in `_inputs` has a conditional render in the template. A switch that toggles nothing is a broken field
- [ ] For every `data-editable="text"` region with a template fallback (`|| "default"`), the schema or structure-value default sets the same text as a real value, and existing content files are backfilled. Editors can't see a template fallback
- [ ] `grep -n "type: markdown" cloudcannon.config.yml`: every hit has an `options:` block, inline or through an alias
- [ ] Every schema-default change is paired with a backfill across existing content files
- [ ] Every array or multiselect backed by a data file uses `values: data.<name>`, with no hard-coded copy of the values
- [ ] Every data file that holds a list of like-shaped items is a top-level array with an explicit `slug` or `id` per item, wired to a `_structures` entry so editors get an Add button
- [ ] No template has a `length === 0 ? showAll : showSelected` toggle on a multiselect-driven field. Empty renders nothing, or the schema seeds defaults

### Schemas and the Add button

- [ ] `add_options` limits the Add button to schemas editors should create from
- [ ] Every front matter key used in a collection with schemas is in its schema file, or the schema sets `remove_extra_inputs: false`
- [ ] Collections where editors shouldn't create files have `disable_add: true`
- [ ] Every creatable schema has `new_preview_url`, or its add option has `editor: content`
- [ ] Collections with a `draft` field use `editor: content` on their add options

For pitfalls while configuring, see [configuration-gotchas.md](configuration-gotchas.md) and the SSG's `configuration-gotchas.md`.
