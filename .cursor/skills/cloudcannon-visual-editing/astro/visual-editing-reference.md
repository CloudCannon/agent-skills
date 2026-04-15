# Visual Editing Reference (Astro)

Pattern reference for editable region types, data paths, component re-rendering, and edge cases. Read this doc on demand when a checklist item in [visual-editing.md](visual-editing.md) links here — don't read it all upfront.

For the full editable regions API (region types, path syntax, API actions), see [../editable-regions.md](../editable-regions.md).

## Guard optional fields

The primary defence against `undefined` errors is ensuring all fields exist in the content frontmatter via structure definitions (see [structures.md](../../cloudcannon-configuration/structures.md) — field completeness rule). Conditional guards are the safety net for cases where a field is legitimately optional even when the structure defines it.

Every element with a `data-editable` attribute must be conditionally rendered if its field can be undefined or null. CloudCannon's editable regions actively inspect the resolved value — rendering an element with `data-prop="subtitle"` when `subtitle` is undefined causes a runtime error, even if the original template rendered unconditionally.

```astro
<!-- Bad: errors if subtitle is undefined -->
<p set:html={subtitle} data-editable="text" data-prop="subtitle" />

<!-- Good: only renders when subtitle exists -->
{subtitle && <p set:html={subtitle} data-editable="text" data-prop="subtitle" />}
```

This applies to text, image, and any other editable type. When a shared sub-component like `Headline.astro` renders the editable elements, the guards belong in that sub-component.

### Shared sub-component editables inside page builders

When a shared component like `Headline.astro` renders title/subtitle/tagline for many widgets, adding `data-editable` attributes there is correct — inside a page builder block, editables are scoped to the parent registered component. So `data-prop="title"` on Headline resolves to `content_blocks[n].title`.

**Prop alignment pitfall:** If the parent widget passes data through the shared component with a fallback (e.g. `subtitle={subtitle || description}`), the editable targets the prop name (`subtitle`), not the fallback source (`description`). Content files must populate the field the editable targets — otherwise the editable binds to null while the visible text comes from the fallback field.

### Content-sourced objects and arrays are never falsy

