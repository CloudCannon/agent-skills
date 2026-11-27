# Visual Editing (SvelteKit)

Workflow for adding CloudCannon Visual Editor support to a prerendered SvelteKit site using `@cloudcannon/editable-regions`. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), Svelte's rules in [../svelte/visual-editing-reference.md](../svelte/visual-editing-reference.md), and SvelteKit's deltas in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

If `package.json` lists `@cloudcannon/svelte-connector`, work through [§ Sites using the Svelte connector](#sites-using-the-svelte-connector) as part of setup.

## Setup steps

The commands are illustrative: use the site's package manager. Code uses Svelte 5; on Svelte 3 and 4, render the page with `<slot />` in place of `{@render children()}`.

1. **Install** the package:

   ```sh
   npm install @cloudcannon/editable-regions
   ```

2. **Wrap** the page in one `EditableRegions` root in the root `src/routes/+layout.svelte`, around the header, the page and the footer. If the layout already has a single element around the page, turn that element into the root. Every page and `+error.svelte` render inside the root layout, so one root covers the site. The rules behind the root are in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

3. **Import** the registration file from the same layout, in `onMount` and only inside the Visual Editor:

   ```svelte
   <!-- src/routes/+layout.svelte -->
   <script>
     import { onMount } from "svelte";
     import { EditableRegions } from "@cloudcannon/editable-regions/svelte";
     import SiteHeader from "$lib/components/SiteHeader.svelte";
     import SiteFooter from "$lib/components/SiteFooter.svelte";

     let { children } = $props();

     onMount(() => {
       if (!window.inEditorMode) return;
       import("$lib/cloudcannon/registerComponents.js").catch((error) => {
         console.warn("Failed to load CloudCannon component registration:", error);
       });
     });
   </script>

   <EditableRegions tag="div">
     <SiteHeader />
     <main>{@render children()}</main>
     <SiteFooter />
   </EditableRegions>
   ```

   The dynamic `import()` puts the registered components, and their styles, in a chunk that page loads outside the editor never request. `registerSvelteComponent` itself ships on every page, because it comes from the same module as `EditableRegions`; it is small and never runs outside the editor.

4. **Create** `src/lib/cloudcannon/componentMap.js` with every component a `data-component` attribute names, and `src/lib/cloudcannon/registerComponents.js` to register them:

   ```js
   import { registerSvelteComponent } from "@cloudcannon/editable-regions/svelte";
   import { componentMap } from "./componentMap.js";

   for (const [key, component] of Object.entries(componentMap)) {
     registerSvelteComponent(key, component);
   }
   ```

   What can go in the map, and the page-builder `blockMap`, are in [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

5. **Build** and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

Register components from the gated import, not from top-level imports in a layout or component. Top-level imports ship every registered component to every page.

### Package exports reference

| Import path                            | Purpose                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `@cloudcannon/editable-regions/svelte` | `EditableRegions` root, and `registerSvelteComponent()` for component re-rendering |

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a route or component until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page. The one exception, new page-builder blocks written in Phase 3, is in [../visual-editing.md § Section census](../visual-editing.md#section-census).

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). In SvelteKit, a registered component is one in `componentMap`, and a loop is an `{#each}`. A section rendered by a component that loads its own data can't be a `component` treatment as it stands — see [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] The root `+layout.svelte` renders exactly one `<EditableRegions>`, and it wraps the header, the page and the footer
- [ ] The root `+layout.svelte` imports `registerComponents` in `onMount`, inside the `window.inEditorMode` check
- [ ] No `@cloudcannon/svelte-connector` in `package.json`, and no `onCloudCannonChanges` in the code
- [ ] No layout or component imports `registerSvelteComponent` or the component map at the top level
- [ ] The build passes cleanly after setup, with no prerender errors

## Completeness checklist

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items.
2. **Then work through** the SvelteKit items:

- [ ] **Collection and data file config**: `_enabled_editors` and each data file's `file_config` follow the configuration guide
      → [configuration.md](../../cloudcannon-configuration/configuration.md)
- [ ] **Regions inside the root**: Every rendered `data-editable` and `editable-*` element sits inside `<EditableRegions>`
      → [Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root)
- [ ] **Component names resolve**: every `data-component` value, and every `_type` in content and structures, is a key in `componentMap.js`
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Registered components take props**: No registered component, or anything it renders, reads its data from a `load`, a data import, a store or `getContext`
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Images in registered components**: Every image a registered component renders from a stored path sits in an image region bound to that path
      → [Images in registered components](../visual-editing-reference.md#images-in-registered-components)
- [ ] **Rich text hosts**: Every `data-type="text"` or `"block"` region receives an HTML string through `{@html}` inside the region host. An mdsvex body puts the region on the element around the body component
      → [Text editing](../svelte/visual-editing-reference.md#text-editing), [Markdown bodies](visual-editing-reference.md#markdown-bodies)
- [ ] **Spread props**: Registered components are rendered as `<Component {...value} />`, where `value` is what their `data-prop` points at
      → [Component prop contract](../visual-editing-reference.md#component-prop-contract)

### Page builder only (skip if not applicable)

- [ ] **Block items**: `data-component={block._type}` on each `data-editable="array-item"` element
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-sveltekit)
- [ ] **Shared block map**: The page-builder page renders from `blockMap` in `blockMap.js`, and `componentMap` spreads `blockMap` into itself
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-sveltekit)
- [ ] **Registration keys match `_type`**: Every `blockMap` key is the exact `_type` string from content files, and every `_type` value has an entry
      → [Page builder blocks](../visual-editing-reference.md#page-builder-blocks)

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against the build output (`grep -rE "data-editable|data-prop" build --include='*.html'`).

## Sites using the Svelte connector

`@cloudcannon/svelte-connector` gives live editing by replacing the page's data. A page calls `onCloudCannonChanges(callback)` in `onMount`; on every edit the callback receives the file's front matter and the page assigns it to its local copy of the data, so the whole page re-renders. `stopCloudCannonChanges()` in `onDestroy` detaches it. On a Bookshop site the callback wraps the data in `trackBookshopLiveData`; follow [cloudcannon-bookshop/sveltekit/overview.md](../../cloudcannon-bookshop/sveltekit/overview.md) for those sites, which removes the connector as one of its steps.

**MUST:** remove the connector before adding regions.
**Why:** editable regions take over live updates, region by region. The connector would keep re-rendering the whole page from new data on every edit on top of them.

- [ ] Remove `@cloudcannon/svelte-connector` from `package.json`
- [ ] Remove the `onCloudCannonChanges` and `stopCloudCannonChanges` calls and the local copy of the page data they fed; the page renders straight from `data`
- [ ] Add a census row for every element that has `data-cms-bind`, and convert it as [cloudcannon-bookshop/migrating-to-editable-regions.md § Regions on a former Bookshop site](../../cloudcannon-bookshop/migrating-to-editable-regions.md#regions-on-a-former-bookshop-site) decides
- [ ] Run `grep -rn "svelte-connector\|onCloudCannonChanges" --exclude-dir=node_modules .` and expect no matches
- [ ] On a site already on CloudCannon, update its build command when the migration changes it — see [cloudcannon-configuration/configuration.md § Build settings](../../cloudcannon-configuration/configuration.md#build-settings)
