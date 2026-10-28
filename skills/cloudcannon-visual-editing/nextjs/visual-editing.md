# Visual Editing (Next.js)

Workflow for adding CloudCannon Visual Editor support to a statically exported Next.js site, on the App Router or the Pages Router, using `@cloudcannon/editable-regions`. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), React's rules in [../react/visual-editing-reference.md](../react/visual-editing-reference.md), and Next.js's deltas in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

If `package.json` lists `@cloudcannon/react-connector`, work through [§ Sites using the React connector](#sites-using-the-react-connector) as part of setup.

## Setup steps

The steps use App Router paths, with `app/` at the site root. Keep the same layout relative to wherever the site's `app/` lives. The paths and commands are illustrative: use the site's package manager and its own components folder, and adjust the relative imports to match. A Pages Router site puts the same files here:

| File                                      | App Router                             | Pages Router                                                 |
| ----------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `EditableRegions` and `CloudCannonEditor` | `app/layout.tsx`                       | `pages/_app.(js\|jsx\|tsx)` — create it if the site has none |
| `CloudCannonEditor`                       | `app/components/CloudCannonEditor.tsx` | `components/CloudCannonEditor.jsx`                           |
| `componentMap`, `registerComponents`      | `app/cloudcannon/`                     | `cloudcannon/` beside `pages/`                               |

**MUST NOT:** put the registration files, or any other non-route module, under `pages/`.
**Why:** every file under `pages/` with an extension in `pageExtensions` becomes a route, so `next build` tries to export it as a page.

1. **Install** the package:

   ```sh
   npm install @cloudcannon/editable-regions
   ```

2. **Check** `tsconfig.json`, if the site has one: `compilerOptions.moduleResolution` is `bundler`, `node16` or `nodenext`. With `node`, the `/react` import and the JSX types for `editable-*` elements don't load, and the type check in `next build` fails.

3. **Wrap** the layout's content in one `EditableRegions` root in `app/layout.tsx`, and render the editor loader after it. If the layout already has a single element around the page, turn that element into the root. Pages stay server components, passed through as `children`. The rules behind the root are in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

   ```tsx
   import { EditableRegions } from "@cloudcannon/editable-regions/react";
   import CloudCannonEditor from "./components/CloudCannonEditor";
   import SiteFooter from "./components/SiteFooter";
   import SiteHeader from "./components/SiteHeader";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           <EditableRegions tag="div">
             <SiteHeader />
             <main>{children}</main>
             <SiteFooter />
           </EditableRegions>
           <CloudCannonEditor />
         </body>
       </html>
     );
   }
   ```

   In the Pages Router, wrap the page component in `pages/_app.jsx`. The page's own layout component, with its header and footer, renders inside `<Component>`, so it sits inside the root too:

   ```jsx
   import { EditableRegions } from "@cloudcannon/editable-regions/react";
   import CloudCannonEditor from "../components/CloudCannonEditor";

   export default function App({ Component, pageProps }) {
     return (
       <>
         <EditableRegions tag="div">
           <Component {...pageProps} />
         </EditableRegions>
         <CloudCannonEditor />
       </>
     );
   }
   ```

4. **Create** `app/components/CloudCannonEditor.tsx`. It renders nothing and imports the registration file only inside the Visual Editor:

   ```tsx
   "use client";

   import { useEffect } from "react";

   export default function CloudCannonEditor() {
     useEffect(() => {
       if (!(window as { inEditorMode?: boolean }).inEditorMode) return;
       import("../cloudcannon/registerComponents").catch((error) => {
         console.warn("Failed to load CloudCannon component registration:", error);
       });
     }, []);

     return null;
   }
   ```

   In the Pages Router, the directive has no effect, since every component there is client code. In a `.jsx` file, drop the type cast: `if (!window.inEditorMode) return;`.

   The dynamic `import()` puts the registration code, and every component it imports, in a chunk that production page loads never request. Use a relative path: `@cloudcannon/...` looks like an npm scope and resolves to the package, not your local file.

5. **Create** `app/cloudcannon/componentMap.ts` with every component a `data-component` attribute names, and `app/cloudcannon/registerComponents.ts` to register them:

   ```ts
   import { registerReactComponent } from "@cloudcannon/editable-regions/react";
   import { componentMap } from "./componentMap";

   for (const [key, component] of Object.entries(componentMap)) {
     registerReactComponent(key, component);
   }
   ```

   What can go in the map, and the page-builder `blockMap`, are in [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

6. **Build** (`next build`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

Register components from the gated import, not from top-level imports in a client component. Top-level imports ship every registered component to every production page.

### Package exports reference

| Import path                           | Purpose                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@cloudcannon/editable-regions/react` | `EditableRegions` root for the layout, and `registerReactComponent()` for component re-rendering |

It also brings in the JSX types for `editable-*` elements → [../react/visual-editing-reference.md § Markup in JSX](../react/visual-editing-reference.md#markup-in-jsx).

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page. The one exception, new page-builder blocks written in Phase 3, is in [../visual-editing.md § Section census](../visual-editing.md#section-census).

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). In Next.js, a registered component is one in `componentMap`, and a loop is a `.map()`. A section rendered by a component that loads its own data can't be a `component` treatment as it stands — see [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] `next.config.*` has `output: "export"`
- [ ] In a TypeScript site, `tsconfig.json` sets `moduleResolution` to `bundler`, `node16` or `nodenext`
- [ ] In the App Router, `app/layout.tsx` has exactly one `<EditableRegions>`, and it wraps the header, the page `children` and the footer
- [ ] In the Pages Router, `pages/_app.*` has exactly one `<EditableRegions>`, and it wraps `<Component {...pageProps} />`
- [ ] `<CloudCannonEditor />` is rendered in `app/layout.tsx` or `pages/_app.*`
- [ ] `CloudCannonEditor` imports `registerComponents` with a relative path inside the `inEditorMode` check
- [ ] In the App Router, `CloudCannonEditor.tsx` starts with `"use client"`
- [ ] No component, map or helper module sits under `pages/`
- [ ] No `@cloudcannon/react-connector` in `package.json`, and no `CloudCannonConnect` in the code
- [ ] No client component imports `registerReactComponent` or the component map at the top level
- [ ] `next build` passes cleanly after setup

## Completeness checklist

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items.
2. **Then work through** the Next.js items:

- [ ] **Collection and data file config**: `_enabled_editors` and each data file's `file_config` follow the configuration guide
      → [configuration.md](../../cloudcannon-configuration/configuration.md)
- [ ] **Regions inside the root**: Every rendered `data-editable` and `editable-*` element sits inside `<EditableRegions>`
      → [Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root)
- [ ] **Registration wiring**: Every key in `componentMap.ts` is referenced via `data-component` somewhere
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Client-safe registered components**: No registered component, or anything it imports, is async, reads files, calls `useRouter`, or imports `server-only` or `next/headers`
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Rich text hosts**: Every `data-type="text"` or `"block"` region receives an HTML string through `dangerouslySetInnerHTML` on the region host. An MDX body renders its component (`<Body />` or `<MDXRemote>`) inside the host instead
      → [Text editing](../react/visual-editing-reference.md#text-editing), [MDX bodies](visual-editing-reference.md#mdx-bodies)
- [ ] **`<template>` blueprints**: Every blueprint renders through `RawTemplate`, never as JSX children of `<template>`
      → [Array blueprints](../react/visual-editing-reference.md#array-blueprints)
- [ ] **Spread props**: Registered components are rendered as `<Component {...value} />`, where `value` is what their `data-prop` points at
      → [Component prop contract](../visual-editing-reference.md#component-prop-contract)

### Page builder only (skip if not applicable)

- [ ] **Block items**: `data-component={block._type}` on each `data-editable="array-item"` element
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-nextjs)
- [ ] **Shared block map**: The page-builder route renders from `blockMap`, and `componentMap` spreads `blockMap` into itself
      → [Page builder blocks](visual-editing-reference.md#page-builder-blocks-in-nextjs)
- [ ] **Registration keys match `_type`**: Every `blockMap` key is the exact `_type` string from content files, and every `_type` value has an entry
      → [Page builder blocks](../visual-editing-reference.md#page-builder-blocks)

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `out/` (`grep -rE "data-editable|data-prop" out/ --include='*.html'`). The `.txt` files beside each page repeat the markup as the React payload.

## Sites using the React connector

`@cloudcannon/react-connector` gives live editing by re-rendering the whole page. `CloudCannonConnect(Component)`, usually in `pages/_app.*`, wraps the page component; on every `cloudcannon:update` event it fetches the file's front matter with `CloudCannon.value()` and passes it to the page as `page.data`, after the optional `processProps`. `data-cms-bind="#path"` attributes make an element open that field in the sidebar on click.

**MUST:** remove the connector before adding regions.
**Why:** editable regions take over live updates, region by region. The connector would keep re-rendering the whole page from new props on every edit on top of them.

- [ ] Remove `@cloudcannon/react-connector` from `package.json`
- [ ] Remove the `CloudCannonConnect` import and wrapper; `_app` renders `<Component {...pageProps} />` inside `<EditableRegions>`, as in [§ Setup steps](#setup-steps)
- [ ] Delete the `processProps` and `valueOptions` options with the wrapper; they configure only the connector's live updates
- [ ] Add a census row for every element that has `data-cms-bind`. Whether to convert each one is a census decision — see [cloudcannon-bookshop/migrating-to-editable-regions.md § Regions on a former Bookshop site](../../cloudcannon-bookshop/migrating-to-editable-regions.md#regions-on-a-former-bookshop-site). Convert per the mapping below
- [ ] Remove each converted `data-cms-bind`. Keep a prop that builds its value (such as a `dataBinding` string passed to each block) only while a binding it feeds stays
- [ ] Run `grep -rn "react-connector\|CloudCannonConnect" --exclude-dir=node_modules .` and expect no matches
- [ ] On a site already on CloudCannon, update its build command when the migration changes it — see [cloudcannon-configuration/configuration.md § Build settings](../../cloudcannon-configuration/configuration.md#build-settings)

| Connector setup                                                      | Editable regions                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole page re-renders from `page.data` on every edit                 | Each region updates itself; anything outside a region shows the change after the next build                                                                                                           |
| `data-cms-bind="#content_blocks.0"` on a block's root element        | The blocks loop as `data-editable="array"` with `data-prop="content_blocks"`, each block an `array-item` with `data-component` — see [§ Page builder only](#page-builder-only-skip-if-not-applicable) |
| `data-cms-bind="#title"` on an element showing a string              | A `text` region with `data-prop="title"`                                                                                                                                                              |
| `data-cms-bind` on an element whose markup is computed from the data | A registered component in `<editable-component data-prop="…">`                                                                                                                                        |
