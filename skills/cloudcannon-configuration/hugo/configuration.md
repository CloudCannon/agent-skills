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
- **Keep** an existing `node_version` or `hugo_version` in `.cloudcannon/initial-site-settings.json` unless it is too old for the toolchain — `hugo_version` must fall inside every version window the site declares (see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson)), and `node_version` must cover what the site's npm tooling needs (Tailwind 4 needs Node 20+).

## Review the generated config

The Hugo baseline is a starting point, not a working config. Check each row:

| Key or area                | What the CLI produces                                                                | Fix                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collections_config.*.url` | **Nothing.** No collection gets a `url`                                              | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md). Without it, no page opens in the Visual Editor                                                                                                |
| `pages` collection         | `path: content` with no glob, so it also lists every file in each section collection | Exclude each section that has its own collection: `glob: ['**/*.md', '!blog/**']`                                                                                                                                                           |
| A collection at `path: ''` | Sometimes emitted alongside a `content` collection — it lists the whole repo         | Delete it                                                                                                                                                                                                                                   |
| Section collections        | Exclude `_index.md` (`glob: ['!_index.md']`)                                         | Decide per section — see [§ Section collections](#section-collections)                                                                                                                                                                      |
| `paths`                    | `static: static`, `uploads: static/uploads`                                          | Point `uploads` where the site keeps images (often `static/images`) — see [§ Images](#images)                                                                                                                                               |
| `markdown`                 | `engine: commonmark` with `table: false`, `strikethrough: false`                     | Match Hugo's Goldmark — see [configuration-gotchas.md § Match Goldmark](configuration-gotchas.md#match-goldmark-in-the-markdown-options)                                                                                                    |
| `_snippets_imports`        | `hugo` with `exclude: [hugo_instagram]`                                              | Keep it, and narrow it to the shortcodes the site uses — see [cloudcannon-snippets/hugo/overview.md](../../cloudcannon-snippets/hugo/overview.md)                                                                                           |
| `timezone`                 | The timezone of the machine running the CLI                                          | Set it to the site config's `timeZone` if it sets one; otherwise ask. **Why:** CloudCannon fills `NOW` dates in this zone, and Hugo skips future-dated pages unless `buildFuture` is set. A zone ahead of Hugo's hides a new post for hours |
| `build.build_command`      | `hugo -b /`                                                                          | `hugo`, or `npm run build` — see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson). `-b /` is for the local dev server only                                                                                          |
| `source`                   | Not set                                                                              | Leave it unset — see [../configuration-gotchas.md § `source`](../configuration-gotchas.md#verify-the-cloudcannon-clis-source-path)                                                                                                          |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                           | Value                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                         | `"hugo"`                                                                                                                                                                                                                                                                                                                                                                            |
| `build.install_command`       | `npm i` when the site has a `package.json` (Tailwind, PostCSS, Pagefind). Omit otherwise                                                                                                                                                                                                                                                                                            |
| `build.build_command`         | `npm run build` when `package.json` has a production `build` script; `hugo` otherwise — see [../build-commands.md](../build-commands.md). The site config keeps its real `baseURL`. Vendoring and other Hugo steps are in [migrate-to-cloudcannon/hugo/build.md](../../migrate-to-cloudcannon/hugo/build.md)                                                                        |
| `build.output_path`           | `"public"` (or the site's `publishDir`)                                                                                                                                                                                                                                                                                                                                             |
| `build.hugo_version`          | The version the site builds with, inside every window the site declares: each module's `module.hugoVersion`, each theme's `min_version`, and the editable-regions module's minimum (0.120). The CLI doesn't set it. Recommend a recent release, and ask before upgrading — see [Upgrading Hugo first](../../cloudcannon-visual-editing/hugo/visual-editing.md#upgrading-hugo-first) |
| `build.environment_variables` | Keep the CLI's `HUGO_CACHEDIR`, so module and resource caches survive between builds                                                                                                                                                                                                                                                                                                |
| `build.preserved_paths`       | Keep the CLI's `resources/,.hugo_cache/` (plus `node_modules/` with npm)                                                                                                                                                                                                                                                                                                            |

**MUST:** spell it `hugo_version`, under `build`. `hugoVersion` is not in the schema; it is ignored without an error, and the site builds on CloudCannon's default Hugo instead.

**MUST:** keep `hugo_version` and any npm Hugo (a `hugo-extended` or `hugo-bin` devDependency) on the same version.
**Why:** when the build runs through `npm run build`, the npm Hugo in `node_modules/.bin` runs instead of `hugo_version`, with no warning.

**MUST:** build production with the site's real `baseURL`, and keep `-b /` for local dev-server builds.
**Why:** CloudCannon doesn't override `baseURL`, so the production build is the site as it deploys. Absolute URLs built from `baseURL` (`.Permalink`, `absURL`) point at the live domain even in the editor, so how well the preview works depends on the theme using relative URLs.

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

The URL pattern for `_index.md` is in [collection-urls.md § `_index.md`](collection-urls.md#_indexmd--list-pages-and-the-home-page).

If the home page has no content file (its template renders from site params), add a title-only `content/_index.md` with its own schema, left out of `add_options`. It gives editors a Home entry that opens `/` in the Visual Editor, where the params-bound regions are, and the rendered home page is unchanged.

### Sections of leaf bundles

A section whose pages are leaf bundles (`blog/first-post/index.md` with `cover.jpg` beside it) needs a collection that creates bundles:

```yaml
collections_config:
  blog:
    path: content/blog
    glob:
      - "**/*.md"
      - "!_index.md"
    create:
      path: "[relative_base_path]/{title|slugify}/index.[ext]"
    disable_add_folder: true
