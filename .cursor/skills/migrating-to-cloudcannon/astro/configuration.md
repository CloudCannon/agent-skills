# Configuration (Astro)

Guidance for creating and configuring `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` for an Astro site.

## Baseline generation with Gadget

Use the Gadget CLI to generate a baseline configuration. Run subcommands individually to cross-reference against the Phase 1 audit. See [../gadget-guide.md](../gadget-guide.md) for the full CLI reference and all available commands.

```bash
gadget generate --auto --init-settings --ssg astro
```

## Review the generated config

After generation, read `cloudcannon.config.yml` and check:

- **`source`** -- Do not add this during migration. It is **deployment-specific** (monorepos, non-standard layouts) and belongs with the user's hosting setup. For typical Astro sites, **omit `source`** so CloudCannon's root is the **repository root**; that way config can reference paths outside `src` when needed. If Gadget writes a `source` value, **remove it** unless the project truly requires it.
- **`collections_config`** -- are all content collections present? Do paths match the `base` directories from `content.config.ts`?
- **`paths`** -- Set `static` to `public` (Astro's default asset folder) unless the project uses a different public directory. Set `uploads` to match where uploaded images should land: use `public/images` when the site keeps images in a subfolder, `public` when assets live at the root of public, and default to **`public/images`** when there is no precedent yet.
- **Build settings** (`.cloudcannon/initial-site-settings.json`) -- Align with the repo: `ssg`: `"astro"`; `install_command`: from the detected package manager (omit if there is none); `build_command`: the script from `package.json` if present, otherwise `"astro build"`; `output_path`: `"dist"`. Prefer **`.cloudcannon/prebuild`** for extra setup steps so `build_command` stays a straight build, not a shell chain.

## Customize the config

### Targeted content fixes during configuration

The migration phases are sequential, but don't treat them as rigid boundaries. When a CC config pattern requires content files to have a field that's inconsistent or missing, **add it** rather than settling for a worse config. Examples: adding `slug` frontmatter so `{slug}` URL patterns work, adding `_schema` to disambiguate collection schemas, normalizing a `date` field format.

The decision rule: if skipping the change means the config is wrong or fragile, make the change now. If the change is structural (moving files, adding new fields that alter rendering, reorganizing collections), defer to the content phase.

### Customization checklist

Gadget produces a structural baseline. The following customizations are almost always needed, informed by the Phase 1 audit:

- **`_inputs`** -- configure how fields appear in the editor (dropdowns, date pickers, image uploaders, comments, hidden fields). Map these from the Zod schemas discovered in the audit. When a frontmatter field contains markdown (e.g. a hero description with `**bold**` text), use `type: markdown`, not `type: textarea`. The same goes for fields that contain html elements (e.g. a hero description with `<strong>bold</strong>` text) - they should use `type: html`, instead of `type: textarea`. Use scoped input keys (e.g. `hero.description`) when the general input should stay as `textarea` but a specific context needs `markdown`.
- **`_structures`** -- define reusable component structures used for knowing what to add to arrays, or object inputs in CloudCannon. Particularly needed for array-based page building, but should be defined for all array or object inputs on the site. Derive these from the component inventory in the audit.
- **`collection_groups`** -- organize collections into sidebar groups for a clean editing experience.
- **`_editables`** -- configure rich text editor toolbars per collection or globally.
- **`markdown`** -- if content files contain Markdown-syntax tables (`| col | col |`), set `markdown.options.table: true`. See [configuration-gotchas.md § Markdown tables](configuration-gotchas.md#set-markdownoptionstable-when-content-has-markdown-tables).
- **`_snippets`** -- configure snippets for non-standard markdown amongst markdown content. In Astro this is often MDX components used in rich text content. Built-in templates like `mdx_component` resolve automatically — no `_snippets_imports` needed. See [snippets.md](snippets.md).
- **`_select_data`** -- define shared dropdown options for fields used across collections.
- **Schemas** -- define templates for creating new content files, based on the content patterns found in the audit.
- **`data_config`** -- a root-level key that targets specific data files via a path, and exposes them for use in CloudCannon (eg. a data file of tags that can be used to populate a multi-select input called tags). Once a data set has been exposed in the `data_config`, its available for use on a select type input by defining it as the input's, `options.values` value (it uses the key we've defined in the `data_config` as the name to use as a reference).
- **`file_config`** -- a root-level key that targets specific files via glob and scopes `_inputs` to them. Use it when key names would collide at broader scopes, or to configure inputs for settings/data files. Supports `$` to reference the root of the file or structure. Example:

```yaml
file_config:
  - glob: src/config/theme.json
    _inputs:
      theme_color.primary:
        type: color
      font_family.primary:
        type: text
```

**Scoping:** For top-level arrays and objects in data/config files, use `file_config` so that you can gain access to `$`, which symbolises the root of the data file:

```yaml
file_config:
  - glob: src/config/config.json
    _inputs:
      $:
        type: array
      $[*]:
        type: object
        options:
          preview:
            icon: language
```

### Object inputs need preview icons

Object inputs without a `preview.icon` show a generic icon in the data editor. Configure `type: object` with `options.preview.icon` on any object key that editors will see — both top-level data file objects and nested objects inside structures. Use [Material Icons](https://fonts.google.com/icons) names.

```yaml
_inputs:
  callToAction:
    type: object
    options:
      preview:
        icon: ads_click
```


### Hide developer-only frontmatter fields

Fields like `layout`, `_schema`, and other routing/rendering keys should be hidden from editors:

```yaml
_inputs:
  layout:
    hidden: true
  _schema:
    hidden: true
```

The full set of configuration keys is defined in the [CloudCannon Configuration JSON Schema](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/cloudcannon-config.schema.json). Generated files include a schema reference that provides IDE autocomplete and validation -- preserve these references when editing.

## Consolidating single-file collections

After Gadget generates collections, review the result for collections that contain only a single file. A collection of one doesn't add value in the CloudCannon sidebar, is semantically less correct, and should be consolidated. Two strategies, applied in order:

### Strategy A: Merge simple pages into the `pages` collection

If a single-file collection uses the same schema as `pages` (e.g. an `about` or `contact` collection with standard title/description/image/body fields), merge it into the `pages` collection:

- Move the content file into the `pages` directory (e.g. `src/content/about/index.md` -> `src/content/pages/about.md`)
- Remove the separate collection from `content.config.ts` and `cloudcannon.config.yml`
- Update the page's rendering template in `src/pages/` to fetch from the `pages` collection instead
- The page still uses its own rendering template for routing

### Strategy B: Use `data_config` for reusable section data

If a page has data coming from a file separate from the content page, or a page has data that is consistent across the site (CTA, testimonials, etc.), extract it into JSON data files and configure `data_config` rather than trying to group it into a collection with the page:

- Move section data from `.md` frontmatter into `src/data/*.json` files
- Add `data_config` entries in `cloudcannon.config.yml` pointing to each JSON file
- Import the JSON directly in Astro components (no collection needed)
- Use `@data[key].path` for an editable region's `data-prop` for connecting data to an element in the visual editor

For pages with unique schemas (e.g. a homepage with `banner`/`features`), merge the page into the `pages` collection using a `z.union` in the Zod schema and CC schemas for the correct editor fields (see Fallback below).

### Fallback: Merge unique pages into `pages` with a z.union

If a page has a unique schema but doesn't have related files that would make the collection more than one file, merge it into the `pages` collection instead of leaving it as a singleton:

- Define separate named Zod schemas for each page type (e.g. `pageSchema`, `contactPageSchema`, `homepageSchema`), each spreading `commonFields` plus their own required fields
- Combine them with `z.union([mostSpecific, ..., leastSpecific])` -- Zod tries each member in order and returns the first that validates, so ordering most-specific first ensures correct discrimination without a discriminator field
- In CloudCannon, define multiple schemas for the `pages` collection so editors get the correct fields for each page type
- In templates, narrow the union type with an `in` check (e.g. `if (!("banner" in data)) throw new Error(...)`) before accessing schema-specific fields
- The page still uses its own rendering template in `src/pages/` -- routing and layouts is independent of collection structure

```typescript
const pageSchema = z.object({ ...commonFields });
const contactPageSchema = z.object({ ...commonFields, name_label: z.string(), /* ... */ });
const homepageSchema = z.object({ ...commonFields, banner: z.object({ /* ... */ }), features: z.array(/* ... */) });

const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/pages" }),
  schema: z.union([homepageSchema, contactPageSchema, pageSchema]),
});
```

**When to use `z.discriminatedUnion` instead:** If page schemas have many optional fields with defaults (arrays defaulting to `[]`, strings that are `.nullish()`), `z.union` may match the wrong schema because earlier members validate successfully even for data intended for later members. In these cases, use `z.discriminatedUnion("_schema", [...])` with a literal `_schema` field in each schema. This guarantees correct matching regardless of field optionality.

Every Zod schema in the union should have a matching CC schema in `.cloudcannon/schemas/` and a corresponding entry under the collection's `schemas` key in `cloudcannon.config.yml`. Add `_schema: <key>` to each content file's frontmatter so CloudCannon matches it explicitly rather than guessing from the frontmatter shape.

## Splitting nested subdirectories into their own collections

When the `pages` collection contains subdirectories that represent a distinct group of content with their own URL prefix (e.g. `pages/homes/`, `pages/landing/`), split them into separate CloudCannon collections rather than keeping everything flat under `pages`. This gives each group its own sidebar entry, correct URL pattern, and cleaner editorial experience.

1. **Exclude the subdirectories from `pages`** using glob negation:

```yaml
pages:
  path: src/content/pages
  glob:
    - "!homes/**"
    - "!landing/**"
  url: "/[slug]/"
```

2. **Add a collection for each subdirectory** with its own `path` and `url`:

```yaml
homes:
  path: src/content/pages/homes
  url: "/homes/[slug]/"
landing:
  path: src/content/pages/landing
  url: "/landing/[slug]/"
```

3. **Add the new collections to `collection_groups`** under the same heading as `pages`.

No changes are needed on the Astro side — the content collection's glob loader already picks up all nested files, and the catch-all route uses `entry.id` which includes the subdirectory path.

## Data config for shared data

Use `data_config` when you have reusable data (CTAs, testimonials, site settings) that doesn't belong in a content collection. Data files are edited in the CloudCannon data editor and referenced from templates via JSON import.

```yaml
data_config:
  call-to-action:
    path: src/data/call-to-action.json
  testimonial:
    path: src/data/testimonial.json
```

In Astro templates, import the JSON directly:

```astro
---
import callToActionData from "@/data/call-to-action.json";
---
<CallToAction call_to_action={callToActionData} />
```

For visual editing, use `@data[key].path` syntax in editable regions:

```astro
<h2 data-editable="text" data-prop="@data[call-to-action].title">
  {call_to_action.title}
</h2>
```

Data files appear in the sidebar under their own collection group (typically "Data"). Configure `_inputs` and `_structures` globally since data files don't have collection-scoped config.

## Collection URLs

See [../collection-urls.md](../collection-urls.md) for the full reference on URL patterns (fixed/data placeholders, glob loader slug override, subdirectories, trailing slash, troubleshooting).

## Schemas for index pages

When a collection contains an `index.md` file alongside regular items (e.g. `blog/index.md` for the listing page metadata alongside `blog/post-1.md`, `blog/post-2.md`), define separate schemas so editors get the correct fields for each file type.

```yaml
blog:
  path: src/content/blog
  url: "/blog/[slug]/"
  schemas:
    default:
      path: .cloudcannon/schemas/post.md
      name: Blog Post
    blog_index:
      path: .cloudcannon/schemas/blog-index.md
      name: Blog Index
```

The `default` schema controls what editors see when creating or editing regular items. The index schema provides the right fields for the listing page. CloudCannon matches the schema to existing files automatically based on frontmatter shape, or you can set `_schema: blog_index` in the index file's frontmatter to be explicit.

The `[slug]` collapse behavior means no special URL handling is needed -- `index.md` resolves to `/blog/` while `post-1.md` resolves to `/blog/post-1/`.

Create the schema template files in `.cloudcannon/schemas/` with representative frontmatter for each type.

## New preview URL for schemas

When an editor creates a new file from a schema, it hasn't been built yet so it has no output URL. The `new_preview_url` key on a schema tells CloudCannon which page to load as the preview for newly created files.

```yaml
schemas:
  default:
    path: .cloudcannon/schemas/page.md
    name: Page
    new_preview_url: /elements/
  page_builder:
    path: .cloudcannon/schemas/page-builder.md
    name: Page Builder
    new_preview_url: /services/
```

Pick a `new_preview_url` that uses the same layout or template as the schema. `new_preview_url` is optional — if omitted, CloudCannon falls back to showing the site's homepage for new files.

**Caveat for drafts:** `new_preview_url` only helps with newly created files. It does not help with existing files marked `draft: true` — those pages are excluded from the build and have no output URL. For collections with a `draft` field, use `editor: content` on the add option so editors land in the content editor, which doesn't require a built page.

## Controlling the Add button with `add_options`

By default, CloudCannon shows all schemas in the "+ Add" button dropdown. Use `add_options` to restrict which schemas editors can create new files from.

```yaml
collections_config:
  pages:
    add_options:
      - name: Page
        schema: default
        icon: wysiwyg
      - name: Page Builder
        schema: page_builder
        icon: dashboard
  blog:
    add_options:
      - name: Blog Post
        schema: default
        icon: event_available
```

Each `add_options` entry supports: `name`, `schema`, `icon`, `editor` (`content`, `data`, or `visual`), `base_path`.

When `add_options` is defined, **only** the listed options appear. Schemas not listed (like index page schemas or one-off page schemas) are still used for editing existing files but can't be used to create new ones.

### When to use `add_options`

- **Index pages in content collections**: Blog, authors, tags -- where `index.md` has its own schema but shouldn't be duplicable.
- **One-off pages with dedicated routes**: Homepage, contact -- where the Astro route is hardcoded to load a specific entry.
- **Page builder pages**: When offering multiple schema types for new pages, `add_options` curates the list editors see.

### Using `editor: content` on add options

Set `editor: content` on the add option to open new files in the content editor instead of the visual editor. The content editor doesn't need a preview URL, so it works immediately. This is the preferred approach for collections where the primary editing workflow is writing markdown (blog posts, docs, articles), and for collections with a `draft` field — draft pages aren't built, so the visual editor has no page to preview. The content editor doesn't require a built page, making it the only reliable editing experience for drafts. For page-builder collections, use `new_preview_url` on the schema instead.

## Page building patterns

See [page-building.md](page-building.md) for the full guide on creating content-backed pages and array-based page builders, including the pages collection setup, catch-all route, BlockRenderer, and CC collection config.

For the structures reference (inline vs split, field completeness, previews, deriving from components), see [../structures.md](../structures.md).

## Prebuild script

If the audit identified pre-build scripts (theme generation, JSON generation, search indexing), create `.cloudcannon/prebuild`:

```bash
#!/usr/bin/env bash
set -e

node scripts/themeGenerator.js
node scripts/jsonGenerator.js
```

This runs before the build command on CloudCannon. Alternatively, chain the scripts in the build command itself:

```
node scripts/themeGenerator.js && node scripts/jsonGenerator.js && astro build
```

## Editor README

Create `.cloudcannon/README.md` as an editor-facing guide that appears on the Site Dashboard when the site is opened in CloudCannon. This is the first thing editors see, so it should orient non-technical users.

The README should cover:

- **Welcome and site overview** -- what the site is and what content it manages
- **Quick links** -- `cloudcannon:collections/<name>` links to each collection for one-click navigation
- **Collections guide** -- for each collection, explain what it contains and how to create, edit, and delete items. Mention which editing views are available (visual, content, data)
- **Data files** -- if the site has `data_config` entries, explain what each file controls
- **Site settings** -- where to find site-wide config (theme, navigation, social links)
- **New preview URL** -- if any schemas use `new_preview_url`, explain that newly created pages show a temporary preview of an existing page
- **Rich text components** -- if the site has `_snippets`, briefly list the available components editors can insert

Write in plain language. Avoid technical terms like YAML, frontmatter, Zod, schema, SSG, or Astro. Use `cloudcannon:` protocol links where helpful.

## Verification checklist

After generating and customizing the config, work through these checks before moving to the next phase:

- [ ] `cloudcannon.config.yml` exists and is valid YAML
- [ ] `.cloudcannon/initial-site-settings.json` exists with `"ssg": "astro"` and correct `build_command` and `output_path`
- [ ] `collections_config` has entries for every collection from the audit
- [ ] No non-content directories leaked into `collections_config` (e.g. `lib`, `source`, `migration`)
- [ ] No collections contain only a single file -- consolidate or group as needed
- [ ] `collection_groups` organise collections into logical sidebar groups
- [ ] `_inputs` is configured for common field types (images, dates, dropdowns, hidden fields)
- [ ] Icon fields use `type: select` with `allow_create: true`, `value_key: id`, and named values — use a data file for ~20+ icons
- [ ] Numeric values in content frontmatter that map to `text` inputs are quoted as strings
- [ ] Developer-only fields (`layout`, `_schema`, routing/rendering keys) have `hidden: true`
- [ ] Collections that produce pages have a `url` pattern with correct trailing slash. See [../collection-urls.md](../collection-urls.md)
- [ ] Collections with content in subdirectories: check `dist/` output for nested files against the URL template
- [ ] Collections with `index.md` files have separate schemas for the index page and regular items
- [ ] `paths.uploads` matches where the site stores images
- [ ] `.cloudcannon/prebuild` exists if pre-build steps are needed
- [ ] `file_config` entries exist for files with inputs not covered by global or collection-level config
- [ ] Object inputs have `type: object` with `preview.icon`
- [ ] All arrays with structures are explicitly linked via `type: array` + `options.structures`
- [ ] Structures use both `picker_preview` and `preview` (see [../structures.md](../structures.md))
- [ ] Sites with 5+ block types use the split co-located approach (`values_from_glob`)
- [ ] Every MDX component in content has a `_snippets` entry OR the file is restricted to `_enabled_editors: [source, data]` — unconfigured snippets always show as broken elements
- [ ] `markdown.options.table` is `true` if any content files contain Markdown-syntax tables
- [ ] `add_options` restricts the Add button to only creatable schemas
- [ ] Collections where editors should not create new files use `disable_add: true`
- [ ] Collections using `.md` files that don't build to a page have `_enabled_editors: [data]`
- [ ] If the site has 3+ reusable block components, a page builder schema is available. See [page-building.md](page-building.md)
- [ ] Schemas for creatable page types have `new_preview_url` or use `editor: content` on add options
- [ ] Collections with a `draft` field use `editor: content` on add options (drafts aren't built, so the visual editor can't preview them)
- [ ] `.cloudcannon/README.md` exists with editor-facing documentation

For common pitfalls and patterns, see [configuration-gotchas.md](configuration-gotchas.md).
