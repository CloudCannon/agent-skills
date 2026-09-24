# Audit (Hugo)

Run the audit script first to gather data automatically:

```bash
bash <skills-dir>/migrate-to-cloudcannon/scripts/audit-hugo.sh .
```

Run it from the site root; `<skills-dir>` is wherever the skills are installed (for example `.agents/skills`).

Use its output as a starting point, then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Hugo version, modules and themes

- **Hugo version** the site builds with, from the local `hugo version`, `.cloudcannon/initial-site-settings.json`, `netlify.toml` or CI config.
  **Why:** editable regions needs 0.150.0+. If the site is older, **ask the user** whether to upgrade before proceeding, then build the unmodified site on the new version — see [visual-editing.md § Upgrading Hugo first](../../cloudcannon-visual-editing/hugo/visual-editing.md#upgrading-hugo-first).
- **Save the parity baseline.** Build the unmodified site on the target Hugo, applying only the upgrade fixes it needs to build, into a directory outside the repo (`BASELINE=$(mktemp -d)`; `hugo -d "$BASELINE"`). Record the path in `audit.md`. Every later phase compares against this build — the pre-migration commit itself may not build on the target Hugo.
- **Module project?** A `go.mod` at the root. Without one, Phase 4 starts with `hugo mod init`.
- **Where templates come from** — the project's `layouts/`, a theme in `themes/`, or a module in the module cache.
  **Why:** module-cache templates must be vendored before the editor can render them — see [Themes, modules and vendoring](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#themes-modules-and-vendoring).
- **Bookshop.** If the script reports Bookshop markers, read [cloudcannon-visual-editing/migrating-from-bookshop.md](../../cloudcannon-visual-editing/migrating-from-bookshop.md) now. It changes Phases 2 and 4.
- **npm tooling** — `package.json` scripts (Tailwind, PostCSS, Pagefind) and the package manager.

## 2. Content sections

For each directory under `content/`:

- **Section name** and how many files it holds
- **Layout** that renders it (`layouts/<section>/single.html`, `list.html`, or `_default/`)
- **`_index.md`** — does it exist, and does its front matter drive the list page?
  **Why:** decides whether it joins the section collection — see [configuration.md § Section collections](../../cloudcannon-configuration/hugo/configuration.md#section-collections).
- **Leaf bundles** (`<name>/index.md` with resources beside it) — keep them as bundles.
- **Front matter format** (YAML, TOML, JSON) and whether it is mixed
- **Front matter fields** — list every key, with its type, whether it is always present, and which template reads it. Hugo has no content schema, so this list becomes the CloudCannon schema file.
- **Routing overrides** — `slug:` or `url:` in front matter, and any `permalinks` in the site config
- **Taxonomies** — which keys (`tags`, `categories`, custom) and whether values come from a curated list

Also list every file under `data/` and which templates read it (`hugo.Data.<name>`, or `site.Data` before Hugo 0.156).

> **Data file shape — anti-pattern:** a data file holding like-shaped items (team members, FAQs) must be a **top-level array**, not a map keyed by slug. A map locks editors to the existing keys and breaks the "Add" button.

## 3. Pages and routing

Map every page the site builds and where its content comes from:

- **Content-backed pages** — a file in `content/` rendered by a layout
- **List pages** — section `_index.md` files and the home page (`content/_index.md`)
- **Taxonomy and term pages** — generated, with no file to edit
- **Layout-only pages** — pages with no content file behind them, typically `404.html`, or a layout with hardcoded sections
- **Pagination** (`.Paginate`) and `aliases` redirects

## 4. Layouts and partials

- **Base layout** (`_default/baseof.html` and any section `baseof.html`) — what it includes (head, header, footer)
- **Page templates** — which sections each renders, and which markup is inline in the template rather than in a partial.
  **Why:** only partials re-render in the editor. Inline markup that needs a component region must be extracted into a partial in Phase 4 — see [What the editor can re-render](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#what-the-editor-can-re-render).
- **Partials** that render shared sections (header, footer, CTA, cards) and the data each reads
- **Shortcodes** used in content — the script counts them. Each is a snippet candidate for Phase 2.
- **Asset pipeline** — every `resources.Get`, `.Resize`, `.Fill` and `images.*` call, and whether images live in `static/` or `assets/`.
  **Why:** each call reached from a partial needs an `ENV_CLIENT` guard in Phase 4, and the image location sets the upload paths in Phase 2.
- **`.Content` in partials** — a partial that renders the page body can't be a component region.

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, theme settings).

### Classifying static pages

Classify every page that isn't already content in a collection. The decision table and the mandatory census table are the same for every SSG — use [astro/audit.md § Classifying static pages](../astro/audit.md#classifying-static-pages-source-editables-vs-content-collection), reading "`.astro` page" as "layout with hardcoded sections". Add a **Needs editable region?** column to the census; the Phase 4 handoff gate reads it.

That section's two follow-on censuses apply in Hugo form:

| Astro census            | Hugo form                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each page template: `{{ .Params.x }}` is primitive; `if`, `index`, `where`, a `range` over a lookup, or a data-file read is computed and moves into a partial                                                                                                       |
| Frontmatter co-location | For each partial that will be a component region: is its context exactly one front matter key or data file? If not, reshape it — [The partial's context](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#the-partials-context-is-the-data-prop-value) |

In Hugo the usual outcome is:

| Page                                                                                          | Pattern                                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from blocks                                               | Page builder — `content_blocks` in `content/_index.md`, `content/about.md`, …                             |
| A section's list page with an editable intro                                                  | Keep `_index.md` in the section collection, with its own schema                                           |
| Legal and policy pages with a prose body                                                      | Markdown body in the `pages` collection                                                                   |
| Legal pages whose layout reads structured front matter (sections driving a table of contents) | Keep the structure: its own schema in `pages`, rendered by a partial                                      |
| `404.html`                                                                                    | Move its visible strings to a data file (`data/labels.yml`) so editors can change them in the data editor |
| Taxonomy term pages                                                                           | Leave as layouts — generated, with no file to write back to                                               |

## 5. Build pipeline

- The `build` script in `package.json`, or plain `hugo` if there is none
- Flags passed to `hugo` (`--minify`, `--destination`, `--baseURL`, `--environment`)
- Steps after Hugo (Pagefind) and steps in `.cloudcannon/postbuild`.
  **Why:** these move into the build command — see [build-commands.md](../../cloudcannon-configuration/build-commands.md).
- Environment-specific config (`config/production/`, `hugo.Environment` checks)

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`). The script lists them.
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — use `:nth-of-type` instead.
- **Global JS bindings** — `$(document).ready`, `DOMContentLoaded`, `querySelectorAll` over component classes.
  **Why:** they bind once at load, so markup the editor re-renders loses the behaviour. Note the affected components.
- **Inline `<script>` and `<style>` in partials.**
  **Why:** re-rendered markup never runs its scripts, and a per-instance `<style>` collides when a component appears twice.
- **Numbers displayed as text** — counters, prices, stats stored as bare YAML numbers.
  **Why:** a text region rejects non-strings — see [configuration-gotchas.md § Quote numbers](../../cloudcannon-configuration/hugo/configuration-gotchas.md#quote-numbers-a-text-region-displays).
- **Raw HTML in content** and the site's Goldmark `unsafe` setting.
  **Why:** decides the `markdown` options — see [configuration-gotchas.md § Match Goldmark](../../cloudcannon-configuration/hugo/configuration-gotchas.md#match-goldmark-in-the-markdown-options).
- **Scroll-reveal and entrance animations** — see [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/visual-editing-reference.md#scroll-reveal-and-entrance-animations).
- **Existing CMS or deployment config** — `netlify.toml`, `.forestry/`, `static/admin/`, `.github/workflows`.

## 7. Sectioning recommendation

Record total pages, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, **do not start Phase 2 yet** — read [../chunking.md](../chunking.md) and put a sectioning proposal to the user.
