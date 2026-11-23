# Visual Editing Reference (Vue)

Vue rules for any SSG, on top of [../visual-editing-reference.md](../visual-editing-reference.md) and its [§ React, Vue and Svelte components](../visual-editing-reference.md#react-vue-and-svelte-components). Read a section when a link sends you here.

## Registering a Vue component

Register each top-level Vue component with `registerVueComponent(key, component)` from `@cloudcannon/editable-regions/vue`:

```typescript
import { registerVueComponent } from "@cloudcannon/editable-regions/vue";
import Testimonial from "@/components/Testimonial.vue";

registerVueComponent("testimonial", Testimonial);
```

## Registered component values are objects

**MUST:** bind a registered Vue component's region to an object.
**Why:** the value becomes the component's props, so a string or an array arrives as index-keyed props (`{ 0: …, 1: … }`) and every declared prop is `undefined`.

For a string or array field, bind it with `data-prop-<name>="<field>"` in place of `data-prop`; it arrives as `{ <name>: value }`:

```vue
<editable-component data-component="author-card" data-prop-author="author">
  <AuthorCard :author="page.author" />
</editable-component>
```

The name is lowercased → [../editable-regions.md § Quick Attribute Reference](../editable-regions.md#quick-attribute-reference).

## The Vue `EditableRegions` root

`@cloudcannon/editable-regions/vue` exports `EditableRegions`, which connects in `onMounted`. When and where to use it is in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).

## Markup in templates

Components emit region attributes and `editable-*` custom elements as plain template markup. Bind a `data-prop` that takes a loop index with `:data-prop`, as when binding fields by index ([../visual-editing-reference.md § Don't mix array items with non-array siblings](../visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings)):

```vue
<h1 data-editable="text" data-type="span" data-prop="title">{{ page.title }}</h1>

<editable-component data-component="call-to-action" data-prop="@data[cta]">
  <CallToAction v-bind="cta" />
</editable-component>

<h3
  v-for="(section, i) in footer.sections"
  :key="i"
  data-editable="text"
  :data-prop="`@data[footer].sections.${i}.title`"
>
  {{ section.title }}
</h3>
```

**MUST:** tell the Vue compiler that tags starting with `editable-` are custom elements, through `compilerOptions.isCustomElement`.
**Why:** without it, Vue drops every `editable-*` element and its contents from the rendered HTML, leaving an empty `<!---->` comment. The SSG's Vue setup says where the option goes.

## Text editing

Pass an HTML string, such as rendered markdown, to a rich text region through `v-html` on the region host itself:

```vue
<div data-editable="text" data-type="block" data-prop="@content" v-html="page.html" />
```

Use a `<p>` host with `data-type="text"` for inline markdown, and a `<div>` for `data-type="block"` and `@content`.
