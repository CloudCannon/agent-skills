# Bookshop (SvelteKit) — entry point

SvelteKit-specific Bookshop guidance. The cross-SSG rules live one level up; the files here carry only what differs for SvelteKit.

**Two differences shape everything else:**

- **A `<Bookshop>` component is the dispatcher.** It globs the library through a `$bookshop` alias and picks each block's component from `_bookshop_name`. Migrating keeps that naming rule in a component map, so components never move.
- **Live editing comes from the Svelte connector, not a browser engine.** `@cloudcannon/svelte-connector` replaces the page's data in the editor, Svelte re-renders the page, and `<Bookshop>` adds `data-cms-bind` attributes to each block. Editable regions replace the connector and the bindings.

## Reading order

| Order | File                                                                       | Read when                                                                             |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1     | [../bookshop.md](../bookshop.md)                                           | Always — the pieces of a Bookshop site                                                |
| 2     | [bookshop.md](bookshop.md)                                                 | Always — where they live in SvelteKit, the `<Bookshop>` component, live editing       |
| 3     | [../maintaining.md](../maintaining.md)                                     | The site stays on Bookshop                                                            |
| 3     | [../migrating-to-editable-regions.md](../migrating-to-editable-regions.md) | The site is migrating — the step order and cross-SSG mapping                          |
| 4     | [migrating-to-editable-regions.md](migrating-to-editable-regions.md)       | The site is migrating — the component map, the `<Bookshop>` calls, removing the setup |
| 5     | [troubleshooting.md](troubleshooting.md)                                   | A SvelteKit symptom, after checking the generic table                                 |
