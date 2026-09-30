# Visual Editing (Hugo)

Workflow for adding CloudCannon Visual Editor support to a Hugo site with the `editable-regions` Hugo module. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), and Hugo's deltas from them in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

If the site uses Bookshop, read [migrating-from-bookshop.md](migrating-from-bookshop.md) first.

## Setup steps

It's a Hugo module, not an npm package. Nothing goes in `package.json`, and there is no component registration file.

1. **Check** the Hugo version (`hugo version`), locally and in `.cloudcannon/initial-site-settings.json` (`hugo_version`). The module's declared minimum is 0.120; a recent Hugo is safer. If the site is well behind, **ask the user** before upgrading — see [§ Upgrading Hugo first](#upgrading-hugo-first).
2. **Check** the site is a Hugo module project (`go.mod` at the root). If not, run `hugo mod init <module path>` — any path works, e.g. `github.com/<owner>/<repo>`.
3. **Install** the module at a pinned release tag:

   ```sh
   hugo mod get github.com/CloudCannon/editable-regions@v0.0.21
   ```

4. **Import** it in the site config. The config file name doesn't matter — `hugo.*`, `config.*` and a `config/` directory all work:

   ```yaml
   module:
     imports:
       - path: github.com/CloudCannon/editable-regions
   ```

   If the config already has `module.mounts`, keep them — the import adds to them.

   **MUST NOT:** add a `version` key to this or any other `module.imports` entry, even where other install docs show one. For each existing one, run `hugo mod get <path>@<version>` (after `hugo mod init` if there's no `go.mod`), then remove the key.
   **Why:** the editor's Hugo tries to download that version, has no Go, and every component region fails with `failed to download module … binary with name "go" not found in PATH`. The normal build succeeds, so nothing warns you.

5. **Include** the partial in `<head>`:

   ```go-html-template
   {{ partial "editable-regions" . }}
   ```

   | Templates come from      | Put the call in                                                                                                                                                                                                                                                                      |
   | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | The project's `layouts/` | The base layout (`baseof.html`), or the `head.html` partial it calls                                                                                                                                                                                                                 |
   | A theme or module        | The theme's head hook, if it has one: a project file at the path of a partial the theme's head template calls for users to fill (usually guarded by `templates.Exists`, or an empty partial such as `custom-head.html`). Fork `baseof.html` or `head.html` only when there's no hook |

   It self-gates on `window.inEditorMode`, so it loads nothing outside the Visual Editor. It works in any context, including a `partialCached` hook, and one hook file covers every base layout.

6. **Gitignore** `assets/jsconfig.json`. Hugo generates it on the first build, and it holds absolute module-cache paths from your machine.
7. **Build** (`hugo`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

**MUST:** pin a release tag, never a commit or branch.
**Why:** the module downloads its renderer (`hugo_renderer.wasm.gz`, ~20 MB) from the GitHub release matching the module version. A commit has no release asset, and the build fails. The build therefore also needs network access to GitHub — CloudCannon's build has it.

### Upgrading Hugo first

The editor re-renders partials with its own, newer Hugo ([visual-editing-reference.md § What the editor's Hugo has](visual-editing-reference.md#what-the-editors-hugo-has) names the version), whatever the site builds with. A site far behind that can use template functions the editor's Hugo no longer has, and those break only in the editor. Treat a large gap as a risk rather than a hard minimum: suggest upgrading, and **ask the user** before doing it.

Moving up surfaces removed APIs unrelated to editable regions. **Build the unmodified site on the target Hugo before adding the module**, so a failure there isn't blamed on the integration. Stay inside every version window the site declares — see [migrate-to-cloudcannon/hugo/audit.md § 1](../../migrate-to-cloudcannon/hugo/audit.md#1-hugo-version-modules-and-themes).

| Symptom on a newer Hugo                                            | Fix                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `resources.ToCSS` is gone                                          | `css.Sass`                                                                                   |
| `"tailwindcss" is not whitelisted in policy "security.exec.allow"` | Add `^tailwindcss$` to `security.exec.allow` in the site config, keeping the default entries |
| `.Site.Data` or `site.Data` deprecation warning (0.156)            | `hugo.Data` — safe in partials the editor re-renders, whose renderer is Hugo 0.164           |
| `languageCode` deprecation warning (0.158)                         | `locale`                                                                                     |

```yaml
security:
  exec:
    allow: ["^(dart-)?sass$", "^go$", "^git$", "^node$", "^postcss$", "^tailwindcss$"]
```

The list is not exhaustive — Hugo's release notes name each removal.

Run `hugo --logLevel info` and fix each deprecation it reports.

Record the version change in `.cloudcannon/migration/visual-editing.md`.

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page.

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). Its generic terms in Hugo:

| Term                 | Hugo equivalent                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registered component | A partial, named by its path under `layouts/partials/` (or `layouts/_partials/`)                                                                                                                 |
| Page template        | A template under `layouts/` that isn't a partial — primitives only, see [visual-editing-reference.md § What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render) |
| Loop                 | `range`                                                                                                                                                                                          |
| Data file            | `data/*.{yml,yaml,json,toml}`                                                                                                                                                                    |
| Content entry        | A file under `content/`                                                                                                                                                                          |
| Build output         | `public/`                                                                                                                                                                                        |

Add one Hugo-specific column to the census: **Partial?** — whether the section already renders from a partial. Every `component` treatment on a section that is inline in a page template needs an extraction step first.

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `hugo version` matches `hugo_version` in `.cloudcannon/initial-site-settings.json`, and any upgrade was agreed with the user
- [ ] `go.mod` requires `github.com/CloudCannon/editable-regions` at a release tag (`v0.0.21`), not a pseudo-version
- [ ] The site config imports the module, and existing `module.mounts` are intact
- [ ] No `module.imports` entry has a `version` key
- [ ] `{{ partial "editable-regions" . }}` is in `<head>` of every base layout (check each `baseof.html`, including section-specific ones), or in the theme's head hook
- [ ] `grep -o 'live-editing[^"]*' public/index.html` finds the script reference. Hugo JS-escapes the path inside `<script>` (`\/_cloudcannon\/`), so grepping `_cloudcannon` finds nothing
- [ ] `assets/jsconfig.json` is gitignored
- [ ] `hugo` builds cleanly, and `public/_cloudcannon/` contains `hugo_renderer.wasm.<hash>.gz`, `hugo-worker.<hash>.js` and `live-editing.<hash>.js`
- [ ] Every component to be re-rendered is a partial → [What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render)
- [ ] Every `resources.Get` and image-processing call in a component partial, or in a partial it calls, is guarded by `site.Params.ENV_CLIENT` or reads a text asset listed in `additional_dirs` → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)
- [ ] No partial that will be a component renders `.Content` → [What the editor's Hugo has](visual-editing-reference.md#what-the-editors-hugo-has)
- [ ] Every module-cache dependency that a re-rendered template or the site config depends on is vendored in the build command → [Themes, modules and vendoring](visual-editing-reference.md#themes-modules-and-vendoring)
- [ ] Project partials the editor re-renders are in `layouts/partials/`, not `layouts/_partials/` → [What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render)

## Completeness checklist

> **Rule:** if an editor can see it on the page, an editor must be able to edit it. A section is either editable or has a written exception in `.cloudcannon/migration/visual-editing.md`.

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items — using the term mapping above.
2. **Then work through** the Hugo items:

- [ ] **Component names resolve**: every `data-component` value, and every `_name` in content and structures, names an existing partial (the project's `layouts/partials/`, or a theme's or module's partials folder)
      → [Component names are partial paths](visual-editing-reference.md#component-names-are-partial-paths)
- [ ] **Dispatcher in every layout**: every layout that renders `content_blocks` (`single.html` and `list.html`) has the array + array-item dispatcher
      → [Page builder blocks in Hugo](visual-editing-reference.md#page-builder-blocks-in-hugo)
- [ ] **Wrapper audit**: every container that gained `array-item` wrappers still lays out as before — no `> *` or implicit-`display` breakage
      → [Wrapper elements change the formatting context](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context)
- [ ] **Markdown pairing**: the multi-line check in the linked section returns nothing, or each hit is justified
      → [Text regions and markdown in Hugo](visual-editing-reference.md#text-regions-and-markdown-in-hugo)
- [ ] **Body regions**: every layout that renders `{{ .Content }}` has `data-editable="text" data-prop="@content"` on an element holding only `{{ .Content }}`, in the page template, and any new wrapper passed the formatting-context checks
      → [Blog post detail pages](visual-editing-reference.md#blog-post-detail-pages), [Wrapper elements change the formatting context](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context)
- [ ] **List pages**: front matter regions in `list.html` are inside `{{ if .File }}`
      → [List pages](visual-editing-reference.md#list-pages)
- [ ] **Shared partials**: a partial rendered for both the current page and list items emits regions only for the current page
      → [Partials shared by the page and its lists](visual-editing-reference.md#partials-shared-by-the-page-and-its-lists)
- [ ] **Bundle images**: no image region binds a value relative to a page bundle or `assets/`
      → [Image editing in Hugo](visual-editing-reference.md#image-editing-in-hugo)
- [ ] **Config-driven partials**: no component partial reads an edited value from `site.Params` or `site.Menus`
      → [Site config values](visual-editing-reference.md#site-config-values)
- [ ] **Theme overrides**: every project override of a theme template is minimal, headed with the theme version, and listed in `.cloudcannon/migration/visual-editing.md` and the README
      → [Adding regions to theme templates](visual-editing-reference.md#adding-regions-to-theme-templates)
- [ ] **Data-file regions**: every `@data[<name>]` selector's `<name>` is in `data_config`
      → [Data files and `@data`](visual-editing-reference.md#data-files-and-data)
- [ ] **Empty arrays**: every array region's container still renders when the list is empty — inside a re-rendered partial via `site.Params.ENV_CLIENT`, in a template the editor never re-renders by guarding on `isset` (lowercased key) rather than truthiness
      → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)
- [ ] **Number fields**: no text region binds a field whose content value is a bare number
      → [Value types per region](../editable-regions.md#value-types-per-region)
- [ ] **Inline scripts**: every inline `<script>` inside a bundled partial is guarded by `{{ if not site.Params.ENV_CLIENT }}` or scoped per instance
      → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)

## Local checks

Run these before handing off. None needs CloudCannon.

- [ ] **Editor-mode build.** Build with `ENV_CLIENT` forced on, then compare against the normal build:

  ```sh
  OUT=$(mktemp -d)
  printf 'params:\n  ENV_CLIENT: true\n' > "$OUT/envclient.yaml"
  ```

  | Site config is                 | Build with                                                                                                 |
  | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
  | One root file (`hugo.yaml`, …) | `hugo --config hugo.yaml,"$OUT/envclient.yaml" --destination "$OUT/public"` — use the site's own file name |
  | A `config/` directory          | `hugo --config "$OUT/envclient.yaml" --destination "$OUT/public"` — merges with `config/_default/`         |

  **MUST NOT:** set `HUGO_PARAMS_ENV_CLIENT=true` instead. Hugo splits environment keys on `_`, so it sets `params.env.client`.

  Expect no image processing from the partials the editor re-renders. `Processed images` in the build summary can still be above 0: calls in templates the editor never re-renders, and shortcodes in content bodies, still process images. Then compare `<img` counts per page against `public/`. A drop is an image that vanishes in the editor; an increase is usually an empty `<img src="">` from an unguarded fallback branch.

- [ ] **Bundle contents (gate).** This is the only local check that exercises the editor's config load and template lookup. Build into a clean `public/` (old fingerprinted bundles are never removed), open `public/_cloudcannon/live-editing.*.js`, and confirm:
  - every partial named in `data-component` appears as a bundled key — search for the `"layouts/partials/<name>.html"` (or a theme's `layouts/_partials/<name>.html`) key form, because template comments are bundled verbatim and a bare path gives false hits
  - each theme's or module's root config file appears under `themes/` or `_vendor/`
  - the bundled site config has no `version` key on any import
- [ ] **Build grep.** Count region types in the HTML only, tolerating the unquoted attributes `--minify` produces:

  ```sh
  grep -rhoE 'data-editable="?[a-z-]+' public --include='*.html' | sort | uniq -c
  ```

  Every region type you expect appears, and the shared sections (header, footer, nav) appear on every page. Quote the `--include` glob so zsh doesn't expand it.

- [ ] **Output parity.** Text and `<img>` counts per page match the parity baseline from the audit.

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `public/`. For the Shared-UI walk-through, the named data file lives in `data/` (or in the site config, for values exposed through a settings collection).
