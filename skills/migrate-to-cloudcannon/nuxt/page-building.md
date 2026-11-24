# Page Building (Nuxt)

Read [../page-building.md](../page-building.md) first. This file covers only the Nuxt differences: the page files, the catch-all page that renders them, and the block map. Code uses Nuxt Content; [§ Without Nuxt Content](#without-nuxt-content) lists what changes.

## Pages collection

| Rule                 | Value                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folder               | `content/pages/`, one `.md` file per page, in a Nuxt Content `pages` collection with `prefix: "/"` — see [content.md § Nuxt Content collections](content.md#nuxt-content-collections) |
| Home page            | `content/pages/index.md`, at path `/` — see [../page-building.md § Common mistakes](../page-building.md#common-mistakes)                                                              |
| Pages editors create | Rendered by `app/pages/[...slug].vue`                                                                                                                                                 |
| Collection `url`     | `/[full_slug]/` — see [cloudcannon-configuration/nuxt/collection-urls.md](../../cloudcannon-configuration/nuxt/collection-urls.md)                                                    |

### Steps

1. **Create** `content/pages/` and move each page's content from its `.vue` file into `<slug>.md`, named after the page file (`app/pages/about.vue` → `about.md`, `app/pages/index.vue` → `index.md`). Add `_schema: <key>` to each file that doesn't use the `default` schema ([schemas.md § `default` and `_schema`](../../cloudcannon-configuration/schemas.md#default-and-_schema)).
2. **Add** `app/pages/[...slug].vue` to render every file in the collection, then delete the page files it replaces (`about.vue`, `index.vue`). A page file that stays wins over the catch-all for its path.

   ```vue
   <!-- app/pages/[...slug].vue -->
   <script setup lang="ts">
   const route = useRoute();
   const { data: page } = await useAsyncData(route.path, () =>
     queryCollection("pages").path(route.path).first(),
   );
   if (!page.value) {
     throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
   }
   useSeoMeta({ title: page.value.title, description: page.value.description });
   </script>

   <template>
     <Blocks v-if="page.content_blocks" :blocks="page.content_blocks" />
     <ContentRenderer v-else :value="page" />
   </template>
   ```

   Each creatable schema gets a branch here.

3. **Make** every file reachable to `nuxt generate`. A page editors create is built only when something links to it, so add the collection's routes in the `prerender:routes` hook — see [cloudcannon-configuration/nuxt/configuration.md § Every page must be reachable](../../cloudcannon-configuration/nuxt/configuration.md#every-page-must-be-reachable).

### Without Nuxt Content

The collection, the steps and the `Blocks` renderer are the same. The catch-all reads the site's loader by slug instead — the loader is in [content.md § Sites that load their own files](content.md#sites-that-load-their-own-files):

```ts
const slug = (route.params.slug as string[] | undefined)?.join("/") || "index";
const page = pages[slug];
```

## Array-based page builder

When to use one, the schema file and the structures are in [../page-building.md § Array-based page builder](../page-building.md#array-based-page-builder). Nuxt adds the block map and the `Blocks` renderer, both keyed on `_type`, the structures' discriminator.

### The block map

**MUST:** render blocks only from `blockMap`, the same map the Visual Editor registers from.
**Why:** with one map, a block can't render on the site without also re-rendering in the editor. A separate `v-if` chain or second map drifts, and a block missing from registration shows an error card in the editor while the build passes.

```ts
// app/cloudcannon/componentMap.ts
import type { Component } from "vue";
import HeroBlock from "../components/blocks/HeroBlock.vue";
import FeaturesBlock from "../components/blocks/FeaturesBlock.vue";
import CtaBlock from "../components/blocks/CtaBlock.vue";

// Keys are the `_type` values in content_blocks.
export const blockMap: Record<string, Component> = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};

export const componentMap: Record<string, Component> = {
  ...blockMap,
};
```

**MUST:** import block components explicitly in the map, even though Nuxt auto-imports components in templates.
**Why:** registration needs the component object itself, and a string name passed to `<component :is>` resolves only for globally registered components.

`componentMap` adds the standalone components the page registers outside the blocks array. Registration, and where the map is loaded in the editor, are in [cloudcannon-visual-editing/nuxt/overview.md](../../cloudcannon-visual-editing/nuxt/overview.md).

Block components are registered components, so they follow the rule in [cloudcannon-visual-editing/nuxt/visual-editing-reference.md § Registered components](../../cloudcannon-visual-editing/nuxt/visual-editing-reference.md#registered-components).

### Blocks

A thin renderer shared by every page that renders `content_blocks`. Phase 3 writes it without the `data-editable` wrappers, rendering each block straight from the map. Phase 4 adds the wrappers below once the section census covers the page:

```vue
<!-- app/components/Blocks.vue -->
<script setup lang="ts">
import { blockMap } from "~/cloudcannon/componentMap";

const props = defineProps<{ blocks: { _type: string }[] }>();

const resolved = computed(() =>
  props.blocks.map((block) => {
    const component = blockMap[block._type];
    if (!component) throw new Error(`No block component for _type "${block._type}"`);
    return { block, component };
  }),
);
</script>

<template>
  <div data-editable="array" data-prop="content_blocks" data-component-key="_type">
    <div
      v-for="({ block, component }, index) in resolved"
      :key="index"
      data-editable="array-item"
      :data-component="block._type"
    >
      <component :is="component" v-bind="block" />
    </div>
  </div>
</template>
```

**MUST:** throw on an unknown `_type`; never filter unknown blocks out or skip them.
**Why:** each rendered item's position is its index in `content_blocks`. Dropping one shifts every later item onto the wrong array entry, so edits land on the wrong block. Throwing fails the page's render instead, so `nuxt generate` logs the error and a typo in a content file never reaches the editor.

The three layers every block needs, including the regions inside each block component, are in [visual-editing-reference.md § Page builder blocks](../../cloudcannon-visual-editing/visual-editing-reference.md#page-builder-blocks).

## Common mistakes

| Excuse                                                     | Reality                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "A `v-if` chain on `_type` in the page is simpler"         | It is a second map — see [§ The block map](#the-block-map).                                             |
| "I'll keep `about.vue` and let the catch-all build it too" | Each path gets one page; the page file wins. Delete it once its content is in `content/pages/about.md`. |
| "New pages are linked from the nav, so they'll build"      | Only once an editor adds the link. Add the collection to the `prerender:routes` hook.                   |
| "I'll make a `homepage` collection"                        | Use one `pages` collection — see [../audit.md § Census table](../audit.md#census-table).                |
