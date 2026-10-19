# Visual Editing (Next.js) — entry point

> **Coverage: Partial.** Static export (`output: "export"`) with the App Router only.

Next.js-specific Visual Editor guidance, built on the `@cloudcannon/editable-regions/react` entry point. The cross-SSG rules live one level up: [`../editable-regions.md`](../editable-regions.md) owns the region types and the attribute reference, and [`../visual-editing-reference.md`](../visual-editing-reference.md) owns the patterns that use them. The files here carry only what differs for Next.js.

**Three differences shape everything else:**

- **React hydrates the whole page.** One `EditableRegions` root in `app/layout.tsx` wraps every region, so no region touches the DOM before hydration.
- **There is no plugin step.** The editor loads the runtime itself. A client component in the layout imports the registration file only in editor mode.
- **Registered components run in the browser.** Pages stay server components, but anything registered for re-rendering is bundled for the client, so it must get all its data through props.

## Reading order

| Order | File                                                             | Read when                                                                                                  |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | [visual-editing.md](visual-editing.md)                           | Always, first — setup and the Next.js-only checklist items                                                 |
| 2     | [../visual-editing.md](../visual-editing.md)                     | Always, before writing any `data-editable` — the census, the Universal checklist and the pre-handoff sweep |
| 3     | [../visual-editing-reference.md](../visual-editing-reference.md) | On demand — the generic pattern behind a checklist item                                                    |
| 4     | [visual-editing-reference.md](visual-editing-reference.md)       | On demand — what Next.js does differently from that pattern                                                |
| 5     | [troubleshooting.md](troubleshooting.md)                         | A Next.js-specific symptom, after checking the generic table                                               |

**MUST NOT:** read `visual-editing-reference.md` front to back. It is a pattern reference; `visual-editing.md` links into the section you need.

## Cross-SSG deep-dives

| File                                                                 | Covers                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [../editable-regions.md](../editable-regions.md)                     | Region types, attribute reference, custom elements            |
| [../visual-editing-reference.md](../visual-editing-reference.md)     | The generic pattern reference — paths, arrays, components     |
| [../editable-regions-internals.md](../editable-regions-internals.md) | The Visual Editor JavaScript API; lifecycle traces and quirks |
| [../troubleshooting.md](../troubleshooting.md)                       | Generic symptom → fix                                         |
