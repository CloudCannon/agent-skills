# Troubleshooting (Nuxt)

Nuxt rows only. Check [../troubleshooting.md](../troubleshooting.md) first.

| Symptom                                                                                 | Cause                                                                                  | Fix                                                                                                                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Build log: "No live editing connected as no pages contained Bookshop components"        | Expected on Nuxt — Bookshop renders nothing, and live editing comes from the connector | None                                                                                                                                         |
| A block throws in the editor reading a field of `undefined`, while the build renders it | The component reads a wrapped `block` prop; the editor passes the fields as props      | [migrating-to-editable-regions.md § Components take the block as props](migrating-to-editable-regions.md#components-take-the-block-as-props) |
