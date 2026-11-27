# Content (SvelteKit)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the SvelteKit differences: where files live, where to read them, mdsvex, content in `.svelte` and `.ts` files, data files and images.

Editors can only change files, so every value an editor changes ends up in a Markdown, YAML or JSON file read at build time.

## Where files live

| Content                                    | Location                                                                  | Read by                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Entries that build a page (posts, pages)   | The site's existing folder (`src/lib/posts/`), or `content/<collection>/` | A `load` — see [§ Read files in server loads](#read-files-in-server-loads) |
| Shared settings (nav, footer, CTA, social) | `data/*.json` at the repository root, or `src/lib/data/`                  | A JSON `import` in the component that renders it                           |

Keep a site's existing folders when it has them. Every path in the CloudCannon config is relative to the repo root.

**Use JSON imports for shared settings.** An import is synchronous and works in any component, including one the Visual Editor re-renders in the browser; a `load` result reaches a component only through props.

## Read files in server loads

**MUST:** read and parse content files in `+page.server.js`, `+layout.server.js` or a module only they import, never in a universal `+page.js` or a component.
**Why:** a universal `load` also runs in the browser on client-side navigation. A parser that needs Node (`gray-matter` needs `Buffer`) then breaks navigation after the first page, with `Buffer is not defined`. A server `load` runs at build time, and the browser gets its result from the page's `__data.json`.

Keep the site's loader when it has one. When there is none, read the folder with `node:fs` in a `.server.js` module:

```js
// src/lib/server/pages.js
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = "content/pages";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : full.endsWith(".md") ? [full] : [];
  });
}

export function pageSlugs() {
  return walk(DIR).map((file) => path.relative(DIR, file).replace(/\.md$/, ""));
}

export function getPage(slug) {
  const file = path.join(DIR, `${slug || "index"}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { data, body: content };
}
```

Paths resolve from the site root, where the build runs. Modules under `src/lib/server/` can only be imported by server code; SvelteKit fails the build otherwise.

## mdsvex

mdsvex compiles each markdown file into a Svelte component: front matter arrives as `metadata`, and the body renders as the component. A universal `load` may import these files, since nothing parses them at runtime.

- **Keep** the site's folder, extensions and loader. A new file an editor creates is picked up by the site's `import.meta.glob`, and built once the route's `entries` lists it.
- **Keep** Svelte components in bodies; Phase 2 gives each one a snippet — see [cloudcannon-snippets/sveltekit/overview.md](../../cloudcannon-snippets/sveltekit/overview.md). A component the audit classifies as layout moves into `content_blocks` instead ([../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components)).
- **Keep** a `+page.md` route file where it is when editors only change its text. A page that needs a schema or a page builder moves into the `pages` collection — see [page-building.md](page-building.md).

## Content in `.svelte` files

Text written into templates and arrays declared in `<script>` move into the page's content file. Follow the census in [audit.md § Classifying static pages](audit.md#classifying-static-pages): sections become `content_blocks` ([page-building.md](page-building.md)), and the page reads the file.

- **Strip** template syntax from the extracted text: `{" "}`, `{@html "…"}` wrappers, `&nbsp;` used for spacing, and HTML entities that YAML doesn't need.
- **Turn** `{#each}` over an inline array into an array field, and `{#if}` around optional markup into an optional field.
- **Move** text from a component's own template into props when the component is reused; give it defaults only for values every use shares.

## Content in `.ts` and `.js` modules

Arrays of posts, plans or features in modules (`posts.ts`, `pricing_plans.ts`) move into content or data files:

| The module holds                                               | Move it to                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Post metadata, with each post's body in its own `+page.svelte` | One markdown file per post in a collection folder, rendered by a `[slug]` route; delete the per-post routes |
| A list a page renders (plans, features, team)                  | A data file, or a field in the page's content file                                                          |
| Site settings (`config.js`: name, description, social links)   | A JSON data file — see [§ Data files](#data-files)                                                          |

Keep values that only code uses (feature flags, API URLs, Stripe price IDs) in the module.

## Content libraries

A site on velite or content-collections keeps the library. Each library collection becomes a CloudCannon collection over its folder. Add each field editors set to the library's schema, and rebuild to check the generated output has it.

## Data files

The rule and the keep/move table are in [../content.md § Settings in code → data files](../content.md#settings-in-code--data-files). In SvelteKit:

- **Move** values editors change out of `.js` and `.ts` modules into a JSON file the component imports. CloudCannon can't parse a module into inputs.
- **Type** a JSON import where the code expects literal types, with a JSDoc or TypeScript cast. JSON imports widen `"primary" | "secondary"` to `string`.

## Images

Keep every image where the live site has it, and store the path or URL the site already uses. Images under `static/`, imported from `src/lib/assets/`, and remote URLs each have their own setup in [cloudcannon-configuration/sveltekit/configuration.md § Images](../../cloudcannon-configuration/sveltekit/configuration.md#images).

## API-driven content

The rule is in [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files). In SvelteKit:

1. Create the collection folder with one file per fetched entry.
2. Replace each `fetch` to the API in a `load` with the server loader.
3. Remove the endpoint and its token from `.env*` and the build environment.
