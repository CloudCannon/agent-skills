# Visual editing notes: Aspro

## Setup
- Installed @cloudcannon/editable-regions
- Added editableRegions() integration to astro.config.mjs
- Created registerComponents.ts using shared componentMap
- Added side-effect import in BaseLayout

## Editable regions added

### Shared components
- Headline.astro: data-editable="text" on tagline, title (set:html), subtitle (set:html)

### Widget components
- Hero.astro: tagline text editable, actions array with text editables on button labels
- Features.astro: features array with title/description text editables
- Content.astro: image editable (editable-image wrapper)
- Content2.astro: content (slot) as block text editable, items array with title/description editables, actions array with text editables, image editable
- Values.astro: items array with title/description text editables
- ServiceList.astro: services array with title/description text editables

### Blog
- [...slug].astro: title text editable, image editable, @content block text editable

### Page builder
- BlockRenderer wraps each block with data-editable="array-item" + data-component={_type}
- Page templates wrap content_blocks with data-editable="array" + data-component-key="_type"

## Post-migration fixes
- WidgetWrapper: gated `reveal` class with `!import.meta.env.ENV_CLIENT` to prevent scroll-reveal animations hiding content in the visual editor
- FormBlock: same reveal fix on inner form container
- Headline: added `subtitleProp` prop (defaults to "subtitle") so parent widgets can specify the correct data-prop. Hero passes `subtitleProp="description"` since its data model uses `description`, not `subtitle`
- Content: removed `subtitle` field (used `description` only), passes `subtitleProp="description"` to Headline
- Content2: removed `description` field (uses `subtitle` only)
- Icon select: converted `_select_data.icons` from flat strings to objects with `name`/`id`, added `value_key`/`preview` to icon input
- Images: reverted from `public/images/` back to `src/assets/images/` for optimization, added `import.meta.glob` resolution in Content.astro and Content2.astro, added per-input `paths.uploads` for optimized images

## Decisions
- Headline editables are shared across all widgets -- scoped correctly via page builder blocks
- Used editable-text custom element for button labels inside anchors
- Used editable-image custom element for image wrappers (Content, Content2, blog)
- Content2 slot content converted to `content` prop with set:html + data-type="block"
