# Bookshop (Eleventy) — entry point

Eleventy-specific Bookshop guidance. The cross-SSG rules live one level up; the files here carry only what differs for Eleventy.

> **Coverage: Partial.** The mapping comes from a full migration of a large Bookshop component library and from the Bookshop and editable-regions source. These files haven't yet been run end to end on another site.

**Two differences shape everything else:**

- **Bookshop on Eleventy is Liquid only, and so are component regions.** Every Bookshop component is a `.eleventy.liquid` file, so every one can become a Liquid include that the editable-regions plugin re-renders. No Nunjucks rules apply to a former Bookshop library.
- **Editable regions resolve components as include paths.** Migrating moves every component into the includes directory under the same path, so `_type` stays the component name and the include path at once.

## Reading order

| Order | File                                                                       | Read when                                                              |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1     | [../bookshop.md](../bookshop.md)                                           | Always — the pieces of a Bookshop site                                 |
| 2     | [bookshop.md](bookshop.md)                                                 | Always — where they live in Eleventy, and the tags                     |
| 3     | [../maintaining.md](../maintaining.md)                                     | The site stays on Bookshop                                             |
| 3     | [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md) | The site is migrating — the step order and cross-SSG mapping           |
| 4     | [migrating-to-editable-regions.md](migrating-to-editable-regions.md)       | The site is migrating — Eleventy's moves, tag rewrites and plugin swap |
| 5     | [troubleshooting.md](troubleshooting.md)                                   | An Eleventy symptom, after checking the generic table                  |
