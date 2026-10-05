# Setup B: Hugo languages + Rosey

Hugo languages build translated page content; Rosey and the RCC translate UI strings and fill in every page Hugo didn't translate. Choose it with [overview.md § Choose a setup](overview.md#choose-a-setup) first, and apply [overview.md § Rules for B and C](overview.md#rules-for-b-and-c) as well.

This is `setup.md` with Phase 8 (split-by-directory) done the Hugo way. Every rule below exists because Hugo and Rosey both build `/fr/` pages.

**Tested:** default language at root. All-languages-prefixed routing also works, but the Phase 4 fix script doesn't cover that mode.

## How the two builds meet

| `/fr/` page                                            | Built by                      | Body          | UI strings                                |
| ------------------------------------------------------ | ----------------------------- | ------------- | ----------------------------------------- |
| Has a file in `content_fr/`                            | Hugo, then processed by Rosey | Hugo's French | Rosey keys                                |
| No file in `content_fr/`                               | Rosey, copied from English    | Rosey keys    | Rosey keys                                |
| A list page Hugo builds anyway (home, sections, terms) | Hugo, with no content         | **Empty**     | Rosey keys — Rosey won't replace the page |

Rosey rewrites links, `<html lang>` and `hreflang` on both kinds of page. It doesn't touch the canonical, `og:url` or sitemaps on either.

Two consequences to tell the user:

- **Every English page without a French file is published at `/fr/`** as a Rosey copy: UI in French, body in English until someone translates its keys. An English-only post is therefore live at `/fr/blog/<post>/` in English.
- **A category used only by English posts** has no Hugo-built French page, so `/fr/categories/<term>/` is a Rosey copy listing English posts, while categories French posts use list only French ones.

## Rules

### Hugo config

**MUST keep `defaultContentLanguageInSubdir = false`.** Hugo builds the default language at the root; Rosey's `--default-language-at-root` flag alone chooses the URL mode.

**Why:** with `true`, Rosey treats Hugo's `en/` as a content folder. It writes `/en/en/` and `/fr/en/` trees, and never generates some `/fr/` pages the French nav links to.

```toml
defaultContentLanguage = 'en'
defaultContentLanguageInSubdir = false
disableDefaultLanguageRedirect = true

[languages.en]
  label = 'English'
  weight = 1
  contentDir = 'content'
[languages.fr]
  label = 'Français'
  weight = 2
  contentDir = 'content_fr'
```

`disableDefaultLanguageRedirect` stops Hugo writing an `/en/` redirect page, which Rosey would copy to `/fr/en/`. For the content directory layout, see [native-multilingual.md § 2](native-multilingual.md#2-one-content-directory-per-language).

### A real `_index.md` for every French list page

**MUST add `content_fr/_index.md` and a `content_fr/<section>/_index.md` for every section.**

**Why:** once French is a Hugo language, Hugo builds `/fr/` and `/fr/blog/` even with no content file: the home page renders an empty `<main>`, and sections get a title from the folder name ("Blogs"). Rosey never replaces a page that already exists, so these stay empty in production.

**Tell the user what this costs:** the home page and every section page become file-translated pages. They're translated as whole files (the home page's page-builder blocks included), edited in the French collection, and get no inline RCC editing. Taxonomy and term pages and the 404 are different: Hugo builds them from layouts alone, so they keep their Rosey keys (below).

### Generate from the default language only

**MUST run `rosey generate` on a copy of the output without the locale directories.**

**Why:** `rosey generate` reads Hugo's `/fr/` pages too. French text becomes source strings, and where English and French disagree on a key, Rosey keeps one `original` with no warning. It has no exclude option, and `data-rosey-ignore` on the French `<html>` doesn't stop it. `rosey build` still translates the French pages, because it matches by key.

The postbuild below does this in its first five lines.

### Content keys only on pages with no translated file

**MUST emit content-derived keys (`<title>`, meta description, hero text, post title and body) only on pages with no content file in another language.**

**Why:** a Rosey key with a locale value overwrites Hugo's French text on Hugo-built pages: `À propos` becomes whatever the locale file says. Keys with no value leave it alone, so the bug appears only once someone translates.

