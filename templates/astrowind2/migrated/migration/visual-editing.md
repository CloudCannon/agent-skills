# Visual Editing — AstroWind2

## ItemGrid description fields contain block-level HTML

`saas.md` uses `<ul>` lists inside `description` fields for Features2 items. The original `ItemGrid.astro` and `ItemGrid2.astro` rendered these inside `<p>` tags with inline-only text editables, which broke in two ways:

1. `<p>` can't contain `<ul>` — browsers auto-close the `<p>`, breaking the DOM and the editable region.
2. Without `data-type="block"`, only inline editing options appear, making the list uninteractable.

Fixed by changing `<p>` to `<div>` and adding `data-type="block"` on the description element in both `ItemGrid.astro` and `ItemGrid2.astro`.
