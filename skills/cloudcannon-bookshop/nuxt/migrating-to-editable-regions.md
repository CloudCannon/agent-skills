# Migrating to editable regions (Nuxt)

Nuxt's delta from [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md), which owns the step order, the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

## What each step means in Nuxt

| Step in the base file                   | Nuxt work                                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                | Delete `.nuxt/`, `.output/` and `dist` before each build, and build with `nuxt generate`; compare the HTML in `.output/public`                                                                                                                                      |
| Structures                              | The library root to copy into the scratch directory is `component-library/`. The generated structure carries `id_key: _bookshop_name`; leave it out, since the rename makes `_type` the key                                                                         |
| Rename, resolve and dispatch — one step | Rename `_bookshop_name` to `_type`, build the [component map](#replace-the-lookup-with-a-component-map), and [give each component its fields as props](#components-take-the-block-as-props). No `data-editable` attributes yet                                      |
| Remove Bookshop                         | [§ Removing the setup](#removing-the-setup), with the base checklist                                                                                                                                                                                                |
| Add regions                             | Follow [cloudcannon-visual-editing/nuxt/overview.md](../../cloudcannon-visual-editing/nuxt/overview.md), starting with [§ Sites using the visual editor connector](../../cloudcannon-visual-editing/nuxt/visual-editing.md#sites-using-the-visual-editor-connector) |

Inside `migrate-to-cloudcannon`, the rest of the site — pages, content loading, the static build — follows [migrate-to-cloudcannon/nuxt/overview.md](../../migrate-to-cloudcannon/nuxt/overview.md).

## Replace the lookup with a component map

The blocks loop turns each Bookshop name into a global component name. Replace the lookup with the `blockMap` and `Blocks` renderer in [migrate-to-cloudcannon/nuxt/page-building.md § The block map](../../migrate-to-cloudcannon/nuxt/page-building.md#the-block-map), keyed by the same names.

- **Key** the map by the full Bookshop name, slashes included: `"home/hero"`, `"general/counter"`. Each key is a flat string; the map has no nesting.
- **List** every name in use: `grep -rhoE '_bookshop_name: *[^ ]+' --exclude-dir=node_modules . | sort -u`, plus every component with a structure value. A name content uses with no structure is still a key.
- **Import** each component directly. The map replaces the name transform, so delete the function that turns `home/hero` into `HomeHero`.
- **Throw** on an unknown `_type`, as the `Blocks` renderer does. A loop that skips missing components hides a missed rename.

```ts
import HomeHero from "../components/home/hero/hero.vue";
import GeneralCounter from "../components/general/counter/counter.vue";

// Keys are the `_type` values in content_blocks.
export const blockMap = {
  "home/hero": HomeHero,
  "general/counter": GeneralCounter,
};
```

Where the map file goes is in [cloudcannon-visual-editing/nuxt/visual-editing.md § Setup steps](../../cloudcannon-visual-editing/nuxt/visual-editing.md#setup-steps).

## Components take the block as props

**MUST:** give each block component its fields as top-level props, and render it with `<component :is="…" v-bind="block" />`.
**Why:** the editor re-renders a registered component with the array item as its props. A component that reads a wrapped `block` prop gets `undefined` there and throws on its first field.

| Component props                   | Change                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `props: ["block", "dataBinding"]` | Declare each field as a prop, and read `title` in place of `block.title` in the template |
| `props: ["block"]`                | The same                                                                                 |
| One prop per field                | None                                                                                     |

Until step 5 removes the connector setup, the loop keeps passing `dataBinding` beside the spread fields, so the built HTML still matches the baseline:

```vue
<component :is="blockMap[block._type]" v-bind="block" :data-binding="`#content_blocks.${index}`" />
```

A component that also takes props the loop computed (an index, the page) gets them from region attributes instead — see the base file's [§ What Bookshop did that you now do explicitly](../migrating-to-editable-regions.md#what-bookshop-did-that-you-now-do-explicitly).

## Renaming `_bookshop_name`

The base rule applies: rename the key to `_type` and keep the value. In Nuxt the loop, the component map and the content are all site code and files, so the rename is one search and replace:

- [ ] Rename the key in every content file, schema file and structure value.
- [ ] Rename it in components that read it, such as a nested button choosing its variant.
- [ ] Change the loop's lookup to `blockMap[block._type]` in the same change.
- [ ] Run `grep -rn _bookshop_name --exclude-dir=node_modules .` and expect no matches.

## Removing the setup

The base checklist applies. On a Nuxt site:

- [ ] Remove `npx @bookshop/generate` from `.cloudcannon/postbuild`, then move the hook's other steps per [build-commands.md § `.cloudcannon/` hook files](../../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files).
- [ ] Delete `component-library/` once every `*.bookshop.yml` has its structure value. It holds nothing else.
- [ ] Leave `@cloudcannon/visual-editor-connector` and `data-cms-bind` for step 5; the connector section removes the connector and settles each binding.
