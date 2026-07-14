# Hugo-Specific Patterns

Framework-specific implementation details for making a Hugo site multilingual with Rosey/RCC/CloudCannon. Read alongside the main `SKILL.md` workflow.

## Slug Derivation

Use `.RelPermalink` in your base template:

```html
<main data-rosey-root="{{ .RelPermalink | replaceRE "^/|/$" "" | default "index" }}">
```

## Visitor-Facing Locale Picker

When implementing the locale picker (Phase 9 of the main skill) in Hugo, use `.RelPermalink` to parse the current path. The URL construction logic (parse path, detect locale prefix, strip/prepend) is the same as described in the main skill -- adapt using Hugo template functions. Honor the Phase 1 step 5 mode: with all-languages-prefixed (no `--default-language-at-root`), treat the default language code as a locale segment too and prefix its link (`/en{basePath}`), since its pages live under `/en/`, not `/`.

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
