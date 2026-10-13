# Build and test

Read when running Phase 5. These checks apply to every SSG; `<ssg>/build.md` adds the SSG's cache, output and build-command details.

## Build verification checklist

- [ ] **Full build.** Clear the SSG's caches and output directory (`<ssg>/build.md` names them), then run the site's full build command, not just the SSG binary. Generators, search indexes and data generation must all be part of it — see [build-commands.md](../cloudcannon-configuration/build-commands.md).
- [ ] **Regions are in the output.** Count `data-editable` attributes in the built HTML, and check each region type you wired appears. Spot-check the home page (usually the highest count) and a content page.
- [ ] **Config validates.** `npx @cloudcannon/cli validate` passes.
- [ ] **Collection URLs match the build.** For every file in every collection with a `url`, the computed URL equals the built path. `validate` doesn't check this — see [collection-urls.md § Check every file against the build](../cloudcannon-configuration/collection-urls.md#check-every-file-against-the-build).
- [ ] **Schema keys resolve.** Every `_schema` value, and every `add_options[].schema`, is a key under its collection's `schemas`. A file that names no schema won't open, and `validate` doesn't check this — see [schemas.md § `default` and `_schema`](../cloudcannon-configuration/schemas.md#default-and-_schema).
- [ ] **Search index.** If the site uses a search indexer such as Pagefind, the build command runs it after the SSG, and its output directory exists.
- [ ] **Schema round-trip.** For each collection, copy every content file into a scratch build with its schema's keys filled in with their defaults, and compare the list pages against the normal build. A post that disappears is a template that treats a written default differently from a missing key — see [configuration-gotchas.md § The first edit writes every schema key](../cloudcannon-configuration/configuration-gotchas.md#the-first-edit-writes-every-schema-key).
- [ ] **Hand off.** Agents don't test in CloudCannon. Ask the user to, using [handoff.md](handoff.md) for what to ask them to verify and what to send back.

## CloudCannon build command

The build command goes in `.cloudcannon/initial-site-settings.json` as `build.build_command`. Point it at the site's full build script, such as `npm run build`, so CloudCannon and a local build run the same thing. Steps that must run before dependencies install go in `install_command`. See [build-commands.md](../cloudcannon-configuration/build-commands.md).
