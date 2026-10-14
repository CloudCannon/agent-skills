# Migrating to editable regions (Astro)

Astro's delta from [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md), which owns the step order, the structure mapping, the `_bookshop_name` rename and the removal checklist. Read that first.

## What each step means in Astro

| Step in the base file                   | Astro work                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline                                | Nothing extra — no version upgrade is needed on Astro 5                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Structures                              | The library root to copy into the scratch directory is `src/`. Split co-located structure files work well: `<name>.cloudcannon.structure-value.yml` beside each component, named after the component's last path segment. Give each `_structures.<key>` its own `values_from_glob`, scoped to its components' directories — one `**` glob over `src/components/` would put buttons in the page builder — see [structures.md](../../cloudcannon-configuration/structures.md) |
| Rename, resolve and dispatch — one step | Nothing moves. Change the lookups only — the region wrappers and `data-*` attributes shown below go in at step 5, after the census. Build a [component map](#keep-bookshops-names-in-a-component-map) with Bookshop's naming rule, and [replace each dispatcher](#replace-the-dispatchers)                                                                                                                                                                                  |
| Remove Bookshop                         | [§ Removing the integration](#removing-the-integration), with the base checklist                                                                                                                                                                                                                                                                                                                                                                                            |
| Add regions                             | Run the setup in [cloudcannon-visual-editing/astro/overview.md](../../cloudcannon-visual-editing/astro/overview.md), then [§ Registering the components](#registering-the-components) and [§ Props the dispatcher computed](#props-the-dispatcher-computed)                                                                                                                                                                                                                 |

## Keep Bookshop's names in a component map

**MUST:** key the map with the dispatcher's own rule, so every `_name` value in content still resolves.
**Why:** content stores `heroes/hero`, not a new key. Reusing the rule means no content value changes.

```ts
// src/cloudcannon/componentMap.ts — shared by the build and the editor
function byBookshopName(modules: Record<string, { default: any }>) {
  const map: Record<string, any> = {};
  for (const [path, module] of Object.entries(modules)) {
    const parts = path
      .replace("../components/", "")
      .replace(/\.\w+$/, "")
      .split("/");
    const n = parts.length;
    if (n < 2 || parts[n - 1] !== parts[n - 2]) continue; // helpers, not components
    parts.pop();
    map[parts.join("/")] = module.default;
  }
  return map;
}

export const astroComponents = byBookshopName(
  import.meta.glob("../components/**/*.astro", { eager: true }),
);
export const reactComponents = byBookshopName(
  import.meta.glob("../components/**/*.jsx", { eager: true }),
);
export const componentMap = { ...astroComponents, ...reactComponents };
```

Glob only the extensions the old dispatcher globbed. Keep the two maps apart for registration — see [§ Registering the components](#registering-the-components).

The eager glob imports every file it matches, and each imported component's CSS then reaches every page that uses the map. Narrow the glob pattern — not the loop — if that weight matters.

## Replace the dispatchers

| Bookshop                                                                   | Editable regions                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Page bookshop:live contentBlocks={…} />` + `src/shared/astro/page.*`     | A loop component with the array regions — [§ The page-builder loop](#the-page-builder-loop)                                                                                                                                                                                  |
| `<HeroBlock bookshop:live heroBlock={…} />` — one slot, several structures | A registered dispatcher — [§ One slot, several structures](#one-slot-several-structures)                                                                                                                                                                                     |
| `<PostHero bookshop:live {...post_hero} />` — one slot, one component      | `<editable-component data-component="blog/post-hero" data-prop="post_hero">` around the call                                                                                                                                                                                 |
| `button._bookshop_name` lookups inside components                          | The same lookup on `_name`. Wrap an array of them in `data-editable="array" data-component-key="_name"` with an `<editable-array-item data-component={button._name}>` per item; wrap a single one in `<editable-component data-component={button._name} data-prop="button">` |
| `ENV_BOOKSHOP_LIVE`                                                        | `ENV_CLIENT` — a bare global, not `import.meta.env.ENV_CLIENT`                                                                                                                                                                                                               |

### The page-builder loop

**MUST:** put the loop in its own component (`src/layouts/ContentBlocks.astro`), not in the layout.
**Why:** a Markdown page that uses the layout through `layout:` front matter — `src/pages/404.md` is common — gets its stylesheet emitted before `<html>` when the layout itself contains the loop's elements. Bookshop hid this, because its dispatcher was a component.

```astro
---
// src/layouts/ContentBlocks.astro
import { componentMap } from "../cloudcannon/componentMap";
const blocks = Astro.props.blocks ?? [];
---
<div data-editable="array" data-prop="content_blocks" data-component-key="_name">
  {blocks.map((block) => {
    const Block = componentMap[block._name];
    if (!Block) throw new Error(`Unknown component: ${block._name}`);
    return (
      <div data-editable="array-item" data-component={block._name}>
        <Block {...block} />
      </div>
    );
  })}
</div>
```

- **Read** props directly (`Astro.props.blocks ?? []`), not by destructuring with a default. While `bookshop()` is still installed at step 3, its rewrite breaks destructured props and the page drops out of the build.
- **Pass** only the block's data. Anything the old dispatcher computed (`key`, `content_blocks_length`) moves into the components → [§ Props the dispatcher computed](#props-the-dispatcher-computed).
- **Use** the element the old dispatcher's parent expected — the layout usually owns `<main>` already.
- **Throw** on an unknown name: a guarded lookup hides a missed rename.

### One slot, several structures

A single object that can be any of several components (`hero_block` from `_structures.hero_blocks`) can't use `data-component={hero_block._name}` — that is fixed at build, so switching the structure in the editor renders the new data through the old component and shows an error card.

**MUST:** register a thin dispatcher and name it instead.

```astro
---
// src/components/BlockRenderer.astro
import { componentMap } from "../cloudcannon/componentMap";
const Component = componentMap[Astro.props._name];
---
{Component && <Component {...Astro.props} />}
```

```astro
<editable-component data-component="block-renderer" data-prop="hero_block">
  <BlockRenderer {...heroBlock} />
</editable-component>
```

## Registering the components

Loop over the maps in `registerComponents.ts`, each with its own function:

| Component type                               | Register with                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `.astro`                                     | `registerAstroComponent(name, component)` from `@cloudcannon/editable-regions/astro`                            |
| `.astro` that renders React (icons, buttons) | The same, plus `import "@cloudcannon/editable-regions/astro-react-renderer"` first                              |
| `.jsx` / `.tsx`                              | `registerReactComponent(name, component)` from `@cloudcannon/editable-regions/react` — keep the blocks as React |

```ts
import { registerAstroComponent } from "@cloudcannon/editable-regions/astro";
import { registerReactComponent } from "@cloudcannon/editable-regions/react";
import { astroComponents, reactComponents } from "./componentMap";

for (const [name, c] of Object.entries(astroComponents)) registerAstroComponent(name, c);
for (const [name, c] of Object.entries(reactComponents)) registerReactComponent(name, c);
```

Register the `block-renderer` dispatcher too, if the site has one. A React block renders from the `.astro` loop with no `client:` directive.

**MUST:** give a React component's region a wrapper around its root — the array-item `<div>` in the loop is one. Never put `data-component` on the React component's own root.
**Why:** `registerReactComponent` renders into a detached element and copies that element's children into the region host, so the host must be outside the component.

## Props the dispatcher computed

Bookshop dispatchers often pass props that aren't in the block's data, such as the item's index or the array's length. The editor re-renders a block from its data alone, so these arrive `undefined` there. Remove the dependency from the component:

| The block used it for                                              | Replace with                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Spacing or styling by position (first, last, alternating)          | `:first-child`, `:last-child`, `:nth-child(even)` in the block CSS |
| A value editors should control (an anchor id, a background choice) | A field in the block's data, with an input                         |

**Only** when the position itself changes the markup (an `<h1>` on the first block only, say), pass it both ways: `index={i}` on the component for the build, and `data-prop-index="@index"` on the array item for the editor. `@length` gives the item count the same way. Name these props in lowercase or snake_case, because `data-prop-*` names are lowercased. Blocks added in the editor don't get them until the next build.

## Removing the integration

Remove `bookshop()` from `astro.config.mjs` at step 4, with the packages. Then:

- [ ] Replace every `ENV_BOOKSHOP_LIVE` with `ENV_CLIENT` — `grep -rn ENV_BOOKSHOP_LIVE src`.
- [ ] Replace the integration's auto-import without adding `import` lines to MDX content — editors see them in the Content Editor. Register the components MDX content uses (`rg '<[A-Z]' -g '*.mdx' src/content`) with `astro-auto-import` before `mdx()`, or pass a shared `components` map at every render site, and delete any `import` lines already in content → [MDX setup pipeline](../../cloudcannon-snippets/astro/overview.md#mdx-setup-pipeline-must-complete-all-four).
- [ ] Remove `src/bookshop/` and `src/shared/astro/`, and any path alias pointing at `src/shared` in `tsconfig.json`. Imports rooted at `baseUrl` (`src/shared/…`) go with them; keep `baseUrl` itself if other imports use it.
- [ ] Check the site's Node version meets `@cloudcannon/editable-regions`' `engines.node` — Bookshop-era sites often pin Node 18. On a hosted site, change it in the site's build settings (or with [cloudcannon-cli](../../cloudcannon-cli/SKILL.md)); `.cloudcannon/initial-site-settings.json` only applies when a site is created.

## Parity on Astro

- **Diff** with Bookshop's markup ignored: `data-cms-bind` attributes and `<!--databinding:…-->` comments exist only in the Bookshop build output.
- **Expect** component CSS to move: Bookshop inlined it on pages using `bookshop:live`; after the migration the same rules are linked, and pages gaining some is expected.
- **Expect** MDX pages to lose the CSS of components the integration auto-imported but the page never renders. Check each lost rule matches nothing on that page; any other lost rule is a regression.
