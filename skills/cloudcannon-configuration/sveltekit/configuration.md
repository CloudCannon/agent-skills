# Configuration (SvelteKit)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for SvelteKit, and its [Verification checklist](#verification-checklist) adds the SvelteKit items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg sveltekit
```

## Review the generated config

| Key or area          | What the CLI produces                                         | Fix                                                                                |
| -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `collections_config` | Collections over `src`, `src/routes` and `src/lib/components` | Remove them — see [§ Route and component files](#route-and-component-files)        |
| `collections_config` | A collection per content folder it finds, with no `url`       | Keep the content folders, each with a `url` — see [§ Collections](#collections)    |
| `build.output_path`  | `build`                                                       | Right only under `adapter-static` — see [§ Static output](#static-output)          |
| `paths`              | `static: ''`, `uploads: uploads`                              | `static: static`, and `uploads` a folder under `static/` — see [§ Images](#images) |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                           | Value                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                         | `"sveltekit"`                                                                                                                                                                                 |
| `build.install_command`       | See [../build-commands.md § Package manager](../build-commands.md#package-manager)                                                                                                            |
| `build.build_command`         | The `build` script with the site's package manager (`npm run build`, `pnpm build`), where `build` runs `vite build` plus every pre- and post-build step                                       |
| `build.output_path`           | `"build"`, or the `pages` option the site passes to `adapter-static`                                                                                                                          |
| `build.node_version`          | See [../build-commands.md § Node version](../build-commands.md#node-version)                                                                                                                  |
| `build.environment_variables` | `PUBLIC_CLOUDCANNON_BUILD` when the live site needs a server, and a placeholder for each `$env/static/private` name the build imports — see [§ Environment variables](#environment-variables) |

## Static output

SvelteKit writes a static site only with `@sveltejs/adapter-static`, and only for routes that prerender. Every other adapter (`adapter-auto`, `adapter-node`, `adapter-vercel`, `adapter-cloudflare`) builds a server app, and its output isn't a folder CloudCannon can serve.

| The site has                                               | Fix                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `adapter-static`, `prerender = true` in the root `+layout` | None                                                                                                        |
| Another adapter, and nothing that needs a server           | Switch to `adapter-static`, and export `prerender = true` from the root `+layout.js`, after asking the user |
| Another adapter, and features that need a server           | Keep it for the live site → [§ When the live site needs a server](#when-the-live-site-needs-a-server)       |

`adapter-static` fails the build on a route it can't prerender, and names it. What stops a page prerendering:

| The page has                           | Fix                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Form `actions` in `+page.server.js`    | SvelteKit won't prerender it. See [migrate-to-cloudcannon/audit.md § Forms](../../migrate-to-cloudcannon/audit.md#forms) |
| A `load` that reads `url.searchParams` | Filter in the browser, or build a route per value                                                                        |
| `prerender = false` on the route       | Leave it out of the CloudCannon build when editors don't open it; otherwise ask the user                                 |

A `+page.server.js` `load` with none of these prerenders: it runs at build time. A `load` that reads cookies prerenders too, as a visitor with no cookies, so a page that differs per visitor shows its signed-out state.

### Every page must be prerendered

**MUST:** make every page a collection file builds reachable to the prerender. SvelteKit prerenders the routes in `kit.prerender.entries` (`"*"` by default: every route without a parameter), then every page it finds by following `<a href>` links. A `[slug]` page that nothing links to isn't built, with no warning.
**Why:** an unbuilt page has no HTML for the Visual Editor to open. A new file an editor creates is the usual case: it builds only once a list page links to it.

Export `entries` from every dynamic route whose pages come from content files, reading the same files the `load` reads:

```js
// src/routes/blog/[slug]/+page.js
export function entries() {
  const files = import.meta.glob("/src/lib/posts/*.md");
  return Object.keys(files).map((path) => ({ slug: path.split("/").pop().replace(/\.md$/, "") }));
}
```

A dynamic route that `entries` and links never reach fails the build with "marked as prerenderable, but were not prerendered" (`prerender.handleUnseenRoutes`, default `"fail"`). An `entries` that can return an empty list hits this, such as pagination over a folder with few files: always return the first page.

**MUST NOT:** rely on a successful build alone. `prerender.handleHttpError: "warn"` and `adapter-static({ strict: false })` both let the build pass with pages missing; check the build against every file → [collection-urls.md § Listing the build](collection-urls.md#listing-the-build).

### When the live site needs a server

The rules are in [../server-features.md](../server-features.md). The live site keeps its adapter; the CloudCannon build switches to `adapter-static`. Read the variable in `svelte.config.js`:

```js
import adapterAuto from "@sveltejs/adapter-auto";
import adapterStatic from "@sveltejs/adapter-static";

const cloudcannonBuild = process.env.PUBLIC_CLOUDCANNON_BUILD === "true";

