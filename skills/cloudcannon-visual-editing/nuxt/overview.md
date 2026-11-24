# Visual Editing (Nuxt) — entry point

Nuxt-specific Visual Editor guidance, built on the `@cloudcannon/editable-regions/vue` entry point. The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Nuxt.

**Find the source directory first.** Nuxt 4 keeps `layouts/`, `components/` and `plugins/` under `app/`; Nuxt 3 keeps them at the root. Paths here use `app/`.

**Three differences shape everything else:**

- **Vue hydrates the whole page.** One `EditableRegions` root wraps every region, so no region touches the DOM before hydration. It goes in the outermost component that renders regions: `app.vue` when the header and footer render there, otherwise each layout → [visual-editing.md § Setup steps](visual-editing.md#setup-steps).
- **There is no plugin step.** The editor loads the runtime itself. A client plugin imports the registration file only in editor mode.
- **Registered components render in a separate Vue app.** Each re-render mounts the component on its own, so it gets its data through props.

## Reading order

| Order | File                                                                     | Read when                                                                                                  |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                                   | Always, first — setup and the Nuxt-only checklist items                                                    |
| 2     | [../visual-editing.md](../visual-editing.md)                             | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md)         | On demand — the generic pattern behind a checklist item                                                    |
| 4     | [../vue/visual-editing-reference.md](../vue/visual-editing-reference.md) | On demand — Vue's rules: markup in templates, rich text hosts                                              |
| 5     | [visual-editing-reference.md](visual-editing-reference.md)               | On demand — what Nuxt does differently from that pattern, including `<template>` blueprints                |
| 6     | [troubleshooting.md](troubleshooting.md)                                 | A Nuxt-specific symptom, after checking the generic table                                                  |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                     | Covers                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [../editable-regions.md](../editable-regions.md)                         | Region types, attribute reference, custom elements                                      |
| [../visual-editing-reference.md](../visual-editing-reference.md)         | The generic pattern reference — paths, arrays, components, the `EditableRegions` root   |
| [../vue/visual-editing-reference.md](../vue/visual-editing-reference.md) | Vue's registration function, `EditableRegions` export, template markup, rich text hosts |
| [../editable-regions-internals.md](../editable-regions-internals.md)     | The Visual Editor JavaScript API; lifecycle traces and quirks                           |
| [../troubleshooting.md](../troubleshooting.md)                           | Generic symptom → fix                                                                   |
