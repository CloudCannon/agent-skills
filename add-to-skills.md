# Handoff: CloudCannon schemas gate field forwarding in visual-editor re-renders

## The rule

When `@cloudcannon/editable-regions` re-renders an Astro section component inside CloudCannon's visual editor, the **schema file** (e.g. `.cloudcannon/schemas/<collection>.md`) determines which frontmatter fields are forwarded as props.

Fields that exist in the file's frontmatter and parse cleanly through the Astro/Zod content schema will still be **stripped from props on re-render** if they're not declared in the CC schema file's frontmatter shape.

This applies to nested fields too — declaring a field at the top level of the schema is not enough if the section reads it from a nested key.

## Common misconception (correct this in skill content)

> "Add a hidden `_input` in `cloudcannon.config.yml` and the field will flow through."

This is **wrong**. `_inputs` control how fields render in CC's editor UI. They have no effect on which fields are forwarded to a re-rendered editable-region component. Adding a hidden `_input` for a missing field does not fix the strip.

## Symptom → diagnosis recipe

If a section component renders correctly in `astro build` output but is missing data inside CC's visual editor:

1. Log `Object.keys(Astro.props)` from inside the component frontmatter and view it in the editor preview (console logs aren't reachable from inside the iframe).
2. Compare the surviving keys against the section's frontmatter on disk. Stripped keys are the diagnostic.
3. Open the relevant schema file in `.cloudcannon/schemas/`. The stripped keys will be absent from the schema's frontmatter shape (or absent from the relevant nested object).
4. Add the missing keys to the schema with sensible default values. Re-load the editor — they appear in props immediately, no save/rebuild required.

## Concrete example from this project

- File: `src/content/locations/marietta-therapy.md`
- Section frontmatter:
  ```yaml
  therapistsSection:
    locationSlug: marietta-therapy # used by component to filter therapists
    heading: ...
    intro: ...
    additionalTeam: []
  ```
- Component: `src/components/sections/LocationTherapists.astro` reads `locationSlug` from `Astro.props`.
- Symptom: in the visual editor, `Astro.props` contained only `heading`, `intro`, `additionalTeam`. `locationSlug` was missing.
- What didn't help: declaring `"therapistsSection.locationSlug"` as a hidden `_input` in `cloudcannon.config.yml`.
- What fixed it: adding `locationSlug: ""` inside the `therapistsSection:` block in `.cloudcannon/schemas/location.md`.

## Debugging block to drop into a section component

```astro
---
const debug = {
  allPropKeys: Object.keys(Astro.props),
  allProps: Astro.props,
};
---
<pre style="background:#fffbe6;border:2px solid #f59e0b;padding:12px;margin:12px;font-size:12px;white-space:pre-wrap;word-break:break-all;">
{JSON.stringify(debug, null, 2)}
</pre>
```

Render this inline at the top of a section, reload the page in CC's visual editor, and read off which keys survived. If a key is missing, the schema is the place to fix it.

## What this also rules out

While debugging, we confirmed these are _not_ the cause when fields are missing in the editor:

- Astro content collections work fine in the editor iframe — `getCollection()` returns full data.
- `_inputs` declarations in `cloudcannon.config.yml` do not control forwarding.
- `data-prop` attributes in the rendered template do not control forwarding (we tested both presence and absence).

The schema file is the gate.
