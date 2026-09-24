# Visual Editing Reference (Hugo)

What Hugo does differently from the generic pattern reference in [../visual-editing-reference.md](../visual-editing-reference.md). Read sections on demand, when [visual-editing.md](visual-editing.md) links here — don't read it front to back.

Targets `github.com/CloudCannon/editable-regions` **v0.0.21** on Hugo **≥ 0.150**.

## What the editor can re-render

**MUST:** put anything you want re-rendered in a partial. Only your project's partials, shortcodes and render hooks (`layouts/partials/**`, `layouts/shortcodes/**`, `layouts/_default/_markup/**`) are bundled for the editor. Page templates — `baseof.html`, `single.html`, `list.html`, `layouts/<section>/*.html`, `404.html` — are not.
**Why:** the editor re-renders a component region by calling `partial "<data-component>"` in an in-browser Hugo. A section written inline in a page template has nothing to call, so its component region can't re-render.

| Region in a page template           | Works?                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| `text`, `image`, `array`, `source`  | Yes — primitives update the live DOM and never re-render |
| `component` wrapping a partial call | Yes — the partial is bundled                             |
| `component` around inline markup    | No — extract the markup into a partial first             |

Subdirectories inside `partials/` are bundled too, so `layouts/partials/home/hero.html` resolves as `home/hero`.

