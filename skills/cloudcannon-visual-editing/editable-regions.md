# Editable Regions — Overview

> Documented against `@cloudcannon/editable-regions` v0.1.x. If the package has had a major version bump, these docs may need refreshing.

`@cloudcannon/editable-regions` is a client-side system that makes elements on a page interactive within CloudCannon's Visual Editor. It scans the DOM for specially-annotated elements and connects them to CloudCannon's JavaScript API for live editing.

For SSG-specific integration details, see the visual-editing doc in the relevant SSG directory (e.g. [astro/visual-editing.md](astro/visual-editing.md)).
For deep internals, lifecycle traces, and the JavaScript API reference, see [editable-regions-internals.md](editable-regions-internals.md) — only needed when debugging unexpected behavior.

---

## Region Types

### Primitive vs component regions

**Primitive** region types (`text`, `image`, `array`, `array-item`, `source`) each target a specific kind of value or control. They update their own slice of the live DOM directly and do not need a registered component renderer.

**Component** regions (and **snippet**, which extends component) re-render from structured data so the whole template slice can stay in sync—text, images, arrays, styles, and derived markup. That broad catch-all is not a substitute for primitives in the markup: nest **text**, **array**, **image**, and so on inside a component when you want **inline on-canvas** editing (e.g. rich text on the page, array CRUD on the page). Authors can still change the same fields from the **data panel or modal**; matching region types are what add direct on-page controls. Nesting primitives inside components is normal—the component handles data-driven re-renders while nested regions supply the inline editors.

**Precedence:** A primitive that binds a `data-prop` (or equivalent) to a subtree usually **wins** for that subtree’s live value: updates follow frontmatter through the region and can override what a component-level transform would show on the same node. With **no** primitive on that markup, the component re-render owns how the value is derived. A typical split is an **array** region for list CRUD plus nested **text** (or other primitives) on the fields you want on the canvas; rows can still rely on the component template for anything without its own primitive.

