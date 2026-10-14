# Audit (Eleventy)

Start from the output of the [quick checks](overview.md#quick-checks), then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Eleventy version, config and directories

- **Eleventy version** in `package.json`. On Eleventy 2 or older, record it; Phase 4 asks the user before upgrading.
- **Config file and module style** — ESM (`export default`, `import`) or CommonJS (`module.exports`, `require`). Phase 4 adds the plugin in the same style.
- **Directories** — input, includes, layouts (defaults to the includes directory), data and output. Includes and data paths are relative to the input directory, and can point outside it (`includes: "../_includes"`). Every path in the CloudCannon config is relative to the repo root, so it carries the input prefix (`src/blog/`).
- **`pathPrefix`** — if set, the site is served from a sub-path; Phase 4's script tag and the image paths must include it.
- **Save the parity baseline.** Build the unmodified site into a directory outside the repo and record the path in `audit.md`:

  ```sh
  BASELINE=$(mktemp -d)
  npx @11ty/eleventy --output="$BASELINE"
  ```

  Delete `_site/` first unless `.gitignore` lists it: with the output directory elsewhere, Eleventy reads an input-root `_site/` as templates. Every later phase compares against this build.

- **Bookshop.** If the quick checks found Bookshop, read [cloudcannon-bookshop](../../cloudcannon-bookshop/SKILL.md) now. It changes Phases 2 to 4.
- **npm tooling** — the `build` script and the scripts it calls. Eleventy sites often run Sass, PostCSS or Tailwind as separate scripts writing into the output directory, chained with `npm-run-all` or `&&`.

## 2. Template languages

Decide which visual-editing path the site takes, using [overview.md § Which path the site takes](../../cloudcannon-visual-editing/eleventy/overview.md#which-path-the-site-takes). Record:

- The file count per extension from the quick checks
- `htmlTemplateEngine` and `markdownTemplateEngine`, if set
- Any `templateEngineOverride` in front matter or directory data
- Which language renders the sections editors will change: the Liquid path, the Nunjucks path, or both

## 3. Content and collections

For each directory of page files under the input directory:

- **Directory name** and how many files it holds
- **Layout** that renders it, and where `layout` is set — each file's front matter, or a directory data file (`blog/blog.11tydata.json`)
- **Tags** — Eleventy builds its collections from `tags`, not folders, while CloudCannon collections are folders. Record which tag each folder's files carry and where it's set, and any folder whose files carry different tags.
- **Front matter fields** — list every key, with its type, whether it is always present, which template reads it, and — for strings — whether it prints escaped, through a markdown filter or through `safe`. Eleventy has no content schema, so this list becomes the CloudCannon schema file.
- **Values from directory data and `eleventyComputed`** — record each value a page shows that its own file doesn't hold. Editors can't edit these through the page — see [Data paths in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#data-paths-in-eleventy). Phase 3 decides which become stored fields.
- **Routing** — `permalink` in front matter or directory data (which files set it, and whether it differs from the file path), `permalink: false`, `eleventyExcludeFromCollections`, and dates in file names (`2024-01-02-post.md` builds to `/blog/2024-01-02-post/` by default, while `page.fileSlug` drops the date). See [collection-urls.md](../../cloudcannon-configuration/eleventy/collection-urls.md).

Also list every file in the data directory with its format and which templates read it:

- **JSON** — editable as is.
- **YAML** — editable; Eleventy reads it only through `addDataExtension`, so check the config registers it.
- **JS** (`.js`, `.cjs`, `.mjs`) — CloudCannon can't edit it. Note each one that holds values editors should change; Phase 3 moves them to JSON or YAML.

> **Data file shape — anti-pattern:** a data file holding like-shaped items (team members, FAQs) must be a **top-level array**, not a map keyed by slug. A map locks editors to the existing keys and breaks the "Add" button.

## 4. Pages and routing

Map every page the site builds and where its content comes from:

- **Content-backed pages** — a page file rendered through a layout
- **Pages built from page files with markup bodies** — `.liquid`, `.njk` or `.html` page files whose body holds the sections
- **Paginated pages** — a page file with `pagination` front matter builds one page per item of a data file or collection; the editable content is the data, not the page
- **Collection listings** — pages that loop over `collections.<tag>`
- **Layout-only output** — `404`, feeds and sitemaps

## 5. Layouts and includes

- **Base layouts** and the chain each layout follows through its own `layout` key — what each includes (head, header, footer).
- **Page templates** — which sections each layout or page file renders, and which markup is inline rather than in an include.
  **Why:** only includes re-render in the editor. Inline markup that needs a component region moves into an include in Phase 4 — see [What the editor can re-render](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#what-the-editor-can-re-render).
- **Includes** that render shared sections (header, footer, CTA, cards), the data each reads, and how it gets it: from the parent's scope, from `include` parameters, or from one object.
  **Why:** on the Liquid path a component include renders from exactly one object, and parent-scope variables are `undefined` in the editor — see [The include's data is the `data-prop` value](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-includes-data-is-the-data-prop-value).
- **Nunjucks macros** (`{% macro %}`, `{% import %}`) — they never re-render in the editor. Note which sections use them.
- **Helpers the config registers** — for each shortcode, paired shortcode, filter and tag: whether content or templates use it, and whether it calls Node-only code.
  **Why:** on the Liquid path the config runs in the browser — see [The config runs in the browser](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-config-runs-in-the-browser) and [Reserved names](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#reserved-names).
- **Markdown filter** — the filter the site registers to render a front matter field as Markdown, if any (Eleventy has none built in).
  **Why:** decides the input types in Phase 2 and the `text`/`block` regions in Phase 4 — see [Text regions and markdown in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#text-regions-and-markdown-in-eleventy).
- **Shortcodes and includes in content** — the quick checks count them. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components): an inline shortcode is a snippet candidate for Phase 2, a layout shortcode becomes a page-builder block.
- **Images** — every `@11ty/eleventy-img` shortcode or transform, and each `addPassthroughCopy` directory images come from.
  **Why:** an image shortcode reached from a component needs an `ENV_CLIENT` guard in Phase 4, and the passthrough directories set the upload paths in Phase 2.

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, site settings).

### Classifying static pages

Classify every page that isn't already content in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); a page file here is a layout or page file with hardcoded sections, or a Markdown file whose body is mostly layout shortcodes.

That section's two follow-on censuses in Eleventy form:

| Census                  | Eleventy form                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each page template: `{{ title }}` is primitive; `if`, a loop over `collections`, a lookup, a filter other than the markdown filter, or a data-file read is computed. On the Liquid path it moves into an include; on the Nunjucks path it stays, and updates only after a rebuild       |
| Frontmatter co-location | For each include that will be a component region: is its data exactly one front matter key or data file? If not, reshape it — [The include's data is the `data-prop` value](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#the-includes-data-is-the-data-prop-value) |

In Eleventy the usual outcome is:

| Page                                                                        | Pattern                                                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages with sections in a layout or a page file body | Page builder — `content_blocks` in the page file's front matter; see [page-building.md](page-building.md) |
| Markdown pages whose body is layout shortcodes                              | Page builder, as in the first row — each layout shortcode becomes a block include                         |
| Paginated pages built from a data file                                      | Keep the template; editors change the data file                                                           |
| Collection listing pages with an editable intro                             | Keep the page file in the `pages` collection, with its own schema                                         |
| Legal and policy pages with a prose body                                    | Markdown body in the `pages` collection                                                                   |
| Feeds, sitemaps and other generated output                                  | Leave as templates                                                                                        |

## 6. Build pipeline

- The `build` script in `package.json`, or plain `npx @11ty/eleventy` if there is none. Read what it runs, and check it runs every step a production build needs: a `start` script often runs the CSS build that `build` forgets.
- Flags passed to `eleventy` (`--input`, `--output`, `--pathprefix`) and environment checks in the config (`ELEVENTY_ENV`, `ELEVENTY_RUN_MODE`).
- Steps after Eleventy (Pagefind) and steps in `.cloudcannon/postbuild`.
  **Why:** these move into the build command — see [build-commands.md](../../cloudcannon-configuration/build-commands.md).

## 7. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`).
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global JS bindings** — `DOMContentLoaded`, `querySelectorAll` over component classes.
  **Why:** they bind once at load, so markup the editor re-renders loses the behaviour — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Inline `<script>` and `<style>` in includes.**
  **Why:** re-rendered markup never runs its scripts, and a per-instance `<style>` collides when a component appears twice — same section.
- **Numbers displayed as text** — counters, prices, stats stored as bare YAML numbers.
  **Why:** a text region rejects non-strings — see [Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region).
- **Raw HTML in Markdown content.** Eleventy's Markdown passes HTML through unless the site sets its own markdown-it options.
  **Why:** decides the `markdown` options and whether snippets are needed for it in Phase 2.
- **Scroll-reveal and entrance animations** — see [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/visual-editing-reference.md#scroll-reveal-and-entrance-animations).
- **Existing CMS or deployment config** — `netlify.toml`, an `admin/` folder from another CMS, `.github/workflows`.

## 8. Sectioning recommendation

Record total pages, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, **do not start Phase 2 yet** — read [../chunking.md](../chunking.md) and put a sectioning proposal to the user.
