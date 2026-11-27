# Visual Editing Reference (SvelteKit)

SvelteKit deltas from [../visual-editing-reference.md](../visual-editing-reference.md). Template markup, rich text hosts, blueprints and context follow [../svelte/visual-editing-reference.md](../svelte/visual-editing-reference.md). Read a section when a checklist item in [visual-editing.md](visual-editing.md) links here.

## Registered components

**MUST:** give every registered component, and everything it renders, its data through props. None of them reads data from a `load`, a JSON or module import, a store, or `getContext`.
**Why:** the editor re-renders the component on its own, with the values from the file being edited. Data it reads any other way is the build's copy, so an edit doesn't show; a value from `getContext` is `undefined`, and the re-render throws.

SvelteKit's `$app/state`, `$app/stores`, `$app/navigation`, `$app/environment` and `$app/paths` work in registered components. A `+page.svelte` or `+layout.svelte` is never registered: it gets its data from `load`, so its sections move into components that take props.

Decide each component's treatment in this order, and take the first that fits:

1. **It renders only from its props:** register it; the page passes the data in.
2. **It imports its own data** (a data file, `$lib/config`, a store) **and each field maps straight to an element:** leave it unregistered, and give its fields primitive regions, with `@data[<key>]` paths for data files. A header that imports `data/nav.json` and renders `@data[nav]` regions is the typical case.
3. **It imports its own data and its output is computed:** move the import to the caller, which passes the data as props and wraps the component in `<editable-component data-prop="@data[<key>]">`. Any other prop the caller passes follows [../visual-editing-reference.md § Component prop contract](../visual-editing-reference.md#component-prop-contract).
4. **Its client behaviour fights re-rendering** (autoplay, its own DOM management): register a display-only twin → [../visual-editing-reference.md § Detecting the editor](../visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic), and settle its load-time state → [§ Load-time behaviour](../visual-editing-reference.md#load-time-behaviour-in-the-editor).

Keep the map in `src/lib/cloudcannon/componentMap.js`, keyed by the `data-component` value, with each component imported explicitly. A page builder's `blockMap` lives in its own file, because the page's `Blocks` renderer imports it at the top level and must not pull in the rest of the map:

```js
// src/lib/cloudcannon/blockMap.js
import CtaBlock from "$lib/components/blocks/CtaBlock.svelte";
import FeaturesBlock from "$lib/components/blocks/FeaturesBlock.svelte";
import HeroBlock from "$lib/components/blocks/HeroBlock.svelte";

// Keys are the `_type` values in content_blocks.
export const blockMap = {
  hero: HeroBlock,
  features: FeaturesBlock,
  cta: CtaBlock,
};
```

```js
// src/lib/cloudcannon/componentMap.js
import CallToAction from "$lib/components/CallToAction.svelte";
import { blockMap } from "./blockMap.js";

export const componentMap = {
  ...blockMap,
  "call-to-action": CallToAction,
};
```

## Detecting the editor in SvelteKit

SvelteKit has no `ENV_CLIENT`. Registered components render in the site's own client bundle, so there is no separate editor build to branch on. Use `window.inEditorMode` in `onMount` and `.cms-editor-active` in CSS — see [../editable-regions-internals.md § Detecting the Visual Editor](../editable-regions-internals.md#detecting-the-visual-editor). Never read `window` during render: the build prerenders every page on the server, where it doesn't exist. `browser` from `$app/environment` is `true` in every browser, editor or not.

## Markdown bodies

| The body renders as                                                 | Region                                                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| An mdsvex component (`<data.content />`, `<svelte:component this>`) | `data-editable="text" data-type="block" data-prop="@content"` on the element around the component, with the body's styling class on that element       |
| An HTML string from a markdown parser (`{@html data.html}`)         | The same region on the `{@html}` host — see [../svelte/visual-editing-reference.md § Text editing](../svelte/visual-editing-reference.md#text-editing) |

An mdsvex body that uses Svelte components needs snippets for each one first → [cloudcannon-snippets/sveltekit/overview.md](../../cloudcannon-snippets/sveltekit/overview.md). A body whose components have no snippets stays out of the region.

## Page builder blocks in SvelteKit

Render blocks from the same `blockMap` that `componentMap` spreads in, so a block type can't be rendered without also being registered. The `Blocks` renderer, and why it throws on an unknown `_type`, are in [migrate-to-cloudcannon/sveltekit/page-building.md § Blocks](../../migrate-to-cloudcannon/sveltekit/page-building.md#blocks).

## Source editables in SvelteKit

**MUST NOT:** put source regions in `.svelte` files. CloudCannon doesn't edit Svelte components — see [configuration.md § Route and component files](../../cloudcannon-configuration/sveltekit/configuration.md#route-and-component-files).
