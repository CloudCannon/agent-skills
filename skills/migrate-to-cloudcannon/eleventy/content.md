# Content (Eleventy)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Eleventy differences: page files, directory data, computed data and data-file formats.

Make content files CMS-friendly without changing what Eleventy builds. Rebuild after each change and compare the output against the parity baseline saved in the audit ([audit.md § 1](audit.md#1-eleventy-version-config-and-directories)).

## Review checklist

### Keep Eleventy's file conventions

- **Keep** each page file's name and extension. Renaming a page file changes its URL unless it sets `permalink`, and changing its extension changes the engine that renders its body.
- **Keep** `permalink` where the audit found it. Don't add `permalink` to files to steer the collection `url` — see [collection-urls.md](../../cloudcannon-configuration/eleventy/collection-urls.md).

### JavaScript front matter

CloudCannon reads YAML, TOML and JSON front matter, not `---js`. For each `---js` file in a collection:

- **Convert** a block of plain literals (`const title = "…"`, objects, arrays) to YAML with the same keys and values. Eleventy reads both the same way.
- **Ask the user** about a block that computes values, defines functions or imports modules. The usual answer moves the logic to `eleventyComputed` in a directory data file, so the file keeps only stored values.

Files outside every collection keep their `---js`.

### Values set outside the file

Eleventy fills page data from directory data files (`*.11tydata.json`, `*.11tydata.js`), layout front matter and `eleventyComputed`. Editors see only what the page's own file holds. For each value the audit listed:

| The value is                                                         | Do                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Plumbing the developer owns (`layout`, `tags`, `permalink` patterns) | Leave it where it is                                                                          |
| Content an editor should change per page (an author, a hero image)   | Write it into each file's front matter, and add it to the schema                              |
| Content shared by every page in the folder                           | Move it to a data file in the data directory, and read it from there                          |
| Computed from other fields (`eleventyComputed`)                      | Leave it computed; if editors need to override it, add a stored field the computation prefers |

**Why:** a value with no stored path renders in the editor but can't be edited through the page — see [Data paths in Eleventy](../../cloudcannon-visual-editing/eleventy/visual-editing-reference.md#data-paths-in-eleventy).

### Front matter consistency

- **Missing keys** — Liquid and Nunjucks print nothing for a missing key, so templates often paper over them with `default` filters or `if` blocks. Those fallbacks are invisible to editors; follow [../content.md § Front matter consistency](../content.md#front-matter-consistency).
- **Eleventy's own keys** — `tags`, `layout`, `permalink`, `eleventyNavigation` and `eleventyExcludeFromCollections` count as keys a file uses, so they go in the schema file when page files carry them.
- **Image paths** — one convention per input, matching the passthrough-copy directory and how the template reads the value.
- **Numbers shown as text** — quote them ([Value types per region](../../cloudcannon-visual-editing/editable-regions.md#value-types-per-region)).

### Hardcoded layout content → front matter

A layout or page file that hardcodes sections becomes a page-builder entry: move the copy into `content_blocks` in the page file's front matter, and the markup into includes. The page file keeps its name and holds front matter only; its `layout` points at the layout with the dispatcher. See [page-building.md](page-building.md).

A Markdown file whose body is mostly layout shortcodes converts the same way: each layout shortcode becomes a block include copying its output, and its arguments become the block's fields. Inline shortcodes stay in the body as snippets.

Extract one block at a time and rebuild after each, following [../content.md § Page-builder content](../content.md#page-builder-content).

### Data files

- **Move** editor-facing values out of JS data files into JSON or YAML in the data directory, and update every template that reads them. Keep JS data for values computed at build time. A JS data file that fetches an API is the [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files) case.
  **Why:** CloudCannon edits JSON and YAML files only.
- **Prefer** JSON for new data files. A YAML data file needs `addDataExtension("yml,yaml", …)` in the config; without it Eleventy skips the file, and every template reading it prints nothing.
- **Reshape** a map keyed by slug into a top-level array ([../content.md § Data collections](../content.md#data-collections)), and update every template that loops over it.
- **Move** hardcoded shared UI out of includes into a data file ([../content.md § Settings in code → data files](../content.md#settings-in-code--data-files)).

## Verify

- [ ] The full build runs with no new warnings
- [ ] Page count in `_site/` matches the parity baseline
- [ ] Text and `<img>` count per page match the parity baseline
- [ ] No page's URL changed: the list of built `index.html` paths matches the baseline
