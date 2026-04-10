# CC-Friendly Astro Conventions

Architectural constraints for building an Astro site that will be edited in CloudCannon. Read this **before scaffolding** if the Astro site is being generated as part of a larger task (e.g. converting from WordPress or another platform). Following these conventions avoids structural refactoring during the CloudCannon migration.

This is not a migration guide — see [overview.md](overview.md) for the full migration workflow.

## Output mode

Use `output: "static"` (Astro's default). CloudCannon requires static output — `server` and `hybrid` modes are not supported.

## Astro version

Use Astro 5+. The CloudCannon editable regions integration (`@cloudcannon/editable-regions`) requires Astro 5+, and `content.config.ts` with the `glob()` loader is the expected content collection format.

## Content collections

- Define collections in `src/content.config.ts` using `glob({ pattern, base })` loaders.
- Use **flat files** (`blog/my-post.md`), not folder-per-post (`blog/my-post/index.md`). Flat files work natively with CloudCannon's `[slug]` URL placeholder; folder-per-post requires workarounds.
- Co-locate images with content only when necessary — prefer `src/assets/` for optimized images (see Images below).

## Frontmatter

- Match the casing the components already use. When building from scratch with no existing convention, prefer `snake_case`.
- Include all fields explicitly in every file, even optional ones with defaults — CloudCannon editors see what's in the file, not Astro's runtime defaults.
- Use consistent types per field across a collection (don't mix strings and objects for the same key).
- Use ISO 8601 for dates (`2024-04-04T05:00:00Z`).

## Images

- **Optimized images** (`<Image>`, `<Picture>` from `astro:assets`): keep in `src/assets/`. Store the full repo-relative path in frontmatter (`/src/assets/images/hero.jpg`). Resolve at build time with `import.meta.glob` — don't use hardcoded `import` statements.
- **Static images** (plain `<img>`): keep in `public/`. Reference with paths relative to the public root (`/images/photo.jpg`).
- Don't move optimized images to `public/` — it breaks Astro's build-time processing.

## Components

- Use `.astro` components and React (`@astrojs/react`) for anything that will be visually editable in CloudCannon. Vue, Svelte, and Solid components throw runtime errors inside editable regions.
- Avoid presentational wrapper components (e.g. a `<Link>` that just renders a styled `<a>`) inside editable content — they'd need snippet configuration to survive editing. Use plain HTML + CSS instead.

## Page structure

- **Prefer content-backed pages** over hardcoded templates. Pages with structured or repeated data (card lists, feature grids, timelines) should pull from content collections so editors get CRUD control. Reserve hardcoded templates for truly fixed layouts with only a few editable text strings.
- For pages with 3+ reusable block components, use a **page builder pattern**: a `content_blocks` array in frontmatter where each item has a `_type` discriminator field. This lets editors assemble pages from reusable blocks.
- Add a **catch-all route** (`src/pages/[...slug].astro`) so pages created from the CMS have a route. Astro's routing priority means dedicated routes always win.
- When multiple page types share a collection, use `z.union` or `z.discriminatedUnion` in the Zod schema.

## Shared data

Cross-page content (navigation, CTAs, testimonials, site settings) should live in JSON files (e.g. `src/data/cta.json`) rather than scattered across collection frontmatter. This keeps shared data consistent and editable in one place via CloudCannon's data editor.

## Markdown content

- Keep content bodies as clean markdown. Avoid custom remark/rehype plugins that structurally transform content in ways CloudCannon's editor can't reproduce.
- Inline HTML that editors need to modify (`<figure>`, `<video>`, `<details>`) should follow a consistent structure so it can be configured as a CloudCannon snippet.
- For MDX sites: components used in content should be auto-imported (via `astro-auto-import` or equivalent) rather than using explicit `import` statements in content files — bare imports show as raw text in CloudCannon's content editor.
