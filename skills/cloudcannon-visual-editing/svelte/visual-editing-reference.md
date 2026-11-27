# Visual Editing Reference (Svelte)

Svelte rules for any SSG, on top of [../visual-editing-reference.md](../visual-editing-reference.md) and its [§ React, Vue and Svelte components](../visual-editing-reference.md#react-vue-and-svelte-components).

## Registering a Svelte component

Register each top-level Svelte component with `registerSvelteComponent(key, component)` from `@cloudcannon/editable-regions/svelte`:

```typescript
import { registerSvelteComponent } from "@cloudcannon/editable-regions/svelte";
import Pricing from "@/components/Pricing.svelte";

registerSvelteComponent("pricing", Pricing);
```

## The Svelte `EditableRegions` root

`@cloudcannon/editable-regions/svelte` exports `EditableRegions`, which connects in `onMount`. It is a component, so element directives such as `class:` and `style:` don't work on it; pass `class` as a prop, which it forwards to its `tag` element with every other extra prop. When and where to use it is in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

## Markup in templates

Components emit region attributes and `editable-*` custom elements as plain template markup. Svelte passes `editable-*` tags through as custom elements, in the server-rendered HTML and after hydration, with no compiler option. Put a loop index straight into a `data-prop` string, as when binding fields by index ([../visual-editing-reference.md § Don't mix array items with non-array siblings](../visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings)):

```svelte
<h1 data-editable="text" data-type="span" data-prop="title">{page.title}</h1>

<editable-component data-component="call-to-action" data-prop="@data[cta]">
  <CallToAction {...cta} />
</editable-component>

{#each footer.sections as section, i}
  <h3 data-editable="text" data-prop="@data[footer].sections.{i}.title">{section.title}</h3>
{/each}
```

## Text editing

Pass an HTML string, such as rendered markdown, to a rich text region through `{@html}` inside the region host itself:

```svelte
<div data-editable="text" data-type="block" data-prop="@content">{@html page.html}</div>
```

Use a `<p>` host with `data-type="text"` for inline markdown, and a `<div>` for `data-type="block"` and `@content`.

To make a child component's root element the host, pass the region attributes as props and spread them onto the root. Svelte components don't forward attributes on their own:

```svelte
<!-- Callout.svelte -->
<script>
  let { children, ...attributes } = $props();
</script>

<div class="callout" {...attributes}>{@render children?.()}</div>
```

```svelte
<Callout data-editable="text" data-type="text" data-prop="content">{@html content}</Callout>
```

## Array blueprints

Write a `<template>` blueprint as plain markup in the component. Svelte keeps its children in `template.content`, after hydration, after client-side navigation, and inside a registered component's re-render. When a blueprint is needed is in [../visual-editing-reference.md § When HTML `<template>` blueprints are needed](../visual-editing-reference.md#when-html-template-blueprints-are-needed).

## Context in registered components

**MUST NOT:** read `getContext` in a registered component, or in anything it renders, for a value a parent component sets.
**Why:** the registration function mounts the component on its own, with no parent, so `getContext` returns `undefined` and the re-render throws. Pass the value as a prop instead.
