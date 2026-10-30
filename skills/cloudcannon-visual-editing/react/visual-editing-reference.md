# Visual Editing Reference (React)

React rules for any SSG, on top of [../visual-editing-reference.md](../visual-editing-reference.md) and its [§ React, Vue and Svelte components](../visual-editing-reference.md#react-vue-and-svelte-components). Read a section when a link sends you here.

## Registering a React component

Register each top-level React component with `registerReactComponent(key, component)` from `@cloudcannon/editable-regions/react`:

```typescript
import { registerReactComponent } from "@cloudcannon/editable-regions/react";
import Announcement from "@/components/Announcement";

registerReactComponent("announcement", Announcement);
```

## Registered component values are objects

**MUST:** bind a registered React component's region to an object.
**Why:** the value becomes the component's props, so a string or an array arrives as index-keyed props (`{ 0: …, 1: … }`).

For a string or array field, bind it with `data-prop-<name>="<field>"` in place of `data-prop`; it arrives as `{ <name>: value }`. In TSX, put it on `<div data-editable="component">`, because the package types require `data-prop` on `<editable-component>`:

```tsx
<div data-editable="component" data-component="author-card" data-prop-author="author">
  <AuthorCard author={page.data.author} />
</div>
```

The name is lowercased → [../editable-regions.md § Quick Attribute Reference](../editable-regions.md#quick-attribute-reference).

## The React `EditableRegions` root

`@cloudcannon/editable-regions/react` exports `EditableRegions`, which connects in `useEffect`. When and where to use it is in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

## Markup in JSX

Components emit region attributes and `editable-*` custom elements as plain JSX. A `data-prop` value is any string expression: a literal, or a template literal when the path takes a loop index, as when binding fields by index ([../visual-editing-reference.md § Don't mix array items with non-array siblings](../visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings)).

```tsx
<h1 data-editable="text" data-type="span" data-prop="title">
  {page.data.title}
</h1>

<editable-component data-component="call-to-action" data-prop="@data[cta]">
  <CallToAction {...cta} />
</editable-component>

{footer.sections.map((section, i) => (
  <h3 key={i} data-editable="text" data-prop={`@data[footer].sections.${i}.title`}>
    {section.title}
  </h3>
))}
```

Importing `@cloudcannon/editable-regions/react` anywhere in the site brings in the JSX types for the `editable-*` custom elements. They need no setup.

## Text editing

Pass an HTML string, such as rendered markdown, to a rich text region through `dangerouslySetInnerHTML` on the region host itself:

```tsx
<div
  data-editable="text"
  data-type="block"
  data-prop="@content"
  dangerouslySetInnerHTML={{ __html: page.html }}
/>
```

Use a `<p>` host with `data-type="text"` for inline markdown, and a `<div>` for `data-type="block"` and `@content`.

## Array blueprints

**MUST:** render `<template>` blueprints with `dangerouslySetInnerHTML`, never as JSX children, wherever React renders the `<template>` in the browser — in a hydrated or client-rendered component.
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
