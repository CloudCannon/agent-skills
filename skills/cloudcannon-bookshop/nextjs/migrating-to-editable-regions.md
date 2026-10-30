# Migrating to editable regions (Next.js)

Next.js's delta from [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md), which owns the step order, the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

## What each step means in Next.js

| Step in the base file                   | Next.js work                                                                                                                                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                | Delete `.next/` and `out/` before each build; compare the HTML in `out/`. A build script that runs `next export` fails from Next 14 — set `output: "export"` in the Next config and drop `next export` before the baseline                                |
| Structures                              | The library root to copy into the scratch directory is `component-library/`. The generated structure carries `id_key: _bookshop_name`; leave it out, since the rename makes `_type` the key                                                               |
| Rename, resolve and dispatch — one step | Rename `_bookshop_name` to `_type`, build the [component map](#replace-the-lookup-with-a-component-map), and [give each component its fields as props](#components-take-the-block-as-props). No `data-editable` attributes yet                            |
| Remove Bookshop                         | [§ Removing the setup](#removing-the-setup), with the base checklist                                                                                                                                                                                      |
| Add regions                             | Follow [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md), starting with [§ Sites using the React connector](../../cloudcannon-visual-editing/nextjs/visual-editing.md#sites-using-the-react-connector) |

Inside `migrate-to-cloudcannon`, the rest of the site — routes, content loading, the export settings — follows [migrate-to-cloudcannon/nextjs/overview.md](../../migrate-to-cloudcannon/nextjs/overview.md).

## Replace the lookup with a component map

The blocks renderer finds each component by its Bookshop name. Replace the lookup with the `blockMap` and `Blocks` renderer in [migrate-to-cloudcannon/nextjs/page-building.md § The block map](../../migrate-to-cloudcannon/nextjs/page-building.md#the-block-map), keyed by the same names.

- **Key** the map by the full Bookshop name, slashes included: `"home/hero"`, `"global/counter"`. Each key is a flat string; the map has no nesting.
- **List** every name in use: `grep -rhoE '_bookshop_name: *[^ ]+' --exclude-dir=node_modules . | sort -u`, plus every component with a structure value. A name content uses with no structure is still a key.
- **Import** each component directly. The map replaces the glob import, so remove the glob loader (`import-glob-keyed` or similar) from `package.json` and its rule from the Next config's `webpack` function. Remove the function once it is empty.
- **Throw** on an unknown `_type`, as the `Blocks` renderer does. A renderer that skips missing components hides a missed rename.

```js
import HomeHero from "../components/home/hero";
import GlobalCounter from "../components/global/counter";

// Keys are the `_type` values in content_blocks.
export const blockMap = {
  "home/hero": HomeHero,
  "global/counter": GlobalCounter,
};
```

Where the map file goes is in [cloudcannon-visual-editing/nextjs/visual-editing.md § Setup steps](../../cloudcannon-visual-editing/nextjs/visual-editing.md#setup-steps).

## Components take the block as props

**MUST:** give each block component its fields as top-level props, and render it with `<Block {...block} />`.
**Why:** the editor re-renders a registered component with the array item as its props. A component that reads a wrapped `block` prop gets `undefined` there and throws on its first field.

| Component signature        | Change                                                               |
| -------------------------- | -------------------------------------------------------------------- |
| `({ block, dataBinding })` | `({ dataBinding, ...block })` — the body keeps reading `block.title` |
| `({ block })`              | `(block)`                                                            |
| `({ title, image, … })`    | None                                                                 |

Until step 5 removes the connector setup, the renderer keeps passing `dataBinding` beside the spread fields, so the built HTML still matches the baseline:

```jsx
<Block {...block} dataBinding={`#content_blocks.${index}`} />
```

A component that also takes props the renderer computed (an index, the page) gets them from region attributes instead — see the base file's [§ What Bookshop did that you now do explicitly](../migrating-to-editable-regions.md#what-bookshop-did-that-you-now-do-explicitly).

## Renaming `_bookshop_name`

The base rule applies: rename the key to `_type` and keep the value. In Next.js the renderer, the component map and the content are all site code and files, so the rename is one search and replace:

- [ ] Rename the key in every content file, schema file and structure value.
- [ ] Rename it in components that read it, such as a nested button choosing its variant.
- [ ] Change the renderer's lookup to `blockMap[block._type]` in the same change.
- [ ] Run `grep -rn _bookshop_name --exclude-dir=node_modules .` and expect no matches.

## Removing the setup

The base checklist applies. On a Next.js site:

- [ ] Remove `npx @bookshop/generate` from `.cloudcannon/postbuild`, then move the hook's other steps per [build-commands.md § `.cloudcannon/` hook files](../../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files).
- [ ] Delete `component-library/` once every `*.bookshop.yml` has its structure value. It holds nothing else.
- [ ] Remove the glob loader and its `webpack` rule, if the map step hasn't.
- [ ] Leave `@cloudcannon/react-connector` and `data-cms-bind` for step 5; the connector section removes the connector and settles each binding.
