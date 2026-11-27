# Migration (SvelteKit) — entry point

Guidance for migrating a SvelteKit site to CloudCannon. Follow the phases in order. Before starting, run the [quick checks](#quick-checks) below to gather site information.

## SvelteKit scope

This guide covers SvelteKit 1 and 2, on Svelte 3, 4 or 5. The CloudCannon build is a static build with `@sveltejs/adapter-static`, so every page editors work on must prerender:

- **A site with no server features** switches to `adapter-static` everywhere, and CloudCannon can host it.
- **A site with server features** (auth, accounts, form actions, endpoints the browser calls) keeps its adapter for the live site. The CloudCannon build switches adapter on a variable — see [cloudcannon-configuration/sveltekit/configuration.md § When the live site needs a server](../../cloudcannon-configuration/sveltekit/configuration.md#when-the-live-site-needs-a-server).

[audit.md § 1](audit.md#1-static-output-readiness) lists what decides which one a site is.

A site with an earlier CloudCannon setup (Bookshop, or the Svelte connector) keeps it until Phase 4 replaces it; [audit.md § Earlier CloudCannon setup](audit.md#earlier-cloudcannon-setup) routes it.

## Quick checks

Run these from the site root before the audit, and record the output in `.cloudcannon/migration/audit.md`. [audit.md](audit.md) says what each answer decides.

- **Versions** — Svelte, SvelteKit, Vite, the adapter and the markdown tooling:

  ```sh
  grep -nE '"(svelte|@sveltejs/[a-z-]+|vite|mdsvex|marked|velite|@content-collections/[a-z-]+)"' package.json
  ```

- **SvelteKit config** — the adapter, prerender settings, file extensions and preprocessors:

  ```sh
  find . -maxdepth 1 -name 'svelte.config.*' -exec cat {} +
  ```

- **Page options** set in routes:

  ```sh
  grep -rnE 'export const (prerender|trailingSlash|ssr|csr)' src/routes
  ```

- **Server-only files** — server loads, endpoints, form actions and hooks:

  ```sh
  find src -name '+page.server.*' -o -name '+layout.server.*' -o -name '+server.*' -o -name 'hooks.server.*'
  grep -rln 'export const actions' src/routes
  ```

- **Environment variables** the code imports:

  ```sh
  grep -rnoE '\$env/(static|dynamic)/(private|public)' src | sort | uniq -c
  ```

- **Calls the browser makes** to the site's own endpoints, and forms:

  ```sh
  grep -rnE --include='*.svelte' --include='*.js' --include='*.ts' "fetch\(|use:enhance|method=\"post\"|<form" src
  ```

- **An earlier CloudCannon setup:**

  ```sh
  grep -nE '"@cloudcannon/[a-z-]+"|"@bookshop/' package.json
  ls cloudcannon.config.* .cloudcannon 2>/dev/null
  ```

- **Content and data files:**

  ```sh
  find . \( -name '*.md' -o -name '*.svx' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' \) \
    -not -path '*/.*' -not -path '*/node_modules/*' -not -path './build/*' \
    -not -name 'package*.json' -not -name 'tsconfig*.json' -not -name 'pnpm-*.yaml' \
    -not -path './README.md' -not -path './CHANGELOG.md'
  ```

- **The unchanged build** — install dependencies, run the build, and keep the log. Under `adapter-static`, the HTML files in `build/` are the baseline page list the migration must keep:

  ```sh
  mkdir -p .cloudcannon/migration
  npm run build 2>&1 | tee .cloudcannon/migration/build.log | grep -iE 'error|warn'
  find build -name '*.html' | sort
  ```

  Under another adapter, the build writes a server app; list the routes under `src/routes` as the baseline instead.

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map static output readiness, content sources, routes, components and the build.

See [audit.md](audit.md). It sends you to [../audit.md](../audit.md) for classifying static pages.

### Phase 2: Configuration

Generate a baseline `cloudcannon.config.yml`, then customize it from the audit. Set up the CloudCannon build's adapter and prerendering in this phase. If markdown bodies use Svelte components, configure snippets in this phase too.

**Read the `cloudcannon-configuration` skill** — its SvelteKit entry point is [cloudcannon-configuration/sveltekit/overview.md](../../cloudcannon-configuration/sveltekit/overview.md). For components in markdown, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/sveltekit/overview.md](../../cloudcannon-snippets/sveltekit/overview.md).

If the audit's census sends pages to a `pages` collection or page builder, read [../page-building.md](../page-building.md), then [page-building.md](page-building.md).

### Phase 3: Content

Move content into files editors can change, read by pages at build time.

Read [../content.md](../content.md), then [content.md](content.md) for content folders, mdsvex, content in `.svelte` and `.ts` files, and data files.

### Phase 4: Visual editing

Add `@cloudcannon/editable-regions` for inline editing in CloudCannon's Visual Editor.

**Read the `cloudcannon-visual-editing` skill** — its SvelteKit entry point is [cloudcannon-visual-editing/sveltekit/overview.md](../../cloudcannon-visual-editing/sveltekit/overview.md). Follow its reading order.

### Phase 5: Build and test

Validate the migration end to end with [../build.md](../build.md), then [build.md](build.md) for the static build and the build command. Hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site whose content already lives in markdown files may skip most of Phase 3.
- Visual editing (Phase 4) is optional but high-value.
