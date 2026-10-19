# Visual Editing (Next.js)

Workflow for adding CloudCannon Visual Editor support to a statically exported Next.js App Router site using `@cloudcannon/editable-regions`. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), and Next.js's deltas from them in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

## Setup steps

The paths below assume `app/` at the site root. Keep the same layout relative to wherever the site's `app/` lives.

1. **Install** the package:

   ```sh
   npm install @cloudcannon/editable-regions
   ```

2. **Wrap** the layout's content in one `EditableRegions` root in `app/layout.tsx`, and render the editor loader after it. Pages stay server components, passed through as `children`. The rules behind the root are in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

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

3. **Create** `app/components/CloudCannonEditor.tsx`. It renders nothing and imports the registration file only inside the Visual Editor:

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

   The dynamic `import()` puts the registration code, and every component it imports, in a chunk that production page loads never request. Use a relative path: `@cloudcannon/...` looks like an npm scope and resolves to the package, not your local file.

4. **Create** `app/cloudcannon/componentMap.ts` with every component a `data-component` attribute names, and `app/cloudcannon/registerComponents.ts` to register them:

   ```ts
   import { registerReactComponent } from "@cloudcannon/editable-regions/react";
   import { componentMap } from "./componentMap";

   for (const [key, component] of Object.entries(componentMap)) {
     registerReactComponent(key, component);
   }
   ```

   What can go in the map, and the page-builder `blockMap`, are in [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

5. **Build** (`next build`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

Register components from the gated import, not from top-level imports in a client component. Top-level imports ship every registered component to every production page.

### Package exports reference

| Import path                           | Purpose                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@cloudcannon/editable-regions/react` | `EditableRegions` root for the layout, and `registerReactComponent()` for component re-rendering |

Importing it anywhere, as the layout does, brings in the JSX types for the `editable-*` custom elements.

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page. The one exception, new page-builder blocks written in Phase 3, is in [../visual-editing.md § Section census](../visual-editing.md#section-census).

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). In Next.js, a registered component is one in `app/cloudcannon/componentMap.ts`, and a loop is a `.map()`. A section rendered by a component that loads its own data can't be a `component` treatment as it stands — see [visual-editing-reference.md § Registered components](visual-editing-reference.md#registered-components).

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] `next.config.*` has `output: "export"`
- [ ] `app/layout.tsx` has exactly one `<EditableRegions>`, and it wraps the header, the page `children` and the footer
- [ ] `<CloudCannonEditor />` is rendered in `app/layout.tsx`
- [ ] `CloudCannonEditor.tsx` starts with `"use client"` and imports `registerComponents` with a relative path inside the `inEditorMode` check
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
- [ ] **Client-safe registered components**: No registered component, or anything it imports, is async, reads files, or imports `server-only` or `next/headers`
      → [Registered components](visual-editing-reference.md#registered-components)
- [ ] **Rich text hosts**: Every `data-type="text"` or `"block"` region receives its HTML through `dangerouslySetInnerHTML` on the region host
      → [Text editing](visual-editing-reference.md#text-editing-in-nextjs)
- [ ] **`<template>` blueprints**: Every blueprint renders through `RawTemplate`, never as JSX children of `<template>`
      → [Array blueprints](visual-editing-reference.md#array-blueprints-in-nextjs)
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

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `out/` (`grep -rE "data-editable|data-prop" out/`).
