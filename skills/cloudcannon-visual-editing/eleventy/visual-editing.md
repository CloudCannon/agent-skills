# Visual Editing (Eleventy)

Workflow for adding CloudCannon Visual Editor support to an Eleventy site. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), and Eleventy's deltas from them in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md). Pick the Liquid or Nunjucks path first — see [overview.md § Which path the site takes](overview.md#which-path-the-site-takes).

## Setup steps — Liquid path

1. **Check** the Eleventy version in `package.json`. The plugin targets Eleventy 3. On Eleventy 2 or older, **ask the user** before upgrading, and build the unmodified site on Eleventy 3 before adding the plugin, so a failure there isn't blamed on the integration.
2. **Check** the Node version the site builds with (`.nvmrc`, `engines`, `node_version` in `.cloudcannon/initial-site-settings.json`) is 20.19 or later.
3. **Install** the package:

   ```sh
   npm install @cloudcannon/editable-regions
   ```

4. **Add** the plugin to the Eleventy config (`eleventy.config.{js,mjs,cjs}` or `.eleventy.js`), matching the file's module style:

   ```js
   // ESM
   import editableRegions from "@cloudcannon/editable-regions/eleventy";
   export default function (eleventyConfig) {
     eleventyConfig.addPlugin(editableRegions);
   }

   // CommonJS
   const editableRegions = require("@cloudcannon/editable-regions/eleventy");
   module.exports = function (eleventyConfig) {
     eleventyConfig.addPlugin(editableRegions);
   };
   ```

