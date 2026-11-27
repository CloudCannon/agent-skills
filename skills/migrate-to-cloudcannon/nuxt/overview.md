# Migration (Nuxt) — entry point

Guidance for migrating a Nuxt site to CloudCannon. Follow the phases in order. Before starting, run the [quick checks](#quick-checks) below to gather site information.

## Nuxt scope

This guide covers Nuxt 3 and Nuxt 4 sites that:

- Build with `nuxt generate`, or can switch to it — every page prerenders at build time and the build writes plain HTML to `.output/public`
- Read their content at build time — from Nuxt Content, from files the site loads itself, or from fetches during render

CloudCannon serves static output. A site that needs a server at request time (`server/api` routes the browser calls, server middleware, auth, per-request data) keeps `nuxt build` on its live host, and CloudCannon builds the prerendered pages with `nuxt generate` for editing — see [server-features.md](../../cloudcannon-configuration/server-features.md) and [cloudcannon-configuration/nuxt/configuration.md § When the live site needs a server](../../cloudcannon-configuration/nuxt/configuration.md#when-the-live-site-needs-a-server). [audit.md § 1](audit.md#1-static-generation-readiness) lists what needs a server.

A site with an earlier CloudCannon setup — the visual editor connector — keeps it until Phase 4 replaces it; [audit.md § Earlier CloudCannon setup](audit.md#earlier-cloudcannon-setup) routes it.

## Quick checks

Run these from the site root before the audit, and record the output in `.cloudcannon/migration/audit.md`. [audit.md](audit.md) says what each answer decides.

- **Versions and source directory** — Nuxt and Nuxt Content versions, and whether app code is under `app/`:

  ```sh
  grep -nE '"(nuxt|@nuxt/content|@nuxt/image|@nuxt/ui|@nuxt/ui-pro|vue)"' package.json
  ls -d app/pages pages app/components components 2>/dev/null
  ```

- **Nuxt config** — the build settings and the features static generation can't serve:

  ```sh
  find . -maxdepth 1 -name 'nuxt.config.*' -exec grep -HnE 'ssr|prerender|routeRules|nitro|baseURL|runtimeConfig|content:|image:|i18n|hooks' {} +
  ```

- **Content config** — Nuxt Content v3 collections:

  ```sh
  find . -maxdepth 1 -name 'content.config.*' -exec cat {} +
  ```

- **Server routes and middleware:**

  ```sh
  find server -type f -not -name 'tsconfig.json' 2>/dev/null
  find . app -maxdepth 2 -type d -name middleware -not -path './node_modules/*' 2>/dev/null
  ```

- **Calls the browser makes** — fetches in pages and components, then each one's options:

  ```sh
  grep -rnE --include='*.vue' --include='*.ts' --exclude-dir=node_modules --exclude-dir=.nuxt --exclude-dir=.output 'useFetch|useLazyFetch|useAsyncData|\$fetch|server: false|lazy: true' .
  ```

- **An earlier CloudCannon setup:**

  ```sh
  grep -nE '"@cloudcannon/[a-z-]+"|"@bookshop/' package.json
  ls cloudcannon.config.* .cloudcannon 2>/dev/null
  ```

- **Content and data files** outside the app code:

  ```sh
  find . \( -name '*.md' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' \) \
    -not -path '*/.*' -not -path '*/node_modules/*' -not -path './dist/*' \
    -not -name 'package*.json' -not -name 'tsconfig*.json' -not -name 'pnpm-*.yaml' \
    -not -path './README.md' -not -path './CHANGELOG.md'
  ```

- **Numeric ordering prefixes** on content files and folders (`1.guide/2.install.md`) — they change every collection `url`:

  ```sh
  find content -name '[0-9]*.*' 2>/dev/null | head
  ```

- **The unchanged static build** — install dependencies, run `nuxt generate`, and keep the log. Every `ERROR` line is a page that doesn't build; the page list is the baseline the migration must keep:

  ```sh
  mkdir -p .cloudcannon/migration
  npx nuxt generate 2>&1 | tee .cloudcannon/migration/generate.log | grep -E 'ERROR|WARN'
  find .output/public -name index.html | sort
  ```

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map static-generation readiness, content sources, pages, components and the build.

See [audit.md](audit.md). It sends you to [../audit.md](../audit.md) for classifying static pages.

### Phase 2: Configuration

Generate a baseline `cloudcannon.config.yml`, then customize it from the audit. If Nuxt Content markdown uses MDC components, configure snippets in this phase too.

**Read the `cloudcannon-configuration` skill** — its Nuxt entry point is [cloudcannon-configuration/nuxt/overview.md](../../cloudcannon-configuration/nuxt/overview.md). For MDC components, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/nuxt/overview.md](../../cloudcannon-snippets/nuxt/overview.md).

If the audit's census sends pages to a `pages` collection or page builder, read [../page-building.md](../page-building.md), then [page-building.md](page-building.md).

### Phase 3: Content

Move content into files editors can change, read by pages at build time.

Read [../content.md](../content.md), then [content.md](content.md) for Nuxt Content collections, content in `.vue` files and data files.

### Phase 4: Visual editing

Add `@cloudcannon/editable-regions` for inline editing in CloudCannon's Visual Editor.

**Read the `cloudcannon-visual-editing` skill** — its Nuxt entry point is [cloudcannon-visual-editing/nuxt/overview.md](../../cloudcannon-visual-editing/nuxt/overview.md). Follow its reading order.

### Phase 5: Build and test

Validate the migration end to end with [../build.md](../build.md), then [build.md](build.md) for the static build and the build command. Hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site whose content already lives in Nuxt Content may skip most of Phase 3.
- Visual editing (Phase 4) is optional but high-value.
