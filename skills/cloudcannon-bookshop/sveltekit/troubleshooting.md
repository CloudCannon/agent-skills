# Troubleshooting (SvelteKit)

SvelteKit rows only. Check [../troubleshooting.md](../troubleshooting.md) first.

| Symptom                                                                                             | Cause                                                                                                   | Fix                                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The build fails with `Cannot read properties of undefined (reading 'default')` in `Bookshop.svelte` | A `_bookshop_name`, `component` or `shared` value names no file under `$bookshop`, often after a rename | Check the name against [bookshop.md § The `<Bookshop>` component](bookshop.md#the-bookshop-component); finish the rename in one step |