```

- **MUST:** use a glob that also matches a flat file in the collection folder, as above — never a bundles-only glob such as `**/index.md`. The rule and its reason are in [../configuration-gotchas.md § A folder-per-post glob must also match a flat file](../configuration-gotchas.md#a-folder-per-post-glob-must-also-match-a-flat-file).
- **MUST:** make every entry a bundle when a template reads the image from page resources (`.Resources.Get`). A flat file in that section has no resources, so the image must live in `assets/` instead.

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

Data files that hold select options (tags, authors, icons) follow [../configuration-gotchas.md § Editor-owned option lists](../configuration-gotchas.md#editor-owned-option-lists). On a site whose templates come from a theme or module, check the theme's `data/` before naming one: a project file with the same name replaces the theme's.

Values editors change in `params` and `menus` live in the site config, not `data/` — see [§ Site config as data](#site-config-as-data).

## Schemas

Schema files are front matter templates for new files. Put them in `.cloudcannon/schemas/`, in the same front matter format the collection uses (`---` YAML, `+++` TOML or JSON).

- **Seed** each schema from the section's archetype (`archetypes/<section>.md`) if the site has one — it already lists the fields a new file needs. CloudCannon doesn't read archetypes itself.
- **Include** every field a template reads, including `content_blocks: []` for page-builder pages.
- **Leave out** fields Hugo fills in at build time (`lastmod` from Git, `.Summary`).

One collection, many schemas — the pattern, `add_options`, `new_preview_url` and `_enabled_editors` order are in [../astro/configuration.md § Schemas](../astro/configuration.md#schemas) and apply unchanged. Hugo has no content schema of its own, so there is nothing like Zod to keep in sync — the schema file is the only definition of the fields.

**MUST:** put every front matter key that any file in the collection uses into its schema file — including `params`, `menu`, `resources`, `cascade` and `aliases` — or set `remove_extra_inputs: false` on the schema.
**Why:** `remove_extra_inputs` defaults to `true`. Keys missing from the schema are hidden when the file loads and removed from the file when it's saved, so an edit to a post's title can delete its `resources` metadata or `menu` entry. A key hidden in `_inputs` is fine; a key missing from the schema isn't.

```yaml
collections_config:
  blog:
    schemas:
      default:
        path: .cloudcannon/schemas/post.md
        remove_extra_inputs: false
```

List the keys in use with the recipe in [../configuration-gotchas.md § An `_inputs` key that names no field is ignored](../configuration-gotchas.md#an-_inputs-key-that-names-no-field-is-ignored), and diff them against each schema file.

The same first edit also writes every schema key with its default — check booleans first: [../configuration-gotchas.md § The first edit writes every schema key](../configuration-gotchas.md#the-first-edit-writes-every-schema-key).

## Split structure files

When `_structures` grow past a handful of values, split them into files per [../structures.md](../structures.md). On Hugo:

- **Put** them under `.cloudcannon/structures/<array key>/`, mirroring the partial path: `.cloudcannon/structures/content_blocks/home/hero.cloudcannon.structure-value.yml` for `_name: home/hero`.
- **Don't** put them in `layouts/partials/`, even though "next to the component" suggests it — keep the layouts tree to templates.
- **Collect** them with `values_from_glob: ['/.cloudcannon/structures/content_blocks/**/*.cloudcannon.structure-value.yml']`.

## Images

Hugo sites serve images one of two ways. Configure each input for the way its template reads it:

| Template reads the image with                             | Image lives in | Front matter value  | Input config                                                                                                                                                                                                          |
| --------------------------------------------------------- | -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<img src="{{ .image }}">`                                | `static/`      | `/images/photo.jpg` | Global `paths.static: static`, `paths.uploads: static/images`                                                                                                                                                         |
| `resources.Get .image` (with a `static` → `assets` mount) | `static/`      | `/images/photo.jpg` | Same as above — the mount makes one path work in both                                                                                                                                                                 |
| `resources.Get .image` (no mount)                         | `assets/`      | `images/photo.jpg`  | Per-input `paths.uploads: assets/images`, `paths.static: assets`                                                                                                                                                      |
| `.Resources.Get .image` (page bundle)                     | The bundle     | `cover.jpg`         | `options.paths` on each image input, and `_editables.content.paths` on the collection for body images: `uploads: content/<section>/[relative_base_path]`, `static: ""`, `uploads_use_relative_path: true` — see below |

