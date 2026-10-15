# Visual Editing (Eleventy) — entry point

Eleventy-specific Visual Editor guidance, built on the `@cloudcannon/editable-regions` Eleventy plugin (Eleventy 3, Node ≥ 20.19). The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Eleventy.

**Two differences shape everything else:**

- **Component regions are Liquid only.** The plugin bundles a Liquid engine, your Liquid includes and your config's filters and shortcodes for the editor. A component is an include, named by its include path, with no registration step. Nunjucks templates can't re-render in the editor, but their includes stay reusable and editable through primitive regions — see [visual-editing-reference.md § Nunjucks sites](visual-editing-reference.md#nunjucks-sites).
- **The editor re-renders includes, never layouts or page templates,** with only the region's data in scope. Variables an include picks up from its parent work in the build and are `undefined` in the editor.

## Which path the site takes

Decide this first, from the templates that render the sections editors will change.

| The section templates are                                                                                | Path                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Liquid (`.liquid`, or `.html` / `.md` on a site whose `htmlTemplateEngine` is Liquid, the default)       | **Liquid path** — install the plugin; component regions work                                                                                          |
| Nunjucks (`.njk`, or `.html` / `.md` with `htmlTemplateEngine: "njk"` / `markdownTemplateEngine: "njk"`) | **Nunjucks path** — no plugin; primitive regions only, see [visual-editing-reference.md § Nunjucks sites](visual-editing-reference.md#nunjucks-sites) |
| Both                                                                                                     | Liquid path for the Liquid includes; the Nunjucks rules for the rest. Only `.liquid` files can be components when `.html` is processed as Nunjucks    |

Check `htmlTemplateEngine` and `markdownTemplateEngine` in the Eleventy config before reading file extensions: either one changes which engine an `.html` or `.md` file uses.

Don't convert Nunjucks templates to Liquid, or rewrite includes as macros, to get component regions without asking the user. The primitive regions cover most editing on their own.

## Reading order

| Order | File                                                             | Read when                                                                                                  |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                           | Always, first — setup for each path and the Eleventy-only checklist items                                  |
| 2     | [../visual-editing.md](../visual-editing.md)                     | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md) | On demand — the generic pattern behind a checklist item                                                    |
| 4     | [visual-editing-reference.md](visual-editing-reference.md)       | On demand — what Eleventy does differently from that pattern                                               |
| 5     | [troubleshooting.md](troubleshooting.md)                         | An Eleventy-specific symptom, after checking the generic table                                             |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                 | Covers                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [../editable-regions.md](../editable-regions.md)                     | Region types, attribute reference, custom elements            |
| [../visual-editing-reference.md](../visual-editing-reference.md)     | The generic pattern reference — paths, arrays, components     |
| [../editable-regions-internals.md](../editable-regions-internals.md) | The Visual Editor JavaScript API; lifecycle traces and quirks |
| [../troubleshooting.md](../troubleshooting.md)                       | Generic symptom → fix                                         |
