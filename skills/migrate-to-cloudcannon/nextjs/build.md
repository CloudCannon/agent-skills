# Build and Test (Next.js)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the Next.js additions: the export settings, Next's output, and the build command.

## Export settings

- **Verify** `output: "export"`, and `images` when the site uses `next/image`, are still set from Phase 2 — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export). `next build` then writes the whole site to `out/`, or to `distDir` when set.
- **Keep** the site's `trailingSlash`. It decides the built path of every page and the collection `url` patterns — see [cloudcannon-configuration/nextjs/collection-urls.md § Trailing slash rule](../../cloudcannon-configuration/nextjs/collection-urls.md#trailing-slash-rule). Changing the setting changes every public URL, so **ask the user** first. With it off, internal links outside `<Link>` go without a trailing slash — see [§ Internal links](../../cloudcannon-configuration/nextjs/collection-urls.md#internal-links).
- **Remove** `rewrites`, `redirects` and `headers` once the audit has a replacement for each. Export ignores them.

## Build verification checklist

- [ ] **Clean build.** Delete `.next/` and `out/` (or the `distDir`), then run the full build script.
- [ ] **Every page is in the output.** Each route from the audit has an `.html` file in `out/`, and each file in a `[slug]` collection has one. In the Pages Router, an empty `getStaticPaths` list builds without error, so count the pages per collection.
- [ ] **Counting regions.** `grep -rhoE 'data-editable="[a-z_-]+' out --include='*.html' | sort | uniq -c` lists each region type. Keep the grep to HTML: the `.txt` files beside each page hold the same markup as the React payload.
- [ ] **Images load.** Every `<img>` in `out/` points at a file under `out/` or a real remote host.
- [ ] **Base path.** On a site with `basePath`, the built pages load CSS, scripts and images under it.

## CloudCannon build command

- **Verify** the `build` script runs `next build` and every other step (search index, content layer), and `build.build_command` is `npm run build` — see [cloudcannon-configuration/nextjs/configuration.md § Build settings](../../cloudcannon-configuration/nextjs/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).
- **Set** `build.output_path` and `build.node_version` in `.cloudcannon/initial-site-settings.json` per the same section.

## Common issues

### `Page "/blog/[slug]" is missing "generateStaticParams()"`

The route's `generateStaticParams` is missing, or returned an empty list because its content folder is empty — see [content.md § `[slug]` routes](content.md#slug-routes).

### `pages with getServerSideProps can not be exported`

A Pages Router page uses `getServerSideProps`. The audit decided its replacement — move the data load into `getStaticProps` — see [audit.md § 1](audit.md#1-router-and-export-readiness).

### "Found pages with `fallback` enabled"

A Pages Router `getStaticPaths` returns `fallback: true` or `'blocking'` — set `fallback: false`, see [content.md § Pages Router data functions](content.md#pages-router-data-functions).

### `Error serializing … returned from getStaticProps`

A prop holds a `Date` or `undefined` — see [content.md § Pages Router data functions](content.md#pages-router-data-functions).

### "This build is using Turbopack, with a `webpack` config and no `turbopack` config"

From Next 16, `next build` uses Turbopack by default, and exits when the Next config has a `webpack` function. Remove the `webpack` function once nothing needs it, such as a glob-import loader replaced by a component map. Otherwise add `--webpack` to `next build` in the `build` script.

### `Image Optimization using the default loader is not compatible with export`

A `next/image` with the default loader — see [§ Export settings](#export-settings).
