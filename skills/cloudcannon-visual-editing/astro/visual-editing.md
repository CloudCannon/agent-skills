# Visual Editing (Astro)

Workflow for adding CloudCannon Visual Editor support to an Astro site using `@cloudcannon/editable-regions`. The generic patterns behind these checks live in [../visual-editing-reference.md](../visual-editing-reference.md), and Astro's deltas from them in [visual-editing-reference.md](visual-editing-reference.md) — read sections on demand as checklist items link to them. For the region types and attribute reference, see [../editable-regions.md](../editable-regions.md).

## Setup steps

Run the setup script to handle steps 1-3 automatically:

```bash
bash <skills-dir>/cloudcannon-visual-editing/scripts/setup-editable-regions.sh .
```

Run it from the site root; `<skills-dir>` is wherever the skills are installed (for example `.agents/skills`).

This installs the package (falling back to `--legacy-peer-deps` if needed), adds the Astro integration to `astro.config.mjs`, and creates `src/cloudcannon/registerComponents.ts`. Verify the results — especially that `editableRegions()` was placed inside the integrations array, not after it. Then add a conditional import in the base layout so `registerComponents` only loads inside CloudCannon's Visual Editor:

```astro
<script>
  if (window.inEditorMode) {
    import("../cloudcannon/registerComponents").catch((error) => {
      console.warn("Failed to load CloudCannon component registration:", error);
    });
  }
</script>
```

`window.inEditorMode` is set to `true` by CloudCannon inside the Visual Editor iframe. The dynamic `import()` keeps the registration JavaScript out of production page loads — it only loads when the page is being edited. It does not keep out the CSS: Astro links the styles of every component reachable from `registerComponents.ts` on every page that includes the layout, including components the page never renders. Register only components that need re-rendering — if `registerComponents.ts` or `componentMap.ts` uses `import.meta.glob`, narrow it to the block directory, or import components explicitly — and diff the built CSS before and after adding the import.

Use a relative path for the `import()` — `@cloudcannon/...` looks like an npm scope and will resolve to the package, not your local file.

