# Visual Editing Reference (Nuxt)

Nuxt deltas from [../visual-editing-reference.md](../visual-editing-reference.md). Template markup and rich text hosts follow [../vue/visual-editing-reference.md](../vue/visual-editing-reference.md). Read a section when a checklist item in [visual-editing.md](visual-editing.md) links here.

## Registered components

**MUST:** give every registered component, and everything it renders, its data through props. None of them loads data itself: no `await`, `useAsyncData`, `useFetch` or `queryCollection` in its `<script setup>`.
**Why:** the editor re-renders the component in a separate Vue app with no Suspense boundary, so an async component renders an empty box, with no error.

Nuxt composables such as `useRoute()`, and components such as `<NuxtLink>` and Nuxt UI's, work in registered components.

Nuxt auto-imports hide data loading: `queryCollection` has no import line to grep for. Read each registered component's `<script setup>`, and that of every component it renders.

Decide each component's treatment in this order, and take the first that fits:

1. **It's a server component** (`.server.vue`, or rendered through `<NuxtIsland>`): don't register it. Nuxt fetches a server component's HTML for each set of props, and the CloudCannon build holds HTML only for the props it built with, so an edited prop gets a 404 and the component disappears. Give it a plain `.vue` twin with the same markup. Register the twin, and render it wherever a registered component rendered the server component.
2. **It renders only from its props:** register it; the page passes the data in.
3. **It loads its own data** (a data-file import, `useAppConfig`, a query) **and each field maps straight to an element:** leave it unregistered, and give its fields primitive regions, with `@data[<key>]` paths for data files. A header that imports `data/nav.json` and renders `@data[nav]` regions is the typical case.
4. **It loads its own data and its output is computed:** move the load to the caller, which passes the data as props and wraps the component in `<editable-component data-prop="@data[<key>]">`. Any other prop the caller passes follows [../visual-editing-reference.md § Component prop contract](../visual-editing-reference.md#component-prop-contract).
5. **Its client behaviour fights re-rendering** (autoplay, its own DOM management): register a display-only twin → [../visual-editing-reference.md § Detecting the editor](../visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic), and settle its load-time state → [§ Load-time behaviour](../visual-editing-reference.md#load-time-behaviour-in-the-editor).

Keep the map in `app/cloudcannon/componentMap.ts`, keyed by the `data-component` value, with each component imported explicitly:

```ts
import type { Component } from "vue";
import CallToAction from "../components/CallToAction.vue";
import CtaBlock from "../components/blocks/CtaBlock.vue";
import FeaturesBlock from "../components/blocks/FeaturesBlock.vue";
import HeroBlock from "../components/blocks/HeroBlock.vue";

// Keys are the `_type` values in content_blocks.
export const blockMap: Record<string, Component> = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};

export const componentMap: Record<string, Component> = {
  ...blockMap,
  "call-to-action": CallToAction,
};
```

### Images in registered components

**MUST:** in a registered component that renders an image from a path content stores, wrap the image in an image region bound to that path:

```vue
<editable-image data-prop-src="image" data-prop-alt="image_alt">
  <img :src="image" :alt="image_alt" width="480" height="320" />
</editable-image>
```

**Why:** the component renders the stored path as-is. An image uploaded or picked since the last build isn't in `.output/public`, so it shows broken until the next build. The image region swaps in CloudCannon's preview URL, which shows it straight away.

## Array blueprints

**MUST:** render `<template>` blueprints through a component that emits the element as a static vnode, never as a `<template>` tag in a single-file component.
**Why:** with a plain `<template>` tag in a Nuxt page, "Add item" adds the entry to the data but shows nothing in the preview.

```vue
<!-- RawTemplate.vue -->
<script lang="ts">
import { createStaticVNode, defineComponent } from "vue";

export default defineComponent({
  props: { html: { type: String, required: true } },
  setup(props) {
    return () => createStaticVNode(`<template>${props.html}</template>`, 1);
  },
});
</script>
```

Write each blueprint as an HTML string next to the rows it mirrors:

```vue
<script setup lang="ts">
const TAG_BLUEPRINT = `<li data-editable="array-item"><editable-text data-prop=""></editable-text></li>`;
</script>

<template>
  <ul data-editable="array" data-prop="tags">
    <li v-for="tag in page.tags" :key="tag" data-editable="array-item">
      <editable-text data-prop="">{{ tag }}</editable-text>
    </li>
    <RawTemplate :html="TAG_BLUEPRINT" />
  </ul>
</template>
```

## Detecting the editor in Nuxt

Nuxt has no `ENV_CLIENT`. Registered components render in the site's own client bundle, so there is no separate editor build to branch on. Use `window.inEditorMode` in client code (`onMounted`, a `.client` plugin) and `.cms-editor-active` in CSS — see [../editable-regions-internals.md § Detecting the Visual Editor](../editable-regions-internals.md#detecting-the-visual-editor). Never read `window` during render: the build renders every page on the server, where it doesn't exist.

## Nuxt Content bodies

Put the `@content` region on `<ContentRenderer>` itself, and keep its styling class there. It passes the attributes to the element it renders around the body. Editing the body text saves into the Markdown file, and MDC components with snippets show as snippets.

```vue
<ContentRenderer
  :value="page"
  class="prose"
  data-editable="text"
  data-type="block"
  data-prop="@content"
/>
```

**Why:** the editor replaces the region's children with the body. A wrapper `div` around `<ContentRenderer>` leaves its element in the build but not in the editor, so a class such as `prose` on it stops styling the body while editing.

On Nuxt Content v2, keep the site's `<ContentDoc />` as the child of the region. It also sets the page's `<title>` and meta description, which `<ContentRenderer>` doesn't.

The snippet configuration is in [cloudcannon-snippets/nuxt/overview.md](../../cloudcannon-snippets/nuxt/overview.md). A body that uses MDC components without snippets stays out of the region, and editors edit it in the Content Editor only once the snippets exist. A body with nested MDC blocks stays out of the region → [cloudcannon-snippets/nuxt/overview.md § Nested blocks](../../cloudcannon-snippets/nuxt/overview.md#nested-blocks).

A YAML string rendered with `<MDC :value="…">` is inline markdown: bind it as a `data-type="text"` region on the element around `<MDC>`.

## Page builder blocks in Nuxt

Render blocks from the same `blockMap` that `componentMap` spreads in, so a block type can't be rendered without also being registered. The `Blocks` renderer, and why it throws on an unknown `_type`, are in [migrate-to-cloudcannon/nuxt/page-building.md § Blocks](../../migrate-to-cloudcannon/nuxt/page-building.md#blocks).

## Source editables in Nuxt

**MUST NOT:** put source regions in `.vue` files. CloudCannon doesn't edit Vue single-file components — see [configuration.md § Page and component files](../../cloudcannon-configuration/nuxt/configuration.md#page-and-component-files).
