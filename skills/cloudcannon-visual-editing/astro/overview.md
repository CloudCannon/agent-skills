# Visual Editing (Astro) — entry point

Astro-specific Visual Editor guidance, built on `@cloudcannon/editable-regions`. The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Astro.

## Reading order

| Order | File                                                                                                                                      | Read when                                                                                                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                                                                                                    | Always, first — setup and the Astro-only checklist items                                                                                                                          |
| 2     | [../visual-editing.md](../visual-editing.md)                                                                                              | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep                                                                        |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md)                                                                          | On demand — the generic pattern behind a checklist item                                                                                                                           |
| 4     | [visual-editing-reference.md](visual-editing-reference.md)                                                                                | On demand — what Astro does differently from that pattern                                                                                                                         |
| 5     | [React](../react/visual-editing-reference.md), [Vue](../vue/visual-editing-reference.md), [Svelte](../svelte/visual-editing-reference.md) | On demand, when the site renders React, Vue or Svelte components — that framework's registration function, and for React, JSX markup, rich text hosts and `<template>` blueprints |
| 6     | [troubleshooting.md](troubleshooting.md)                                                                                                  | An Astro-specific symptom, after checking the generic table                                                                                                                       |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                           | Covers                                                                 |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [../editable-regions.md](../editable-regions.md)                               | Region types, attribute reference, custom elements                     |
| [../visual-editing-reference.md](../visual-editing-reference.md)               | The generic pattern reference — paths, arrays, components              |
| [../react/visual-editing-reference.md](../react/visual-editing-reference.md)   | React's registration function, JSX markup, rich text hosts, blueprints |
| [../vue/visual-editing-reference.md](../vue/visual-editing-reference.md)       | Vue's registration function                                            |
| [../svelte/visual-editing-reference.md](../svelte/visual-editing-reference.md) | Svelte's registration function                                         |
| [../editable-regions-internals.md](../editable-regions-internals.md)           | The Visual Editor JavaScript API; lifecycle traces and quirks          |
| [../troubleshooting.md](../troubleshooting.md)                                 | Generic symptom → fix                                                  |
