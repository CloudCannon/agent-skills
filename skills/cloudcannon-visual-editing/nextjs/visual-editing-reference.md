# Visual Editing Reference (Next.js)

Next.js deltas from [../visual-editing-reference.md](../visual-editing-reference.md). Read a section when a checklist item in [visual-editing.md](visual-editing.md) links here.

## Markup in JSX

Server components emit region attributes and `editable-*` custom elements as plain JSX. `data-prop` values are static strings.

```tsx
<h1 data-editable="text" data-type="span" data-prop="title">
  {page.data.title}
</h1>

<editable-component data-component="call-to-action" data-prop="@data[cta]">
  <CallToAction {...cta} />
</editable-component>
```

The JSX types for `editable-*` elements come with the `/react` entry point and need no setup.

## Registered components

**MUST:** keep every registered component, and everything it imports, client-safe: no `async` component, no `node:fs`, no `server-only`, no `next/headers`, no `useRouter`. Its data comes only through props.
**Why:** the gated import in `CloudCannonEditor` puts the component map in the client bundle. A registered component doesn't need `"use client"`, because being imported from there already makes it client code.

The editor re-renders each registered component in its own React root, outside Next's app router:

- `useRouter` throws `invariant expected app router to be mounted` there (`next/dist/client/components/navigation.js`, line 149).
- `<Link>` skips client navigation and prefetching, so a click is a plain `<a>` page load (`next/dist/client/app-dir/link.js`, line 316).

| Component                                                                | Treatment                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Renders only from its props                                              | Register it; the page passes the data in                                                                                                    |
| Reads its own data — a file read, a data-file import, a build-time fetch | Leave it unregistered; give its fields primitive regions, with `@data[<key>]` paths for data files                                          |
| Has computed output and reads its own data                               | Move the data load to the caller, which wraps the component in `<editable-component data-prop="@data[<key>]">` and passes the data as props |

A header that imports `data/nav.json` and renders `@data[nav]` regions is the typical unregistered case.

Keep the map in `app/cloudcannon/componentMap.ts`, keyed by the `data-component` value:

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

## Text editing in Next.js

Pass rendered HTML to a rich text region through `dangerouslySetInnerHTML` on the region host itself:

```tsx
<div
  data-editable="text"
  data-type="block"
  data-prop="@content"
  dangerouslySetInnerHTML={{ __html: page.html }}
/>
```

Use a `<p>` host with `data-type="text"` for inline markdown, and a `<div>` for `data-type="block"` and `@content`.

## Array blueprints in Next.js

**MUST:** render `<template>` blueprints with `dangerouslySetInnerHTML`, never as JSX children.
**Why:** the editor reads a blueprint from `template.content`. React children never reach it, so the blueprint stays empty and its row stays in the live DOM, which floods the editor with "array item has no parent" errors.

```tsx
export default function RawTemplate({ html }: { html: string }) {
  return <template dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Write each blueprint as an HTML string next to the rows it mirrors:

```tsx
const TAG_BLUEPRINT = `<li data-editable="array-item"><editable-text data-prop=""></editable-text></li>`;

<ul data-editable="array" data-prop="tags">
  {page.data.tags.map((tag: string) => (
    <li key={tag} data-editable="array-item">
      <editable-text data-prop="">{tag}</editable-text>
    </li>
  ))}
  <RawTemplate html={TAG_BLUEPRINT} />
</ul>;
```

## Page builder blocks in Next.js

Render blocks from the same `blockMap` that `componentMap` spreads in, so a block type can't be rendered without also being registered. The `Blocks` renderer, and why it throws on an unknown `_type`, are in [migrate-to-cloudcannon/nextjs/page-building.md § Blocks](../../migrate-to-cloudcannon/nextjs/page-building.md#blocks).

## Source editables in Next.js

**MUST:** limit source regions in a `.tsx` route file to `data-type="span"` around plain text, with no JSX expressions, child components or tags inside.
**Why:** an edit writes the region's new contents into the file as markup. A rich text edit writes HTML such as `<br>`, which isn't valid JSX, and the first edit replaces any expression or component.

```tsx
<h1 data-editable="source" data-path="app/about/page.tsx" data-key="about-title" data-type="span">
  About us
</h1>
```

The collection that lets editors open a route file is in [configuration.md § Route files](../../cloudcannon-configuration/nextjs/configuration.md#route-files-tsx).
