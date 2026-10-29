# Visual Editing Reference (Next.js)

Next.js deltas from [../visual-editing-reference.md](../visual-editing-reference.md). Markup in JSX, rich text hosts and `<template>` blueprints follow [../react/visual-editing-reference.md](../react/visual-editing-reference.md). Read a section when a checklist item in [visual-editing.md](visual-editing.md) links here.

## Registered components

**MUST:** keep every registered component, and everything it imports, client-safe: no `async` component, no `node:fs`, no `server-only`, no `next/headers`, no `useRouter`. Its data comes only through props.
**Why:** the gated import in `CloudCannonEditor` puts the component map in the client bundle. A registered component doesn't need `"use client"`, because being imported from there already makes it, and everything it imports, client code.

In the Pages Router every component is client code, and server-side data loading happens only in a page file's `getStaticProps` and `getStaticPaths`. A component that renders from props there is already client-safe; one that imports `node:fs` or a loader module directly is not.

The editor re-renders each registered component in its own React root, outside Next's router:

| Call inside a registered component    | In the editor                                        |
| ------------------------------------- | ---------------------------------------------------- |
| `useRouter` from `next/navigation`    | Throws `invariant expected app router to be mounted` |
| `useRouter` from `next/router`        | Throws `NextRouter was not mounted`                  |
| `useRouter` from `next/compat/router` | Returns `null`                                       |
| `<Link>` from `next/link`             | Renders its `<a>` without the router                 |

Pass the current path or query in as props instead of reading the router.

Decide each component's treatment in this order, and take the first that fits:

1. **It renders only from its props:** register it; the page passes the data in.
2. **It loads its own data** (a file read, a data-file import, a build-time fetch) **and each field maps straight to an element:** leave it unregistered, and give its fields primitive regions, with `@data[<key>]` paths for data files. A header that imports `data/nav.json` and renders `@data[nav]` regions is the typical case.
3. **It loads its own data and its output is computed:** move the import to the caller, which passes the data as props and wraps the component in `<editable-component data-prop="@data[<key>]">`. Any other prop the caller passes follows [../visual-editing-reference.md § Component prop contract](../visual-editing-reference.md#component-prop-contract).
4. **Its client behaviour fights re-rendering** (autoplay, its own DOM management): register a display-only twin as an editing fallback → [../visual-editing-reference.md § Detecting the editor](../visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic), and settle its load-time state → [§ Load-time behaviour](../visual-editing-reference.md#load-time-behaviour-in-the-editor).

Keep the map in `app/cloudcannon/componentMap.ts` (Pages Router: `cloudcannon/componentMap.js` beside `pages/`), keyed by the `data-component` value:

```ts
import type { ComponentType } from "react";
import CallToAction from "../components/CallToAction";
import CtaBlock from "../components/blocks/CtaBlock";
import FeaturesBlock from "../components/blocks/FeaturesBlock";
import HeroBlock from "../components/blocks/HeroBlock";

// Keys are the `_type` values in content_blocks.
export const blockMap: Record<string, ComponentType<any>> = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};

export const componentMap: Record<string, ComponentType<any>> = {
  ...blockMap,
  "call-to-action": CallToAction,
};
```

### Images in registered components

**MUST:** in a registered component that renders an image from a path content stores, wrap the image in an image region bound to that path:

```tsx
<editable-image data-prop-src="image">
  <Image src={image} alt="" width={400} height={200} />
</editable-image>
```

When code maps stored paths to imports, the region wraps the mapped image the same way — see [cloudcannon-configuration/nextjs/configuration.md § Imported images](../../cloudcannon-configuration/nextjs/configuration.md#imported-images).

**Why:** the component renders the stored path as-is. An image uploaded or picked since the last build isn't in `out/` (or in the import map — see [cloudcannon-configuration/nextjs/configuration.md § Imported images](../../cloudcannon-configuration/nextjs/configuration.md#imported-images)), so it shows broken until the next build. The image region swaps in CloudCannon's preview URL, which shows it straight away.

## Detecting the editor in Next.js

Next.js has no `ENV_CLIENT`. Registered components render in the site's own client bundle, so there is no separate editor build to branch on. Use `window.inEditorMode` in client code and `.cms-editor-active` in CSS — see [../editable-regions-internals.md § Detecting the Visual Editor](../editable-regions-internals.md#detecting-the-visual-editor).

## MDX bodies

Render the MDX component as the children of the `@content` region, in either router. Editing the body text, editing a snippet's props and adding a snippet all save into the `.mdx` file, and components in the body show as snippets.

App Router with `@next/mdx`:

```jsx
// app/blog/[slug]/page.jsx
export default async function Post({ params }) {
  const { slug } = await params;
  const { default: Body } = await import(`../../../content/blog/${slug}.mdx`);
  return (
    <div data-editable="text" data-type="block" data-prop="@content">
      <Body />
    </div>
  );
}
```

Pages Router with `next-mdx-remote`:

```jsx
// pages/blog/[slug].jsx
export default function Post({ source }) {
  return (
    <div data-editable="text" data-type="block" data-prop="@content">
      <MDXRemote {...source} components={mdxComponents} />
    </div>
  );
}
```

`getStaticProps` and the shared components map are in [cloudcannon-snippets/nextjs/overview.md § `next-mdx-remote`](../../cloudcannon-snippets/nextjs/overview.md#next-mdx-remote), along with the snippet configuration.

## Page builder blocks in Next.js

Render blocks from the same `blockMap` that `componentMap` spreads in, so a block type can't be rendered without also being registered. The `Blocks` renderer, and why it throws on an unknown `_type`, are in [migrate-to-cloudcannon/nextjs/page-building.md § Blocks](../../migrate-to-cloudcannon/nextjs/page-building.md#blocks).

## Source editables in Next.js

**MUST NOT:** put source regions in route files. The Visual Editor doesn't open them — see [configuration.md § Route files](../../cloudcannon-configuration/nextjs/configuration.md#route-files).
