# Build and test

Read when running Phase 5. These checks apply to every SSG; `<ssg>/build.md` adds the SSG's cache, output and build-command details.

## Build verification checklist

- [ ] **Full build.** Clear the SSG's caches and output directory (`<ssg>/build.md` names them). Then run `install_command` and `build_command` from `.cloudcannon/initial-site-settings.json`, with its `build.environment_variables` set, so the local build matches CloudCannon's. `build_command` runs the site's full build, not just the SSG binary: generators, search indexes and data generation are all part of it — see [build-commands.md](../cloudcannon-configuration/build-commands.md).
- [ ] **Frozen install.** The install succeeds from an empty store with the pinned package manager version — see [build-commands.md § Package manager](../cloudcannon-configuration/build-commands.md#package-manager).
- [ ] **Regions are in the output.** Count `data-editable` attributes in the built HTML, and check each region type you wired appears. Spot-check the home page (usually the highest count) and a content page.
- [ ] **Config validates.** `npx @cloudcannon/cli validate` passes.
- [ ] **Collection URLs match the build.** For every file in every collection with a `url`, the computed URL equals the built path. `validate` doesn't check this — see [collection-urls.md § Check every file against the build](../cloudcannon-configuration/collection-urls.md#check-every-file-against-the-build).
- [ ] **Schema keys resolve.** Every `_schema` value, and every `add_options[].schema`, is a key under its collection's `schemas`. A file that names no schema won't open, and `validate` doesn't check this — see [schemas.md § `default` and `_schema`](../cloudcannon-configuration/schemas.md#default-and-_schema).
- [ ] **Search index.** If the site uses a search indexer such as Pagefind, the build command runs it after the SSG, and its output directory exists.
- [ ] **Schema round-trip.** For each collection, diff every file's keys against its schema's keys. If no file is missing a key, the check is done. Otherwise, back up the content folder to a gitignored path, fill each missing key in place with its schema default, build, and compare the list pages against the normal build, then restore the backup. A post that disappears is a template that treats a written default differently from a missing key — see [configuration-gotchas.md § The first edit writes every schema key](../cloudcannon-configuration/configuration-gotchas.md#the-first-edit-writes-every-schema-key).
- [ ] **No hydration errors.** On a site that hydrates in the browser, serve the build output and load the home page and one page per layout with the console open. Fix every hydration error before handoff, and compare against the errors recorded in [audit.md § Existing hydration errors](audit.md#existing-hydration-errors). Without a browser, list those pages in the handoff for the user to open and check the console. Usual causes: portals, `Date`, `Math.random()` or `window` read during render, and invalid HTML nesting.
- [ ] **Hand off.** Agents don't test in CloudCannon. Ask the user to, using [handoff.md](handoff.md) for what to ask them to verify and what to send back.

## CloudCannon build command

The build command goes in `.cloudcannon/initial-site-settings.json` as `build.build_command`. Point it at the site's full build script, such as `npm run build`, so CloudCannon and a local build run the same thing. Steps that must run before dependencies install go in `install_command`. See [build-commands.md](../cloudcannon-configuration/build-commands.md).
