# Configuration (Hugo)

> **Checklist discipline:** This doc ends with a [Verification checklist](#verification-checklist). Read it now so you know what to aim for, then work through every item before marking this phase complete.

Guidance for creating `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` for a Hugo site. Much of the customization work is the same for every SSG and is written up in the Astro workflow; this file links there for those parts and carries what differs for Hugo.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg hugo
```

See [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) for the individual `detect-*` subcommands. When the CLI is unavailable, write the config by hand from the audit — the review below still applies.

### A site that already has CloudCannon config

A Bookshop or earlier CloudCannon site usually has `cloudcannon.config.yaml` (or `.yml`) already. Customize it in place:

- **Run** `npx @cloudcannon/cli validate` on it first, and fix what fails — old configs carry invalid enum values (`source_editor.theme`, icon names) that nothing checked.
- **Run** `configure generate --dry-run` for comparison only. Without `--dry-run` it writes a second `cloudcannon.config.yml` beside the existing file.
- **Sweep** it: `_structures` referenced but never defined, `_inputs` keys that name no field in the content, `[*]` previews on structured arrays — see [../configuration-gotchas.md](../configuration-gotchas.md).
- **Keep** its file name. Renaming `.yaml` to `.yml` gains nothing.
- **Keep** an existing `node_version` or `hugo_version` in `.cloudcannon/initial-site-settings.json` unless it is too old for the toolchain — raise `hugo_version` to 0.150.0+, and `node_version` to what the site's npm tooling needs (Tailwind 4 needs Node 20+).

## Review the generated config

The Hugo baseline is a starting point, not a working config. Check each row:

| Key or area                | What the CLI produces                                                                | Fix                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collections_config.*.url` | **Nothing.** No collection gets a `url`                                              | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md). Without it, no page opens in the Visual Editor      |
| `pages` collection         | `path: content` with no glob, so it also lists every file in each section collection | Exclude each section that has its own collection: `glob: ['**/*.md', '!blog/**']`                                                                 |
| A collection at `path: ''` | Sometimes emitted alongside a `content` collection — it lists the whole repo         | Delete it                                                                                                                                         |
| Section collections        | Exclude `_index.md` (`glob: ['!_index.md']`)                                         | Decide per section — see [§ Section collections](#section-collections)                                                                            |
| `paths`                    | `static: static`, `uploads: static/uploads`                                          | Point `uploads` where the site keeps images (often `static/images`) — see [§ Images](#images)                                                     |
| `markdown`                 | `engine: commonmark` with `table: false`, `strikethrough: false`                     | Match Hugo's Goldmark — see [configuration-gotchas.md § Match Goldmark](configuration-gotchas.md#match-goldmark-in-the-markdown-options)          |
| `_snippets_imports`        | `hugo` with `exclude: [hugo_instagram]`                                              | Keep it, and narrow it to the shortcodes the site uses — see [cloudcannon-snippets/hugo/overview.md](../../cloudcannon-snippets/hugo/overview.md) |
| `timezone`                 | The timezone of the machine running the CLI                                          | Use the site config's `timeZone` if it sets one; otherwise ask                                                                                    |
| `source`                   | Not set                                                                              | Leave it unset — see [../configuration-gotchas.md § `source`](../configuration-gotchas.md#verify-the-cloudcannon-clis-source-path)                |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                           | Value                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                         | `"hugo"`                                                                                                                      |
| `build.install_command`       | `npm i` when the site has a `package.json` (Tailwind, PostCSS, Pagefind). Omit otherwise                                      |
| `build.build_command`         | `npm run build` when `package.json` has a `build` script; `hugo` otherwise — see [../build-commands.md](../build-commands.md) |
| `build.output_path`           | `"public"` (or the site's `publishDir`)                                                                                       |
| `build.hugo_version`          | The version the site builds with — **0.150.0 or later** for editable regions. The CLI doesn't set it                          |
| `build.environment_variables` | Keep the CLI's `HUGO_CACHEDIR`, so module and resource caches survive between builds                                          |
| `build.preserved_paths`       | Keep the CLI's `resources/,.hugo_cache/` (plus `node_modules/` with npm)                                                      |

**MUST:** spell it `hugo_version`, under `build`. `hugoVersion` is not in the schema; it is ignored without an error, and the site builds on CloudCannon's default Hugo instead.

These only take effect when the site is created — see [../astro/configuration.md § Build settings](../astro/configuration.md#build-settings-cloudcannoninitial-site-settingsjson) for changing an existing site.

## Collections from `content/` sections

Each top-level section of `content/` with its own layout is usually its own collection. Pages that share the default layout go in one `pages` collection.

```yaml
collections_config:
  pages:
    path: content
    glob:
      - "**/*.md"
      - "!blog/**"
    url: /[full_slug]/
    icon: wysiwyg
    _enabled_editors: [visual, content, data]
  blog:
    path: content/blog
    url: /blog/[full_slug]/
    icon: event_available
    _enabled_editors: [visual, content, data]
  data:
    path: data
    disable_url: true
    _enabled_editors: [data]
```

**MUST:** exclude every section collection's directory from `pages`.
**Why:** collections can overlap. Without the negation a blog post appears in both collections, with two different schemas and two URL patterns.

### Section collections

A section's `_index.md` is its list page (`/blog/`). Where it goes decides what editors can edit:

| Choice                            | When                                                                        | Config                                                                                |
| --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Keep it in the section collection | Its front matter drives what the list page shows (a hero, an intro, blocks) | Give it its own schema, and leave it out of `add_options` — see [§ Schemas](#schemas) |
| Exclude it (`!_index.md`)         | It only carries a title and the list page has nothing else to edit          | The CLI default                                                                       |

Either way, check the `_index.md` URL question in [collection-urls.md § `_index.md`](collection-urls.md#_indexmd--list-pages-and-the-home-page) first.

## Data files

Hugo reads `data/*.{yml,yaml,json,toml}` into `hugo.Data.<name>` (`site.Data` on Hugo < 0.156). For each file an editor should change, add a `data_config` entry and a `file_config` entry:

```yaml
data_config:
  footer:
    path: data/footer.yaml
  nav:
    path: data/nav.yaml
```

**MUST:** add a `data_config` entry for every data file a template's editable regions reference as `@data[<name>]`, and for every file a partial reads with `hugo.Data.<name>` (`site.Data` on Hugo < 0.156) that should update in the Visual Editor. A `collections_config` entry for `data/` is not enough.
**Why:** `data_config` is what the Visual Editor loads. A region on an unregistered file never resolves, and the in-browser Hugo has no copy of the file to render from.

The single-`data`-collection pattern and `file_config` examples in [../astro/configuration.md § Data config for shared data](../astro/configuration.md#data-config-for-shared-data) apply unchanged, with `data/` as the path.

## Schemas

Schema files are front matter templates for new files. Put them in `.cloudcannon/schemas/`, in the same front matter format the collection uses (`---` YAML, `+++` TOML or JSON).

- **Seed** each schema from the section's archetype (`archetypes/<section>.md`) if the site has one — it already lists the fields a new file needs. CloudCannon doesn't read archetypes itself.
- **Include** every field a template reads, including `content_blocks: []` for page-builder pages.
- **Leave out** fields Hugo fills in at build time (`lastmod` from Git, `.Summary`).

One collection, many schemas — the pattern, `add_options`, `new_preview_url` and `_enabled_editors` order are in [../astro/configuration.md § Schemas](../astro/configuration.md#schemas) and apply unchanged. Hugo has no content schema of its own, so there is nothing like Zod to keep in sync — the schema file is the only definition of the fields.

## Split structure files

When `_structures` grow past a handful of values, split them into files per [../structures.md](../structures.md). On Hugo:

- **Put** them under `.cloudcannon/structures/<array key>/`, mirroring the partial path: `.cloudcannon/structures/content_blocks/home/hero.cloudcannon.structure-value.yml` for `_name: home/hero`.
- **Don't** put them in `layouts/partials/`, even though "next to the component" suggests it — keep the layouts tree to templates.
- **Collect** them with `values_from_glob: ['/.cloudcannon/structures/content_blocks/**/*.cloudcannon.structure-value.yml']`.

## Images

Hugo sites serve images one of two ways. Configure each input for the way its template reads it:

| Template reads the image with                             | Image lives in | Front matter value  | Input config                                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<img src="{{ .image }}">`                                | `static/`      | `/images/photo.jpg` | Global `paths.static: static`, `paths.uploads: static/images`                                                                                                                                                                                                      |
| `resources.Get .image` (with a `static` → `assets` mount) | `static/`      | `/images/photo.jpg` | Same as above — the mount makes one path work in both                                                                                                                                                                                                              |
| `resources.Get .image` (no mount)                         | `assets/`      | `images/photo.jpg`  | Per-input `paths.uploads: assets/images`, `paths.static: assets`                                                                                                                                                                                                   |
| `.Resources.Get .image` (page bundle)                     | The bundle     | `photo.jpg`         | Collection `paths.uploads` pointing into the bundle (it accepts [dynamic placeholders](https://cloudcannon.com/documentation/articles/configure-your-template-strings/)) with `paths.uploads_use_relative_path: true`, so the stored value is relative to the file |

Check the configured paths against a real upload before moving on: upload an image in CloudCannon, then build and confirm the template finds it.

## Taxonomies

`tags`, `categories` and any other `taxonomies` key must stay top-level front matter arrays — Hugo only builds term pages from top-level keys. Configure each as a `multiselect`, with values from a data file when the set is curated, or `allow_create: true` when editors coin new terms. See [configuration-gotchas.md § Keep taxonomies top-level](configuration-gotchas.md#keep-taxonomies-top-level).

## Build steps

Hugo itself needs no pre-build step. Search indexers (Pagefind) and CSS builds that run outside Hugo go in the `package.json` `build` script — `"build": "hugo --minify && pagefind --site public"` — not in `.cloudcannon/postbuild`. See [../build-commands.md](../build-commands.md).

## Editor README

Write `.cloudcannon/README.md` as in [../astro/configuration.md § Editor README](../astro/configuration.md#editor-readme).

## Verification checklist

Work through these before moving to the next phase. The Astro checklist's collection, input, schema and content items apply too — [../astro/configuration.md § Verification checklist](../astro/configuration.md#verification-checklist) — skipping its MDX, `astro:assets`, `package.json` engines and `[slug].astro` items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "hugo"`, `build.output_path` matching `publishDir`, and `build.hugo_version` ≥ 0.150.0
- [ ] Every collection that builds pages has a `url` using `[full_slug]` — see [collection-urls.md](collection-urls.md)
- [ ] `pages` excludes every section that has its own collection
- [ ] No collection at `path: ''`
- [ ] Every `_index.md` is deliberately in or out of its section collection
- [ ] The home page and one section list page were opened in the Visual Editor, and the `_index.md` result is recorded
- [ ] `permalinks`, `slug:` and `url:` overrides are mirrored in the matching collection `url`
- [ ] Every data file referenced by a region or a live partial has a `data_config` entry and a `file_config` entry
- [ ] Taxonomy keys are top-level `multiselect` inputs
- [ ] `markdown` options match the site's Goldmark config — see [configuration-gotchas.md](configuration-gotchas.md#match-goldmark-in-the-markdown-options)
- [ ] Image inputs upload where their template reads from
- [ ] `npx @cloudcannon/cli validate` passes