Themes and modules are the exception: a dependency inside the project (a theme in `themes/`, or a vendored module in `_vendor/`) has its whole `layouts/`, `i18n/` and `data/` bundled. See [§ Themes, modules and vendoring](#themes-modules-and-vendoring).

## Component names are partial paths

**MUST NOT:** look for a registration step. There isn't one. `data-component` is the partial path relative to `layouts/partials/`, with or without the extension — `card`, `card.html` and `blocks/hero` all resolve.

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
| Site config and params                               | `site.Params`, `site.Title` — never `.Site`, because `.` is not a page                                                            |
| Data files                                           | `hugo.Data.<name>` (Hugo ≥ 0.156; the editor's renderer is newer, see [§ What the editor's Hugo has](#what-the-editors-hugo-has)) |

```go-html-template
{{/* ✗ build passes a dict; the editor passes post_hero */}}
{{ partial "blog/hero" (dict "Params" .Params.post_hero "tags" .Params.tags) }}

{{/* ✓ both pass post_hero; the partial reads tags from page */}}
<editable-component data-component="blog/hero" data-prop="post_hero">
  {{ partial "blog/hero" .Params.post_hero }}
</editable-component>
```

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
- In Hugo the dispatcher's wrapper carries both `data-editable="array-item"` and `data-component`; the partial's root stays plain markup. This is the "page template side" placement from the generic rule — see [§ Wrapper elements around partials](#wrapper-elements-around-partials).
- Put the dispatcher in every layout that renders `content_blocks` — usually `_default/single.html` **and** `_default/list.html`, because section `_index.md` pages use the list layout.

The generic three-layer rule (array, array-item + component, nested editables) is in [../visual-editing-reference.md § Page builder blocks](../visual-editing-reference.md#page-builder-blocks).

## Wrapper elements around partials

**MUST:** put `data-editable="array-item"` on a wrapper element around the `partial` call, not inside the partial.
**Why:** a Go template can't add attributes to the root element of a partial from the call site, and the generic rule puts the array-item on the page template's side ([Page builder blocks](../visual-editing-reference.md#page-builder-blocks)).

The wrapper becomes the flex or grid item in place of the partial's root. Before adding wrappers:

- **Check** container selectors such as `.row > *` and `align-items` rules — they now match the wrapper.
- **Check** each component root for a `display` it only had because its parent was flex or grid (a flex container blockifies its children). Give the component its own `display` rather than styling the wrapper.
- **Keep** each partial single-root. A partial that renders an element plus a `<style>` or `<script>` has no single root to sit in the wrapper cleanly.

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

| Use                                                            | Pattern                                                                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip the asset pipeline                                        | `{{ if or site.Params.ENV_CLIENT (hasSuffix .image_path ".svg") }}<img src="{{ .image_path }}">{{ else }}{{ with resources.Get .image_path }}…{{ end }}{{ end }}` |
| Render an empty array's container inside a re-rendered partial | `{{ if or .buttons site.Params.ENV_CLIENT }}<div data-editable="array" data-prop="buttons">…</div>{{ end }}`                                                      |
| Skip an inline script                                          | `{{ if not site.Params.ENV_CLIENT }}<script>…</script>{{ end }}`                                                                                                  |
| Render a fallback for a widget                                 | `{{ if site.Params.ENV_CLIENT }}<p>Preview unavailable</p>{{ else }}{{ partial "widget" . }}{{ end }}`                                                            |

**MUST:** guard every `resources.Get`, `.Resize`, `.Fill`, `.Process` and `images.*` call reached from a bundled partial. Grep the whole `layouts/` tree, not just the page-builder blocks — headers, footers and list partials call the pipeline too.
**Why:** the editor's Hugo has no `assets/` or `static/` directory ([§ What the editor's Hugo has](#what-the-editors-hugo-has)), so an unguarded `resources.Get` returns nil and the image renders as nothing.

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

**Empty arrays in page templates:** `ENV_CLIENT` only changes what the editor's renderer produces, and page templates are never re-rendered — the editor's first paint is the production build. For an array rendered directly in a page template (the page-builder dispatcher), guard on the key's presence, not its truthiness, so an empty list still renders its container: `{{ if isset .Params "content_blocks" }}`. Seed the key (`content_blocks: []`) in the schema file.

**Common miss:** an empty-array container shows in the editor with no items and no height. Give it enough box for the "Add item" button to land.

**Nil safety.** Editors add blocks with empty fields, and a template error in the editor's renderer blanks the component. Guard with `with` or `isset` before indexing: `index (split .video_path ".") 1` errors on an empty path — use `path.Ext .video_path` or wrap it in `{{ with .video_path }}`.

## What the editor's Hugo has

The in-browser Hugo is not a copy of the build — module v0.0.21's renderer is Hugo 0.164.0, whatever version the site builds with. Plan partials around what it has:

| Available in the editor                                                    | Not available                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Bundled partials, shortcodes, render hooks, config files, `i18n/`          | Page templates (see [§ What the editor can re-render](#what-the-editor-can-re-render))                |
| Every collection file's **front matter**                                   | **The markdown body** — `.Content`, `.Summary`, `.WordCount` and `.TableOfContents` are empty         |
| Data files configured in `data_config`, live-updated on edit (`hugo.Data`) | `assets/` and `static/` — so no `resources.Get`                                                       |
| `site.RegularPages` and other page collections, including unsaved edits    | Taxonomy, term, RSS, sitemap and 404 pages (disabled in the renderer)                                 |
| Files listed in `additional_paths` / `additional_dirs`                     | Anything else a template reads from disk (`os.ReadFile`, `readFile`, `transform.Unmarshal` of a file) |

**MUST NOT:** render `.Content` inside a component partial. It re-renders as empty. Put the body on a primitive region in the page template instead — `data-editable="text" data-prop="@content"` on the element that wraps `{{ .Content }}`.

**Common miss:** data files the site reads but that aren't in `data_config` are absent in the editor. A partial that reads `hugo.Data.menu` renders empty there until `menu` is a dataset. `i18n/` strings are bundled at build time and don't live-update.

## Text regions and markdown in Hugo

A text region with `data-type="text"` or `"block"` saves markdown, so the template must render that field through `markdownify`:

| `data-type`         | Render the field as                                                |
| ------------------- | ------------------------------------------------------------------ |
| `span` (or omitted) | `{{ .field }}`                                                     |
| `text`              | `{{ .field \| markdownify }}`                                      |
| `block`             | `{{ .field \| markdownify }}` on a block host (`<div>`, not `<p>`) |

```sh
grep -rn 'data-type="\(text\|block\)"' layouts | grep -v markdownify
```

Every match is a region whose formatting will print as literal `**asterisks**` after the next build. Either add `| markdownify`, or change the region to `data-type="span"` if the field was never meant to hold formatting.

`markdownify` drops the wrapping `<p>` from single-paragraph input, so a `block` region on a `<p>` host can render fine today and break the first time an editor adds a list. The host rule is in [../visual-editing-reference.md § Text editing](../visual-editing-reference.md#text-editing).

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

## Blog post detail pages

A post's layout (`layouts/blog/single.html`, `_default/single.html`) is a page template, so it is never re-rendered. That is fine for its usual regions:

- **Body** — `data-editable="text" data-prop="@content"` on the element wrapping `{{ .Content }}`.
- **Title, summary, hero image** — primitive `text` and `image` regions on front matter keys.
- **A hero built from several fields with conditionals** — move it into a partial and wrap the call in a component region, e.g. `<editable-component data-component="blog/hero" data-prop="post_hero">`.

**MUST NOT:** make taxonomy fields (`tags`, `categories`) text regions. They must stay top-level front matter arrays for Hugo's taxonomies, and belong to a `multiselect` input in the sidebar. Formatted dates (`.Date.Format`) are sidebar-only for the same reason as in every SSG.

## Themes, modules and vendoring

Where the site's templates come from decides whether the editor can see them:

| Templates live in                 | Bundled?                                       | Action                                               |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| The project's `layouts/`          | Partials, shortcodes, render hooks             | None                                                 |
| A theme in `themes/`              | The theme's whole `layouts/`, `i18n/`, `data/` | None                                                 |
| A Hugo module in the module cache | **No**                                         | `hugo mod vendor`, then commit or rebuild `_vendor/` |
| A vendored module in `_vendor/`   | Its whole `layouts/`, `i18n/`, `data/`         | Keep `_vendor/` present at build time                |

**MUST:** vendor only when the site's own templates come from a module in the module cache.
**Why:** vendoring walks every vendored module, including editable-regions' own build-time helper partials, into the editor bundle. That is harmless but dead weight, and `_vendor/` is gitignored on most sites, so a vendored setup that works locally can vanish on CloudCannon's build.

To override a theme or module partial for the editor only, use `templates_overrides` rather than forking the theme — see [§ Module options](#module-options).

## Module options

All under `params.editable_regions` in the site config.

| Option                                      | Use when                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verbose`                                   | Debugging the renderer — logs to the editor's console                                                                                                                                                   |
| `templates_overrides`                       | A partial depends on build-time state the editor lacks. Maps a template's path to an editor-only replacement: `"layouts/partials/card.html" = "overrides/card.html"`. The built site keeps the original |
| `additional_paths` / `additional_dirs`      | A template reads a file that isn't a template, config, i18n or dataset file (a lookup JSON or CSV)                                                                                                      |
| `template_dirs`                             | Layouts live somewhere other than the module graph. Replaces discovery — every listed directory is walked in full                                                                                       |
| `config_paths` / `config_dirs`              | Config lives outside the standard `hugo.*`, `config.*` or `config/` locations                                                                                                                           |
| `i18n_dirs`                                 | Translation files live outside `i18n/`                                                                                                                                                                  |
| `wasm_url` / `wasm_base_url` / `_version`   | The renderer WASM can't be fetched from the module's GitHub release — see [troubleshooting.md](troubleshooting.md)                                                                                      |
| `template_extensions`, `ignore_directories` | Templates use an extension other than `.html`/`.htm`, or a directory must be skipped                                                                                                                    |

## Troubleshooting

Hugo-specific symptom → fix is in [troubleshooting.md](troubleshooting.md); generic symptoms are in [../troubleshooting.md](../troubleshooting.md).
