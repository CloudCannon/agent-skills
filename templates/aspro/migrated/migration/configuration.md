# Configuration Notes

## Pages Collection

Uses `z.discriminatedUnion("_schema", [...])` with four page schemas:
- `homepage` -- index page with `content_blocks`
- `page_builder` -- generic page with `content_blocks` (about, services)
- `contact` -- page with `show_form` boolean + `content_blocks`
- `page` -- simple markdown page (no content blocks)

## Content Blocks

Uses `z.discriminatedUnion("_type", [...])` with seven block types:
`hero`, `features`, `content`, `content2`, `service_list`, `values`, `rich_text`

## siteConfig

Converted from TypeScript (`src/config/site.ts`) to JSON (`src/data/site-settings.json`). TS file re-exports from JSON for backward compatibility with all existing consumers. OG image moved from `src/assets/og-image.png` (optimized) to `public/og-image.png` (static) since JSON can't import `ImageMetadata`.

## Shared Headline Component

`Headline.astro` accepts `titleProp` and `subtitleProp` parameters so parent widgets can specify which data field the editable region targets. Hero uses `subtitleProp="description"` since it maps its `description` prop to Headline's `subtitle` slot.

## Image Resolution

Content.astro and Content2.astro use `import.meta.glob` to resolve string image paths (from CMS frontmatter) to `ImageMetadata` for Astro's `<Image>` optimization. Falls back to the raw string if no glob match.

## Route Structure

Specific page routes (`index.astro`, `about.astro`, `services.astro`, `contact.astro`) coexist with `[...slug].astro` catch-all. Specific routes take priority; catch-all handles CMS-created pages. Astro emits harmless warnings about the conflicts.
