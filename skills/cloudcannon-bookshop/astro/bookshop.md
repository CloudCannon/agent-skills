# Bookshop in Astro

Astro's delta from [../bookshop.md](../bookshop.md), which owns the concepts. Read that first.

## Where things live

| Piece        | Location                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Library root | `src/` — the parent of `src/bookshop/`                                                         |
| Config       | `src/bookshop/bookshop.config.cjs`, naming `@bookshop/astro-engine`                            |
| Components   | `src/components/<path>/<name>/<name>.{astro,jsx,tsx}` with `<name>.bookshop.yml` beside it     |
| Dispatchers  | `src/shared/astro/` — site code, not Bookshop's (see [§ Dispatchers](#dispatchers))            |
| Integration  | `bookshop()` from `@bookshop/astro-bookshop` in `astro.config.mjs` `integrations`              |
| Packages     | `@bookshop/astro-bookshop`, `@bookshop/astro-engine`, `@bookshop/generate` — one exact version |

## What the integration does

`bookshop()` is more than a live-editing switch. While it is installed it:

- **Rewrites every component** under `src/components`, `src/layouts` and `src/pages` through a Vite plugin, adding binding data to props and output. Built HTML carries attributes and comments that aren't in source.
- **Defines `ENV_BOOKSHOP_LIVE`** — `false` in the build, true in the live engine.
- **Auto-imports** every `src/components/**` component into Markdown and MDX under its PascalCase name, so MDX can use components it never imports.

## `bookshop:live`

A `bookshop:live` attribute on a component call in an `.astro` file makes that call live-editable:

```astro
<Page bookshop:live contentBlocks={props.content_blocks} />
<HeroBlock bookshop:live heroBlock={props.hero_block} />
```

The component must live under `src/components/` or `src/shared/astro/`. `bookshop:binding={false}` on a call turns off its click-to-edit binding.

## Dispatchers

Bookshop has no Astro dispatcher of its own. Bookshop Astro sites ship one in `src/shared/astro/`, usually `page.{astro,jsx}`, that globs the components and selects on `_bookshop_name`:

```astro
---
const components = {};
const imports = import.meta.glob("../../components/**/*.{jsx,astro}", { eager: true });
Object.entries(imports).forEach(([path, obj]) => {
  const parts = path.replace("../../components/", "").split(".")[0].split("/");
  if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) parts.pop();
  components[parts.join("/")] = obj.default;
});
---
{contentBlocks.map((block, i) => {
  const Component = components[block._bookshop_name];
  return <Component {...block} key={i} />;
})}
```

The key is Bookshop's naming rule — the path without the extension, with a repeated last segment collapsed. A single-component slot (`hero_block`) often has its own dispatcher of the same shape. Components that render nested components (buttons) often repeat the lookup inside, reading `_bookshop_name` in component code.

## Live editing in Astro

The live engine runs Astro's renderer in the browser, with the library only.

| Limit                                                                                                                                | Work around it                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Only `astro:content`, `astro:assets`, `astro:i18n`, `astro:actions`, `astro:middleware`, `astro:env` and `astro:transitions` resolve | Branch on `ENV_BOOKSHOP_LIVE` for anything else    |
| Collections come from CloudCannon's data; an entry's body and `render()` are unavailable                                             | Branch on `ENV_BOOKSHOP_LIVE`                      |
| Config is read from `astro.config.mjs` only — any other filename is ignored                                                          | Keep the config in `astro.config.mjs`              |
| React is the only framework renderer                                                                                                 | Vue, Svelte and Solid components can't live-render |
| Only `PUBLIC_*` environment variables                                                                                                | —                                                  |

## Adding a component

`@bookshop/init` has no Astro template. Create `src/components/<path>/<name>/<name>.astro` and `<name>.bookshop.yml` by hand, or with the site's own script if it ships one (`npm run new-component`). Then follow [../maintaining.md § Adding a component](../maintaining.md#adding-a-component). The glob dispatcher picks the component up without a change.

## Versions

Astro 5.8.1 and later need Bookshop 3.16.2 or later for live editing.
