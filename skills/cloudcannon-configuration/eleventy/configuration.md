# Configuration (Eleventy)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Eleventy, and its [Verification checklist](#verification-checklist) adds the Eleventy items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg eleventy
```

## Review the generated config

| Key or area                       | What the CLI produces                                                        | Fix                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`                          | `source: src` with paths relative to it, when it detects the input directory | Remove `source` and prefix every `path` with the input directory (`blog` → `src/blog`, `_data` → `src/_data`)                               |
| `collections_config.*.url`        | **Nothing.** No collection gets a `url`                                      | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md)                                                |
| `pages` collection                | The whole input directory, with no glob                                      | Add a glob that leaves out what isn't a page — see [§ Collections](#collections)                                                            |
| Collections for single subfolders | One per nested folder it finds (`docs_getting_started`)                      | Consolidate them — see [../configuration.md § Consolidate single-file collections](../configuration.md#consolidate-single-file-collections) |
| A folder that never builds        | A collection, even when a directory data file sets `permalink: false` on it  | `disable_url: true`, or remove the collection if editors don't need it                                                                      |
| `paths`                           | `static: ''`, `uploads: uploads`                                             | Point both at a passthrough-copied folder — see [§ Images](#images)                                                                         |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                     | Value                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ssg`                   | `"eleventy"`                                                                                                                                                                                           |
| `build.install_command` | From the detected package manager (`npm i`)                                                                                                                                                            |
| `build.build_command`   | `npm run build` when `package.json` has a production `build` script (Sass, Tailwind and Pagefind steps live there); `npx @11ty/eleventy` otherwise — see [../build-commands.md](../build-commands.md)  |
| `build.output_path`     | `"_site"`, or the config's `dir.output` / the build script's `--output`                                                                                                                                |
| `build.node_version`    | `"file"` if `.nvmrc` or `.node-version` exists; otherwise the major version from `package.json` `engines.node`. Eleventy 3 needs Node 18 or later, and the editable-regions plugin Node 20.19 or later |
| `build.preserved_paths` | Keep the CLI's `node_modules/,.cache` — `.cache` holds Eleventy's fetch and image caches                                                                                                               |

## Collections

Eleventy has no content directory: pages, posts, layouts and data all sit under the input directory. A `pages` collection at the input root therefore needs a glob that leaves the rest out:

```yaml
collections_config:
  pages:
    path: src
    glob:
      - "!_includes/**"
      - "!**/*.11tydata.*"
  blog:
    path: src/blog
    glob:
      - "!**/*.11tydata.*"
```

- **Exclude** the includes directory (layouts and partials), which isn't a page.
- **Exclude** directory data files (`blog/blog.11tydata.json`) from every collection. They hold data for the folder's templates, not a page.
- **Keep** `.njk`, `.liquid` and `.html` page files in collections when they carry front matter editors change; they open like `.md`.
- **Check** where every file lands after writing globs — see [../configuration-gotchas.md § Overlapping collections](../configuration-gotchas.md#overlapping-collections-each-file-lands-in-one).

### Hide Eleventy's routing and build keys

Hide these front matter keys, on top of the shared list in [../configuration.md § Hide developer-only fields](../configuration.md#hide-developer-only-fields): `permalink`, `layout`, `pagination`, `eleventyComputed`, `eleventyExcludeFromCollections`, `eleventyImport`, `templateEngineOverride`.

`tags` decides which Eleventy collections a page joins (`collections.post`). Hide it when it only does that. When editors also use it for topics, make it a `multiselect` whose values include the collection tags, so removing a topic can't silently take a post off the blog list.

## Data files

Eleventy reads global data from the data directory (`src/_data/` by default) into a variable named after the file: `_data/nav.json` is `nav`.

**MUST:** write new data files as JSON, unless the Eleventy config registers YAML with `addDataExtension("yml", …)` (or `yaml`).
**Why:** Eleventy reads only `.json` and `.js` data files by default. A YAML data file without the extension registered builds with no error and its variable stays empty.

- **Register** each data file a region references as `@data[<name>]` in `data_config`, with the key matching the file name, and configure inputs for its keys — see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate).
- **Leave** JavaScript data read-only: `_data/*.js`, `*.11tydata.js`, `eleventyComputed` and `addGlobalData` values. CloudCannon edits JSON, YAML and front matter only. When editors need a value a JS file holds, move it into a JSON file the JS file imports, after asking the user.
- **Put** the editable data files in one `data` collection at the data directory (`path: src/_data`), with a glob that leaves out the `.js` files.

## Images

Eleventy copies only what `addPassthroughCopy` names into the output. A passthrough path inside the input directory loses that prefix: `addPassthroughCopy("src/assets")` writes `_site/assets/`, and a mapping such as `{ "src/static": "/" }` writes the folder's contents to the site root.

**MUST:** set `paths.uploads` to a folder a passthrough copy covers.
**Why:** an image uploaded anywhere else is saved to the repo but never reaches `_site`, so the page shows a broken image after the build.

| Passthrough in the Eleventy config          | `paths.static` | `paths.uploads` (example) | Path saved in front matter |
| ------------------------------------------- | -------------- | ------------------------- | -------------------------- |
| `addPassthroughCopy("src/assets")`          | `src`          | `src/assets/images`       | `/assets/images/photo.jpg` |
| `addPassthroughCopy({ "src/static": "/" })` | `src/static`   | `src/static/images`       | `/images/photo.jpg`        |

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these Eleventy items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "eleventy"` and `build.output_path` matching the Eleventy output directory
- [ ] No `source` key; every `path` starts with the input directory
- [ ] No collection lists the includes directory or a `*.11tydata.*` file
- [ ] Every collection that builds pages has a `url` that matches Eleventy's output for every file, checked with `npx @11ty/eleventy --to=json` — see [collection-urls.md § Verify against the build](collection-urls.md#verify-against-the-build)
- [ ] Folders whose files set `permalink: false` have `disable_url: true`
- [ ] Every data file a region or template reads is JSON, or YAML with the extension registered
- [ ] No input on a value that comes from JavaScript data or `eleventyComputed`
- [ ] `paths.uploads` sits inside a passthrough-copied folder, and `paths.static` is the folder that copies to the site root
- [ ] Every string field's input type matches how its template outputs it — see [configuration-gotchas.md](configuration-gotchas.md#choose-rich-text-inputs-from-the-template-engine)
