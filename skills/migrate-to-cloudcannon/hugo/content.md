# Content (Hugo)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Hugo differences: Hugo's file conventions, page bundles, `.Params` and Hugo's data files.

Make content files CMS-friendly without changing what Hugo builds. Rebuild after each change and compare the output against the parity baseline saved in the audit ([audit.md § 1](audit.md#1-hugo-version-modules-and-themes)).

## Review checklist

### Keep Hugo's file conventions

- **MUST NOT:** rename `_index.md`. It is how Hugo makes a list page; `index.md` makes a leaf bundle instead, and the section stops listing its pages.
- **MUST NOT:** flatten a leaf bundle (`post/index.md`) that still holds resources — its `.Resources` stop resolving. Once its images move out ([§ Page-bundle images](#page-bundle-images)), leave `index.md` where it is: `[full_slug]` already handles its URL ([collection-urls.md § Page bundles](../../cloudcannon-configuration/hugo/collection-urls.md#page-bundles)).
- **Keep** each file's front matter format. Don't convert TOML to YAML to tidy up — it's a diff in every file for no editor benefit.

### Page-bundle images

Move images out of page bundles into `static/images/`, unless the user chose to keep bundles in the audit ([audit.md § 2](audit.md#2-content-sections)). The mount and upload paths are in [configuration.md § Images](../../cloudcannon-configuration/hugo/configuration.md#images).

- **Move** each bundle image into `static/images/`, named `<post folder>-<file name>`: `content/blog/first-post/cover.jpg` becomes `static/images/first-post-cover.jpg`.
  **Why:** bundles reuse a few names (`cover.jpg`, `featured.png`), and one folder can't hold two files with one name. The prefix also tells editors in the image browser which post an image belongs to.
- **Rewrite** each front matter value to the new path: `cover: cover.jpg` becomes `cover: /images/first-post-cover.jpg`.
- **Rewrite** each relative image link in the body (`![](diagram.png)`, a shortcode's `src="diagram.png"`) to the new path.
- **Switch** every `.Resources.Get` and `.Page.Resources.Get` that reads a moved image to `resources.Get`, in templates, shortcodes and render hooks. Change a theme template by copying it to the same path under the project's `layouts/`.
- **Replace** a lookup by pattern (`.Resources.GetMatch "*feature*"`, `.Resources.ByType "image"`) with an explicit front matter field.
- **Set** `images: [/images/first-post-featured.jpg]` on each post whose featured image moved, when the site uses Hugo's built-in `opengraph` or `twitter_cards` template.
  **Why:** those templates take the image from `images`, or else from a bundle file named `*feature*`, `*cover*` or `*thumbnail*`. Once the file moves, `og:image` disappears with no error.
- **Delete** each moved file from its bundle.

### Front matter consistency

- **Missing keys** — Hugo tolerates them, so templates often paper over them with `default` or `with`. Those fallbacks are invisible to editors.
- **Hugo's own keys** — `params`, `menu`, `resources` and `cascade` count as keys any file uses, so they go in the schema file too.
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

Extract one block at a time and rebuild after each, following [../content.md § Page-builder content](../content.md#page-builder-content).

### Archetypes

Align each `archetypes/<section>.md` with the section's schema file, so `hugo new content` and CloudCannon's Add create the same front matter. For a bundle section, the archetype is used as `hugo new content <section>/<name>/index.md`.

### Data files

- **Reshape** a map keyed by slug into a top-level array ([../content.md § Data collections](../content.md#data-collections)), and update every template that reads it: `range $key, $item := hugo.Data.x` → `range hugo.Data.x`.
- **Move** hardcoded shared UI out of partials into a `data/` file ([../content.md § Settings in code → data files](../content.md#settings-in-code--data-files)).

## Verify

- [ ] `hugo` builds with no new warnings
- [ ] Page count in `public/` matches the parity baseline
- [ ] Text and `<img>` count per page match the parity baseline
- [ ] No `<img>` in `public/` has an empty `src`, and `og:image` tags match the parity baseline, after moving bundle images
