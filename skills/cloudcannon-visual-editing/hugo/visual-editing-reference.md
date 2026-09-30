# Visual Editing Reference (Hugo)

What Hugo does differently from the generic pattern reference in [../visual-editing-reference.md](../visual-editing-reference.md). Read sections on demand, when [visual-editing.md](visual-editing.md) links here — don't read it front to back.

Targets `github.com/CloudCannon/editable-regions` **v0.0.21**, which declares Hugo **≥ 0.120**. The editor renders with its own Hugo, whatever the site builds with — see [§ What the editor's Hugo has](#what-the-editors-hugo-has) and [visual-editing.md § Upgrading Hugo first](visual-editing.md#upgrading-hugo-first).

## What the editor can re-render

**MUST:** put anything you want re-rendered in a partial. Only your project's partials, shortcodes and render hooks are bundled for the editor. Page templates — `baseof.html`, `single.html`, `list.html`, `layouts/<section>/*.html`, `404.html` — are not.
**Why:** the editor re-renders a component region by calling `partial "<data-component>"` in an in-browser Hugo. A section written inline in a page template has nothing to call, so its component region can't re-render.

Hugo has two layout-folder schemes, and themes use either:

| Kind           | Before Hugo 0.146                           | Hugo 0.146+                                    |
| -------------- | ------------------------------------------- | ---------------------------------------------- |
| Partials       | `layouts/partials/`                         | `layouts/_partials/`                           |
| Shortcodes     | `layouts/shortcodes/`                       | `layouts/_shortcodes/`                         |
| Render hooks   | `layouts/_default/_markup/`                 | `layouts/_markup/`                             |
| Kind templates | `layouts/_default/single.html`, `list.html` | `layouts/single.html`, `list.html` (top level) |

Shortcodes and partials can come from the project or from any theme or module; `hugo config mounts` lists every directory Hugo reads them from.

**MUST:** put project partials, shortcodes and render hooks that the editor re-renders in `layouts/partials/`, `layouts/shortcodes/` and `layouts/_default/_markup/`, even on a site whose theme uses the new scheme. A project `layouts/partials/card.html` still overrides a theme's `layouts/_partials/card.html`.
**Why:** the module bundles only those three project folders. A partial in the project's `layouts/_partials/` builds fine and fails only in the editor, with `No Hugo partial found for component`. A theme's or module's `_partials/` is bundled with the rest of its `layouts/`.

| Region in a page template           | Works?                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| `text`, `image`, `array`, `source`  | Yes — primitives update the live DOM and never re-render |
| `component` wrapping a partial call | Yes — the partial is bundled                             |
| `component` around inline markup    | No — extract the markup into a partial first             |

Subdirectories inside `partials/` are bundled too, so `layouts/partials/home/hero.html` resolves as `home/hero`.

The editor bundles only files inside the project. A dependency in `themes/`, or a vendored module in `_vendor/`, gets its root config (`hugo.*`, `config.*`), `layouts/`, `i18n/` and `data/` bundled. A module in the module cache is missing all of these in the editor. See [§ Themes, modules and vendoring](#themes-modules-and-vendoring).

## Component names are partial paths

**MUST NOT:** look for a registration step. There isn't one. `data-component` is the partial path relative to the partials folder, with or without the extension — `card`, `card.html` and `blog/hero` all resolve.

```go-html-template
<div data-editable="component" data-component="card" data-prop="card">
  {{- partial "card" .Params.card -}}
</div>
```

Name components so the content discriminator is the partial path. Then `_name: home/hero` both selects the structure and names the partial, and the page builder needs no lookup table.

## The partial's context is the `data-prop` value

**MUST:** call a component partial with exactly the value its region's `data-prop` points at, and nothing else, as its context (`.`).
**Why:** on re-render the editor calls `partial "<data-component>"` with the `data-prop` value as `.`. A partial the build calls with a page, a `dict`, or a wrapper map gets a different shape in the editor, and renders blank or errors — the build never shows the problem.

| The partial needs                                    | Read it from                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Its own fields                                       | `.` — the `data-prop` value                                                                                                       |
| The page being edited (title, taxonomies, `.Params`) | `page` — e.g. `page.Params.tags`, `page.RelPermalink`                                                                             |
| Site config values no region edits                   | `site.Params`, `site.Title` — never `.Site`, because `.` is not a page                                                            |
| Site config values a region edits                    | `.` — bind the config file as the region's `data-prop`, see [§ Site config values](#site-config-values)                           |
| Data files                                           | `hugo.Data.<name>` (Hugo ≥ 0.156; the editor's renderer is newer, see [§ What the editor's Hugo has](#what-the-editors-hugo-has)) |

```go-html-template
{{/* ✗ build passes a dict; the editor passes post_hero */}}
{{ partial "blog/hero" (dict "Params" .Params.post_hero "tags" .Params.tags) }}

{{/* ✓ both pass post_hero; the partial reads tags from page */}}
<editable-component data-component="blog/hero" data-prop="post_hero">
  {{ partial "blog/hero" .Params.post_hero }}
</editable-component>
```

**Array items:** call a partial that renders one array item with the item itself — `{{ range .Params.features }}{{ partial "feature.html" . }}{{ end }}` — not with a `dict` rebuilt from its fields. The editor re-renders the partial with the item as its context, and if the partial reads the same keys the build output is unchanged. When the call is in a theme template, change it in the project override ([§ Adding regions to theme templates](#adding-regions-to-theme-templates)).

**Common miss:** wrapping an existing `{{ partial "header.html" . }}` — whose `.` is the page — in a component region. Reshape the partial first, as in [§ Data files and `@data`](#data-files-and-data).

## Page builder blocks in Hugo

The block dispatcher is a `range` in the page template, with each item's `_name` naming its partial:

```go-html-template
<div data-editable="array" data-prop="content_blocks" data-component-key="_name">
  {{ range .Params.content_blocks }}
    <div data-editable="array-item" data-id="{{ ._name }}" data-component="{{ ._name }}">
      {{ partial ._name . }}
    </div>
  {{ end }}
</div>
```

- `data-id-key` defaults to `data-component-key`, so it can be omitted when both are `_name`.
- A heterogeneous array with a component key needs no `<template>` — the component pipeline renders new rows.
- A sub-array inside a block whose items are themselves partials (a `buttons` list mixing `buttons/primary` and `buttons/secondary`) takes the same attributes: `data-component-key="_name"` on its container, `data-component="{{ ._name }}"` on each item, and no `<template>`.
- The dispatcher's wrapper is the array-item host: it carries both `data-editable="array-item"` and `data-component`, and the partial's root stays plain markup — see [§ Wrapper elements around partials](#wrapper-elements-around-partials).
- Put the dispatcher in every layout that renders `content_blocks` — usually `single.html` **and** `list.html` (under `_default/` on the older scheme), because section `_index.md` pages use the list layout.

The generic three-layer rule (array, array-item + component, nested editables) is in [../visual-editing-reference.md § Page builder blocks](../visual-editing-reference.md#page-builder-blocks).

## Wrapper elements around partials

**MUST:** put `data-editable="array-item"` on a wrapper element around the `partial` call, not inside the partial.
**Why:** a Go template can't add attributes to the root element of a partial from the call site, and the generic rule puts the array-item host outside the component ([Page builder blocks](../visual-editing-reference.md#page-builder-blocks)).

The wrapper becomes the flex or grid item in place of the partial's root. Run the checks in [../visual-editing-reference.md § Wrapper elements change the formatting context](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context) before adding wrappers, and **keep** each partial single-root — a partial that renders an element plus a `<style>` or `<script>` has no single root to sit in the wrapper cleanly.

**MUST NOT:** use `display: contents` on the wrapper — see [../visual-editing-reference.md § Don't mix array items with non-array siblings](../visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings).

## Passing selectors into a partial

**MUST:** pass the region's selector into a shared partial as a parameter rather than wrapping the partial's output in a region.
**Why:** a wrapper adds a DOM level, which breaks image and layout CSS; a parameter keeps the partial's markup unchanged and lets callers with different data paths share it.

```go-html-template
{{ partial "processed-image" (dict
  "image_path" .image.image_path
  "prop_src" "image.image_path"
  "prop_alt" "image.alt_text") }}

{{/* inside processed-image.html */}}
<img src="{{ .image_path }}"
  {{ with .prop_src }}data-editable="image" data-prop-src="{{ . }}"{{ end }}
  {{ with .prop_alt }}data-prop-alt="{{ . }}"{{ end }}>
```

Omit the props and it renders a plain `<img>`, so one partial serves editable and read-only callers. A content block passes `image.image_path`; a header partial passes `@data[nav].header.logo`.

## `ENV_CLIENT` in Hugo

The module defines `site.Params.ENV_CLIENT`: `false` in a normal build, `true` in the editor's renderer. It is Hugo's form of the generic flag in [../visual-editing-reference.md § Detecting the editor](../visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic).

| Use                                                            | Pattern                                                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip the asset pipeline                                        | `{{ if or site.Params.ENV_CLIENT (hasSuffix .image_path ".svg") }}<img src="{{ .image_path }}">{{ else }}{{ with resources.Get .image_path }}…{{ end }}{{ end }}`     |
| Render an empty array's container inside a re-rendered partial | `{{ if or .buttons site.Params.ENV_CLIENT }}<div data-editable="array" data-prop="buttons">…</div>{{ end }}`                                                          |
| Skip an inline script                                          | `{{ if not site.Params.ENV_CLIENT }}<script>…</script>{{ end }}` — see [../visual-editing-reference.md § Other scripts](../visual-editing-reference.md#other-scripts) |
| Render a fallback for a widget                                 | `{{ if site.Params.ENV_CLIENT }}<p>Preview unavailable</p>{{ else }}{{ partial "widget" . }}{{ end }}`                                                                |

**MUST:** guard every `resources.Get`, `.Resize`, `.Fill`, `.Process` and `images.*` call in a partial that is a component region, and in every partial it calls. Follow each re-rendered partial's `partial` calls down — an icon partial that reads `assets/` with `resources.Get` is the usual indirect call. For each call, decide whether losing it in the editor is acceptable (a decorative image) or needs a plain-path branch.
**Why:** the editor re-renders only component partials and what they call, and there `resources.Get` finds nothing outside [`additional_dirs`](#what-the-editors-hugo-has), so an unguarded image renders as nothing. Templates the editor never re-renders need no guard — on a theme site, guarding them means forking theme files for no benefit.

**Small text assets** (an icon SVG read through `resources.Get … .Content`, a JSON or CSV lookup): list the directory in `params.editable_regions.additional_dirs` (`assets/icons: [".svg"]`) instead of guarding. Files listed there are bundled at their `assets/…` path, and `resources.Get` finds them in the editor.

**MUST:** keep the `ENV_CLIENT` guard around image processing even when the image's directory is in `additional_dirs`.
**Why:** a binary file listed there is found by `resources.Get` but arrives unreadable, and `.Resize` fails with `image: unknown format`. Use `additional_dirs` for text assets only.

The `ENV_CLIENT` branch serves a plain path, so the same path must work in both branches. If images live in `static/`, mount `static` into `assets` so `resources.Get` finds them at build time:

```yaml
module:
  mounts:
    - source: assets
      target: assets
    - source: static
      target: assets
```

How much of this a site needs depends on its pipeline. A site whose components use plain `<img src>` against `static/` needs no image guard at all.

**Empty arrays in templates the editor never re-renders:** `ENV_CLIENT` only changes what the editor's renderer produces. Page templates, and partials called only from page templates, are never re-rendered — the editor's first paint of them is the production build. For an array rendered there (the page-builder dispatcher), guard on the key's presence, not its truthiness, so an empty list still renders its container: `{{ if isset .Params "content_blocks" }}`. `isset .Params` takes the **lowercased** key. Seed the key (`content_blocks: []`) in the schema file.

**Common miss:** an empty-array container shows in the editor with no items and no height — see [../visual-editing-reference.md § Array editing](../visual-editing-reference.md#array-editing) for the editor-only CSS.

### Nil safety

Editors add blocks with empty fields, and a template error in the editor's renderer blanks the component. Guard with `with` or `isset` before indexing: `index (split .video_path ".") 1` errors on an empty path — use `path.Ext .video_path` or wrap it in `{{ with .video_path }}`.

## What the editor's Hugo has

The in-browser Hugo is not a copy of the build — module v0.0.21's renderer is Hugo 0.164.0, whatever version the site builds with. Plan partials around what it has:

| Available in the editor                                                                                                                         | Not available                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bundled partials, shortcodes, render hooks, config files, `i18n/`                                                                               | Page templates (see [§ What the editor can re-render](#what-the-editor-can-re-render))                  |
| Every collection file's **front matter**                                                                                                        | **The markdown body** — `.Content`, `.Summary`, `.WordCount` and `.TableOfContents` are empty           |
| Data files configured in `data_config`, live-updated on edit (`hugo.Data`)                                                                      | `static/`, and `assets/` files not listed in `additional_dirs`                                          |
| `site.RegularPages` and other page collections, including unsaved edits                                                                         | Taxonomy, term, RSS, sitemap and 404 pages (disabled in the renderer)                                   |
| Files listed in `additional_paths` / `additional_dirs`, including under `assets/` (text files only — see [§ `ENV_CLIENT`](#env_client-in-hugo)) | Anything else a template reads from disk (`os.ReadFile`, `readFile`, `transform.Unmarshal` of a file)   |
| Site config (`site.Params`, `site.Menus`), **as it was at build time**                                                                          | Edits to site config — the renderer never reloads it (see [§ Site config values](#site-config-values))  |
| The config and templates of dependencies inside the project (`themes/`, `_vendor/`)                                                             | Dependencies in the module cache (see [§ Themes, modules and vendoring](#themes-modules-and-vendoring)) |

**MUST NOT:** render `.Content` inside a component partial. It re-renders as empty. Put the body on a primitive region in the page template instead — `data-editable="text" data-prop="@content"` on the element that wraps `{{ .Content }}`.

**Common miss:** data files the site reads but that aren't in `data_config` are absent in the editor. A partial that reads `hugo.Data.menu` renders empty there until `menu` is a dataset. `i18n/` strings are bundled at build time and don't live-update.

## Text regions and markdown in Hugo

A rich text region saves markdown ([../visual-editing-reference.md § Text editing](../visual-editing-reference.md#text-editing)). Hugo's markdown step is `markdownify`:

| `data-type`         | Render the field as                                                |
| ------------------- | ------------------------------------------------------------------ |
| `span` (or omitted) | `{{ .field }}`                                                     |
| `text`              | `{{ .field \| markdownify }}`                                      |
| `block`             | `{{ .field \| markdownify }}` on a block host (`<div>`, not `<p>`) |

Find rich text regions whose content isn't rendered through `markdownify`. The attribute and the pipe are often on different lines, so match across lines:

```sh
find layouts -name '*.html' -exec perl -0ne 'while (/data-type="(?:text|block)"[^>]*>(.*?)<\//sg) { my $m = $&; print "$ARGV:\n$m\n\n" unless $1 =~ /markdownify|RenderString/ }' {} +
```

Read each hit: the script only looks up to the first closing tag. Every real one is a region whose formatting will print as literal `**asterisks**` after the next build. Either add `| markdownify`, or change the region to `data-type="span"` if the field was never meant to hold formatting.

`markdownify` drops the wrapping `<p>` from single-paragraph input, so a `block` region on a `<p>` host can render fine today and break the first time an editor adds a list.

## Data files and `@data`

Shared partials — header, footer, navigation — render from `baseof.html` and read a data file. Their regions use `@data[<name>]` selectors, which edit the shared data file from any page.

**Primitives only** — when the partial has no conditionals or computed values, keep its context as it is and put `@data` selectors on the fields:

```go-html-template
{{ with hugo.Data.footer }}
  <p><editable-text data-prop="@data[footer].copyright">{{ .copyright }}</editable-text></p>
  <ul data-editable="array" data-prop="@data[footer].links">
    {{ range .links }}
      <li data-editable="array-item"><a href="{{ .link }}" data-editable="text" data-prop="text">{{ .text }}</a></li>
    {{ end }}
  </ul>
{{ end }}
```

**Re-rendered** — when the header or footer has conditionals, toggles or class bindings, it needs a component region. Pass the data file itself as the partial's context, and read anything page-specific (the active link, per-page overrides) through `page`:

```go-html-template
{{/* baseof.html */}}
<editable-component data-component="navbar" data-prop="@data[nav]">
  {{ partial "navbar.html" hugo.Data.nav }}
</editable-component>

{{/* layouts/partials/navbar.html — . is the nav data file */}}
<nav data-editable="array" data-prop="links">
  {{ range .links }}
    <a data-editable="array-item" href="{{ .link }}"
      {{ if eq .link page.RelPermalink }}aria-current="page"{{ end }}>
      <editable-text data-prop="text">{{ .text }}</editable-text>
    </a>
  {{ end }}
</nav>
```

Inside the component, selectors are relative to `@data[nav]` — `data-prop="links"`, not `@data[nav].links`.

**MUST:** register `<name>` in `data_config`. A `collections_config` entry for `data/` is not enough — the selector silently never resolves.

`range $i, $item := .sections` with `data-prop="@data[footer].sections.{{ $i }}.title"` binds fields of an array that can't be an array region — see [../visual-editing-reference.md § Data-prop paths](../visual-editing-reference.md#data-prop-paths--pick-one).

### Site config values

Values that live in site config (`params`, `menus`, language config) are edited through a settings collection over the config files — see [cloudcannon-configuration/hugo/configuration.md § Site config as data](../../cloudcannon-configuration/hugo/configuration.md#site-config-as-data). Bind a region to the config file:

| The config file is   | Selector                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| In `data_config`     | `@data[<name>].<key>`, e.g. `@data[params].intro`                        |
| Only in a collection | `@file[/<path>].<key>`, e.g. `@file[/config/_default/params.yaml].intro` |

Primitive regions on these selectors work as they are.

**MUST:** make a component partial over config-driven content read the values its regions edit from its context (`.`), with the config file as the region's `data-prop`, never from `site.Params` or `site.Menus`. `site.Params` stays fine for values no region edits.
**Why:** the editor passes the edited value to the region, but its renderer never reloads site config. A partial reading `site.*` re-renders with the build-time value, so the edit looks lost until the next build.

When templates come from a theme and the theme's partial reads `site.*`, either add a minimal project override that takes the value as its context ([§ Adding regions to theme templates](#adding-regions-to-theme-templates)), or leave the field `sidebar-only`.

## Blog post detail pages

A post's layout (`layouts/blog/single.html`, `single.html`) is a page template, so it is never re-rendered. That is fine for its usual regions:

- **Body** — `data-editable="text" data-prop="@content"` on an element whose **only** content is `{{ .Content }}`. If the existing wrapper holds anything else (a title, a share block), add a new wrapper just around `{{ .Content }}` — and run the [formatting-context checks](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context) first, since the theme's body CSS often targets `.content > p`.
- **Title, summary, hero image** — primitive `text` and `image` regions on front matter keys.
- **A hero built from several fields with conditionals** — move it into a partial and wrap the call in a component region, e.g. `<editable-component data-component="blog/hero" data-prop="post_hero">`.

**MUST NOT:** make taxonomy fields (`tags`, `categories`) text regions. They must stay top-level front matter arrays for Hugo's taxonomies, and belong to a `multiselect` input in the sidebar. Formatted dates (`.Date.Format`) are sidebar-only for the same reason as in every SSG.

### List pages

**MUST:** wrap front matter regions in `list.html` in `{{ if .File }}`.
**Why:** the same template usually renders section pages (with an `_index.md`) and generated taxonomy and term pages, which have no file for the region to write to.

### Partials shared by the page and its lists

A partial rendered both for the current page and for each item of a `range` over other pages (a post card, a summary) takes a flag from the caller, and emits regions only for the current page:

```go-html-template
{{ partial "post-summary.html" (dict "page" . "editable" true) }}

{{/* inside post-summary.html */}}
<h2 {{ if .editable }}data-editable="text" data-prop="title"{{ end }}>{{ .page.Title }}</h2>
```

**Why:** otherwise every list entry gets a region bound to the list page's own front matter. This is the Hugo form of [../visual-editing-reference.md § Cross-collection items on a page](../visual-editing-reference.md#cross-collection-items-on-a-page). Many themes already pass such a flag (an "is this the single page" boolean) — reuse it.

## Image editing in Hugo

**MUST NOT:** put an image region on an image whose stored value is relative to a page bundle or to `assets/` — anything the template resolves with `.Resources` or `resources.Get`. Edit it in the sidebar instead.
**Why:** on load the image region compares the rendered `src` (resolved and absolute) with the raw stored value. They never match, so it replaces the `src` with a preview URL built from the raw value, which drops the bundle directory. The image breaks on first paint in the editor.

| Stored value                                                    | Image region?            |
| --------------------------------------------------------------- | ------------------------ |
| Root-relative path to a file in `static/` (`/images/cover.jpg`) | Yes                      |
| A filename in the page bundle (`cover.jpg`)                     | No — sidebar image input |
| A path under `assets/` (`images/cover.jpg`)                     | No — sidebar image input |

Moving bundle or `assets/` images into `static/` makes them region-editable, but it is a content migration and loses Hugo's image processing. Offer it to the user; don't make it the default. Upload paths for bundle images are in [cloudcannon-configuration/hugo/configuration.md § Images](../../cloudcannon-configuration/hugo/configuration.md#images).

## Themes, modules and vendoring

Where the site's templates **and config** come from decides whether the editor can see them. The editor bundles only files inside the project:

| Dependency lives in                              | Bundled for the editor                                                    | Action                                |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------- |
| The project's `layouts/`                         | Partials, shortcodes, render hooks                                        | None                                  |
| A theme in `themes/` (copied or a git submodule) | Its root config (`hugo.*`, `config.*`), `layouts/`, `i18n/`, `data/`      | None                                  |
| A Hugo module in the module cache                | **Nothing** — its config, `layouts/`, `i18n/` and `data/` are all missing | Vendor it in the build command        |
| A vendored module in `_vendor/`                  | Its root config, `layouts/`, `i18n/`, `data/`                             | Keep `_vendor/` present at build time |

**MUST:** bundle a module-cache dependency when any re-rendered template **or** the site config depends on it. Sites whose dependencies all live in `themes/` skip this.
**Why:** the editor's renderer skips a missing import without an error, and every component region then fails. Config usually fails first: a site config that names a theme-defined output format fails every component with `unknown output format "<name>" for kind "<kind>"`. A site with a complete `layouts/` can still depend on the theme's config — output formats, media types, params defaults, taxonomies. Vendoring also bundles the theme's page templates beside the project's overrides; that's harmless, because the editor never re-renders page templates.

Vendor in the build command, with `_vendor/` gitignored:

```sh
hugo mod vendor && hugo
```

Committing `_vendor/` instead also works, and removes the build's need for Go and network access to the module source. Where the build command lives is in [migrate-to-cloudcannon/hugo/build.md](../../migrate-to-cloudcannon/hugo/build.md).

**MUST NOT:** add a `version` key to any `module.imports` entry — see [visual-editing.md § Setup steps](visual-editing.md#setup-steps). Besides failing the editor's module download, it makes `hugo mod vendor` write `_vendor/<path>@<version>/`, a folder the editor's bundler doesn't match to the import, so a theme pinned that way still loses its config and `i18n/` after vendoring. Pin versions with `hugo mod get <path>@<version>` instead.

### Adding regions to theme templates

When templates come from a theme or module, add regions through a minimal project override:

1. **Copy** the theme template to the same path under the project's `layouts/` (a theme `layouts/_partials/hero.html` goes to the project's `layouts/partials/hero.html` — see [§ What the editor can re-render](#what-the-editor-can-re-render)).
2. **Add** only the region attributes, plus the smallest structural change a region needs (a wrapper around `{{ .Content }}`, a partial call that passes the item itself).
3. **Head** the file with a comment naming the theme version it was copied from and what changed.
4. **List** every override in `.cloudcannon/migration/visual-editing.md` and the site README, with the command to diff it against the upstream file when the theme is updated (`diff themes/<theme>/layouts/<path> layouts/<path>`).

**Why:** primitive regions live in the built HTML, so the attributes have to be in the template Hugo builds with. Keeping each override minimal keeps the theme updatable.

**MUST NOT:** use `templates_overrides` to add regions. It replaces a template **in the editor only** — the built HTML, and so every primitive region, comes from the original. Use it only to change what the editor renders ([§ Module options](#module-options)).

Keep overrides few: a field whose region would mean forking a large theme template for little gain can stay `sidebar-only` ([../visual-editing.md § Rules for `sidebar-only` justification](../visual-editing.md#rules-for-sidebar-only-justification)).

### When vendoring fails

When templates come from a module that `hugo mod vendor` can't vendor, repeat in the project what the editor needs:

- **Repeat** in project config every output format and media type the site config names, and any theme `params` defaults a re-rendered partial reads. Project definitions merge over the theme's, so the real build is unchanged.
- **Put** every re-rendered partial in the project's `layouts/partials/`.
- **Copy** the theme `i18n/` keys those partials use into the project's `i18n/`.

`hugo mod vendor` can fail outright — for example, on a module that mounts `node_modules/…`, with `stat …/<module>@…/<absolute project path>/node_modules/<pkg>: no such file or directory`.

**Not a fix:** `params.editable_regions.config_paths` and `config_dirs` take project-relative paths only, so they can't point at module files, and setting either switches off the module's own config discovery.

## Module options

All under `params.editable_regions` in the site config.

| Option                                      | Use when                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verbose`                                   | Debugging the renderer — logs to the editor's console                                                                                                                                                                                                                                                                                               |
| `templates_overrides`                       | A partial depends on build-time state the editor lacks. Maps a template's path to an editor-only replacement: `"layouts/partials/card.html" = "overrides/card.html"`. The built site keeps the original, so this changes what the editor renders — it can't add regions ([§ Adding regions to theme templates](#adding-regions-to-theme-templates)) |
| `additional_paths` / `additional_dirs`      | A template reads a file that isn't a template, config, i18n or dataset file (a lookup JSON or CSV), or a re-rendered partial reads a small text asset from `assets/` with `resources.Get` (`assets/icons: [".svg"]`). Text files only — see [§ `ENV_CLIENT` in Hugo](#env_client-in-hugo)                                                           |
| `template_dirs`                             | Layouts live somewhere other than the module graph. Replaces discovery — every listed directory is walked in full                                                                                                                                                                                                                                   |
| `config_paths` / `config_dirs`              | Config lives outside the standard `hugo.*`, `config.*` or `config/` locations. Project-relative only; setting either switches off root-config discovery                                                                                                                                                                                             |
| `i18n_dirs`                                 | Translation files live outside `i18n/`                                                                                                                                                                                                                                                                                                              |
| `wasm_url` / `wasm_base_url` / `_version`   | The renderer WASM can't be fetched from the module's GitHub release — see [troubleshooting.md](troubleshooting.md)                                                                                                                                                                                                                                  |
| `template_extensions`, `ignore_directories` | Templates use an extension other than `.html`/`.htm`, or a directory must be skipped                                                                                                                                                                                                                                                                |

## Troubleshooting

Hugo-specific symptom → fix is in [troubleshooting.md](troubleshooting.md); generic symptoms are in [../troubleshooting.md](../troubleshooting.md).
