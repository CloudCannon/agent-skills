# Visual Editing (Hugo) — entry point

Hugo-specific Visual Editor guidance, built on the `github.com/CloudCannon/editable-regions` Hugo module (v0.0.21, which declares Hugo ≥ 0.120). The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Hugo.

**Two differences shape everything else:**

- **Components are partials.** There is no registration step — `data-component` is a partial path. Only partials, shortcodes and render hooks are bundled for the editor, so a section must be a partial to re-render. Dependencies in the module cache aren't bundled at all, config included.
- **The editor runs Hugo in the browser, without the markdown body or the asset pipeline.** `.Content` is empty, `resources.Get` finds only files listed in `additional_dirs`, and site config keeps its build-time values; branch on `site.Params.ENV_CLIENT`.

## Reading order

| Order | File                                                             | Read when                                                          |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1     | [visual-editing.md](visual-editing.md)                           | Always — module setup, the Phase 4 workflow, census and checklists |
| 2     | [../visual-editing.md](../visual-editing.md)                     | Always — the census format and the Universal checklist it links to |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md) | On demand — the generic pattern behind a checklist item            |
| 4     | [visual-editing-reference.md](visual-editing-reference.md)       | On demand — what Hugo does differently from that pattern           |
| 5     | [troubleshooting.md](troubleshooting.md)                         | A Hugo-specific symptom, after checking the generic table          |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                 | Covers                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [../editable-regions.md](../editable-regions.md)                     | Region types, attribute reference, custom elements            |
| [../visual-editing-reference.md](../visual-editing-reference.md)     | The generic pattern reference — paths, arrays, components     |
| [../editable-regions-internals.md](../editable-regions-internals.md) | The Visual Editor JavaScript API; lifecycle traces and quirks |
| [../troubleshooting.md](../troubleshooting.md)                       | Generic symptom → fix                                         |