For when to wrap a section in a component at all, see [When to Use a Component Editable Region](#when-to-use-a-component-editable-region).

### EditableText
Inline rich text editor (ProseMirror-based). Supports `data-type` of `"span"` (inline), `"text"` (plain text), or `"block"` (block-level rich text).

### EditableImage
Image editing via CloudCannon's data panel. The region **host** is either (1) an `<img>` with `data-editable="image"` and path attributes on that same element, or (2) a non-`img` host (`<editable-image>`, `<div data-editable="image">`, layout wrapper, etc.) that contains a descendant `<img>`. The resolved `<img>` is what gets live `src` / `alt` / `title` updates — each facet can be bound independently via `data-prop-src`, `data-prop-alt`, `data-prop-title`, or together via `data-prop` (for object image fields).

### EditableComponent
Re-renders a component when its data changes so the rendered slice updates holistically from that data. Requires a renderer registered through your SSG’s `@cloudcannon/editable-regions` integration (Astro: `registerAstroComponent`). Diffs new HTML into the live DOM rather than replacing wholesale, preserving focused editors and live state.

### EditableArray & EditableArrayItem
On the page, manages ordered lists with full CRUD (add, remove, reorder) and drag-and-drop. Array items on their own don't re-render contents — adding `data-component` to an array item element enables component re-rendering alongside the CRUD controls. For complex arrays, the array wrapper needs `data-component-key` and optionally `data-id-key` to declare which data fields identify each item’s type and stable identity (see [Complex array attributes](#complex-array-attributes-wrapper-vs-item)). Use `<editable-array-item>` when no suitable HTML container exists.

### EditableSource
Edits raw HTML source files rather than frontmatter. Uses `data-path` (file path) and `data-key` (unique identifier) instead of `data-prop`. Reads/writes the full source file via the CloudCannon file API.

### EditableSnippet
Extends `EditableComponent` for editing snippets within rich text content. Manages its own data locally and dispatches `snippet-change` events.

---

## When to Use a Component Editable Region

Primitive editables (text, image, array, source) handle their own DOM updates but can't trigger re-rendering of the surrounding template. Use a component when a section has:

- **Conditional elements** — a button that appears/disappears based on a boolean
- **Style or class bindings** — alternating background colours, layout order driven by index
- **Computed/derived content** — a badge or label that changes based on another field

**When in doubt, prefer a component.** The cost is one registration call and a wrapper element. The benefit is that every data-driven change live-updates.

---

## Quick Attribute Reference

| Attribute | Values | Purpose |
|---|---|---|
| `data-editable` | `text`, `image`, `array`, `array-item`, `component`, `source` | Declares the region type |
| `data-prop` | Path string | Data path for the editable value. Use `@content` to target the file's markdown body (not frontmatter) — this is the only valid path for body content |
| `data-prop-*` | Path string | Per-attribute binding: the suffix after `data-prop-` names the attribute or logical field being edited; path-string rules match `data-prop`. On **image** regions the usual cases are `data-prop-src`, `data-prop-alt`, and `data-prop-title`. The same pattern applies elsewhere where the visual editor supports binding that attribute for the region type — it is not limited to images, but not every attribute is available on every region. |
| `data-type` | `span`, `text`, `block` | Text editor mode |
| `data-component` | Component key | Component identifier for re-rendering lookup |
| `data-id-key` | Key name | On the **array wrapper**: which data field uniquely identifies each item. Defaults to `data-component-key` value when omitted (Dec 2025) |
| `data-component-key` | Key name | On the **array wrapper**: which data field identifies the component type for each item |
| `data-id` | ID value | On each **array item**: the resolved identity value for this specific item. Defaults to `data-component` when omitted |
| `data-path` | File path | Source file path (for `EditableSource`) |
| `data-key` | Unique key | Identifier within a source file |
| `data-defer-mount` | *(presence)* | Lazy initialization — editor mounts on first click |
| `data-cloudcannon-ignore` | *(presence)* | Exclude element from scanning |

Use `data-prop-*` when the main `data-prop` value would be the wrong shape (e.g. string path for `src` while `alt` lives in another field) or when only one facet of a composite value should be wired to data. Prefer a single `data-prop` when the stored value is already one object the editor understands.

### Complex array attributes (wrapper vs item)

These attributes wire **complex** arrays (e.g. page builders) so the Visual Editor can add, reorder, and re-render rows. They are SSG-agnostic; only the registration API differs by stack.

- **`data-component-key`** (on the **array wrapper**): Name of the field **in each array item’s data object** whose value selects **which client-rendered component** handles that row (e.g. `_type` → `hero`). The editor uses it when the array is empty or when inserting a new row.
- **`data-id-key`** (on the **array wrapper**): Name of the field used as a **stable identity** for matching DOM nodes to data items across reorder/add/remove. Often the same field as `data-component-key`; when omitted, it defaults to the same value as `data-component-key` (Dec 2025).
- **`data-component`** (on each **array item**): The **resolved** component key for that row. It must match the string registered for that renderer in your SSG’s editable-regions setup (Astro example: `registerAstroComponent('hero', Hero)` → `data-component="hero"`).
- **`data-id`** (on each **array item**): The **resolved** stable id for that row, taken from the field named by `data-id-key`. When omitted, it defaults to the same value as `data-component` (Dec 2025).

CloudCannon uses **`data-id` / `data-id-key`**, not a separate `data-component-id` attribute.

For when to add HTML `<template>` children on the array wrapper versus relying on component registration, see the visual-editing guide for your SSG (e.g. [astro/visual-editing.md](astro/visual-editing.md) § Array editing).

### Custom Element Equivalents

| Custom Element | Equivalent |
|---|---|
| `<editable-text>` | `<span data-editable="text">` |
| `<editable-image>` | `<div data-editable="image">` |
| `<editable-component>` | `<div data-editable="component">` |
| `<editable-array-item>` | `<div data-editable="array-item">` |
| `<editable-source>` | `<div data-editable="source">` |

Both forms produce identical behaviour. Custom elements self-hydrate via `connectedCallback`.

**Authoring preference:** For **wrapper-only** hosts (markup whose only job is to carry the region), prefer the custom elements in this table over a bare `<span data-editable="text">` or `<div data-editable="image">` — same behaviour, and the tag is less likely to collide with layout CSS. When a **semantic or layout element** is already the right host (`<h1>`, `<p>`, `<section>`, etc.), keep `data-editable` on that element instead. Use explicit `span`/`div` primitives when a stylesheet or third-party component already targets those tags, or when a one-off constraint makes that clearer. Astro-specific patterns (slots, links, templates) are worked through in [astro/visual-editing.md](astro/visual-editing.md).
