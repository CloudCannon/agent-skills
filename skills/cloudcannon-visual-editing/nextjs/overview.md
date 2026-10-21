# Visual Editing (Next.js) — entry point

Next.js-specific Visual Editor guidance, built on the `@cloudcannon/editable-regions/react` entry point. The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Next.js.

**Find the router first.** An `app/` directory (or `src/app/`) means the App Router; a `pages/` directory (or `src/pages/`) means the Pages Router. Both can exist in one site; each route follows the rules for its own router.

**Three differences shape everything else:**

- **React hydrates the whole page.** One `EditableRegions` root wraps every region, so no region touches the DOM before hydration. It goes in `app/layout.tsx` (App Router) or `pages/_app.*` (Pages Router).
- **There is no plugin step.** The editor loads the runtime itself. A client component in the layout or `_app` imports the registration file only in editor mode.
- **Registered components run in the browser.** Anything registered for re-rendering is bundled for the client, so it must get all its data through props.

## Reading order

| Order | File                                                                         | Read when                                                                                                  |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                                       | Always, first — setup and the Next.js-only checklist items                                                 |
| 2     | [../visual-editing.md](../visual-editing.md)                                 | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md)             | On demand — the generic pattern behind a checklist item                                                    |
| 4     | [../react/visual-editing-reference.md](../react/visual-editing-reference.md) | On demand — React's rules: markup in JSX, rich text hosts, `<template>` blueprints                         |
| 5     | [visual-editing-reference.md](visual-editing-reference.md)                   | On demand — what Next.js does differently from that pattern                                                |
| 6     | [troubleshooting.md](troubleshooting.md)                                     | A Next.js-specific symptom, after checking the generic table                                               |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                         | Covers                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [../editable-regions.md](../editable-regions.md)                             | Region types, attribute reference, custom elements                                               |
| [../visual-editing-reference.md](../visual-editing-reference.md)             | The generic pattern reference — paths, arrays, components, the `EditableRegions` root            |
| [../react/visual-editing-reference.md](../react/visual-editing-reference.md) | React's registration function, `EditableRegions` export, JSX markup, rich text hosts, blueprints |
| [../editable-regions-internals.md](../editable-regions-internals.md)         | The Visual Editor JavaScript API; lifecycle traces and quirks                                    |
| [../troubleshooting.md](../troubleshooting.md)                               | Generic symptom → fix                                                                            |