5. **Stub** every Node-only package the config imports, under `liquid.browserStub` — see [visual-editing-reference.md § The config runs in the browser](visual-editing-reference.md#the-config-runs-in-the-browser). `@11ty/eleventy-img` and `sharp` are the usual ones.
6. **Load** the bundle in every base layout, before `</body>`:

   ```html
   <script>
     if (window.inEditorMode) {
       import("/register-components.js").catch((error) => console.warn(error));
     }
   </script>
   ```

   On a site with a `pathPrefix`, prefix the path to match.

7. **Build** (`npx @11ty/eleventy`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

## Setup steps — Nunjucks path

Install nothing. The editor loads the editable-regions runtime itself on any page with `data-editable` attributes, so primitive regions (`text`, `image`, `array`, `source`, `@content`, `@data`) need no plugin and no script tag.

**MUST NOT:** install the plugin for Nunjucks templates. It bundles only Liquid; it adds a build step and a script for nothing.

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page.

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). Its generic terms in Eleventy:

| Term                 | Eleventy equivalent                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registered component | A Liquid include, named by its path under the includes directory (`components/hero`) — Liquid path only                                                                                 |
| Page template        | A layout, or a page file's own template — primitives only, see [visual-editing-reference.md § What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render) |
| Loop                 | `{% for %}`                                                                                                                                                                             |
| Data file            | `<input>/_data/*.{json,yml,yaml}` — JS data files can't be edited                                                                                                                       |
| Content entry        | A page file under the input directory (`.md`, `.liquid`, `.njk`, `.html`) — its front matter                                                                                            |
| Build output         | `_site/` (or the configured `dir.output`)                                                                                                                                               |

On the Nunjucks path, a census `component` treatment isn't available: record those sections as primitives plus a note of what only updates after a rebuild ([visual-editing-reference.md § Nunjucks sites](visual-editing-reference.md#nunjucks-sites)).

## Infrastructure checklist

Liquid path, after setup and before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` `dependencies`
- [ ] The Eleventy config calls `addPlugin(editableRegions)`
- [ ] Every Node-only import in the config is in `liquid.browserStub` or has a browser override
- [ ] Every base layout loads `/register-components.js` behind `window.inEditorMode`
- [ ] The build is clean, and `_site/register-components.js` exists
- [ ] `node --check _site/register-components.js` passes
- [ ] No custom filter, shortcode or tag uses a name the plugin reserves → [Reserved names](visual-editing-reference.md#reserved-names)
- [ ] Every filter that reads `this` (`this.page`, `this.ctx`) is a `function`, not an arrow function → [The config runs in the browser](visual-editing-reference.md#the-config-runs-in-the-browser)

Nunjucks path: none of the above. Confirm only that the build is clean.

## Completeness checklist

> **Rule:** if an editor can see it on the page, an editor must be able to edit it. A section is either editable or has a written exception in `.cloudcannon/migration/visual-editing.md`.

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items — using the term mapping above.
2. **Then work through** the Eleventy items for the site's path.

**Liquid path:**

- [ ] **Component names resolve**: every `data-component` value, and every `_type` in content and structures, is the include path relative to the includes directory (`components/hero` for `_includes/components/hero.liquid`, not `hero`)
      → [Component names are include paths](visual-editing-reference.md#component-names-are-include-paths)
- [ ] **One data path per component**: every include used as a component region renders from exactly the object its `data-prop` points at, through `includeWith`
      → [The include's data is the `data-prop` value](visual-editing-reference.md#the-includes-data-is-the-data-prop-value)
- [ ] **No parent-scope reads**: no component include reads a variable it isn't passed (a loop variable, a page variable, another include's `assign`)
      → [The include's data is the `data-prop` value](visual-editing-reference.md#the-includes-data-is-the-data-prop-value)
- [ ] **Dispatcher in every layout**: every layout that renders `content_blocks` has the array + array-item dispatcher
      → [Page builder blocks in Eleventy](visual-editing-reference.md#page-builder-blocks-in-eleventy)
- [ ] **Wrapper audit**: every container that gained `array-item` or component wrappers still lays out as before
      → [Wrapper elements change the formatting context](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context)
- [ ] **Build-only work guarded**: every image shortcode, Node-only filter and inline script inside a component include is behind `ENV_CLIENT`
      → [`ENV_CLIENT` in Eleventy](visual-editing-reference.md#env_client-in-eleventy)
- [ ] **Global data passed in**: no component include reads an edited value from `_data/` directly
      → [Data files and `@data`](visual-editing-reference.md#data-files-and-data)

**Both paths:**

- [ ] **Markdown pairing**: every `text`/`block` region over a markdown input renders the field through the site's markdown filter
      → [Text regions and markdown in Eleventy](visual-editing-reference.md#text-regions-and-markdown-in-eleventy)
- [ ] **Body regions**: every layout that outputs `{{ content }}` has `data-editable="text" data-prop="@content"` on an element holding only the content, and any new wrapper passed the formatting-context checks
- [ ] **Paths are stored paths**: every `data-prop` names the path in the edited file, never a template alias, a layout's front matter, `eleventyComputed` or JS data
      → [Data paths in Eleventy](visual-editing-reference.md#data-paths-in-eleventy)
- [ ] **Data-file regions**: every `@data[<name>]` selector's `<name>` is in `data_config`
      → [Data files and `@data`](visual-editing-reference.md#data-files-and-data)
- [ ] **Empty arrays**: every array region's container still renders when the list is empty
      → [`ENV_CLIENT` in Eleventy](visual-editing-reference.md#env_client-in-eleventy)
- [ ] **Number fields**: no text region binds a field whose content value is a bare number
      → [Value types per region](../editable-regions.md#value-types-per-region)

**Nunjucks path:**

- [ ] **Template arrays**: every page-builder array has one `<template data-id="<type>">` per block type, and every visible part of each block is a region
      → [Nunjucks sites](visual-editing-reference.md#nunjucks-sites)

## Local checks

Run these before handing off. None needs CloudCannon, and none proves the editor works — only the editor does. Say so in the handoff.

- [ ] **Bundle syntax** (Liquid path): `node --check _site/register-components.js`.
- [ ] **Re-render loop** (Liquid path): render every component region's data through the bundle, the way the editor does — see [visual-editing-reference.md § Checking re-renders locally](visual-editing-reference.md#checking-re-renders-locally). Every block renders without an error, non-empty, and with the visible text the build shows. A variable the include reads from its parent renders as empty text, not `undefined`.
- [ ] **Build grep.** Count region types in the HTML:

  ```sh
  grep -rhoE 'data-editable="?[a-z-]+' _site --include='*.html' | sort | uniq -c
  ```

  Every region type you expect appears, and the shared sections (header, footer, nav) appear on every page.

- [ ] **Output parity.** Visible text and `<img>` counts per page match the parity baseline from the audit.

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `_site/`. For the Shared-UI walk-through, the named data file lives in `<input>/_data/`.
