# Setup A: Hugo native multilingual

Hugo languages for page content, `i18n` tables for UI strings, no Rosey. Choose it with [overview.md § Choose a setup](overview.md#choose-a-setup) first. **This file replaces `setup.md` for setup A:** there is no tagging, no Rosey pipeline and no RCC.

**What you give up:** inline editing of UI strings, and Rosey's stale-translation detection. UI strings are edited as `i18n` tables in a form, and nothing flags a translation whose English has changed.

**Theme overrides:** A avoids overriding every layout to tag it, but closing Hugo's gaps (step 4) on a theme site can still need a few small overrides: search, list-page dates, hardcoded labels. **List each one for the user and let them choose per gap.** Each override is a file to diff against the theme on every theme update; leaving a gap means that text stays in English.

## 1. Audit

- **Config:** `languages`, `defaultContentLanguage`, `defaultContentLanguageInSubdir`, and any per-language `contentDir`, `title` or `params`.
- **Content layout:** a directory per language (`content/en/`, `content_fr/`), or filename suffixes (`about.fr.md`). Suffix files need moving first ([step 2](#2-one-content-directory-per-language)).
- **UI strings:** the site's `i18n/` and the theme's. A module's `i18n/` lives in Hugo's module cache, not Go's; find it with `hugo config mounts`.
- **Menus:** in page front matter (`menu: main`) or in the config. A front-matter menu entry exists only in languages where that page exists.
- **Every template that reads `data/` or a link field**, and every date it formats — they feed step 4. Note which are the site's and which are the theme's.

## 2. One content directory per language

**MUST give each language its own content directory.** Keep the default language where it is and add a sibling per language:

```yaml
defaultContentLanguage: en
defaultContentLanguageInSubdir: false
languages:
  en:
    label: English
    weight: 1
    contentDir: content
  fr:
    label: Français
    weight: 2
    contentDir: content_fr
    title: Mon site # per-language title and params override the root ones
```

**Why:** `content_fr/blog/post.md` pairs with `content/blog/post.md` by path, which is what `translate-site` and CloudCannon collections expect. English collection paths don't change. A site already on `content/en/` + `content/fr/` keeps that layout.

| Layout                          | Use when                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `content/` + `content_fr/`      | **Default** for a new multilingual site                                                                                                                                                                                                          |
| `content/en/` + `content/fr/`   | The site already uses it. Otherwise it moves every English file and changes every collection path                                                                                                                                                |
| `content/fr/` mounted as French | Only if the user insists on nesting French inside `content/`. It needs `files = ['! fr/**']` on the English mount, and the same exclusion in every CloudCannon glob — without it the build passes and the French files also become English pages |

**Filename suffixes** (`post.fr.md`, `index.fr.md` in a bundle): move each into the language's directory at the same path, without the suffix — `content/blog/post.fr.md` → `content_fr/blog/post.md`. A bundle's French `index.fr.md` becomes `content_fr/blog/post/index.md`. Build before and after, and compare the `/fr/` file lists.

**Bundle images can stay in the English bundle.** Hugo shares a bundle's resources across languages, so a translated bundle needs only its `.md` file. The French page shows the English bundle's images until someone adds an image of the same name to the French bundle (step 6 points French uploads there); tell editors so.

**MUST NOT translate `slug` or `url` in the French front matter.** Every language's copy keeps one URL path (`/fr/blog/post/`), which the language switcher, `hreflang` and `translate-site` rely on.

## 3. Decide what an untranslated page does

**Ask the user.** Hugo builds nothing for a page with no translation: no fallback, no warning. The page is simply missing in that language, and the theme's language switcher (if it has one) greys the language out.

| Policy                                    | How                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing until translated (Hugo's default) | Nothing to do. Links to the page from translated pages need the English fallback in step 4                                                               |
| Every page exists in every language       | Copy each English `.md` file into the language directory, then translate the copies with [`translate-site`](../../translate-site/content-directories.md) |

**Watch for empty section pages.** Hugo creates `/de/docs/` when a German page sits deeper in `docs/`, titled from the folder name, with no body and no child list. Give the section a real `_index.md` in that language, or don't translate pages under it.

## 4. Close Hugo's gaps

Hugo scopes page lists, sections, taxonomies, RSS, sitemaps, `<html lang>`, the `<title>` and front-matter menus to the language automatically. These it doesn't — check each one:

| Gap                                                               | Symptom on `/fr/`                               | Fix                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Link fields** (buttons, footer links)                           | Point at English pages                          | [Resolve through `site.GetPage`](#link-fields)                                                                                                                                                        |
| **`data/` files**                                                 | Footer and other data-driven text stays English | [Key the file by language](#data-files)                                                                                                                                                               |
| **Dates**                                                         | `Tuesday, September 01, 2026`                   | [`time.Format` with a `:date_*` token](#dates)                                                                                                                                                        |
| **`hreflang`**                                                    | Only in the sitemaps                            | [Add it to the head](#hreflang)                                                                                                                                                                       |
| **Search index**                                                  | French searches return English results          | [One index per language](#search)                                                                                                                                                                     |
| **Taxonomy term titles**                                          | English                                         | `content_fr/tags/<term>/_index.md` with a French `title`. Term pages exist in every language automatically, so the step 3 policy doesn't create these; add one per term that needs a translated title |
| **Site `params` text** (headings, descriptions set in the config) | English                                         | Per-language `params` under `languages.fr`; Hugo merges them over the root `params`                                                                                                                   |
| **Text hardcoded in theme layouts** (404 body, "Tags:" labels)    | English                                         | Override the layout and use `i18n` — a theme override, so ask first                                                                                                                                   |

### Link fields

`relURL` never adds a language prefix, and `relLangURL` sends a partially translated language to pages that don't exist. Resolve the page instead:

```go-html-template
{{- $href := .url | relURL -}}
{{- with and .url (not (urls.Parse .url).IsAbs) (site.GetPage .url) }}{{ $href = .RelPermalink }}{{ end -}}
<a href="{{ $href }}">…</a>
```

`site.GetPage` looks in the current language, so a French page links to `/fr/docs/` when it exists and to `/docs/` when it doesn't. Leave image paths alone: they must not get a language prefix.

**Markdown links need nothing.** Hugo's embedded link render hook localizes root-relative links in content (`/community/` → `/fr/community/`) on a multilingual site. A relative link to a page missing in that language is left as-is and 404s silently.

### `data/` files

Hugo has no per-language `data/`. Key the file by language, and read it through one helper that falls back to the default language:

```yaml
# data/footer.yaml
en:
  copyright_authors: The Site Authors
fr:
  copyright_authors: Les auteurs du site
```

```go-html-template
{{/* layouts/partials/lang-data.html — call: {{ $d := partial "lang-data.html" "footer" }} */}}
{{- $all := index hugo.Data . | default dict -}}
{{- $key := site.Language.Lang -}}
{{- $data := index $all $key -}}
{{- if not $data -}}
  {{- $key = hugo.Sites.Default.Language.Lang -}}
  {{- $data = index $all $key | default dict -}}
{{- end -}}
{{- return (dict "data" $data "prop" (printf "@data[%s].%s" . $key)) -}}
```

```go-html-template
{{ $d := partial "lang-data.html" "footer" }}
<span data-editable="text" data-prop="{{ $d.prop }}.copyright_authors">{{ $d.data.copyright_authors }}</span>
```

- **MUST point editable regions at the language's section** (`$d.prop`, giving `@data[footer].fr.copyright_authors`). A prop left as `@data[footer].copyright_authors` no longer exists after keying. Keep these regions outside components ([step 6](#the-visual-editor-renders-components-in-the-default-language)).
- URLs and icons are duplicated in each language's section. A flat file can keep them at the top level, next to the language keys, and move only the text into the language sections. A **list** that mixes text with URLs and icons (footer links) has to be copied whole into each language, so editors add a link once per language — tell them so.
- Give each language key an `object` input in the file's `file_config` (step 6), so editors see "English" / "Français" sections.
- For one or two strings, moving them into `i18n` is simpler than keying the file.

### Dates

**Use `time.Format` with a `:date_*` token, not `.Date.Format "…"`.** Go layout strings print English month and day names; `time.Format ":date_full" .Date` prints `mardi 1 septembre 2026` on `/fr/`.

- The token changes the default language's output too (`:date_long` gives `September 1, 2026`). Pick the token whose English output the user accepts.
- **A date-format site param doesn't take a token** when the theme passes it to `.Date.Format`: `:date_long` prints literally. Dates in theme-owned templates (list pages, last-modified lines) stay English without a layout override.
- **Fix every date template or none.** Changing only the site-owned ones leaves two formats side by side: the post says `September 1`, the list `September 01`, and `/fr/blog/` mixes French and English dates. If the user declines the theme overrides, say that the dates will be mixed, and let them choose.

### `hreflang`

```go-html-template
{{ if .IsTranslated }}
  {{ range .AllTranslations }}
    <link rel="alternate" hreflang="{{ .Language.Lang }}" href="{{ .Permalink }}">
    {{ if eq .Language.Lang hugo.Sites.Default.Language.Lang }}
      <link rel="alternate" hreflang="x-default" href="{{ .Permalink }}">
    {{ end }}
  {{ end }}
{{ end }}
```

Put it in the theme's head hook if it has one (Docsy: `layouts/partials/hooks/head-end.html`), so no theme layout is overridden.

### Search

Check how the theme builds its index. If it ranges over `hugo.Sites` or every language's pages, French search returns English results.

**Fix: one index per language, from `site.Pages`, written under a per-language name.** The output name must differ per language — Hugo caches a `resources.ExecuteAsTemplate` result by its target name, so overriding only the index template still gives every language the first language's index:

```go-html-template
{{ $index := resources.Get "json/offline-search-index.json"
  | resources.ExecuteAsTemplate (printf "offline-search-index.%s.json" site.Language.Lang) . }}
```

On Docsy that means overriding the index template (`assets/json/offline-search-index.json`) and the partial that names it (`search-input.html`, as `layouts/partials/search-input.html` in the site): a theme override, so ask first.

**Common miss:** files copied out of Hugo's module cache are read-only. `chmod u+w` them before editing, and note the theme version in a comment at the top so the next theme update can diff them.

## 5. UI strings

- **Copy the theme keys editors should be able to change** into the site's `i18n/<lang>.yaml`, one file per language. Editors can only edit keys that exist in the site's files. A theme can ship dozens of keys; copy the ones whose English text actually appears on the built site (search `public/` for each key's English value), not the whole file. The site's file overrides the theme's key by key, so a copied key no longer picks up theme updates to its wording.
- **Also copy every key a partial re-rendered in the Visual Editor uses.** The editor bundles only the project's `i18n/`, not a module's — see [`cloudcannon-visual-editing/hugo`](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md).
- **Translate `i18n/fr.yaml` directly**: translate the values, keep the keys. Start from the theme's own `fr.yaml` if it ships one.

## 6. CloudCannon

Follow [`cloudcannon-configuration`](../../cloudcannon-configuration/SKILL.md) for the config itself. The multilingual parts:

```yaml
collections_config:
  blog_fr:
    name: Blog (Français)
    path: content_fr/blog
    url: /fr/blog/[full_slug]/
    schemas:
      default:
        path: .cloudcannon/schemas/post.md # reuse the English schema
        new_preview_url: /fr/blog/my-post/ # a French page
    _editables:
      content:
        paths:
          uploads: content_fr/blog/[relative_base_path] # not the English bundle
  ui_strings:
    name: UI strings
    path: i18n
    glob: ["*.yaml"]
    disable_url: true
    disable_add: true
    disable_file_actions: true
collection_groups:
  - heading: English
    collections: [pages, blog]
  - heading: Français
    collections: [pages_fr, blog_fr]
  - heading: Site data
    collections: [data, ui_strings]
file_config:
  - glob: i18n/*.yaml
    _inputs:
      ui_read_more: { type: text, label: Read more link }
  - glob: data/footer.yaml
    _inputs:
      en: { type: object, label: English }
      fr: { type: object, label: Français }
```

- **One collection per language per content collection.** Copy the English collection, then change every value that names a path or a page: `path`, `url`, any glob exclusions, schema `new_preview_url`, and upload paths.
- **`i18n/` edits show after the next build, not live.** The Visual Editor bundles `i18n/` at build time. Label each key in `file_config`; raw keys like `ui_in` mean nothing to editors.
- **Nothing links a translation to its source.** Creating a translation means adding a file at the same path in the language's collection; tell editors so, for example in the dashboard README.

### The Visual Editor renders components in the default language

On a `/fr/` page, the Visual Editor re-renders every component (page-builder blocks, `editable-component`) with its in-browser Hugo as soon as the page opens, and that render runs as the default language. Inside a re-rendered component:

- `T` returns the default language's strings, and link fields resolved through `site.GetPage` lose `/fr/`. The built site is correct; only the editor preview shows English. Tell editors.
- `site.Language.Lang` is the default language, so `lang-data.html` points the component's regions at `@data[<file>].en`. **An edit there saves into the English section.**

Content fields aren't affected: their values come from the French file. Text regions outside components aren't re-rendered, so they keep the language from the build.

**MUST NOT put language-keyed data regions inside a component.** Render data text from the layout, outside components (as with a footer), or render it in the component without editable regions and have editors change it in the data collection.

## 7. Verify

Read built pages, not the source.

- [ ] `public/fr/` has the pages the step 3 policy says it should
- [ ] No empty auto-created section page (`/fr/docs/` with only a title)
- [ ] A French page's link fields point at `/fr/` pages, or at English where no French page exists
- [ ] Dates, footer text and term titles are French on `/fr/`, or the user agreed to leave them
- [ ] Editable regions on data text carry the language's prop (`@data[footer].fr.…`), and none sit inside a component
- [ ] `hreflang` alternates, with `x-default`, in the head of a page with translations
- [ ] A French search returns only French results
- [ ] No `slug` or `url` differs between a page and its translation
- [ ] **(manual, in CloudCannon)** A `/fr/` page opens in the Visual Editor, and an edit survives a reload
- [ ] **(manual, in CloudCannon)** Editing data text on a French page changes the `fr:` section, not `en:`
- [ ] **(manual, in CloudCannon)** An `i18n` string edited in the data collection shows after a rebuild
