# Audit (Hugo)

Run the audit script first to gather data automatically:

```bash
bash <skills-dir>/migrate-to-cloudcannon/scripts/audit-hugo.sh .
```

Run it from the site root; `<skills-dir>` is wherever the skills are installed (for example `.agents/skills`).

Use its output as a starting point, then fill in the sections below with findings that require judgment. Record findings in `.cloudcannon/migration/audit.md`.

## 1. Hugo version, modules and themes

- **Hugo version** the site builds with, from the local `hugo version`, `.cloudcannon/initial-site-settings.json`, `netlify.toml` or CI config.
- **Hugo version window.** Read every place a version is set: each module's `module.hugoVersion` (min, max, extended), each theme's `theme.toml` `min_version`, `build.hugo_version`, and any `hugo-extended` or `hugo-bin` npm devDependency. Pin `hugo_version` to a version inside every one of them. The script prints each.
  **Why:** outside a theme's window Hugo only warns (`WARN … is not compatible with this Hugo version`), then fails with an unrelated template error. A theme can accept a narrow rolling window — extended only, with a max a few releases old. Hugo doesn't enforce `theme.toml` `min_version` at all, and when the build runs through `npm run build`, an npm Hugo in `node_modules/.bin` wins over `hugo_version` without saying so.
- **Upgrade decision.** Editable regions works from the module's declared minimum, Hugo 0.120. Recommend a recent Hugo when the site is far behind, and **ask the user** before upgrading. Then build the unmodified site on the new version — see [visual-editing.md § Upgrading Hugo first](../../cloudcannon-visual-editing/hugo/visual-editing.md#upgrading-hugo-first).
- **Save the parity baseline.** Build the unmodified site on the target Hugo, applying only the upgrade fixes it needs to build, into a directory outside the repo (`BASELINE=$(mktemp -d)`; `hugo -d "$BASELINE"`). Record the path in `audit.md`. Every later phase compares against this build — the pre-migration commit itself may not build on the target Hugo.
- **Module project?** A `go.mod` at the root. Without one, Phase 4 starts with `hugo mod init`.
- **Where templates and config come from** — the project's `layouts/`, a theme in `themes/`, or a module in the module cache. `hugo config mounts` lists every template root.
  **Why:** the editor bundles only files inside the project, so a module-cache dependency that re-rendered templates or the site config need must be vendored — see [Themes, modules and vendoring](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#themes-modules-and-vendoring).
- **`version` keys on module imports.** Note every `module.imports` entry with a `version` key; the script warns on each. Phase 4 removes them — see [visual-editing.md § Setup steps](../../cloudcannon-visual-editing/hugo/visual-editing.md#setup-steps), step 4.
  **Why:** a `version` key builds fine but fails every component region in the editor.
- **The theme's own agent docs.** Check each theme and module directory for `.claude/skills/`, `AGENTS.md` or `CLAUDE.md`, and read them before auditing its templates.
  **Why:** they often map the theme's config files, partial names and resource lookups in one page.
- **Bookshop.** If the script reports Bookshop markers, read [cloudcannon-bookshop](../../cloudcannon-bookshop/SKILL.md) now. It changes Phases 2 to 4.
- **npm tooling** — `package.json` scripts (Tailwind, PostCSS, Pagefind) and the package manager. If Hugo shells out to npm-installed tools (Dart Sass, PostCSS, Babel), build through `npm run …` so `node_modules/.bin` is first on `PATH`.

### Calling a pinned Hugo

When the site needs a Hugo other than the one on `PATH`, call it by absolute path in every command. Before starting the dev-server loop, check that `<path>/hugo version` matches `hugo_version` and sits inside the window above.
**Why:** `export PATH=…` doesn't carry between an agent's tool calls, so the wrong Hugo runs without warning.

## 2. Content sections

For each directory under `content/`:

- **Section name** and how many files it holds
- **Layout** that renders it (`layouts/<section>/single.html`, `list.html`, or the defaults — `_default/`, or top-level `single.html` and `list.html` on Hugo 0.146+)
- **`_index.md`** — does it exist, and does its front matter drive the list page?
  **Why:** decides whether it joins the section collection — see [configuration.md § Section collections](../../cloudcannon-configuration/hugo/configuration.md#section-collections).
- **Leaf bundles** (`<name>/index.md` with resources beside it) — keep them as bundles. Each is one entry of its section's collection: ignore the per-bundle sub-collections `detect-collections` lists under a section (`<section>_<slug>`, `suggested: false`). Treat the CLI's collection list as a starting point — it can also miss sections.
- **Front matter format** (YAML, TOML, JSON) and whether it is mixed
- **Front matter fields** — list every key, with its type, whether it is always present, which template reads it, and — for strings — whether it prints escaped or through `markdownify` or `safeHTML`, which sets its input type ([configuration-gotchas.md § Choose rich text inputs](../../cloudcannon-configuration/hugo/configuration-gotchas.md#choose-rich-text-inputs-from-the-template-filter)). Hugo has no content schema, so this list becomes the CloudCannon schema file.
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

- **Base layout** (`_default/baseof.html` or top-level `baseof.html`, and any section `baseof.html`) — what it includes (head, header, footer)
- **Page templates** — which sections each renders, and which markup is inline in the template rather than in a partial.
  **Why:** only partials re-render in the editor. Inline markup that needs a component region must be extracted into a partial in Phase 4 — see [What the editor can re-render](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#what-the-editor-can-re-render).
- **Partials** that render shared sections (header, footer, CTA, cards) and the data each reads. Hugo has two folder schemes: `layouts/partials/`, `layouts/shortcodes/` and `layouts/_default/_markup/`, or, on Hugo 0.146+, `layouts/_partials/`, `layouts/_shortcodes/` and top-level `layouts/_markup/`. Check both, in the project and in every theme and module (`hugo config mounts` gives the directories).
- **Shortcodes** used in content — the script counts them. Classify each with [../audit.md § Content files whose body is layout components](../audit.md#content-files-whose-body-is-layout-components): an inline shortcode is a snippet candidate for Phase 2, a layout shortcode becomes a page-builder block. When copying a block shortcode into a partial, watch for:
  - `.Ordinal`-based IDs or defaults — make the value an explicit field with a default
  - `.Inner` nesting and `.Parent` lookups
  - a per-instance `<style>` — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts)
  - `.Page.Resources` images — see the asset-pipeline bullet below
  - other templates that test `.HasShortcode` or `.RawContent` (a navbar that styles itself on `.HasShortcode "hero"`), which behave differently once the shortcode is a block
- **Asset pipeline** — every `resources.Get`, `.Resize`, `.Fill` and `images.*` call, and whether images live in `static/` or `assets/`.
  **Why:** each call reached from a partial needs an `ENV_CLIENT` guard in Phase 4, and the image location sets the upload paths in Phase 2.
- **Images chosen by filename glob** — templates that pick an image from page resources by pattern (`.Resources.GetMatch "cover*"`), and shortcodes whose argument is a resource glob. There's no input type for "a resource in this bundle": make the image an explicit field, or leave it as a `text` input with a comment.
  **Why:** the page-builder pattern expects an image field, and editors can't pick a file for a glob.
- **`.Content` in partials** — a partial that renders `.Content` **on a Page** (`.Content` where `.` is the page, `page.Content`, `$page.Content`) can't be a component region. `.Content` on a resource (`$icon.Content`), a param, a map key or a fetched response isn't the body. The script lists candidates; check each.

Flag components that are good visual-editing candidates (heroes, feature grids, CTAs) and those better left to the sidebar (navigation structure, theme settings).

### Classifying static pages

Classify every page that isn't already content in a collection. The decision table and the mandatory census table are in [../audit.md § Classifying static pages](../audit.md#classifying-static-pages); a page file here is a layout with hardcoded sections, or a content file whose body is mostly layout shortcodes.

That section's two follow-on censuses in Hugo form:

| Census                  | Hugo form                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each page template: `{{ .Params.x }}` is primitive; `if`, `index`, `where`, a `range` over a lookup, or a data-file read is computed and moves into a partial                                                                                                       |
| Frontmatter co-location | For each partial that will be a component region: is its context exactly one front matter key or data file? If not, reshape it — [The partial's context](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#the-partials-context-is-the-data-prop-value) |

In Hugo the usual outcome is:

| Page                                                                                                                | Pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home page and marketing pages built from blocks                                                                     | Page builder — `content_blocks` in `content/_index.md`, `content/about.md`, …                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Home, or other pages a theme renders from front matter and params (templates from a theme in `themes/` or a module) | Keep the theme's model. Front matter and params become inputs — see [configuration.md § Site config as data](../../cloudcannon-configuration/hugo/configuration.md#site-config-as-data). Add primitive regions through a minimal project override of the theme template — see [Adding regions to theme templates](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#adding-regions-to-theme-templates). If the user wants blocks, use the theme's documented custom-layout hook if it has one. If the home page has no content file, give it a title-only `content/_index.md` — see [configuration.md § Section collections](../../cloudcannon-configuration/hugo/configuration.md#section-collections) |
| A section's list page with an editable intro                                                                        | Keep `_index.md` in the section collection, with its own schema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Legal and policy pages with a prose body                                                                            | Markdown body in the `pages` collection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Legal pages whose layout reads structured front matter (sections driving a table of contents)                       | Keep the structure: its own schema in `pages`, rendered by a partial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `404.html`                                                                                                          | Move its visible strings to a data file (`data/labels.yml`) so editors can change them in the data editor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Taxonomy term pages                                                                                                 | Leave as layouts — generated, with no file to write back to                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## 5. Build pipeline

- The `build` script in `package.json`, or plain `hugo` if there is none. Read what the script runs before accepting it as the build command, and prefer a production script — a `build` script can be a development build (drafts, future or expired pages), and the CLI suggests it anyway.
- Flags passed to `hugo` (`--minify`, `--destination`, `--baseURL`, `--environment`)
- Steps after Hugo (Pagefind) and steps in `.cloudcannon/postbuild`.
  **Why:** these move into the build command — see [build-commands.md](../../cloudcannon-configuration/build-commands.md).
- Environment-specific config (`config/production/`, `hugo.Environment` checks)

## 6. Flags and special patterns

- **Positional CSS selectors** on containers that will become array regions (`:nth-child`, `:first-child`, `:last-child`). The script lists them.
  **Why:** a `<template>` blueprint is a real child element and shifts positional selectors — see [visual-editing-reference.md § When HTML `<template>` blueprints are needed](../../cloudcannon-visual-editing/visual-editing-reference.md#when-html-template-blueprints-are-needed).
- **Global JS bindings** — `$(document).ready`, `DOMContentLoaded`, `querySelectorAll` over component classes.
  **Why:** they bind once at load, so markup the editor re-renders loses the behaviour. Note the affected components — see [visual-editing-reference.md § Other scripts](../../cloudcannon-visual-editing/visual-editing-reference.md#other-scripts).
- **Inline `<script>` and `<style>` in partials.**
  **Why:** re-rendered markup never runs its scripts, and a per-instance `<style>` collides when a component appears twice — same section.
- **Numbers displayed as text** — counters, prices, stats stored as bare YAML numbers.
  **Why:** a text region rejects non-strings — see [configuration-gotchas.md § Quote numbers](../../cloudcannon-configuration/hugo/configuration-gotchas.md#quote-numbers-a-text-region-displays).
- **Raw HTML in content** and the site's Goldmark `unsafe` setting.
  **Why:** decides the `markdown` options — see [configuration-gotchas.md § Match Goldmark](../../cloudcannon-configuration/hugo/configuration-gotchas.md#match-goldmark-in-the-markdown-options).
- **Scroll-reveal and entrance animations** — see [visual-editing-reference.md § Scroll-reveal](../../cloudcannon-visual-editing/visual-editing-reference.md#scroll-reveal-and-entrance-animations).
- **GitHub-style alerts** in content (`> [!NOTE]`, rendered by Hugo 0.132+ render hooks). The script counts them.
  **Why:** a save through the rich text editor escapes the marker and breaks the alert — see [cloudcannon-snippets/hugo/overview.md § GitHub-style alerts](../../cloudcannon-snippets/hugo/overview.md#github-style-alerts).
- **Existing CMS or deployment config** — `netlify.toml`, `.forestry/`, `static/admin/`, `.github/workflows`.

## 7. Sectioning recommendation

Record content-backed pages, pages to convert to page-builder or fixed-schema entries, and distinct collections. If any two of {pages > 30, conversions > 15, collections > 5} are tripped, **do not start Phase 2 yet** — read [../chunking.md](../chunking.md) and put a sectioning proposal to the user.
