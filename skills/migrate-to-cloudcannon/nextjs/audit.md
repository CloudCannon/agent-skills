# Audit (Next.js)

Start from the output of the [quick checks](overview.md#quick-checks), then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Router and export readiness

**MUST:** stop and **ask the user** before Phase 2 when the site needs anything in the table below. Each one needs a server, and CloudCannon serves the static export.
**Why:** a site that depends on these either fails `next build` with `output: "export"`, or builds and then behaves differently on a static host. Removing them changes the site, so it is the user's call.

| Found                                                                            | Under `output: "export"`                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages Router (`pages/`, `getServerSideProps`, API routes)                        | Out of scope for this guide; moving to the App Router is an upgrade decision                                                                                                                  |
| `middleware.*` or `proxy.*`                                                      | Not run                                                                                                                                                                                       |
| `rewrites`, `redirects` or `headers` in the Next config                          | Build warns, and they don't apply                                                                                                                                                             |
| `i18n` in the Next config                                                        | Build fails                                                                                                                                                                                   |
| `revalidate` exports or `fetch(…, { next: { revalidate } })` (ISR)               | Not supported                                                                                                                                                                                 |
| Server actions (`"use server"`)                                                  | Not supported                                                                                                                                                                                 |
| `cookies()`, `headers()`, `draftMode()`                                          | Not supported                                                                                                                                                                                 |
| `export const dynamic = "force-dynamic"`                                         | Not supported                                                                                                                                                                                 |
| Route handlers other than `GET`, or a `GET` that reads the request               | Not supported; a `GET` that doesn't read the request builds to a static file                                                                                                                  |
| A dynamic route whose `generateStaticParams` is missing or returns an empty list | Build fails                                                                                                                                                                                   |
| `dynamicParams = true`                                                           | Build fails                                                                                                                                                                                   |
| Intercepting routes                                                              | Not supported                                                                                                                                                                                 |
| `next/image` with the default loader                                             | Build fails — fixed in Phase 5, see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export) |

Record for each finding: the file, what it does for the site, and whether a static equivalent exists (redirects as `<meta http-equiv="refresh">` pages or host routing, form posts to a third-party endpoint). `next/image` alone never blocks the migration.

Also record:

