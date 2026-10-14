# Configuration (Hugo)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Hugo, and its [Verification checklist](#verification-checklist) adds the Hugo items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg hugo
```

### A site that already has CloudCannon config

A site that was on CloudCannon before usually has `cloudcannon.config.yaml` (or `.yml`) already. Customize it in place:

- **Run** `npx @cloudcannon/cli validate` on it first, and fix what fails — old configs carry invalid enum values (`source_editor.theme`, icon names) that nothing checked.
- **Run** `configure generate --dry-run` for comparison only. Without `--dry-run` it writes a second `cloudcannon.config.yml` beside the existing file.
- **Sweep** it: `_structures` referenced but never defined, `_inputs` keys that name no field in the content, `[*]` previews on structured arrays — see [../configuration-gotchas.md](../configuration-gotchas.md).
- **Keep** its file name. Renaming `.yaml` to `.yml` gains nothing.
- **Keep** an existing `node_version` or `hugo_version` in `.cloudcannon/initial-site-settings.json` unless it is too old for the toolchain — `hugo_version` must fall inside every version window the site declares (see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson)), and `node_version` must cover what the site's npm tooling needs (Tailwind 4 needs Node 20+).

## Review the generated config

The Hugo baseline is a starting point, not a working config. Check each row:

| Key or area                | What the CLI produces                                                             | Fix                                                                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collections_config.*.url` | **Nothing.** No collection gets a `url`                                           | Add one to every collection that builds pages — see [collection-urls.md](collection-urls.md). Without it, no page opens in the Visual Editor                                                                                                                                                                |
| `pages` collection         | `path: content` with no glob                                                      | Keep it. Section files land in their own collections; check where each excluded `_index.md` lands — see [§ Section collections](#section-collections)                                                                                                                                                       |
| A collection at `path: ''` | Sometimes emitted alongside a `content` collection — it lists the whole repo      | Delete it                                                                                                                                                                                                                                                                                                   |
| Section collections        | Exclude `_index.md` (`glob: ['!_index.md']`), which then falls through to `pages` | Decide per section — see [§ Section collections](#section-collections)                                                                                                                                                                                                                                      |
| `paths`                    | `static: static`, `uploads: static/uploads`                                       | Point `uploads` where the site keeps images (often `static/images`) — see [§ Images](#images)                                                                                                                                                                                                               |
| `markdown`                 | `engine: commonmark` with `table: false`, `strikethrough: false`                  | Match Hugo's Goldmark — see [configuration-gotchas.md § Match Goldmark](configuration-gotchas.md#match-goldmark-in-the-markdown-options)                                                                                                                                                                    |
| `_snippets_imports`        | `hugo` with `exclude: [hugo_instagram]`                                           | Keep it, and narrow it to the shortcodes the site uses — see [cloudcannon-snippets/hugo/overview.md](../../cloudcannon-snippets/hugo/overview.md)                                                                                                                                                           |
| `timezone`                 | The timezone of the machine running the CLI                                       | Set it to the site config's `timeZone` if it sets one; otherwise ask, recommending `Etc/UTC` — Hugo reads a date with no zone as UTC. **Why:** CloudCannon fills `NOW` dates in this zone, and Hugo skips future-dated pages unless `buildFuture` is set. A zone ahead of Hugo's hides a new post for hours |
| `build.build_command`      | `hugo -b /`                                                                       | `hugo`, or `npm run build` — see [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson). `-b /` is for the local dev server only                                                                                                                                                          |

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

## Collections from `content/` sections

Each top-level section of `content/` with its own layout is usually its own collection. Pages that share the default layout go in one `pages` collection.

```yaml
collections_config:
  pages:
    path: content
    glob:
      - "**/*.md"
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

A blog post matches both globs, but it lands only in `blog`: the collection with the most specific `path` wins. A file `blog` excludes falls through to `pages` — see [../configuration-gotchas.md § Overlapping collections](../configuration-gotchas.md#overlapping-collections-each-file-lands-in-one).

### Section collections

A section's `_index.md` is its list page (`/blog/`). Where it goes decides what editors can edit:

| Choice                            | When                                                                                                                  | Config                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Keep it in the section collection | Its front matter drives what the list page shows (a hero, an intro, blocks), and the collection's `url` fits its path | Give it its own schema, and leave it out of `add_options` — see [§ Schemas](#schemas)                                              |
| Let it fall through to `pages`    | Editors need it, but the section's `url` can't express its path (a `permalinks` entry)                                | `!**/_index.md` in the section's glob. Give `pages` a schema for it, left out of `add_options`. `/[full_slug]/` gives its list URL |
| Hide it                           | It only carries a title and the list page has nothing else to edit                                                    | `!**/_index.md` in the section's glob, and `!blog/**/_index.md` in `pages`                                                         |

`!_index.md` matches only the section's own list page. `!**/_index.md` also covers subsection list pages (`blog/news/_index.md`).

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

Hugo reads `data/*.{yml,yaml,json,toml}` into `hugo.Data.<name>` (`site.Data` on Hugo < 0.156). For each file an editor should change, add a `data_config` entry and configure inputs for its keys (usually in `file_config`):

```yaml
data_config:
  footer:
    path: data/footer.yaml
  nav:
    path: data/nav.yaml
```

**MUST:** add a `data_config` entry for every data file a template's editable regions reference as `@data[<name>]`, and for every file a partial reads with `hugo.Data.<name>` (`site.Data` on Hugo < 0.156) that should update in the Visual Editor. A `collections_config` entry for `data/` is not enough.
**Why:** `data_config` is what the Visual Editor loads. A region on an unregistered file never resolves, and the in-browser Hugo has no copy of the file to render from.

To make data files editable, put them in one `data` collection with `path: data` — see [../configuration-gotchas.md § Single `data` collection or split?](../configuration-gotchas.md#single-data-collection-or-split).

Data files that hold select options (tags, authors, icons) follow [../configuration-gotchas.md § Editor-owned option lists](../configuration-gotchas.md#editor-owned-option-lists). On a site whose templates come from a theme or module, check the theme's `data/` before naming one: a project file with the same name replaces the theme's.

Values editors change in `params` and `menus` live in the site config, not `data/` — see [§ Site config as data](#site-config-as-data).

## Schemas

Write each collection's schemas as in [../schemas.md](../schemas.md). Hugo has no content schema of its own, so there is nothing like Zod to keep in sync — the schema file is the only definition of the fields.

- **Seed** each schema from the section's archetype (`archetypes/<section>.md`) if the site has one — it already lists the fields a new file needs. CloudCannon doesn't read archetypes itself.
- **Leave out** fields Hugo fills in at build time (`lastmod` from Git, `.Summary`).
- **Check** each schema for the Hugo keys that files carry but templates rarely show: `params`, `menu`, `resources`, `cascade` and `aliases`. A schema that misses one deletes it on save, so an edit to a post's title can remove its `resources` metadata or `menu` entry. Add the key, or set `remove_extra_inputs: false`:

```yaml
collections_config:
  blog:
    schemas:
      default:
        path: .cloudcannon/schemas/post.md
        remove_extra_inputs: false
```

## Split structure files

When `_structures` grow past a handful of values, split them into files per [../structures.md](../structures.md). On Hugo:

- **Put** them under `.cloudcannon/structures/<array key>/`, mirroring the partial path: `.cloudcannon/structures/content_blocks/home/hero.cloudcannon.structure-value.yml` for `_type: home/hero`.
- **Don't** put them in `layouts/partials/`, even though "next to the component" suggests it — keep the layouts tree to templates.
- **Collect** them with `values_from_glob: ['/.cloudcannon/structures/content_blocks/**/*.cloudcannon.structure-value.yml']`.

## Images

Keep images in `static/`, with `static` mounted into `assets`. Values are root-relative (`/images/photo.jpg`). The same value is a working URL for an image region on any page, and `resources.Get` finds it for `.Resize` and `.Fill`.

```yaml
# hugo.yaml
module:
  mounts:
    - source: assets
      target: assets
    - source: static
      target: assets
```

```yaml
# cloudcannon.config.yml
paths:
  static: static
  uploads: static/images
```

**MUST:** list `source: assets, target: assets` beside the `static` mount, and merge both into any `module.mounts` the site config already has.
**Why:** a mount replaces Hugo's default mount for the same target. The `static` mount alone hides the project's `assets/` folder, and `resources.Get` stops finding its CSS, JS and SCSS. `hugo config mounts` lists the result.

Set `build.noJSConfigInAssets: true` when the site has no `assets/` folder. Hugo writes a generated `jsconfig.json` for `js.Build`, which the editable-regions module uses, into the project's `assets/`. Without that folder it lands in `static/`, where it gets committed and then published, with paths from the build machine.

`resources.Get` accepts the leading slash, so templates pass the stored value unchanged. Hugo publishes every `static/` file as is, so each original ships beside its processed copies.

Configure each input for where its images are now:

| Images are in                                   | Front matter value  | Do                                                                                                                                    |
| ----------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `static/`, read with `<img src="{{ .image }}">` | `/images/photo.jpg` | The global `paths` above. The mount is needed only once a template calls `resources.Get`                                              |
| `static/`, read with `resources.Get`            | `/images/photo.jpg` | The global `paths` and the mount above                                                                                                |
| `assets/`, read with `resources.Get`            | `images/photo.jpg`  | Per-input `paths.uploads: assets/images`, `paths.static: assets`. Offer the user a move to `static/images/`, which adds image regions |
| A page bundle, read with `.Resources.Get`       | `cover.jpg`         | Move the images to `static/images/` — see [§ Page bundles](#page-bundles)                                                             |

Image regions work on root-relative `static/` values only. See [Image editing in Hugo](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#image-editing-in-hugo).

Check the configured paths against a real upload before moving on: upload an image in CloudCannon, then build and confirm the template finds it.

### Page bundles

Recommend moving bundle images to `static/images/` ([migrate-to-cloudcannon/hugo/content.md § Page-bundle images](../../migrate-to-cloudcannon/hugo/content.md#page-bundle-images)). Keep bundles only when the user chooses them after hearing what they cost editors:

- **Image regions work only on the post's own page.** List cards and the home page change the image in the sidebar.
- **A new upload shows only after the next build.**
- **The image browser opens in the post's folder.** Reusing another post's image breaks it.
- **A new post must be saved before it takes images.**

A bundle keeps a post's images with it when the post moves or is deleted, and relative links preview in Git hosts and code editors. Neither reaches editors in CloudCannon. SEO is sometimes given as a reason: moving an image changes only the folder in its URL, and its alt text, file name and size stay the same.

To keep bundles, configure uploads on the inputs and the collection's `_editables`:

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
          uploads: content/blog/[full_slug]/
          static: ""
          uploads_use_relative_path: true
    _inputs:
      image:
        type: image
        comment: Save a new post before adding its image. A new image shows after the next build.
        options:
          paths:
            uploads: content/blog/[full_slug]/
            static: ""
            uploads_use_relative_path: true
```

**MUST:** set `static: ""` on every bundle image input and toolbar.
**Why:** `static` doesn't fill in placeholders, so `[full_slug]` stays literal. With relative paths on, any other value opens the image browser at `static` + `uploads`, a folder that doesn't exist, and can store broken `../../../photo.jpg` values.

**MUST:** configure them there, not with a collection-level `paths` key.
**Why:** `paths` isn't a `collections_config` key — `cloudcannon validate` reports `unexpected property paths`. It is valid at the root, in file, rich text and URL input `options`, and on `_editables.*`.

- **Use** `uploads: content/<section>/[full_slug]/`. In upload paths, a bundle's folder is its `[slug]`, and `[full_slug]` adds any parent folders: `content/blog/2024/post/index.md` uploads to `content/blog/2024/post/`. `[relative_base_path]` is the folder that contains the bundle, so it saves next to the bundle instead of inside it. `""` uploads to the repo root.
- **Keep** `uploads_use_relative_path: true`. It stores the bare filename (`cover.jpg`) that `.Resources.Get` expects; it sets how the value is written, not where the file goes.
- **Repeat** the whole toolbar in a collection-level `_editables.content`. It replaces the root toolbar, and every option left out becomes `false`. Share it between collections with a plain alias (`content: *body_toolbar`) — see [../configuration-gotchas.md § No YAML merge keys](../configuration-gotchas.md#no-yaml-merge-keys).
- **Tell** editors in the input `comment` and the editor README to save a new post before adding its images, and that a new image shows after the next build. Until the entry is saved it has no folder, and an upload lands in the section folder instead of the bundle.

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

`$` is the root of the file and `$[*]` each item in it — see [../inputs.md § The file root](../inputs.md#the-file-root).

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

On Hugo, the [editor README](../configuration.md#editor-readme) also tells editors:

- **Save** a new post before adding its images, and expect a new image after the next build, in a section of page bundles
- **Find** site settings (menus, social links, the footer) under the settings collection — see [configuration-gotchas.md § Config files in a collection must be YAML](configuration-gotchas.md#config-files-in-a-collection-must-be-yaml) for the theme's TOML examples

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these Hugo items.

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "hugo"`, `build.output_path` matching `publishDir`, and a `build.hugo_version` inside every declared version window
- [ ] `build.build_command` builds with the site's real `baseURL`
- [ ] Every collection that builds pages has a `url` that resolves to Hugo's permalink for every file it holds, checked against `hugo list all` — see [collection-urls.md § Verify](collection-urls.md#verify-against-hugo-list-all). `[full_slug]` covers default routing only
- [ ] Every file lands in the collection meant for it — section files in their section, and each `_index.md` in its section, in `pages`, or hidden from both
- [ ] No collection at `path: ''`
- [ ] Every `_index.md` is deliberately in or out of its section collection
- [ ] The home page opens at `/` in the Visual Editor — through a title-only `content/_index.md` if the home page has no content file
- [ ] Every section of leaf bundles has a glob that matches flat files, a bundle `create.path`, and `disable_add_folder: true`
- [ ] `permalinks`, `slug:` and `url:` overrides are mirrored in the matching collection `url`, with no `slug` or `url` added to files just to steer it — see [collection-urls.md § Front matter that changes the URL](collection-urls.md#front-matter-that-changes-the-url)
- [ ] Every data file referenced by a region or a live partial has a `data_config` entry and inputs for its keys — see [../configuration-gotchas.md § Data inputs must follow the data file](../configuration-gotchas.md#data-inputs-must-follow-the-data-file-not-a-template)
- [ ] Every string field's input type matches its template filter — `markdown` for `markdownify`, `html` for `safeHTML`, `text` or `textarea` otherwise — see [configuration-gotchas.md](configuration-gotchas.md#choose-rich-text-inputs-from-the-template-filter)
- [ ] Taxonomy keys are top-level `multiselect` inputs with `values: data.<taxonomy>` from a seeded data file — no `values: []`
- [ ] A settings collection over config files has `include_developer_files: true`, and every file it matches is YAML
- [ ] `markdown` options match the site's Goldmark config — see [configuration-gotchas.md](configuration-gotchas.md#match-goldmark-in-the-markdown-options)
- [ ] Images are in `static/images/`, with `static` mounted into `assets` beside a re-added `assets` mount, or the user chose to keep page bundles
- [ ] Page-bundle uploads are configured on inputs and `_editables`, with `static: ""`