An image stored relative to a page bundle or to `assets/` gets no image region in the Visual Editor — editors change it in the sidebar. See [Image editing in Hugo](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#image-editing-in-hugo).

Check the configured paths against a real upload before moving on: upload an image in CloudCannon, then build and confirm the template finds it.

### Page-bundle uploads

**MUST:** configure bundle uploads on the inputs and the collection's `_editables`, not with a collection-level `paths` key.
**Why:** `paths` isn't a `collections_config` key — `cloudcannon validate` reports `unexpected property paths`. It is valid at the root, in file, rich text and URL input `options`, and on `_editables.*`.

```yaml
collections_config:
  blog:
    path: content/blog
    _editables:
      content: &body_toolbar
        blockquote: true
        bold: true
        bulletedlist: true
        format: p h2 h3 h4
        image: true
        italic: true
        link: true
        numberedlist: true
        removeformat: true
        snippet: true
        paths:
          uploads: content/blog/[relative_base_path]
          static: ""
          uploads_use_relative_path: true
    _inputs:
      image:
        type: image
        comment: Save a new post before adding its image.
        options:
          paths:
            uploads: content/blog/[relative_base_path]
            static: ""
            uploads_use_relative_path: true
```

- **Repeat** the whole toolbar in a collection-level `_editables.content`. It replaces the root toolbar, and every option left out becomes `false`. Share it between collections with a plain alias (`content: *body_toolbar`) — see [../configuration-gotchas.md § No YAML merge keys](../configuration-gotchas.md#no-yaml-merge-keys).
- **Tell** editors to save a new post before adding its images, in the input `comment` and the editor README. Until the entry is saved it has no folder, and an upload lands in the section folder instead of the bundle.

## Taxonomies

`tags`, `categories` and any other `taxonomies` key must stay top-level front matter arrays — Hugo only builds term pages from top-level keys. See [configuration-gotchas.md § Keep taxonomies top-level](configuration-gotchas.md#keep-taxonomies-top-level).

Configure each as a `multiselect` whose values come from a data file of terms, so editors manage the list in one place:

```yaml
# data/tags.yaml — a top-level array of terms, seeded from the content
- announcements
- release
```

```yaml
data_config:
  tags:
    path: data/tags.yaml

file_config:
  - glob: data/tags.yaml
    _inputs:
      $:
        type: array
        label: Tags
      $[*]:
        type: text
        label: Tag

_inputs:
  tags:
    type: multiselect
    comment: Add new tags under Site data → Tags.
    options:
      values: data.tags
```

Seed the file with every term already used in content, and add it to the data collection so it shows under Site data. No template needs to read it — Hugo still builds term pages from front matter. A taxonomy is an editor-owned list, so the general rules apply, including why `allow_create` alone isn't enough — see [../configuration-gotchas.md § Editor-owned option lists](../configuration-gotchas.md#editor-owned-option-lists).

## Site config as data

When editors need to change values in `params`, `menus` or language config, expose those config files through a settings collection. On a site whose templates come from a theme, this is most of what editors change: the home intro, social links, menus, the footer, colours.

1. **Ask** the user before converting a single root config file (`hugo.toml`). Then move only the parts editors change into `config/_default/` — `params.yaml`, `menus.yaml`, `languages.yaml` — and delete them from the root file. Hugo merges the root file with `config/_default/`, so the rest stays where it is. Where the theme documents its own split, keep its file names.
2. **Make** every file the collection matches YAML — see [configuration-gotchas.md § Config files in a collection must be YAML](configuration-gotchas.md#config-files-in-a-collection-must-be-yaml).
3. **Add** the collection, with a glob naming only the files editors should see:

   ```yaml
   collections_config:
     settings:
       path: config/_default
       glob:
         - params.yaml
         - menus.yaml
       include_developer_files: true
       disable_url: true
       disable_add: true
       disable_add_folder: true
       disable_file_actions: true
       _enabled_editors: [data]
   ```

   A multilingual site globs `languages.*.yaml` and `menus.*.yaml` as well.

4. **Leave** developer-only config out of the glob: Hugo's core settings, `module`, `markup`, `outputs`.
5. **Add** `file_config` inputs for each file, as for any data file.
6. **Add** a `data_config` entry for every file a region binds with `@data[<name>]` — `params: { path: config/_default/params.yaml }`. How regions bind config values, and which partials re-render live, is in [Data files and `@data`](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#data-files-and-data).

**MUST:** set `include_developer_files: true` on a collection over Hugo config files.
**Why:** on a hosted Hugo site, CloudCannon treats `config/_default/*` as developer files and hides them even when the glob names them. The local dev server doesn't apply the filter, so the collection looks right locally and is empty once hosted.

**Hide** config keys editors shouldn't change — `mainSections`, image-processing flags, language plumbing (`contentDir`, `languageCode`, `weight`). **Give** a theme's enum-like options (colour scheme, header layout, home layout) `select` inputs — see [../configuration-gotchas.md § Configure variant / enum-like fields as select inputs](../configuration-gotchas.md#configure-variant--enum-like-fields-as-select-inputs), and [§ Configure CSS class fields](../configuration-gotchas.md#configure-css-class-fields-as-select-inputs) for class strings.

### Menus

Keep Hugo's menu system, and edit each menu where it's defined:

| Menu defined in             | Editors change it                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Site config (`menus.yaml`)  | Through the settings collection, with a menu-item structure                                         |
| Page front matter (`menu:`) | Per page, in the sidebar. The navigation region is `sidebar-only` — its data is spread across pages |

**Why:** replacing Hugo menus with a data file means overriding the templates that render them, and on a theme site the theme's menu docs stop describing the site.

```yaml
_structures:
  menu_items:
    style: modal
    values:
      - label: Menu item
        icon: link
        preview:
          text:
            - key: name
        value:
          name:
          pageRef:
          url: ""
          weight:
        _inputs:
          pageRef:
            type: text
            comment: A page path, such as /about. Leave URL empty when this is set.
          url:
            comment: An external link. Leave empty when Page is set.

file_config:
  - glob: config/_default/menus.yaml
    _inputs:
      main:
        type: array
        options:
          structures: _structures.menu_items
```

Add `parent` and `identifier` to the value when the site has nested menus. Every menu item in the file needs every key in the value, so add `url: ""` to items that only set `pageRef` — Hugo builds them unchanged.

## Build steps

Hugo itself needs no pre-build step. Search indexers (Pagefind) and CSS builds that run outside Hugo go in the `package.json` `build` script — `"build": "hugo --minify && pagefind --site public"` — not in `.cloudcannon/postbuild`. See [../build-commands.md](../build-commands.md).

## Editor README

Write `.cloudcannon/README.md` as in [../astro/configuration.md § Editor README](../astro/configuration.md#editor-readme). On Hugo, also tell editors:

- **Save** a new post before adding its images, in a section of page bundles
- **Find** site settings (menus, social links, the footer) under the settings collection, and read the theme's TOML examples as the same keys in these YAML files

## Verification checklist

Work through these before moving to the next phase. The Astro checklist's collection, input, schema and content items apply too — [../astro/configuration.md § Verification checklist](../astro/configuration.md#verification-checklist) — skipping its MDX, `astro:assets`, `package.json` engines and `[slug].astro` items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "hugo"`, `build.output_path` matching `publishDir`, and a `build.hugo_version` inside every declared version window
- [ ] `build.build_command` builds with the site's real `baseURL`
- [ ] Every collection that builds pages has a `url` using `[full_slug]` — see [collection-urls.md](collection-urls.md)
- [ ] `pages` excludes every section that has its own collection
- [ ] No collection at `path: ''`
- [ ] Every `_index.md` is deliberately in or out of its section collection
- [ ] The home page opens at `/` in the Visual Editor — through a title-only `content/_index.md` if the home page has no content file
- [ ] Every section of leaf bundles has a glob that matches flat files, a bundle `create.path`, and `disable_add_folder: true`
- [ ] Every key used in a collection's files is in its schema file, or the schema sets `remove_extra_inputs: false`
- [ ] `permalinks`, `slug:` and `url:` overrides are mirrored in the matching collection `url`
- [ ] Every data file referenced by a region or a live partial has a `data_config` entry and a `file_config` entry
- [ ] Taxonomy keys are top-level `multiselect` inputs with `values: data.<taxonomy>` from a seeded data file — no `values: []`
- [ ] Every `select` and `multiselect` has its options configured — see [../configuration-gotchas.md § Editor-owned option lists](../configuration-gotchas.md#editor-owned-option-lists)
- [ ] A settings collection over config files has `include_developer_files: true`, and every file it matches is YAML
- [ ] `markdown` options match the site's Goldmark config — see [configuration-gotchas.md](configuration-gotchas.md#match-goldmark-in-the-markdown-options)
- [ ] Image inputs upload where their template reads from, and page-bundle uploads are configured on inputs and `_editables`, not the collection
- [ ] `npx @cloudcannon/cli validate` passes
