# Content (Astro)

> **Checklist discipline:** This doc ends with a [Review checklist addendum](#review-checklist-addendum). Work through the review checklist items as you go, then verify the addendum before marking this phase complete.

Guidance for reviewing and restructuring content files to be CMS-friendly in an Astro site. Run this phase after configuration (Phase 2). Small, targeted content fixes needed to support configuration decisions (adding `slug` fields, normalizing values) can happen during Phase 2 — see [../SKILL.md § Phases are sequential, not siloed](../SKILL.md).

## When to skip this phase

If the audit shows content is already well-structured -- consistent frontmatter, clean markdown, no unusual extensions in content bodies -- skip content changes and just document the patterns. Not every migration needs file edits.

## Review checklist

Work through these checks for every migration. Document findings even when no changes are needed.

### Astro template artifacts in extracted content

When extracting hardcoded data from `.astro` templates into content frontmatter, check for Astro JSX expression artifacts like `{""}`, `{"</>"}`, or similar sequences that leaked from the template syntax. These are meaningless in YAML content and should be stripped to plain text. Search content files for `{"` to catch them.

### Frontmatter consistency

For each content collection, compare the files against the Zod schema in `content.config.ts`:

- **Required fields are present in every file.** If the schema defines a field as required but files omit it, either add it to the files or make the schema `z.optional()`. Prefer matching what the schema expects.
- **Optional fields with defaults.** When a field has `z.default()`, Astro fills in the default at runtime. CloudCannon editors see what's in the file, not the runtime default. If a field is commonly used and should be visible in the editor, add it explicitly to content files even if the schema doesn't require it.
- **`draft` field.** If the site filters on `draft`, ensure it's present where needed. When the filter uses `!data.draft`, omitting the field is equivalent to `draft: false` (since `!undefined === true`), so missing `draft` fields are safe. But for CloudCannon's UI, an explicit `draft: false` is better -- it gives editors a visible toggle. Collections with a `draft` field should default to the content editor (`editor: content` on add options or `_enabled_editors` starting with `content`). Draft pages aren't built, so the visual editor has no page to preview — the content editor doesn't require a built page.
- **Date formats.** Use ISO 8601 (`2022-04-04T05:00:00Z`). Astro's `z.coerce.date()` handles both Date objects and ISO strings, but CloudCannon expects consistent date formatting.
- **Image paths.** For static images (`public/`), use paths relative to the public root (e.g. `/images/banner.png`). For optimized images (`src/assets/`), use the full repo-relative path (e.g. `/src/assets/images/hero.jpg`) so `import.meta.glob` can resolve them at build time. Do not move optimized images to `public/` — see [configuration.md § Image path configuration](../../cloudcannon-configuration/astro/configuration.md#image-path-configuration) for the full upload path setup.

### Field naming

- Match the existing component prop names. If components use `imageAlt`, use `imageAlt` in frontmatter — not `image_alt`. This avoids translation layers in components. When creating new fields with no existing convention, prefer `snake_case`.
- Avoid name collisions with CloudCannon reserved keys (e.g. `_inputs`, `_structures`, `_schema`).
- Keep field names descriptive and consistent across collections (e.g. always `image`, not sometimes `image` and sometimes `thumbnail`).

### Index files and the `-index` convention

Some Astro templates use a `-index.md` file to hold listing/index page metadata (title, description, image for the `/blog` listing page, for example). This pattern works by:

1. The glob loader in `content.config.ts` picks up all `.md` files including `-index.md`
2. A helper like `getSinglePage()` filters out IDs starting with `-` (so `-index` never appears as a regular item)
3. A helper like `getListPage(collection, "-index")` fetches it by exact ID for listing page metadata

**Migration action:** Rename `-index.md` to `index.md` in every collection that uses this convention and refactor the helpers accordingly:

1. **Rename the files.** Run the rename script to handle this automatically:
   ```bash
   bash .cursor/skills/migrating-to-cloudcannon/scripts/rename-dash-index.sh .
   ```
2. **Update `getSinglePage()`** to filter on `id === "index"` instead of `id.startsWith("-")`.
3. **Update `getListPage()` callers** from `"-index"` to `"index"`.

**Why `index`:** CloudCannon's `[slug]` placeholder collapses `index` to an empty string. A collection with `url: "/blog/[slug]/"` produces `/blog/` for `index.md` and `/blog/my-post/` for `my-post.md`. This means the index page gets the correct listing URL without any special-case URL config.

**CloudCannon implications:** The index file stays in the same collection as its siblings -- no separate collection or filter needed. In Phase 2 (configuration), define a separate schema on the collection for the index page so editors get the right fields when editing it vs. a regular item. See the "Schemas for index pages" section in configuration.md.

### Mixed-type fields

Some templates use fields with mixed types (e.g. `price` is a string `"Free"` for some items and an object `{monthly, annual}` for others). CloudCannon's data editor works best with consistent types. If the template only uses one branch of the type (e.g. only displays `price.monthly` from the object), simplify to a single type in the content files (e.g. always a string). Update the rendering code to match.

### Content references (string-based)

Some templates reference related content by string rather than by collection ID. For example, blog posts might use `author: "John Doe"` where the matching is done by slugifying the name and comparing to author filenames.

This works but is fragile -- renaming an author breaks the link. In Phase 2, configure CloudCannon's select input for these fields so editors pick from a list of valid values rather than typing freeform.

No content file changes are needed for this pattern.

### Markdown content body

Check for:

- **MDX components and shortcodes** -- auto-imported components or explicit `import` statements in `.mdx` files. CloudCannon's editors can't render these but can parse and re-serialize them if snippet configs are defined. Document which files use them, note each component's props, and whether `client:load` is used. This inventory feeds directly into the snippet configuration in Phase 2. See the `cloudcannon-snippets` skill for the full workflow.
- **Inline HTML that has no markdown equivalent** -- HTML blocks like `<figure>`, `<video>`, `<details>`, `<iframe>` can't be expressed in standard markdown syntax. These must become snippets so editors get a structured interface instead of raw HTML. For each pattern identified in the audit: (1) normalize all instances to a consistent format (same attributes, same whitespace), (2) document the normalized pattern in the project's migration notes. The snippet config itself is created in Phase 2 -- see [snippets.md § Raw snippets for inline HTML](../../cloudcannon-snippets/snippets.md#raw-snippets-for-inline-html-in-md-files). Simple inline HTML that editors don't need to modify (e.g. `<sup>`, `<br>`) can be left as-is.
- **Complex embedded HTML** with `set:html` directives in the rendering template may not round-trip cleanly. Usually not an issue for content bodies.
- **Empty content bodies.** Index files and section data often have no body content (all data lives in frontmatter). This is normal and CloudCannon handles it fine.
- **Remark/rehype plugin output.** If custom remark or rehype plugins transform markdown in ways that affect the content structure (e.g. adding IDs to headings, wrapping images), note them but don't change the content. The plugins run at build time.

### Handling styled HTML in frontmatter

When extracting hardcoded page content into frontmatter, inline HTML with CSS classes, entities, and responsive markup must not be preserved verbatim. CloudCannon's visual editor can't interact with custom HTML classes — they render with red outlines and are uneditable. The principle: **frontmatter stores content, components own presentation.**

Resolve each case using this decision tree (ordered by preference):

1. **Inline text styling** (highlighted/accented text, brand-colored emphasis): Use `type: html` input with **editor styles CSS**. This is the preferred approach for styling expressible as a CSS class. The pattern (from [Jetstream](https://github.com/CloudCannon/jetstream-astro-template)):
   - Configure the input as `type: html` with `options.styles: .cloudcannon/styles/editor.css`
   - Create `.cloudcannon/styles/editor.css` defining semantic classes (e.g. `span.highlight-text { color: var(--color-brand); }`)
   - The component renders with `set:html` and has matching CSS in its own styles
   - Editors see the styling in the rich text toolbar and can toggle it like bold/italic
   - Strip Tailwind utility classes from content and replace with semantic class names that map to the editor stylesheet
   - Example: `<span class="text-accent dark:text-white">Astro 5.0</span>` becomes `<span class="highlight-text">Astro 5.0</span>`

2. **Fixed-structure multi-part text** (job title + company + dates): Decompose into structured sub-fields and template in the component. E.g. a step `title` packing `Graphic Designer <br /> <span class="font-normal">ABC Studio</span> <br /> <span class="text-sm">2021 - Present</span>` becomes `job_title`, `company`, `date_range`. Use this when each segment has distinct semantic meaning.

3. **Line-separated list items** (`<br />` between entries): When `<br />` tags are used to simulate a list in a plain text field, convert to either an HTML list (`<ul><li>...</li></ul>`) in a `type: html` field, or an array of strings — a plain text input can't control `<br>` tags. If the field is already rich text, `<br />` tags are fine as regular line breaks; only convert to a proper list when the content is semantically a list. When converting to HTML lists, the field must be `type: html` with `allow_custom_markup: true` so the list renders correctly in the editor.

4. **Responsive layout HTML** (`<br class="block sm:hidden" />`, `&nbsp;`): Strip the HTML, store plain text, handle responsiveness in CSS/component logic. These are layout concerns that don't belong in content.

### Page-builder content migration

> **MANDATORY** — Follow the [field completeness rule in structures.md](../../cloudcannon-configuration/structures.md#field-completeness-rule). Every field from the structure `value` MUST appear in content frontmatter, even if empty.

**Pattern for each block:**

1. Identify the block's `_type` from the original hardcoded page
2. Look up the structure definition (either in `cloudcannon.config.yml` under `_structures.content_blocks` or in the co-located `*.cloudcannon.structure-value.yml` file)
3. Copy the full field list from the structure `value`
4. Populate fields that have content from the original page
5. Leave remaining fields at their default/empty values (strings empty, booleans `false`, arrays `[]`, objects with empty nested fields)

**Why this matters:** The visual editor throws `undefined` errors when editable regions reference fields missing from frontmatter. Getting field completeness right during the initial content migration avoids a backfill step later. See [structures.md](../../cloudcannon-configuration/structures.md) for the full field completeness rule.

**Scaling warning:** Extracting 10+ pages of widget data into YAML is one of the most error-prone steps in a migration. Common pitfalls:

- **YAML quoting** — strings containing HTML (`<span class="...">`, `<br />`) or special characters (`:`, `#`, `{`) must be quoted. Use `>-` for multiline strings or wrap in double quotes with escaped inner quotes.
- **Field completeness at scale** — with 15+ block types, it's easy to forget fields on one or two blocks. Cross-reference each block against its structure definition systematically rather than working from memory.
- **Build early, build often** — don't extract all pages before running a build. Extract a few representative pages first, build, fix errors, then extract the rest. This catches schema mismatches and guard issues before they multiply.

**Null values in YAML:** Bare keys with no value (`tagline:`) parse as `null`. The Zod schema must use `.nullish()` instead of `.optional()` on optional fields, otherwise `null` values fail validation and `z.union` silently falls through to a non-page-builder schema — stripping `content_blocks` from the data. See [structures.md](../../cloudcannon-configuration/structures.md#handling-null-values-from-empty-yaml-fields) for details on aligning the Zod schema and CloudCannon config.

### Astro slot content → frontmatter field

When an Astro component receives rich content via a `<slot />` (e.g. `<Content2>` receiving a `<Fragment>` with headings and paragraphs), this content must become a frontmatter field for CMS editing. The pattern:

1. **Add a `content` prop** to the component alongside the slot. Render it with `set:html` when populated, falling back to the slot for backward compatibility:
   ```astro
   const slotContent = Astro.props.content || await Astro.slots.render("default");
   // ...
   {slotContent && <div set:html={slotContent} />}
   ```
2. **Add the field to the structure** with `type: html` and `allow_custom_markup: true`.
3. **In content files**, put the HTML string in the `content` YAML field using `>-` for multiline.

**One field per visual slot:** When a component shows `propA || propB` (e.g. `subtitle || description`), two fields feed the same visual slot. In the CMS structure, keep only one field for that slot. Pick one name and use it everywhere — the structure, the Zod schema, the content files, and the component.

Decide which to keep:
- If the two fields have no semantic distinction (description is just an alias for subtitle), remove one. Use the name that best describes what the editor sees.
- If the fallback serves a genuinely different purpose (e.g. `description` is also used for page meta/SEO), keep both but rename to make the distinction obvious: `subtitle` for the visual slot, `meta_description` for SEO. Add a `comment` on the SEO input explaining its purpose.

The goal: every field in the data panel corresponds to exactly one thing on the page, and every inline editable's `data-prop` points to a field that exists in the structure. See [visual-editing-reference.md § Data-prop mismatch](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#page-builder-blocks) for the related visual editing guidance when a shared component renames the prop.

### Resolving optimized image paths from frontmatter

When components receive image paths as strings from frontmatter (e.g. `/src/assets/images/hero.jpg`) but need `ImageMetadata` for `<Image>` or `<Picture>`, use `import.meta.glob` to resolve them at build time. Reference: [CloudCannon astro-minimal-starter `left-right.astro`](https://github.com/CloudCannon/astro-minimal-starter/blob/main/src/components/left-right/left-right.astro).

```astro
---
import type { ImageMetadata } from "astro";
import { Picture } from "astro:assets";

const { image, imageAlt } = Astro.props;

const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,avif}",
  { eager: true },
);
const imageSrc = typeof image === "string"
  ? (images[image]?.default ?? image)
  : image;
---

{imageSrc && <Picture src={imageSrc} alt={imageAlt} widths={[400, 800]} />}
```

Key points:
- `{ eager: true }` resolves at build time (no async)
- The `typeof` check handles components whose prop type allows both `ImageMetadata` and `string` (common in templates with dual static/optimized support)
- The `?? image` fallback handles external URLs or `public/` paths gracefully
- Works with `<Image>`, `<Picture>`, or any `astro:assets` component
- Frontmatter stores the full repo-relative path (`/src/assets/images/...`) — this matches the `import.meta.glob` pattern

When migrating a component that originally used `import` statements for images (e.g. `import heroImg from "@/assets/images/hero.jpg"`), replace the import with this glob pattern so the image path can come from CMS-editable frontmatter instead of hardcoded imports.

### Flattening folder-per-post content

When content uses a folder-per-post structure (`blog/my-post/index.md`), CC's `[slug]` placeholder resolves to an empty string (because the filename is `index`). This forces workarounds: explicit `slug` frontmatter plus `{slug}` data placeholders.

The preferred fix is to flatten to flat files (`blog/my-post.md`). Astro auto-generates slugs from the filename, and CC's `[slug]` works natively — no extra frontmatter needed.

**Checklist before flattening:**

1. **Check for sibling assets** — images or other files co-located in the post's directory. Move images to `src/assets/images/` (preserving Astro's image optimization) and other static files to `public/`. Update references accordingly — imported images use the new `src/assets/images/` path, static files use absolute paths from `public/`.
2. **Check for relative imports in MDX** — components imported with `./component.astro` paths. Move them to `src/components/` and set up `astro-auto-import` so they're available without explicit imports.
3. **Rename files** — `dir/index.md` becomes `dir.md`. Remove the now-empty directories.
4. **Remove `slug` frontmatter** — no longer needed since the filename provides the slug.
5. **Update CC config** — switch URL patterns from `{slug}` to `[slug]`.

**When NOT to flatten:**

- The folder structure encodes meaningful grouping beyond just the slug

In these cases, keep folder-per-post and use the `{slug}` workaround documented in [configuration-gotchas.md](../../cloudcannon-configuration/astro/configuration-gotchas.md#folder-per-post-content-and-cc-url-placeholders).

### Converting API-driven content to local collections

When a site fetches content from an external API at build time (e.g. JSONPlaceholder, headless CMS, REST endpoints), that content is invisible to CloudCannon. Convert it to a local content collection so editors can manage it directly.

**Steps:**

1. Create the collection directory (e.g. `src/content/blog/`) with sample markdown files matching the API's data shape
2. Add a collection definition to `content.config.ts` with a Zod schema covering the fields the templates use
3. Refactor page routes that called `fetch()` to use `getCollection()` / `getEntry()` + `getStaticPaths()`
4. Refactor any components that also fetched from the API (listing components, launchers, search)
5. Remove the API URL from environment variables / config

**Sample content:** Create enough sample posts to test pagination and listing pages (6+ for a typical blog with `pageSize: 6`). Use thematically appropriate content rather than lorem ipsum — it makes CloudCannon demos more convincing.

**Watch for inconsistent slug generation.** API-driven pages often have custom slug logic (truncation, transliteration) that differs from Astro's content collection IDs. Content collection entries use their filename as the ID, so ensure route patterns match (`params: { post: post.id }`).

### Extracting TypeScript config to JSON data files

Sites often store editable settings (navigation, social links, colors, CTAs) in a TypeScript config file that CloudCannon can't edit. Extract editable parts to JSON data files while keeping non-editable settings (asset imports, computed values) in the TS file.

**Steps:**

1. Identify which config values editors should control vs. which are developer-only
2. Create JSON files in `src/data/` for each editable group (e.g. `navigation.json`, `social-links.json`)
3. Update consuming components to import from the JSON files
4. Strip extracted values from the TS config (set to empty defaults)
5. Add `data_config` entries and `file_config` with appropriate `_inputs` and `_structures` in the CC config

**Keep the TS config for:** Asset imports (`import logo from '...'`), computed values, framework-specific settings (colors that map to CSS vars, feature flags), anything that references other TS modules.

**After extraction, audit the consuming component template.** The data file should contain ALL visible/configurable values — not just what was in the original TS config. Check the component template for hardcoded values that should also be in the data file: icons (e.g. a hardcoded `lucide:rocket`), colors, link targets, label text, image paths. If an editor can see it on the page and it could reasonably vary, it belongs in the data file.

### Data collections

Data collections hold content that doesn't directly build its own page — it's consumed by other pages instead. They can live inside `src/content/` (as Astro content collections) or outside it (as standalone JSON/YAML files exposed via `data_config`). The deciding factor isn't location, it's purpose:

- **Builds its own page** (e.g. a blog post, a service page) — page collection, gets a URL.
- **Used on one page only** (e.g. homepage hero) — belongs in that page's frontmatter, not a separate collection.
- **Used across multiple pages** (e.g. navigation, social links, testimonials, tags) — data collection. Keeps shared data consistent and editable in one place.

Data collections should have `disable_url: true` in the CC collections config since they don't produce pages. Verify the data files themselves:

- JSON/YAML is valid and well-formatted
- Nested structures aren't so deep that CloudCannon's editor becomes unwieldy (3+ levels of nesting is a flag)
- Arrays of objects either have consistent shapes or are backed by structures definitions for each shape

## Review checklist addendum

> **MANDATORY — Run this checklist on every content file before considering the content phase complete.**

- [ ] **CRITICAL:** Every block in `content_blocks` includes ALL fields from its structure definition — open the structure file and cross-reference field-by-field (see [structures.md](../../cloudcannon-configuration/structures.md)). Common misses: `tagline`, `content`, `subtitle`, and nested object sub-keys like `callToAction.variant`
- [ ] Empty/default values are used for fields not present in the original page (strings empty, booleans `false`, arrays `[]`)
- [ ] No block-level HTML (e.g. `<br />`, `<p>`, `<ul>`) in frontmatter strings unless the corresponding input is configured with block-level editing (e.g. a rich-text or markdown input with appropriate `options`)
- [ ] Every array field in every structure-value file has an explicit `_inputs` entry linking it to its `_structures` definition
- [ ] **Data file completeness**: For each JSON data file, compare the consuming component template against the data file fields. Every visible/configurable value (icons, link targets, label text, image paths) is in the data file, not hardcoded in the template

