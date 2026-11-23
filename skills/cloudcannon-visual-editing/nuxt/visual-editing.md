# Visual Editing (Nuxt)

Workflow for adding CloudCannon Visual Editor support to a statically generated Nuxt site using `@cloudcannon/editable-regions`. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), Vue's rules in [../vue/visual-editing-reference.md](../vue/visual-editing-reference.md), and Nuxt's deltas in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

If `package.json` lists `@cloudcannon/visual-editor-connector`, work through [§ Sites using the visual editor connector](#sites-using-the-visual-editor-connector) as part of setup.

## Setup steps

The paths use Nuxt 4's `app/` directory. In Nuxt 3, put the same files at the root. The commands are illustrative: use the site's package manager.

1. **Install** the package:

   ```sh
   npm install @cloudcannon/editable-regions
   ```

2. **Tell Vue** that `editable-*` elements are custom elements, in `nuxt.config.ts`:

   ```ts
   export default defineNuxtConfig({
     vue: {
       compilerOptions: {
         isCustomElement: (tag) => tag.startsWith("editable-"),
       },
     },
   });
   ```

   Without it, Vue drops every `editable-*` element and its contents from the built HTML.

3. **Wrap** the page in one `EditableRegions` root, placed in the outermost component that renders regions, so the header and footer sit inside it. If that component already has a single element around the page, turn that element into the root. The rules behind the root are in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

   | Where the header and footer render  | Where the root goes                                     |
   | ----------------------------------- | ------------------------------------------------------- |
   | In each layout                      | Each layout, around the header, `<slot />` and footer   |
   | In `app.vue`, around `<NuxtLayout>` | `app.vue`, around the header, `<NuxtLayout>` and footer |
   | In `app.vue`, with no `layouts/`    | `app.vue`, around `<NuxtPage />`                        |

   `error.vue` replaces `app.vue` when it renders, so it gets its own root when it renders regions.

   ```vue
   <!-- app/layouts/default.vue -->
   <script setup lang="ts">
   import { EditableRegions } from "@cloudcannon/editable-regions/vue";
   </script>

   <template>
     <EditableRegions tag="div">
       <SiteHeader />
       <main>
         <slot />
       </main>
       <SiteFooter />
     </EditableRegions>
   </template>
   ```

   A page renders one layout, so roots in several layouts still give each page one root.

4. **Create** `app/plugins/cloudcannon.client.ts`. The `.client` suffix runs it only in the browser, and it imports the registration file only inside the Visual Editor:

   ```ts
   export default defineNuxtPlugin(() => {
     if (!(window as { inEditorMode?: boolean }).inEditorMode) return;
     import("../cloudcannon/registerComponents").catch((error) => {
       console.warn("Failed to load CloudCannon component registration:", error);
     });
   });
   ```

   The dynamic `import()` puts the registration code, and every component it imports, in a chunk that production page loads never request. Use a relative path: `@cloudcannon/...` looks like an npm scope and resolves to the package, not your local file.

5. **Create** `app/cloudcannon/componentMap.ts` with every component a `data-component` attribute names, and `app/cloudcannon/registerComponents.ts` to register them:

   ```ts
   import { registerVueComponent } from "@cloudcannon/editable-regions/vue";
   import { componentMap } from "./componentMap";

   for (const [key, component] of Object.entries(componentMap)) {
     registerVueComponent(key, component);
   }
   ```

   What can go in the map, and the page-builder `blockMap`, are in [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

6. **Build** (`nuxt generate`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

Register components from the gated import, not from top-level imports in a plugin or component. Top-level imports ship every registered component to every production page.

### Package exports reference

| Import path                         | Purpose                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `@cloudcannon/editable-regions/vue` | `EditableRegions` root, and `registerVueComponent()` for component re-rendering |

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page. The one exception, new page-builder blocks written in Phase 3, is in [../visual-editing.md § Section census](../visual-editing.md#section-census).

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). In Nuxt, a registered component is one in `componentMap`, and a loop is a `v-for`. A section rendered by a component that loads its own data can't be a `component` treatment as it stands — see [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] `nuxt.config.*` sets `vue.compilerOptions.isCustomElement` for `editable-` tags
- [ ] Every page renders exactly one `<EditableRegions>`, and it wraps the header, the page and the footer
- [ ] `error.vue` has its own `<EditableRegions>` when it renders regions
- [ ] `app/plugins/cloudcannon.client.ts` imports `registerComponents` with a relative path inside the `inEditorMode` check
- [ ] No `@cloudcannon/visual-editor-connector` in `package.json`, and no `onCloudCannonChanges` in the code
- [ ] No plugin or component imports `registerVueComponent` or the component map at the top level
- [ ] `nuxt generate` passes cleanly after setup, with no `ERROR` lines

## Completeness checklist

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items.
2. **Then work through** the Nuxt items:

- [ ] **Collection and data file config**: `_enabled_editors` and each data file's `file_config` follow the configuration guide
      → [configuration.md](../../cloudcannon-configuration/configuration.md)
- [ ] **Regions inside the root**: Every rendered `data-editable` and `editable-*` element sits inside `<EditableRegions>`
      → [Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root)
- [ ] **Component names resolve**: every `data-component` value, and every `_type` in content and structures, is a key in `componentMap.ts`
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Registered components take props**: No registered component, or anything it renders, loads its own data (`await`, `useAsyncData`, `useFetch`, `queryCollection`)
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Images in registered components**: Every image a registered component renders from a stored path sits in an image region bound to that path
      → [Images in registered components](visual-editing-reference.md#images-in-registered-components)
- [ ] **Rich text hosts**: Every `data-type="text"` or `"block"` region receives an HTML string through `v-html` on the region host. A Nuxt Content body puts the region on `<ContentRenderer>` instead
      → [Text editing](../vue/visual-editing-reference.md#text-editing), [Nuxt Content bodies](visual-editing-reference.md#nuxt-content-bodies)
- [ ] **`<template>` blueprints**: Every blueprint renders through `RawTemplate`, never as a `<template>` tag in an SFC
      → [Array blueprints](visual-editing-reference.md#array-blueprints)
- [ ] **Spread props**: Registered components are rendered as `<Component v-bind="value" />`, where `value` is what their `data-prop` points at
      → [Component prop contract](../visual-editing-reference.md#component-prop-contract)

### Page builder only (skip if not applicable)

- [ ] **Block items**: `:data-component="block._type"` on each `data-editable="array-item"` element
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-nuxt)
- [ ] **Shared block map**: The page-builder page renders from `blockMap`, and `componentMap` spreads `blockMap` into itself
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-nuxt)
- [ ] **Registration keys match `_type`**: Every `blockMap` key is the exact `_type` string from content files, and every `_type` value has an entry
      → [Page builder blocks](../visual-editing-reference.md#page-builder-blocks)

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `.output/public` (`grep -rE "data-editable|data-prop" .output/public --include='*.html'`).

## Sites using the visual editor connector

`@cloudcannon/visual-editor-connector` gives live editing by replacing the page's data. A page calls `onCloudCannonChanges(callback)` in `onMounted`; on every edit the callback receives the file's front matter and the page swaps it into its reactive state, so the whole page re-renders. `stopCloudCannonChanges()` in `onBeforeUnmount` detaches it. `data-cms-bind="#path"` attributes, often built from a `dataBinding` prop, make an element open that field in the sidebar on click.

**MUST:** remove the connector before adding regions.
**Why:** editable regions take over live updates, region by region. The connector would keep re-rendering the whole page from new data on every edit on top of them.

- [ ] Remove `@cloudcannon/visual-editor-connector` from `package.json`
- [ ] Remove the `onCloudCannonChanges` and `stopCloudCannonChanges` calls and the reactive copy of the page data they fed; the page renders straight from its query
- [ ] Add a census row for every element that has `data-cms-bind`. Whether to convert each one is a census decision — see [cloudcannon-bookshop/migrating-to-editable-regions.md § Regions on a former Bookshop site](../../cloudcannon-bookshop/migrating-to-editable-regions.md#regions-on-a-former-bookshop-site). Convert per the mapping below
- [ ] Remove each converted `data-cms-bind`. Keep a prop that builds its value (such as a `dataBinding` string passed to each block) only while a binding it feeds stays
- [ ] Run `grep -rn "visual-editor-connector\|onCloudCannonChanges" --exclude-dir=node_modules .` and expect no matches
- [ ] On a site already on CloudCannon, update its build command when the migration changes it — see [cloudcannon-configuration/configuration.md § Build settings](../../cloudcannon-configuration/configuration.md#build-settings)

| Connector setup                                                      | Editable regions                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole page re-renders from the editor's data on every edit           | Each region updates itself; anything outside a region shows the change after the next build                                                                                                           |
| `data-cms-bind="#content_blocks.0"` on a block's root element        | The blocks loop as `data-editable="array"` with `data-prop="content_blocks"`, each block an `array-item` with `data-component` — see [§ Page builder only](#page-builder-only-skip-if-not-applicable) |
| `data-cms-bind="#title"` on an element showing a string              | A `text` region with `data-prop="title"`                                                                                                                                                              |
| `data-cms-bind` on an element whose markup is computed from the data | A registered component in `<editable-component data-prop="…">`                                                                                                                                        |
