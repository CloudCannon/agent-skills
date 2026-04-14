# Visual Editing Notes

## Scroll-Reveal Fix

Three-layer approach:
1. **CSS override** -- `.cms-editor-active .reveal` in `global.css` forces visibility
2. **ENV_CLIENT guard** -- `WidgetWrapper.astro` skips `.reveal` class in client re-renders
3. **inEditorMode guard** -- `BaseLayout.astro` scroll animation script adds `.active` immediately in editor mode

## Content2 Slot-to-Prop Conversion

Original Content2 accepted rich HTML via `<Fragment slot="default">`. Converted to a `content` string prop rendered with `set:html`. This allows the content to be stored in frontmatter and edited via `data-editable="text" data-type="block" data-prop="content"`.

## Sub-Arrays

All widget components have inline array editing:
- Hero: `actions` array
- Features: `features` array
- Content2: `items` array, `actions` array
- ServiceList: `services` array
- Values: `items` array

Each has `data-editable="array"` on the container, `data-editable="array-item"` on each item, and nested `data-editable="text"` on title/description fields. No `<template>` blueprints needed since all are inside registered components.

## Blog Post Editables

- Title: inline text (`data-editable="text" data-prop="title"`)
- Author: inline text (`<editable-text data-prop="author">`)
- Image: image picker (`data-editable="image" data-prop-src="image"`)
- Body: block rich text (`data-editable="text" data-type="block" data-prop="@content"`)
- Date: sidebar-only (datetime picker, not text editable)
