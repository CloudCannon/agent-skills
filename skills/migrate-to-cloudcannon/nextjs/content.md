# Content (Next.js)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Next.js differences: where content files live, the loader that reads them, `[slug]` routes, data files and images.

Next.js has no content convention. Editors can only change files, so every value an editor changes ends up in a Markdown or data file that a server component reads at build time.

## Where files live

| Content                                    | Location                                       | Read by                                          |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------ |
| Entries that build a page (posts, pages)   | `content/<collection>/*.md`, one file per page | The content loader, from a route file            |
| Shared settings (nav, footer, CTA, social) | `data/*.json`                                  | A JSON `import` in the component that renders it |

Keep a site's existing folders when it has them (`posts/`, `_posts/`, `src/content/`). Every path in the CloudCannon config is relative to the repo root.

## The content loader

One module reads every content folder with `node:fs` and parses front matter. Keep the site's loader when it has one, and check it against the rules below.

- **MUST:** import the loader only from route files, layouts and other server components.
  **Why:** a component the Visual Editor re-renders runs in the browser, where `node:fs` doesn't exist — see [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). Route files read the data and pass plain values down as props.
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
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = readFileSync(path.join(dir, file), "utf8");
      const [, front = "", body = raw] = raw.match(FRONTMATTER) ?? [];
      return {
        slug: file.replace(/\.md$/, ""),
        data: (yaml.load(front) ?? {}) as Record<string, any>,
        body,
      };
    });
}

export function getEntry(collection: string, slug: string): Entry {
  const entry = getEntries(collection).find((e) => e.slug === slug);
  if (!entry) throw new Error(`Missing content/${collection}/${slug}.md`);
  return entry;
}
```

Render the body with the site's Markdown renderer. A bare key parses to `null`, so components guard on the value — see [../content.md § Null values in YAML](../content.md#null-values-in-yaml).

## `[slug]` routes

A collection that builds one page per file is rendered by a dynamic route that lists every file in `generateStaticParams`:

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
- **Match** the param to the file name. When the site builds slugs from a front matter field or strips a date prefix, the collection `url` has to compute the same — see [cloudcannon-configuration/nextjs/collection-urls.md](../../cloudcannon-configuration/nextjs/collection-urls.md).

## Content in route files

Text written into JSX and arrays declared in `page.tsx` move into the page's content file. Follow the census in [audit.md § Classifying static pages](audit.md#classifying-static-pages): sections become `content_blocks` ([page-building.md](page-building.md)), and the route reads the file with `getEntry`.

Strip JSX artifacts from the extracted text: `{" "}`, `{"'"}`, `&apos;` and similar escapes are meaningless in YAML.

A link moved into a markdown body renders as a plain `<a>`, so its trailing slash follows [cloudcannon-configuration/nextjs/collection-urls.md § Internal links](../../cloudcannon-configuration/nextjs/collection-urls.md#internal-links).

## MDX

- **MDX route files** (`app/blog/hello/page.mdx`) move into a content folder (`content/blog/hello.mdx`) and render through a `[slug]` route, so editors find posts in one collection.
- **Remove** `import` lines from MDX content. Components reach every file through one shared map — see [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).
- **`export const metadata`** in an MDX file becomes front matter, read by the route's `generateMetadata`.

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

A `next/image` with a string `src` needs `width` and `height`, or `fill` — a static import supplied them. `next/image` under export also needs the Phase 5 setting in [build.md § Export settings](build.md#export-settings).

## API-driven content

The rule is in [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files). In Next.js:

1. Create the collection folder with one Markdown file per fetched entry.
2. Replace each `fetch()` in route files and `generateStaticParams` with the loader.
3. Remove the endpoint and its token from `.env*` and the build environment.
