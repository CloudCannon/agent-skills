# Configuration (Astro)

> **Checklist discipline:** This doc ends with a [Verification checklist](#verification-checklist). Read it now so you know what to aim for, then work through every item before marking this phase complete.

Guidance for creating and configuring `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` for an Astro site.

## Baseline generation with Gadget

Use the Gadget CLI to generate a baseline configuration. Run subcommands individually to cross-reference against the Phase 1 audit. See [../gadget-guide.md](../gadget-guide.md) for the full CLI reference and all available commands.

```bash
npx @cloudcannon/gadget generate --auto --init-settings --ssg astro
```

**When Gadget is unavailable** (sandbox network restrictions, version incompatibility, etc.), write the config manually using the audit findings. Follow the same review and customization checklists below — Gadget is a time-saver, not a prerequisite.

## Review the generated config

After generation, read `cloudcannon.config.yml` and check:

- **`source`** -- Do not add this during migration. It is **deployment-specific** (monorepos, non-standard layouts) and belongs with the user's hosting setup. For typical Astro sites, **omit `source`** so CloudCannon's root is the **repository root**; that way config can reference paths outside `src` when needed. If Gadget writes a `source` value, **remove it** unless the project truly requires it.
- **`collections_config`** -- are all content collections present? Do paths match the `base` directories from `content.config.ts`? **Remove `output: true`** if present on any collection — this key is defunct in unified config. Collections are automatically output when they have a `url` pattern. The only related key still in use is `disable_url: true` (to prevent a collection from being output).
- **`paths`** -- Set `static` to `public` (Astro's default asset folder) unless the project uses a different public directory. Set `uploads` to match where uploaded images should land: use `public/images` when the site keeps images in a subfolder, `public` when assets live at the root of public, and default to **`public/images`** when there is no precedent yet. See [Image path configuration](#image-path-configuration) below for handling optimized vs static images.
- **Build settings** (`.cloudcannon/initial-site-settings.json`) -- Build settings must be nested under a `build` key (the old flat format with `build_command`/`output_path` at the root is defunct). Structure: `ssg` at the root, then `build.install_command`, `build.build_command`, `build.output_path`, and `build.node_version`. Align values with the repo: `ssg`: `"astro"`; `install_command`: from the detected package manager (omit if there is none); `build_command`: the script from `package.json` if present, otherwise `"astro build"`; `output_path`: `"dist"`; `node_version`: if `.nvmrc` or `.node-version` exists in the project root, set `"file"` (CC reads the version from that file automatically); otherwise if `package.json` has `engines.node`, extract the major version (e.g. `">=18"` → `"18"`); otherwise omit (CC uses its default). Prefer **`.cloudcannon/prebuild`** for extra setup steps so `build_command` stays a straight build, not a shell chain. **Note:** This file only takes effect on first site creation. For existing CloudCannon sites, build settings must be changed in the CloudCannon UI (**Site Settings > Builds > Configuration**). See [gadget-guide.md](../gadget-guide.md) for details.

## Customize the config

### Targeted content fixes during configuration

The migration phases are sequential, but don't treat them as rigid boundaries. When a CC config pattern requires content files to have a field that's inconsistent or missing, **add it** rather than settling for a worse config. Examples: adding `slug` frontmatter so `{slug}` URL patterns work, adding `_schema` to disambiguate collection schemas, normalizing a `date` field format.

The decision rule: if skipping the change means the config is wrong or fragile, make the change now. If the change is structural (moving files, adding new fields that alter rendering, reorganizing collections), defer to the content phase.

### Customization checklist

Gadget produces a structural baseline. The following customizations are almost always needed, informed by the Phase 1 audit:

- **`_inputs`** -- configure how fields appear in the editor (dropdowns, date pickers, image uploaders, comments, hidden fields). Map these from the Zod schemas discovered in the audit. When a frontmatter field contains markdown (e.g. a hero description with `**bold**` text), use `type: markdown`, not `type: textarea`. The same goes for fields that contain html elements (e.g. a hero description with `<strong>bold</strong>` text) - they should use `type: html`, instead of `type: textarea`. Use scoped input keys (e.g. `hero.description`) when the general input should stay as `textarea` but a specific context needs `markdown`.
- **`_structures`** -- define reusable component structures for arrays and object inputs. **MANDATORY for ALL array and object inputs on the site** — not just page builder blocks. Every array field (`items`, `actions`, `stats`, `prices`, `testimonials`, `images`, etc.) must have a corresponding structure definition AND an explicit `_inputs` entry linking the array to that structure. Without this, editors cannot add items to arrays. Do not rely on CloudCannon's naming-convention heuristic — it is unreliable. See [../structures.md](../structures.md) for the full requirements.
- **`icon`** -- every collection should have an `icon` key with a [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) name so it gets a meaningful icon in the CloudCannon sidebar instead of a generic default. Pick icons that reflect the collection's purpose (e.g. `wysiwyg` for pages, `post_add` for blog posts, `home` for homepages, `settings` for data/config).
- **All schema fields mapped** -- cross-reference every field in the Zod schema against the `_inputs` config. Every user-facing field needs an appropriate input type (`textarea` for multi-line strings like excerpts/descriptions, `datetime` for dates, `image` for image paths, etc.). Missing fields fall back to CC's type inference, which is often wrong. When unsure whether a field is user-facing or developer-only, check whether its value is rendered as visible text on the built page. If it appears on the page, it should be editable with an appropriate input type. Only fields undergoing heavy programmatic transformation (e.g. used purely as a build-time lookup key) should be hidden.
- **`collection_groups`** -- organize collections into sidebar groups for a clean editing experience.
- **`_editables`** -- configure rich text editor toolbars per collection or globally.
- **Editor styles** -- when the audit flagged styled HTML in content fields (inline spans with CSS classes for accent colors, emphasis, etc.), create `.cloudcannon/styles/editor.css` with semantic class definitions and reference it from `type: html` inputs via `options.styles`. This lets editors apply custom styling (e.g. brand-colored highlight text) through the rich text toolbar without Tailwind utility classes in the content. See [content.md § Handling styled HTML in frontmatter](../../migrating-to-cloudcannon/astro/content.md#handling-styled-html-in-frontmatter) and the [Jetstream template](https://github.com/CloudCannon/jetstream-astro-template) for the reference pattern.
- **`markdown`** -- if content files contain Markdown-syntax tables (`| col | col |`), set `markdown.options.table: true`. See [configuration-gotchas.md § Markdown tables](configuration-gotchas.md#set-markdownoptionstable-when-content-has-markdown-tables).
- **`_snippets`** -- configure snippets for non-standard markdown amongst markdown content. In Astro this is often MDX components used in rich text content. Built-in templates like `mdx_component` resolve automatically — no `_snippets_imports` needed. See the `cloudcannon-snippets` skill.
- **`_select_data`** -- define shared dropdown options for fields used across collections. When values need friendly display names (e.g. icon identifiers), use objects with `name`/`id` instead of flat strings, paired with `value_key: id` on the input:

```yaml
_select_data:
  icons:
    - name: GitHub
      id: lucide:github
    - name: Arrow Right
      id: lucide:arrow-right

_inputs:
  icon:
    type: select
    options:
      allow_create: true
      value_key: id
      preview:
        text:
          - key: name
      values: _select_data.icons
```
- **Schemas** -- define templates for creating new content files, based on the content patterns found in the audit.
- **`data_config`** -- a root-level key that targets specific data files via a path, and exposes them for use in CloudCannon (eg. a data file of tags that can be used to populate a multi-select input called tags). Once a data set has been exposed in the `data_config`, its available for use on a select type input by defining it as the input's, `options.values` value (it uses the key we've defined in the `data_config` as the name to use as a reference).
- **`file_config`** -- an **array** of objects, each with a `glob` key targeting specific files. Do NOT use the old map-keyed format (`file_config: src/file.yaml: ...`) — it must be an array with `- glob:` entries. Use it when key names would collide at broader scopes, or to configure inputs for settings/data files. Supports `$` to reference the root of the file or structure. Example:

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

The full set of configuration keys is defined in the [CloudCannon Configuration JSON Schema](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/cloudcannon-config.schema.json). For IDE autocomplete and validation, use JSON Schema Store with the setup in [gadget-guide.md § JSON Schemas](../gadget-guide.md#json-schemas) (recommended extensions, no `# yaml-language-server: $schema=...` line in YAML).

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
- Use `@data[key].field` syntax for editable regions (e.g. `data-prop="@data[call-to-action].title"`)

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

Data files configured via `data_config` allows those files to be referenced by other CloudCannon config, but **they do not automatically appear in the sidebar**. The most common reason to add an entry to `data_config` is to populate select inputs. To make data files browsable and editable in the sidebar, add a `collections_config` entry pointing to the data file(s) and group it under a "Data" `collection_group`. Configure `_inputs` and `_structures` globally since data files don't have collection-scoped config.

## Image path configuration

Astro sites typically have two kinds of images:

- **Static** (`public/`): served as-is via plain `<img>`. Paths in frontmatter are relative to the public root (e.g. `images/photo.jpg` or `/images/photo.jpg`) — they do NOT include `public/`.
- **Optimized** (`src/assets/`): processed by Astro's build pipeline via `<Image>`, `<Picture>`, or other `astro:assets` components for format conversion, resizing, etc. If images are in `src/assets/`, assume the developer intended them for optimization. **Do not move them to `public/`.**

### Global vs per-input paths

Set the global paths for the common case (usually static/non-optimized), and use per-input overrides for optimized image fields:

```yaml
# Global: blog images, inline markdown images, general uploads
paths:
  static: public
  uploads: public/images

# Per-input: optimized image fields in page builder blocks, structured components
_inputs:
  image:
    type: image
    options:
      paths:
        uploads: /src/assets/images
        static: ''
```

The per-input `static: ''` (empty string) is critical — it tells CloudCannon not to strip any prefix, so frontmatter stores the full repo-relative path (e.g. `/src/assets/images/hero.jpg`) that `import.meta.glob` needs to resolve the image at build time.

Place the per-input override on image inputs that feed into `<Image>` or `<Picture>`. When all component images are optimized and only rich text / blog images are static, the global path handles the static case and per-input handles the optimized case.

### Rich text / toolbar images

Blog post inline images inserted via markdown or the rich text toolbar use the global `paths.uploads` (`public/images`) — markdown `![](...)` produces plain `<img>`, which Astro does not optimize. If editors should not insert raw `<img>` (because all images should be optimized), disable the image toolbar button in `_editables` and offer optimized images only through structured inputs or snippets.

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

### `_enabled_editors` order determines the default

The first editor in the `_enabled_editors` list is the default when opening a file. Order matters. Recommended orderings:

- **Page builder collections**: `[visual, data]` — visual editor shows the live page; data editor for bulk field editing
- **Blog posts** (with visual editing support): `[visual, content, data]` — visual is default for existing posts. Use `editor: content` on `add_options` to open *new* posts in the content editor (which doesn't need a built page)
- **Data-only collections** (no page output): `[data]`
- **`.astro` page collections** (source editables): `[visual]`

A common mistake is putting `data` first on page collections — this makes every page open in the data editor instead of the visual editor.

### Using `editor: content` on add options

Set `editor: content` on the add option to open new files in the content editor instead of the visual editor. The content editor doesn't need a preview URL, so it works immediately. This is the preferred approach for collections where the primary editing workflow is writing markdown (blog posts, docs, articles), and for collections with a `draft` field — draft pages aren't built, so the visual editor has no page to preview. The content editor doesn't require a built page, making it the only reliable editing experience for drafts. For page-builder collections, use `new_preview_url` on the schema instead.

Note that `editor: content` on add options only controls the editor for *new* files. Existing files use the `_enabled_editors` order. Blog posts should still have `visual` first in `_enabled_editors` so existing posts open in the visual editor by default.

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
- [ ] `.cloudcannon/initial-site-settings.json` exists with `"ssg": "astro"` and build settings nested under `"build"` (`build_command`, `output_path`, `install_command`)
- [ ] `node_version` is set in initial-site-settings.json: `"file"` when `.nvmrc` or `.node-version` exists, or the major version from `package.json` `engines.node` if present
- [ ] `collections_config` has entries for every collection from the audit
- [ ] No defunct pre-unified keys remain: `output: true` on collections (remove — `url` implies output), `singular_key`, `parser`, `collections_config_override`
- [ ] No non-content directories leaked into `collections_config` (e.g. `lib`, `source`)
- [ ] No collections contain only a single file -- consolidate or group as needed
- [ ] `collection_groups` organise collections into logical sidebar groups
- [ ] `_inputs` is configured for common field types (images, dates, dropdowns, hidden fields)
- [ ] Icon fields use `type: select` with `allow_create: true`, `value_key: id`, and named values — use a data file for ~20+ icons
- [ ] Numeric values in content frontmatter that map to `text` inputs are quoted as strings
- [ ] Developer-only fields (`layout`, `_schema`, routing/rendering keys) have `hidden: true`
- [ ] Collections that produce pages have a `url` pattern with correct trailing slash. See [../collection-urls.md](../collection-urls.md)
- [ ] Collections with content in subdirectories: check `dist/` output for nested files against the URL template
- [ ] Collections with `index.md` files have separate schemas for the index page and regular items
- [ ] `paths.uploads` matches where the site stores images. If the site has both optimized (`src/assets/`) and static (`public/`) images, global paths target static and per-input overrides target optimized (see [Image path configuration](#image-path-configuration))
- [ ] `.cloudcannon/prebuild` exists if pre-build steps are needed
- [ ] `file_config` entries exist for files with inputs not covered by global or collection-level config — must be array format (`- glob: ...`), not the old map-keyed format
- [ ] Every object input (both global `_inputs` and inside structures/sub-structures) has `type: object` with `options.preview.icon`. Check inline `_structures` entries too — nested objects like `callToAction` and `image` inside `prices`, `testimonials`, etc. are easy to miss
- [ ] **CRITICAL:** All arrays with structures are explicitly linked via `type: array` + `options.structures` — this includes arrays INSIDE co-located structure-value files (e.g. `items`, `actions`, `stats` inside widget structures) AND nested arrays inside shared sub-structures (e.g. `items` inside `prices`). Do not rely on naming-convention heuristic
- [ ] ALL structure values have a `preview` block with a meaningful `text` key lookup — this includes co-located widget files AND inline sub-structures in `_structures` (actions, items, stats, images, etc.). Without `preview`, sidebar array items show only the generic label instead of pulling the item's title or name
- [ ] Every input has some explicit config: objects have `type: object` + preview icon, selects have `type: select`, images have `type: image`, booleans have `type: switch`, text areas have `type: textarea` or `type: html`. No input should be left unconfigured if CloudCannon can't infer the right type from the field name alone
- [ ] Sites with 5+ block types use the split co-located approach (`values_from_glob`)
- [ ] Every MDX component in content has a `_snippets` entry, or `_enabled_editors: [source, data]` only as a last resort after snippet/refactor attempts — unconfigured components break the content editor; document rationale in migration notes
- [ ] MDX files with explicit `import` statements: set up `astro-auto-import` (or equivalent) so imports are injected at build time and removed from source files — bare `import` lines show as raw text in the content editor. See [astro.md § Auto-import](../../cloudcannon-snippets/astro.md#auto-import-keeping-import-statements-out-of-content)
- [ ] `_enabled_editors` order has the preferred default editor first (`visual` for page collections, `visual` then `content` for blog posts)
- [ ] `<br />` tags in plain text frontmatter fields that simulate lists are converted to HTML lists (`<ul><li>`) in `type: html` fields, or split into arrays. `<br />` in rich text fields is fine. See [content.md § Handling styled HTML in frontmatter](../../migrating-to-cloudcannon/astro/content.md#handling-styled-html-in-frontmatter)
- [ ] `markdown.options.table` is `true` if any content files contain Markdown-syntax tables
- [ ] `add_options` restricts the Add button to only creatable schemas
- [ ] Collections where editors should not create new files use `disable_add: true`
- [ ] Collections using `.md` files that don't build to a page have `_enabled_editors: [data]`
- [ ] If the site has 3+ reusable block components, a page builder schema is available. See [page-building.md](page-building.md)
- [ ] Schemas for creatable page types have `new_preview_url` or use `editor: content` on add options
- [ ] Collections with a `draft` field use `editor: content` on add options (drafts aren't built, so the visual editor can't preview them)
- [ ] `.cloudcannon/README.md` exists with editor-facing documentation

For common pitfalls and patterns, see [configuration-gotchas.md](configuration-gotchas.md).
