# Hugo-Specific Patterns

Framework-specific implementation details for making a Hugo site multilingual with Rosey/RCC/CloudCannon. Read alongside the main `SKILL.md` workflow.

## Slug Derivation

Use `.RelPermalink` in your base template:

```html
<main data-rosey-root="{{ .RelPermalink | replaceRE "^/|/$" "" | default "index" }}">
```

## Visitor-Facing Locale Picker

When implementing the locale picker (Phase 9 of the main skill) in Hugo, use `.RelPermalink` to parse the current path. The URL construction logic (parse path, detect locale prefix, strip/prepend) is the same as described in the main skill -- adapt using Hugo template functions.

