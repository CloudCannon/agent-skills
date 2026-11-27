# Visual Editing (SvelteKit) — entry point

SvelteKit-specific Visual Editor guidance, built on the `@cloudcannon/editable-regions/svelte` entry point. The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for SvelteKit.

**Three differences shape everything else:**

- **Svelte hydrates the whole page.** One `EditableRegions` root wraps every region, so no region touches the DOM before hydration. It goes in the root `+layout.svelte` → [visual-editing.md § Setup steps](visual-editing.md#setup-steps).
- **There is no plugin step.** The editor loads the runtime itself. The root layout imports the registration file only in editor mode.
- **Registered components mount on their own.** Each re-render mounts the component outside the page's component tree, so it gets its data through props.

## Reading order

| Order | File                                                                           | Read when                                                                                                  |
| ----- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                                         | Always, first — setup and the SvelteKit-only checklist items                                               |
| 2     | [../visual-editing.md](../visual-editing.md)                                   | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md)               | On demand — the generic pattern behind a checklist item                                                    |
| 4     | [../svelte/visual-editing-reference.md](../svelte/visual-editing-reference.md) | On demand — Svelte's rules: markup in templates, rich text hosts, `<template>` blueprints                  |
| 5     | [visual-editing-reference.md](visual-editing-reference.md)                     | On demand — what SvelteKit does differently from that pattern                                              |
| 6     | [troubleshooting.md](troubleshooting.md)                                       | A SvelteKit-specific symptom, after checking the generic table                                             |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                           | Covers                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [../editable-regions.md](../editable-regions.md)                               | Region types, attribute reference, custom elements                                         |
| [../visual-editing-reference.md](../visual-editing-reference.md)               | The generic pattern reference — paths, arrays, components, the `EditableRegions` root      |
| [../svelte/visual-editing-reference.md](../svelte/visual-editing-reference.md) | Svelte's registration function, `EditableRegions` export, template markup, rich text hosts |
| [../editable-regions-internals.md](../editable-regions-internals.md)           | The Visual Editor JavaScript API; lifecycle traces and quirks                              |
| [../troubleshooting.md](../troubleshooting.md)                                 | Generic symptom → fix                                                                      |
