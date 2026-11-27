# Migrating to editable regions (SvelteKit)

SvelteKit's delta from [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md), which owns the step order, the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

## What each step means in SvelteKit

| Step in the base file                   | SvelteKit work                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                | Delete `.svelte-kit/` and `build/` before each build; compare the HTML in `build/`                                                                                                                                           |
| Structures                              | The library root to copy into the scratch directory is `component-library/`. The generated structure carries `id_key: _bookshop_name`; leave it out, since the rename makes `_type` the key                                  |
| Rename, resolve and dispatch — one step | Nothing moves. Rename `_bookshop_name` to `_type`, build the [component map](#keep-bookshops-names-in-a-component-map), and [replace each `<Bookshop>` call](#replace-the-bookshop-calls). No `data-editable` attributes yet |
| Remove Bookshop                         | [§ Removing the setup](#removing-the-setup), with the base checklist                                                                                                                                                         |
| Add regions                             | Follow [cloudcannon-visual-editing/sveltekit/overview.md](../../cloudcannon-visual-editing/sveltekit/overview.md)                                                                                                            |

Inside `migrate-to-cloudcannon`, the rest of the site — content loading, the static build — follows [migrate-to-cloudcannon/sveltekit/overview.md](../../migrate-to-cloudcannon/sveltekit/overview.md).

## Keep Bookshop's names in a component map

**MUST:** key the map with Bookshop's naming rule, so every `_type` value in content still resolves.
**Why:** content stores `home/hero`, not a new key. Reusing the rule means no content value changes.

```js
// src/lib/cloudcannon/blockMap.js — shared by the build and the editor
const modules = import.meta.glob("/component-library/components/**/*.svelte", { eager: true });

function byBookshopName(modules) {
  const map = {};
  for (const [path, module] of Object.entries(modules)) {
    const parts = path
      .replace("/component-library/components/", "")
      .replace(/\.svelte$/, "")
      .split("/");
    const n = parts.length;
    if (n < 2 || parts[n - 1] !== parts[n - 2]) continue; // helpers, not components
    parts.pop();
    map[parts.join("/")] = module.default;
  }
  return map;
}

// Keys are the `_type` values in content_blocks.
export const blockMap = byBookshopName(modules);
```

`src/lib/cloudcannon/componentMap.js` spreads `blockMap` into itself — see [cloudcannon-visual-editing/sveltekit/visual-editing-reference.md § Registered components](../../cloudcannon-visual-editing/sveltekit/visual-editing-reference.md#registered-components).

Point the glob at the site's library folder. Where the map is registered is in [cloudcannon-visual-editing/sveltekit/visual-editing.md § Setup steps](../../cloudcannon-visual-editing/sveltekit/visual-editing.md#setup-steps).

The eager glob imports every component, and each one's CSS then reaches every page that uses the map. Narrow the glob pattern, not the loop, if that weight matters.

## Replace the `<Bookshop>` calls

| Bookshop                                                     | Editable regions                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Bookshop shared="page" content_blocks={…} />`              | The `Blocks` renderer over `blockMap` — [migrate-to-cloudcannon/sveltekit/page-building.md § Blocks](../../migrate-to-cloudcannon/sveltekit/page-building.md#blocks). It throws on an unknown `_type`, so a missed rename fails the build |
| `<Bookshop {...block} />` inside other helpers or components | The component from the map: `<svelte:component this={blockMap[block._type]} {...block} />` on Svelte 3 and 4, a capitalised `{@const}` on Svelte 5                                                                                        |
| `<Bookshop component="home/hero" {...props} />`              | A direct import of that component                                                                                                                                                                                                         |
| `trackBookshopLiveData(…)` around page data                  | The data itself. The page renders straight from `data`                                                                                                                                                                                    |

Each component keeps the block's fields as props, as `<Bookshop>` passed them.

## Removing the setup

At step 4, with the base checklist:

- [ ] Remove `@cloudcannon/svelte-connector` and the connector calls → [cloudcannon-visual-editing/sveltekit/visual-editing.md § Sites using the Svelte connector](../../cloudcannon-visual-editing/sveltekit/visual-editing.md#sites-using-the-svelte-connector).
- [ ] Remove the `$bookshop` alias from `vite.config.js` or `svelte.config.js`, once nothing imports through it.
- [ ] Remove `component-library/bookshop/` and `component-library/shared/svelte/`. The components stay where they are.
- [ ] Remove `@bookshop/browser` and any page that embeds the component browser.

## Parity on SvelteKit

- **Diff** with Bookshop's markup ignored: `data-cms-bind` attributes come only from the editor, and never appear in the built HTML.
- **Expect** component CSS to move when the map's glob imports components a page doesn't render.
