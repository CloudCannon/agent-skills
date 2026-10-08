# Page Building (Astro)

Read [../page-building.md](../page-building.md) first. This file covers only the Astro differences: content files, the Zod schema, the catch-all route and the block dispatcher.

## Creating a pages collection from hardcoded pages

Many templates have **no content-backed pages** -- all page data is hardcoded directly in `.astro` templates. For each page the census sends to the `pages` collection, move that data into a content file. See [audit.md § Classifying static pages](audit.md#classifying-static-pages-source-editables-vs-content-collection).

### Pages collection cheatsheet

| Rule              | Value                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage filename | `src/content/pages/index.md`; another name opens the wrong URL even when `src/pages/index.astro` renders it — see [../page-building.md § Common mistakes](../page-building.md#common-mistakes) |
| CMS-created pages | Require a catch-all route at `src/pages/[...slug].astro`                                                                                                                                       |
| Collection URL    | `url: "/[slug]/"` — `index` slug resolves to `/`                                                                                                                                               |
| `getEntry` id     | Matches the filename slug — `getEntry('pages', 'index')` for `index.md`                                                                                                                        |

One `pages` collection holds every unique-layout page — see [../audit.md § Census table](../audit.md#census-table). Its content config schema is a `z.union` with one member per page type, alongside the CloudCannon `schemas:` entries — see step 2.

### Steps

1. **Create `src/content/pages/`** and add a `.md` file for each page. Extract the hardcoded data from the `.astro` template into YAML frontmatter. Add `_schema: <key>` to each file so CloudCannon matches the correct schema.

2. **Add a `pagesCollection`** to the content config with a `z.union` schema covering all page types. See [configuration.md § Merge unique pages with a z.union](../../cloudcannon-configuration/astro/configuration.md#fallback-merge-unique-pages-into-pages-with-a-union) for the pattern. Place the most specific schemas first in the union. Define shared Zod objects for common shapes that appear across page types.

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
        <div data-editable="array-item" data-component={block._type}>
          <BlockRenderer {...block} />
        </div>
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

**Per-page slot overrides become layout props.** Pages that overrode a layout slot (e.g. `<Fragment slot="announcement" />` to hide a banner) need that customisation from frontmatter once one catch-all renders them all. **MUST NOT** translate it to `{hideAnnouncement && <Fragment slot="announcement" />}`: Astro registers the slot whether or not the condition is true, so `Astro.slots.has('announcement')` is true on every page and the layout's default for that slot disappears site-wide. Add a layout prop set from frontmatter instead (`<PageLayout hideAnnouncement={data.hideAnnouncement}>`, `headerVariant`) and branch on it inside the layout. See [§ Common mistakes](#common-mistakes).

### Identifying reusable page types

For each reusable page type from [../page-building.md § Choose the page types editors can create](../page-building.md#choose-the-page-types-editors-can-create), also:

- Add a Zod schema variant to the union
- Add a rendering branch in the catch-all route

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

Which page types appear in `add_options`, and where each opens, is in [configuration.md § New files and the Add button](../../cloudcannon-configuration/configuration.md#new-files-and-the-add-button).

### Common mistakes

Drive layout slots conditionally from the catch-all route (`{flag && <Fragment slot="x" />}`). The slot registers even when `flag` is false, so the layout's default for it vanishes on every page, and the build passes. Convert per-page slot overrides into layout props — see [§ Steps](#steps).

## Array-based page builder

When to use one, the schema file and the structures are in [../page-building.md § Array-based page builder](../page-building.md#array-based-page-builder). Astro adds the Zod schema and the `BlockRenderer` dispatcher, both keyed on `_type`, the structures' discriminator.

### Zod schema

Add a `pageBuilderSchema` to the union with `content_blocks` as a discriminated union array:

```typescript
const contentBlock = z.discriminatedUnion("_type", [
  z.object({ _type: z.literal("banner"), title: z.string() /* ... */ }),
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

### BlockRenderer

Create a `BlockRenderer.astro` component that maps `_type` to the matching widget. Use a shared `componentMap` (see [visual-editing.md § Setup steps](../../cloudcannon-visual-editing/astro/visual-editing.md#setup-steps)) so the mapping lives in one place. BlockRenderer is a thin dispatcher with no markup of its own:

```astro
<!-- BlockRenderer.astro -->
---
import { componentMap } from '../cloudcannon/componentMap';

const { _type, ...props } = Astro.props;
const Component = componentMap[_type as string];
---

{Component && <Component {...props} />}
```

Put the array-item wrapper in the catch-all route's loop above, not in BlockRenderer — see [visual-editing-reference.md § BlockRenderer architecture](../../cloudcannon-visual-editing/astro/visual-editing-reference.md#blockrenderer-architecture). The three layers every block needs, including nested editables inside each widget, are in [visual-editing-reference.md § Page builder blocks](../../cloudcannon-visual-editing/visual-editing-reference.md#page-builder-blocks).

Every `_type` value used in content files must have a matching `registerAstroComponent(_type, Component)` call in `registerComponents.ts`.

For the full visual editing setup (three-layer pattern, nested editables, sub-arrays, component registration), see [visual-editing.md](../../cloudcannon-visual-editing/astro/visual-editing.md).

> Frontmatter that feeds any computation (ternary, lookup, `iconPaths[x]`, `set:html`) must flow through a registered component — see [golden rule](../../cloudcannon-visual-editing/visual-editing-reference.md#golden-rule--computed-content-needs-a-component-wrapper).
> Statically-placed registered components must be wrapped with `<editable-component>` at the call site, not self-marked on the section root — see [standalone-wrapper rule](../../cloudcannon-visual-editing/visual-editing-reference.md#where-does-the-registration-go--component-root-or-call-site).
> Each registered component's fields should be nested under one frontmatter key — see [frontmatter co-location](../../cloudcannon-visual-editing/visual-editing-reference.md#scattered-fields-feeding-a-registered-component--nest-the-frontmatter).