Decide it in one helper:

```go-html-template
{{- /* layouts/partials/rosey-content.html — context: a page.
       True when no non-default language has a content file for it. */ -}}
{{- $hasFile := false -}}
{{- range .AllTranslations -}}
  {{- if and .File (ne .Language.Lang hugo.Sites.Default.Language.Lang) }}{{ $hasFile = true }}{{ end -}}
{{- end -}}
{{- return not $hasFile -}}
```

```go-html-template
{{- $roseyContent := partial "rosey-content.html" . -}}
<title{{ if $roseyContent }} data-rosey="{{ $root }}:page_title"{{ end }}>{{ .Title }} | {{ site.Title }}</title>
<h1{{ if $roseyContent }} data-rosey="title"{{ end }}>{{ .Title }}</h1>
```

- **Test for a content file, not `.IsTranslated`.** Hugo builds the 404 and taxonomy and term pages in every language from layouts alone, so they count as translated. With `.IsTranslated` they lose their keys and stay English on `/fr/`.
- **In a component partial whose context is block data, pass `page`:** `partial "rosey-content.html" page`.
- **Expect to touch many attributes.** Every content-derived `data-rosey` in every block partial needs the gate; on a page-builder site that can be dozens.
- **A card linking to another page** (recent posts, a blog listing) passes that page: `partial "rosey-content.html" .` inside the `range`. On a Rosey-generated page, a card for a post with a French file then shows the English title — the card has no key, because the French title lives in the French file. Tell the user.

Shared UI (nav, footer, "minutes", "Recent posts") keeps its keys everywhere. This is Phase 8 step 8.

### `<html lang>` follows the language

**MUST use `<html lang="{{ site.Language.Lang }}">`.** Hugo-built French pages are French before Rosey runs; a literal `lang="en"` mislabels them in any build that skips the postbuild.

### All template UI text through Rosey, no `{{ i18n }}`

**MUST tag every UI string with `data-rosey` and remove `{{ i18n }}` / `{{ T }}` from templates.**

**Why:** Rosey-generated pages render the template once, in English, so an `i18n` string is French only on Hugo-built pages. A Rosey key is French on both, and overrides `i18n` where both are present.

Render-time formatting still differs: Hugo-built pages show `7 mars 2022` from `time.Format ":date_long"`, Rosey-generated ones `March 7, 2022`.

### No `hreflang` from Hugo

**MUST NOT emit `hreflang` alternates from the templates.** Rosey adds a complete set to every page; Hugo's copied tags duplicate them and list only the languages Hugo built.

### Hide the RCC switcher on file-translated pages **(RCC layer)**

**MUST set `data-rcc-exclude` on the snapshot boundary when the page has a content file in another language.** Those pages carry no content keys (above), so the switcher has nothing to switch.

```go-html-template
{{- $locales := slice -}}
{{- range site.Params.locales }}{{ if ne .code hugo.Sites.Default.Language.Lang }}{{ $locales = $locales | append .code }}{{ end }}{{ end -}}
<div data-rcc{{ if not (partial "rosey-content.html" .) }} data-rcc-exclude="{{ delimit $locales "," }}"{{ end }}>
```

