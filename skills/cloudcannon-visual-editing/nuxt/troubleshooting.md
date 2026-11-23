# Visual editing troubleshooting (Nuxt)

Nuxt-specific rows only. Generic symptoms are in [../troubleshooting.md](../troubleshooting.md) — check there first.

| Symptom / mistake                                                                         | Fix                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Add item" adds the entry in the sidebar, but nothing appears in the preview              | The array's blueprint is a plain `<template>` tag in an SFC. Render it through `RawTemplate`. See [Array blueprints](visual-editing-reference.md#array-blueprints).                        |
| Every component region shows "Failed to find a registered component with the key"         | The registration file never loads. Check that `app/plugins/cloudcannon.client.ts` exists, and that its `import()` path is relative, not `@cloudcannon/...`, which resolves to the package. |
| A registered component renders an empty box in the editor, with no console error          | It loads its own data. Move the load to the caller and pass the data as props. See [Registered components](visual-editing-reference.md#registered-components).                             |
| Regions are missing from the built HTML, with `<!---->` where `<editable-text>` should be | `vue.compilerOptions.isCustomElement` is missing from `nuxt.config` — see [visual-editing.md § Setup steps](visual-editing.md#setup-steps).                                                |