export default {
  kit: {
    adapter: cloudcannonBuild ? adapterStatic({ strict: false }) : adapterAuto(),
  },
};
```

`strict: false` lets the build leave out routes with `prerender = false`. Then gate each change in a server file, where `process.env` is readable:

| Change                               | Where                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prerender editors' pages             | The root `+layout.server.js`: `export const prerender = cloudcannonBuild \|\| <the site's value>`                                                                                                  |
| Pass the flag to components          | The same file: `export const load = () => ({ cloudcannonBuild })`, read as `data.cloudcannonBuild` in pages and layouts                                                                            |
| Prerender a page with form `actions` | Its `+page.server.js`: `export const actions = cloudcannonBuild ? undefined : { … }`; the form then follows [migrate-to-cloudcannon/audit.md § Forms](../../migrate-to-cloudcannon/audit.md#forms) |
| Leave out a route editors don't open | Keep its `prerender = false`; `strict: false` skips it                                                                                                                                             |

**MUST NOT:** read the variable through `$env/static/public`. The live build fails when the variable isn't set there (`"PUBLIC_CLOUDCANNON_BUILD" is not exported`).

Since `strict: false` hides every unbuilt page, check the CloudCannon build against every collection file → [collection-urls.md § Listing the build](collection-urls.md#listing-the-build).

### Environment variables

**MUST:** give the CloudCannon build a placeholder value for every `$env/static/private` name the build imports, in `hooks.server.js` or any server file. A missing name fails the build (`"<NAME>" is not exported by "virtual:env/static/private"`), even when every page prerenders.

Hooks run for every prerendered page, so a hook that calls a service must skip the call in the CloudCannon build. The real secret stays on the live host → [../server-features.md § Keep server secrets on the live host](../server-features.md#keep-server-secrets-on-the-live-host).

## Collections

SvelteKit has no content layer. Read the `load` functions and the modules they call (`import.meta.glob`, `node:fs`, a content library) for every folder a page reads; each collection's `path` is one of those folders.

| Content lives in                                              | Collection                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| mdsvex files (`src/lib/posts/*.md`, `src/posts/*.svx`)        | The folder, with a `glob` for the extensions the site's mdsvex config lists, double ones included (`*.svelte.md`)                                 |
| `+page.md` route files                                        | See [collection-urls.md § Route folders give the path](collection-urls.md#route-folders-give-the-path)                                            |
| A folder outside `src/` (`content/`, `data/`)                 | The folder                                                                                                                                        |
| A content library's collections (velite, content-collections) | One per collection in the library's config, with `path` from its file pattern                                                                     |
| Arrays in `.ts` or `.js` modules, or copy in `.svelte` files  | Nothing yet. Move the content into files first → [migrate-to-cloudcannon/sveltekit/content.md](../../migrate-to-cloudcannon/sveltekit/content.md) |

## Route and component files

**MUST NOT:** give `.svelte` files a collection — routes, layouts or components.
**Why:** CloudCannon doesn't edit Svelte components, so editors can't edit a file the collection lists. Keep everything editors change in a content or data file that the page reads.

## String inputs

The rule is in [../configuration-gotchas.md § Choose text, markdown or html inputs](../configuration-gotchas.md#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field). In Svelte templates:

| Component renders the field                             | Input                |
| ------------------------------------------------------- | -------------------- |
| `{description}` — Svelte escapes it                     | `text` or `textarea` |
| `{@html marked(description)}`, or another markdown step | `markdown`           |
| `{@html description}` with no markdown step             | `html`               |

An mdsvex body that uses Svelte components needs snippets before the Content Editor can open it, and braces in its text break the build → [cloudcannon-snippets/sveltekit/overview.md § mdsvex](../../cloudcannon-snippets/sveltekit/overview.md#mdsvex).

## Data files

- **Use** the folder the site imports its JSON from for every `data_config` path. A YAML file needs a reader in the site's code.
- **Register** each data file a region binds as `@data[<name>]` in `data_config` — see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **Leave** values in `.ts` and `.js` modules read-only (`src/lib/config.js`). CloudCannon can't parse them into inputs — see [../configuration-gotchas.md § Data file formats](../configuration-gotchas.md#data-file-formats). When editors need such a value, move it into a JSON or YAML data file, after asking the user.

## Images

Editable images are strings in content or data: a path (`/images/hero.jpg`) or a full URL.

**MUST NOT:** move images or change their stored paths for CloudCannon. Keep the paths the live site uses, and make each one show an image in the CloudCannon build.

| The site's images                       | In the CloudCannon build                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Files under `static/`                   | The build copies `static/` to the output root                                                            |
| Files under `src/lib/assets/`, imported | Content stores the repo path, and code maps it to the import — see [§ Imported images](#imported-images) |
| Full URLs on an image host or CDN       | Leave them                                                                                               |

### Files under `static/`

Set `paths.uploads` to the folder the images are already in:

```yaml
paths:
  static: static
  uploads: static/images
```

### Imported images

Content stores each image's repo path (`/src/lib/assets/images/hero.jpg`), and a module maps the path to its bundled URL with `import.meta.glob`, whose keys are those paths:

```js
// src/lib/images.js
const images = import.meta.glob("/src/lib/assets/images/*", { eager: true, import: "default" });

export function resolveImage(path) {
  return images[path] ?? path;
}
```

A path the map doesn't know, such as an upload since the last build, falls back to the raw string. Give each image input its own upload paths, so uploads land in the mapped folder with the path the map expects:

```yaml
_inputs:
  image:
    type: image
    options:
      paths:
        uploads: /src/lib/assets/images
        static: ""
```

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these SvelteKit items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "sveltekit"`
- [ ] The CloudCannon build uses `adapter-static`, and `build.output_path` is its output folder
- [ ] Every page a collection file builds is in the output folder — see [§ Every page must be prerendered](#every-page-must-be-prerendered)
- [ ] Every dynamic route whose pages come from content files exports `entries`
- [ ] Every `$env/static/private` name the build imports has a value in the CloudCannon build
- [ ] No collection over `.svelte` files
- [ ] Every collection that builds pages has a `url` that resolves every file to its page in the output folder — see [collection-urls.md](collection-urls.md)
- [ ] Every stored image path or URL shows an image in the CloudCannon build, with the live site's paths unchanged — see [§ Images](#images)
