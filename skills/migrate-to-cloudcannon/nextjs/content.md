# Content (Next.js)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Next.js differences: where content files live, the loader that reads them, `[slug]` routes, the Pages Router's data functions, data files and images.

Next.js has no content convention. Editors can only change files, so every value an editor changes ends up in a Markdown or data file read at build time — by a server component in the App Router, by `getStaticProps` in the Pages Router.

## Where files live

| Content                                    | Location                                       | Read by                                          |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------ |
| Entries that build a page (posts, pages)   | `content/<collection>/*.md`, one file per page | The content loader, from a route file            |
| Shared settings (nav, footer, CTA, social) | `data/*.json`                                  | A JSON `import` in the component that renders it |

Keep a site's existing folders when it has them (`posts/`, `_posts/`, `src/content/`). Every path in the CloudCannon config is relative to the repo root.

## The content loader

One module reads every content folder with `node:fs` and parses front matter. Keep the site's loader when it has one, and check it against the rules below.

- **MUST:** call the loader only from route files, layouts and other server components — in the Pages Router, only inside `getStaticProps` and `getStaticPaths`.
  **Why:** a component the Visual Editor re-renders runs in the browser, where `node:fs` doesn't exist — see [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). Route files read the data and pass plain values down as props. Next leaves the imports those two functions use out of the client bundle.
- **Read** relative to `process.cwd()`, which is the project root during `next build`.
- **Name** each entry's slug after its file name, so it matches the `[slug]` placeholder in the collection `url`.
- **Throw** when a requested file is missing, so a renamed file fails the build instead of rendering an empty page.
- **Pass** client components plain values: front matter fields and the rendered body. With `gray-matter`, pass its `data` and `content`, never the whole result.

A loader for a site that has none:

```ts
// lib/content.ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export type Entry = { slug: string; data: Record<string, any>; body: string };

export function getEntries(collection: string): Entry[] {
  const dir = path.join(process.cwd(), "content", collection);
  return readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const raw = readFileSync(path.join(dir, file), "utf8");
      const [, front = "", body = raw] = raw.match(FRONTMATTER) ?? [];
      return {
        slug: file.replace(/\.mdx?$/, ""),
        data: (yaml.load(front) ?? {}) as Record<string, any>,
        body,
      };
    });
}

export function getEntry(collection: string, slug: string): Entry {
  const entry = getEntries(collection).find((e) => e.slug === slug);
  if (!entry) throw new Error(`Missing content/${collection}/${slug}`);
  return entry;
}
```

Render the body with the site's Markdown renderer. A bare key parses to `null`, so components guard on the value — see [../content.md § Null values in YAML](../content.md#null-values-in-yaml).

## `[slug]` routes

