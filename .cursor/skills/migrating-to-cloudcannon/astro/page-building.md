# Page Building (Astro)

Guidance for creating content-backed pages and array-based page builders in Astro sites migrating to CloudCannon.

## Creating a pages collection from hardcoded pages

Many templates have **no content-backed pages** -- all page data is hardcoded directly in `.astro` templates. The audit identifies these pages as content collection candidates when they have 3+ sections of structured or repeated components (card lists, timelines, feature grids). See [audit.md § Classifying static pages](audit.md#classifying-static-pages-source-editables-vs-content-collection).

### When this applies

- Static `.astro` pages with structured data (arrays of cards, timeline entries, hero sections with multiple fields) that editors need CRUD control over
- Source editables aren't sufficient because editors need to add, remove, or reorder items -- not just edit text in place
- The template has multiple static pages that should be editable, making a `pages` collection worthwhile
- **Default toward content-backed pages** unless you have a concrete reason not to. Moving copy and structure into the collection keeps templates thin, gives editors real CRUD, and scales better as the site grows. **Source editables** are fine for small, page-specific hardcoded bits—use them as the exception, not the default pattern.

### Steps

1. **Create `src/content/pages/`** and add a `.md` file for each page. Extract the hardcoded data from the `.astro` template into YAML frontmatter. Add `_schema: <key>` to each file so CloudCannon matches the correct schema.

2. **Add a `pagesCollection`** to the content config with a `z.union` schema covering all page types. See [configuration.md § Merge unique pages with a z.union](../../cloudcannon-configuration/astro/configuration.md#fallback-merge-unique-pages-into-pages-with-a-zunion) for the pattern. Place the most specific schemas first in the union. Define shared Zod objects for common shapes that appear across page types.

3. **Update each `.astro` page** in `src/pages/` to fetch its data from the collection instead of hardcoding it:

```astro
---
import { getEntry } from "astro:content";
const page = await getEntry("pages", "projects");
const { sections } = page.data;
---
```

4. **Add a catch-all route** at `src/pages/[...slug].astro` to serve pages created from the CMS. Without this, new content files have no route and produce 404s. Astro's routing priority means dedicated routes (`index.astro`, `projects.astro`, `blog/[slug].astro`) always win -- the catch-all only matches slugs that don't have a specific route.

```astro
---
import { getCollection, render } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
import BlockRenderer from "../components/BlockRenderer.astro";

export async function getStaticPaths() {
  const pages = await getCollection("pages");
  return pages.map((page) => ({
    params: { slug: page.id === "index" ? undefined : page.id },
    props: { page },
  }));
}

const { page } = Astro.props;
const { Content } = await render(page);
const data = page.data;
---

<BaseLayout title={data.title}>
  {data.content_blocks ? (
    <div
      data-editable="array"
      data-prop="content_blocks"
      data-component-key="_type"
    >
      {data.content_blocks.map((block) => (
        <BlockRenderer block={block} />
      ))}
    </div>
  ) : (
    <article class="prose prose-lg max-w-[750px]">
      <Content />
    </article>
  )}
</BaseLayout>
```

The catch-all checks for `content_blocks` to switch between page builder rendering and plain body rendering. Each creatable schema needs a corresponding rendering branch.

**Multiple layouts.** When the template has multiple layouts (e.g. `PageLayout`, `LandingLayout`), add a `layout` field to the content schema and switch dynamically:

```astro
const layouts: Record<string, any> = { PageLayout, LandingLayout };
const LayoutComponent = layouts[data.layout || ""] || PageLayout;
```

Only use layouts that accept a generic props interface (e.g. `metadata`). Specialized layouts like `MarkdownLayout` often expect a different prop shape (e.g. `frontmatter`) and will crash in the catch-all. For markdown pages, use the generic layout and render the prose wrapper directly in the catch-all template.

### Identifying reusable page types

Review the audit's component inventory for components used on **multiple pages**. If the same component pattern appears on more than one page, it's a strong candidate for a creatable schema. Editors can then create new pages of that type without developer help.

For each reusable page type:

- Add a Zod schema variant to the union
- Add a CC schema in `.cloudcannon/schemas/` with representative frontmatter
- Add a rendering branch in the catch-all route
- Add an `add_options` entry on the collection with `new_preview_url` pointing to an existing page that uses the same rendering

Also consider whether the base layout supports a **generic title + body page** -- if so, add a `default` schema for simple markdown pages. Use `editor: content` on its add option since the primary workflow is writing markdown.

### CC collection config

```yaml
pages:
  path: src/content/pages
  url: "/[slug]/"
  icon: wysiwyg
  _enabled_editors:
    - visual
    - data
  schemas:
    default:
      path: .cloudcannon/schemas/page.md
      name: Page
    page_builder:
      path: .cloudcannon/schemas/page-builder.md
      name: Page Builder
      new_preview_url: /services/
  add_options:
    - name: Page
      schema: default
      icon: wysiwyg
      editor: content
    - name: Page Builder
      schema: page_builder
      icon: dashboard
```

Only creatable page types appear in `add_options`. One-off pages with dedicated routes (homepage, contact) have schemas for editing but are excluded from `add_options` -- creating a second one would produce a file with no dedicated route.

## Array-based page builder

A schema with a `content_blocks` array lets editors assemble pages from reusable blocks in any order.

**When to use it**: When the site has 3+ reusable block components (heroes, banners, features, CTAs, testimonials, rich text). Fewer than 3 blocks doesn't justify the added complexity.

For the full structures reference (inline vs split, field completeness, previews, deriving from components), see [structures.md](../../cloudcannon-configuration/structures.md). Structures must be defined during the configuration phase because the content phase uses them as the blueprint for field completeness.

### Schema structure

```yaml
_schema: page_builder
title:
description:
meta_title:
image:
hero_content:
draft: false
content_blocks: []
```

### Zod schema

Add a `pageBuilderSchema` to the union with `content_blocks` as a discriminated union array:

```typescript
const contentBlock = z.discriminatedUnion("_type", [
  z.object({ _type: z.literal("banner"), title: z.string(), /* ... */ }),
  z.object({ _type: z.literal("features"), items: z.array(/* ... */) }),
  z.object({ _type: z.literal("rich_text"), content: z.string() }),
  z.object({ _type: z.literal("call_to_action") }),
  z.object({ _type: z.literal("testimonial") }),
]);

const pageBuilderSchema = z.object({
  ...commonFields,
  hero_content: z.string().optional(),
  content_blocks: z.array(contentBlock),
});
```

Place `pageBuilderSchema` before the generic `pageSchema` in the union so it matches before the catch-all.

### CC structures

Define structures for each block type using `_type` as the discriminator. For sites with 5+ block types, use the split co-located approach (see [structures.md](../../cloudcannon-configuration/structures.md)):

```yaml
_inputs:
  content_blocks:
    type: array
    options:
      structures:
        values_from_glob:
          - /src/components/*.cloudcannon.structure-value.yml
```

### Reference blocks vs inline blocks

**Reference blocks** (e.g. CTA, Testimonial) point at **global JSON** in the Data section: the block in the page array is usually just a `_type` marker, and the Astro page imports that shared data and passes it into the component. Editors still get visual editing where those values are bound with `@data[key]` regions. You can **combine** shared data with per-instance props—for example, body copy from a JSON file reused everywhere, plus `background` and `textColor` on each block instance in the page builder.

### BlockRenderer

Create a `BlockRenderer.astro` component that maps `_type` to the matching widget. Use a shared `componentMap` (see [visual-editing.md § Setup steps](../../cloudcannon-visual-editing/astro/visual-editing.md#setup-steps)) so the mapping lives in one place:

```astro
<!-- BlockRenderer.astro -->
---
import { componentMap } from '~/cloudcannon/componentMap';

const { block } = Astro.props;
const { _type, ...props } = block;
const Component = componentMap[_type as string];
---

{Component && (
  <section data-editable="array-item" data-component={_type} data-id={_type}>
    <Component {...props} />
  </section>
)}
```

Each array item combines two behaviours: `data-editable="array-item"` provides CRUD controls (add, remove, reorder) and `data-component` enables component re-rendering of the block's contents. When no suitable HTML element exists, use `<editable-array-item>` instead. See [visual-editing-reference.md § Page builder blocks](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#page-builder-blocks) for the full visual editing setup.

Every widget component inside also needs nested text/image regions on editable fields (`data-editable="text"` / `data-editable="image"`, or `<editable-text>` / `<editable-image>` when the host is wrapper-only). See [visual-editing-reference.md § Text editing](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#text-editing) and [§ Image editing](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#image-editing). Every `_type` value used in content files must have a matching `registerAstroComponent(_type, Component)` call in `registerComponents.ts`.

### CSS class overrides between blocks

Original templates often pass CSS class overrides to visually join adjacent blocks (e.g. `classes={{ container: "pt-0 md:pt-0" }}` to remove padding between a header block and the content below). These are layout concerns that can't be cleanly replicated through frontmatter — adding `classes` as a CMS field exposes implementation details to editors.

Accept minor visual diffs (~3-5%) for adjacent block spacing rather than leaking CSS into content. If spacing is critical, handle it in the component with a prop like `compact: true` (boolean, editor-friendly) instead of raw class strings.

For the full visual editing setup (three-layer pattern, nested editables, sub-arrays, component registration), see [visual-editing.md](../../cloudcannon-visual-editing/astro/visual-editing.md).
