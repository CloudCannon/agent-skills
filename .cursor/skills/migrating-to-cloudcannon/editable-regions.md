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

For when to wrap a section in a component at all, see [When to Use a Component Editable Region](#when-to-use-a-component-editable-region).

### EditableText
Inline rich text editor (ProseMirror-based). Supports `data-type` of `"span"` (inline), `"text"` (plain text), or `"block"` (block-level rich text).

### EditableImage
Image editing via CloudCannon's data panel. Expects a child `<img>` element. Manages `src`, `alt`, and `title` — each can be bound independently via `data-prop-src`, `data-prop-alt`, `data-prop-title`, or together via `data-prop` (for object image fields).

### EditableComponent
Re-renders a component when its data changes so the rendered slice updates holistically from that data. Requires a registered renderer function (e.g. via `registerAstroComponent`). Diffs new HTML into the live DOM rather than replacing wholesale, preserving focused editors and live state.

### EditableArray & EditableArrayItem
On the page, manages ordered lists with full CRUD (add, remove, reorder) and drag-and-drop. Array items on their own don't re-render contents — adding `data-component` to an array item element enables component re-rendering alongside the CRUD controls. For complex arrays, the array wrapper needs `data-component-key` and optionally `data-id-key` to declare which data fields identify items. Use `<editable-array-item>` when no suitable HTML container exists.

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
| `data-prop` | Path string | Data path for the editable value |
| `data-prop-src` / `data-prop-alt` / `data-prop-title` | Path string | Per-attribute image bindings |
| `data-type` | `span`, `text`, `block` | Text editor mode |
| `data-component` | Component key | Component identifier for re-rendering lookup |
| `data-id-key` | Key name | On the **array wrapper**: which data field uniquely identifies each item. Defaults to `data-component-key` value when omitted (Dec 2025) |
| `data-component-key` | Key name | On the **array wrapper**: which data field identifies the component type for each item |
| `data-id` | ID value | On each **array item**: the resolved identity value for this specific item. Defaults to `data-component` when omitted |
| `data-path` | File path | Source file path (for `EditableSource`) |
| `data-key` | Unique key | Identifier within a source file |
| `data-defer-mount` | *(presence)* | Lazy initialization — editor mounts on first click |
| `data-cloudcannon-ignore` | *(presence)* | Exclude element from scanning |

### Custom Element Equivalents

| Custom Element | Equivalent |
|---|---|
| `<editable-text>` | `<span data-editable="text">` |
| `<editable-image>` | `<div data-editable="image">` |
| `<editable-component>` | `<div data-editable="component">` |
| `<editable-array-item>` | `<div data-editable="array-item">` |
| `<editable-source>` | `<div data-editable="source">` |

Both forms produce identical behaviour. Custom elements self-hydrate via `connectedCallback`.
