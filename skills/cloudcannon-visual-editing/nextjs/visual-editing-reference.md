# Visual Editing Reference (Next.js)

Next.js deltas from [../visual-editing-reference.md](../visual-editing-reference.md). Markup in JSX, rich text hosts and `<template>` blueprints follow [../react/visual-editing-reference.md](../react/visual-editing-reference.md). Read a section when a checklist item in [visual-editing.md](visual-editing.md) links here.

## Registered components

**MUST:** keep every registered component, and everything it imports, client-safe: no `async` component, no `node:fs`, no `server-only`, no `next/headers`, no `useRouter`. Its data comes only through props.
**Why:** the gated import in `CloudCannonEditor` puts the component map in the client bundle. A registered component doesn't need `"use client"`, because being imported from there already makes it client code.

In the Pages Router every component is client code, and server-side data loading happens only in a page file's `getStaticProps` and `getStaticPaths`. A component that renders from props there is already client-safe; one that imports `node:fs` or a loader module directly is not.

The editor re-renders each registered component in its own React root, outside Next's router:

| Call inside a registered component    | In the editor                                        |
| ------------------------------------- | ---------------------------------------------------- |
| `useRouter` from `next/navigation`    | Throws `invariant expected app router to be mounted` |
| `useRouter` from `next/router`        | Throws `NextRouter was not mounted`                  |
| `useRouter` from `next/compat/router` | Returns `null`                                       |
| `<Link>` from `next/link`             | Renders its `<a>` without the router                 |

Pass the current path or query in as props instead of reading the router.

| Component                                                                | Treatment                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Renders only from its props                                              | Register it; the page passes the data in                                                                                                    |
| Reads its own data — a file read, a data-file import, a build-time fetch | Leave it unregistered; give its fields primitive regions, with `@data[<key>]` paths for data files                                          |
| Has computed output and reads its own data                               | Move the data load to the caller, which wraps the component in `<editable-component data-prop="@data[<key>]">` and passes the data as props |

A header that imports `data/nav.json` and renders `@data[nav]` regions is the typical unregistered case.

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
