# Visual Editing Reference (Vue)

Vue rules for any SSG, on top of [../visual-editing-reference.md](../visual-editing-reference.md) and its [§ React, Vue and Svelte components](../visual-editing-reference.md#react-vue-and-svelte-components).

## Registering a Vue component

Register each top-level Vue component with `registerVueComponent(key, component)` from `@cloudcannon/editable-regions/vue`:

```typescript
import { registerVueComponent } from "@cloudcannon/editable-regions/vue";
import Testimonial from "@/components/Testimonial.vue";

registerVueComponent("testimonial", Testimonial);
```

## The Vue `EditableRegions` root

`@cloudcannon/editable-regions/vue` exports `EditableRegions`, which connects in `onMounted`. When and where to use it is in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).
