# Configuration (Nuxt)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Nuxt, and its [Verification checklist](#verification-checklist) adds the Nuxt items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg nuxtjs
```

**MUST:** pass `--ssg nuxtjs`.
**Why:** detection looks for `nuxt.config.ts` only. A site with `nuxt.config.js` or `nuxt.config.mjs` detects as `other`, and gets no output path.

## Review the generated config

| Key or area           | What the CLI produces                                                                   | Fix                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `collections_config`  | One `content` collection over every content file, with no `url`                         | One collection per Nuxt Content collection, each with a `url` — see [§ Collections](#collections)    |
| `collections_config`  | Collections over the repository root (`path: ''`), `app/` or `pages/`                   | Remove them — see [§ Page and component files](#page-and-component-files)                            |
| `build.build_command` | The `build` script, run with the site's package manager (`npm run build`, `pnpm build`) | The `generate` script — see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson) |
| `build.output_path`   | `dist`                                                                                  | `.output/public`                                                                                     |
| `paths`               | `static: ''`, `uploads: uploads`                                                        | `static: public`, and `uploads` a folder under `public/` — see [§ Images](#images)                   |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                           | Value                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                         | `"nuxtjs"`                                                                                                                                                                                                                                                                                     |
| `build.install_command`       | See [../build-commands.md § Package manager](../build-commands.md#package-manager)                                                                                                                                                                                                             |
| `build.build_command`         | The `generate` script with the site's package manager (`npm run generate`, `pnpm generate`), where `generate` runs `nuxt generate` plus every pre- and post-build step — see [../build-commands.md](../build-commands.md). A site with no `generate` script gets `"generate": "nuxt generate"` |
| `build.output_path`           | `".output/public"`                                                                                                                                                                                                                                                                             |
| `build.node_version`          | See [../build-commands.md § Node version](../build-commands.md#node-version). Nuxt 4 needs Node 20.19 or later, and Nuxt Content's native SQLite connector Node 22.13                                                                                                                          |
| `build.preserved_paths`       | Keep the CLI's `node_modules/,.nuxt/`                                                                                                                                                                                                                                                          |
| `build.environment_variables` | `PUBLIC_CLOUDCANNON_BUILD`, when the live site needs a server — see [§ When the live site needs a server](#when-the-live-site-needs-a-server)                                                                                                                                                  |

**MUST:** build with `nuxt generate`, never `nuxt build`.
**Why:** `nuxt build` is a server build. It writes HTML only for the routes the config marks to prerender (`prerender`, `routeRules`), and every other page exists only in `.output/server/`, which CloudCannon doesn't serve.

**MUST NOT:** set `output_path` to `dist`. `nuxt generate` creates `dist` as a link to `.output/public`; use the real folder.

The `generate` script is the static build in the Nuxt starters, beside a `build` script for server hosting, so the CloudCannon build runs it and the live site's `build` stays as it is. Every step the build needs goes in `generate`, the same way [../build-commands.md § The build script](../build-commands.md#the-build-script) puts them in `build`.

## Static generation

`nuxt generate` renders every page it reaches at build time and writes plain HTML, plus a `_payload.json` per page that holds its data for client-side navigation. Nothing on the server side ships.

| The site has                                                                                     | In the static build                                                     | Fix                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFetch` or `$fetch` to a `server/api` route during render                                     | Runs at build time; the response is baked into the page and its payload | None                                                                                                                                                      |
| A fetch to `server/api` from the browser (`lazy`, `server: false`, a click handler, a form post) | Returns 404 — no server ships                                           | When the live site needs a server, see [§ When the live site needs a server](#when-the-live-site-needs-a-server); otherwise ask the user what replaces it |
| `runtimeConfig` read at render                                                                   | Fixed at build time; `NUXT_*` overrides set after the build do nothing  | Set the variables in the CloudCannon build                                                                                                                |
| `ssr: false`                                                                                     | Every page is an empty shell rendered in the browser                    | Ask the user before turning SSR on; see [migrate-to-cloudcannon/nuxt/audit.md](../../migrate-to-cloudcannon/nuxt/audit.md)                                |
| A page whose render throws                                                                       | `nuxt generate` logs `ERROR [request error]` and leaves the page out    | Fix the page                                                                                                                                              |

### Every page must be reachable

**MUST:** make every page a collection file builds reachable to `nuxt generate`. It builds `/`, every page file without a dynamic segment, and every page it finds by following `<a href>` links from those; a dynamic page that nothing links to isn't built.
**Why:** an unbuilt page has no HTML for the Visual Editor to open, and the build reports nothing. A new file an editor creates is the usual case: it builds only once a list page links to it.

When every file in a collection appears on a list page that is built, nothing more is needed. Otherwise add the routes in `nuxt.config.ts` from the content folder:

```ts
import { readdirSync } from "node:fs";

export default defineNuxtConfig({
  hooks: {
    "prerender:routes"({ routes }) {
      for (const file of readdirSync("content/blog")) {
        if (file.endsWith(".md")) routes.add(`/blog/${file.replace(/\.md$/, "")}`);
      }
    },
  },
});
```

Add each route as the path the page builds at: strip numeric ordering prefixes, and add an `index` file as its folder's path. A route the page can't render logs an `ERROR [request error]` during `nuxt generate`; check the log for one.

**MUST NOT:** let editors create a file that no page builds. Set `disable_add: true` on a collection when each of its files has its own hard-coded page (`pages/about.vue` loading `about.yml`).

### When the live site needs a server

The rules are in [../server-features.md](../server-features.md). The live site keeps `nuxt build` on a host that runs its server; the CloudCannon build runs `nuxt generate`, as above, so `server/` handlers never ship in it.

Read the CloudCannon build's variable in `nuxt.config.ts`, and pass it to the app as public runtime config:

```ts
const editorBuild = process.env.PUBLIC_CLOUDCANNON_BUILD === "true";

export default defineNuxtConfig({
  runtimeConfig: { public: { editorBuild } },
  nitro: { prerender: { ignore: editorBuild ? ["/account", "/login"] : [] } },
});
```

A runtime config value read from a variable with its own name is fixed at build time, which is when both builds read it. Keys under `public` reach the browser too.

Branch on `useRuntimeConfig().public.editorBuild` for each server feature on an editor-owned page:

| The page has                                                                                                               | In the CloudCannon build                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markup filled by a browser fetch to `server/api` (`server: false`)                                                         | Render the markup with example data, through a view component both branches share                                                                                                                                                                                                |
| A click handler or form post to `server/api`                                                                               | Render it, and skip the call under `window.inEditorMode`, read in client code — see [cloudcannon-visual-editing/nuxt/visual-editing-reference.md § Detecting the editor in Nuxt](../../cloudcannon-visual-editing/nuxt/visual-editing-reference.md#detecting-the-editor-in-nuxt) |
| A page that fails to prerender, because its server code needs something the CloudCannon build lacks (a database, a secret) | Leave it out of the crawl with `nitro.prerender.ignore`, gated on the variable as above; each entry matches routes by prefix                                                                                                                                                     |

```vue
<script setup lang="ts">
const { editorBuild } = useRuntimeConfig().public;
</script>

<template>
  <SeatsView v-if="editorBuild" :seats="42" :label="label" />
  <Seats v-else :label="label" />
</template>
```

`Seats` fetches from `/api/seats` in the browser and renders `SeatsView` with the result.

A server-only page that prerenders, such as a sign-in page in its signed-out state, stays in the CloudCannon build. Only a page that fails goes in `ignore`.

## Collections

### Nuxt Content

Each Nuxt Content collection in `content.config.ts` names its files with `source`, relative to `content/`. Give each one a CloudCannon collection whose `path` is the folder its `source` glob matches.

| Nuxt Content collection          | CloudCannon                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `type: "page"`                   | A collection with a `url` — see [collection-urls.md](collection-urls.md) |
| `type: "data"`, a file per entry | A collection with `disable_url: true`                                    |
| `type: "data"`, one file         | A `data_config` entry, and an entry in a collection for editing          |

**MUST:** add every field editors can set to the Nuxt Content collection's `schema`.
**Why:** front matter keys missing from the schema end up under `meta`, so a template reading `page.subtitle` gets nothing, and a `.where()` on the field fails.

**MUST NOT:** give two CloudCannon collections, or two Nuxt Content collections, the same files. Nuxt Content requires each file to belong to one collection.

Files under `content/` that no `source` matches are not parsed when `content.config.ts` exists, so a CloudCannon collection over them edits files the site never reads.

### Without Nuxt Content

Content usually sits in a folder at the repository root (`content/`, `data/`), loaded with `import.meta.glob`, `node:fs` or a JSON `import`. Each collection's `path` is the folder the loader reads.

## Page and component files

**MUST NOT:** give `.vue` files a collection — pages, layouts, components or `app.vue`.
**Why:** CloudCannon doesn't edit Vue single-file components, so editors can't edit a file the collection lists. Keep everything editors change in a content or data file that the page reads → [migrate-to-cloudcannon/nuxt/content.md](../../migrate-to-cloudcannon/nuxt/content.md).

## String inputs

The rule is in [../configuration-gotchas.md § Choose text, markdown or html inputs](../configuration-gotchas.md#choose-text-markdown-or-html-inputs-from-how-the-template-renders-the-field). In Vue templates:

| Component renders the field                                        | Input                |
| ------------------------------------------------------------------ | -------------------- |
| `{{ description }}` — Vue escapes it                               | `text` or `textarea` |
| `<ContentRenderer>`, or the site's markdown renderer then `v-html` | `markdown`           |
| `<MDC :value="description">` — parsed as markdown at render        | `markdown`           |
| `v-html="description"` with no markdown step                       | `html`               |

A Nuxt Content markdown body that uses MDC components (`::callout`) needs snippets before the Content Editor can open it → [cloudcannon-snippets/nuxt/overview.md](../../cloudcannon-snippets/nuxt/overview.md).

## Data files

- **Nuxt Content data collections** hold one entry per YAML or JSON file. A JSON file holds one object; a top-level array doesn't parse into entries.
- **Without Nuxt Content,** use the folder the site imports its JSON from (often `data/`) for every `data_config` path. A YAML file needs a reader in the site's code.
- **Register** each data file a region binds as `@data[<name>]` in `data_config` — see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **Leave** values in `app.config.ts` and other `.ts` modules read-only. CloudCannon can't parse them into inputs — see [../configuration-gotchas.md § Data file formats](../configuration-gotchas.md#data-file-formats). When editors need such a value, move it into a JSON or YAML data file, after asking the user.

## Images

Editable images are strings in content or data: a path (`/images/hero.jpg`) or a full URL.

**MUST NOT:** move images or change their stored paths for CloudCannon. Keep the paths the live site uses, and make each one show an image in the CloudCannon build.

| The site's images                                | In the CloudCannon build                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Files under `public/`, in `<img>` or `<NuxtImg>` | `nuxt generate` copies `public/` to the output root; `<NuxtImg>` writes resized copies under `/_ipx/`    |
| Files under `assets/`, imported                  | Content stores the repo path, and code maps it to the import — see [§ Imported images](#imported-images) |
| Full URLs on an image host or CDN                | Leave them. `<NuxtImg>` resizes a remote URL only when its domain is in `image.domains`                  |

### Files under `public/`

Set `paths.uploads` to the folder the images are already in:

```yaml
paths:
  static: public
  uploads: public/images
```

### Imported images

Content stores each image's repo path (`/app/assets/images/hero.jpg` in Nuxt 4), and a module maps the path to its bundled URL with `import.meta.glob`:

```ts
const DIR = "/app/assets/images";

const files = import.meta.glob<string>("~/assets/images/*", { eager: true, import: "default" });

const images: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([key, url]) => [`${DIR}/${key.split("/").pop()}`, url]),
);

export function resolveImage(path: string): string {
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
        uploads: /app/assets/images
        static: ""
```

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these Nuxt items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "nuxtjs"`
- [ ] `build.build_command` runs `nuxt generate`, not `nuxt build`
- [ ] `build.output_path` is `.output/public`
- [ ] Every page a collection file builds is in `.output/public` after `nuxt generate` — see [§ Every page must be reachable](#every-page-must-be-reachable)
- [ ] Every fetch from the browser to a `server/api` route has an editing fallback, or the user's answer when CloudCannon hosts the live site
- [ ] No collection over `.vue` files
- [ ] Every field editors set is in its Nuxt Content collection's `schema`
- [ ] Collections whose files each have a hard-coded page have `disable_add: true`
- [ ] Every collection that builds pages has a `url` that resolves every file to its page in `.output/public` — see [collection-urls.md](collection-urls.md)
- [ ] Every stored image path or URL shows an image in the CloudCannon build, with the live site's paths unchanged — see [§ Images](#images)
