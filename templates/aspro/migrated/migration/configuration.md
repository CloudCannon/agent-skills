# Configuration notes: Aspro

## Collections
- `pages` -- page builder collection at `src/content/pages/`, uses `z.discriminatedUnion("_schema", ...)` with page and page_builder schemas
- `blog` -- existing blog collection, unchanged

## Structures
7 co-located block types in `src/components/widgets/`:
- hero, features, content, content2, values, service_list, form

Shared sub-structures in config: actions, items, services, nav_links

## Data files
- `src/data/nav.json` -- extracted from siteConfig.navLinks
- `src/data/social.json` -- extracted from siteConfig.socialLinks
- siteConfig updated to import from JSON files

## Decisions
- Used `z.discriminatedUnion("_schema", ...)` for page schemas to avoid union ambiguity with optional fields
- Used `z.discriminatedUnion("_type", ...)` for content blocks
- All optional fields use `.nullish()` to handle YAML null values
- Icon select uses `_select_data.icons` with `allow_create: true` for extensibility
- Content2 `content` field (originally slot content) uses `type: html` with `allow_custom_markup`
- Content `description` simplified from string[] to single string for CMS-friendliness
- Hero title HTML (gradient span, responsive br) needs handling in content extraction
