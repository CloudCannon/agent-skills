# Hugo-Specific Patterns

Framework-specific implementation details for making a Hugo site multilingual. Read alongside [`setup.md`](../setup.md) and [`tagging.md`](../tagging.md). **Choose a setup (below) before Phase 2**: on Hugo the choice decides whether the rest of `setup.md` applies at all.

| File                                             | Covers                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| **overview.md** (this file)                      | Choosing a setup, rules every setup shares, setup C (Rosey only) in full   |
| [native-multilingual.md](native-multilingual.md) | Setup A: Hugo languages and `i18n` tables, no Rosey                        |
| [hybrid.md](hybrid.md)                           | Setup B: Hugo languages for page content, Rosey and the RCC for UI strings |

## Choose a setup

A site has two kinds of translatable text, decided separately:

| Text                                         | Hugo native                                                              | Rosey + RCC                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Page content** (body, front matter)        | A content directory per language. `/fr/x/` is an ordinary, editable page | A key per field, edited inline (Rosey has no per-file body editing) |
| **UI strings** (nav, buttons, template text) | `i18n/*.yaml` tables and per-language menus, edited in a form            | `data-rosey` keys, edited inline, with stale-translation detection  |

That gives three setups:

| Setup                       | Page content   | UI strings    | Use when                                                                                   |
| --------------------------- | -------------- | ------------- | ------------------------------------------------------------------------------------------ |
| **A. Native only**          | Hugo languages | `i18n` tables | The site is already on Hugo multilingual, or a theme or module owns the layouts            |
| **B. Hybrid**               | Hugo languages | Rosey + RCC   | The site owns its layouts **and** the user wants body content translated as separate files |
| **C. Rosey only** (default) | Rosey keys     | Rosey + RCC   | The site owns its layouts. The same workflow as on any SSG                                 |

**MUST ask, in this order:**

1. **Is the site already on Hugo multilingual** (two or more entries under `languages`, `content/<lang>/` directories or `post.fr.md` files)? → **A**. Offer B only if they want UI strings edited inline. A `languages` block with only the default language doesn't count: many themes ship one.
2. **Who owns the layouts?** A theme or module → **A**. Warn that B or C means overriding the theme's layouts to tag them.
3. Otherwise → **C**.
4. Offer **B** only if they ask for body content translated per language as separate files, and say what it costs (below).

**Why this order:** A keeps a working Hugo multilingual site intact and needs at most a few small theme overrides to close Hugo's gaps; tagging theme-owned layouts for Rosey means copying and maintaining most of them. C needs no Hugo-specific rules beyond this file. B works, but each rule in [hybrid.md](hybrid.md) exists because Hugo and Rosey both build `/fr/` pages and disagree.

| You give up                           | A                                                                                                        | B                                                                                                                                            | C                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Inline editing of UI strings          | Yes                                                                                                      | No                                                                                                                                           | No                      |
| Body content as one file per language | No                                                                                                       | No                                                                                                                                           | Yes — a key per element |
| Hugo-specific setup work              | Template fixes for Hugo's gaps (search, `data/`, dates, links, `hreflang`), some of them theme overrides | A two-step Rosey generate, no `{{ i18n }}`, a content-key gate, and the home and section pages translated as whole files (no inline editing) | The rules in this file  |

