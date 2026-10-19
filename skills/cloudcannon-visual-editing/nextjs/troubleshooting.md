# Visual editing troubleshooting (Next.js)

Next.js-specific rows only. Generic symptoms are in [../troubleshooting.md](../troubleshooting.md) — check there first.

| Symptom / mistake                                                                  | Fix                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The editor floods with "array item has no parent" errors on a page with blueprints | A `<template>` has JSX children, which never reach `template.content`. Render it through `RawTemplate`. See [Array blueprints](visual-editing-reference.md#array-blueprints-in-nextjs).       |
| Every component region shows "Failed to find a registered component with the key"  | The registration file never loads. Check that `<CloudCannonEditor />` is in `app/layout.tsx` and that its `import()` path is relative, not `@cloudcannon/...`, which resolves to the package. |
