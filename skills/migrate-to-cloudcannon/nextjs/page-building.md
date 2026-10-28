# Page Building (Next.js)

Read [../page-building.md](../page-building.md) first. This file covers only the Next.js differences: the page files, the routes that render them, and the block map. Paths and code use the App Router; [§ Pages Router](#pages-router) lists what changes there.

## Pages collection

| Rule                 | Value                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Folder               | `content/pages/`, one `.md` file per page                                                                                                      |
| Home page            | `content/pages/index.md`, read by `app/page.tsx` — see [../page-building.md § Common mistakes](../page-building.md#common-mistakes)            |
| Pages editors create | Rendered by `app/[slug]/page.tsx`                                                                                                              |
| Collection `url`     | Follows `trailingSlash` — see [cloudcannon-configuration/nextjs/collection-urls.md](../../cloudcannon-configuration/nextjs/collection-urls.md) |

### Steps

1. **Create** `content/pages/` and move each page's content from its route file into `<slug>.md`, named after the route segment (`app/about/page.tsx` → `about.md`). Add `_schema: <key>` to each file that doesn't use the `default` schema ([schemas.md § `default` and `_schema`](../../cloudcannon-configuration/schemas.md#default-and-_schema)).
2. **Point** `app/page.tsx` at `getEntry("pages", "index")` — the loader is in [content.md § The content loader](content.md#the-content-loader).
3. **Add** `app/[slug]/page.tsx` to render every other file in the collection, then delete the route folders it replaces (`app/about/`). A page that keeps its own route folder is left out of `generateStaticParams`.

   ```tsx
   // app/[slug]/page.tsx
   import { getEntries, getEntry } from "../../lib/content";
   import Blocks from "../components/Blocks";
   import Markdown from "../components/Markdown"; // the site's body renderer

   export function generateStaticParams() {
     return getEntries("pages")
       .filter(({ slug }) => slug !== "index")
       .map(({ slug }) => ({ slug }));
   }

   export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
     const { slug } = await params;
     const { data, body } = getEntry("pages", slug);
     return data.content_blocks ? (
       <Blocks blocks={data.content_blocks} />
     ) : (
       <Markdown body={body} />
     );
   }
   ```

   Each creatable schema gets a branch here. `generateStaticParams` must return at least one page — see [content.md § `[slug]` routes](content.md#slug-routes). With route groups, put `[slug]` in the group whose layout new pages need (`app/(marketing)/[slug]/page.tsx`).

4. **Set** each page's `<title>` and description from front matter with `generateMetadata` in the route. When the root layout sets `title.template`, a page whose original title wasn't templated (usually home) returns `title: { absolute: … }`.

### Pages Router

The collection, the steps and the `Blocks` renderer are the same. These differ:

| App Router                                           | Pages Router                                                                                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/page.tsx` reads `index`                         | `pages/index.jsx` reads `index` in `getStaticProps`                                                                                                                         |
| `app/[slug]/page.tsx` with `generateStaticParams`    | `pages/[slug].jsx` with `getStaticPaths`, filtering out `index`, `fallback: false` — see [content.md § Pages Router data functions](content.md#pages-router-data-functions) |
| Route folders to delete (`app/about/`)               | Route files to delete (`pages/about.jsx`); content file named after the file (`about.md`)                                                                                   |
| `generateMetadata`                                   | `next/head` in the page component                                                                                                                                           |
| `app/cloudcannon/componentMap.ts`, `app/components/` | Outside `pages/` — every file there is a route; see [visual-editing.md § Setup steps](../../cloudcannon-visual-editing/nextjs/visual-editing.md#setup-steps)                |

## Array-based page builder

When to use one, the schema file and the structures are in [../page-building.md § Array-based page builder](../page-building.md#array-based-page-builder). Next.js adds the block map and the `Blocks` renderer, both keyed on `_type`, the structures' discriminator.

### The block map

**MUST:** render blocks only from `blockMap`, the same map the Visual Editor registers from.
**Why:** with one map, a block can't render on the site without also re-rendering in the editor. A separate `switch` or second map drifts, and a block missing from registration shows an error card in the editor while the build passes.

```ts
// app/cloudcannon/componentMap.ts
import type { ComponentType } from "react";
import HeroBlock from "../components/blocks/HeroBlock";
import FeaturesBlock from "../components/blocks/FeaturesBlock";
import CtaBlock from "../components/blocks/CtaBlock";

// Keys are the `_type` values in content_blocks.
export const blockMap: Record<string, ComponentType<any>> = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};

export const componentMap: Record<string, ComponentType<any>> = {
  ...blockMap,
};
```

`componentMap` adds the standalone components the page registers outside the blocks array. Registration, and where the map is loaded in the editor, are in [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md).

Block components are registered components, so they follow the client-safe rule in [cloudcannon-visual-editing/nextjs/visual-editing-reference.md § Registered components](../../cloudcannon-visual-editing/nextjs/visual-editing-reference.md#registered-components).

### Blocks

A thin renderer shared by every route that renders `content_blocks`. Phase 3 writes it without the `data-editable` wrappers, rendering each block straight from the map (`<Block key={index} {...block} />`). Phase 4 adds the wrappers below once the section census covers the page:

```tsx
// app/components/Blocks.tsx
import { blockMap } from "../cloudcannon/componentMap";

export default function Blocks({ blocks }: { blocks: { _type: string }[] }) {
  return (
    <div data-editable="array" data-prop="content_blocks" data-component-key="_type">
      {blocks.map((block, index) => {
        const Block = blockMap[block._type];
        if (!Block) throw new Error(`No block component for _type "${block._type}"`);
        return (
          <div key={index} data-editable="array-item" data-component={block._type}>
            <Block {...block} />
          </div>
        );
      })}
    </div>
  );
}
```

**MUST:** throw on an unknown `_type`; never filter unknown blocks out or skip them.
**Why:** each rendered item's position is its index in `content_blocks`. Dropping one shifts every later item onto the wrong array entry, so edits land on the wrong block. Throwing fails the build instead, so a typo in a content file never reaches the editor.

The three layers every block needs, including the regions inside each block component, are in [visual-editing-reference.md § Page builder blocks](../../cloudcannon-visual-editing/visual-editing-reference.md#page-builder-blocks).

## Common mistakes

| Excuse                                                      | Reality                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "A `switch` on `_type` in the route is simpler"             | It is a second map — see [§ The block map](#the-block-map).                                        |
| "I'll keep `app/about/` and let `[slug]` build `about` too" | Each URL gets one route. Delete the route folder, or leave its slug out of `generateStaticParams`. |
| "I'll make a `homepage` collection"                         | Use one `pages` collection — see [../audit.md § Census table](../audit.md#census-table).           |