- **Next version** in `package.json`, and Node from `.nvmrc` or `engines` — the Node requirement is in [cloudcannon-configuration/nextjs/configuration.md § Build settings](../../cloudcannon-configuration/nextjs/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).
- **`output`** — already `"export"`, or unset. Unset with none of the blockers above means Phase 5 adds it.
- **`distDir`** — names the output directory; see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export).
- **`trailingSlash`** — decides the built path of every page, and so every collection `url`; see [cloudcannon-configuration/nextjs/collection-urls.md](../../cloudcannon-configuration/nextjs/collection-urls.md#trailing-slash-rule). When it's off, list internal links ending in `/` outside `<Link>`; they return 404 — see [§ Internal links](../../cloudcannon-configuration/nextjs/collection-urls.md#internal-links).
- **`basePath`** — the site is served from a sub-path; see [cloudcannon-configuration/nextjs/collection-urls.md § `basePath`](../../cloudcannon-configuration/nextjs/collection-urls.md#basepath).
- **`src/` directory** — whether the app lives at `app/` or `src/app/`. Paths below use `app/`.

## 2. Content sources

List where every page's content comes from:

- **Markdown and MDX files** — the folder (`content/`, `posts/`, `_posts/`), file count, and which route reads them.
- **MDX as route files** (`app/blog/hello/page.mdx`) — content mixed into the routing; Phase 3 moves it into a content folder.
- **Data files** — JSON or YAML, the folder, and which components import or read them.
- **Content in code** — arrays and objects in `.ts`/`.tsx` files (nav items, features, team members), and text written into JSX.
- **Fetches** — each `fetch()` in a server component, its endpoint, and the fields the page uses. They run at build time under export; Phase 3 replaces them with local files — see [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files).

For each content folder, record:

- **Front matter fields** — every key, its type, whether it is always present, and which component reads it. A site with no content layer has no schema, so this list becomes the CloudCannon schema file.
- **How it's read** — the loader module (`lib/posts.ts`, `utils/content.ts`): `fs` at module load or per call, the folder it reads, and how it builds the slug (file name, a `slug` field, a date prefix).
- **Front matter parser** — `gray-matter`, `js-yaml`, `front-matter`, or the content layer. With `gray-matter`, check what reaches client components against [content.md § The content loader](content.md#the-content-loader).
- **Markdown renderer** — `remark`/`unified`, `markdown-it`, `marked`, or MDX. Note plugins that change the output (heading IDs, syntax highlighting).

### MDX setup

| Found                                       | How MDX renders                                                     | Components come from                         |
| ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `@next/mdx` in the Next config              | `.mdx` files are pages or imports, compiled by the bundler          | `mdx-components.tsx`, plus `import` in files |
| `next-mdx-remote`                           | MDX strings read from files, rendered with `<MDXRemote>`            | The `components` prop at each render site    |
| `contentlayer`, `contentlayer2` or `velite` | A content layer compiles files into generated data before the build | The component map passed to its MDX renderer |

Record each component used in MDX bodies, with its props and how many files use it. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components). Inline components are snippet candidates for Phase 2 — see [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).

With a content layer, record its config file, the folders it reads and its output directory (`.contentlayer/`, `.velite/`). Editors change the source files; the output directory is never a collection.

Check each data file that holds like-shaped items (team members, FAQs) against the shape rule in [../content.md § Data collections](../content.md#data-collections).

## 3. Pages and routing

Map every route under `app/`:

- **Static routes** (`app/page.tsx`, `app/about/page.tsx`) and where each gets its content
- **Dynamic routes** (`app/blog/[slug]/page.tsx`) — what `generateStaticParams` returns, and where the param comes from (file name, front matter `slug`). This decides the collection `url`.
- **Catch-all routes** (`[...slug]`, `[[...slug]]`)
- **Route groups** (`(marketing)/`) — they don't appear in the URL
- **Listing and pagination pages** — built from a collection, not backed by their own content file
- **Generated files** — `sitemap.ts`, `robots.ts`, `GET` route handlers for feeds

## 4. Layouts and components

- **Root layout** (`app/layout.tsx`) and nested layouts — what each wraps (header, footer, providers).
- **Server and client components** — which components have `"use client"`, and which read files, call `fetch` or are `async`.
  **Why:** a component the Visual Editor re-renders runs in the browser, with its data only from props — see [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). A section that reads data itself is reshaped in Phase 4 to take props.
- **Section components** rendered by pages (hero, features, CTA, testimonials) and the props each takes.
- **Context providers** (theme, i18n, UI libraries) that section components depend on.
- **`next/image`** — which components use it, with local or remote sources.

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, site settings).

### Classifying static pages

Classify every route whose content isn't already in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); name each census row by its route file (`app/page.tsx`, `app/about/page.tsx`).

That section's two follow-on censuses in Next.js form:

| Census                  | Next.js form                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each route file: `{page.title}` is primitive; a ternary, `.map` over another collection, a lookup or a data-file import is computed. Target: zero computed values in route files — each moves into a component taking props |
| Frontmatter co-location | For each section component that will re-render in the editor: are its props one front matter key or one data file? If not, reshape before shipping                                                                              |

In Next.js the usual outcome is:

| Page                                                        | Pattern                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from section components | Page builder — `content_blocks` in a file under `content/pages/`; see [page-building.md](page-building.md)                                                                                                        |
| Blog posts, docs, case studies                              | Fixed-schema collection, rendered by a `[slug]` route                                                                                                                                                             |
| Listing pages with an editable intro                        | A file in the `pages` collection with its own schema                                                                                                                                                              |
| Legal and policy pages                                      | Markdown body in the `pages` collection                                                                                                                                                                           |
| One-off page with hard-coded text                           | A file in the `pages` collection; route files take no source regions — see [cloudcannon-configuration/nextjs/configuration.md § Route files](../../cloudcannon-configuration/nextjs/configuration.md#route-files) |
| `not-found.tsx`, `sitemap.ts`, feeds                        | Leave as code                                                                                                                                                                                                     |

## 5. Build pipeline

- The `build` script in `package.json`, and anything it runs before or after `next build` (search indexes, generated data, a content layer build).
- Environment variables the build reads (`.env*`, `process.env` in server components) — CMS tokens point at fetches Phase 3 removes.
- Existing hosting config (`vercel.json`, `netlify.toml`, `.github/workflows`) — redirects and headers there need a replacement on CloudCannon.

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`).
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global DOM scripts** — `document.querySelectorAll` in a `useEffect` or a `<Script>` that binds to component classes once.
  **Why:** markup the editor re-renders loses the behaviour — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Numbers displayed as text** — counters, prices and stats stored as numbers.
  **Why:** a text region rejects non-strings — see [Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Styled HTML in strings** — `dangerouslySetInnerHTML` on values holding classes or layout `<br>`. See [../content.md § Styled HTML in front matter](../content.md#styled-html-in-front-matter).
- **Scroll-reveal and entrance animations** — Framer Motion `initial={{ opacity: 0 }}`, `IntersectionObserver`, AOS. See [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/visual-editing-reference.md#scroll-reveal-and-entrance-animations).

## 7. Sectioning recommendation

Record total pages, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, write `.cloudcannon/migration/plan.md` from [orchestration.md § Sizing](../orchestration.md#sizing) and return. Phase 2 waits for the user's go on the plan.
