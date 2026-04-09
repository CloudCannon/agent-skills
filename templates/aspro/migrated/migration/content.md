# Content notes: Aspro

## Pages extracted
- index.md, about.md, services.md, contact.md, widgets.md -- all as page_builder schema with content_blocks

## Image handling
- Copied images from `src/assets/images/` to `public/images/` for string path access
- Updated Content.astro and Content2.astro to handle both string paths and ImageMetadata via typeof check
- Blog images were already string paths in public/blog/

## Content2 slot → content field
- Content2 originally used `<Fragment>` slot content for rich text between items
- Added `content` prop (html string) to Content2 -- renders via `set:html`
- Falls back to default slot for backward compatibility

## FormBlock wrapper
- Created FormBlock.astro as a page builder wrapper around the existing Form.astro
- Accepts optional title/tagline props, wraps Form in WidgetWrapper

## Catch-all route
- Created `[...slug].astro` for CMS-created pages
- Existing dedicated routes updated to fetch from pages collection via `getEntry`
- Dedicated routes take priority over catch-all (Astro routing)
