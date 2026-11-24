# Build and Test (Nuxt)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the Nuxt additions: the static build, Nuxt's output, and the build command.

## Build verification checklist

- [ ] **Clean build.** Delete `.nuxt/`, `.output/`, `dist` and `node_modules/.cache/nuxt/`, then run the full build as [../build.md](../build.md#build-verification-checklist) describes, with `nuxt generate`.
- [ ] **No render errors.** The build log has no `ERROR [request error]` lines. Each one is a page left out of the output.
- [ ] **Every page is in the output.** Each page from the audit's baseline has an `index.html` in `.output/public`, and each file in every collection that builds pages has one — see [cloudcannon-configuration/nuxt/collection-urls.md § Listing the build](../../cloudcannon-configuration/nuxt/collection-urls.md#listing-the-build).
- [ ] **Counting regions.** `grep -rhoE 'data-editable="[a-z_-]+' .output/public --include='*.html' | sort | uniq -c` lists each region type. `_dynamic` is the `EditableRegions` root, one per page, not a region.
- [ ] **Images load.** Every `<img>` in `.output/public` points at a file under `.output/public` (`/_ipx/` copies included) or a real remote host.
- [ ] **Client navigation.** In `npx serve .output/public`, follow a link from the home page to a content page: it renders with no console error. Each page's data comes from its `_payload.json`.

## CloudCannon build command

- **Verify** the `generate` script runs `nuxt generate` and every other step, and `build.build_command` runs it — see [cloudcannon-configuration/nuxt/configuration.md § Build settings](../../cloudcannon-configuration/nuxt/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).
- **Set** `build.output_path` to `.output/public`, and `build.node_version` per [build-commands.md § Node version](../../cloudcannon-configuration/build-commands.md#node-version).

## Common issues

### `ERROR [request error] [fatal] [GET] http://localhost/…`

A page threw while rendering that path, usually a `createError({ statusCode: 404 })` for a path whose content isn't found. Check the path against the collection's files: a route added in `prerender:routes` with an ordering prefix or a trailing `/index` doesn't match any file.

### A content page is missing from `.output/public`, with no error

Nothing links to it, so the crawler never reached it — see [cloudcannon-configuration/nuxt/configuration.md § Every page must be reachable](../../cloudcannon-configuration/nuxt/configuration.md#every-page-must-be-reachable).

### Nuxt Content fails with a SQLite error

Nuxt Content builds its database with a SQLite connector. On Node 22.13 or later, set `content.experimental.sqliteConnector: "native"` in `nuxt.config`; otherwise add `better-sqlite3` to the dependencies.

### Navigating between pages breaks in the built site

A module the page imports uses a Node API in the browser, such as `gray-matter` — see [content.md § Sites that load their own files](content.md#sites-that-load-their-own-files).
