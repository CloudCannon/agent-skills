# Collection URLs

Collections that produce pages need a `url` pattern so CloudCannon can open them in the visual editor and display the correct URL in the collection file list. **A wrong `url` is the most common reason a page fails to load in the visual editor.** If the visual editor shows a blank page or the wrong page for a supported file type, check the `url` pattern first -- including the trailing slash.

## The rule

**MUST:** write each collection's `url` as a template that computes, for **every** file in the collection, the exact path the SSG builds that file at. Read the SSG's routing (route files, permalinks, `slug`/`url` front matter, trailing-slash settings) and express it with placeholders and filters: fixed placeholders first, then filters, date parts and literal prefixes.
**Why:** CloudCannon opens the Visual Editor at the computed URL. If it differs from the built path by one segment, the preview stays on "Loading page..." or shows a different page, and nothing reports an error. `cloudcannon validate` doesn't check it.

**MUST NOT:** add `slug`, `url` or `permalink` front matter to files that didn't have it, just to steer the URL, when a template could compute the path from the file's location.
**Why:** editors then have to keep that field in step with the file by hand, and a new file created without it builds at the wrong URL. A placeholder like `[slug]` or `[full_slug]` follows a rename on its own.

When no template can express the built path, changing the content is fine: renaming or moving files so their location gives the path, for example. Ask the user first, because editors will see the change.

This applies to files that build a page. A collection whose files don't (data, settings, authors with no profile page) sets `disable_url: true` instead. A draft or future-dated file isn't built yet, but the template must still give the path it builds at once published. A file that never builds a page, such as a fragment a layout includes, goes in a collection with `disable_url: true`, or is excluded.

