# Snippets (Next.js) — entry point

Next.js-specific snippet guidance: MDX components in the Content Editor. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## Which path the site is on

| Content is…                                                                               | Snippet work                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.md` rendered to HTML (markdown-it, remark), no MDX                                      | Root guidance only — raw HTML snippets per [../snippets.md](../snippets.md#raw-snippets-for-inline-html-in-md-files), including the renderer check |
| `.mdx` compiled by `@next/mdx`                                                            | [§ `@next/mdx`](#nextmdx), then [§ Components to snippets](#components-to-snippets)                                                                |
| `.mdx` strings rendered by `next-mdx-remote`                                              | [§ `next-mdx-remote`](#next-mdx-remote), then [§ Components to snippets](#components-to-snippets)                                                  |
| MDX compiled by a content layer (contentlayer, velite, content-collections, Fumadocs MDX) | [§ Content layers](#content-layers), then [§ Components to snippets](#components-to-snippets)                                                      |

Find the path in `package.json` dependencies and `next.config.*` (`createMDX` means `@next/mdx`). Then find the router: an `app/` directory means the App Router, a `pages/` directory the Pages Router. Both can exist in one site.

## Goal of the SSG layer

Apply [../snippets.md § No imports in content, one shared components map](../snippets.md#no-imports-in-content-one-shared-components-map). The sections below give the shared place for each MDX setup.

## `@next/mdx`

`mdx-components.tsx` is the auto-import: every component in the map returned by `useMDXComponents` is available in every MDX file the plugin compiles, in either router. It sits in the project root, beside `app/` or `pages/`, or in `src/` if the app lives there. The App Router requires the file.

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

`@next/mdx` compiles only `.mdx` files by default. With webpack — `next build --webpack`, or Next before 16 — `createMDX({ extension: /\.(md|mdx)$/ })` adds `.md`: those files are MDX too, and component tags in them need snippets like any `.mdx` file.

**MUST:** add `remark-frontmatter` and `remark-mdx-frontmatter` to `createMDX({ options })` when any MDX file has front matter.
**Why:** `@next/mdx` parses no front matter by default, so a front matter block renders as page text.

When `next build` uses Turbopack — the default from Next 16 — `@next/mdx` takes plugins only by name, as strings:

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

`next-mdx-remote` content can't `import`: it removes `import` and `export` lines before compiling, so components come only from the `components` prop. Follow [../snippets.md § No imports in content, one shared components map](../snippets.md#no-imports-in-content-one-shared-components-map) with one map passed at every `<MDXRemote>` and `compileMDX()` call.

Each router uses a different API from the same package. The Pages Router API is in every version; `next-mdx-remote/rsc` arrives in 4.3. Version 4 supports React 18 at most, so a site on React 19 needs 5 or later.

| Router       | Compile                                                                                  | Render                                                                         |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| App Router   | Inside `<MDXRemote>` or `compileMDX()` from `next-mdx-remote/rsc`, in a server component | The same call                                                                  |
| Pages Router | `serialize()` from `next-mdx-remote/serialize`, in `getStaticProps`                      | `<MDXRemote {...source} components={…} />` from `next-mdx-remote`, in the page |

App Router:

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

Pages Router:

```jsx
import { serialize } from "next-mdx-remote/serialize";
import { MDXRemote } from "next-mdx-remote";
import { mdxComponents } from "../../components/mdx-components";

export default function Post({ source }) {
  return <MDXRemote {...source} components={mdxComponents} />;
}

export async function getStaticProps({ params }) {
  const source = await serialize(readPost(params.slug), { parseFrontmatter: true });
  return { props: { source } };
}
```

To make the body a Visual Editor region, render `<MDXRemote>` inside it — see [cloudcannon-visual-editing/nextjs/visual-editing-reference.md § MDX bodies](../../cloudcannon-visual-editing/nextjs/visual-editing-reference.md#mdx-bodies).

In the Pages Router, a `<MDXProvider components={mdxComponents}>` from `@mdx-js/react` in `pages/_app.*` also supplies components to every `<MDXRemote>`. Either way, one map serves every render site.

List every call site with `rg 'MDXRemote|compileMDX\(|serialize\(' app pages src` and check each `<MDXRemote>` and `compileMDX()` passes `mdxComponents`, or sits under the `MDXProvider`.

- **Pass** `parseFrontmatter: true` when the `source` string still has its front matter: in `options` for the App Router, in the `serialize()` options for the Pages Router. Without it, the front matter block renders as page content.
- **Expect** `{expression}` props to disappear. From v6, `blockJS` defaults to `true` in `serialize()` and `compileMDX()` and strips every `{…}` expression and `{…}` attribute value from the source, so `<Chart data={[1, 2]} />` renders with no `data`. String props survive. Prefer moving the expression into the component over setting `blockJS: false`.

## Content layers

contentlayer, velite, content-collections and Fumadocs MDX compile MDX at build time. The compiled MDX renders through a component that takes a `components` prop; pass it the one shared map at every render site, as in [§ `next-mdx-remote`](#next-mdx-remote).

## Components to snippets

Every component tag in content needs a `_snippets` entry or a source-and-data-only file — see [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for).

React components need no hydration directive in content: interactive components carry `"use client"` in their own file. So the content syntax is plain JSX, and the built-in templates fit — see [../template-based.md § MDX templates](../template-based.md#mdx-templates).

| Content shape                                     | Configure with                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Self-closing, string props                        | `mdx_component`                                                                                                                             |
| Wraps content                                     | `mdx_paired_component`                                                                                                                      |
| Array-of-objects prop (`images={[{ src: "…" }]}`) | `mdx_component` with a `type: array` arg — see [../template-based.md § Array-of-objects props](../template-based.md#array-of-objects-props) |
| Other `{expression}` props, non-standard syntax   | Move the expression into the component, or a raw snippet — see [../raw.md](../raw.md)                                                       |
| Nested tree (`<Tabs><Tab>…</Tab></Tabs>`)         | One raw snippet with the `repeating` parser — see [../raw.md](../raw.md#repeating--repeat-a-child-pattern-as-array-items)                   |

List the component names content uses with [../snippets.md § Component inventory grep](../snippets.md#component-inventory-grep). Include `.md` files when `@next/mdx` compiles them.

## Verification

- [ ] Every name from the grep has a `_snippets` entry, or its file is limited to source and data editing with the reason recorded
- [ ] No `^import ` line remains in any MDX content file
- [ ] Every `<MDXRemote>`, `compileMDX()` and content-layer render site passes the shared map, or sits under an `MDXProvider` given it
- [ ] `snippet: true` is in `_editables.content` — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] `next build` passes
- [ ] One content file per snippet type opened in the Content Editor, edited and saved; the diff touches only the edited value