Content YAML objects with all-null inner fields and empty arrays are truthy in JavaScript. Guard on meaningful inner fields (`image?.src &&`) and array length (`actions?.length > 0 &&`). See [structures.md § Guarding empty objects and arrays](../../cloudcannon-configuration/structures.md#guarding-empty-objects-and-arrays-in-components) for the full pattern with examples.

**Astro-specific: dual slot/prop components.** Many Astro widgets accept both slot content (rendered as strings) and structured objects (from content collections). They commonly use `typeof value === 'string'` to branch between the two. When fixing guards for these components, preserve the string branch:

```astro
{(typeof callToAction === 'string' ? callToAction : (callToAction?.text || callToAction?.icon)) && ...}
{(Array.isArray(actions) ? actions.length > 0 : actions) && ...}
```

## Text editing

**Where to put text regions:**

- **Semantic or layout element** — when an existing element is the natural host (`<h1>`, `<p>`, `<li>`, etc.), add `data-editable="text"` and `data-prop="<path>"` to it directly.
- **Wrapper-only** — when extra markup exists only to host editable text (e.g. inside a link, slot content, or a conditional branch), prefer `<editable-text>` over `<span data-editable="text">`: same behaviour, clearer intent, and fewer clashes with generic `span` rules. See [editable-regions.md § Custom Element Equivalents](../editable-regions.md#custom-element-equivalents).
- **Stay primitive when needed** — keep `<span data-editable="text">` when CSS or legacy markup already targets `span`, or when a specific integration is clearer with the explicit primitive.

```astro
<h1
  set:html={markdownify(title)}
  class="mb-4"
  data-editable="text"
  data-prop="title"
/>
```

For block-level rich text (paragraphs, headings, lists), add `data-type="block"`:

```astro
<div class="content" data-editable="text" data-type="block" data-prop="@content">
  <Content />
</div>
```

The `@content` path targets the file's markdown body (not frontmatter).

**Choosing `data-type` for HTML-rendered frontmatter fields:**

This applies to any frontmatter field rendered as HTML — whether via `set:html` directly, or through a markdown parser like `markdownify()` or `marked()` (which produces HTML that then goes through `set:html`).

Keep the original element and don't add `data-type` unless there's a reason to. The two signals that `data-type="block"` is needed:

1. **The field's input config allows block-level content.** The CloudCannon input configuration (`_inputs` in `cloudcannon.config.yml` or schema files) is the source of truth for what a field accepts. If the input config permits block-level options (lists, headings, etc.), the on-page text editable needs `data-type="block"` to match — otherwise a user adds a list via the sidebar, and the on-page editable can't handle it.
2. **The existing content already contains block-level HTML.** Even without explicit input config, if a `set:html` field already contains `<ul>`, `<ol>`, `<h*>`, or similar, add `data-type="block"`.

When `data-type="block"` is needed, the host element must support block content. `<p>` cannot nest block elements — browsers auto-close the `<p>` before any `<ul>`/`<ol>`/`<h*>`, breaking the DOM and the editable region. Change to an element that can hold block content (e.g. `<div>`).

Also watch for content working around element limitations — e.g. `<br>` tags inside a `<p>` to fake a list, or repeated inline markup to mimic separate blocks. That's a signal the element is semantically wrong. Refactor the element to match what the content actually represents (e.g. a `<p>` with `<br>`-separated items should become a proper `<ul>` or a `<div>` with `data-type="block"`).

**Editables inside slot content:** Editable text passed into a slot must sit under a **single concrete DOM element** so `data-editable` / `data-prop` (or the equivalent custom element) has a host. `<Fragment>` has no DOM node and cannot carry those attributes.

The same applies if you abstract slot content into an Astro `.astro` component: a **Fragment root** or **multiple roots** leaves no single element to attach the region to—use one wrapper element (native or custom) as the component output.

```astro
<!-- Won't work: Fragment can't carry data-editable -->
<Fragment slot="title">{title}</Fragment>

<!-- Works: prefer custom element -->
<editable-text slot="title" data-prop="title">{title}</editable-text>

<!-- Works: equivalent primitive form -->
<span slot="title" data-editable="text" data-prop="title">{title}</span>
```

## Image editing

Put path attributes (`data-prop`, `data-prop-src`, etc.) on the **image region host**. The library resolves the target like this: if the host is an `<img>`, it edits that element; otherwise it uses the first descendant `<img>` inside the host. So you can use **either** a wrapper (`<editable-image>`, `<div data-editable="image">`, or a layout element that already wraps the picture) **or** `data-editable="image"` directly on a plain `<img>`.

When the host exists **only** for editing, prefer `<editable-image>` over `<div data-editable="image">` (equivalent behaviour; see [editable-regions.md § Custom Element Equivalents](../editable-regions.md#custom-element-equivalents)). Keep `data-editable="image"` on a real layout `<div>` when that element already carries structure or styling.

**Astro:** Output from `<Image />` (`astro:assets`) is often not a straightforward primitive `<img>` you annotate like static HTML, so the **wrapper + child** pattern below stays the usual choice for Astro image components.

There are two binding modes depending on the shape of the data:

**String image path** (most common -- the frontmatter field is a plain string like `"/images/hero.jpg"`):

Use `data-prop-src` to bind the image `src`. Optionally add `data-prop-alt` or `data-prop-title` if alt/title are stored in separate fields:

```astro
<editable-image data-prop-src="image">
  <ImageMod src={image} width={1200} height={600} alt={title} format="webp" />
</editable-image>
```

**Plain `<img>` host** (same bindings on the image element itself — useful for hand-authored HTML):

```astro
<img
  data-editable="image"
  data-prop-src="image"
  src={image}
  alt={title}
/>
```

**Object image field** (the frontmatter field is an object with `src`, `alt`, and `title` properties):

Use `data-prop` to bind the entire object at once:

```astro
<editable-image data-prop="hero_image">
  <img src={hero_image.src} alt={hero_image.alt} />
</editable-image>
```

Most Astro templates store images as simple string paths, so `data-prop-src` is the correct choice in the majority of cases. Using `data-prop` on a string field will not work -- it expects an object.

When the user clicks the image in the visual editor, CloudCannon opens the image picker. The `<img>` src is updated live.

**Image location and optimization:** Optimized images belong in `src/assets/`, not `public/`. Frontmatter stores the full repo-relative path (e.g. `/src/assets/images/hero.webp`). Components use `import.meta.glob` to resolve the string to `ImageMetadata` at build time (see [content.md § Resolving optimized image paths](content.md#resolving-optimized-image-paths-from-frontmatter)). Don't downgrade to `<img>` just because the path comes from frontmatter.

**Upload paths:** Configure per-input upload paths so optimized images go to `src/assets/images` while unoptimized use the global `public/` path. The per-input `static: ''` is critical — without it, CloudCannon strips the path prefix and `import.meta.glob` can't resolve the image. See [configuration.md § Image path configuration](../../cloudcannon-configuration/astro/configuration.md#image-path-configuration) for the full setup with YAML examples.

### Button/link text

For text inside links or buttons, wrap the label in `<editable-text>` (or use `<span data-editable="text">` when CSS or existing markup already targets `span`):

```astro
<a class="btn btn-primary" href={button.link}>
  <editable-text data-prop="banner.button.label">
    {button.label}
  </editable-text>
</a>
```

## Array editing

Wrap the container with `data-editable="array"` and each item with `data-editable="array-item"`. Child editable regions use paths relative to their array item:

```astro
<div data-editable="array" data-prop="features">
  {features.map((feature) => (
    <section data-editable="array-item">
      <h2 data-editable="text" data-prop="title">{feature.title}</h2>
      <editable-image data-prop-src="image">
        <ImageMod src={feature.image} ... />
      </editable-image>
      <p data-editable="text" data-prop="content">{feature.content}</p>
    </section>
  ))}
</div>
```

Array items get CRUD controls (reorder, add, delete) automatically. Without a registered component renderer, items won't visually re-render after data changes -- the user saves and refreshes. Text/image editable regions within items still work in real-time.

When conditional elements, style bindings, or computed content need live updates, you need a registered Astro component **somewhere**. **Default for a uniform list:** wrap the **parent** that owns the whole array in `<editable-component>` (one `registerAstroComponent` for the section) — see [When to use a component editable region](#when-to-use-a-component-editable-region). **Alternative:** put `data-component` on **each** `array-item` and register each item type separately — the pattern used for [page builder blocks](#page-builder-blocks). **You can combine** parent and per-item boundaries when the layout needs it (for example, a wrapper component for shared chrome plus different `data-component` types per row). Start with the parent wrap when it fits; reach for per-item (or a mix) when item types differ or you want each row to own its own re-render scope.

**Always nest text and image editables inside array items.** Without nested text/image regions on their key fields (`data-editable="text"` / `data-editable="image"`, or `<editable-text>` / `<editable-image>`), array items only get CRUD controls (add/remove/reorder) — no inline text editing or live image picking. This applies universally, not just when component re-rendering is unavailable. Text and image editables handle their own DOM updates independently of the component system, so they work even on Astro 4 where `editableRegions()` integration isn't available. Every array item should have nested editables on its title, description, and image fields at minimum.

**Use `data-prop=""` for plain string array items.** When array items are plain strings (not objects), use `data-prop=""` (empty string) to pass the current scope as the editable value. Without it, CloudCannon errors with "Text editable regions require a 'data-prop' HTML attribute but none was provided."

```astro
<ul data-editable="array" data-prop="skills">
  {skills.map((skill) => (
    <li data-editable="array-item"><editable-text data-prop="">{skill}</editable-text></li>
  ))}
</ul>
```

**When HTML `<template>` blueprints are needed.** The runtime can create new array rows from three sources (tried in order): in-flight update DOM, `<template>` children on the wrapper, or registered component rendering. Use this table to decide:

| Array type | Has `data-component-key` + per-item `data-component` + all types registered? | Can be empty at build time? | `<template>` needed? |
|---|---|---|---|
| **Page builder** (`content_blocks`) | Yes | Yes | **No** — the component pipeline handles it ([CC complex array docs](https://cloudcannon.com/documentation/developer-guides/set-up-visual-editing/visually-edit-complex-arrays-and-page-building/)) |
| **Uniform primitive list** (no `data-component`) | No | Yes | **Yes** — one `<template>` so "Add item" has structure |
| **Uniform primitive list** (no `data-component`) | No | No (always has items) | **Optional** — runtime can clone the first item |
| **Heterogeneous rows without per-item registration** (e.g. sub-array variants inside a registered widget) | No | Varies | **Yes** — multiple `<template>` elements with `data-id` matching each variant, paired with CloudCannon structures |

**Simple arrays** (uniform primitive rows) usually include a single `<template>`:

```astro
<div data-editable="array" data-prop="items">
  {items.map((item) => (
    <div data-editable="array-item">
      <editable-image data-prop-src="img">
        <img src={item.img} alt={item.title} />
      </editable-image>
      <h2 data-editable="text" data-prop="title">{item.title}</h2>
      <p data-editable="text" data-prop="desc">{item.desc}</p>
    </div>
  ))}
  <template>
    <div data-editable="array-item">
      <editable-image data-prop-src="img">
        <img src="" alt="" />
      </editable-image>
      <h2 data-editable="text" data-prop="title"></h2>
      <p data-editable="text" data-prop="desc"></p>
    </div>
  </template>
</div>
```

When you author a `<template>`, mirror the live item's HTML: same editable attributes, empty content. Include **all** region types used in the row—text, image, nested arrays. For **image** regions, include an `<img>` the editor can target: either `<img data-editable="image" … src="" alt="">` as the host, or a wrapper (`<editable-image>` or `<div data-editable="image">`) around `<img src="" alt="">` — match the live item. Nested arrays inside a template row can include nested `<template>` elements.

**Conditional editable prop for cross-collection content.** When a shared component (like a card) is used both for frontmatter-backed array items AND programmatic content from another collection (e.g. blog posts fetched via `getCollection`), the editable attributes break on the programmatic items because there's no valid data scope. Add an `editable` prop (default `true`) to the component and conditionally apply editable attributes:

```astro
---
const { title, desc, editable = true } = Astro.props;
---
<h1>
  {editable ? <editable-text data-prop="title">{title}</editable-text> : title}
</h1>
```

Pass `editable={false}` when rendering cross-collection content that isn't backed by the current page's frontmatter.

**Rebuild comments on sidebar-only fields (Astro 4).** On Astro 4 without component re-rendering, fields that appear on the page but are only editable via the sidebar (e.g. `badge`, `tags`, `variant`) won't live-update. Add `comment` to these inputs in the CC config explaining what the field does and that changes require a save and rebuild. On Astro 5+ with component registration, these fields update live and the comments aren't needed.

## Page builder blocks

For the structural setup (array wrapper, BlockRenderer, catch-all route, CC config), see [page-building.md](page-building.md). This section covers the **visual editing layers** that go on top of that structure.

Each block needs **three layers**: (1) array wrapper, (2) array items with component behaviour, (3) nested editables. Agents commonly add the array wrapper but miss the component layer or nested editables. See the [CloudCannon complex array docs](https://cloudcannon.com/documentation/developer-guides/set-up-visual-editing/visually-edit-complex-arrays-and-page-building/) for the canonical reference.

**Array items and components are two separate behaviours:**

- `data-editable="array-item"` gives **CRUD controls** — add, remove, reorder, drag-and-drop.
- `data-component` enables **component re-rendering** — all nested content re-renders when data changes.

Page builder blocks need **both** on the same element. Without `data-component`, the block's contents won't live-update when the editor changes data via the sidebar. Without `data-editable="array-item"`, there are no CRUD controls.

When a suitable HTML element exists, add both attributes directly:

```html
<section data-editable="array-item" data-component={_type} data-id={_type}>
  <Component {...props} />
</section>
```

When no suitable element exists, use the `<editable-array-item>` web component:

```html
<editable-array-item data-component={_type} data-id={_type}>
  <Component {...props} />
</editable-array-item>
```

`<editable-component>` is for **standalone** component regions that are not inside an array (e.g. a fixed hero section: `<editable-component data-component="hero" data-prop="banner">`).

**`data-component-key` / `data-id-key` on the array wrapper.** These go on the parent `data-editable="array"` element and tell CloudCannon which frontmatter key identifies the component type and unique ID for each item. They're needed because when the array is empty there are no child elements — CloudCannon still needs to know which data field to read. `data-component` / `data-id` on each child are the resolved runtime values. The key name is arbitrary (our examples use `_type`, the CC docs use `_name`).

Since December 2025, `data-id-key` and `data-id` **default** to the `data-component-key` and `data-component` values when not provided. When the identity key and component key are the same field (the common case), you can omit `data-id-key` and `data-id` entirely.

**Nested editables** inside widget components — add text/image regions on the elements that render editable fields (`data-editable="text"` / `data-editable="image"`, or `<editable-text>` / `<editable-image>` on wrapper-only hosts):

```astro
<!-- Inside Hero.astro -->
{title && <h1 set:html={title} data-editable="text" data-prop="title" />}
{subtitle && <p set:html={subtitle} data-editable="text" data-prop="subtitle" />}
{image && (
  <editable-image data-prop="image">
    <Image {...image} />
  </editable-image>
)}
```

Paths are relative to the component's data scope (the array item), so `data-prop="title"` resolves to `content_blocks[n].title`.

**Registration:** Every `_type` value must have a matching `registerAstroComponent` call. The key string must match the `_type` value exactly (e.g., `_type: call_to_action` → `registerAstroComponent('call_to_action', CallToAction)`, not `'call-to-action'`).

**Shared sub-components (e.g. Headline):** When a shared component like `Headline.astro` renders title/subtitle for many widgets, adding `data-editable` attributes to it is acceptable — inside a page builder block, the editables are scoped to the parent component, so `data-prop="title"` resolves correctly to the block's title.

**Data-prop mismatch when parent renames fields:** A shared component has `data-prop="subtitle"` on its subtitle element. Widget A passes `description` as the `subtitle` prop: `<Headline subtitle={description} />`. CloudCannon resolves `data-prop="subtitle"` against the block's data, looking for `content_blocks[n].subtitle` — but the block has `description`, not `subtitle`. Result: "received a value of type 'undefined'" error.

Fix options (pick one per widget):

1. **Make the shared component's data-prop configurable** — add a prop so each parent can specify the actual data key. E.g. Headline accepts `subtitleProp` and renders `data-prop={subtitleProp || "subtitle"}`. Hero passes `subtitleProp="description"`. This is cleanest when different widgets map different fields to the same visual slot.
2. **Standardize the field name** — rename the widget's field to match the shared component's prop. Only works when the field name is genuinely interchangeable.
3. **Move the editable to the parent** — put `data-editable` + `data-prop` on the parent widget's own markup instead of the shared component. Means duplicating the annotation in each widget.

Prefer option 1 when the shared component is used by 3+ widgets with different field mappings. Prefer option 2 when there's no semantic distinction between the field names.

## Sub-arrays within widget components

Widget components often contain their own arrays — an `items` list in a Features or Content widget, an `actions` list of buttons in a Hero, a `steps` timeline, etc. These sub-arrays need `data-editable="array"` / `data-editable="array-item"` attributes just like the top-level page builder array. Without them, the user can only edit sub-array items via the sidebar modal — there are no inline CRUD controls (add, remove, reorder, drag-and-drop).

Sub-array items **don't need `data-component`** — the parent widget component already handles re-rendering of its entire subtree. The `data-editable="array-item"` attributes only need to layer on CRUD controls.

**On the array container**, add `data-editable="array"` and `data-prop` pointing to the array field name. **On each item**, add `data-editable="array-item"`. **Inside each item**, add primitive text/image regions (`data-editable="text"`, `data-editable="image"`, or `<editable-text>` / `<editable-image>` when the host is wrapper-only) on the editable fields.

```astro
<!-- Shared UI component: ItemGrid.astro -->
<div
  class="grid gap-8"
  data-editable="array"
  data-prop="items"
>
  {items.map(({ title, description, icon }) => (
    <div data-editable="array-item">
      <h3 data-editable="text" data-prop="title">{title}</h3>
      <p set:html={description} data-editable="text" data-prop="description" />
    </div>
  ))}
</div>
```

Since the sub-array lives inside a registered component (e.g. Features3 rendered as a page builder block), `data-prop="items"` resolves relative to the block's data scope — e.g. `content_blocks[n].items`. The array item paths then resolve to `content_blocks[n].items[m].title`, etc.

**Shared UI components:** When a shared component like `ItemGrid.astro` always receives the array as the same prop name (`items`), hardcode `data-prop="items"` directly. If different callers use different field names, accept the prop name as a component parameter instead.

**Don't forget sub-arrays.** This is a common omission — agents add the page builder array and primitives (text/image) inside widgets but skip internal arrays. Every array rendered by a widget component should get array editables unless the array structure is too complex for inline editing (e.g. deeply nested objects better suited to the sidebar).

**Check all variants of shared UI components.** Templates often have numbered variants of the same component (e.g. `ItemGrid.astro` and `ItemGrid2.astro`, `Features.astro` and `Features2.astro`). Adding editables to one variant doesn't cover the others — each must be checked independently. After wiring up a shared component, grep for similar filenames (`ItemGrid*.astro`) to find variants that need the same treatment.

**Watch for inline array rendering.** Adding editability to shared UI components (e.g. `ItemGrid`, `Timeline`) cascades to all widgets that delegate to them, but some widgets render arrays directly in their own template without using a shared component. These are easy to miss. After wiring up shared components, grep for `.map(` across widget files to catch any inline array rendering that still needs editability attributes added directly to the widget template.

## Data path patterns

### Empty data-prop (pass-through scope)

An empty `data-prop=""` passes the current data scope through without navigating deeper. This works for primitive regions (text, image, array) but **does not work for `<editable-component>`** — the component controls UI treats the empty string as falsy and won't render the edit button. Use it when the parent's data IS the value the child needs — for example, an array editable inside an array-bound component:

```astro
<!-- Component data-prop points to an array -->
<editable-component data-component="pricing" data-prop="plans">
  <PricingSection {...plans} />
</editable-component>

<!-- Inside PricingSection.astro: data-prop="" passes the array through -->
<div data-editable="array" data-prop="">
  {plans.map((plan) => (
    <div data-editable="array-item">...</div>
  ))}
</div>
```

Without `data-prop=""`, using `data-prop="plans"` here would resolve to `plans.plans` (looking up `plans` on the array), which doesn't exist.

### Relative paths (same file)

When the editable region is on the same page as the file being edited, use simple relative paths:

```
data-prop="title"           -> frontmatter.title
data-prop="banner.title"    -> frontmatter.banner.title
data-prop="@content"        -> file content body (markdown)
```

### Data file paths (shared data editing)

When a section's data comes from a data file configured in `data_config` (e.g. a shared CTA or testimonial section), use `@data[key].path` syntax:

```
data-prop="@data[call-to-action].title"
data-prop="@data[call-to-action].description"
data-prop-src="@data[call-to-action].image"
data-prop="@data[testimonial].title"
```

The key matches the `data_config` entry name in `cloudcannon.config.yml`. This is the recommended approach for reusable data that appears on multiple pages or is shared across components.

### Absolute file paths (cross-file editing)

Use `@file[/path]` for editing data in a specific file. Paths must have a leading `/` and are relative to the repository root:

```
data-prop="@file[/src/content/sections/cta.md].title"
```

### Content body editing

Use `@content` to make the markdown body of a content file editable as rich text:

```astro
<div class="content" data-editable="text" data-type="block" data-prop="@content">
  <Content />
</div>
```

This works on any page backed by a content collection file -- about pages, blog posts, `[regular].astro` catch-all pages, etc.

### Non-source editables for hardcoded pages

When a page template (e.g. `contact.astro`) has its own rendering logic but reads data from a `.md` file in the pages collection, the editable regions still use relative paths since the collection file provides the data context. The `_enabled_editors` and `_schema` settings in CloudCannon ensure editors see the right fields.

### Nested relative paths (inside arrays)

Within an `EditableArrayItem`, paths are relative to the current array element:

```
data-prop="title"    -> features[N].title
data-prop="image"    -> features[N].image
data-prop="content"  -> features[N].content
```

### Cross-collection items on a page

When a page template fetches and renders items from a different collection (e.g. team members on an about page, testimonials on a landing page), add `@file` editables so those items are editable inline:

```astro
{teamMembers.map((member) => (
  <div>
    <editable-image data-prop={`@file[/src/content/team/${member.id}].avatar`}>
      <img src={member.data.avatar.src} alt={member.data.avatar.alt} />
    </editable-image>
    <h3 data-editable="text" data-prop={`@file[/src/content/team/${member.id}].name`}>
      {member.data.name}
    </h3>
  </div>
))}
```

Note: `entry.id` behavior depends on the content collection type. **Legacy collections** (`type: "content"` in `src/content/config.ts`) include the file extension (e.g. `janette-lynch.md`). **Glob loader** (`glob()` in `src/content.config.ts`) strips the extension (e.g. `janette-lynch`), so you must append `.md` when building `@file` paths. Check which loader the collection uses before constructing paths.

## When to use a component editable region

Primitive editables (text, image, array, source) handle their own DOM updates but can't trigger re-rendering of the surrounding template. This matters when a section contains data-driven behaviour beyond simple content — see [editable-regions.md > When to use component editable regions](../editable-regions.md#when-to-use-a-component-editable-region) for the general principle.

**Use a component when the section has any of:**

- Conditional elements — `{feature.button.enable && (<a>...</a>)}` won't show/hide live without a re-render
- Style/class bindings — `class={index % 2 === 0 && "bg-gradient"}` won't toggle live
- Computed content — a label derived from another field won't update live

**Example: features array with conditional buttons**

A features section where each item has an optional button controlled by `button.enable`. As a plain array with primitive editables, toggling the button in the sidebar does nothing visually. Wrapping the section as a registered component means the entire features block re-renders on any change:

```astro
<editable-component data-component="features" data-prop="features">
  <Features {...features} />
</editable-component>
```

Inside `Features.astro`, the array editables and text/image editables still work for inline editing and CRUD. The component handles the re-rendering.

### Component prop contract

When `editable-component` re-renders a component, it passes the value at `data-prop` directly as the component's props. The component **must accept spread props, not a named wrapper prop**. If the component expects `const { banner } = Astro.props` but the re-renderer passes `{ title, description, image }`, `banner` will be `undefined`.

**Object-bound components** (where `data-prop` points to an object in the frontmatter):

```astro
<!-- Page template: spread the object -->
<editable-component data-component="hero" data-prop="banner">
  <Hero {...banner} />
</editable-component>

<!-- Hero.astro: destructure the object's fields directly -->
const { title, description, image, buttons } = Astro.props;
```

**Array-bound components** (where `data-prop` points to an array):

The client-side renderer passes the array directly as props. Astro's template syntax can't pass a raw array, so spread the array and use `Object.values()` — this works identically for both SSR and client re-render:

```astro
<!-- Page template: spread the array -->
<editable-component data-component="pricing" data-prop="plans">
  <PricingSection {...plans} />
</editable-component>

<!-- PricingSection.astro: recover the array from spread indices -->
const plans = Object.values(Astro.props);
```

**Parent-wrapped array:** With `<editable-component data-prop="features">` (or whatever field holds the array) around the whole list, the registered component's renderer outputs every row. Inner `data-editable="array"` / `array-item` still provide CRUD and nested text/image; they do not become separate component re-render roots. One place owns cross-item concerns (alternating layouts, index-based classes).

**Per-item `data-component`:** Each `array-item` can carry its own `data-component` and registration instead (or as well) — see [Page builder blocks](#page-builder-blocks). That fits heterogeneous blocks and independent per-row re-rendering. Mix parent and per-item boundaries when the template genuinely needs both.

**When in doubt, add a component boundary** — parent wrap is often the smallest step for a uniform section; per-item scales when types differ.

### Blog post detail pages

Blog post detail pages typically have a hero section (title, date, author, image) driven by top-level frontmatter, plus a markdown body. Use inline primitive editables for the fields that support them, and leave the rest to the sidebar.

```astro
<p>
  {formattedDate} •
  <editable-text data-prop="author">{author}</editable-text>
  {readingTime && ` • ${readingTime}`}
</p>
<h1 data-editable="text" data-prop="title">{title}</h1>
<img data-editable="image" data-prop-src="image" src={image} alt={title} />

<div data-editable="text" data-type="block" data-prop="@content">
  <Content />
</div>
```

**Dates must NOT be text editables.** `<editable-text data-prop="pubDate">` sets a raw string, which conflicts with `z.coerce.date()` schemas. Use the sidebar datetime picker instead, and add a `comment` on the input so editors know changes appear after save:

```yaml
_inputs:
  pub_date:
    type: datetime
    comment: Changes to the publish date appear on the page after saving and rebuilding
```

**Computed server-only values** like reading time (from `remarkPluginFrontmatter`) can stay in the page template as static text — they aren't editable and don't need special handling.

**Why not wrap in `<editable-component>`?** When the hero fields live at the top level of the frontmatter (not nested under a single key), there's no `data-prop` path to point to. `data-prop=""` resolves the data correctly but the component controls UI treats empty string as falsy and doesn't render the edit button. `data-prop-*` attributes work but **lowercase all keys** internally (`propName.substring(4).toLowerCase()`), breaking camelCase prop names like `pubDate`. Nesting the hero fields under a `hero:` key in frontmatter would fix this but requires restructuring every content file. For most blog post heroes, inline primitive editables (title, author, image) plus sidebar-only fields (date, tags, category) give a good editing experience without the complexity.

## Source editables for hardcoded content

Not all editable content lives in frontmatter or data files. Many templates have hardcoded text in `.astro` page templates -- hero headings, taglines, descriptions, CTA copy. These should still be visually editable using `EditableSource`.

Source editables work by reading and writing the raw source file (e.g. `src/pages/index.astro`) directly. They don't need a content collection or data file -- just a `data-path` pointing to the source file and a `data-key` to identify the region within it.

### When to use source editables

- Hardcoded text in `.astro` page templates (homepage hero, taglines, section headings)
- Static content that isn't backed by a content collection or data file
- Any visible text on a page that an editor should be able to change

**Do not dismiss content as "developer-only" just because it's hardcoded.** If an editor can see it on the page, they should be able to edit it. Source editables make this possible without refactoring to a data file or content collection.

### Including `.astro` pages in collections

Pages with source editables should be included in the pages collection so editors can find and open them. Add specific `.astro` filenames to the collection's glob alongside `"*.md"` -- only include pages that actually have editable regions. Pages with no visually editable content (search, 404, tag listings) should be excluded. Set `_enabled_editors: [visual]` for the collection -- `.astro` files can only use the visual editor (their JS frontmatter isn't parseable as data), and `.md` pages work well in the visual editor too when they have editable regions. See [configuration-gotchas.md § Pages collection](../../cloudcannon-configuration/astro/configuration-gotchas.md#pages-collection-including-astro-pages) for the full config pattern.

### Syntax

```astro
<h1
  class="text-4xl font-bold"
  data-editable="source"
  data-path="src/pages/index.astro"
  data-key="hero-title"
>
  Welcome to My Site
</h1>

<p
  data-editable="source"
  data-path="src/pages/index.astro"
  data-key="hero-description"
  data-type="block"
>
  A description paragraph that editors can change.
</p>
```

### How it works

1. CloudCannon reads the full source file via `CloudCannon.file(path).get()`
2. Finds the editable region by locating the `data-key` attribute in the raw HTML
3. When the editor changes the text, splices the new content back into the source file at the same location
4. Writes the entire file back via `file.set(content)`

### Limitations

- **Astro component syntax inside the editable region will not survive editing.** If a paragraph contains `<LinkButton>` or other Astro components, the rich text editor can't handle them. Keep source editables on elements with plain HTML content only.
- **`data-key` must be unique within the file.** Use descriptive keys like `hero-title`, `hero-description`, `cta-heading`.
- **`data-path` is relative to the project root**, not the current file. Use the full path from the repo root (e.g. `src/pages/index.astro`).

### Identifying source editable candidates during audit

During Phase 1, flag hardcoded text in page templates as source editable candidates. Common locations:

- Homepage hero sections (title, subtitle, description)
- CTA sections with static copy
- Section headings on listing pages
- Footer taglines or copyright text
- Any page that has visible text not sourced from frontmatter or a data file

## Astro components in source editables

Source editables cannot handle Astro component syntax — the rich text editor strips non-standard JSX. When a presentational Astro component (e.g. a styled `<Link>`) appears inside content that should be source-editable, choose one of:

1. **Inline as plain HTML + CSS** — replace the component with its HTML equivalent (`<a>` for `<Link>`) and use normal CSS selectors to replicate the styling. This works well for simple wrappers around native HTML elements. Avoid Tailwind utility classes on the inline HTML — use contextual CSS rules instead (e.g. `article a { ... }` in a stylesheet).

2. **Define a snippet** — for more complex components with meaningful props, configure a `_snippets` entry so editors get a structured interface. Enable `snippet: true` in `_editables.content` to make the snippet toolbar button available.

The decision rule: if the component just wraps a native HTML element with styles, inline it. If it has props, state, or non-trivial rendering, make it a snippet.

## Listing page editables with `@file`

For collections without detail pages (data-like `.md` files rendered only on listing pages), use `@file[/path].field` editables to make individual entries editable inline on the listing page.

```astro
{entries.map(entry => (
  <div>
    <h3
      data-editable="text"
      data-prop={`@file[/src/content/work/${entry.id}].company`}
    >
      {entry.data.company}
    </h3>
    <article
      data-editable="text"
      data-type="block"
      data-prop={`@file[/src/content/work/${entry.id}].@content`}
    >
      <entry.Content />
    </article>
  </div>
))}
```

**Path syntax:** `@file` paths must have a leading `/` and are relative to the repository root. For `entry.id` behavior, see the note in [Cross-collection items on a page](#cross-collection-items-on-a-page) — legacy collections include the file extension, glob loader collections do not.

**`@data` vs `@file` for listing-only content:** When `.md` (or similar) entries never build to their own pages and only feed a listing, you can keep the `@file[/path]` pattern above, or consolidate into one structured data file if that stays manageable.

If you consolidate: register the file in CloudCannon `data_config` and expose it under Data in the sidebar (configure inputs/collections as needed). `@data[...]` in `data-prop` uses logical keys instead of building repo paths from `entry.id`. Paths still resolve through `data_config`, but you avoid scattering filesystem layout across many attributes.

Keep separate files and `@file` when one file would be unwieldy, you need rich per-entry markdown/MDX bodies, or per-file workflows matter more than the simplification.

**Enabling visual editing for listing pages:** Add `visual` to the collection's `_enabled_editors` and include the listing page in the `pages` collection glob so editors can open it in the visual editor.

## What to make editable vs. what to leave for the sidebar

Not everything benefits from visual editing. Guidelines:

**Good for visual editing (inline text/image/source):**
- Page titles, headings, descriptions
- Hero/banner content (from frontmatter via `data-prop`, or hardcoded via `data-editable="source"`)
- Images (hero, feature, author avatar)
- Content body (`@content`)
- CTA copy
- Hardcoded text in page templates
- Blog metadata visible on the page (author name, publish date)

**MDX bodies and CloudCannon snippets:** Snippets in MDX do not render as their live-site output in the content editor or in the visual editor — editing page body in the visual editor opens the content editor in an iframe, so the experience is the same. Snippet instances are still editable via CloudCannon's snippet UI (often a clickable box). Treat that as a preview limitation, not a reason to avoid visual editing for MDX.

**Better for sidebar/data editor:**
- Navigation menus (complex nested structures)
- Social links
- Theme settings (colors, fonts)
- SEO metadata (meta_title, meta_description)
- Boolean toggles (draft, enable)
- URL/link fields
- Taxonomy arrays (categories, tags)

**Provide editing fallbacks with `ENV_CLIENT`:**
- **Vue, Svelte, and Solid components** -- these frameworks throw runtime errors in editable regions, even when nested inside supported `.astro` or `.jsx` wrappers. First consider converting the component to `.astro` or React (prefer `.astro` unless it's state-heavy). If conversion isn't practical, guard with `import.meta.env.ENV_CLIENT` to render an editing fallback -- a simplified `.astro` component that visually resembles the real one and supports editable attributes, giving editors a useful preview and editing experience without the unsupported framework.
- Components with complex DOM management (Swiper carousels, etc.) -- their JavaScript conflicts with editable region DOM manipulation, and often are hard to edit if functioning like they do on prod.
- Components using genuinely server-only APIs (`getImage` from `astro:assets` for image processing, `fetch` to external APIs at render time) -- guard with `import.meta.env.ENV_CLIENT` to provide a simplified client-side path that skips optimization and renders plain HTML. Note: `import.meta.glob` resolves eagerly at build time and works fine in registered components. `getCollection`/`getEntry` from `astro:content` also work because the integration shims them for the client bundle.

## Content vs presentation in frontmatter fields

Frontmatter fields that contain inline HTML with CSS classes, `<br>` tags, or HTML entities (`&nbsp;`) are uneditable in the visual editor — custom HTML renders with red outlines. This applies to ALL fields (title, subtitle, description, content), not just rich text `content` fields. The principle: **frontmatter stores content, components own presentation.**

### Option 1: Editor styles (preferred for inline styling)

When the styled HTML is inline emphasis or branding (e.g. highlighted/accented text), use `type: html` input with an **editor styles CSS** file. This lets editors apply semantic styling through the rich text toolbar. Pattern from [Jetstream](https://github.com/CloudCannon/jetstream-astro-template):

1. Create `.cloudcannon/styles/editor.css` with semantic classes:

```css
span.highlight-text {
  color: var(--color-brand);
}
```

2. Configure the input as `type: html` referencing the stylesheet. **Important:** adding `styles` (or any toolbar option) causes CC to treat omitted toolbar keys as `false`, so you must re-declare the inline formatting defaults you want to keep (see [configuration-gotchas.md § Rich text input toolbar options](../../cloudcannon-configuration/astro/configuration-gotchas.md#rich-text-input-toolbar-options-follow-the-same-omitted--false-rule-as-_editables)):

```yaml
_inputs:
  title:
    type: html
    options:
      styles: .cloudcannon/styles/editor.css
      allow_custom_markup: true
      bold: true
      italic: true
      underline: true
      strike: true
      link: true
      removeformat: true
      undo: true
      redo: true
```

3. The component renders with `set:html` and has matching CSS:

```astro
<h1 set:html={title} data-editable="text" data-prop="title" />

<style is:global>
  .highlight-text { color: var(--color-accent); }
</style>
```

4. Content uses the semantic class instead of Tailwind utilities:

```yaml
title: "Free template for <span class=\"highlight-text\">Astro 5.0</span> + Tailwind CSS"
```

Editors see the accent color in the toolbar and can toggle it on text selections. This is the preferred approach for any styling expressible as a CSS class. See [content.md § Handling styled HTML in frontmatter](content.md#handling-styled-html-in-frontmatter) for the full decision tree.

### Option 2: Decompose into explicit props (for structured data)

When a field packs multiple semantic values into one string with HTML structure — e.g. a `content` field mixing plain text, a link with classes, and a CTA — decompose into explicit props and let the component own the markup.

Before (single rich text field):
```json
{
  "content": "<span class='text-center block'>Enjoying our project? <a class='underline' href='...'>Star on GitHub</a></span>"
}
```

After (explicit props):
```json
{
  "text": "Enjoying our project?",
  "link_text": "Star on GitHub",
  "link_url": "https://github.com/example/project"
}
```

The component templates the values into the correct HTML:
```astro
<p class="text-center">
  {text} <a class="underline" href={link_url} target="_blank" rel="noopener">{link_text}</a>
</p>
```

Use this when each piece of the HTML has distinct semantic meaning (text vs link vs URL) and the structure is fixed. Also use this for multi-part text like job titles (`job_title`, `company`, `date_range`) where each segment needs different formatting.

### Option 3: Strip layout HTML

Responsive layout HTML (`<br class="block sm:hidden" />`, `&nbsp;` for spacing, `<span class="sm:whitespace-nowrap">`) are layout concerns that don't belong in content. Store plain text and handle responsiveness in the component or CSS.

## Section titles and buttons in child components

When a component renders a section title or button text from props (e.g. `FeaturedProjects` rendering "Featured projects" and "View all projects"), register the component and wrap with `<editable-component>` so `data-prop` paths inside the component resolve relative to the component's data scope. Use `data-editable="text"` on the heading and `<editable-text>` on the button text inside the component.

`getCollection`/`getEntry` work inside registered components because `astro:content` is shimmed by the integration. This means self-contained components that fetch their own data (e.g. a FeaturedPosts component that calls `getCollection('blog')`) work correctly in the visual editor — you don't need to pass fetched data as props.

## Third-party component fields

When third-party npm components render props internally and don't pass through HTML attributes, editable text/image regions can't be placed on the rendered output. Create a thin wrapper component, register it, and use `data-component` on the array item. On data changes, the item re-renders and the wrapper passes new props through to the third-party component.

```astro
---
import { ProfileCard } from 'some-component-library'
const { name, role, avatar } = Astro.props
---
<ProfileCard name={name} role={role} avatar={avatar} />
```

For sections with third-party components that don't expose attributes, extract the section into its own registered component so the whole section re-renders on any data change. This handles title, content, and order updates.

## Component editables backed by data files

Use `<editable-component data-component="..." data-prop="@data[key]">` to make a component backed by a data file re-render live. The component prop names must match the data file's key names — for example, if `cta.json` has `link_text`, the component must accept `link_text` (not `linkText`), because the re-renderer passes data file values directly as props.

```astro
<editable-component data-component="call-to-action" data-prop="@data[cta]">
  <CallToAction />
</editable-component>
```

## Conditional editable-image on shared components

When a shared component like `PageHeader` is used across collections, not all contexts have the same frontmatter fields. For example, blog posts have an `image` field in frontmatter, but project pages compute their featured image from an array — there's no `image` field to bind. Wrapping unconditionally in `<editable-image data-prop-src="image">` causes errors on pages where `image` doesn't exist in the data scope.

Fix: add an optional prop (e.g. `imagePropPath`) that controls whether the image gets editable attributes. Only render the `<editable-image>` wrapper when the prop is provided:

```astro
{resolvedImage && imagePropPath ? (
  <editable-image data-prop-src={imagePropPath}>
    <Image src={resolvedImage} ... />
  </editable-image>
) : resolvedImage ? (
  <Image src={resolvedImage} ... />
) : null}
```

Pages where frontmatter includes the image field pass the prop; pages where it doesn't exist omit it.

## Component re-rendering

For full live preview (not just text/image), components need to be registered so `EditableComponent` can re-render them in the browser when data changes.

### Astro components

For page builder sites, add the component to `src/cloudcannon/componentMap.ts` -- it will be registered automatically by `registerComponents.ts` (see [setup steps in visual-editing.md](visual-editing.md#setup-steps)). For standalone components not in the page builder, add individual registrations directly in `registerComponents.ts`:

```typescript
import { registerAstroComponent } from "@cloudcannon/editable-regions/astro";
import CallToAction from "@/layouts/partials/CallToAction.astro";

registerAstroComponent("call-to-action", CallToAction);
```

### Non-Astro framework components

Only `.astro` and React components are supported (see [overview.md § Astro scope](overview.md)).

**Decision: convert or provide an editing fallback.** For each unsupported component, decide whether to convert it to a supported framework or keep it and provide a fallback:

- **Convert** -- rewrite as `.astro` or React. Prefer `.astro` unless the component needs complex client-side state/interactivity, in which case React is a good choice. This is simpler (no duplication) and gives full visual editing support. Default recommendation.
- **Editing fallback** -- if conversion isn't practical (third-party framework library with no equivalent, large complex component, team preference), keep the original and use `ENV_CLIENT` to conditionally render an editing fallback in the visual editor. See below.

#### React components

React components should generally stay as React. Use `registerReactComponent` for component re-rendering in the visual editor:

```typescript
import { registerReactComponent } from "@cloudcannon/editable-regions/react";
import Announcement from "@/components/Announcement";

registerReactComponent("announcement", Announcement);
```

To make nested content editable within a React component, you may need to refactor it slightly so there are suitable elements to attach editable attributes or web components to. The component handles overall re-rendering via `registerReactComponent`, but inner text, images, etc. should still be individually editable where possible.

**Hydration gotcha.** Content inside a React island's hydrated DOM can be overwritten when React rehydrates. If an editable region modifies static server-rendered HTML but React then re-renders and replaces that DOM with its own output, the editor's changes appear to do nothing. Factor this into refactoring decisions -- content controlled by React state may not be a good candidate for inline editable regions.

#### Editing fallbacks (Vue, Svelte, Solid, or complex components)

An editing fallback is a display-only `.astro` component that visually resembles the real component and supports editable attributes. It gives editors a representative preview they can edit inline -- it doesn't need interactivity or the original framework. The live site still uses the real component; only the visual editor renderer is swapped.

```astro
<!-- src/layouts/helpers/AnnouncementDisplay.astro -->
---
const { enable, text, link_text, link_url } = Astro.props;
---
{enable && text && (
  <div class="announcement-banner">
    <p>{text} {link_text && link_url && <a href={link_url}>{link_text}</a>}</p>
  </div>
)}
```

```typescript
// registerComponents.ts
import AnnouncementDisplay from "@/layouts/helpers/AnnouncementDisplay.astro";
registerAstroComponent("announcement", AnnouncementDisplay);
```

```astro
<!-- Base.astro — live site uses the real component -->
<editable-component data-component="announcement" data-prop="@data[announcement]">
  <Announcement client:load {...announcementData} />
</editable-component>
```

**When to use an editing fallback:**
- Vue, Svelte, or Solid components that can't be converted to `.astro`/React
- Components using third-party DOM libraries (Swiper, GSAP, etc.)
- Web Components with shadow DOM that don't serialize cleanly
- Any component where the live-site version is too complex for the editor to re-render directly

**Keep the editing fallback in sync.** The fallback duplicates markup, so changes to the real component's visual structure need to be mirrored. Keep both in the same directory and name them clearly (e.g. `Announcement.vue` + `AnnouncementDisplay.astro`).

### Wrapping with web components

Component editable regions need a wrapper element with `data-component` and `data-prop` attributes. When there is no suitable existing container element, use the `<editable-component>` web component provided by the library rather than adding an unnecessary `<div>`:

```astro
<editable-component data-component="announcement" data-prop="@data[announcement]">
  <Announcement client:load {...announcementData} />
</editable-component>
```

The `<editable-component>` custom element self-hydrates via `connectedCallback`/`disconnectedCallback` -- no `data-editable="component"` attribute is needed since the tag itself identifies the region type. The same idea applies to **text and image** primitives: when you would add a wrapper only for `data-editable`, use `<editable-text>` / `<editable-image>` instead of a generic `<span>` / `<div>` (see [Text editing](#text-editing) and [Image editing](#image-editing)). For **component** regions specifically, prefer `<editable-component>` over an extra wrapper `<div data-editable="component">` when no suitable container exists.

If a suitable container already exists in the markup (e.g. a `<section>` wrapping the component output), add `data-editable="component"` directly to that element instead.

**For array items**, use `<editable-array-item>` instead of `<editable-component>` when you need a web component wrapper. `<editable-array-item>` can also carry `data-component` for re-rendering — see [Page builder blocks](#page-builder-blocks).

**Caveats:**
- Astro components that use `astro:content` or `astro:assets` imports need the integration's Vite plugin (which shims these modules for client-side rendering)
- React components inside registered Astro components (e.g. `react-icons`) need the React framework renderer. Add `import "@cloudcannon/editable-regions/astro-react-renderer"` to `registerComponents.ts` -- this is a side-effect import that registers a catch-all React renderer for the editable-regions client-side re-rendering pipeline (it mirrors Astro's SSR renderer interface but runs entirely within the editor). Without it, any React component encountered during re-rendering will fail with "NoMatchingRenderer". Because its `check` function unconditionally returns `true`, it acts as a fallback for all unmatched components -- import it after any other framework renderers
- The React framework renderer only covers React -- there are no equivalent renderers for Vue, Svelte, or Solid. These frameworks will always error in editable regions and must be converted or given editing fallbacks
- **Prop-driven re-renders:** Registered components re-render in the browser with the props CloudCannon passes. `astro:content` is shimmed, so `getCollection`/`getEntry` calls inside registered components work. What does NOT re-run is parent page-level logic — top-level `fetch` in `.astro` frontmatter, layout-level data loading, etc. If the component needs data the parent normally fetches, pass it via props. Use `ENV_CLIENT` fallbacks only for genuinely server-only APIs like `getImage` ([What to make editable vs. what to leave for the sidebar](#what-to-make-editable-vs-what-to-leave-for-the-sidebar)).
- **Runtime `fetch()` in islands:** Not blocked by editable-regions, but preview iframes often differ from production (CORS, auth cookies, relative URLs). Test in the visual editor if the UI depends on it.

Text/image editable regions provide the most value with the least complexity. Component registration is the next step for templates where full live preview is a priority.

## How the Astro integration works

Understanding the integration internals helps when debugging unexpected behavior.

**Build-time** (`@cloudcannon/editable-regions/astro-integration`):

An Astro integration that registers a Vite plugin for the client build. The plugin:

1. Sets `ENV_CLIENT = true` for tree-shaking server-only code. **Important:** this only applies to the editable-regions client bundle, not the normal production build. Code guarded with `import.meta.env.ENV_CLIENT` in `.astro` template expressions still runs normally (with `ENV_CLIENT` undefined/false) in the production SSR output. For initial-render concerns (like hiding animation classes), use `.cms-editor-active` CSS overrides instead
2. Patches Astro's `astro:build` Vite plugin to force SSR transforms on client code -- this is what makes `renderToString()` work in the browser
3. Adds `vite-plugin-editable-regions` which intercepts `astro:*` virtual module imports and resolves them to local shims:
   - `astro:content` -> client-side shim
   - `astro:assets` -> client-side shim
   - `astro:env/server` -> client-side shim

Without this, Astro components that import from `astro:content` or `astro:assets` would fail to bundle for the client.

**Runtime** (`@cloudcannon/editable-regions/astro`):

`registerAstroComponent(key, AstroComponent)` creates a wrapper function that:

1. Constructs a fake Astro `SSRResult` (with renderers, metadata, crypto key for server islands, slot handling, etc.)
2. Calls Astro's `renderToString()` in the browser with the new props
3. Parses the resulting HTML into a document fragment
4. Triggers any queued client-side renders (e.g. React islands use `data-editable-region-csr-id`)
5. Strips Astro scaffolding (`<astro-island>`, `<link>`, server island metadata)
6. Returns the clean HTML element

The wrapper is stored in `window.cc_components[key]` where `EditableComponent` can find it.

## Scroll-reveal and entrance animations

Many templates start elements hidden (`opacity: 0`, `transform: translateY(...)`, `visibility: hidden`) and reveal them with JS (IntersectionObserver, scroll listeners) or CSS animation classes. Common class names: `reveal`, `animate-on-scroll`, `aos-*`, `fade-in`, `scroll-fade`.

**Why this breaks in the visual editor:** CloudCannon replaces DOM nodes when re-rendering registered components. New nodes get the hidden CSS but not the JS-applied "active" class that makes them visible. The reveal JS typically only runs on page-load events (`astro:page-load`, `DOMContentLoaded`), not on editor re-renders. Symptoms:

- Blocks fade away on initial visual editor load
- All content disappears after editing a field that triggers component re-render
- Multiple blocks vanish when editing one block

**Fix (primary): CSS override using `.cms-editor-active`.** CloudCannon automatically adds the `.cms-editor-active` class to `<body>` when a page loads inside the Visual Editor ([docs](https://cloudcannon.com/documentation/developer-articles/detecting-your-site-is-loaded-in-the-visual-editor/)). Override the hidden state in global CSS:

```css
/* Force reveal elements visible in the CloudCannon editor */
.cms-editor-active .reveal {
  opacity: 1;
  transform: translateY(0);
  transition: none;
}
```

This is the most reliable approach: pure CSS, no timing issues, works on initial page load and after component re-renders. Adapt the selector to match whatever class the template uses (`.reveal`, `.aos-animate`, `.animate-on-scroll`, etc.).

**Fix (supplementary): `ENV_CLIENT` guard in component code.** For the editable-regions client bundle (component re-renders), you can also skip the hidden class at render time:

```astro
<!-- WidgetWrapper.astro or equivalent -->
<div class:list={[{ reveal: animate && !import.meta.env.ENV_CLIENT }]}>
  <slot />
</div>
```

`ENV_CLIENT` is only `true` in the editable-regions client bundle — it does NOT affect the initial production HTML. The CSS override above handles the initial render; this guard prevents the class from appearing in re-rendered component output.

**Inline `<script>` runtime checks.** For animation JS in inline `<script>` tags (e.g. `IntersectionObserver` setup), use `window.inEditorMode`:

```javascript
if (window.inEditorMode) {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("active"));
  return;
}
```

**Summary of detection mechanisms** ([CC docs](https://cloudcannon.com/documentation/developer-articles/detecting-your-site-is-loaded-in-the-visual-editor/)):

| Mechanism | Context | Use for |
|---|---|---|
| `.cms-editor-active` on `<body>` | CSS | Overriding animation/visibility styles (primary fix) |
| `window.inEditorMode` | Runtime JS | Inline `<script>` logic, conditional imports |
| `import.meta.env.ENV_CLIENT` | Build-time (Vite) | Astro component template expressions, module scripts (only in editable-regions client bundle) |

**Audit flag:** During the audit phase, flag any scroll-reveal or entrance animation patterns. Search for `opacity: 0` in CSS, `IntersectionObserver` in JS, and common class names like `reveal`, `aos`, `animate-on-scroll`. Note the file(s) responsible so they can be patched in the visual editing phase.

## Module compatibility in the editable-regions client bundle

The `editableRegions()` integration builds a client bundle that re-renders registered components in the browser. Most modules work without special handling. Here's how different module types are resolved:

**Shimmed `astro:*` modules** — editable-regions provides browser-safe shims for `astro:content`, `astro:assets`, and `astro:env/server`. Components importing from these work automatically. Without the integration, these imports would fail in the client bundle.

**Other `astro:*` modules** — Modules like `astro:actions`, `astro:transitions`, `astro:i18n`, `astro:middleware`, and `astro:env/client` are not shimmed by editable-regions, but they aren't blocked either. The resolver passes them through to Astro's own Vite plugins, which handle them normally.

**Third-party virtual modules** — Modules like `virtual:astro-icon` are not intercepted by editable-regions at all (its resolver only handles `astro:*` prefixed imports). They're resolved by their own Vite plugins in the same build pipeline. As long as the emitted module is browser-safe (no Node APIs in the output), these work fine. Most Vite virtual modules emit static data or pure JS at build time, so this is the common case.

**What doesn't work** — Components that use Node-only APIs at runtime (filesystem access, `process.env`, native binaries) will fail in the browser context. Vue, Svelte, and Solid components don't have renderers (only React has one via `astro-react-renderer`). These need editing fallbacks — see [When to use an editing fallback](#when-to-use-an-editing-fallback).

**Runtime shims provided by editable-regions:**
- `Astro.props` — passed through from CloudCannon's prop data
- `Astro.slots` — shimmed with `has()` and `render()` via `renderSlotToString`
- `Astro.request` — shimmed as `new Request(window.location.href)` (one new instance per `createAstro` call)

### `astro-icon`

`astro-icon` is a common example of a third-party virtual module that works. Register components using `<Icon>` normally — no editing fallbacks needed.

`virtual:astro-icon`'s Vite plugin emits serialized JSON (icon SVG collections) at build time. `@iconify/utils` is pure JS. `Astro.request` is shimmed. The entire chain is browser-safe.

**Sprite dedup quirk:** `Icon.astro` uses `Astro.request` as a `WeakMap` key for sprite deduplication. Since editable-regions creates a new `Request` per component, every icon renders its full `<symbol>` instead of reusing with `<use href>`. This only affects the visual editor preview and is cosmetically irrelevant.

**Build-time issues** (astro-icon specific, not related to editable-regions):

1. **Missing `src/icons/` directory** — `astro-icon` always tries to load a `local` icon set from `src/icons/`. If the directory doesn't exist, the build fails with `Unable to load the "local" icon set!`. Fix: create an empty `src/icons/` directory.
2. **Empty icon props in `<template>` blueprints** — Astro renders `<template>` element contents server-side. If a blueprint passes an empty icon name to a component that uses `<Icon>`, the build fails with `Unable to locate "" icon!`. Fix: guard `<Icon>` rendering on a truthy name:

```astro
{icon && <Icon aria-hidden="true" name={icon} />}
```

This applies to any component rendered inside a `<template>` array blueprint where prop values may be empty.
