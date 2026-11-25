# Content (Nuxt)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Nuxt differences: Nuxt Content collections, sites that load their own files, content in `.vue` files, data files and images.

Editors can only change files, so every value an editor changes ends up in a Markdown, YAML or JSON file read at build time.

## Where files live

| Content                                    | Location                                   | Read by                                               |
| ------------------------------------------ | ------------------------------------------ | ----------------------------------------------------- |
| Entries that build a page (posts, pages)   | `content/<collection>/`, one file per page | `queryCollection` in a page, or the site's own loader |
| Shared settings (nav, footer, CTA, social) | `data/*.json` at the repository root       | A JSON `import` in the component that renders it      |

Keep a site's existing folders when it has them. Every path in the CloudCannon config is relative to the repo root.

**Use JSON imports for shared settings** even on a Nuxt Content site. An import is synchronous and works in any component, including one the Visual Editor re-renders in the browser; a `queryCollection` call needs `useAsyncData` in a page.

## Nuxt Content collections

- **Add** each new collection, such as `pages`, to `content.config.ts` with a `source` and a `schema`.
- **Declare** every front matter key the templates read (`content_blocks`, `hero`, `image`) in the collection's `schema`. Undeclared keys are kept under `meta`, so `page.content_blocks` is `undefined`. `_schema` and other keys only CloudCannon reads need no declaration.
- **Keep** each file in one collection. Narrow an overlapping `source` with `exclude`.
- **Keep** the site's file format per collection: Markdown with front matter, or YAML page files (`pricing.yml`) whose top-level keys are the fields.

```ts
// content.config.ts
import { defineCollection, defineContentConfig, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: "page",
      source: { include: "pages/**", prefix: "/" },
      schema: z.object({
        content_blocks: z.array(z.record(z.string(), z.any())).optional(),
      }),
    }),
  },
});
```

### Nuxt Content v2

A site on v2 has no `content.config.ts`: every file under `content/` is queryable with `queryContent`, and `documentDriven` mode renders pages by path. When the user keeps v2, there is no schema to declare keys in, and paths come from `_path`:

- Leave pages where they are. Under `documentDriven`, a file's path is its URL, so moving `content/about.md` to `content/pages/` moves the page.
- Give the CloudCannon pages collection on `content/` the glob `*.md`, so subfolders such as `content/blog/` stay in their own collections.
- Where these guides use `queryCollection`, use `queryContent` filtered on `_path`, as the site already does.

When they upgrade, follow Nuxt Content's v3 migration guide before Phase 3 continues: collections in `content.config.ts`, `queryCollection` in place of `queryContent`, and a catch-all page in place of document-driven rendering.

## Sites that load their own files

Keep the site's loader when it has one. When there is none, read content with `import.meta.glob`, which bundles the files at build time:

```ts
// app/utils/content.ts
import yaml from "js-yaml";

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const files = import.meta.glob<string>("../../content/pages/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const pages = Object.fromEntries(
  Object.entries(files).map(([path, raw]) => {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const [, front = "", body = raw] = raw.match(FRONT_MATTER) ?? [];
    return [slug, { slug, data: (yaml.load(front) ?? {}) as Record<string, any>, body }];
  }),
);
```

**MUST NOT:** parse front matter with `gray-matter` in a module pages import.
**Why:** page code also runs in the browser on client-side navigation, and `gray-matter` needs Node's `Buffer`, so navigation breaks after the first page.

## Content in `.vue` files

Text written into templates and arrays declared in `<script setup>` move into the page's content file. Follow the census in [audit.md § Classifying static pages](audit.md#classifying-static-pages): sections become `content_blocks` ([page-building.md](page-building.md)), and the page reads the file.

- **Strip** template artifacts from the extracted text: `{{ ' ' }}`, `&nbsp;` used for spacing, and HTML entities that YAML doesn't need.
- **Move** text from a component's own template into props when the component is reused; give it defaults only for values every use shares.
- **Keep** text that UI library components take as props (`<UPageHero title="…">`) as a prop value read from the content file.

## MDC in Markdown bodies

Leave MDC components in place in bodies; Phase 2 gives each one a snippet — see [cloudcannon-snippets/nuxt/overview.md](../../cloudcannon-snippets/nuxt/overview.md). A component the audit classifies as layout moves into `content_blocks` instead ([../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components)).

## Data files

The rule and the keep/move table are in [../content.md § Settings in code → data files](../content.md#settings-in-code--data-files). In Nuxt:

- **Move** values editors change out of `app.config.ts` into a JSON file the component imports. CloudCannon can't parse a TypeScript module into inputs.
- **Cast** a JSON import where the code expects literal types (`nav as NavItem[]`). JSON imports widen `"primary" | "secondary"` to `string`.

## Images

Keep every image where the live site has it, and store the path or URL the site already uses. Images under `public/`, imported from `assets/`, and remote URLs each have their own setup in [cloudcannon-configuration/nuxt/configuration.md § Images](../../cloudcannon-configuration/nuxt/configuration.md#images).

## API-driven content

The rule is in [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files). In Nuxt:

1. Create the collection folder with one file per fetched entry.
2. Replace each `useFetch`, `useAsyncData` or `$fetch` to the API with `queryCollection` or the site's loader.
3. Remove the endpoint and its token from `.env*`, `runtimeConfig` and the build environment.
