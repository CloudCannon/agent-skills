# Content (Hugo)

Phase 3: make content files CMS-friendly without changing what Hugo builds. Rebuild after each change and compare the output against the parity baseline saved in the audit ([audit.md § 1](audit.md#1-hugo-version-modules-and-themes)).

## When to skip this phase

Skip it when every section's front matter is already consistent, no page needs converting to a page builder, and no data file needs reshaping.

## Review checklist

### Keep Hugo's file conventions

- **MUST NOT:** rename `_index.md`. It is how Hugo makes a list page; `index.md` makes a leaf bundle instead, and the section stops listing its pages.
- **MUST NOT:** flatten a leaf bundle (`post/index.md` + resources) — its `.Resources` stop resolving. `[full_slug]` already handles its URL ([collection-urls.md § Page bundles](../../cloudcannon-configuration/hugo/collection-urls.md#page-bundles)).
- **Keep** each file's front matter format. Don't convert TOML to YAML to tidy up — it's a diff in every file for no editor benefit.

### Front matter consistency

- **Required fields present in every file** — Hugo tolerates missing keys, so templates often paper over them with `default` or `with`. Add the key to every file (empty if need be) so the schema and the sidebar agree.
- **Every key in the schema** — each key any file uses (`params`, `menu`, `resources`, `cascade`) is in the collection's schema file, and each key whose schema default would change behaviour (`draft: true`) is explicit in existing files. The first edit writes the schema into the file — see [configuration-gotchas.md § The first edit writes every schema key](../../cloudcannon-configuration/configuration-gotchas.md#the-first-edit-writes-every-schema-key).
- **`draft`** — present on every file in collections that use it, so the sidebar shows the switch consistently.
- **Dates** — one format across a section. Hugo parses several, but editors see whatever the file holds.
- **Image paths** — one convention per input, matching how the template reads it (see [configuration.md § Images](../../cloudcannon-configuration/hugo/configuration.md#images)).
- **Numbers shown as text** — quote them ([configuration-gotchas.md § Quote numbers](../../cloudcannon-configuration/hugo/configuration-gotchas.md#quote-numbers-a-text-region-displays)).
- **Routing overrides** — if some files in a section set `slug:` and others don't, make it uniform ([collection-urls.md § Front matter that changes the URL](../../cloudcannon-configuration/hugo/collection-urls.md#front-matter-that-changes-the-url)).

### Field naming

Front matter keys reach templates through `.Params`, which lowercases them — `.Params.heroImage` and `.Params.heroimage` are the same key. Pick one spelling per field and use it in content, schemas, `_inputs` and `data-prop` alike.

**Common miss:** a `data-prop` path is matched against the file's stored keys, not Hugo's lowercased view. Match the case the content file uses.

### Taxonomies stay top-level

Leave `tags`, `categories` and other taxonomy keys at the top level of the front matter, even when grouping a component's fields under one key — see [configuration-gotchas.md § Keep taxonomies top-level](../../cloudcannon-configuration/hugo/configuration-gotchas.md#keep-taxonomies-top-level).

### Hardcoded layout content → front matter

A layout that hardcodes sections (a home page built directly in `layouts/index.html`) becomes a page-builder entry: move the copy into `content_blocks` in the page's content file, and the markup into partials. See [page-building.md](page-building.md).

A content file whose body is mostly layout shortcodes converts the same way: each layout shortcode becomes a block partial copying its markup, and its arguments become the block's fields. Inline shortcodes stay in the body as snippets. Which is which, and the traps in copying a shortcode into a partial, are in [audit.md § 4](audit.md#4-layouts-and-partials).

- **Extract** one block at a time, and rebuild after each.
- **Keep** presentation in the partial — class names, SVG, layout `<br>` — and only copy into content what an editor should change. See [visual-editing-reference.md § Where does a value belong](../../cloudcannon-visual-editing/visual-editing-reference.md#where-does-a-value-belong--frontmatter-structure-value-default-or-hardcoded).
- **Quote** YAML strings that start with a special character (`*`, `&`, `:`, `#`, `{`, `[`) or contain `: `.

### Archetypes

Align each `archetypes/<section>.md` with the section's schema file, so `hugo new content` and CloudCannon's Add create the same front matter. For a bundle section, the archetype is used as `hugo new content <section>/<name>/index.md`.

### Data files

- **Reshape** a data file of like-shaped items into a top-level array if it is a map keyed by slug. Update every template that reads it (`range $key, $item := hugo.Data.x` → `range hugo.Data.x`).
- **Move** hardcoded shared UI (footer copy, nav labels, CTA text) out of partials into a `data/` file, so it has one place to edit — see [cc-friendly-conventions.md § Shared-UI treatment table](../cc-friendly-conventions.md#shared-ui-treatment-table) for which treatment each shared section gets.

## Verify

- [ ] `hugo` builds with no new warnings
- [ ] Page count in `public/` matches the parity baseline
- [ ] Text and `<img>` count per page match the parity baseline
- [ ] `.cloudcannon/migration/content.md` records every structural change
