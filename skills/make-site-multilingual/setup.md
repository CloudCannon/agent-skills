# Rosey setup — the nine phases

The main workflow for making a site Rosey-ready, then optionally wiring the CloudCannon connector. Read [`SKILL.md`](SKILL.md) first — it covers the two layers, which starting point applies, and SSG detection.

**Phase 3 has its own file.** [tagging.md](tagging.md) carries every `data-rosey` / `-ns` / `-root` authoring rule in full; the Phase 3 section below is the summary.

## Phase 1: Audit the site

Before touching code, understand what needs to be translated.

1. **Find all translatable text.** Search templates, components, and layouts for user-visible text:
   - Headings, paragraphs, button labels, link text, alt text
   - Text in markdown frontmatter that renders into HTML (titles, descriptions)
   - Text in global data files (navigation labels, footer text, company info)
   - Hardcoded strings in template files

2. **Identify the build output directory.** Common values: `dist/`, `_site/`, `public/` (Hugo), `build/`, `out/`. Check the framework config (e.g., `astro.config.mjs`, `eleventy.js`, Hugo's `publishDir`). Paths below say `dist/` — substitute your output directory.

3. **Map out the page/content structure.** Understand how pages are generated — dynamic routes, content collections, data-driven pages, page-builder arrays. This determines how you set `data-rosey-root` and `data-rosey-ns` values.

4. **Confirm the target locales** with the user (e.g., `fr,de,es`) and the default/source language (usually `en`). **Every locale with a locale file is published**, translated or not: an untranslated locale ships default-language text marked `lang="de"`, with `hreflang` and sitemap entries. To hold one back until it's translated, leave it out of `--locales` (and so out of `rosey/locales/`) for now.

5. **Decide the URL structure — ask the user, don't assume.** Rosey can serve the default language either at the site root or under its own locale prefix. This is the `--default-language-at-root` flag on `rosey build`, and the choice changes URLs, redirects, the locale picker, and CloudCannon collection paths — so settle it before wiring anything up.

   | Mode                       | `rosey build` flag                       | Default-language URLs             | Root `/`                                                                    | Other locales |
   | -------------------------- | ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------------- | ------------- |
   | **Default at root**        | `--default-language-at-root` **present** | `/about/`, `/blog/my-post/`       | The default-language home page                                              | `/fr/about/`  |
   | **All languages prefixed** | flag **omitted**                         | `/en/about/`, `/en/blog/my-post/` | A generated **redirect page** that sends visitors to their preferred locale | `/fr/about/`  |
   - **Default at root** keeps existing URLs stable — good for an established site (no SEO churn, no broken inbound links) — and needs no change to CloudCannon collection `url`s. This is the historical default of this skill.
   - **All languages prefixed** treats every language equally: the default language lives under `/{defaultLang}/*` just like the others, and `/` becomes a locale-detecting redirect served at `index.html`. Cleaner symmetry, but **every existing default-language URL moves under the prefix** — so set up redirects for inbound links, and **every visitor-facing collection `url` in `cloudcannon.config.yml` must gain the `/{defaultLang}/` prefix** (e.g. `/[slug]/` → `/en/[slug]/`; see Phase 5e).

   **MUST NOT add the default-language prefix in your own routes or permalinks.** In all-languages-prefixed mode the SSG still builds the default language at the **root**; `rosey build` is what relocates it to `/{defaultLang}/` and leaves a redirect behind. Prefix it yourself and you get `/en/en/about/`. The only SSG routes that legitimately carry a locale prefix are per-locale split-by-directory collections (Phase 8).

   Record the choice. It feeds the postbuild command (Phase 4), the CloudCannon collection URLs (Phase 5e), verification (Phase 6), and the locale picker (Phase 9). The rest of this skill uses **`{defaultLang}`** to mean the actual default-language code (e.g. `en`) wherever the prefix appears.

6. **Detect Bookshop (most sites don't use it).** Look for `bookshop.config.cjs`, a `_bookshop/` or `component-library/bookshop/` directory, `{% bookshop %}` tags, or `_bookshop_name` in content files. If none are found, **skip all Bookshop-specific notes** throughout this skill. Bookshop is a legacy component framework — most CloudCannon sites use editable regions instead.

7. **Hugo: choose a setup before Phase 2.** Hugo has its own multilingual system, and one of the three setups doesn't use Rosey at all — see [hugo/overview.md § Choose a setup](hugo/overview.md#choose-a-setup).

## Phase 2: Install dependencies

**Fastest path (recommended for agents):** run the setup wizard non-interactively. It handles installation, the postbuild pipeline, and CloudCannon config in one command with no prompts:

```bash
npx rosey-cloudcannon-connector init --yes --locales fr,de
```

Override any default as needed:

```bash
npx rosey-cloudcannon-connector init --yes \
  --locales fr,de,es \
  --default-language en \
  --build-dir dist \
  --rosey-dir rosey \
  --content-at-root \
  --collection
```

The manual steps below (Phases 3–4) are still needed for tagging templates. `init` writes the postbuild (Phase 4) and the CloudCannon config (Phases 5c–5d). It only prints the rest — the RCC import (5a), the snapshot boundary (5b) and the sync path (5f) — so do those yourself. Then tag (Phase 3) and verify (Phase 6).

> **Re-read the config `init` rewrote.** Its `source`-removal pass doesn't reach every `source`-relative path — confirm each one moved before relying on it. See the [`source` gotcha](troubleshooting.md#cloudcannon-cant-reach-roseylocales).

> **Fix the postbuild `init` wrote.** Add `rm -rf ./_untranslated_site` before its `mv` (without it, a second local run moves the build _into_ the old copy and Rosey rebuilds from stale HTML). Add [Phase 4's fix script](#fix-the-head-and-sitemap-on-generated-pages) if the layout emits a canonical or `og:url`, or the site has a sitemap. If the postbuild already had steps, check their order ([Phase 4](#existing-postbuild-steps)).

> **Reconcile the URL-structure choice (Phase 1 step 5).** `init` writes a postbuild that serves the default language at root (`--default-language-at-root`). If the user chose **all languages prefixed**, remove that flag from `.cloudcannon/postbuild` and add the `/{defaultLang}/` prefix to collection URLs (Phase 5e) before the first build.

**Interactive mode** (if a human is running it):

```bash
npx rosey-cloudcannon-connector init
```

**Manual install** (skip the wizard entirely):

```bash
npm install rosey
npm install rosey-cloudcannon-connector
```

> `rosey` alone is enough for the required Rosey layer. `rosey-cloudcannon-connector` provides the `write-locales`/`init` CLIs used by the pipeline _and_ the optional client-side RCC. Install both even if you're only building the Rosey layer — the CLIs are used regardless.

## Phase 3: Tag templates with `data-rosey`

**[`tagging.md`](tagging.md) owns this phase in full.** Read it before tagging anything; the rules below are the ones most often got wrong, not a summary.

- **`data-rosey-ns` appends to the current namespace; `data-rosey-root` replaces it** (§3b). Every key-grouping decision in the phase follows from this one distinction.
- **`data-rosey` goes on the innermost text element** (§3c). A wrapper holding icons or nested components captures that markup into the source and injects it twice — on translated pages only.
- **For looped items the namespace goes inside the item's own component** (§3g), never on the parent's loop wrapper, and never on a purely structural wrapper.
- **Derive `data-rosey-root` from the template's source identity, not the computed URL** (§3e). One template can serve many URLs; a URL-derived root silently duplicates every key on page 2 of a paginated listing.

| §                                                                         | Covers                                                         |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [3a](tagging.md#3a-set-up-data-rosey-root-on-page-containers)             | Page-level namespace                                           |
| [3b](tagging.md#3b-add-data-rosey-ns-for-component-namespacing)           | `ns` vs `root` semantics                                       |
| [3c](tagging.md#3c-add-data-rosey-to-translatable-elements)               | Tagging text elements; rich text regions; markdown `data-type` |
| [3d](tagging.md#3d-handle-shared-and-global-content)                      | Nav, footer, and shared chrome inside `<main>`                 |
| [3e](tagging.md#3e-derive-the-root-from-the-templates-source-identity)    | Where the root value comes from                                |
| [3f](tagging.md#3f-component-integration-auto-derive-data-rosey-optional) | Auto-deriving keys from `data-prop`                            |
| [3g](tagging.md#3g-namespacing-arrays-and-page-builder-blocks)            | Arrays, page-builder blocks, UUID seeding, content-as-key      |
| [3h](tagging.md#3h-head-text-and-attribute-only-text)                     | `<head>` and attribute-only text                               |
| [3i](tagging.md#3i-taxonomy-labels-tags-categories)                       | Tag and category labels                                        |

**Read the SSG-specific file** alongside it — root derivation, block namespacing, and head tagging all have framework-specific expressions.

## Phase 4: Make the site Rosey-ready (the pipeline)

This is the required core: a postbuild pipeline that generates locale files and builds translated copies of the site. If you ran `init`, most of this is already in `.cloudcannon/postbuild` — compare it with the block below.

Create/update `.cloudcannon/postbuild` (adjust `--source dist` to your build output dir). `--locales fr,de` on `write-locales` names the locale files it creates and updates; without it, later runs auto-detect the files already in `rosey/locales/`. `rosey build` publishes every file in `rosey/locales/`, so a locale is held back (Phase 1 step 4) by never creating its file. Keep the flag, so the postbuild lists the published locales:

```bash
#!/usr/bin/env bash

npx rosey generate --source dist
npx rosey-cloudcannon-connector write-locales --source rosey --dest dist --locales fr,de
npx rosey-cloudcannon-connector install-client --dest dist
rm -rf ./_untranslated_site
mv ./dist ./_untranslated_site
npx rosey build --source _untranslated_site --dest dist --default-language en --default-language-at-root --exclusions "\.(html?)$"
```

**MUST NOT add `set -e` or other shell options.** CloudCannon sources the postbuild, so they leak into its runner.

**Add `_untranslated_site/` to `.gitignore`.** The pipeline leaves it behind on local runs.

### Existing postbuild steps

**MUST run anything that reads the built HTML after `rosey build`** (and after the fix script): a search indexer like Pagefind, a link checker, a sitemap generator. `init` appends the Rosey steps after whatever the postbuild already had, so an existing `npx pagefind --site dist` ends up indexing the default language only. Move it to the end; Pagefind then indexes each language by `<html lang>`.

Steps that change the HTML Rosey should read (minifying, injecting markup) stay before `rosey generate`.

**The `--default-language-at-root` flag encodes the Phase 1 step 5 choice:**

- **Default at root** (flag **present**, as above) — default-language pages stay at `/about/`; other locales build at `/{locale}/about/`.
- **All languages prefixed** (flag **omitted**) — the last line becomes:
  ```bash
  npx rosey build --source _untranslated_site --dest dist --default-language en --exclusions "\.(html?)$"
  ```
  Now `rosey build` **relocates** the default language to `/en/about/`, alongside `/fr/about/`, and generates a locale-detecting **redirect page at the root `index.html`**. Your SSG still builds it at the root — don't prefix your own routes (Phase 1 step 5). If you chose this mode, also prefix collection URLs (Phase 5e).

Keep `--default-language en` in both modes — it names the source language regardless of where it's served.

What each step does:

1. `rosey generate` — scans built HTML and writes `rosey/base.json` (all keys + original text).
2. `write-locales` — creates/updates `rosey/locales/{code}.json` (preserving existing translations, removing keys no longer in `base.json`). It also writes the locale manifest to `dist/_rcc/locales.json`, which the RCC reads at runtime.
3. `install-client` — **(RCC layer)** copies the RCC's browser script to `dist/_rcc/client.mjs`, which Phase 5a imports. It must run before the `mv`, so the file is in the tree Rosey copies through.
4. `mv` — moves the untranslated build aside.
5. `rosey build` — rebuilds the site with translations injected at `/{locale}/` URLs (and, without `--default-language-at-root`, moves the default language to `/{defaultLang}/` and writes the root redirect). `--exclusions "\.(html?)$"` overrides Rosey's default (`\.(html?|json)$`) so JSON assets like `_rcc/locales.json` and `_cloudcannon/info.json` flow through.

> `write-locales` also accepts `--keep-unused` to preserve locale keys no longer in `base.json`. Not needed for greenfield setup — it's used during migration (Appendix A/B) to remap old translations before cleanup.

### What `rosey build` rewrites, and what it doesn't

`rosey build` rewrites the same things on every page in a locale directory, whether it generated the page or the SSG built it (Phase 8):

| Rewritten                                                                       | Left as-is                                                                                     |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `<a href>` starting with `/` (`/about/` → `/fr/about/`)                         | Absolute (`https://example.com/about/`) and relative (`about/`) hrefs                          |
| `<html lang>`; adds `<meta http-equiv="content-language">` and `hreflang` links | Hrefs with a file extension other than `.html` (`/feed.xml`), and `data-rosey-ignore` links    |
| Text and attributes tagged with `data-rosey`                                    | `<link rel="canonical">`, `og:url`, `<meta http-equiv="refresh">` redirects, and `sitemap.xml` |

`--base-url https://example.com` makes Rosey's `hreflang` hrefs absolute; it changes nothing else. Pass it with the production URL: search engines expect absolute `hreflang` URLs.

**Missing `/fr/…` URLs get the default-language 404 on CloudCannon hosting.** Rosey writes a translated `/fr/404.html`, but the host serves the root `404.html` for every missing URL. Tell the user.

### Fix the head and sitemap on generated pages

**MUST add the fix script when the layout emits a canonical or `og:url`, or the site has a sitemap.** Copy [`scripts/fix-rosey-pages.mjs`](scripts/fix-rosey-pages.mjs) into `.cloudcannon/` and add it after `rosey build`:

```bash
node .cloudcannon/fix-rosey-pages.mjs --source _untranslated_site --dest dist --locales fr,de
```

**Why:** every page Rosey generates is a copy of the default-language page, head included. Without the fix, each `/fr/` page declares the English URL as its canonical, which tells search engines not to index it, and no `/fr/` page appears in any sitemap.

The script only touches pages Rosey generated. It localizes a canonical or `og:url` that points at the page's own default-language URL (a canonical set to another site is left alone), points alias redirects at the locale copy, and adds each page to the sitemap if its default-language URL is listed there. It covers default-language-at-root mode only.

> **Not on CloudCannon?** The `.cloudcannon/postbuild` filename is a CloudCannon convention, but the four commands are plain shell — run them in any CI step or build hook. `write-locales` and `rosey build` don't require CloudCannon.

### Adding a locale later

A locale held back in Phase 1 step 4 goes live by adding it everywhere the first ones are listed:

- [ ] `--locales` on `write-locales` in the postbuild (`fr,de`). Keep the flag there: it is the list of published locales
- [ ] `--locales` on the fix script, if the postbuild runs it
- [ ] `data_config: locales_de` (Phase 5c)
- [ ] The locale picker's locale list (Phase 9), and any locale config the templates read (`data-rcc-exclude` lists, Phase 8)
- [ ] The SSG's own language config, for per-locale content directories (Phase 8)

Then build, run the postbuild, and translate the new locale file with [`translate-site`](../translate-site/SKILL.md).

## Phase 5: Add the RCC + CloudCannon layer (optional)

> **(RCC layer)** — skip this entire phase if the site isn't on CloudCannon. The site is already translatable via the Phase 4 pipeline; fill in the locale files with the [`translate-site`](../translate-site/SKILL.md) skill or any other method.

### 5a. Import the RCC in the root layout

Lazy-load the RCC so it only runs inside the CloudCannon editor. Place it in `<body>`, after the main content:

```html
<script>
  if (window?.inEditorMode) {
    import("/_rcc/client.mjs").catch(console.error);
  }
</script>
```

**MUST import the URL, not the package name, unless the framework bundles this script.** `install-client` (Phase 4) puts the file at `/_rcc/client.mjs`. A bare `import("rosey-cloudcannon-connector")` only resolves where a bundler processes the layout's scripts; on Eleventy, Hugo and Jekyll the browser can't resolve it, and the RCC never loads. On a bundled framework, the SSG file says whether you can use the bare specifier and skip `install-client`.

### 5b. Set the snapshot boundary

The RCC clones a boundary container when switching locales. Default is `<main>`. Because nav/footer text is usually translatable too, wrap nav + main + footer in a `data-rcc` element:

```html
<body>
  <div data-rcc>
    <header />
    <main><slot /></main>
    <footer />
  </div>
  <!-- RCC script here, OUTSIDE the boundary -->
</body>
```

`<body>` itself **cannot** be the boundary — it hosts the RCC's own UI, CloudCannon's editing infrastructure, and `<script>` tags. If only `<main>` is translatable, omit `data-rcc` and rely on the fallback.

### 5c. Add `data_config` for locale files

Phases 5c–5e all write `cloudcannon.config.yml`. The [`cloudcannon-configuration`](../cloudcannon-configuration/SKILL.md) skill owns that file — in particular [§ Do this before writing any configuration](../cloudcannon-configuration/SKILL.md#do-this-before-writing-any-configuration), which requires downloading the JSON schemas first. Follow it rather than writing keys from memory.

In `cloudcannon.config.yml`, add an entry per locale. The key **must** follow `locales_{code}`:

```yaml
data_config:
  locales_fr:
    path: rosey/locales/fr.json
  locales_de:
    path: rosey/locales/de.json
```

This is what the RCC's JS API reads to bind inline editors to locale data.

### 5d. (Optional) Expose locales as a browsable collection

For translations that don't appear visually on a page (HTML attributes, `<head>` values, alt text) or for bulk editing, expose the locale files as a CloudCannon collection:

```yaml
collections_config:
  locales:
    path: rosey/locales
    name: Locales
    icon: translate
    disable_add: true
    disable_add_folder: true
    disable_file_actions: true
    _inputs:
      value:
        type: html
        label: Translation
        cascade: true
      original:
        hidden: true
        cascade: true
      _base_original:
        disabled: true
        cascade: true
```

`data_config` exposes data for programmatic use (the RCC's API, select inputs); `collections_config` is what gives editors a browsable sidebar interface. They're independent.

**If the config has `collection_groups`, add `locales` to a group.** A collection missing from the groups doesn't appear in the sidebar, and `init` doesn't add it.

### 5e. Prefix collection URLs (all-languages-prefixed mode only)

> **Skip this entirely if you kept `--default-language-at-root`** — default-language URLs didn't move, so collection URLs are already correct. This applies whenever you omitted the flag (Phase 1 step 5), even without the RCC — it's a plain CloudCannon-config concern.

When every language is prefixed, the default-language pages move from `/about/` to `/{defaultLang}/about/`. CloudCannon resolves each collection's edit/preview URL (and the Visual Editor iframe) from its `url` config, so **every collection that renders visitor-facing pages must gain the `/{defaultLang}/` prefix**. Without it, CloudCannon opens the old root URL — which now serves only the redirect page — and inline editing breaks.

**This is a config change, not a routing change.** The collection `url` describes where `rosey build` puts the page; your SSG routes still emit it at the root (Phase 1 step 5).

For `url` placeholders, trailing-slash rules, and troubleshooting a page that won't load in the Visual Editor, see [`cloudcannon-configuration/collection-urls.md`](../cloudcannon-configuration/collection-urls.md).

Prepend the literal default-language code to each collection's existing `url` (here `en`):

```yaml
collections_config:
  pages:
    path: src/pages
    url: "/en/[slug]/" # was '/[slug]/'
  blog:
    path: src/content/blog
    url: "/en/blog/[full_slug]/" # was '/blog/[full_slug]/'
```

- Prefix **every** visitor-facing page collection, not just some — mismatched collections send editors to dead URLs.
- **Leave the `locales` data collection (5d) alone** — it's a data-file browser, not a rendered page, so it has no `url`.
- Per-locale split-by-directory collections (Phase 8) are already prefixed with their own locale (`/fr/blog/...`); in this mode the **default-language** split collection also needs `/{defaultLang}/blog/...`.

### 5f. Sync the locale files back to the repo

**MUST set `CLOUDCANNON_SYNC_PATHS=/rosey/`** in the site's environment variables in CloudCannon (site settings). For a site not created yet, add it to `build.environment_variables` in `.cloudcannon/initial-site-settings.json` as well — that file only applies when a site is created.

**Why:** `rosey generate` and `write-locales` update `rosey/base.json` and `rosey/locales/*.json` during each CloudCannon build. Without the sync path, those changes stay in the build: new keys never reach the repo, so the locales collection and the RCC never see them. `init` prints this as its first next step and doesn't set it.

## Phase 6: Generate and verify

**MUST verify on a translated page, not `/`.** Almost every multilingual bug renders correctly in the default language, because Rosey doesn't inject translations there — a polluted key, a stale namespace, a duplicated pagination root and a dropped Visual Editor save all look perfect at `/`. See [troubleshooting.md](troubleshooting.md).

1. **Build locally:** `npm run build`
2. **Generate the base file:** `npx rosey generate --source dist`
3. **Create locale files** (first time, name the locales; later runs auto-detect):
   ```bash
   npx rosey-cloudcannon-connector write-locales --source rosey --dest dist --locales fr,de
   ```
4. **Run the 6a assertions against `rosey/base.json`.**
5. **Verify locale files** (`rosey/locales/fr.json`) — keys match `base.json`; `original`/`value` populated.
6. **Test the full pipeline:** run `.cloudcannon/postbuild` after a fresh build, so you test what CloudCannon runs. **Empty the output folder before each local build** (Hugo: `--cleanDestinationDir`; Eleventy doesn't clean `_site/` either). Otherwise the last run's `/{locale}/` pages survive the SSG build, `rosey build` treats them as SSG-built locale pages, and your changes never reach them. CloudCannon builds start clean.
7. **Open a translated page.** Not just the directory listing — read `dist/{locale}/index.html` and one deep page (a post, a paginated listing page 2), and confirm: the text is translated, no icon or SVG markup appears twice, code samples still show their `<` and `>` ([Rosey entity bug](troubleshooting.md#code-samples-break-on-locale-pages)), internal links point inside the locale, the canonical (if any) is the locale URL, and there is no `/{defaultLang}/{defaultLang}/` anywhere in the output. Confirm `dist/_rcc/locales.json` exists and parses, and **(RCC layer)** that `dist/_rcc/client.mjs` exists. **In all-languages-prefixed mode**, also confirm the default language lives at `dist/{defaultLang}/` and the root `dist/index.html` is the generated redirect, not the home page.
8. **(RCC layer)** Push to CloudCannon, open a page in the Visual Editor, confirm the locale-switcher FAB appears, switch locale, make an edit, **reload and confirm the edit survived** — a save that silently doesn't persist is the [dotted-key failure](troubleshooting.md#edits-save-in-the-visual-editor-but-never-persist).

### 6a. Assertions on `rosey/base.json`

Each maps to a specific failure that builds cleanly.

| Assert                                                                                  | Catches                                                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| No key contains `.`                                                                     | The §3f dotted-key Visual Editor save failure. Sound because §3h requires `data-rosey-attrs-explicit`, the only other source of dotted keys. |
| Every UUID segment corresponds to a `_uuid` present in content                          | Unseeded or stale namespaces. Note that **nesting legitimately produces two UUID segments in one key**, so don't assert one-per-key.         |
| No key contains `undefined`; no namespace segment is empty                              | Unseeded `_uuid` — and `undefined` collides across every unseeded item.                                                                      |
| No `original` value contains `<svg`, `<!--`, or a nested component's markup             | Mixed-children pollution, before it reaches translators.                                                                                     |
| `JSON.parse(dist/_rcc/locales.json).locales` is a non-empty array of the expected codes | A wrong `--exclusions` yielding a file that exists upstream but is missing or empty in `dist`. Existence alone is insufficient.              |

### 6b. Commit `rosey/base.json` as the baseline

Two further checks — "is every colon-less key intentional?" and "is the key count plausible?" — can't be evaluated in the abstract. Make them diffable instead:

**Commit `rosey/base.json` to git.** After any later build, `git diff rosey/base.json` **is** the assertion, and every hunk must be explainable:

| Diff hunk                                      | Means                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| A new key with no `:`                          | A missing `data-rosey-root` — the element fell out of its namespace.       |
| Key count moved by an order of magnitude       | A tagging pass silently didn't run, or a root changed and duplicated keys. |
| A changed `original` on a key nobody edited    | Two render sites now disagree — see the taxonomy label helper (§3i).       |
| A new UUID segment where content didn't change | A namespace on a structural wrapper, re-keyed by an editor's drag.         |

Legitimate colon-less keys do exist — a `data-rosey-root=""` global, and `<head>` keys that sit outside `<main>`. The point is that a _new_ one is a signal.

## Phase 7: RTL language support (if applicable)

If any target locale is right-to-left (Arabic, Hebrew, Farsi, Urdu, etc.), add RTL support. The RCC auto-sets `dir="rtl"` on the clone container in the Visual Editor, but production needs its own setup.

### 7a. Add the `dir` detection script

Add an inline `<script>` at the top of `<head>` in the root layout — it must run before first paint to avoid a flash of LTR content:

```html
<script>
  const rtl = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "ku", "ckb", "dv", "ug"]);
  const lang = document.documentElement.lang?.split("-")[0];
  if (rtl.has(lang)) document.documentElement.dir = "rtl";
</script>
```

This uses the same pattern as dark-mode detection scripts — negligible performance impact. In Astro, it needs `is:inline` (see `astro/overview.md`).

### 7b. Audit CSS for physical properties

Replace physical direction properties with logical equivalents:

- `margin-left`/`margin-right` → `margin-inline-start`/`margin-inline-end`
- `padding-left`/`padding-right` → `padding-inline-start`/`padding-inline-end`
- `border-left`/`border-right` → `border-inline-start`/`border-inline-end`
- `text-align: left`/`right` → `text-align: start`/`end`
- `float: left`/`right` → `float: inline-start`/`inline-end`
- `left`/`right` positioning → `inset-inline-start`/`inset-inline-end`

For Tailwind: `ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`/`text-end`.

### 7c. Mirror directional icons

```css
[dir="rtl"] .icon-arrow {
  transform: scaleX(-1);
}
```

## Phase 8: Split-by-directory for body content (optional)

For pages with large body content (blog posts, articles, docs), a single Rosey key per body is impractical. Instead, create a **separate content collection per locale** and let the SSG build those pages natively at `/{locale}/...` URLs. Rosey still runs in postbuild and **merges** with the pre-existing locale pages — it respects the existing body content and only translates `data-rosey` elements (shared UI strings).

**On Hugo, this phase is setup B**, built with Hugo languages: see [hugo/hybrid.md](hugo/hybrid.md), which maps each step below.

### When to use it

- Long-form body content, or bodies with rich components/formatting
- Editors want CloudCannon's Content Editor rather than the Visual Editor's inline translation

### How it works

1. **Create per-locale content directories** mirroring the default-language collection (`blog/` → `blog_fr/`, `blog_de/`). Seed with copies of the English files.
2. **Register the locale collections with the SSG**, same schema as the English collection.
3. **Create locale routes** so the SSG builds `/{locale}/blog/{slug}/`. **MUST derive the slug from the filename, never from the translated title.** Every locale's copy of a post shares one URL path. A title-derived slug forks the path per locale and breaks the locale picker, `hreflang`, tag links, step 5's root-stripping, and `translate-site`'s same-filename pairing of source to locale copy.
4. **Extract shared rendering logic** and pass `locale` for locale-aware links, dates, and collection selection.
5. **Align Rosey roots** — locale pages must set `data-rosey-root` to the **English-equivalent** path (`blog/my-post`, not `fr/blog/my-post`) via a `roseyRoot` override that strips the locale prefix. Deriving the root from source identity ([§3e](tagging.md#3e-derive-the-root-from-the-templates-source-identity)) makes this nearly free.
6. **Scope every content query to one locale.** Once per-locale directories exist, any ambient query mixes languages: taxonomy term collections, RSS feeds, sitemaps, "recent posts" sidebars, search indexes. Build per-`(term, locale)` groupings from that locale's own content. **Why:** the query still returns results and the page still builds — a French tag page just quietly lists English posts. Needed on Astro and Eleventy; Hugo languages scope all of these already.
7. **Keep internal links root-relative.** `rosey build` prefixes `<a href="/...">` on these pages as on generated ones ([Phase 4](#what-rosey-build-rewrites-and-what-it-doesnt)), so a plain `/about/` link is right. Prefix links yourself only where Rosey can't reach them: links built in JavaScript, absolute URLs, and previews served without the postbuild (the SSG's dev server). If you do, **skip paths with a file extension** (`/feed.xml` is emitted once at the root) and **don't prefix on default-language pages** (the same template renders `/blog/x/`).
8. **Suppress `data-rosey` on body content and frontmatter-driven fields** (title, description, tags) — those are translated in the locale collection files. Keep `data-rosey` on shared UI (breadcrumbs, sidebar headings, share buttons). **This includes the `<head>`** — don't give these pages head keys ([§3h](tagging.md#which-pages-need-head-keys)); their `<title>`/description already come from the translated frontmatter, and a Rosey value overwrites it. But do check whether a _listing_ route reads its title from the shared default-language entry — those still need keys.
9. **(RCC layer)** Add CloudCannon collections for each locale (`blog_fr`, `blog_de`) with `url: /{locale}/blog/[full_slug]/`.
10. **Create a locale config utility** — one file mapping locale codes to collection names, date locale strings, and display labels.
11. **(RCC layer) Hide the locale switcher on these pages** — see below.

#### Hide the locale switcher on split-by-directory pages **(RCC layer)**

This is the place to use **`data-rcc-exclude`**. Put it on the snapshot boundary listing **every** locale, and the RCC skips injecting its switcher entirely:

```html
<div data-rcc data-rcc-exclude="fr,de"></div>
```

Build the list from the locale config rather than hardcoding it, so adding a language doesn't leave one locale switchable on these pages.

**Why it matters.** These pages are translated by editing the locale's own content file, so the switcher offers a locale with nothing to switch — the body is frontmatter-driven and carries no keys. An editor picks FR, sees the post unchanged, and reports translation as broken. Shared UI on the page (nav, footer, "Recent posts") _is_ keyed, but those keys are global and translatable from any other page, so nothing is lost by hiding the switcher here.

**Do it in the shared post layout, not the route**, so it covers the default-language page too — `/blog/my-post/` has the same problem as `/fr/blog/my-post/`.

**A content-editor default doesn't protect you.** Setting `_enabled_editors` to prefer the content editor only changes which editor opens first; editors can still switch to the Visual Editor and hit this. The exclusion is the actual fix.

Note the difference from **`data-rcc-ignore`**, which opts a _single_ `data-rosey` element out of switching (§3c). `data-rcc-exclude` works per page, on the boundary, and takes locale codes.

The locale collection files themselves get translated with the [**`translate-site`**](../translate-site/SKILL.md) skill (its content-collections workflow). **Read the SSG-specific file** for routing, collection setup, and suppression details.

## Phase 9: Visitor-facing locale picker (optional)

**Ask the user first:** "Would you like a visitor-facing locale picker (language switcher) added, or do you already have one / prefer to bring your own?" If they decline, remind them that any links to locale URLs need `data-rosey-ignore` (see gotcha).

If they want one, create a picker component that:

- Parses the current URL to detect the active locale (is the first path segment a known locale code?)
- Strips the locale prefix to get the base path
- Builds each locale's URL according to the Phase 1 step 5 mode:
  - **Default at root:** `/{locale}{basePath}` for non-default locales, `{basePath}` for the default.
  - **All languages prefixed:** `/{locale}{basePath}` for **every** locale, including the default (its links point at `/{defaultLang}{basePath}`, not `/`).
- Adds **`data-rosey-ignore`** on every `<a>` (critical — prevents Rosey double-prefixing locale URLs)
- Adds `hreflang` attributes for SEO
- Includes a small client-side script to fix the active-state highlight on Rosey-generated pages

Place it in both desktop and mobile nav. **Read the SSG-specific file** for a code example, and [troubleshooting.md](troubleshooting.md#the-locale-pickers-links-are-broken-or-mis-highlighted) when its links misbehave.

### Hide the picker inside the editor **(RCC layer)**

> Skip this if the site isn't on CloudCannon / has no RCC layer. The guard is harmless everywhere (`window.inEditorMode` is only ever set by CloudCannon), so you can leave it in regardless.

When the RCC layer is installed, it injects its **own** floating locale switcher into the Visual Editor. A second, nav-based picker in the editor is confusing — and switching locale through the nav picker fights the RCC's snapshot/clone locale mechanism (§5b). So the visitor-facing picker must **hide itself in the editor** by checking `window.inEditorMode` — the same flag used to lazy-load the RCC in Phase 5a.

Add this to the picker's client-side script: the editor branch hides every `nav[aria-label="Language"]`, and the existing active-state highlight logic moves into the `else` branch (visitor pages only). See the SSG-specific file for the exact code.

---

## Checklist

- [ ] URL structure confirmed with the user (default-at-root vs all-languages-prefixed) and the `rosey build` flag matches
- [ ] No SSG route or permalink adds the `{defaultLang}` prefix itself; no `/{defaultLang}/{defaultLang}/` in the output
- [ ] **(all-languages-prefixed)** Collection `url`s prefixed with `/{defaultLang}/`; root redirect page verified
- [ ] All user-visible text elements have `data-rosey` attributes
- [ ] Each page/route has a `data-rosey-root` derived from the template's source identity, not the computed URL
- [ ] Paginated listings share one root — page 2 has no duplicate keys
- [ ] Reusable sections / array items use `data-rosey-ns` for namespacing — **placed inside each item's component**, not on the loop element and not on a structural wrapper
- [ ] No `data-rosey-ns="undefined"` and no empty namespace segment in the output
- [ ] No `data-rosey` key contains a `.`
- [ ] Every markdown region has a matching `data-type` **and** a rich bound input **(RCC layer)**
- [ ] Root `<html>` tag has `lang="{defaultLanguage}"` set (e.g. `<html lang="en">`)
- [ ] `<title>` **and** meta description tagged (§3h) on pages Rosey generates copies of — and **not** on split-by-directory pages whose head comes from translated frontmatter
- [ ] Attribute-only text uses `data-rosey-attrs-explicit`, or is deliberately and knowingly skipped
- [ ] Pages falling back to a site-wide description share one `page_description` key rather than repeating the same sentence per page
- [ ] No page renders two `<title>` tags (check if you suppressed an SEO component's version to emit your own)
- [ ] `.cloudcannon/postbuild` (or CI hook) runs the full Rosey pipeline, with no `set -e` or other shell options
- [ ] `write-locales --dest` generates the locale manifest at `{build_dir}/_rcc/locales.json`
- [ ] The fix script runs after `rosey build` if the layout emits a canonical or `og:url`, or the site has a sitemap; a `/{locale}/` page's canonical is the locale URL
- [ ] Internal links are root-relative (`/about/`), so Rosey can localize them
- [ ] `rosey/base.json` generates with correct keys, passes the 6a assertions, and is **committed** as the baseline
- [ ] A translated page has been opened and read — not just `/`
- [ ] **(split-by-directory)** Every content query is scoped to one locale
- [ ] **(RCC layer)** RCC imported conditionally in the root layout (`window?.inEditorMode`), from `/_rcc/client.mjs` unless the framework bundles the script
- [ ] **(RCC layer)** `install-client` runs in the postbuild before the `mv`
- [ ] **(RCC layer)** `data-rcc` boundary set if nav/footer need translation
- [ ] **(RCC layer)** `cloudcannon.config.yml` has `data_config` entries for each locale (`locales_{code}`)
- [ ] **(RCC layer)** An edit made in the Visual Editor survives a reload

---
