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

`@cloudcannon/editable-regions/svelte` exports `EditableRegions`, which connects in `onMount`. When and where to use it is in [../visual-editing-reference.md § Whole-page framework sites](../visual-editing-reference.md#whole-page-framework-sites--the-editableregions-root).
