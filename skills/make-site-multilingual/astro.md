# Astro-Specific Patterns

Framework-specific implementation details for making an Astro site multilingual with Rosey/RCC/CloudCannon. Read alongside the main `SKILL.md` workflow. The last section covers **migrating an Astro site off its existing i18n system** (Appendix A of the main skill).

## Slug Derivation

Use `Astro.url.pathname` directly in the component that renders `<main>`:

```astro
<main data-rosey-root={Astro.url.pathname.replace(/^\/|\/$/g, '') || 'index'}>
```

Works for any page type and avoids threading a slug prop through the layout chain.

## Content-Block Namespacing — put rosey attributes _inside_ the item component

> This implements the core rule from §3g of the main skill. On Astro sites it is the **default** pattern for any array/repeater rendered in a loop — not an edge-case fix.

For CMS page-builder pages using `content_blocks` (or any looped array — testimonials, team members, FAQ entries), use the item's `_uuid` field (populated by CloudCannon's `instance_value: UUID`) as the namespace segment, and place that namespace on **the item component's own root**, not on the `.map()` wrapper in the parent.

### Why the loop wrapper fails

`data-rosey-ns={item._uuid}` is **build-time markup** — it only re-evaluates when the component that emits it re-renders. When an editor **adds or reorders** an array item in CloudCannon, CloudCannon frequently creates the new item by **cloning a sibling's DOM node** rather than re-rendering. If the namespace lives on the loop wrapper, the clone inherits a **stale, duplicated** `data-rosey-ns`: its key collides with the sibling it was cloned from, silently breaking translation of the new item and stale detection until the editor reloads.

### The fix: each array item is its own registered component

Render each item through its own registered component so CloudCannon renders it directly, and put `data-rosey-ns={_uuid}` on that component's root. Put `data-component="<registered-name>"` on the `data-editable="array-item"` element:

```astro
<!-- parent component template -->
<div data-editable="array" data-prop="testimonials">
  {testimonials.map((t) => (
    <div data-editable="array-item" data-component="testimonial-item">
      <TestimonialItem {...t} />
    </div>
  ))}
</div>

<!-- TestimonialItem.astro — registerAstroComponent("testimonial-item", TestimonialItem) -->
<div data-rosey-ns={_uuid}>
  <p data-editable="text" data-prop="message" data-rosey="testimonial:message">{message}</p>
  <!-- …other data-rosey fields, all inside this component… -->
</div>
```

That single `data-component` on the array-item is the whole fix for a uniform sub-array — no `data-component-key`, `data-id-key`, or `<template>` is needed.

The same principle applies to a top-level `content_blocks` loop, where each block is already its own component:

```astro
{blocks.map((block) => (
  <div data-editable="array-item" data-component={block._name}>
    <BlockComponent {...block} />  {/* data-rosey-ns={block._uuid} lives on this component's root */}
  </div>
))}
<!-- key: index:3f43d721-...:heading -->
```