A collection that builds one page per file is rendered by a dynamic route that lists every file — in `generateStaticParams` in the App Router, in `getStaticPaths` in the Pages Router ([§ Pages Router data functions](#pages-router-data-functions)):

```tsx
// app/blog/[slug]/page.tsx
import { getEntries, getEntry } from "../../../lib/content";

export function generateStaticParams() {
  return getEntries("blog").map(({ slug }) => ({ slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getEntry("blog", slug);
  // ...
}
```

- **MUST NOT:** return an empty list from `generateStaticParams`, or set `dynamicParams = true`.
  **Why:** either fails `next build` under `output: "export"`. Keep at least one file in every folder a `[slug]` route reads.
- **Replace** one route folder per entry (`app/blog/first-post/page.tsx`) with one `[slug]` route. A new file then builds a page without a developer.
- **Build** every hard-coded route list (sitemap, feeds, search indexes) from the same list `generateStaticParams` uses, so pages editors create appear in it.
- **Match** the param to the file name. When the site builds slugs from a front matter field or strips a date prefix, the collection `url` has to compute the same — see [cloudcannon-configuration/nextjs/collection-urls.md](../../cloudcannon-configuration/nextjs/collection-urls.md).

## Pages Router data functions

A Pages Router route reads content in `getStaticProps`, and a dynamic route lists its pages in `getStaticPaths`. Both run only at build time under export.

```jsx
// pages/blog/[slug].jsx
import { getEntries, getEntry } from "../../lib/content";

export async function getStaticPaths() {
  return {
    paths: getEntries("blog").map(({ slug }) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const { slug, data, body } = getEntry("blog", params.slug);
  return { props: { page: JSON.parse(JSON.stringify({ slug, data, body })) } };
}

export default function Post({ page }) {
  // ...
}
```

- **Set** `fallback: false`. Under `output: "export"`, `fallback: true` or `'blocking'` fails the build with "Found pages with `fallback` enabled".
- **Return** only JSON values from `getStaticProps`. YAML dates parse to `Date` objects, which fail the build with ``Error serializing `.page.data.date` returned from `getStaticProps` ``; so does any `undefined` value. The `JSON.parse(JSON.stringify(…))` round trip turns dates into ISO strings and drops `undefined` keys; components that format a date parse the string.
- **Check** the build output for each folder a dynamic route reads. An empty `paths` list builds without error and writes no pages.
- **Keep** a page's props as `page: { data, … }` while `@cloudcannon/react-connector` is installed. The connector replaces `page.data` with the editor's live values; Phase 4 removes it.
- **Set** each page's `<title>` and description from front matter with `next/head`, or the site's SEO component, in the page component.

### `@cloudcannon/filer`

`@cloudcannon/filer` is a build-time loader for folders of Markdown files: `new Filer({ path: "content" })` reads `content/<folder>/`, relative to the working directory, with `gray-matter`, and renders bodies with `markdown-it`. It meets the loader rules in [§ The content loader](#the-content-loader), so a site that uses it can keep it.

| Filer call                                                    | Returns                                                                                                                          | Loader equivalent                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `getItem(file, { folder })`                                   | `{ slug, data, content, content_html }`, or throws on a missing file                                                             | `getEntry`, plus the site's Markdown renderer |
| `listItemSlugs(folder)`                                       | Every file name in the folder, without its extension                                                                             | `getEntries(folder).map(({ slug }) => slug)`  |
| `getItems(folder, { sortKey, sortReverse, filter, excerpt })` | Every file not starting with `_`, sorted descending by `data[sortKey]`; `excerpt` adds `excerpt_html` from the start of the body | `getEntries`, then a sort and filter          |
| `getPaginatedItems(folder, { pagination: { size, page } })`   | One page of `getItems`, with `currentPage`, `lastPage`, `prevPage`, `nextPage` and `total`                                       | A slice of the sorted entries                 |

- **Check** for a `content_html` key in front matter. `getItem` returns it in place of the rendered body.
- **Filter** `listItemSlugs` results the way `getItems` does. It returns `_`-prefixed and non-Markdown files too, so a `getStaticPaths` built from it lists them as pages.
- **Keep** the `JSON.parse(JSON.stringify(…))` round trip around Filer items — `gray-matter` parses YAML dates to `Date` objects.
- **Replace** Filer with the loader above only when the user wants the dependency gone. The front matter, and so the CloudCannon config, stays the same either way.

## Content in route files

Text written into JSX and arrays declared in `page.tsx` move into the page's content file. Follow the census in [audit.md § Classifying static pages](audit.md#classifying-static-pages): sections become `content_blocks` ([page-building.md](page-building.md)), and the route reads the file with `getEntry`.

Strip JSX artifacts from the extracted text: `{" "}`, `{"'"}`, `&apos;` and similar escapes are meaningless in YAML.

A link moved into a markdown body renders as a plain `<a>`, so its trailing slash follows [cloudcannon-configuration/nextjs/collection-urls.md § Internal links](../../cloudcannon-configuration/nextjs/collection-urls.md#internal-links).

## MDX

- **MDX route files** (`app/blog/hello/page.mdx`) move into a content folder (`content/blog/hello.mdx`) and render through a `[slug]` route, so editors find posts in one collection.
- **Render** each content-folder `.mdx` file by the path in the table below. The loader returns the body as a string, and `@next/mdx` compiles only files the bundler imports, never strings.

| Site has                                                                    | Render with                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@next/mdx`, and the route is in the App Router                             | A dynamic `import()` of the file in the route, as below — it keeps the site's MDX plugins and `mdx-components.tsx`                                                                                                                                                                             |
| `next-mdx-remote`, or the route is in the Pages Router                      | The loader's `body` through `next-mdx-remote` — the API per router is in [cloudcannon-snippets/nextjs/overview.md § `next-mdx-remote`](../../cloudcannon-snippets/nextjs/overview.md#next-mdx-remote). Pass any remark and rehype plugins from `createMDX` to `serialize` through `mdxOptions` |
| A content library (Contentlayer, velite, content-collections, Fumadocs MDX) | The library's compiled MDX component, passed the shared component map — see [§ Existing content libraries](#existing-content-libraries) and [cloudcannon-snippets/nextjs/overview.md § Content layers](../../cloudcannon-snippets/nextjs/overview.md#content-layers)                           |

```tsx
// app/blog/[slug]/page.tsx, with @next/mdx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = getEntry("blog", slug);
  const { default: Body } = await import(`../../../content/blog/${slug}.mdx`);
  return (
    <article>
      <h1>{data.title}</h1>
      <Body />
    </article>
  );
}
```

- **Write** the `.mdx` extension into the import path, and keep `generateStaticParams` from [§ `[slug]` routes](#slug-routes).
- **Read** front matter fields from the loader. The file itself needs the front matter plugins in [cloudcannon-snippets/nextjs/overview.md § `@next/mdx`](../../cloudcannon-snippets/nextjs/overview.md#nextmdx), or its front matter block renders as page text.
- **Remove** `import` lines from MDX content. Components reach every file through one shared map — see [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).
- **`export const metadata`** in an MDX file becomes front matter, read by the route's `generateMetadata` — in the Pages Router, by the page's `next/head`.
- **Make** an MDX body editable in the Visual Editor by rendering it inside a `@content` region — see [cloudcannon-visual-editing/nextjs/visual-editing-reference.md § MDX bodies](../../cloudcannon-visual-editing/nextjs/visual-editing-reference.md#mdx-bodies).

## Existing content libraries

A content library (Contentlayer, velite, content-collections, Fumadocs MDX) reads a content root, checks front matter against its own schema, and generates the data the routes import. Keep it, and fit the migration into it:

- **Put** new collections, such as `pages`, inside the library's content root.
- **Declare** every new front matter key (`_schema`, `content_blocks`) in the library's schema or document type. An undeclared key fails its validation or is dropped from its output.
- **Keep** data files out of its content root, or exclude them in its config.
- **Build** `@file[...]` paths from the source path the library exposes for each entry, prefixed with the content root when that path is relative to it.
- **Clear** its generated folder in the clean build — see [build.md § Build verification checklist](build.md#build-verification-checklist).

## Data files

The rule and the keep/move table are in [../content.md § Settings in code → data files](../content.md#settings-in-code--data-files). In Next.js:

- **Choose** JSON or YAML per [cloudcannon-configuration/nextjs/configuration.md § Data files](../../cloudcannon-configuration/nextjs/configuration.md#data-files).
- **Cast** a JSON import where the code expects literal types (`nav as NavItem[]`). JSON imports widen `"primary" | "secondary"` to `string`, and the type check in `next build` fails.

## Images

| Image source                                    | Front matter value                          | Change                                                                          |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| File in `public/`                               | Path from the site root: `/images/hero.jpg` | None                                                                            |
| Static import (`import hero from "./hero.jpg"`) | —                                           | Move the file into `public/` and store its path; editors can't change an import |
| Remote URL                                      | The URL                                     | None                                                                            |

A `next/image` with a string `src` needs `width` and `height`, or `fill` — a static import supplied them. `next/image` under export also needs the `images` setting from Phase 2 — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export).

## API-driven content

The rule is in [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files). In Next.js:

1. Create the collection folder with one Markdown file per fetched entry.
2. Replace each `fetch()` in route files, `generateStaticParams`, `getStaticProps` and `getStaticPaths` with the loader.
3. Remove the endpoint and its token from `.env*` and the build environment.