Record the choice. **A** leaves the Rosey workflow: follow [native-multilingual.md](native-multilingual.md) instead of `setup.md`. Tell the user that in A, components on `/fr/` pages re-render in the default language in the Visual Editor ([native-multilingual.md § 6](native-multilingual.md#the-visual-editor-renders-components-in-the-default-language)). **B** and **C** follow `setup.md`, with the rules below; B adds [hybrid.md](hybrid.md).

## Rules for B and C

### Root derivation

**MUST derive `data-rosey-root` from `.Path`:**

```go-html-template
{{- $root := .Path | strings.TrimPrefix "/" | default "index" -}}
<main data-rosey-root="{{ $root }}">{{ block "main" . }}{{ end }}</main>
```

**Why:** `.Path` is Hugo's logical path. It exists on every page kind (404, taxonomy and term pages have no `.File`), it is the same on every paginator page (`/blog/page/2/` → `blog`), each taxonomy term gets its own root (`categories/marketing`), and it carries no language prefix (`/fr/about/` → `about`), so Phase 8 step 5 holds with no override.

| Expression      | Fails on                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.File.Path`    | Fails the build on 404 and taxonomy pages (`File is nil`). With a `with .File` guard, every term page and the 404 collapse onto one `index` root, so different strings share one key |
| `.RelPermalink` | Includes the language prefix (`fr/about`) in B. It does **not** duplicate keys on paginator pages: on `/blog/page/2/`, `.RelPermalink` is `/blog/`                                   |

**Common miss:** many Hugo layouts have no `<main>`. Add one in `baseof.html` around `{{ block "main" . }}`, or the root has nowhere to go. Keep explicit roots on shared chrome inside `<main>` (pagination, category chips) — [§3d](../tagging.md#shared-chrome-inside-main-needs-its-own-root), [§3i](../tagging.md#3i-taxonomy-labels-tags-categories).

### Content-block namespacing

**MUST put `data-rosey-ns` on each block's own root element, from its `_uuid`**, in the block partial — not on the `range` in the page template ([§3g](../tagging.md#3g-namespacing-arrays-and-page-builder-blocks)):

```go-html-template
{{/* layouts/partials/hero.html */}}
<section class="hero"{{ with ._uuid }} data-rosey-ns="{{ . }}"{{ end }}>
  <h1 data-rosey="heading" data-editable="text" data-prop="heading">{{ .heading }}</h1>
</section>
```

**Nested arrays whose items carry text** (FAQ items, pricing features) must follow the same rule: render each item through its own partial, registered as a component on the array-item host, and put `data-rosey-ns` on that partial's root:

```go-html-template
{{/* in the block partial */}}
<div data-editable="array" data-prop="faqs">
  {{ range .faqs }}
    <div data-editable="array-item" data-component="faq-item">{{ partial "faq-item.html" . }}</div>
  {{ end }}
</div>
```

```go-html-template
{{/* layouts/partials/faq-item.html */}}
<details{{ with ._uuid }} data-rosey-ns="{{ . }}"{{ end }}>
  <summary data-editable="text" data-prop="question" data-rosey="question">{{ .question }}</summary>
</details>
```

**Why:** an item rendered inline in the `range` isn't re-rendered when an editor adds one — CloudCannon clones its markup, `data-rosey-ns` included, so the new item shares the original's keys until the next build. A component re-renders with the new item's own `_uuid`. `data-component` is the partial's path, with no registration step, and the wrapper changes the layout context — see [`cloudcannon-visual-editing/hugo`](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md#component-names-are-partial-paths).

Seed `_uuid` into existing content first, nested items included ([§3g](../tagging.md#seeding-_uuid-into-existing-content-rcc-layer)), and give every structure value, at every level, an empty `_uuid:`. Most nested items have no `_name` to anchor on, so a seeder that anchors on the discriminator misses them; anchor on every mapping inside an array that renders text. Edit line by line, and skip lines inside multi-line strings.

### Links must be root-relative

**MUST build internal links with `.RelPermalink` or `relURL`, not `.Permalink` or `absURL`.**

**Why:** Rosey only rewrites hrefs that start with `/` ([Phase 4](../setup.md#phase-4-make-the-site-rosey-ready-the-pipeline)). With a real `baseURL`, `.Permalink` and `absURL` produce `https://example.com/tags/seo`, which stays pointing at English on every `/fr/` page.

```diff
- <a href="{{ print (absURL "tags/") (urlize .) }}">
+ <a href="{{ print ("tags/" | relURL) (urlize .) "/" }}">
```

`.Permalink | relURL` is already root-relative. Links in `<head>` (canonical, `og:url`) are fixed by the postbuild script instead (Phase 4).

### Head

- **Tag `<title>` and the meta description in `baseof.html` or the head partial** with keys built from the root: `data-rosey="{{ $root }}:page_title"`. Taxonomy term pages get distinct keys for free, because `.Path` differs per term. Keying the head in the layout is right for C, which has no split-by-directory pages ([§3h](../tagging.md#which-pages-need-head-keys)); B gates it per page ([hybrid.md](hybrid.md#content-keys-only-on-pages-with-no-translated-file)).
- **The head almost always emits a canonical, and often `og:url`** (Hugo's embedded `opengraph.html` does). Add the Phase 4 fix script, or every `/fr/` page declares the English URL canonical.
- **`og:title`, `og:description` and the Twitter equivalents** are copied verbatim too. Tag them with `data-rosey-attrs-explicit`. Reuse the `<title>` or description key only when the text is identical (often `og:description` is); otherwise give them their own (`{{ $root }}:og_title`) — one key with two different originals keeps one of them silently.
- **Hugo's embedded templates** (`opengraph.html`, `twitter_cards.html`, `schema.html`) can't carry `data-rosey`. Copy the one you need into `layouts/partials/` and tag the copy, or accept that its text stays in English.

### Markdown fields and `data-type`

Render rich text regions as [`cloudcannon-visual-editing/hugo`](../../cloudcannon-visual-editing/hugo/visual-editing-reference.md) says: `markdownify`, with `data-type="block"` on a block host. Put `data-rosey` on the region element ([§3c](../tagging.md#3c-add-data-rosey-to-translatable-elements)). The page body (`.Content`) is a `block` region too.

**Check one thing in the Visual Editor:** `markdownify` drops the `<p>` when a field holds a single paragraph, so Rosey captures `Hello <strong>world</strong>` from a `block` region. If the RCC then shows that region as permanently out of date ([§3c](../tagging.md#markdown-regions-need-a-matching-data-type-and-a-rich-bound-input-rcc-layer)), render the field in block mode, which always keeps the `<p>`:

```go-html-template
{{ page.RenderString (dict "display" "block") .description }}
```

Inline `RenderString` behaves exactly like `markdownify`, so it's no fix. In a block partial call `page.RenderString`, because `.` is the block's data. Block mode adds a `<p>` to single-paragraph fields, so check the English styling after switching. Block mode renders and edits correctly in the Visual Editor, and its regions don't stay out of date in the RCC (apart from [curly quotes](../troubleshooting.md#an-entry-stays-out-of-date-over-a-curly-quote)).

### Alt text through an image partial

Most Hugo sites render images through one partial, so give it an optional key parameter rather than tagging each call:

```go-html-template
{{/* in the image partial */}}
<img src="{{ $src }}" alt="{{ .alt }}"
  {{- with .rosey_alt }} data-rosey-attrs-explicit='{"alt":"{{ . }}"}'{{ end }}>
```

Callers pass `"rosey_alt" "hero_image_alt"` where the alt is translatable; logos and brand images pass nothing.

### RCC import

Hugo doesn't bundle browser JavaScript, so use the `/_rcc/client.mjs` form from [Phase 5a](../setup.md#5a-import-the-rcc-in-the-root-layout), in `baseof.html`, with `install-client` in the postbuild.

### Hugo 0.166 template notes

| Need                             | Use                                | Not                                                                 |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| The default language's code      | `hugo.Sites.Default.Language.Lang` | `site.DefaultContentLanguage` (no longer resolves)                  |
| A language's display name        | `label` in `[languages.fr]`        | `languageName` (deprecated since 0.158)                             |
| A content directory per language | `contentDir` per language          | Module mounts with `lang` / `excludeFiles` (deprecated since 0.153) |

## Setup C: Rosey only

C is `setup.md` as written, plus the rules above. There are no Hugo languages: Hugo builds one English site and `rosey build` makes every `/fr/` page.

| Phase | Hugo specifics                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | The output directory is `publishDir` (default `public/`). Confirm there is no `languages` block — if there is, go back to [Choose a setup](#choose-a-setup)                                |
| 2     | `npx rosey-cloudcannon-connector init --yes --locales fr --build-dir public`                                                                                                               |
| 3     | [Root derivation](#root-derivation); `<html lang="en">`; nav and footer usually render `data/` files, so tag them with content-as-key ([§3g](../tagging.md#choosing-a-namespace-strategy)) |
| 4     | Add the fix script line, after `rosey build`                                                                                                                                               |
| 5     | [RCC import](#rcc-import); `data-rcc` around header, `<main>` and footer in `baseof.html`                                                                                                  |
| 8     | Not used. Body content is keyed like everything else; if the user wants it as separate files per language, that is setup B                                                                 |
| 9     | [Locale picker](#visitor-facing-locale-picker)                                                                                                                                             |

**Rosey-generated pages render the template once, in English.** So anything Hugo formats at render time stays English on `/fr/`: dates (`March 7, 2022`), reading time, `humanize`d labels. Key the words (`minutes`). Key each whole formatted date by its ISO date, so each language can order day, month and year its own way (`6 mai 2025`, `6. Mai 2025`); keying only the month name gives `mai 6, 2025`:

```go-html-template
<time datetime="{{ .Date.Format "2006-01-02" }}">
  <span data-rosey-root="dates" data-rosey="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "January 2, 2006" }}</span>
</time>
```

### Listings show other pages' keys

**MUST give each item in a listing a `data-rosey-root` from that item's `.Path`.** Then a post's title in the blog list, on page 2, on a tag page and in "Recent posts" is the post's own key, translated once.

```go-html-template
{{ range .Paginator.Pages }}
  <article data-rosey-root="{{ strings.TrimPrefix "/" .Path }}">
    <a href="{{ .RelPermalink }}" data-rosey="title">{{ .Title }}</a>
  </article>
{{ end }}
```

**Why:** inside `<main>` the listing page's root is in scope, so without it each listing mints its own key per post (`tags/seo:title`, `blog:title`…), and translators translate every title several times.

Use the same leaf key the post page uses for its heading **only when both render the same field**. If the post heading comes from `post_hero.heading` and the listing from `.Title`, they can drift apart in the editor, and one key with two different originals keeps one silently. Give the listing its own leaf key (`list_title`) then.

### Taxonomies

Each term page gets its own root from `.Path`, so `categories/marketing:title` is one key across all its paginator pages. Tag term labels through one helper, with a `data-rosey-root` on the chip container ([§3i](../tagging.md#3i-taxonomy-labels-tags-categories)). Don't name that root `tags`: it would share a namespace with the `/tags/` page's own root.

```go-html-template
<div data-rosey-root="tag-labels">
  {{ range .Params.tags }}
    <a href="{{ print ("tags/" | relURL) (urlize .) "/" }}" data-rosey="{{ urlize . }}">{{ humanize . }}</a>
  {{ end }}
</div>
```

`/fr/tags/seo/` is a Rosey copy of `/tags/seo/`, so it lists the same posts, with their titles translated through their own keys.

**Render term pages' headings and titles through the same helper** as the chips. Hugo's own term title (`.Title`, "Seo") is a different string from the chip label ("SEO"), so using it mints a second key per term.

## Visitor-Facing Locale Picker

Build each locale's link from the page's **default-language** URL. Rosey's copy and (in B) Hugo's own French page both sit at `/{locale}` + that URL, because slugs come from the filename (Phase 8 step 3).

List the locales once, in the site config:

```yaml
# hugo.yaml
params:
  locales:
    - code: en
      label: English
    - code: fr
      label: Français
```

```go-html-template
{{/* layouts/partials/locale-picker.html — default language at root */}}
{{- $base := .RelPermalink -}}
{{- range .AllTranslations -}}
  {{- if eq .Language.Lang hugo.Sites.Default.Language.Lang }}{{ $base = .RelPermalink }}{{ end -}}
{{- end -}}
<nav aria-label="Language" data-locale-picker>
  {{- range site.Params.locales }}
    {{- $href := cond (eq .code "en") $base (print "/" .code $base) }}
    <a href="{{ $href }}" hreflang="{{ .code }}" data-rosey-ignore>{{ .label }}</a>
  {{- end }}
</nav>
```

- **`data-rosey-ignore` on every `<a>`** — otherwise Rosey prefixes the English link on `/fr/` pages, and it points back at French.
- In C, `.AllTranslations` holds only the page itself, so `$base` is the page's own URL. In B it finds the English page from a Hugo-built French page.
- **All languages prefixed:** prefix the default language too (`print "/" .code $base` for every locale).
- Replace `"en"` with your default language code.
- **Paginated pages:** on `/blog/page/2/`, `.RelPermalink` is the listing's URL, so the picker links to page 1 of the other language. Acceptable for most sites; fix it in the client-side script below if not.
- **If the nav is an editable component** that CloudCannon re-renders, guard the call: `{{ if not site.Params.ENV_CLIENT }}{{ partial "locale-picker.html" page }}{{ end }}`. Pass `page`, because the component's context is its data.

Add the Phase 9 client-side script, which highlights the active locale and hides the picker in the Visual Editor. It selects the picker by `data-locale-picker`, so the `aria-label` can be translated with `data-rosey-attrs-explicit`:

```html
<script>
  if (window.inEditorMode) {
    document.querySelectorAll("nav[data-locale-picker]").forEach(function (nav) {
      nav.style.display = "none";
    });
  } else {
    document.querySelectorAll("nav[data-locale-picker] a").forEach(function (link) {
      link.classList.toggle("active", link.pathname === window.location.pathname);
    });
  }
</script>
```

## Gotchas

- **Root from `.Path`.** `.File.Path` fails or collapses on pages with no file; `.RelPermalink` carries the language prefix in B.
- **Absolute links stay English.** Rosey skips hrefs that don't start with `/`; use `.RelPermalink` and `relURL`.
- **No `<main>`** in many Hugo layouts. Add one in `baseof.html`.
- **Render-time formatting stays English** on Rosey-generated pages: dates, `humanize`, reading time.
- **Listing items need their own root** from `.Path`, or every listing re-keys every post title.
- **`markdownify` drops `<p>`** from a single paragraph; check in the Visual Editor that such a `block` region isn't permanently out of date.
- **Local re-runs need a clean output folder.** Hugo doesn't empty `public/`, so the last postbuild's `/fr/` pages survive the next `hugo` build, and Rosey treats them as Hugo-built locale pages and stops updating them. Build with `--cleanDestinationDir` (CloudCannon builds start clean).
- **The canonical points at English** on every Rosey-generated page until the Phase 4 fix script runs.
- **Embedded templates** (`opengraph.html` and friends) can't be tagged. Copy them into `layouts/` first.
- **The system Hugo may be too old.** Sites using `hugo.Data` or `hugo.Sites` need a recent Hugo; check the version before blaming a template.
