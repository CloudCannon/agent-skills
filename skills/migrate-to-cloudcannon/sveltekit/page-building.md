# Page Building (SvelteKit)

Read [../page-building.md](../page-building.md) first. This file covers only the SvelteKit differences: the page files, the rest route that renders them, and the block map.

## Pages collection

| Rule                 | Value                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Folder               | `content/pages/`, one `.md` file per page, read in a server `load` — see [content.md § Read files in server loads](content.md#read-files-in-server-loads)                                        |
| Home page            | `content/pages/index.md`, at path `/` — see [../page-building.md § Common mistakes](../page-building.md#common-mistakes)                                                                         |
| Pages editors create | Rendered by `src/routes/[...slug]/`                                                                                                                                                              |
| Collection `url`     | `/[full_slug]`, or `/[full_slug]/` under `trailingSlash = "always"` — see [cloudcannon-configuration/sveltekit/collection-urls.md](../../cloudcannon-configuration/sveltekit/collection-urls.md) |

### Steps

1. **Create** `content/pages/` and move each page's content from its route into `<slug>.md`, named after the route folder (`src/routes/about/+page.svelte` → `about.md`, `src/routes/+page.svelte` → `index.md`). Add `_schema: <key>` to each file that doesn't use the `default` schema ([schemas.md § `default` and `_schema`](../../cloudcannon-configuration/schemas.md#default-and-_schema)).
2. **Add** `src/routes/[...slug]/` to render every file in the collection, then delete the route folders it replaces (`about/`, and the root `+page.svelte`). A route folder that stays wins over the rest route for its path.

   ```js
   // src/routes/[...slug]/+page.server.js
   import { error } from "@sveltejs/kit";
   import { getPage, pageSlugs } from "$lib/server/pages.js";

   export function entries() {
     return pageSlugs().map((slug) => ({ slug: slug === "index" ? "" : slug }));
   }

   export function load({ params }) {
     const page = getPage(params.slug);
     if (!page) error(404, "Not found");
     return { page };
   }
   ```

   ```svelte
   <!-- src/routes/[...slug]/+page.svelte -->
   <script>
     import Blocks from "$lib/components/Blocks.svelte";

     let { data } = $props();
   </script>

   <svelte:head><title>{data.page.data.title}</title></svelte:head>

   {#if data.page.data.content_blocks}
     <Blocks blocks={data.page.data.content_blocks} />
   {:else}
     {@html data.page.html}
   {/if}
   ```

   `getPage` and `pageSlugs` are in [content.md § Read files in server loads](content.md#read-files-in-server-loads); render the markdown body to `html` there with the site's parser. Each creatable schema gets a branch here. On Svelte 3 and 4, take `data` with `export let data;`.

   When the pages are mdsvex files, there is no parser to call: each file compiles to a component, and only a universal load can return one. Use `+page.js` instead of `+page.server.js`, and render the component where the page renders `{@html}`:

   ```js
   // src/routes/[...slug]/+page.js
   import { error } from "@sveltejs/kit";

   const pages = import.meta.glob("/content/pages/*.md");
   const slugOf = (path) => path.split("/").pop().replace(/\.md$/, "");

   export function entries() {
     return Object.keys(pages).map((path) => ({
       slug: slugOf(path) === "index" ? "" : slugOf(path),
     }));
   }

   export async function load({ params }) {
     const resolve = pages[`/content/pages/${params.slug || "index"}.md`];
     if (!resolve || params.slug === "index") error(404, "Not found");
     const page = await resolve();
     return { meta: page.metadata, Body: page.default };
   }
   ```

   The page reads fields from `data.meta`, and renders the body as `<data.Body />` (Svelte 5) or `<svelte:component this={data.Body} />` (Svelte 3 and 4).

3. **Keep** `entries` reading the same folder as `load`, so a page an editor creates is built with no link to it — see [cloudcannon-configuration/sveltekit/configuration.md § Every page must be prerendered](../../cloudcannon-configuration/sveltekit/configuration.md#every-page-must-be-prerendered). Map `index` to the empty slug: left as `index`, it builds a second home page at `/index`.

## Array-based page builder

When to use one, the schema file and the structures are in [../page-building.md § Array-based page builder](../page-building.md#array-based-page-builder). SvelteKit adds the block map and the `Blocks` renderer, both keyed on `_type`, the structures' discriminator.

### The block map

**MUST:** render blocks only from `blockMap`, the same map the Visual Editor registers from.
**Why:** with one map, a block can't render on the site without also re-rendering in the editor. A separate `{#if}` chain or second map drifts, and a block missing from registration shows an error card in the editor while the build passes.

```js
// src/lib/cloudcannon/blockMap.js
import HeroBlock from "$lib/components/blocks/HeroBlock.svelte";
import FeaturesBlock from "$lib/components/blocks/FeaturesBlock.svelte";
import CtaBlock from "$lib/components/blocks/CtaBlock.svelte";

// Keys are the `_type` values in content_blocks.
export const blockMap = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};
```

```js
// src/lib/cloudcannon/componentMap.js
import { blockMap } from "./blockMap.js";

export const componentMap = {
  ...blockMap,
};
```

`blockMap` has its own file because `Blocks.svelte` imports it on every page that renders blocks; the rest of the map loads only in the editor. `componentMap` adds the standalone components the page registers outside the blocks array. Registration, and where the map is loaded in the editor, are in [cloudcannon-visual-editing/sveltekit/overview.md](../../cloudcannon-visual-editing/sveltekit/overview.md).

Block components are registered components, so they follow the rule in [cloudcannon-visual-editing/sveltekit/visual-editing-reference.md § Registered components](../../cloudcannon-visual-editing/sveltekit/visual-editing-reference.md#registered-components).

### Blocks

A thin renderer shared by every page that renders `content_blocks`. Phase 3 writes it without the `data-editable` wrappers, rendering each block straight from the map. Phase 4 adds the wrappers below once the section census covers the page:

```svelte
<!-- src/lib/components/Blocks.svelte -->
<script>
  import { blockMap } from "$lib/cloudcannon/blockMap.js";

  let { blocks } = $props();

  const resolved = $derived(
    blocks.map((block) => {
      const component = blockMap[block._type];
      if (!component) throw new Error(`No block component for _type "${block._type}"`);
      return { block, component };
    }),
  );
</script>

<div data-editable="array" data-prop="content_blocks" data-component-key="_type">
  {#each resolved as { block, component: Block }, index (index)}
    <div data-editable="array-item" data-component={block._type}>
      <Block {...block} />
    </div>
  {/each}
</div>
```

On Svelte 3 and 4, take `blocks` with `export let blocks;`, compute `resolved` in a `$:` statement, and render each block with `<svelte:component this={component} {...block} />`.

**MUST:** throw on an unknown `_type`; never filter unknown blocks out or skip them.
**Why:** each rendered item's position is its index in `content_blocks`. Dropping one shifts every later item onto the wrong array entry, so edits land on the wrong block. Throwing fails the page's prerender instead, so the build stops on a typo in a content file.

With `prerender.handleHttpError: "warn"`, the build passes and leaves the page out instead. Check the build against every collection file → [cloudcannon-configuration/sveltekit/collection-urls.md § Listing the build](../../cloudcannon-configuration/sveltekit/collection-urls.md#listing-the-build).

The three layers every block needs, including the regions inside each block component, are in [visual-editing-reference.md § Page builder blocks](../../cloudcannon-visual-editing/visual-editing-reference.md#page-builder-blocks).

## Common mistakes

| Excuse                                                   | Reality                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "An `{#if}` chain on `_type` in the page is simpler"     | It is a second map — see [§ The block map](#the-block-map).                                                        |
| "I'll keep `about/` and let the rest route build it too" | Each path gets one page; the route folder wins. Delete it once its content is in `content/pages/about.md`.         |
| "New pages are linked from the nav, so they'll build"    | Only once an editor adds the link. `entries` builds them without one.                                              |
| "I'll parse the files in `+page.js`, it's simpler"       | It runs in the browser too — see [content.md § Read files in server loads](content.md#read-files-in-server-loads). |
| "I'll make a `homepage` collection"                      | Use one `pages` collection — see [../audit.md § Census table](../audit.md#census-table).                           |
