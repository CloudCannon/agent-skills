# Bookshop in SvelteKit

SvelteKit's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece          | Location                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Library root   | A folder at the repository root, usually `component-library/`, the parent of `bookshop/`                                 |
| Config         | `component-library/bookshop/bookshop.config.js` (or `.cjs`), naming `@bookshop/svelte-engine`                            |
| Components     | `component-library/components/<path>/<name>/<name>.svelte` with `<name>.bookshop.yml` beside it                          |
| Shared helpers | `component-library/shared/svelte/<name>.svelte`, usually `page.svelte`                                                   |
| Alias          | `$bookshop` → the library root, in `vite.config.js` `resolve.alias` or `svelte.config.js` `kit.alias`                    |
| Packages       | `@bookshop/sveltekit-bookshop`, `@bookshop/svelte-engine`, `@bookshop/generate`, `@bookshop/browser` — one exact version |
| Connector      | `@cloudcannon/svelte-connector`, called from each page that renders blocks                                               |

## The `<Bookshop>` component

`<Bookshop>` from `@bookshop/sveltekit-bookshop` imports every `.svelte` file under `$bookshop` with an eager glob, and renders one of them with the remaining props:

| Call                                            | Renders                                    |
| ----------------------------------------------- | ------------------------------------------ |
| `<Bookshop {...block} />`                       | The component `block._bookshop_name` names |
| `<Bookshop component="home/hero" {...props} />` | That component                             |
| `<Bookshop shared="page" content_blocks={…} />` | `shared/svelte/page.svelte`                |

A name resolves to `components/<name>/<last segment>.svelte`, so `home/hero` is `components/home/hero/hero.svelte`. Every component sits in a folder of its own name.

The usual `shared/svelte/page.svelte` loops over `content_blocks` and renders `<Bookshop {...block} />` for each block, so each component gets the block's fields as props.

## Live editing in SvelteKit

A page that renders blocks keeps a local copy of its data, and replaces it from the editor:

```svelte
<script>
  import { onDestroy, onMount } from "svelte";
  import { Bookshop, trackBookshopLiveData } from "@bookshop/sveltekit-bookshop";
  import { onCloudCannonChanges, stopCloudCannonChanges } from "@cloudcannon/svelte-connector";

  export let data;
  let pageDetails = data.data;

  onMount(() => onCloudCannonChanges((newProps) => (pageDetails = trackBookshopLiveData(newProps))));
  onDestroy(() => stopCloudCannonChanges());
</script>

<Bookshop shared="page" content_blocks={pageDetails.content_blocks} />
```

- **The whole page re-renders** from the new data, in the site's own bundle. Every component and helper the page renders is available, not only the library.
- **`trackBookshopLiveData`** wraps the data so each value knows its path. `<Bookshop>` reads those paths in the editor and sets `data-cms-bind` on each block's elements.
- **Logic between the data and `<Bookshop>`** in the page's `<script>` runs again on every edit, since the page re-renders.

## Adding a component

Create `component-library/components/<path>/<name>/<name>.svelte` and `<name>.bookshop.yml` by hand, or with the site's own script if it ships one. Then follow [../maintaining.md § Adding a component](../maintaining.md#adding-a-component). `<Bookshop>` picks the component up without a change.
