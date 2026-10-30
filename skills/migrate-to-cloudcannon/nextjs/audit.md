# Audit (Next.js)

Start from the output of the [quick checks](overview.md#quick-checks), then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Router and export readiness

Record which router serves each route: `app/` (App Router), `pages/` (Pages Router), or both. Rows below marked with a router apply only to it.

**MUST:** stop and **ask the user** before Phase 2 when the site needs anything in the table below. Each one needs a server, and CloudCannon serves the static export.
**Why:** a site that depends on these either fails `next build` with `output: "export"`, or builds and then behaves differently on a static host. Removing them changes the site, so it is the user's call.

The CloudCannon build exports every route, wherever production is hosted. A site that needs server route folders left out of that build also stops here for the user's call.

| Found                                                                            | Under `output: "export"`                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getServerSideProps` (Pages Router)                                              | Build fails                                                                                 |
| API routes under `pages/api/` (Pages Router)                                     | Build warns, and they are left out of the output                                            |
| `getStaticPaths` with `fallback: true` or `'blocking'` (Pages Router)            | Build fails — set `fallback: false` once the list covers every entry                        |
| `getInitialProps` on a page or in `_app` (Pages Router)                          | Build warns; it runs at build time and again in the browser on every client-side navigation |
| `middleware.*` or `proxy.*`                                                      | Not run                                                                                     |
| `rewrites`, `redirects` or `headers` in the Next config                          | Build warns, and they don't apply                                                           |
| `i18n` in the Next config                                                        | Build fails                                                                                 |
| `revalidate` exports, `revalidateTag`, `revalidatePath`, `unstable_cache` (ISR)  | Not supported                                                                               |
| A `"use server"` module anywhere in the import graph, including a form's action  | Build fails, even when nothing renders it                                                   |
| A page that reads `searchParams`                                                 | Build fails                                                                                 |
| `cookies()`, `headers()`, `draftMode()`                                          | Not supported                                                                               |
| `export const dynamic = "force-dynamic"`                                         | Not supported                                                                               |
| Route handlers other than `GET`                                                  | Left out of the output with no warning                                                      |
| A `GET` route handler that reads the request                                     | Not supported                                                                               |
| A route the unchanged build marks `ƒ`                                            | Server-rendered; trace it to one of the rows above                                          |
| A dynamic route whose `generateStaticParams` is missing or returns an empty list | Build fails                                                                                 |
| `dynamicParams = true`                                                           | Build fails                                                                                 |
| Intercepting routes                                                              | Not supported                                                                               |

Record for each finding: the file, what it does for the site, and whether a static equivalent exists (headers, redirects and simple rewrites in `.cloudcannon/routing.json` — see [routing.md](../../cloudcannon-configuration/routing.md); client-side filtering or a static route per value for `searchParams`; forms as in [../audit.md § Forms](../audit.md#forms)). Two findings need more:

- For a `"use server"` module, the import chain from a route to it.
- For a non-`GET` handler, its callers, including library components with a default API URL, and which UI breaks without it.

These never block, because Phase 2 fixes them — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export):

- `next/image` with the default loader.
- A `GET` route handler or metadata route file (sitemap, robots, opengraph-image, twitter-image, generated icon, manifest) without `export const dynamic = "force-static"`.
- `fetch(…, { next: { revalidate } })`. It builds, and the fetched value is fixed at build time; record it with the fetches in § 2.

Also record:

- **Next and React versions** in `package.json`, and Node from `.nvmrc`, `.node-version` or `engines` — see [build-commands.md § Node version](../../cloudcannon-configuration/build-commands.md#node-version) and the Next requirement in [cloudcannon-configuration/nextjs/configuration.md § Build settings](../../cloudcannon-configuration/nextjs/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).
  - `@cloudcannon/editable-regions/react` renders with `createRoot` from `react-dom/client`, so it needs React 18 or later.
  - `output: "export"` arrives in Next 13.3. An older site needs a Next upgrade — **ask the user** before Phase 2.
  - From Next 16, `next build` uses Turbopack by default; notes marked Turbopack apply only then.
- **Package manager and version** — see [build-commands.md § Package manager](../../cloudcannon-configuration/build-commands.md#package-manager).
- **`output`** — already `"export"`, or unset. Unset with none of the blockers above means Phase 2 adds it.
- **`distDir`** — names the output directory; see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export).
- **`trailingSlash`** — decides the built path of every page, and so every collection `url`; see [cloudcannon-configuration/nextjs/collection-urls.md](../../cloudcannon-configuration/nextjs/collection-urls.md#trailing-slash-rule). When it's off, list internal links ending in `/` outside `<Link>`; they return 404 — see [§ Internal links](../../cloudcannon-configuration/nextjs/collection-urls.md#internal-links).
- **`basePath`** — the site is served from a sub-path; see [cloudcannon-configuration/nextjs/collection-urls.md § `basePath`](../../cloudcannon-configuration/nextjs/collection-urls.md#basepath).
- **`src/` directory** — whether routes live at `app/` and `pages/`, or under `src/`. Paths below use `app/` and `pages/`.
- **`getInitialProps` in `_document`** — runs at build time only, so it needs no change. A `_document` that reads the request (`ctx.req`) gets nothing under export.

### Earlier CloudCannon setup

Sites built for CloudCannon's earlier tooling carry some of these. Record each one found; none of them blocks static export.

| Found                                                                                                     | What it is                                                         | Handled in                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@cloudcannon/react-connector`, `CloudCannonConnect` in `_app`                                            | Live editing by re-rendering the whole page from the editor's data | Phase 4 — [visual-editing.md § Sites using the React connector](../../cloudcannon-visual-editing/nextjs/visual-editing.md#sites-using-the-react-connector) |
| `data-cms-bind` attributes, or a `dataBinding` prop that builds them                                      | Click-to-open bindings from the same setup                         | Phase 4 — the same section                                                                                                                                 |
| `@cloudcannon/filer`                                                                                      | A build-time content loader                                        | Phase 3 — [content.md § `@cloudcannon/filer`](content.md#cloudcannonfiler)                                                                                 |
| `component-library/**/*.bookshop.yml`, `@bookshop/generate` in `.cloudcannon/postbuild`, `_bookshop_name` | Bookshop, used only to generate `_structures`                      | Read [cloudcannon-bookshop/nextjs/overview.md](../../cloudcannon-bookshop/nextjs/overview.md) now — it changes Phases 2 to 4                               |
| Steps in `.cloudcannon/prebuild` or `postbuild` other than Bookshop's                                     | Build steps CloudCannon runs around the build command              | Phase 5 — [build-commands.md § `.cloudcannon/` hook files](../../cloudcannon-configuration/build-commands.md#cloudcannon-hook-files)                       |

## 2. Content sources

List where every page's content comes from:

- **Markdown and MDX files** — the folder (`content/`, `posts/`, `_posts/`), file count, and which route reads them.
- **MDX as route files** (`app/blog/hello/page.mdx`) — content mixed into the routing; Phase 3 moves it into a content folder.
- **Data files** — JSON or YAML, the folder, and which components import or read them.
- **Content in code** — arrays and objects in `.ts`/`.tsx` files (nav items, features, team members), and text written into JSX.
- **Fetches** — each `fetch()` in a server component, its endpoint, and the fields the page uses. They run at build time under export; Phase 3 replaces them with local files — see [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files).

For each content folder, record:

- **Front matter fields** — every key, its type, whether it is always present, and which component reads it. A site with no content layer has no schema, so this list becomes the CloudCannon schema file.
- **How it's read** — the loader module (`lib/posts.ts`, `utils/content.ts`, `@cloudcannon/filer`): `fs` at module load or per call, the folder it reads, and how it builds the slug (file name, a `slug` field, a date prefix).
- **Front matter parser** — `gray-matter`, `js-yaml`, `front-matter`, or the content layer. With `gray-matter`, check what reaches client components against [content.md § The content loader](content.md#the-content-loader).
- **Markdown renderer** — `remark`/`unified`, `markdown-it`, `marked`, or MDX. Note plugins that change the output (heading IDs, syntax highlighting).

### MDX setup

| Found                                       | How MDX renders                                                     | Components come from                         |
| ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `@next/mdx` in the Next config              | `.mdx` files are pages or imports, compiled by the bundler          | `mdx-components.tsx`, plus `import` in files |
| `next-mdx-remote`                           | MDX strings read from files, rendered with `<MDXRemote>`            | The `components` prop at each render site    |
| `contentlayer`, `contentlayer2` or `velite` | A content layer compiles files into generated data before the build | The component map passed to its MDX renderer |
| `@content-collections/*` or `fumadocs-mdx`  | The same, as a content layer                                        | The component map passed to its MDX renderer |

Record each component used in MDX bodies, with its props and how many files use it. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components). Inline components are snippet candidates for Phase 2 — see [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).

With a content layer, record its config file, the folders it reads, its schema or document types, and its output directory (`.contentlayer/`, `.velite/`, `.content-collections/`, `.source/`). Editors change the source files; the output directory is never a collection. Phase 3 works within the library — see [content.md § Existing content libraries](content.md#existing-content-libraries).

Check each data file that holds like-shaped items (team members, FAQs) against the shape rule in [../content.md § Data collections](../content.md#data-collections).

## 3. Pages and routing

Map every route under `app/` and `pages/`. In the App Router:

- **Static routes** (`app/page.tsx`, `app/about/page.tsx`) and where each gets its content
- **Dynamic routes** (`app/blog/[slug]/page.tsx`) — what `generateStaticParams` returns, and where the param comes from (file name, front matter `slug`). This decides the collection `url`.
- **Catch-all routes** (`[...slug]`, `[[...slug]]`)
- **Route groups** (`(marketing)/`) — they don't appear in the URL
- **Listing and pagination pages** — built from a collection, not backed by their own content file
- **Generated files** — `sitemap.ts`, `robots.ts`, `GET` route handlers for feeds

In the Pages Router, each file is a route:

- **Static routes** (`pages/index.jsx`, `pages/about.jsx`) and what each `getStaticProps` reads
- **Dynamic routes** (`pages/blog/[slug].jsx`) — what `getStaticPaths` returns, its `fallback`, and the files it skips (an `ignored` list, a filter). This decides the collection `url`.
- **Special files** — `_app`, `_document` and `404` are not content routes
- **Router reads** — `useRouter().query` used to choose content. It is empty during prerendering, so the exported HTML renders without it; pass the value from `getStaticProps` instead.

## 4. Layouts and components

- **Root layout** (`app/layout.tsx`) and nested layouts — what each wraps (header, footer, providers). In the Pages Router: `pages/_app.*`, and the layout component each page renders itself.
- **Server and client components** — which components have `"use client"`, and which read files, call `fetch` or are `async`. A component imported from a `"use client"` module is client code too, so trace imports from each one. In the Pages Router every component is client code: only `getStaticProps` and `getStaticPaths` read files, and components get their data as props.
  **Why:** a component the Visual Editor re-renders runs in the browser, with its data only from props — see [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). A component that reads data itself is reshaped in Phase 4 only if it needs re-rendering — see the decision order in [visual-editing-reference.md § Registered components](../../cloudcannon-visual-editing/nextjs/visual-editing-reference.md#registered-components).
- **Section components** rendered by pages (hero, features, CTA, testimonials) and the props each takes.
- **Context providers** (theme, i18n, UI libraries) that section components depend on.
- **`next/image`** — which components use it, with local or remote sources.

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, site settings).

### Classifying static pages

Classify every route whose content isn't already in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); name each census row by its route file's real path, route groups included (`app/(marketing)/page.tsx`, `app/about/page.tsx`, `pages/about.jsx`).

That section's two follow-on censuses in Next.js form:

| Census                  | Next.js form                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each route file: `{page.title}` is primitive; a ternary, `.map` over another collection, a lookup or a data-file import is computed. Target: zero computed values in route files — each moves into a component taking props |
| Frontmatter co-location | For each section component that will re-render in the editor: are its props one front matter key or one data file? If not, reshape before shipping                                                                              |

In Next.js the usual outcome is:

| Page                                                        | Pattern                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from section components | Page builder — `content_blocks` in a file under `content/pages/`; see [page-building.md](page-building.md)                                                                                                                                                    |
| Blog posts, docs, case studies                              | Fixed-schema collection, rendered by a `[slug]` route                                                                                                                                                                                                         |
| Listing pages with an editable intro                        | A file in the `pages` collection with its own schema                                                                                                                                                                                                          |
| Legal and policy pages                                      | Markdown body in the `pages` collection                                                                                                                                                                                                                       |
| One-off page with hard-coded text                           | A file in the `pages` collection; route files take no source regions — see [cloudcannon-visual-editing/nextjs/visual-editing-reference.md § Source editables](../../cloudcannon-visual-editing/nextjs/visual-editing-reference.md#source-editables-in-nextjs) |
| `not-found.tsx`, `pages/404.*`, `sitemap.ts`, feeds         | Leave as code                                                                                                                                                                                                                                                 |

## 5. Build pipeline

- The `build` script in `package.json`, and anything it runs before or after `next build` (search indexes, generated data, a content layer build).
- Environment variables the build reads (`.env*`, `process.env` in server components) — CMS tokens point at fetches Phase 3 removes.
- `next.config` values read from `process.env`, and build scripts that branch on the same variables. When production is hosted elsewhere, Phase 2 gates the export settings on a variable — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export).
- Existing hosting config (`vercel.json`, `netlify.toml`, `.github/workflows`), and `headers()`, `redirects()` and `rewrites()` in the Next config — see [../audit.md § Site-wide facts](../audit.md#site-wide-facts).

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`).
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global DOM scripts** — `document.querySelectorAll` in a `useEffect` or a `<Script>` that binds to component classes once.
  **Why:** markup the editor re-renders loses the behaviour — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Numbers displayed as text** — counters, prices and stats stored as numbers.
  **Why:** a text region rejects non-strings — see [Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Styled HTML in strings** — `dangerouslySetInnerHTML` on values holding classes or layout `<br>`. See [../content.md § Styled HTML in front matter](../content.md#styled-html-in-front-matter).
- **Load-time behaviour** — see [../audit.md § Load-time behaviour](../audit.md#load-time-behaviour).

## 7. Sectioning recommendation

Record total pages as [orchestration.md § Sizing](../orchestration.md#sizing) counts them, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, write `.cloudcannon/migration/plan.md` from [orchestration.md § Sizing](../orchestration.md#sizing) and return. Phase 2 waits for the user's go on the plan.
