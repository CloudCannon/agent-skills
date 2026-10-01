# Bookshop (Hugo) — entry point

Hugo-specific Bookshop guidance. The cross-SSG rules live one level up; the files here carry only what differs for Hugo.

**Two differences shape everything else:**

- **The library is a Hugo module.** `component-library/` is mounted into `layouts/partials/bookshop`, and the site reaches components through Bookshop's partials — `partial "bookshop"`, `bookshop_partial`, `bookshop_bindings`.
- **Editable regions resolve components as partials.** Migrating moves every component into `layouts/partials/` under the same path, so `_name` stays the component name and the partial path at once.

## Reading order

| Order | File                                                                       | Read when                                                      |
| ----- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1     | [../bookshop.md](../bookshop.md)                                           | Always — the pieces of a Bookshop site                         |
| 2     | [bookshop.md](bookshop.md)                                                 | Always — where they live in Hugo, and the template calls       |
| 3     | [../maintaining.md](../maintaining.md)                                     | The site stays on Bookshop                                     |
| 3     | [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md) | The site is migrating — the step order and cross-SSG mapping   |
| 4     | [migrating-to-editable-regions.md](migrating-to-editable-regions.md)       | The site is migrating — Hugo's moves, rewrites and module swap |
| 5     | [troubleshooting.md](troubleshooting.md)                                   | A Hugo symptom, after checking the generic table               |
