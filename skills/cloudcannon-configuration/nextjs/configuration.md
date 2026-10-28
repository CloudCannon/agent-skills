# Configuration (Next.js)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Next.js, and its [Verification checklist](#verification-checklist) adds the Next.js items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg nextjs
```

**MUST:** pass `--ssg nextjs`.
**Why:** detection looks for `next.config.js` or `next.config.mjs` only, so a site with `next.config.ts` detects as `other`.

## Review the generated config

| Key or area                 | What the CLI produces                                                  | Fix                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `collections_config.*.url`  | **Nothing.** No collection gets a `url`                                | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md)                                      |
| `app` or `pages` collection | A collection over the route directory                                  | Remove it — see [§ Route files](#route-files)                                                                                     |
| `paths`                     | `static: ''`, `uploads: uploads`                                       | `static: public`, and `uploads` a folder under `public/` — see [§ Images](#images)                                                |
| `build.build_command`       | `npm run build`, or `npx next build && npx next export` with no script | `npm run build` — see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson). `next export` exits with an error |
| `build.node_version`        | Omitted, even when `.nvmrc` exists                                     | Apply the rule in [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson)                                        |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                           | Value                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                         | `"nextjs"`                                                                                                                                                                                          |
| `build.install_command`       | See [../build-commands.md § Package manager](../build-commands.md#package-manager)                                                                                                                  |
| `build.build_command`         | `npm run build`, where `build` runs `next build` plus every pre- and post-build step — see [../build-commands.md](../build-commands.md). A site with no `build` script gets `"build": "next build"` |
| `build.output_path`           | `"out"`, or the `distDir` value when `next.config` sets one                                                                                                                                         |
| `build.node_version`          | See [../build-commands.md § Node version](../build-commands.md#node-version). Next.js 16 needs Node 20.9 or later                                                                                   |
| `build.preserved_paths`       | Keep the CLI's `node_modules/,.next/` — `.next/` holds the build cache                                                                                                                              |
| `build.environment_variables` | The export variable, when production is hosted elsewhere — see [§ When production is hosted elsewhere](#when-production-is-hosted-elsewhere)                                                        |

## `next.config` for static export

**MUST:** set `output: "export"` in `next.config.(ts|mjs|js)`.
**Why:** without it `next build` writes only `.next/`, a server build, and there is no `out/` to upload.

```ts
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // only when the site uses next/image
};
```

**MUST:** set `images: { unoptimized: true }` (or a custom `images.loader`) when any file imports `next/image`.
**Why:** the default loader needs a server, so the build stops with "Image Optimization using the default loader is not compatible with export".

With `output: "export"`, a `distDir` setting names the export folder, not the cache: `distDir: "build"` writes the site to `build/`. Set `output_path` to it.

`trailingSlash` decides each page's built path — see [collection-urls.md](collection-urls.md).

### When production is hosted elsewhere

Keep the production build as it is, and gate `output: "export"` and `images.unoptimized` on a variable that only the CloudCannon build sets:

```ts
const staticExport = process.env.CLOUDCANNON_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(staticExport && { output: "export", images: { unoptimized: true } }),
};
```

Set the variable in `.cloudcannon/initial-site-settings.json`:

```json
"build": {
  "environment_variables": [{ "key": "CLOUDCANNON_EXPORT", "value": "true" }]
}
```

CloudCannon reads that file only when it creates the site. On an existing CloudCannon site, add the variable by hand in **Site Settings**.

### What changes under export

| The site has                                                                                                    | Under `output: "export"`                                           | Fix                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A `GET` route handler (`route.ts`)                                                                              | The export fails                                                   | Add `export const dynamic = "force-static"` to the file                                            |
| A metadata route file (`sitemap`, `robots`, `opengraph-image`, `twitter-image`, a generated `icon`, `manifest`) | The export fails, though a build without export lists it as static | Add `export const dynamic = "force-static"` to the file                                            |
| A page that reads `searchParams`                                                                                | The export fails                                                   | Filter on the client, or build a static route per value                                            |
| A `"use server"` module anywhere in the import graph                                                            | The export fails, even when nothing renders it                     | Remove it from the import chain, or ask the user                                                   |
| A non-`GET` route handler                                                                                       | Left out of the export, with no warning                            | Find its callers, including library components with a default API URL; the UI that calls it breaks |
| `fetch(…, { next: { revalidate } })`                                                                            | Builds, with the value fixed at build time                         | None                                                                                               |

## Collections

Content usually sits in a folder at the repository root (`content/pages`, `content/blog`), read with `node:fs` or a content library at build time. Each collection's `path` is the folder the loader reads.

**MUST NOT:** let editors create a file that no route builds. Set `disable_add: true` on a collection when each of its files has its own hard-coded route (`app/about/page.tsx` or `pages/about.jsx` calling `getPage("about")`).
**Why:** a static export builds only the paths the routes list. A new file builds only when a dynamic route's `generateStaticParams` or `getStaticPaths` reads the folder; with one route per file it never builds, and the Visual Editor has no page to open.

## String inputs

The rule is in [../configuration-gotchas.md § Choose text, markdown or html inputs](../configuration-gotchas.md#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field). In JSX:

| Component renders the field                                               | Input                |
| ------------------------------------------------------------------------- | -------------------- |
| `{description}` — React escapes it                                        | `text` or `textarea` |
| Through the site's markdown renderer, then `dangerouslySetInnerHTML`      | `markdown`           |
| `dangerouslySetInnerHTML={{ __html: description }}` with no markdown step | `html`               |

## Route files

Route files are the `.js`, `.jsx`, `.ts` and `.tsx` files under `app/` and `pages/`: `page.tsx` and `layout.tsx`, `_app`, `_document`, `api/` handlers and every page component.

**MUST NOT:** give route files a collection.
**Why:** the Visual Editor doesn't open route files, so editors can't edit a file the collection lists. Keep everything editors change — text, images, links, lists and page-builder blocks — in a content or data file that the route reads → [migrate-to-cloudcannon/nextjs/content.md § Content in route files](../../migrate-to-cloudcannon/nextjs/content.md#content-in-route-files).

## Data files

Next.js has no data directory. Use the folder the site imports its JSON from (often `data/` at the root, `import nav from "../data/nav.json"`) for the `data` collection and every `data_config` path.

- **Write** new data files as JSON. A JSON file imported directly needs no reader. A YAML file needs a reader in the site's code, such as the content loader with `js-yaml`.
- **Register** each data file a region binds as `@data[<name>]` in `data_config` — see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **Leave** values in `.ts` and `.js` modules read-only. CloudCannon edits JSON, YAML and front matter only. When editors need such a value, move it into a JSON file the module imports, after asking the user.

## Images

`next build` copies `public/` to the root of `out/`: `public/images/one.jpg` is served at `/images/one.jpg`.

```yaml
paths:
  static: public
  uploads: public/images
```

Use the folder the site already keeps images in under `public/`. An image imported in code (`import hero from "./hero.jpg"`) isn't a path editors can change; editable images are strings pointing into `public/`.

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these Next.js items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "nextjs"`
- [ ] `build.output_path` is `out`, or the `distDir` value
- [ ] `build.build_command` contains no `next export`
- [ ] The CloudCannon build runs with `output: "export"`
- [ ] The CloudCannon build runs with `images.unoptimized` (or a custom loader) if any file imports `next/image`
- [ ] Every route in [§ What changes under export](#what-changes-under-export) has its fix
- [ ] No collection over `app/` or `pages/`
- [ ] Collections whose files each have a hard-coded route have `disable_add: true`
- [ ] Every collection that builds pages has a `url` that resolves every file to its page in `out/`, with no `.html` — see [collection-urls.md](collection-urls.md)
- [ ] `paths.static` is `public`, and `paths.uploads` sits under it
- [ ] Every data file a region or template reads is JSON, or YAML parsed by a reader in the site's code
