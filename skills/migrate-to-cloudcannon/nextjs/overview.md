# Migration (Next.js) — entry point

Guidance for migrating a Next.js site to CloudCannon. Follow the phases in order. Before starting, run the [quick checks](#quick-checks) below to gather site information.

## Next.js scope

This guide covers Next.js sites that:

- Use the App Router (`app/` or `src/app/`), the Pages Router (`pages/` or `src/pages/`), or both
- Build with `output: "export"`, or can switch to it — every page prerenders at build time, and `next build` writes plain HTML to `out/`
- Read their content at build time — in server components (App Router) or `getStaticProps` and `getStaticPaths` (Pages Router), from files in the repo or from fetches

Sites that need a server (middleware or proxy, ISR, server actions, `getServerSideProps`, request-time data) are not covered — CloudCannon serves static output. [audit.md § 1](audit.md#1-router-and-export-readiness) lists what blocks static export.

A site with an earlier CloudCannon setup — the React connector, `@cloudcannon/filer` or Bookshop — keeps it until the phase that replaces it; [audit.md § Earlier CloudCannon setup](audit.md#earlier-cloudcannon-setup) routes each one.

## Quick checks

Run these from the site root before the audit, and record the output in `.cloudcannon/migration/audit.md`. [audit.md](audit.md) says what each answer decides.

- **Router** — `app/` is the App Router, `pages/` the Pages Router. A site can have both; each route follows its own router's rules, and the audit maps each directory separately:

  ```sh
  ls -d app src/app pages src/pages 2>/dev/null
  ```

  The checks below search both locations of a router, so each runs on its own. A router the site doesn't have prints nothing.

- **Pages Router export blockers and data functions:**

  ```sh
  grep -rnE 'getServerSideProps|getInitialProps|getStaticPaths|fallback:|useRouter|next/router' pages src/pages 2>/dev/null
  ls -d pages/api src/pages/api 2>/dev/null
  ```

- **An earlier CloudCannon setup** — the React connector, hand-written bindings, Filer and Bookshop:

  ```sh
  grep -nE '"@cloudcannon/(react-connector|filer)"|"@bookshop/' package.json
  grep -rln --exclude-dir=node_modules -E 'CloudCannonConnect|data-cms-bind|_bookshop_name' . | head
  ls .cloudcannon/prebuild .cloudcannon/postbuild component-library 2>/dev/null
  ```

- **Next config** — the export settings and the settings static export can't serve:

  ```sh
  find . -maxdepth 1 -name 'next.config.*' -exec grep -HnE 'output|distDir|trailingSlash|basePath|images|unoptimized|loader|rewrites|redirects|headers|i18n|process\.env' {} +
  ```

- **Middleware or proxy:**

  ```sh
  find . src -maxdepth 1 -type f \( -name 'middleware.*' -o -name 'proxy.*' \) 2>/dev/null
  ```

- **Server-only features** anywhere in the project, since a server module in the import graph fails the export even when nothing renders it:

  ```sh
  grep -rnE --include='*.[jt]s' --include='*.[jt]sx' --include='*.mjs' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=out 'revalidate|use server|unstable_cache|revalidateTag|revalidatePath|cookies\(|headers\(|draftMode|dynamicParams|force-dynamic|searchParams' .
  ```

- **Route handlers and metadata routes**, then each one without `force-static`:

  ```sh
  find app src/app -type f \( -name '*.[jt]s' -o -name '*.[jt]sx' \) 2>/dev/null | grep -E '/(route|sitemap|robots|manifest|icon|apple-icon|opengraph-image|twitter-image)\.'
  grep -L force-static <each file listed>
  ```

- **Server-rendered routes** — install dependencies, run the unchanged `build` script with the site's package manager, and list every route the build marks `ƒ` (Dynamic). Each one is an export blocker; [audit.md § 1](audit.md#1-router-and-export-readiness) maps it to its cause:

  ```sh
  <package manager> run build 2>&1 | grep 'ƒ'
  ```

- **Dynamic routes**, then each one's page without `generateStaticParams`:

  ```sh
  find app src/app -type d -name '[[]*' 2>/dev/null
  find <each dynamic route dir> -maxdepth 1 -name 'page.*' -exec grep -L generateStaticParams {} +
  ```

  In the Pages Router, dynamic routes are files, and each needs `getStaticPaths`:

  ```sh
  find pages src/pages -name '[[]*' 2>/dev/null
  ```

- **`next/image`:**

  ```sh
  grep -rln 'next/image' app pages src components 2>/dev/null
  ```

- **Content and data files** outside the app code:

  ```sh
  find . \( -name '*.md' -o -name '*.mdx' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' \) \
    -not -path '*/.*' -not -path '*/node_modules/*' -not -path './out/*' \
    -not -name 'package*.json' -not -name 'tsconfig*.json' -not -name 'pnpm-lock.yaml' \
    -not -path './README.md' -not -path './CHANGELOG.md'
  ```

- **Content tooling** in `package.json`:

  ```sh
  grep -nE '"(@next/mdx|@mdx-js/[a-z-]+|next-mdx-remote|contentlayer2?|next-contentlayer2?|velite|@content-collections/[a-z-]+|fumadocs-[a-z-]+|gray-matter|js-yaml|front-matter|remark|unified|markdown-it|marked)"' package.json
  ```

- **Fetches** in server components and data functions:

  ```sh
  grep -rn 'fetch(' app src/app pages src/pages 2>/dev/null
  ```

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map the router, export readiness, content sources, routes, components and the build.

See [audit.md](audit.md). It sends you to [../audit.md](../audit.md) for classifying static pages.

### Phase 2: Configuration

Generate a baseline `cloudcannon.config.yml`, then customize it from the audit. If content uses MDX components or inline HTML, configure snippets in this phase too.

**Set** `output: "export"`, and `images` when the site uses `next/image`, before the first build in this phase — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export). Checking collection `url`s against the build, and every later phase, reads `out/`.

**Read the `cloudcannon-configuration` skill** — its Next.js entry point is [cloudcannon-configuration/nextjs/overview.md](../../cloudcannon-configuration/nextjs/overview.md). For MDX components, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).

If the audit's census sends pages to a `pages` collection or page builder, read [../page-building.md](../page-building.md), then [page-building.md](page-building.md).

### Phase 3: Content

Move content into files editors can change, read by pages at build time.

Read [../content.md](../content.md), then [content.md](content.md) for the content loader, `[slug]` routes, `getStaticProps` and data files.

### Phase 4: Visual editing

Add `@cloudcannon/editable-regions` for inline editing in CloudCannon's Visual Editor.

**Read the `cloudcannon-visual-editing` skill** — its Next.js entry point is [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). Follow its reading order.

### Phase 5: Build and test

Validate the migration end to end with [../build.md](../build.md), then [build.md](build.md) for the export settings and the build command. Hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site whose content already lives in Markdown files may skip most of Phase 3.
- Visual editing (Phase 4) is optional but high-value.
