# Migration (Next.js) — entry point

> **Coverage: Partial.** This guide covers static export (`output: "export"`) with the App Router only.

Guidance for migrating a Next.js site to CloudCannon. Follow the phases in order. Before starting, run the [quick checks](#quick-checks) below to gather site information.

## Next.js scope

This guide covers Next.js sites that:

- Use the App Router (`app/` or `src/app/`)
- Build with `output: "export"`, or can switch to it — every page prerenders at build time, and `next build` writes plain HTML to `out/`
- Read their content at build time, from files in the repo or from fetches in server components

Sites that need a server (middleware or proxy, ISR, server actions, request-time data) and Pages Router sites are not covered — CloudCannon serves static output. [audit.md § 1](audit.md#1-router-and-export-readiness) lists what blocks static export.

## Quick checks

Run these from the site root before the audit, and record the output in `.cloudcannon/migration/audit.md`. [audit.md](audit.md) says what each answer decides.

- **Router** — `app/` is the App Router, `pages/` the Pages Router; a site can have both:

  ```sh
  ls -d app src/app pages src/pages 2>/dev/null
  ```

- **Next config** — the export settings and the settings static export can't serve:

  ```sh
  ls next.config.* 2>/dev/null
  grep -nE 'output|distDir|trailingSlash|basePath|images|unoptimized|loader|rewrites|redirects|headers|i18n' next.config.*
  ```

- **Middleware or proxy:**

  ```sh
  ls middleware.* proxy.* src/middleware.* src/proxy.* 2>/dev/null
  ```

- **Server-only features in the app** — set `APP` to `app` or `src/app`:

  ```sh
  grep -rnE 'revalidate|"use server"|cookies\(|headers\(|draftMode|dynamicParams|force-dynamic' "$APP"
  ```

- **Route handlers:**

  ```sh
  find "$APP" -name 'route.*'
  ```

- **Dynamic routes**, then each one's page without `generateStaticParams`:

  ```sh
  find "$APP" -type d -name '[[]*'
  grep -L generateStaticParams <each dynamic route dir>/page.*
  ```

- **`next/image`:**

  ```sh
  grep -rln 'next/image' "$APP" src components 2>/dev/null
  ```

- **Content and data files** outside the app code:

  ```sh
  find . \( -name '*.md' -o -name '*.mdx' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' \) -not -path './node_modules/*' -not -path './.next/*' -not -path './out/*' -not -name 'package*.json' -not -name 'tsconfig*.json'
  ```

- **Content tooling** in `package.json`:

  ```sh
  grep -nE '"(@next/mdx|@mdx-js/[a-z-]+|next-mdx-remote|contentlayer2?|next-contentlayer2?|velite|gray-matter|js-yaml|front-matter|remark|unified|markdown-it|marked)"' package.json
  ```

- **Fetches** in server components:

  ```sh
  grep -rn 'fetch(' "$APP"
  ```

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map the router, export readiness, content sources, routes, components and the build.

See [audit.md](audit.md). It sends you to [../audit.md](../audit.md) for classifying static pages.

### Phase 2: Configuration

Generate a baseline `cloudcannon.config.yml`, then customize it from the audit. If content uses MDX components or inline HTML, configure snippets in this phase too.

**Read the `cloudcannon-configuration` skill** — its Next.js entry point is [cloudcannon-configuration/nextjs/overview.md](../../cloudcannon-configuration/nextjs/overview.md). For MDX components, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/nextjs/overview.md](../../cloudcannon-snippets/nextjs/overview.md).

If the audit's census sends pages to a `pages` collection or page builder, read [../page-building.md](../page-building.md), then [page-building.md](page-building.md).

### Phase 3: Content

Move content into files editors can change, read by pages at build time.

Read [../content.md](../content.md), then [content.md](content.md) for the content loader, `[slug]` routes and data files.

### Phase 4: Visual editing

Add `@cloudcannon/editable-regions` for inline editing in CloudCannon's Visual Editor.

**Read the `cloudcannon-visual-editing` skill** — its Next.js entry point is [cloudcannon-visual-editing/nextjs/overview.md](../../cloudcannon-visual-editing/nextjs/overview.md). Follow its reading order.

### Phase 5: Build and test

Validate the migration end to end with [../build.md](../build.md), then [build.md](build.md) for the export settings and the build command. Hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site whose content already lives in Markdown files may skip most of Phase 3.
- Visual editing (Phase 4) is optional but high-value.
