# Audit (Astro)

Analyze the site before making any changes. Start by running the audit script to gather data automatically:

```bash
bash skills/migrating-to-cloudcannon/scripts/audit-astro.sh .
```

This runs CloudCannon CLI detection and collects project metadata. Use its output as a starting point, then fill in the sections below with findings that require judgment. Record findings in `migration/audit.md` at the project root.

## 1. Astro version and dependencies

- Astro version (check `package.json`)
- Framework integrations and versions (React, Vue, Svelte, Solid -- look for `@astrojs/*` packages). Flag Vue/Svelte/Solid components as unsupported in editable regions (see [overview.md § Astro scope](overview.md)). For each, decide: convert to `.astro`/React, or keep and provide an editing fallback
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
- **Body content usage**: Is the markdown file rendered as page, or is the file used only for its data on other pages? Flag data-only `.md` collections (e.g. team members, testimonials, authors). If a md file only uses its frontmatter for controlling data these pages need `_enabled_editors: [data]` in the configuration phase. If the md file uses its frontmatter and body content elsewhere (but doesn't build anywhere), these pages need `_enabled_editors: [content, data]`. Note how body content is rendered in templates — `<Content />` from `entry.render()`, `<slot />` in layouts, etc. — these are candidates for `@content` visual editing in Phase 4.

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
- **Interactive islands** -- components with `client:*` directives (`client:load`, `client:visible`, `client:idle`). Note the framework for each — unsupported frameworks need conversion or editing fallbacks (see [overview.md § Astro scope](overview.md))
- **Shortcode components** auto-imported for MDX (check `astro.config.mjs` for MDX `remarkPlugins` or custom components)

Flag components that are good candidates for visual editing (hero banners, feature sections, CTAs) vs. those better suited to the data panel (navigation, social links, theme settings).

- **`astro-icon` usage** -- flag if components use `<Icon>` from `astro-icon`. Ensure `src/icons/` exists (even if empty) to avoid `Unable to load the "local" icon set!` build errors. Guard `<Icon>` renders on a truthy name in `<template>` blueprints (`{icon && <Icon ... />}`). `astro-icon` is fully compatible with `editableRegions()` and `registerAstroComponent` — register these components normally.

Also flag **image handling patterns** for each component: does it use `<Image>` or `<Picture>` from `astro:assets` (optimized, images in `src/assets/`) or plain `<img>` (static, images in `public/`)? This classification determines upload path configuration in Phase 2. Images in `src/assets/` must stay there — do not move them to `public/`.

Also flag **presentational wrapper components** (e.g. a `<Link>` that just renders a styled `<a>`) that appear inside editable content. These can't survive source editing and need either inlining as plain HTML + CSS or a snippet config. See [visual-editing-reference.md § Astro components in source editables](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#astro-components-in-source-editables).

Also flag **hardcoded text in page templates**, but classify it through the census table below -- not by defaulting to source-editable. Hero sections, CTA copy, and section headings on listing pages almost always belong in a page-builder `pages` collection entry, not pinned to the `.astro` source. Source-editable is reserved for long-form prose where the layout _is_ the body. See [visual-editing-reference.md § When to use source editables](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#when-to-use-source-editables).

### Classifying static pages: source editables vs. content collection

Use this decision table for every `.astro` page that isn't already in a collection. **Page builder is the default for unique-layout pages** -- source-editable is the exception, reserved for long-form prose.

| Page characteristics                                                                                                            | Pattern                                                                                                                                                                               | Why                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Many entries, identical shape (blog posts, team profiles, products, articles)                                                   | **Fixed-schema collection**                                                                                                                                                           | Consistency matters; editors fill fields, not layout                                                       |
| Multiple "sibling" pages that share most structure (services, locations, specialties)                                           | **Fixed-schema collection**                                                                                                                                                           | Shared shape benefits all entries; one template change updates all                                         |
| Unique layout per page, but multiple such pages exist (homepage, about, our-team, contact, landing pages, FAQ, marketing pages) | **Page builder `pages` collection** ← DEFAULT                                                                                                                                         | Editors compose from blocks. New pages addable from CMS. Multiple schemas in the same collection are fine. |
| Long-form prose with minimal structure (legal, policy docs, terms)                                                              | **Fixed-schema collection with markdown body** (e.g. `legal`) -- only fall back to source-editable when there are 1-2 pages AND content rarely changes AND no new pages will be added | Body is the content; structure is minimal                                                                  |
| Truly one-shot, never edited by content team (404, system pages)                                                                | **Hardcoded `.astro`**                                                                                                                                                                | No editor value                                                                                            |

Then produce this **mandatory census table** in `migration/audit.md` for every `.astro` page that isn't already in a collection. Filling it forces you to count sections and answer the "would the editor want to add another like this?" question explicitly:

| Page file                        | Distinct content sections   | Layout repeated on other pages? | Editor will add similar pages? | Recommended pattern             |
| -------------------------------- | --------------------------- | ------------------------------- | ------------------------------ | ------------------------------- |
| `src/pages/index.astro`          | hero, press, nav-cards, cta | No                              | Maybe                          | Page builder                    |
| `src/pages/about.astro`          | hero, story, team, cta      | No                              | Maybe                          | Page builder                    |
| `src/pages/privacy-policy.astro` | title, long markdown body   | Yes (terms, etc.)               | No                             | Fixed-schema `legal` collection |
| ...                              | ...                         | ...                             | ...                            | ...                             |

> ❌ **Don't classify a unique-layout page as source-editable just because it's "the only one of its kind."** The right question is: does it have 2+ distinct content sections? If yes, page builder. Source-editable is for long-form prose where the layout _is_ the body.
>
> ❌ **Don't propose a CloudCannon "collection of one"** (a `homepage` collection with one entry, an `about` collection with one entry, etc.). Use one `pages` collection that holds homepage, about, contact, landing pages, etc. -- possibly with multiple schemas. The only exception is when the site genuinely has a single landmark page plus one repeating section (e.g. homepage + blog).

This classification feeds directly into the configuration phase. For census rows that say "Page builder", go straight to [page-building.md § When to reach for page builder](page-building.md#when-to-reach-for-page-builder).

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
- **Styled HTML in content fields** -- when migrating hardcoded `.astro` pages to content collection frontmatter, flag fields that contain inline HTML with CSS classes (`<span class="text-accent">`, `<span class="font-normal">`), HTML entities (`&nbsp;`), or `<br>` tags with responsive classes (`<br class="block sm:hidden" />`). These render on the live site but are uneditable in CloudCannon's rich text editors (custom HTML shows red outlines). They need resolution during the content phase -- see [content.md § Handling styled HTML in frontmatter](content.md#handling-styled-html-in-frontmatter)
- **Scroll-reveal / entrance animations** -- search for `opacity: 0` in CSS, `IntersectionObserver` in JS, and class names like `reveal`, `aos`, `animate-on-scroll`, `fade-in`, `scroll-fade`. These hide content until scrolled into view and break in the visual editor. Note the files responsible so they can be patched in Phase 4. See [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#scroll-reveal-and-entrance-animations)
- Pre-build code generation that must run for the site to build
- **Inline HTML in markdown content that has no markdown equivalent** -- scan `.md` content files for HTML blocks like `<figure>`, `<video>`, `<details>`, `<iframe>`, etc. For each pattern, ask: can this be expressed in standard markdown? If not, it's a snippet candidate. Document each pattern (tag structure, attributes, which values vary between instances) and note it as input for `_snippets` configuration in Phase 2. This applies to `.md` files only -- MDX component usage is covered separately above. See [snippets.md § Raw snippets for inline HTML](../../cloudcannon-snippets/snippets.md#raw-snippets-for-inline-html-in-md-files).
- **Astro version impacts on migration**: Astro 4 (legacy `src/content/config.ts`) vs Astro 5+ (new `src/content.config.ts` with `glob()` loader) affects multiple migration decisions: `slug` is a reserved schema field in Astro 4 (use `permalink` instead), the `editable-regions` Astro integration requires Astro 5+, and `entry.id` includes the file extension in legacy collections (`cv.md`) but not in `glob()` loader collections (`cv`). Note: Astro 5 sites can still use legacy `type: "content"` in `src/content/config.ts` — the `entry.id` behavior depends on the loader type, not just the Astro version. Note the Astro version and loader type prominently in the audit.
