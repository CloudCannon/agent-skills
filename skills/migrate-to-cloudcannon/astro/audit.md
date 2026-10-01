# Audit (Astro)

Run the audit script first to gather data automatically:

```bash
bash <skills-dir>/migrate-to-cloudcannon/scripts/audit-astro.sh .
```

Run it from the site root; `<skills-dir>` is wherever the skills are installed (for example `.agents/skills`).

Use its output as a starting point, then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Astro version and dependencies

- Astro version (check `package.json`)
- **Bookshop.** If the script reports Bookshop markers, read [cloudcannon-bookshop](../../cloudcannon-bookshop/SKILL.md) now. It changes Phases 2 to 4.
- Framework integrations and versions (React, Vue, Svelte, Solid -- look for `@astrojs/*` packages).
  **Why:** React, Vue and Svelte each need their renderer imported in `registerComponents.ts`; Solid components are unsupported in editable regions (see [overview.md § Astro scope](overview.md)). For each Solid component, decide: convert to a supported framework, or keep it and provide an editing fallback.
- CSS framework (Tailwind, etc.)
- Markdown processing: remark/rehype plugins, MDX support (`@astrojs/mdx`)
- Package manager (npm, pnpm, yarn) and any lockfile present
- Node version requirements (`.nvmrc`, `engines` in `package.json`)
- **Astro 4 upgrade decision**: if the site is on Astro 4 or older, ask the user whether to upgrade to Astro 5+ before proceeding.
  **Why:** Astro 4 limits the migration — no `editableRegions()` integration (component re-rendering unavailable), `slug` is a reserved schema field, and `page.id` includes the file extension. See the [Astro 4→5 migration guide](https://docs.astro.build/en/guides/upgrade-to/v5/). If the user declines, proceed with HTML-attribute-only visual editing (`data-editable` attributes still work for text, image, and array CRUD).

## 2. Content collections

Read `src/content.config.ts` (Astro 5+) or `src/content/config.ts` (older versions). For each collection:

- **Name** as exported in `collections`
- **Loader** type: `glob({ pattern, base })`, `file()`, or legacy folder-based
- **Content structure**: flat files (`post.md`) or folder-per-post (`post/index.md`).
  **Why:** folder-per-post is a candidate for flattening — see [content.md § Flattening folder-per-post content](content.md#flattening-folder-per-post-content).
- **Base directory** and glob pattern
- **Schema fields** with Zod types, defaults (`z.default()`), and optionality (`z.optional()`)
- **File naming conventions** (e.g. `-index.md` for listing page metadata -- these get renamed to `index.md` in the content phase)
- **How it's consumed**: `getCollection()`, `getEntry()`, or helper functions wrapping these
- **Body content usage**: is the markdown file rendered as a page, or used only for its data on other pages?
  **Why:** data-only `.md` collections (team members, testimonials, authors) need `_enabled_editors: [data]` if only frontmatter is used, or `_enabled_editors: [content, data]` if the body is rendered elsewhere but doesn't build to its own page. Note how body content is rendered in templates — `<Content />` from `entry.render()`, `<slot />` in layouts — these are candidates for `@content` visual editing in Phase 4.

Also check for data files outside collections (JSON, YAML in `src/config/` or similar) that contain editable site configuration.

> **Data file shape — anti-pattern:** If a data file holds like-shaped items (team members, products, FAQs), it must be a **top-level array** with a `slug`/`id` field on each item — not an object keyed by slug (`{ "office-a": {...}, "office-b": {...} }`). Object-of-records locks editors to existing keys and breaks the "Add" button.

## 3. Pages and routing

Map every page route in `src/pages/` and how it gets its data:

- **Static pages** (`index.astro`, `about.astro`) and which collection/data they read
- **Dynamic routes** (`[slug].astro`, `[...path].astro`) and their `getStaticPaths()` logic. Check whether the route param comes from `post.id`, `post.data.slug`, or the filename.
  **Why:** this determines whether the CC `url` pattern needs `[slug]` (filename) or `{slug}` (frontmatter). Astro's `glob()` loader uses frontmatter `slug` to override `post.id` when present, so `post.id` may not match the filename.
- **Pagination routes** using `paginate()`
- **Taxonomy routes** (tags, categories) -- typically generated from frontmatter values, not backed by their own collections

Note any routes that CloudCannon cannot generate (API-driven, server-rendered, redirects defined in `astro.config.mjs`).

## 4. Layouts and components

Document the component hierarchy:

- **Base layout** (`BaseLayout.astro` or similar) -- what it wraps (head, header, footer, default slot)
- **Page-level layouts** (e.g. `PostSingle.astro`) -- which pages use them, what props they expect
- **Partials** that render shared sections (CTA, testimonials, sidebars, feature grids)
- **Interactive islands** -- components with `client:*` directives (`client:load`, `client:visible`, `client:idle`). Note the framework for each.
  **Why:** unsupported frameworks need conversion or editing fallbacks (see [overview.md § Astro scope](overview.md)).
- **Shortcode components** auto-imported for MDX (check `astro.config.mjs` for MDX `remarkPlugins` or custom components)

Flag components that are good candidates for visual editing (hero banners, feature sections, CTAs) vs. those better suited to the data panel (navigation, social links, theme settings).

- **`astro-icon` usage** -- flag if components use `<Icon>` from `astro-icon`.
  **Why:** ensure `src/icons/` exists (even if empty) to avoid `Unable to load the "local" icon set!` build errors. Guard `<Icon>` renders on a truthy name in `<template>` blueprints (`{icon && <Icon ... />}`). `astro-icon` is fully compatible with `editableRegions()` and `registerAstroComponent` — register these components normally.

Also flag **image handling patterns** per component: does it use `<Image>`/`<Picture>` from `astro:assets` (optimized, `src/assets/`) or plain `<img>` (static, `public/`)?
**Why:** classification determines upload path configuration in Phase 2. Images in `src/assets/` must stay there — do not move them to `public/`.

Also flag **presentational wrapper components** (e.g. a `<Link>` that just renders a styled `<a>`) that appear inside editable content.
**Why:** these can't survive source editing and need either inlining as plain HTML + CSS or a snippet config. See [visual-editing-reference.md § Astro components in source editables](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#astro-components-in-source-editables).

Also flag **hardcoded text in page templates**, but classify it through the census table below -- not by defaulting to source-editable.
**Why:** hero sections, CTA copy, and section headings on listing pages almost always belong in a page-builder `pages` collection entry, not pinned to the `.astro` source. Source-editable is reserved for long-form prose where the layout _is_ the body. See [visual-editing-reference.md § When to use source editables](../../cloudcannon-visual-editing/visual-editing-reference.md#when-to-use-source-editables).

### Classifying static pages: source editables vs. content collection

Classify every `.astro` page that isn't already in a collection, using the decision table and the mandatory census table in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages). Name each census row by its page file (`src/pages/index.astro`, `src/pages/about.astro`). For a cross-collection reverse lookup, filter the owning collection: `getCollection(C, e => e.data.x.some(r => r.id === currentId))`.

For census rows that say "Page builder", go straight to [page-building.md § When to reach for page builder](page-building.md#when-to-reach-for-page-builder).

The two follow-on censuses in Astro form:

- [ ] **Primitive-vs-computed census** — for every page template / route file with ≥3 `{data.x}` interpolations, fill out:

  | Interpolation                                  | Kind                   | Action                             |
  | ---------------------------------------------- | ---------------------- | ---------------------------------- |
  | `{data.name}`                                  | primitive text         | ✅ keep — primitive editable OK    |
  | `{data.inStock ? "In stock" : "Out of stock"}` | computed (ternary)     | ❌ extract to registered component |
  | `{locations[data.location].street}`            | computed (lookup)      | ❌ extract or use `@data[key]`     |
  | `{site.phone}`                                 | computed (shared-data) | ❌ extract or use `@data[key]`     |

  Target: zero computed interpolations in route files.

- [ ] **Frontmatter co-location census** — for every registered component in `src/cloudcannon/componentMap.ts`:

  | Component file                    | Used from page template? | Fields nested under one frontmatter key? | Action |
  | --------------------------------- | ------------------------ | ---------------------------------------- | ------ |
  | (list every registered component) |                          |                                          |        |

  Refactor before shipping. Do not ship `propPrefix=""` / conditional wrappers / `Astro.props ?? {}` workarounds.

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
- **Styled HTML in content fields** -- flag fields that contain inline HTML with CSS classes (`<span class="text-accent">`), HTML entities (`&nbsp;`), or `<br>` tags with responsive classes (`<br class="block sm:hidden" />`) when migrating hardcoded `.astro` pages to content collection frontmatter.
  **Why:** these render on the live site but are uneditable in CloudCannon's rich text editors (custom HTML shows red outlines). They need resolution during the content phase -- see [content.md § Handling styled HTML in frontmatter](content.md#handling-styled-html-in-frontmatter).
- **Scroll-reveal / entrance animations** -- search for `opacity: 0` in CSS, `IntersectionObserver` in JS, and class names like `reveal`, `aos`, `animate-on-scroll`, `fade-in`, `scroll-fade`.
  **Why:** these hide content until scrolled into view and break in the visual editor. Note the files responsible so they can be patched in Phase 4. See [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/visual-editing-reference.md#scroll-reveal-and-entrance-animations).
- Pre-build code generation that must run for the site to build
- **Inline HTML in markdown content that has no markdown equivalent** -- scan `.md` content files for HTML blocks like `<figure>`, `<video>`, `<details>`, `<iframe>`.
  **Why:** if the pattern can't be expressed in standard markdown, it's a snippet candidate. Document each pattern (tag structure, attributes, which values vary between instances) as input for `_snippets` configuration in Phase 2. This applies to `.md` files only — MDX component usage is covered separately above. See [snippets.md § Raw snippets for inline HTML](../../cloudcannon-snippets/snippets.md#raw-snippets-for-inline-html-in-md-files).
- **Astro version impacts on migration** -- note the Astro version and loader type prominently in the audit.
  **Why:** Astro 4 (legacy `src/content/config.ts`) vs Astro 5+ (new `src/content.config.ts` with `glob()` loader) affects multiple decisions: `slug` is a reserved schema field in Astro 4 (use `permalink` instead), the `editable-regions` integration requires Astro 5+, and `entry.id` includes the file extension in legacy collections (`cv.md`) but not in `glob()` loader collections (`cv`). Astro 5 sites can still use legacy `type: "content"` in `src/content/config.ts` — the `entry.id` behavior depends on the loader type, not just the Astro version.

## 7. Sectioning recommendation

Once the census table and collection inventory are filled in, record:

- Content-backed pages (pages with a content file or collection entry behind them — not generated taxonomy or pagination pages)
- Rows in the census table recommending page-builder or fixed-schema collection (the hardcoded `.astro`→YAML conversions)
- Distinct collections (existing + proposed in census)

If any 2 of {pages > 30, conversions > 15, collections > 5} are tripped, **do not start Phase 2 yet.** Read [SKILL.md § Sectioning large migrations](../chunking.md), draft a proposed sectioning, and present it to the user for a one-pass-vs-sectioned decision before continuing.