**Astro 4 compatibility:** The integration requires Astro 5+. For Astro 4, skip the integration — `data-editable` HTML attributes still work but component re-rendering is not available. See [visual-editing-reference.md § How the Astro integration works](visual-editing-reference.md#how-the-astro-integration-works).

When the site uses a page builder with a `BlockRenderer`, create a shared `src/cloudcannon/componentMap.ts` — see [visual-editing-reference.md § Component re-rendering](visual-editing-reference.md#component-re-rendering).

### Package exports reference

| Import path                                           | Purpose                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `@cloudcannon/editable-regions/astro-integration`     | Astro integration for `astro.config.mjs` (build-time)                                                                         |
| `@cloudcannon/editable-regions/astro`                 | `registerAstroComponent()` for client-side component re-rendering                                                             |
| `@cloudcannon/editable-regions/astro-react-renderer`  | Side-effect import: registers the React renderer (needed when React components are used inside registered Astro components)   |
| `@cloudcannon/editable-regions/astro-vue-renderer`    | Side-effect import: registers the Vue renderer (needed when Vue components are used inside registered Astro components)       |
| `@cloudcannon/editable-regions/astro-svelte-renderer` | Side-effect import: registers the Svelte renderer (needed when Svelte components are used inside registered Astro components) |
| `@cloudcannon/editable-regions/react`                 | `registerReactComponent()` for standalone React component re-rendering                                                        |

## Section census

> **Hard gate.** Do not write a `data-editable` attribute in a page template until a section census exists at `.cloudcannon/migration/visual-editing.md` and covers every key page.

The census format — columns, treatments, binding plans and the `sidebar-only` rules — is in [../visual-editing.md § Section census](../visual-editing.md#section-census). In Astro, a registered component is one registered in `src/cloudcannon/registerComponents.ts`, and a loop is a `.map()`.

## Infrastructure checklist

Run through these after setup, before starting on editable regions:

- [ ] `@cloudcannon/editable-regions` is in `package.json` dependencies
- [ ] The `editableRegions()` integration is in the `integrations` array in `astro.config.mjs` (inside the array, not after it)
- [ ] `src/cloudcannon/registerComponents.ts` exists with commented-out examples
- [ ] Base layout conditionally imports `registerComponents` inside `if (window.inEditorMode)`
- [ ] If `astro-icon` is installed, the `src/icons/` directory exists (it fails the build without it, even if empty)
- [ ] Every registered component, and everything it renders, has been grepped for `Astro.` reads other than `props`, `slots` and `request` — nothing else exists in a re-render, and the failure is invisible at build time → [Runtime shims](visual-editing-reference.md#how-the-astro-integration-works)
- [ ] Every registered component, and everything it renders, has been grepped for `.svg` imports — SVG component imports throw `NoMatchingRenderer` in a re-render; use `?raw` + `set:html` → [SVG component imports](visual-editing-reference.md#module-compatibility-in-the-editable-regions-client-bundle)
- [ ] `astro-icon`, if installed, is ≤ 1.1.5 — or ≥ 1.2.0 with the `Astro.locals` crash addressed → [astro-icon](visual-editing-reference.md#astro-icon)
- [ ] `astro build` passes cleanly after setup

## Completeness checklist

1. **Work through** [../visual-editing.md § Completeness checklist](../visual-editing.md#completeness-checklist) — the Universal items and, if the site has a page builder, the Page builder items.
2. **Then work through** the Astro items:

- [ ] **Collection and data file config**: `_enabled_editors` and each data file's `file_config` follow the configuration guide
      → [configuration.md](../../cloudcannon-configuration/configuration.md)
- [ ] **Registration wiring**: Every component in `registerComponents.ts` is actually referenced via `data-component` in a template.
      → [Component re-rendering](visual-editing-reference.md#component-re-rendering)
- [ ] **Cross-collection select wiring**: the lookup component is registered with `registerAstroComponent`
      → [Cross-collection select inputs](visual-editing-reference.md#cross-collection-select-inputs)
- [ ] **Markdown body hosts**: the `@content` region wraps `<Content />` (from `entry.render()`) or `<slot />` in layouts
      → [Text editing](../visual-editing-reference.md#text-editing)
- [ ] **Slot content hosts**: Editable slot content uses a concrete DOM host (`<editable-text>`, `<span>`) not `<Fragment>`
      → [Text editing](../visual-editing-reference.md#text-editing)
- [ ] **Spread props**: Registered components accept spread props matching the shape of their `data-prop` value
      → [Component prop contract](../visual-editing-reference.md#component-prop-contract)
- [ ] **Cross-collection editable guard**: the shared component takes an `editable` prop that strips its editable attributes
      → [Array editing](../visual-editing-reference.md#array-editing)

### Page builder only (skip if not applicable)

- [ ] **Block items**: `data-component={_type}` on each block element
      → [Page builder blocks](../visual-editing-reference.md#page-builder-blocks)
- [ ] **Shared component map**: `src/cloudcannon/componentMap.ts` exists and both `BlockRenderer.astro` and `registerComponents.ts` import from it
      → [Component re-rendering](visual-editing-reference.md#astro-components)
- [ ] **Registration keys match `_type`**: Every key uses the exact `_type` string from content files, and every `_type` value has a `componentMap` entry
      → [Page builder blocks](../visual-editing-reference.md#page-builder-blocks)

## Pre-handoff sweep

Run [../visual-editing.md § Pre-handoff sweep](../visual-editing.md#pre-handoff-sweep) against `dist/` (`grep -rE "data-editable|data-prop" dist/`). For the Shared-UI walk-through, the named data file lives in `src/data/`.

## Self-check before handoff

Answer each question. Every "No" is a blocker.

| Check                                                                                              | Cross-link                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Every registered-component field-group nested under a single frontmatter key (no `propPrefix=""`)? | [Frontmatter co-location](../visual-editing-reference.md#scattered-fields-feeding-a-registered-component--nest-the-frontmatter) |
| Every content file backfilled after a schema default changed?                                      | [L24 — schema defaults vs backfill](../troubleshooting.md#values-that-do-not-update)                                            |
| Every multiselect/select backed by a data file uses `values: data.*`?                              | [L3/L25 — data-backed selects](../../cloudcannon-configuration/SKILL.md#common-mistakes)                                        |
| Every standalone-placed registered component wrapped with `<editable-component>` at the call site? | [Standalone-wrapper rule](../visual-editing-reference.md#where-does-the-registration-go--component-root-or-call-site)           |
| Every button gate uses `label?.trim() &&`, not multi-field `&&` chains?                            | [L11/L17 — button conditionals](../visual-editing-reference.md#section-titles-and-buttons-in-child-components)                  |