`params.locales` is the list the [locale picker](overview.md#visitor-facing-locale-picker) reads. Pages without a translation keep the switcher: their content is keyed. This is Phase 8 step 11.

## Postbuild

`init` writes most of this; replace its first `rosey generate` line with the copy, and add the fix script at the end. Copy [`scripts/fix-rosey-pages.mjs`](../scripts/fix-rosey-pages.mjs) into `.cloudcannon/`.

```bash
#!/usr/bin/env bash

# Generate from the default language only: Hugo's /fr/ pages would add French source strings
rm -rf _rosey_source
cp -R public _rosey_source
rm -rf _rosey_source/fr
npx rosey generate --source _rosey_source
rm -rf _rosey_source

npx rosey-cloudcannon-connector write-locales --source rosey --dest public --locales fr
npx rosey-cloudcannon-connector install-client --dest public

rm -rf _untranslated_site
mv ./public ./_untranslated_site
npx rosey build --source _untranslated_site --dest public --default-language en --default-language-at-root --exclusions "\.(html?)$"

node .cloudcannon/fix-rosey-pages.mjs --source _untranslated_site --dest public --locales fr --pager-segment page
```

- **Remove every locale directory** from `_rosey_source` (`rm -rf _rosey_source/fr _rosey_source/de`).
- **`--pager-segment page`** deletes Rosey's `/fr/blog/page/3/` when Hugo built `/fr/blog/` itself. Rosey builds it from the English listing, so it lists English posts and nothing links to it. Change `page` if the site sets `paginatePath` / `pagination.path`.
- **Don't add `set -e` or other shell options.** CloudCannon sources the postbuild, so they leak into its runner.
- **Add `_rosey_source/` to `.gitignore`**, next to `_untranslated_site/` ([Phase 4](../setup.md#phase-4-make-the-site-rosey-ready-the-pipeline)).

## Phase 8, step by step

| Step                         | On Hugo B                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2. Directories, registered | `contentDir = 'content_fr'` ([Hugo config](#hugo-config)). Seed list pages first ([`_index.md`](#a-real-_indexmd-for-every-french-list-page))                                                                                   |
| 3. Slug from filename        | Don't set a translated `slug` or `url` in French front matter                                                                                                                                                                   |
| 4. Shared rendering          | Already shared: one set of layouts renders both languages                                                                                                                                                                       |
| 5. Root alignment            | Free: `.Path` has no language prefix                                                                                                                                                                                            |
| 6. Scope queries             | **Done by Hugo.** `site.RegularPages`, paginators, terms, RSS and sitemaps are per language                                                                                                                                     |
| 7. Links                     | **Done by Rosey**, on Hugo-built pages too. `relLangURL` keeps `hugo server` previews right and does no harm                                                                                                                    |
| 8. Suppress content keys     | [`rosey-content.html`](#content-keys-only-on-pages-with-no-translated-file)                                                                                                                                                     |
| 9. CloudCannon collections   | `pages_fr` (`content_fr`, `/fr/[full_slug]/`), `blog_fr` (`content_fr/blog`, `/fr/blog/[full_slug]/`), with French `new_preview_url`s. Add them to `collection_groups` if the site has groups. English collections don't change |
| 10. Locale config            | `params.locales` ([locale picker](overview.md#visitor-facing-locale-picker))                                                                                                                                                    |
| 11. Hide the switcher        | [`data-rcc-exclude` on file-translated pages](#hide-the-rcc-switcher-on-file-translated-pages-rcc-layer)                                                                                                                        |

**Hugo's French lists show only French files.** An untranslated English post still gets a Rosey copy at `/fr/blog/<post>/`, but `/fr/blog/` and the French term pages don't list it. Tell the user; if they want every post listed, seed `content_fr/` with copies of the English files and translate them with [`translate-site`](../../translate-site/content-directories.md).

**Translating:** French content files with `translate-site` Part 2, run once on the whole directory (`--source-dir content --locale-dir content_fr`), and the UI strings with Part 1.

## Verify

On top of Phase 6:

- [ ] `rosey/base.json` has no key whose pages include `fr/…`
- [ ] `/fr/` and every `/fr/<section>/` have real content, not Hugo's empty auto-built page
- [ ] A Hugo-built French page keeps its French `<title>` after a locale value is filled in
- [ ] `/fr/404.html` and a French term page have keyed, translatable titles
- [ ] No `{{ i18n }}` or `{{ T }}` left in the layouts
- [ ] One set of `hreflang` links per page
- [ ] No `/fr/en/` directory in the output
- [ ] No `/fr/<listing>/page/N/` that Hugo didn't build; the canonical on `/fr/contact/` is `/fr/contact/`
- [ ] **(manual, in CloudCannon)** A page from `content_fr/` opens in the Visual Editor, with no locale switcher
- [ ] **(manual, in CloudCannon)** The RCC switcher appears on a default-language page with no French file, and an edit made in FR survives a reload