This requires a `_uuid` input in `cloudcannon.config.yml` and `_uuid:` in every structure value — see §3g of the main skill. Existing content files need UUIDs seeded manually. For a working example, see the [Rosey Astro Starter](https://github.com/CloudCannon/rosey-astro-starter) (`Page.astro` and `cloudcannon.config.yml`).

**Fallback (non-CloudCannon):** if `instance_value` isn't available, use `data-rosey-ns={`${block._name}-${i}`}` — but this is fragile, reordering shifts keys, and you lose the clone-safety above.

## Auto-Derive `data-rosey` from `data-prop`

For component-heavy Astro sites where building blocks already use `data-prop` for CloudCannon inline editing, auto-derive `data-rosey` from that attribute:

```astro
---
const { "data-prop": customDataProp, "data-rosey": roseyProp, ...htmlAttributes } = Astro.props;
const effectiveDataProp = customDataProp ?? (editable ? "text" : null);
const effectiveDataRosey = roseyProp === false ? null : (roseyProp ?? effectiveDataProp ?? null);
const roseyAttributes = effectiveDataRosey ? { "data-rosey": effectiveDataRosey } : {};
---
<span class="inner-text" {...textDataAttributes} {...roseyAttributes}>...</span>
```

Key points:

- **Destructure `data-rosey` from props** — prevents it leaking into `...htmlAttributes` and landing on the wrong element
- **`data-rosey={false}` opts out** — use on instances that should not be translated (proper nouns, names)
- **`editable={false}` components** need explicit `data-rosey="key"` since auto-derive depends on `data-prop`

## RTL Language Support

When implementing RTL support (Phase 7 of the main skill) in Astro, add the `dir` detection script at the top of `<head>` in your root layout (e.g. `Layout.astro`):

```astro
<html lang="en">
  <head>
    <script is:inline>
      const rtl = new Set(['ar','he','fa','ur','ps','sd','yi','ku','ckb','dv','ug']);
      const lang = document.documentElement.lang?.split('-')[0];
      if (rtl.has(lang)) document.documentElement.dir = 'rtl';
    </script>
    <meta charset="UTF-8" />
    <!-- ... rest of head -->
  </head>
```

The `is:inline` directive is critical — without it, Astro bundles and defers the script as a module, which runs after paint and causes a flash of LTR content.

## Split-by-Directory for Body Content

When implementing split-by-directory (Phase 8 of the main skill) in Astro:

- Define content collections for each locale in `content.config.ts` with the same schema as the English collection.
- Use a dynamic `[locale]` route: `src/pages/[locale]/blog/[...slug].astro`, with `getStaticPaths` iterating locale codes and fetching from the matching collection.
- Suppress auto-derived `data-rosey` on frontmatter fields with `data-rosey={false}`.
- Use snake_case collection names (`blog_fr`, `blog_de`) — consistent with `data_config` keys like `locales_fr`.
- **All-languages-prefixed mode:** the default language also needs a prefixed route (`/en/blog/...`) and a matching collection URL (Phase 5e), so include the default locale in `getStaticPaths` and give its collection a `/en/` `url` — don't leave the default-language split pages at root.

### Rosey-root alignment for locale pages

Split-by-directory locale pages derive `data-rosey-root` from the URL, which includes the locale prefix (`fr/blog/my-post`). Add a `roseyRoot` prop to the page layout and pass the English-equivalent path (`blog/my-post`):

```astro
<main data-rosey-root={roseyRoot ?? derivedSlug}>
```

## Visitor-Facing Locale Picker

When implementing the locale picker (Phase 9 of the main skill) in Astro:

```astro
---
const localeConfig = { fr: "FR", de: "DE" };
const localeCodes = Object.keys(localeConfig);
const defaultLocale = "en";
// Set to false if you built with all-languages-prefixed mode (no --default-language-at-root):
// then the default language also lives under /en/ and its picker link must be prefixed too.
const defaultLanguageAtRoot = true;
const pathname = Astro.url.pathname;

const segments = pathname.split("/").filter(Boolean);
const isLocalePath = localeCodes.includes(segments[0]) || segments[0] === defaultLocale;
const basePath = isLocalePath
  ? "/" + segments.slice(1).join("/") + (segments.slice(1).length ? "/" : "")
  : pathname;

function buildPath(base, locale) {
  if (locale === defaultLocale && defaultLanguageAtRoot) return base || "/";
  return `/${locale}${base.startsWith("/") ? base : `/${base}`}`;
}
---
<nav aria-label="Language">
  <a href={buildPath(basePath, defaultLocale)} data-rosey-ignore hreflang={defaultLocale}>EN</a>
  {localeCodes.map((code) => (
    <a href={buildPath(basePath, code)} data-rosey-ignore hreflang={code}>
      {localeConfig[code]}
    </a>
  ))}
</nav>
<script>
  // (RCC layer) Hide the nav picker inside the Visual Editor — the RCC injects its
  // own floating locale switcher there. Harmless off CloudCannon: inEditorMode is unset.
  if (window.inEditorMode) {
    document
      .querySelectorAll("nav[aria-label='Language']")
      .forEach((nav) => ((nav as HTMLElement).style.display = "none"));
  } else {
    document.querySelectorAll("nav[aria-label='Language'] a").forEach((link) => {
      const match = link.pathname === window.location.pathname;
      link.classList.toggle("active", match);
    });
  }
</script>
```

---

## Migrating an Astro Site Off Its Existing i18n (Appendix A supplement)

Concrete patterns for replacing Astro's built-in i18n (and/or the official docs recipe) with the Rosey stack. Read alongside Appendix A of the main `SKILL.md`.

> **Third-party packages** (`astro-i18next`, `paraglide`) have their own config, runtime APIs, and removal steps beyond this. This focuses on Astro's built-in `i18n` config and the dictionary/`t()` recipe.

### What Astro built-in i18n actually is

**Routing infrastructure only** — locale-aware URL routing, `getRelativeLocaleUrl`, `Astro.preferredLocale`, fallback routing. It does **not** provide a translation runtime, `t()`, or dictionary format; those come from a docs recipe users copy in. A typical site has some of:

| Piece               | Location                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ |
| i18n config         | `i18n: { ... }` in `astro.config.mjs`                                                |
| Dictionary          | `src/i18n/ui.ts` — `{ en: {...}, fr: {...} }`                                        |
| Helpers             | `src/i18n/utils.ts` — `getLangFromUrl()`, `useTranslations()`, `useTranslatedPath()` |
| URL helpers         | `getRelativeLocaleUrl()` / `getAbsoluteLocaleUrl()` from `astro:i18n`                |
| Locale detection    | `Astro.currentLocale` in components                                                  |
| Duplicated pages    | `src/pages/fr/about.astro`, `src/pages/es/about.astro`                               |
| Content collections | `src/content/blog/en/`, `.../fr/` with `[locale]` routes                             |
| Language picker     | uses `getRelativeLocaleUrl()` or manual path construction                            |
| Middleware          | `src/middleware.ts` with i18n logic                                                  |

### Detection (supplements A1)

Look for: an `i18n` key in `astro.config.mjs`; `astro:i18n` imports; `Astro.currentLocale` / `Astro.preferredLocale`; a `src/i18n/` dir with `ui.ts` + `utils.ts`; duplicated page trees (`src/pages/fr/`, `src/pages/es/`).

### Translation extraction (supplements A2)

The recipe stores translations in a TS object:

```ts
// src/i18n/ui.ts
export const ui = {
  en: { "nav.home": "Home", "nav.about": "About", "hero.title": "Welcome to our site" },
  fr: { "nav.home": "Accueil", "nav.about": "À propos", "hero.title": "Bienvenue sur notre site" },
} as const;
```

Target Rosey format — **and change the separator from `.` to `:`** (CloudCannon's data API uses `.` as a path delimiter; Rosey uses `:`):

```json
{
  "nav:home": { "original": "Home", "value": "Accueil" },
  "nav:about": { "original": "About", "value": "À propos" },
  "hero:title": { "original": "Welcome to our site", "value": "Bienvenue sur notre site" }
}
```

Conversion script:

```js
import { ui } from "./src/i18n/ui.ts";
const defaultLang = "en";
const locales = Object.keys(ui).filter((l) => l !== defaultLang);
for (const locale of locales) {
  const result = {};
  for (const [key, enValue] of Object.entries(ui[defaultLang])) {
    result[key.replace(/\./g, ":")] = { original: enValue, value: ui[locale]?.[key] ?? enValue };
  }
  // Write result to rosey/locales/${locale}.json
}
```

Final key names must match the `data-rosey` attributes you add in Phase 3 — plan the naming scheme first.

### Page triage (supplements A3)

- **Structurally identical locale copies** (About, Contact, Home — only UI strings differ): delete the copies, keep the default-language page, add `data-rosey`. Rosey generates the locale copies at build.
- **Bodies that genuinely differ per locale** (blog, docs, case studies): keep as split-by-directory content collections (Phase 8).

### Removal specifics (supplements A3)

Remove the `i18n` block from `astro.config.mjs`. Then:

```diff
- <h1>{t('hero.title')}</h1>
+ <h1 data-rosey="hero:title">Welcome to our site</h1>

- <a href={translatePath('/about/')}>{t('nav.about')}</a>
+ <a href="/about/" data-rosey="nav:about">About</a>

- import { getRelativeLocaleUrl } from 'astro:i18n';
- <a href={getRelativeLocaleUrl('fr', 'about')}>À propos</a>
+ <a href="/about/" data-rosey="nav:about">About</a>
```

Delete `src/i18n/utils.ts` and `src/i18n/ui.ts` and their imports. **Audit `Astro.currentLocale`** across components:

- Date formatting → use the default locale (or move the page to split-by-directory if per-locale formatting matters).
- Conditional rendering → move to split-by-directory, or use `data-rosey` with per-locale content.
- `<html lang>` → hardcode the default (`<html lang="en">`); Rosey sets the correct `lang` on generated pages.

Delete `src/pages/fr/`, `src/pages/es/` for Rosey-only pages; keep `about.astro`, `index.astro` and add `data-rosey`. Remove i18n logic from `src/middleware.ts` (delete the file if that's all it did).

### Locale picker

Replace the `getRelativeLocaleUrl()`-based picker with the Rosey-compatible version above. The critical difference is `data-rosey-ignore` on every `<a>`.

### Fallback behavior change

Astro's `fallback: { fr: "es" }` swaps whole pages to another locale when a page is missing. Rosey has no per-page fallback — it falls back **per key** to the default-language text. Instead of a Spanish page when French is missing, visitors see the French URL with untranslated strings showing in the default language. Flag this to editors.

### Migration gotchas (Astro)

- **Key separator change (`.` → `:`).** Keep it consistent across the extraction script, `data-rosey` attributes, and locale files. Automate it.
- **`Astro.currentLocale` silently disappears.** After removing the `i18n` config it returns `undefined` rather than throwing — conditionals fall through to the else branch. Audit all usages first.
- **`prefixDefaultLocale: true` changes URLs.** Default pages move from `/en/about/` to `/about/` — set up redirects from `/en/*` if there are inbound links.
- **Content collections with `[locale]` routes** convert to the split-by-directory pattern (separate collection per locale, explicit locale routes).
- **Route translation (`routes` in `ui.ts`).** Rosey handles URL translation via `*.urls.json` files — see the Rosey docs.

## Gotchas

- **Slug derivation via `Astro.url.pathname`.** `Astro.url.pathname.replace(/^\/|\/$/g, '') || 'index'` in the component that renders `<main>`.
- **Array items: rosey attributes go inside the item component, not the loop wrapper.** Otherwise CloudCannon's clone-on-add/reorder produces a stale, duplicated `data-rosey-ns`. Give each item its own registered component with `data-component` on the `data-editable="array-item"`.
- **Rosey-root alignment for locale pages.** Pass a `roseyRoot` prop that strips the locale prefix; locale route files pass the English-equivalent path.
- **snake_case collection names** (`blog_fr`, `blog_de`) — consistent with CloudCannon conventions.
- **RTL `dir` script needs `is:inline`.** Without it Astro defers the script as a module and RTL pages flash LTR.
- **Locale picker must match the URL-structure mode.** With all-languages-prefixed (no `--default-language-at-root`), the default language lives under `/en/`, so the picker's default-language link is `/en{basePath}` (set `defaultLanguageAtRoot = false` in the snippet above) and path parsing must treat `en` as a locale segment too — otherwise the default-language link points at `/`, which serves the redirect page.
