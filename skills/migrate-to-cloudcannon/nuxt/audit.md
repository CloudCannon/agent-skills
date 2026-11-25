# Audit (Nuxt)

Start from the output of the [quick checks](overview.md#quick-checks), then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Static generation readiness

**MUST:** stop and **ask the user** before Phase 2 when the site needs anything in the table below. Each one needs a server, and the CloudCannon build is the output of `nuxt generate`. When the site keeps these features, the live site stays on a host that runs them, and the CloudCannon build gets editing fallbacks — see [server-features.md](../../cloudcannon-configuration/server-features.md).
**Why:** a site that depends on these builds and then behaves differently on a static host. Removing them changes the site, so it is the user's call.

| Found                                                                                                                         | Under `nuxt generate`                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A `server/api` or `server/routes` handler the browser calls (a form post, a `lazy` or `server: false` fetch, a click handler) | Returns 404 on the static host                                                                                  |
| `server/middleware`                                                                                                           | Runs during the build only                                                                                      |
| Auth modules or session reads (`nuxt-auth-utils`, `@sidebase/nuxt-auth`, `useCookie` that decides what renders)               | Rendered once, for a signed-out visitor                                                                         |
| `routeRules` with `ssr: false`, `isr`, `swr` or `cache`                                                                       | Not supported                                                                                                   |
| `routeRules` with `redirect` or `headers`                                                                                     | Not applied — move to `.cloudcannon/routing.json`; see [routing.md](../../cloudcannon-configuration/routing.md) |
| `ssr: false` in the Nuxt config                                                                                               | Every page is an empty shell; regions have no HTML until the app mounts                                         |
| A page that logs `ERROR` in the quick-check build                                                                             | Left out of the output                                                                                          |

Record for each finding: the file, what it does for the site, and whether a static equivalent exists (headers and redirects in `.cloudcannon/routing.json`; forms as in [../audit.md § Forms](../audit.md#forms); data fetched at build time into a local file).

These never block, because Phase 2 handles them — see [cloudcannon-configuration/nuxt/configuration.md § Static generation](../../cloudcannon-configuration/nuxt/configuration.md#static-generation):

- `useFetch`, `useAsyncData` or `$fetch` during render, including to the site's own `server/api` routes. They run at build time and the result is baked into the page.
- `runtimeConfig` read during render. The value is fixed at build time.
- Dynamic pages nothing links to. Phase 2 adds them to the build.

Also record:

- **Nuxt, Vue and Nuxt Content versions** in `package.json`, and Node from `.nvmrc`, `.node-version` or `engines` — see [build-commands.md § Node version](../../cloudcannon-configuration/build-commands.md#node-version).
  - Nuxt 2 is out of scope: `@cloudcannon/editable-regions/vue` needs Vue 3. **Ask the user** before Phase 2.
  - Nuxt Content v2 (`@nuxt/content` below 3, `documentDriven`, `queryContent`, `_path`) has no `content.config.ts`. **Ask the user** whether to upgrade to v3 in this migration; the skills' Nuxt Content rules are for v3.
- **Package manager and version** — see [build-commands.md § Package manager](../../cloudcannon-configuration/build-commands.md#package-manager). A `packageManager` field pins the version CloudCannon's build uses.
- **Source directory** — `app/` (Nuxt 4) or the root. Paths below use `app/`.
- **The `generate` script** — present, or Phase 2 adds it.
- **`app.baseURL`** — the site is served from a sub-path; see [cloudcannon-configuration/nuxt/collection-urls.md § `app.baseURL`](../../cloudcannon-configuration/nuxt/collection-urls.md#appbaseurl).
- **Pages missing from the baseline build** — compare the quick-check page list with the site's routes and content files. A missing page is either unlinked or failing; see [cloudcannon-configuration/nuxt/configuration.md § Every page must be reachable](../../cloudcannon-configuration/nuxt/configuration.md#every-page-must-be-reachable).

### Earlier CloudCannon setup

Sites built for CloudCannon's earlier tooling carry some of these. Record each one found; none of them blocks static generation.

| Found                                                                                                     | What it is                                                | Handled in                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@cloudcannon/visual-editor-connector`, `onCloudCannonChanges` in a page                                  | Live editing by replacing the page's data from the editor | Phase 4 — [visual-editing.md § Sites using the visual editor connector](../../cloudcannon-visual-editing/nuxt/visual-editing.md#sites-using-the-visual-editor-connector) |
| `data-cms-bind` attributes, or a `dataBinding` prop that builds them                                      | Click-to-open bindings from the same setup                | Phase 4 — the same section                                                                                                                                               |
| `component-library/**/*.bookshop.yml`, `@bookshop/generate` in `.cloudcannon/postbuild`, `_bookshop_name` | Bookshop, used only to generate `_structures`             | Read [cloudcannon-bookshop/nuxt/overview.md](../../cloudcannon-bookshop/nuxt/overview.md) now — it changes Phases 2 to 4                                                 |
| Steps in `.cloudcannon/preinstall`, `prebuild` or `postbuild` other than Bookshop's                       | Build steps CloudCannon runs around the build command     | Phase 5 — [build-commands.md § `.cloudcannon/` hook files](../../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files)                                     |

## 2. Content sources

List where every page's content comes from:

- **Nuxt Content collections** — each collection in `content.config.ts`: its `type`, `source`, `schema`, file count, and the pages that query it (`queryCollection('<name>')`).
- **Files the site loads itself** — `import.meta.glob`, `node:fs` in a server route or plugin, JSON `import`s. Record the loader module, the folder and the parser.
- **Content in `.vue` files** — text written into templates, and arrays or objects in `<script setup>` (features, plans, nav items). Phase 3 moves it into files.
- **`app.config.ts`** — site settings read with `useAppConfig()`.
- **Fetches** — each `useFetch`, `useAsyncData` or `$fetch` to an outside API, its endpoint, and the fields the page uses. They run at build time; Phase 3 replaces them with local files — see [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files).

For each content collection or folder, record:

- **Fields** — every key, its type, whether it is always present, and which component reads it. With Nuxt Content, compare the files against the collection `schema`: keys missing from it are read through `meta`, or not at all.
- **Paths** — how each file's URL comes about: its location, numeric ordering prefixes, a `path` key, or a collection `prefix`. This decides the collection `url`; see [cloudcannon-configuration/nuxt/collection-urls.md](../../cloudcannon-configuration/nuxt/collection-urls.md).
- **Ordering** — what orders lists and navigation: numeric prefixes, a date, an `order` field, or `.navigation.yml` files.
- **Rendering** — `<ContentRenderer>`, `<MDC :value>`, or `v-html` after the site's own markdown renderer.

### MDC components

Nuxt Content markdown can call Vue components: `::name{prop="x"}` blocks with a default slot, `#slot` sections, nested `:::` blocks, a YAML props block at the top of a component, and inline `:name{}`.

Record each component used in markdown bodies, the syntax forms it's written in, its props, and how many files use it. Record which files nest blocks (`:::` inside `::`): they can't use the Content Editor → [cloudcannon-snippets/nuxt/overview.md § Nested blocks](../../cloudcannon-snippets/nuxt/overview.md#nested-blocks). Components live in `components/content/` or are registered globally. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components). Every component left in bodies needs a snippet in Phase 2 — see [cloudcannon-snippets/nuxt/overview.md](../../cloudcannon-snippets/nuxt/overview.md).

Check each data file that holds like-shaped items (team members, FAQs) against the shape rule in [../content.md § Data collections](../content.md#data-collections).

## 3. Pages and routing

Map every file under `pages/`:

- **Static pages** (`index.vue`, `pricing.vue`) and where each gets its content — a single-file query (`queryCollection('pricing').first()`), a data import, or its own template
- **Dynamic pages** (`blog/[slug].vue`) — what they query by (`route.path`, `route.params.slug`) and what lists them. This decides the collection `url`.
- **Catch-all pages** (`[...slug].vue`) — the collections they query, and how a missing file is handled (`createError({ statusCode: 404 })`)
- **Listing and pagination pages** — built from a collection, not backed by their own content file
- **Pages that should not build** — `login`, `signup` and account pages with no server behind them; record them with § 1's auth row

## 4. Layouts and components

- **`app.vue` and `layouts/`** — what each layout wraps (header, footer), and which pages use which layout (`definePageMeta({ layout })`, or a `layout` field in content)
- **Section components** rendered by pages (hero, features, CTA, testimonials) and the props each takes, or the data each reads itself
- **Components that read data themselves** — `useAsyncData`, `queryCollection`, `useAppConfig`, `useRoute` or a data import inside the component.
  **Why:** a component the Visual Editor re-renders runs in the browser with its data only from props — see [cloudcannon-visual-editing/nuxt/overview.md](../../cloudcannon-visual-editing/nuxt/overview.md). Record which ones Phase 4 may need to reshape.
- **UI libraries** — Nuxt UI, PrimeVue, Vuetify. Their components take content as props (`<UPageHero :title>`), which decides where regions can attach.
- **Client-only components** — `<ClientOnly>` wrappers and `.client.vue` files. Their markup isn't in the built HTML.
- **Images** — `<NuxtImg>`, `<NuxtPicture>` or `<img>`, with sources in `public/`, `assets/` or remote

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, site settings).

### Classifying static pages

Classify every page whose content isn't already in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); name each census row by its page file's real path (`app/pages/index.vue`, `app/pages/pricing.vue`).

That section's two follow-on censuses in Nuxt form:

| Census                  | Nuxt form                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each page file: `{{ page.title }}` is primitive; a ternary, `v-for` over another collection, a lookup or a data import is computed. Target: zero computed values in page files — each moves into a component taking props |
| Frontmatter co-location | For each section component that will re-render in the editor: are its props one front matter key or one data file? If not, reshape before shipping                                                                            |

In Nuxt the usual outcome is:

| Page                                                        | Pattern                                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from section components | Page builder — `content_blocks` in a file under `content/pages/`; see [page-building.md](page-building.md) |
| A page already backed by one YAML file (`pricing.yml`)      | Keep the file and its page; the file gets its own schema                                                   |
| Blog posts, docs, case studies                              | Fixed-schema Nuxt Content collection, rendered by a dynamic or catch-all page                              |
| Listing pages with an editable intro                        | A file in the `pages` collection with its own schema                                                       |
| Legal and policy pages                                      | Markdown body in the `pages` collection                                                                    |
| One-off page with hard-coded text                           | A file in the `pages` collection; `.vue` files take no source regions                                      |
| `error.vue`, sitemap and feed routes                        | Leave as code                                                                                              |

## 5. Build pipeline

- The `generate` and `build` scripts in `package.json`, and anything run before or after them.
- Environment variables the build reads (`.env*`, `runtimeConfig`, `process.env` in `nuxt.config`) — CMS tokens point at fetches Phase 3 removes.
- Modules that fetch or write at build time: `@nuxt/fonts` downloads fonts, `nuxt-og-image` renders images, `@nuxtjs/sitemap` writes a sitemap. Each needs the network or its own config in CloudCannon's build.
- Existing hosting config (`vercel.json`, `netlify.toml`, `.github/workflows`, `nitro.preset`) — see [../audit.md § Site-wide facts](../audit.md#site-wide-facts).

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`).
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global DOM scripts** — `document.querySelectorAll` in `onMounted` or a plugin, and scripts in `app.head.script`, that bind to component classes once.
  **Why:** markup the editor re-renders loses the behaviour — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Numbers displayed as text** — counters, prices and stats stored as numbers.
  **Why:** a text region rejects non-strings — see [Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Styled HTML in strings** — `v-html` on values holding classes or layout `<br>`. See [../content.md § Styled HTML in front matter](../content.md#styled-html-in-front-matter).
- **Load-time behaviour** — see [../audit.md § Load-time behaviour](../audit.md#load-time-behaviour).

## 7. Sectioning recommendation

Record total pages as [orchestration.md § Sizing](../orchestration.md#sizing) counts them, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, write `.cloudcannon/migration/plan.md` from [orchestration.md § Sizing](../orchestration.md#sizing) and return. Phase 2 waits for the user's go on the plan.
