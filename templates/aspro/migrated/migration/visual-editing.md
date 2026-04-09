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

## Decisions
- Headline editables are shared across all widgets -- scoped correctly via page builder blocks
- Used editable-text custom element for button labels inside anchors
- Used editable-image custom element for image wrappers (Content, Content2, blog)
- Content2 slot content converted to `content` prop with set:html + data-type="block"
