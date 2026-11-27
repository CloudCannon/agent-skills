# Audit (SvelteKit)

Start from the output of the [quick checks](overview.md#quick-checks), then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Static output readiness

Record the adapter, and every route that wouldn't prerender. The CloudCannon build prerenders every page editors work on with `adapter-static` — see [cloudcannon-configuration/sveltekit/configuration.md § Static output](../../cloudcannon-configuration/sveltekit/configuration.md#static-output).

**MUST:** stop and **ask the user** before Phase 2 when the site needs anything in the table below. When the site keeps these features, the live site stays on a host that runs them, and the CloudCannon build gets editing fallbacks — see [server-features.md](../../cloudcannon-configuration/server-features.md).
**Why:** each one needs a server. Removing it changes the site, so it is the user's call.

| Found                                                                                       | In a static build                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form `actions` in a `+page.server.*`                                                        | The page won't prerender                                                                                                                              |
| A `+server.*` endpoint the browser calls (`fetch` from a component, a non-`GET` handler)    | Not in the output; the call returns 404                                                                                                               |
| Auth or session reads (`locals.session`, `cookies.get`, Supabase or Lucia clients in hooks) | Rendered once, for a visitor with no cookies                                                                                                          |
| `prerender = false` on a route, or `ssr = false`                                            | Not built, or built as an empty shell                                                                                                                 |
| A `load` that reads `url.searchParams`                                                      | The build fails                                                                                                                                       |
| Redirects or headers set in `hooks.server.*` or by the adapter's config                     | Not applied — when CloudCannon hosts the site, move them to `.cloudcannon/routing.json`; see [routing.md](../../cloudcannon-configuration/routing.md) |

Record for each finding: the file, what it does for the site, and whether a static equivalent exists (forms as in [../audit.md § Forms](../audit.md#forms); data fetched at build time into a local file).

These never block, because Phase 2 handles them:

- A `load` in `+page.server.*` or `+layout.server.*` that reads files or calls an API. It runs at build time and the result is baked into the page.
- `$env/static/private` imports. The CloudCannon build gets placeholder values — see [cloudcannon-configuration/sveltekit/configuration.md § Environment variables](../../cloudcannon-configuration/sveltekit/configuration.md#environment-variables).
- Dynamic routes nothing links to. Phase 2 adds `entries`.
- `redirect()` in a prerendered `load`. It builds as a meta-refresh page, which works on static hosting; record it so Phase 5 doesn't mistake the page for a fault.

Also record:

- **Svelte, SvelteKit and Vite versions** in `package.json`, and Node from `.nvmrc`, `.node-version` or `engines` — see [build-commands.md § Node version](../../cloudcannon-configuration/build-commands.md#node-version). Keep the site's versions: the migration doesn't upgrade them.
- **Package manager and version** — see [build-commands.md § Package manager](../../cloudcannon-configuration/build-commands.md#package-manager).
- **`prerender` settings** — the root `+layout` value, `kit.prerender.entries`, `handleHttpError`, and `adapter-static`'s `strict` and `fallback` options. `handleHttpError: "warn"` and `strict: false` let a build pass with pages missing. Only a bare `"*"` in `entries` means every route; a `*` inside a path is literal, so `/blog/category/*` builds a junk page named `*`.
- **`trailingSlash`** on each route — see [cloudcannon-configuration/sveltekit/collection-urls.md § Trailing slash rule](../../cloudcannon-configuration/sveltekit/collection-urls.md#trailing-slash-rule).
- **Pages missing from the baseline build** — compare the quick-check page list with the site's routes and content files. A missing page is unlinked or failing; see [cloudcannon-configuration/sveltekit/configuration.md § Every page must be prerendered](../../cloudcannon-configuration/sveltekit/configuration.md#every-page-must-be-prerendered).

### Earlier CloudCannon setup

Record each one found; none of them blocks the migration.

| Found                                                                                                                   | What it is                                                | Handled in                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@cloudcannon/svelte-connector`, `onCloudCannonChanges` in a page                                                       | Live editing by replacing the page's data from the editor | Phase 4 — [visual-editing.md § Sites using the Svelte connector](../../cloudcannon-visual-editing/sveltekit/visual-editing.md#sites-using-the-svelte-connector) |
| `component-library/**/*.bookshop.yml`, `@bookshop/sveltekit-bookshop`, `@bookshop/generate` in `.cloudcannon/postbuild` | Bookshop                                                  | Read [cloudcannon-bookshop/sveltekit/overview.md](../../cloudcannon-bookshop/sveltekit/overview.md) now — it changes Phases 2 to 4                              |
| Steps in `.cloudcannon/preinstall`, `prebuild` or `postbuild` other than Bookshop's                                     | Build steps CloudCannon runs around the build command     | Phase 5 — [build-commands.md § `.cloudcannon/` hook files](../../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files)                            |

## 2. Content sources

SvelteKit has no content convention. Follow every `load` to the files or calls it reads, and list where every page's content comes from:

- **mdsvex files** — the folder, the extensions mdsvex compiles (`.md`, `.svx`, `.svelte.md`, from `svelte.config.js`), and how a page loads them: `import.meta.glob`, or a dynamic `import()` by slug. Front matter arrives as `metadata`, and the body renders as a component.
- **`+page.md` route files** — mdsvex pages that hold their own content.
- **Files the site loads itself** — `node:fs`, `import.meta.glob` with `?raw`, or a JSON `import`. Record the loader module, the folder and the parser (`gray-matter`, `marked`, `unified`).
- **A content library** — velite or content-collections: its config file, collections and output alias (`$content`).
- **Content in `.svelte` files** — text written into templates, and arrays or objects in `<script>` (features, plans, nav items). Phase 3 moves it into files.
- **Content in `.ts` or `.js` modules** — post lists, pricing plans, site config (`src/lib/config.js`).
- **Fetches** — each `fetch` to an outside API in a `load`, its endpoint, and the fields the page uses. Phase 3 replaces them with local files — see [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files).

For each content folder, record:

- **Fields** — every key, its type, whether it is always present, and which component reads it.
- **Paths** — how each file's URL comes about: its name, its folder, or a front matter field. This decides the collection `url`; see [cloudcannon-configuration/sveltekit/collection-urls.md](../../cloudcannon-configuration/sveltekit/collection-urls.md).
- **Ordering** — what orders lists and navigation: a date, an `order` field, or the module that lists them.
- **Rendering** — an mdsvex component (`<data.content />`, `<svelte:component this>`), or `{@html}` after a markdown parser.

### Svelte components in markdown

mdsvex bodies can hold a `<script>` block that imports Svelte components, and the components themselves (`<Callout>…</Callout>`). Record each component used in bodies, its props, and how many files use it. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components). Every component left in bodies needs a snippet in Phase 2 — see [cloudcannon-snippets/sveltekit/overview.md](../../cloudcannon-snippets/sveltekit/overview.md).

Check each data file that holds like-shaped items (team members, FAQs) against the shape rule in [../content.md § Data collections](../content.md#data-collections).

## 3. Routes

Map every route folder under `src/routes`:

- **Static pages** (`about/+page.svelte`) and where each gets its content — its own template, a data import, or a `load`
- **Dynamic routes** (`blog/[slug]`) — what the `load` looks the file up by, and what lists them. This decides the collection `url`.
- **Rest routes** (`[...path]`) — the folders they read, and how a missing file is handled (`error(404)`)
- **Groups** (`(marketing)`, `(app)`) — which group holds editors' pages and which holds server-only pages
- **Listing and pagination pages** — built from a folder, not backed by their own content file
- **Endpoints** (`+server.*`) — feeds and sitemaps prerender as files; endpoints the browser calls go in § 1

## 4. Layouts and components

- **`+layout.svelte` files** — what each wraps (header, footer), and which routes each covers
- **Section components** rendered by pages (hero, features, CTA, testimonials) and the props each takes, or the data each reads itself
- **Components that read data themselves** — a data import, a store, `$app/stores` or `$app/state` (`$page`, `page.data`), or `getContext` from a layout.
  **Why:** a component the Visual Editor re-renders runs in the browser with its data only from props — see [cloudcannon-visual-editing/sveltekit/overview.md](../../cloudcannon-visual-editing/sveltekit/overview.md). Record which ones Phase 4 may need to reshape.
- **UI libraries** — shadcn-svelte, Skeleton, Flowbite, daisyUI. Their components take content as props or slots, which decides where regions can attach.
- **Browser-only rendering** — `{#if browser}` blocks and components mounted in `onMount`. Their markup isn't in the built HTML.
- **Images** — `<img>` with sources in `static/`, imports from `src/lib/assets/`, `<enhanced:img>`, or remote URLs

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, site settings).

### Classifying static pages

Classify every page whose content isn't already in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); name each census row by its route file's real path (`src/routes/+page.svelte`, `src/routes/pricing/+page.svelte`).

That section's two follow-on censuses in SvelteKit form:

| Census                  | SvelteKit form                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primitive-vs-computed   | For each route file: `{data.page.title}` is primitive; a ternary, `{#each}` over another folder, a lookup or a data import is computed. Target: zero computed values in route files — each moves into a component taking props |
| Frontmatter co-location | For each section component that will re-render in the editor: are its props one front matter key or one data file? If not, reshape before shipping                                                                             |

In SvelteKit the usual outcome is:

| Page                                                        | Pattern                                                                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from section components | Page builder — `content_blocks` in a file under `content/pages/`; see [page-building.md](page-building.md)                 |
| Blog posts, docs, case studies                              | Fixed-schema collection of markdown files, rendered by a dynamic route                                                     |
| Listing pages with an editable intro                        | A file in the `pages` collection with its own schema                                                                       |
| Legal and policy pages                                      | Markdown body in the `pages` collection                                                                                    |
| One-off page with hard-coded text                           | A file in the `pages` collection; `.svelte` files take no source regions                                                   |
| `+error.svelte`, sitemap and feed endpoints                 | Leave as code                                                                                                              |
| Pages that need a server (sign-in, account, checkout)       | Leave as code, out of the CloudCannon build — see [server-features.md](../../cloudcannon-configuration/server-features.md) |

## 5. Build pipeline

- The `build` script in `package.json`, and anything run before or after it (`prebuild`, `postbuild`, codegen).
- Scripts coupled to one adapter's output folder (`.svelte-kit/cloudflare`, `.vercel/output`).
- Environment variables the build reads (`.env*`, `$env/*`, `process.env` in `svelte.config.js` or `vite.config.*`) — CMS tokens point at fetches Phase 3 removes.
- Existing hosting config (`vercel.json`, `netlify.toml`, `wrangler.toml`, `.github/workflows`) — see [../audit.md § Site-wide facts](../audit.md#site-wide-facts).

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`).
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global DOM scripts** — `document.querySelectorAll` in `onMount` or a layout, and scripts in `app.html`, that bind to component classes once.
  **Why:** markup the editor re-renders loses the behaviour — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Numbers displayed as text** — counters, prices and stats stored as numbers.
  **Why:** a text region rejects non-strings — see [Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Styled HTML in strings** — `{@html}` on values holding classes or layout `<br>`. See [../content.md § Styled HTML in front matter](../content.md#styled-html-in-front-matter).
- **Load-time behaviour** — see [../audit.md § Load-time behaviour](../audit.md#load-time-behaviour).

## 7. Sectioning recommendation

Record total pages as [orchestration.md § Sizing](../orchestration.md#sizing) counts them, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, write `.cloudcannon/migration/plan.md` from [orchestration.md § Sizing](../orchestration.md#sizing) and return. Phase 2 waits for the user's go on the plan.
