# Eleventy-Specific Patterns

Framework-specific implementation details for making an Eleventy (11ty) site multilingual with Rosey/RCC/CloudCannon. Read alongside the main `SKILL.md` workflow.

## Slug Derivation

In Eleventy, `page.url` gives the URL path (e.g., `/booking/`). For flat URL structures:

```liquid
{% assign rosey_slug = page.url | replace: '/', '' %}
{% if rosey_slug == '' %}{% assign rosey_slug = 'index' %}{% endif %}
<main data-rosey-root="{{ rosey_slug }}">
```

> The `replace: '/'` approach works for flat URLs (`/about/` → `about`). For nested paths (`/blog/my-post/`), use a split/join: `{% assign rosey_slug = page.url | split: '/' | join: '-' | remove_first: '-' %}`.

## Content-Block Namespacing — keep rosey attributes inside the block, not the loop

> This implements the core rule from §3g of the main skill. The `data-rosey-ns` / `data-rosey` attributes belong on the block partial (the thing rendered per item), not left dangling on the parent's `{% for %}` wrapper, so that CloudCannon's clone-on-add/reorder can't produce a stale, duplicated namespace.

For sites using `content_blocks`, the shared page template loops the blocks; use each block's `_uuid` (from CloudCannon's `instance_value: UUID`) as the namespace segment:

```liquid
{% for block in content_blocks %}
  <div data-rosey-ns="{{ block._uuid }}">
    {% include block._name %}
  </div>
{% endfor %}
```

This requires a `_uuid` input in `cloudcannon.config.yml` and `_uuid:` in every structure value — see §3g of the main skill. One change covers all blocks across all pages. The `data-rosey` leaf keys themselves live inside each included block partial.

**Fallback (non-CloudCannon):** block name + index — fragile, reordering shifts keys:

```liquid
{% assign block_ns = block._name | append: "-" | append: forloop.index0 %}
<div data-rosey-ns="{{ block_ns }}">
```

### If using Bookshop

> **Skip this if the site doesn't use Bookshop.** Most Eleventy sites don't — the patterns above work with any component system.

For Bookshop sites, the shared `page.eleventy.liquid` template renders blocks via `{% bookshop %}`. The same UUID namespacing applies:

```liquid
{% for block in content_blocks %}
  <div data-rosey-ns="{{ block._uuid }}">
    {% bookshop "{{ block._bookshop_name }}" bind: block %}
  </div>
{% endfor %}
```

Fallback for Bookshop sites without `instance_value`:

```liquid
{% assign block_ns = block._bookshop_name | split: "/" | last | append: "-" | append: forloop.index0 %}
<div data-rosey-ns="{{ block_ns }}">
```

## Split-by-Directory for Body Content

When implementing split-by-directory (Phase 8 of the main skill) in Eleventy:

- Create per-locale directories (`blog_fr/`, `blog_de/`) alongside the English blog directory.
- Use computed data or directory data files (`blog_fr/blog_fr.json`) to set a `locale` variable and output URL prefix.
- Shared layouts receive `locale` and conditionally adjust links and date formatting.
- Suppress `data-rosey` on frontmatter-driven fields by conditionally omitting the attribute when `locale` is set.

## Visitor-Facing Locale Picker

When implementing the locale picker (Phase 9 of the main skill) in Eleventy, use `page.url | split: "/"` to parse the path and detect the current locale. The first meaningful segment is at index 1 (`path_segments[1]`) since index 0 is empty from the leading `/`. The URL construction logic (parse path, detect locale prefix, strip/prepend) is the same as the main skill — adapt using Liquid filters. Honor the Phase 1 step 5 mode: with all-languages-prefixed (no `--default-language-at-root`), treat the default language code as a locale segment too and prefix its link (`/en{basePath}`), since its pages live under `/en/`, not `/`.

The picker's client-side script guards on the editor flag — **(RCC layer)** hide the nav picker inside the Visual Editor (the RCC injects its own floating switcher), otherwise run the active-state highlight. The guard is harmless off CloudCannon, since `window.inEditorMode` is only ever set there:

```html
<script>
  if (window.inEditorMode) {
    document.querySelectorAll("nav[aria-label='Language']").forEach(function (nav) {
      nav.style.display = "none";
    });
  } else {
    document.querySelectorAll("nav[aria-label='Language'] a").forEach(function (link) {
      link.classList.toggle("active", link.pathname === window.location.pathname);
    });
  }
</script>
```

## Gotchas

### Eleventy

- **Slug derivation via `page.url`.** Flat: `{% assign rosey_slug = page.url | replace: '/', '' %}` with an `index` fallback. Nested: use split/join instead of a blanket replace.
- **Locale-picker path parsing.** `page.url | split: "/"`; the first meaningful segment is index 1.
- **Block namespacing lives on the block, not the loop.** Put `data-rosey-ns="{{ block._uuid }}"` on the per-block wrapper/partial so it re-renders per item; don't rely on a shared parent element that CloudCannon can clone.

### Bookshop (skip if site does not use Bookshop)

- **`page.eleventy.liquid` is the ideal block-namespacing point.** Use `{{ block._uuid }}` (from `instance_value: UUID`) for stable keys; fall back to `{% assign block_ns = block._bookshop_name | split: "/" | last | append: "-" | append: forloop.index0 %}` (fragile). One change covers all blocks.
- **Button `data-rosey` captures SVG icon markup.** On an `<a>`/`<button>` containing both text and a Bookshop icon, Rosey captures the full `innerHTML` including the rendered SVG and live-edit comments — polluting the source and, on translated pages, injecting the icon twice (once from the stored value, once from the template). Wrap just the text in a `<span data-rosey="button_text">` and leave the icon outside (requires restructuring the button). On an already-translated site, moving the tag also needs a delete-and-reseed of the affected locale keys — see the "Moving a tag on an already-translated site" gotcha in `SKILL.md`.
