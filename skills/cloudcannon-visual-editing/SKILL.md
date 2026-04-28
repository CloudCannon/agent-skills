---
name: cloudcannon-visual-editing
description: >-
  Use when adding Visual Editor support to a CloudCannon site, setting up
  editable regions, debugging visual editing issues, or making page sections
  editable in the CloudCannon preview.
---

# CloudCannon Visual Editing

`@cloudcannon/editable-regions` makes page elements interactive in CloudCannon's Visual Editor. Covers the editable regions API, integration setup, and SSG-specific patterns for wiring up text, image, array, and component editables.

## When to use

- Adding Visual Editor support to a new or existing CloudCannon site
- Making page sections editable (text, images, arrays, components)
- Setting up component re-rendering for live preview
- Debugging editable regions that aren't appearing or updating
- Adding editable regions to shared partials backed by data files

## Docs

| Doc                                                            | When to read                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [editable-regions.md](editable-regions.md)                     | Start here. Region types, attribute reference, when to use components vs primitives |
| [editable-regions-internals.md](editable-regions-internals.md) | Only when debugging. Lifecycle traces, JavaScript API reference                     |

**SSG-specific:**

| SSG   | Doc                                                                    | Purpose                                                                    |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Astro | [astro/visual-editing.md](astro/visual-editing.md)                     | Setup workflow, section census, infrastructure + completeness checklists   |
| Astro | [astro/visual-editing-reference.md](astro/visual-editing-reference.md) | Pattern reference (read sections on demand as the checklist links to them) |

**Scripts:**

| Script                                                                 | Purpose                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [scripts/setup-editable-regions.sh](scripts/setup-editable-regions.sh) | Installs package, wires Astro integration, creates `registerComponents.ts` stub |

## Workflow

See the SSG-specific workflow doc (e.g. [astro/visual-editing.md](astro/visual-editing.md)) — it owns the setup steps, section census format, and the completeness checklist. Region-type reference and attribute details live in [editable-regions.md](editable-regions.md).

## Checklists are mandatory

**MUST:** read the SSG workflow doc's completeness checklist before starting, then verify every item before marking the phase done.
**Why:** visual editing silently degrades — an unregistered component, a missing nested editable inside an array, or a sidebar-only section without a documented justification all look fine until an editor opens the page.
