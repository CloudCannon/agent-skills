# Configuration (Next.js)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Next.js, and its [Verification checklist](#verification-checklist) adds the Next.js items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg nextjs
```

**MUST:** pass `--ssg nextjs`.
**Why:** detection looks for `next.config.js` or `next.config.mjs` only, so a site with `next.config.ts` detects as `other`.

## Review the generated config

| Key or area                | What the CLI produces                                                  | Fix                                                                                             |
| -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `collections_config.*.url` | **Nothing.** No collection gets a `url`                                | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md)    |
| `app` collection           | A collection over the route directory                                  | Remove it. Route files open only through source regions — see [§ Route files](#route-files-tsx) |
| `paths`                    | `static: ''`, `uploads: uploads`                                       | `static: public`, and `uploads` a folder under `public/` — see [§ Images](#images)              |
| `build.build_command`      | `npm run build`, or `npx next build && npx next export` with no script | `npx next build` when there is no `build` script. `next export` exits with an error             |
| `build.node_version`       | Omitted, even when `.nvmrc` exists                                     | Apply the rule in [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson)      |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                     | Value                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                   | `"nextjs"`                                                                                                                                          |
| `build.install_command` | From the detected package manager (`npm i`)                                                                                                         |
| `build.build_command`   | `npm run build`, where `build` runs `next build` plus every pre- and post-build step — see [../build-commands.md](../build-commands.md)             |
| `build.output_path`     | `"out"`, or the `distDir` value when `next.config` sets one                                                                                         |
| `build.node_version`    | `"file"` if `.nvmrc` or `.node-version` exists; otherwise the major version from `package.json` `engines.node`. Next.js 16 needs Node 20.9 or later |
| `build.preserved_paths` | Keep the CLI's `node_modules/,.next/` — `.next/` holds the build cache                                                                              |

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

## Collections

Content usually sits in a folder at the repository root (`content/pages`, `content/blog`), read with `node:fs` or a content library at build time. Each collection's `path` is the folder the loader reads.

**MUST NOT:** let editors create a file that no route builds. Set `disable_add: true` on a collection when each of its files has its own hard-coded route (`app/about/page.tsx` calling `getPage("about")`).
**Why:** a static export builds only the paths the routes list. A new file builds only when a dynamic route's `generateStaticParams` reads the folder; with one route per file it never builds, and the Visual Editor has no page to open.

## Route files (`.tsx`)

`page.tsx` and other route files aren't content. Editors reach their text only through source regions (`data-editable="source"`) — see [visual-editing-reference.md § When to use source editables](../../cloudcannon-visual-editing/visual-editing-reference.md#when-to-use-source-editables). Give the route files that have source regions their own collection, with a glob naming only those files:

```yaml
collections_config:
  source_pages:
    path: app/contact
    glob:
      - page.tsx
    url: /contact.html
    include_developer_files: true
    disable_add: true
    disable_add_folder: true
    disable_file_actions: true
    _enabled_editors:
      - visual
```

For several route files, set `path: app` and list each (`contact/page.tsx`), with `url: "/[relative_base_path].html"`. The URL follows the `trailingSlash` setting like any other — see [collection-urls.md](collection-urls.md). `app/page.tsx` sits at the collection root, so `[relative_base_path]` is empty and the pattern computes `/.html`, which isn't the home page's path. Give it its own collection with `url: /`, as in the single-file example above.

## Data files

Next.js has no data directory. Use the folder the site imports its JSON from (often `data/` at the root, `import nav from "../data/nav.json"`) for the `data` collection and every `data_config` path.

- **Write** new data files as JSON. A JSON file imported directly needs no reader. A YAML file needs a reader in the site's code, such as the content loader with `js-yaml`.
- **Register** each data file a region binds as `@data[<name>]` in `data_config` — see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **Leave** values in `.ts` and `.js` modules read-only. CloudCannon edits JSON, YAML and front matter only. When editors need such a value, move it into a JSON file the module imports, after asking the user.

## Images

`next build` copies `public/` to the root of `out/`: `public/uploads/one.jpg` is served at `/uploads/one.jpg`.

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
- [ ] `next.config` sets `output: "export"`
- [ ] `next.config` sets `images.unoptimized` (or a custom loader) if any file imports `next/image`
- [ ] No collection over `app/` except one naming route files with source regions
- [ ] Collections whose files each have a hard-coded route have `disable_add: true`
- [ ] Every collection that builds pages has a `url` matching `out/` for every file — see [collection-urls.md](collection-urls.md)
- [ ] `paths.static` is `public`, and `paths.uploads` sits under it
- [ ] Every data file a region or template reads is JSON, or YAML parsed by a reader in the site's code
