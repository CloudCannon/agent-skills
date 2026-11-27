# Build and Test (SvelteKit)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the SvelteKit additions: the static build, its output, and the build command.

## Build verification checklist

- [ ] **Clean build.** Delete `.svelte-kit/` and `build/`, then run the full build as [../build.md](../build.md#build-verification-checklist) describes. When the live site needs a server, run it with `PUBLIC_CLOUDCANNON_BUILD=true` and every placeholder the CloudCannon build sets.
- [ ] **The live build still passes.** When the live site keeps its adapter, run the build without the variable too.
- [ ] **No prerender errors or warnings.** The log has no `Error: 500` or `404` lines. Under `handleHttpError: "warn"` they are warnings, and each one is a page left out of the output.
- [ ] **Every page is in the output.** Each page from the audit's baseline has an HTML file in `build/`, and each file in every collection that builds pages has one — see [cloudcannon-configuration/sveltekit/collection-urls.md § Listing the build](../../cloudcannon-configuration/sveltekit/collection-urls.md#listing-the-build).
- [ ] **Counting regions.** `grep -rhoE 'data-editable="[a-z_-]+' build --include='*.html' | sort | uniq -c` lists each region type. `_dynamic` is the `EditableRegions` root, one per page, not a region.
- [ ] **Images load.** Every `<img>` in `build/` points at a file under `build/` or a real remote host.
- [ ] **Client navigation.** Run `npm run preview`, which serves the prerendered pages from the build, and follow a link from the home page to a content page: it renders with no console error. A page with a server `load` gets its data from its `__data.json`; a page with only universal loads runs them in the browser.

## CloudCannon build command

- **Verify** the `build` script runs `vite build` and every other step, and `build.build_command` runs it — see [cloudcannon-configuration/sveltekit/configuration.md § Build settings](../../cloudcannon-configuration/sveltekit/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).
- **Set** `build.output_path` to `adapter-static`'s output folder (`build`), and `build.node_version` per [build-commands.md § Node version](../../cloudcannon-configuration/build-commands.md#node-version).
- **Move** steps that read another adapter's output folder (`.svelte-kit/cloudflare`) behind the same variable, or point them at `build/`.

## Common issues

### `Error: 500 /<path>` during prerender

A page threw while prerendering, usually an `error(404)` for a path whose content isn't found, or an unknown block `_type`. Check the path against the collection's files: an `entries` value with a file extension or a trailing `/index` doesn't match any file.

### A content page is missing from `build/`, with no error

Nothing links to it and no `entries` lists it — see [cloudcannon-configuration/sveltekit/configuration.md § Every page must be prerendered](../../cloudcannon-configuration/sveltekit/configuration.md#every-page-must-be-prerendered).

### `"<NAME>" is not exported by "virtual:env/static/private"`

The build imports a variable the CloudCannon build doesn't set — see [cloudcannon-configuration/sveltekit/configuration.md § Environment variables](../../cloudcannon-configuration/sveltekit/configuration.md#environment-variables).

### `Cannot prerender pages with actions`

A page with form `actions` is in the CloudCannon build — see [cloudcannon-configuration/sveltekit/configuration.md § When the live site needs a server](../../cloudcannon-configuration/sveltekit/configuration.md#when-the-live-site-needs-a-server).

### Navigating between pages breaks in the built site

A universal `load` uses a Node API in the browser, such as `gray-matter` — see [content.md § Read files in server loads](content.md#read-files-in-server-loads).
