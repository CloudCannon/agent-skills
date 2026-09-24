# Visual Editing (Hugo)

Workflow for adding CloudCannon Visual Editor support to a Hugo site with the `editable-regions` Hugo module. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), and Hugo's deltas from them in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

If the site uses Bookshop, read [migrating-from-bookshop.md](migrating-from-bookshop.md) first.

## Setup steps

It's a Hugo module, not an npm package. Nothing goes in `package.json`, and there is no component registration file.

1. **Check** the Hugo version is **0.150.0 or later** (`hugo version`), locally and in `.cloudcannon/initial-site-settings.json` (`hugo_version`). Upgrade before adding the module — see [§ Upgrading Hugo first](#upgrading-hugo-first).
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

5. **Include** the partial in `<head>` of the base layout (usually `layouts/_default/baseof.html`, or a `head.html` partial it calls):

   ```go-html-template
   {{ partial "editable-regions" . }}
   ```

   It self-gates on `window.inEditorMode`, so it loads nothing outside the Visual Editor.

6. **Gitignore** `assets/jsconfig.json`. Hugo generates it on the first build, and it holds absolute module-cache paths from your machine.
7. **Build** (`hugo`) and confirm the setup — see [§ Infrastructure checklist](#infrastructure-checklist).

**MUST:** pin a release tag, never a commit or branch.
**Why:** the module downloads its renderer (`hugo_renderer.wasm.gz`, ~20 MB) from the GitHub release matching the module version. A commit has no release asset, and the build fails. The build therefore also needs network access to GitHub — CloudCannon's build has it.

### Upgrading Hugo first

An existing site may be pinned well below 0.150, and moving up surfaces removed APIs unrelated to editable regions. **Build the unmodified site on the target Hugo before adding the module**, so a failure there isn't blamed on the integration.

| Symptom on a newer Hugo                                            | Fix                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `resources.ToCSS` is gone                                          | `css.Sass`                                                                                                  |
| `"tailwindcss" is not whitelisted in policy "security.exec.allow"` | Add `^tailwindcss$` to `security.exec.allow` in the site config, keeping the default entries. Seen on 0.166 |
| `.Site.Data` or `site.Data` deprecation warning (0.156)            | `hugo.Data` — safe in partials the editor re-renders, whose renderer is Hugo 0.164                          |
| `languageCode` deprecation warning (0.158)                         | `locale`                                                                                                    |

```yaml
security:
  exec:
    allow: ["^(dart-)?sass$", "^go$", "^git$", "^node$", "^postcss$", "^tailwindcss$"]
```

The list is not exhaustive — Hugo's release notes name each removal.

Run `hugo --logLevel info` and fix each deprecation it reports.

Record the version change in `.cloudcannon/migration/visual-editing.md`.

## Section census

> **Hard gate.** Do not write a single `data-editable` attribute until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page.

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is the same for every SSG. Follow [../astro/visual-editing.md § Section census](../astro/visual-editing.md#section-census), reading its Astro terms as their Hugo equivalents:

| Astro term                                    | Hugo equivalent                                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registered component, `registerComponents.ts` | A partial under `layouts/partials/`, named by its path                                                                                                                       |
| `.astro` component                            | Partial (`layouts/partials/*.html`)                                                                                                                                          |
| Page (`src/pages/*.astro`)                    | Page template (`layouts/**`) — primitives only, see [visual-editing-reference.md § What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render) |
| `.map()`                                      | `range`                                                                                                                                                                      |
| `src/data/*.json`                             | `data/*.{yml,yaml,json,toml}`                                                                                                                                                |
| Content collection entry                      | A file under `content/`                                                                                                                                                      |
| `dist/`                                       | `public/`                                                                                                                                                                    |

Add one Hugo-specific column to the census: **Partial?** — whether the section already renders from a partial. Every `component` treatment on a section that is inline in a page template needs an extraction step first.

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `hugo version` is 0.150.0 or later, and `hugo_version` in `.cloudcannon/initial-site-settings.json` matches
- [ ] `go.mod` requires `github.com/CloudCannon/editable-regions` at a release tag (`v0.0.21`), not a pseudo-version
- [ ] The site config imports the module, and existing `module.mounts` are intact
- [ ] `{{ partial "editable-regions" . }}` is in `<head>` of every base layout (check each `baseof.html`, including section-specific ones)
- [ ] `assets/jsconfig.json` is gitignored
- [ ] `hugo` builds cleanly, and `public/_cloudcannon/` contains `hugo_renderer.wasm.<hash>.gz` and `live-editing.<hash>.js`
- [ ] Every component to be re-rendered is a partial → [What the editor can re-render](visual-editing-reference.md#what-the-editor-can-re-render)
- [ ] Every `resources.Get` and image-processing call reached from a partial is guarded by `site.Params.ENV_CLIENT` → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)
- [ ] No partial that will be a component renders `.Content` → [What the editor's Hugo has](visual-editing-reference.md#what-the-editors-hugo-has)
- [ ] Templates from a module-cache module are vendored; nothing is vendored otherwise → [Themes, modules and vendoring](visual-editing-reference.md#themes-modules-and-vendoring)

## Completeness checklist

> **Rule:** if an editor can see it on the page, an editor must be able to edit it. A section is either editable or has a written exception in `.cloudcannon/migration/visual-editing.md`.

1. **Work through** [../astro/visual-editing.md § Universal (every migration)](../astro/visual-editing.md#universal-every-migration) and, if the site has a page builder, [§ Page builder only](../astro/visual-editing.md#page-builder-only-skip-if-not-applicable), using the term mapping above. Skip the items that name Astro-only files (`registerComponents.ts`, `componentMap.ts`, `BlockRenderer.astro`, `<Fragment>`); the Hugo items below replace them.
2. **Then work through** the Hugo items:

- [ ] **Component names resolve**: every `data-component` value, and every `_name` in content and structures, names an existing file under `layouts/partials/`
      → [Component names are partial paths](visual-editing-reference.md#component-names-are-partial-paths)
- [ ] **Dispatcher in every layout**: every layout that renders `content_blocks` (`single.html` and `list.html`) has the array + array-item dispatcher
      → [Page builder blocks in Hugo](visual-editing-reference.md#page-builder-blocks-in-hugo)
- [ ] **Wrapper audit**: every container that gained `array-item` wrappers still lays out as before — no `> *` or implicit-`display` breakage
      → [Wrapper elements around partials](visual-editing-reference.md#wrapper-elements-around-partials)
- [ ] **Markdown pairing**: `grep -rn 'data-type="\(text\|block\)"' layouts | grep -v markdownify` returns nothing, or each match is justified
      → [Text regions and markdown in Hugo](visual-editing-reference.md#text-regions-and-markdown-in-hugo)
- [ ] **Body regions**: every layout that renders `{{ .Content }}` has `data-editable="text" data-prop="@content"` on its wrapper, in the page template
      → [Blog post detail pages](visual-editing-reference.md#blog-post-detail-pages)
- [ ] **Data-file regions**: every `@data[<name>]` selector's `<name>` is in `data_config`
      → [Data files and `@data`](visual-editing-reference.md#data-files-and-data)
- [ ] **Empty arrays**: every array region's container still renders when the list is empty — inside a re-rendered partial via `site.Params.ENV_CLIENT`, in a page template by guarding on `isset` rather than truthiness
      → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)
- [ ] **Number fields**: no text region binds a field whose content value is a bare number
      → [../../cloudcannon-configuration/hugo/configuration-gotchas.md § Quote numbers](../../cloudcannon-configuration/hugo/configuration-gotchas.md#quote-numbers-a-text-region-displays)
- [ ] **Inline scripts**: every inline `<script>` inside a bundled partial is guarded by `{{ if not site.Params.ENV_CLIENT }}` or scoped per instance
      → [`ENV_CLIENT` in Hugo](visual-editing-reference.md#env_client-in-hugo)

## Local checks

Run these before handing off. None needs CloudCannon.

- [ ] **Editor-mode build.** Build with `ENV_CLIENT` forced on, then compare against the normal build:

  ```sh
  OUT=$(mktemp -d)
  printf 'params:\n  ENV_CLIENT: true\n' > "$OUT/envclient.yaml"
  hugo --config hugo.yaml,"$OUT/envclient.yaml" --destination "$OUT/public"
  ```

  Use the site's own config file name in place of `hugo.yaml`. `Processed images │ 0` in the build summary means every pipeline call was bypassed. Then compare `<img` counts per page against `public/`. A drop is an image that vanishes in the editor; an increase is usually an empty `<img src="">` from an unguarded fallback branch.

- [ ] **Bundle contents.** Build into a clean `public/` (old fingerprinted bundles are never removed), open `public/_cloudcannon/live-editing.*.js`, and confirm every partial named in `data-component` appears as a bundled key. Search for the `"layouts/partials/<name>.html"` key form — template comments are bundled verbatim, so a bare path gives false hits.
- [ ] **Build grep.** `grep -roE 'data-editable="[a-z-]+"' public | sort | uniq -c` shows every region type you expect, and the shared sections (header, footer, nav) appear on every page.
- [ ] **Output parity.** Text and `<img>` counts per page match the parity baseline from the audit.

## Pre-handoff sweep

Run [../astro/visual-editing.md § Pre-handoff sweep](../astro/visual-editing.md#pre-handoff-sweep) with `public/` in place of `dist/`. For the Shared-UI walk-through, the named data file lives in `data/`.
