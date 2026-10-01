# Bookshop (Astro) — entry point

Astro-specific Bookshop guidance. The cross-SSG rules live one level up; the files here carry only what differs for Astro.

**Two differences shape everything else:**

- **The site owns the dispatcher.** Bookshop resolves nothing itself on Astro — a glob in `src/shared/astro/` maps `_bookshop_name` to components, and `bookshop:live` makes a call live-editable. Migrating keeps that naming rule, so components never move.
- **The integration rewrites every component while it's installed.** Built output differs from source until `bookshop()` is removed, which is why removal comes right after the dispatcher swap.

## Reading order

| Order | File                                                                       | Read when                                                            |
| ----- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1     | [../bookshop.md](../bookshop.md)                                           | Always — the pieces of a Bookshop site                               |
| 2     | [bookshop.md](bookshop.md)                                                 | Always — where they live in Astro, `bookshop:live`, the dispatchers  |
| 3     | [../maintaining.md](../maintaining.md)                                     | The site stays on Bookshop                                           |
| 3     | [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md) | The site is migrating — the step order and cross-SSG mapping         |
| 4     | [migrating-to-editable-regions.md](migrating-to-editable-regions.md)       | The site is migrating — the component map, dispatchers, registration |
| 5     | [troubleshooting.md](troubleshooting.md)                                   | An Astro symptom, after checking the generic table                   |
