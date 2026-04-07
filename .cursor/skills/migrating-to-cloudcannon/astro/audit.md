# Audit (Astro)

Analyze the site before making any changes. Start by running the audit script to gather data automatically:

```bash
bash .cursor/skills/migrating-to-cloudcannon/scripts/audit-astro.sh .
```

This runs Gadget detection and collects project metadata. Use its output as a starting point, then fill in the sections below with findings that require judgment. Output lives in the project's `migration/audit.md`.

## 1. Astro version and dependencies

- Astro version (check `package.json`)
- Framework integrations and versions (React, Vue, Svelte, Solid -- look for `@astrojs/*` packages). Flag Vue/Svelte/Solid components -- these throw runtime errors in editable regions. For each, decide: convert to `.astro`/React, or keep and provide an editing fallback
- CSS framework (Tailwind, etc.)
- Markdown processing: remark/rehype plugins, MDX support (`@astrojs/mdx`)
- Package manager (npm, pnpm, yarn) and any lockfile present
- Node version requirements (`.nvmrc`, `engines` in `package.json`)
- **Astro 4 upgrade decision**: If the site is on Astro 4 or older, ask the user whether they want to upgrade to Astro 5+ before proceeding. Astro 4 limits the migration: no `editableRegions()` Astro integration (component re-rendering unavailable), `slug` is a reserved schema field, and `page.id` includes the file extension. The [Astro 4→5 migration guide](https://docs.astro.build/en/guides/upgrade-to/v5/) is well-documented. If the user declines, proceed with HTML-attribute-only visual editing (`data-editable` attributes still work for text, image, and array CRUD).

## 2. Content collections

Read `src/content.config.ts` (Astro 5+) or `src/content/config.ts` (older versions). For each collection:

- **Name** as exported in `collections`
- **Loader** type: `glob({ pattern, base })`, `file()`, or legacy folder-based
- **Content structure**: flat files (`post.md`) or folder-per-post (`post/index.md`). Flag folder-per-post as a candidate for flattening — see [content.md § Flattening folder-per-post content](content.md#flattening-folder-per-post-content)
- **Base directory** and glob pattern
- **Schema fields** with Zod types, defaults (`z.default()`), and optionality (`z.optional()`)
- **File naming conventions** (e.g. `-index.md` for listing page metadata -- these get renamed to `index.md` in the content phase)
- **How it's consumed**: `getCollection()`, `getEntry()`, or helper functions wrapping these
- **Body content usage**: Is the markdown file rendered as page, or is the file used only for its data on other pages? Flag data-only `.md` collections (e.g. team members, testimonials, authors). If a md file only uses its frontmatter for controlling data these pages need `_enabled_editors: [data]` in the configuration phase. If the md file uses its frontmatter and body content elsewhere (but doesn't build anywhere), these pages need `_enabled_editors: [content, data]`.

Also check for data files outside collections (JSON, YAML in `src/config/` or similar) that contain editable site configuration.

## 3. Pages and routing

Map every page route in `src/pages/` and how it gets its data:

- **Static pages** (`index.astro`, `about.astro`) and which collection/data they read
- **Dynamic routes** (`[slug].astro`, `[...path].astro`) and their `getStaticPaths()` logic. Check whether the route param comes from `post.id`, `post.data.slug`, or the filename -- this determines whether the CC `url` pattern needs `[slug]` (filename) or `{slug}` (frontmatter). Note that Astro's `glob()` loader uses frontmatter `slug` to override `post.id` when present, so `post.id` may not match the filename.
- **Pagination routes** using `paginate()`
- **Taxonomy routes** (tags, categories) -- these are typically generated from frontmatter values, not backed by their own collections

Note any routes that CloudCannon cannot generate (API-driven, server-rendered, redirects defined in `astro.config.mjs`).

## 4. Layouts and components

Document the component hierarchy:

- **Base layout** (`BaseLayout.astro` or similar) -- what it wraps (head, header, footer, default slot)
- **Page-level layouts** (e.g. `PostSingle.astro`) -- which pages use them, what props they expect
- **Partials** that render shared sections (CTA, testimonials, sidebars, feature grids)
- **Interactive islands** -- components with `client:*` directives (`client:load`, `client:visible`, `client:idle`). Flag the framework: React components work in editable regions; Vue, Svelte, and Solid components throw runtime errors and must be converted or given editing fallbacks
- **Shortcode components** auto-imported for MDX (check `astro.config.mjs` for MDX `remarkPlugins` or custom components)

Flag components that are good candidates for visual editing (hero banners, feature sections, CTAs) vs. those better suited to the data panel (navigation, social links, theme settings).

Also flag **presentational wrapper components** (e.g. a `<Link>` that just renders a styled `<a>`) that appear inside editable content. These can't survive source editing and need either inlining as plain HTML + CSS or a snippet config. See [visual-editing.md § Astro components in source editables](visual-editing.md#astro-components-in-source-editables).

Also flag **hardcoded text in page templates** as source editable candidates. Common locations: homepage hero sections, CTA copy, section headings on listing pages. These don't need a content collection or data file -- they use `EditableSource` to edit the raw `.astro` file directly. See [visual-editing.md § Source editables](visual-editing.md#source-editables-for-hardcoded-content).

### Classifying static pages: source editables vs. content collection

Source editables are the right choice for a few scattered text strings in a fixed layout. But many templates have static `.astro` pages with **structured, repeated data** -- arrays of cards, timeline entries, feature grids, hero sections with multiple fields. These need a different approach.

For each static `.astro` page, count the distinct data-driven sections. Pages with **3+ sections of repeated or structured components** (card lists, timelines, stats grids, hero with title/subtitle/buttons) are candidates for extracting into a `src/content/pages/` content collection rather than using source editables. Content collection entries give editors full CRUD control over arrays and structured fields via the data editor -- source editables can't do this.

Also note which components appear on **multiple pages** (e.g. the same card component used on homepage, projects, and services). These indicate a **reusable page type** that could be offered as a creatable schema in the CMS, enabling editors to create new pages of that type without developer help.

For page-oriented templates (portfolios, docs, marketing sites), assess whether the base layout is generic enough that a simple **title + markdown body page** would render correctly through it. If so, note this as a candidate for a generic creatable page schema.

Produce a clear classification for each static page:

- **Source editables** -- page has a few pieces of hardcoded text in a fixed layout, no arrays or repeated components
- **Content collection entry** -- page has structured/repeated data that editors need CRUD control over
- **Reusable page type** -- the page's rendering pattern (e.g. card listing, generic body page) could support creating new pages from the CMS

This classification feeds directly into the configuration phase. See [page-building.md § Creating a pages collection](page-building.md#creating-a-pages-collection-from-hardcoded-pages).

## 5. Build pipeline

Check `package.json` scripts and `astro.config.mjs`:

- The `build` script -- is it just `astro build` or does it run pre-build steps?
- Pre-build scripts (theme generation, search index generation, JSON data generation)
- `astro.config.mjs` settings: `output` mode, `trailingSlash`, `build.format`, `site`, `base`
- Environment variables the build depends on (`.env` files, `astro:env` usage)
- Integrations registered in `astro.config.mjs` and their configuration

CloudCannon's build must reproduce the full pipeline, including pre-build scripts.

## 6. Flags and special patterns

Note anything that needs special handling in later phases:

- Non-standard content paths or file naming conventions
- Content that references other content by string rather than ID (e.g. `author: "John Doe"` matched by slugifying)
- Computed/derived pages (taxonomies, pagination) that aren't backed by their own content files
- SSG-specific markdown extensions that CloudCannon can't preview (MDX components, custom remark plugins)
- Existing CMS or deployment configuration (`.sitepins/`, `netlify.toml`, `vercel.json`)
- `set:html` directives in templates (these render raw HTML and affect how content editing works)
- Pre-build code generation that must run for the site to build
- **Inline HTML in markdown content that has no markdown equivalent** -- scan `.md` content files for HTML blocks like `<figure>`, `<video>`, `<details>`, `<iframe>`, etc. For each pattern, ask: can this be expressed in standard markdown? If not, it's a snippet candidate. Document each pattern (tag structure, attributes, which values vary between instances) and note it as input for `_snippets` configuration in Phase 2. This applies to `.md` files only -- MDX component usage is covered separately above. See [../snippets.md § Raw snippets for inline HTML](../snippets.md#raw-snippets-for-inline-html-in-md-files).
- **Astro version impacts on migration**: Astro 4 (legacy `src/content/config.ts`) vs Astro 5+ (new `src/content.config.ts` with `glob()` loader) affects multiple migration decisions: `slug` is a reserved schema field in Astro 4 (use `permalink` instead), the `editable-regions` Astro integration requires Astro 5+, and `page.id` includes the file extension in Astro 4 legacy collections (`cv.md`) but not in Astro 5+ glob loader (`cv`). Note the Astro version prominently in the audit.

