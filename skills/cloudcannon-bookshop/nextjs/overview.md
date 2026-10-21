# Bookshop (Next.js) — entry point

Next.js-specific Bookshop guidance. The cross-SSG rules live one level up; the files here carry only what differs for Next.js.

Bookshop has no Next.js engine: on a Next.js site it provides `_structures` and nothing else.

**Two differences shape everything else:**

- **The site renders its own components.** The library holds only `*.bookshop.yml` files. The components are the site's React components, and the site's own blocks renderer picks one per block by `_bookshop_name`. Migrating replaces that lookup with a component map keyed by the same names.
- **Live editing comes from the React connector, not Bookshop.** `@cloudcannon/react-connector` re-renders the whole page in the editor, and `data-cms-bind` attributes make blocks clickable. Editable regions replace the connector, and each binding gets a census row.

## Reading order

| Order | File                                                                       | Read when                                                                      |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | [../bookshop.md](../bookshop.md)                                           | Always — the pieces of a Bookshop site                                         |
| 2     | [bookshop.md](bookshop.md)                                                 | Always — which pieces a Next.js site has, and where they live                  |
| 3     | [../maintaining.md](../maintaining.md)                                     | The site stays on Bookshop                                                     |
| 3     | [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md) | The site is migrating — the step order and cross-SSG mapping                   |
| 4     | [migrating-to-editable-regions.md](migrating-to-editable-regions.md)       | The site is migrating — the component map, component props, removing the setup |
| 5     | [troubleshooting.md](troubleshooting.md)                                   | A Next.js symptom, after checking the generic table                            |
