# Snippets (Next.js) — entry point

> **Coverage: Partial.** Static export (`output: "export"`) with the App Router only.

Next.js-specific snippet guidance: MDX components in the Content Editor. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## Which path the site is on

| Content is…                                            | Snippet work                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.md` rendered to HTML (markdown-it, remark), no MDX   | Root guidance only — raw HTML snippets per [../snippets.md](../snippets.md#raw-snippets-for-inline-html-in-md-files), including the renderer check |
| `.mdx` compiled by `@next/mdx`                         | [§ `@next/mdx`](#nextmdx), then [§ Components to snippets](#components-to-snippets)                                                                |
| `.mdx` strings rendered by `next-mdx-remote`           | [§ `next-mdx-remote`](#next-mdx-remote), then [§ Components to snippets](#components-to-snippets)                                                  |
| MDX compiled by a content layer (contentlayer, velite) | [§ Content layers](#content-layers), then [§ Components to snippets](#components-to-snippets)                                                      |

Find the path in `package.json` dependencies and `next.config.*` (`createMDX` means `@next/mdx`).

## Goal of the SSG layer

Apply [../snippets.md § No imports in content, one shared components map](../snippets.md#no-imports-in-content-one-shared-components-map). The sections below give the shared place for each MDX setup.

## `@next/mdx`

`mdx-components.tsx` is the auto-import: every component in the map returned by `useMDXComponents` is available in every MDX file the plugin compiles. The App Router requires the file, in the project root or in `src/` if the app lives there.

- [ ] Add each component used in content to the `components` object in `mdx-components.tsx`
- [ ] Delete the `import` lines from every `.mdx` content file
- [ ] Run `next build`; a missing entry fails the build with `Expected component X to be defined`

```tsx
// mdx-components.tsx
import type { MDXComponents } from "mdx/types";
import Callout from "@/components/Callout";
import YouTube from "@/components/YouTube";

const components: MDXComponents = { Callout, YouTube };

export function useMDXComponents(): MDXComponents {
  return components;
}
```

Keys that are HTML element names (`h1`, `img`, `a`) restyle markdown output. They are not snippets.

Under webpack (`next build --webpack`), `@next/mdx` compiles only `.mdx` unless `createMDX({ extension: /\.(md|mdx)$/ })` is set. With it, `.md` files are MDX too, and component tags in them need snippets like any `.mdx` file.

**MUST:** add `remark-frontmatter` and `remark-mdx-frontmatter` to `createMDX({ options })` when any MDX file has front matter.
**Why:** `@next/mdx` parses no front matter by default, so a front matter block renders as page text.

Next 16 builds with Turbopack by default, which takes plugins only by name, as strings:

```js
// next.config.mjs
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-mdx-frontmatter"],
  },
});
```

Data in `export const metadata = {…}` is code in the body, not a field editors can edit. Move it into front matter when editors need to change it.

## `next-mdx-remote`

`next-mdx-remote` content can't `import`: it removes `import` and `export` lines before compiling, so components come only from the `components` prop. Follow [../snippets.md § No imports in content, one shared components map](../snippets.md#no-imports-in-content-one-shared-components-map) with one map passed at every `<MDXRemote>` and `compileMDX()` call:

```ts
// app/components/mdx-components.ts
import Callout from "./Callout";
import YouTube from "./YouTube";

export const mdxComponents = { Callout, YouTube };
```

```tsx
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/app/components/mdx-components";

<MDXRemote source={page.body} components={mdxComponents} />;
```

List every call site with `rg 'MDXRemote|compileMDX\(' app src` and check each passes `mdxComponents`.

- **Pass** `options: { parseFrontmatter: true }` when the `source` string still has its front matter. Without it, the front matter block renders as page content.
- **Expect** `{expression}` props to disappear. From v6, `blockJS` defaults to `true` and strips every `{…}` expression and `{…}` attribute value from the source, so `<Chart data={[1, 2]} />` renders with no `data`. String props survive. Prefer moving the expression into the component over setting `blockJS: false`.

## Content layers

contentlayer and velite compile MDX at build time. The compiled MDX renders through a component that takes a `components` prop; pass it the one shared map at every render site, as in [§ `next-mdx-remote`](#next-mdx-remote).

## Components to snippets

Every component tag in content needs a `_snippets` entry or a source-and-data-only file — see [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for).

React components need no hydration directive in content: interactive components carry `"use client"` in their own file. So the content syntax is plain JSX, and the built-in templates fit — see [../template-based.md § MDX templates](../template-based.md#mdx-templates).

| Content shape                             | Configure with                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Self-closing, string props                | `mdx_component`                                                                                                           |
| Wraps content                             | `mdx_paired_component`                                                                                                    |
| `{expression}` props, non-standard syntax | Move the expression into the component, or a raw snippet — see [../raw.md](../raw.md)                                     |
| Nested tree (`<Tabs><Tab>…</Tab></Tabs>`) | One raw snippet with the `repeating` parser — see [../raw.md](../raw.md#repeating--repeat-a-child-pattern-as-array-items) |

List the component names content uses with [../snippets.md § Component inventory grep](../snippets.md#component-inventory-grep). Include `.md` files when `@next/mdx` compiles them.

## Verification

- [ ] Every name from the grep has a `_snippets` entry, or its file is limited to source and data editing with the reason recorded
- [ ] No `^import ` line remains in any MDX content file
- [ ] Every `<MDXRemote>`, `compileMDX()` and content-layer render site passes the shared map
- [ ] `snippet: true` is in `_editables.content` — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] `next build` passes
- [ ] One content file per snippet type opened in the Content Editor, edited and saved; the diff touches only the edited value