Verify with [§ Check every file against the build](#check-every-file-against-the-build).

## Fixed placeholders

Use square brackets for fixed (filename-based) placeholders:

- `[slug]` -- filename without extension. If the filename is `index`, resolves to an empty string.
- `[filename]` -- filename with extension.
- `[relative_base_path]` -- the file's directory, relative to the collection path (empty for a file at the collection root).
- `[full_slug]` -- alias for `[relative_base_path]/[slug]`.
- `[collection]` -- the collection key name.
- `[ext]` -- the file extension.

```yaml
pages:   url: "/[slug]/"
blog:    url: "/blog/[slug]/"
authors: url: "/authors/[slug]/"
```

A `pages` collection with `url: "/[slug]/"` produces `/` for `index.md` and `/about/` for `about.md`.

## Data placeholders (frontmatter fields)

Use curly braces to reference frontmatter data. This is essential when the output URL is derived from a frontmatter field rather than the filename -- a common pattern where templates use a `slug`, `permalink`, or `title` field to control the output path.

```yaml
blog:    url: "/posts/{slug}/"
news:    url: "/news/{category|slugify}/{title|slugify}/"
```

**Filters** are applied with `|` after the key name. Multiple filters can be chained. They work on fixed placeholders too: `[full_slug|lowercase]`. Full reference: [CloudCannon template strings docs](https://cloudcannon.com/documentation/developer-articles/configure-your-template-strings/).

Common filters for URLs:

- `slugify` -- converts non-alphanumeric characters to hyphens, collapses sequential hyphens, strips leading/trailing hyphens
- `lowercase` / `uppercase` -- case transformation
- `year`, `month`, `day` -- extract date parts (2-digit month/day, 4-digit year)
- `default=value` -- fallback when the field is empty
- `truncate=N` -- limit to N characters

**Nested keys and arrays** are supported: `{seo.description}` for nested objects, `{tags[0]}` for specific array items, `{tags[*]}` for all items (joined with `, `).

**When to use data placeholders:** During the audit, check how the SSG generates output URLs. If the routing uses a frontmatter field (e.g. Astro's `getStaticPaths` returns `params: { slug: post.data.slug }`, or a Hugo page sets `slug:` or `url:` in front matter, rather than using the filename), use `{field}` in the CloudCannon `url`. Compare every file against its path in the build output (`dist/`, `public/`, `_site/`, `out/`) -- if they don't match, the URL is frontmatter-driven.

## Content in subdirectories within a collection

**Symptom:** A post's output URL is `/posts/examples/my-post/` but the `{slug}` placeholder resolves to just `my-post` — the subdirectory is missing from the rendered URL and the Visual Editor can't open the page.

**Detect:** Compare build output paths against the `{slug}` values. If they diverge, the SSG's routing utility is prepending the subdirectory.

### Fix options

First try to template the subdirectory: `[relative_base_path]` is the file's folder inside the collection, and `[full_slug]` is that folder plus `[slug]`. Use the options below only when the built path can't be computed from the file's location and its existing front matter.

| Fix                             | How                                                                                                                                     | Use when                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefix the frontmatter `slug`   | Include the subdirectory in the slug value (`slug: examples/my-post`). Check the SSG's routing utility doesn't double-up the directory. | Every file already sets the `slug` the SSG routes by, and the subdirectory is small (example posts, archived posts). Keeps the collection unified.   |
| Split into separate collections | Give the subdirectory its own CC collection with a URL pattern that includes the prefix (`url: "/posts/examples/{slug}/"`).             | The subdirectory represents a genuinely different content type with its own editorial workflow, or is large enough to warrant its own sidebar entry. |

**Note:** Directories prefixed with `_` (e.g. `_releases/`) are often excluded from SSG routing — their posts get URLs without the directory prefix and work fine with plain `{slug}`. Check the SSG's path utility for `_`-prefix filtering before applying either fix.

## Files that don't follow the collection's pattern

Some files in a collection's folder build somewhere the collection's `url` can't express: usually an index or list page (`src/content/blog/index.md`) that builds at the section path while the items follow a dated or prefixed pattern. Don't bend the template around them:

| Choice                                   | When                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Exclude it from the collection           | Editors don't need to edit it (a list page with only a title). It's no longer editable                                         |
| Move it to a collection whose `url` fits | Editors need it. Moving the file is a content change, and the route that reads it may need updating too, so ask the user first |

Then check where the excluded file lands. A collection whose `path` is a parent folder of this one picks it up, so it isn't hidden — see [configuration-gotchas.md § Overlapping collections](configuration-gotchas.md#overlapping-collections-each-file-lands-in-one). In the usual Astro layout, `pages` (`src/content/pages`) sits beside `blog`, so nothing picks it up. Where `pages` is the parent folder (Hugo's `content`, Eleventy's input directory), the file falls through to it, which can be the fix — for Hugo, see [hugo/configuration.md § Section collections](hugo/configuration.md#section-collections).

## Check every file against the build

**MUST:** before hand-off, build the site and compare the computed URL with the built path for every file in every collection that has a `url`. Check every file, not a sample, including index pages and files in subfolders.
**Why:** a pattern that's right for one post can be wrong for its sibling in a subfolder, for a folder-per-post entry, or for a list page. A sample hides exactly those files.

1. List each file's built path. Use the SSG's own listing where there is one (Hugo: `hugo list all`; Eleventy: `npx @11ty/eleventy --to=json`). Otherwise list the output directory.
2. Compute each file's URL from its collection's `url`, using its path and front matter.
3. Every row must match exactly, trailing slash included. When one doesn't, fix the template ([§ The rule](#the-rule)). A file missing from the build is a draft, future-dated, or never builds a page — see [§ The rule](#the-rule) for each.

When Phase 3 creates a collection's files, check each planned file's URL against its planned route in Phase 2. Phase 3 re-runs the check on the real files.

## Troubleshooting

If a page doesn't load in the visual editor:

1. **Check the `url` pattern** -- compare the configured URL against the actual build output (`dist/`, `public/`, `_site/`, `out/`). The most common issues are wrong placeholders (`[slug]` vs `{slug}`) and wrong prefix paths.
2. **Check the trailing slash** -- a missing or extra trailing slash causes a mismatch. Compare against the SSG's trailing-slash setting (Astro: `build.format`; Hugo: `uglyURLs`; Eleventy: none, only a `permalink` ending in a file name; Next.js: `trailingSlash`).
3. **Check fixed vs data placeholders** -- `[slug]` is the filename; `{slug}` is the frontmatter `slug` field. If the SSG uses a frontmatter field for routing, you need curly braces.
4. **Build and inspect** -- when in doubt, build the site and inspect the output directory to see the actual output paths.

## SSG-specific details

- **Astro**: [astro/collection-urls.md](astro/collection-urls.md) — glob loader `slug` override, trailing slash rules.
- **Hugo**: [hugo/collection-urls.md](hugo/collection-urls.md) — `[full_slug]`, `_index.md`, page bundles, overlapping collections.
- **Eleventy**: [eleventy/collection-urls.md](eleventy/collection-urls.md) — default paths, `permalink` front matter and directory data files, `--to=json`.
- **Next.js**: [nextjs/collection-urls.md](nextjs/collection-urls.md) — route segments, `trailingSlash`, `.html` paths, the home page.
