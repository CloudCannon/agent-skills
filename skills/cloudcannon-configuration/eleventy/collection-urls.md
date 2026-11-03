# Collection URLs (Eleventy)

Eleventy-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

**MUST:** make each collection's `url` resolve to the path Eleventy writes for every file in it ([../collection-urls.md § The rule](../collection-urls.md#the-rule)). Eleventy builds the path from the file's location under the input directory, unless a `permalink` replaces it. A `permalink` can come from the file's front matter, a directory data file (`blog/blog.11tydata.json`), global data or `eleventyComputed`; front matter wins over directory data. Check all of them in the audit.

## Default routing: `[full_slug]`

With no `permalink`, Eleventy writes a template to its path under the input directory, minus the extension, as `<path>/index.html`: `blog/sub/nested.md` builds to `blog/sub/nested/index.html`. Two kinds of file build to their folder instead, with no extra level: an `index` file, and a file named after its folder. `blog/my-post/index.md` and `blog/my-post/my-post.md` both build to `blog/my-post/index.html`. Eleventy keeps the file name exactly: case, spaces and a leading date stay in the URL. Folders starting with `_` build like any other; only the includes and data directories are skipped.

| File (collection `path`)                     | Eleventy writes                           | `url`                         |
| -------------------------------------------- | ----------------------------------------- | ----------------------------- |
| `src/about.md` (`src`)                       | `_site/about/index.html`                  | `/[full_slug]/`               |
| `src/index.md` (`src`)                       | `_site/index.html`                        | `/[full_slug]/`               |
| `src/blog/index.md` (`src/blog`)             | `_site/blog/index.html`                   | `/blog/[full_slug]/`          |
| `src/blog/sub/nested.md` (`src/blog`)        | `_site/blog/sub/nested/index.html`        | `/blog/[full_slug]/`          |
| `src/blog/my-post/index.md` (`src/blog`)     | `_site/blog/my-post/index.html`           | `/blog/[full_slug]/`          |
| `src/blog/2024-01-05-launch.md` (`src/blog`) | `_site/blog/2024-01-05-launch/index.html` | `/blog/[full_slug]/`          |
| `src/blog/my-post/my-post.md` (`src/blog`)   | `_site/blog/my-post/index.html`           | `/blog/[relative_base_path]/` |

One `url` can't cover both `my-post/my-post.md` and plain files in the same collection. When a collection mixes them, handle the minority form as in [../collection-urls.md § Files that don't follow the collection's pattern](../collection-urls.md#files-that-dont-follow-the-collections-pattern).

## `permalink` values

| `permalink`                                     | Eleventy writes                                                     | `url`                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `false`                                         | Nothing                                                             | `disable_url: true` on a collection of such files; otherwise exclude the file |
| `/contact/` on every file in the collection     | That path                                                           | `{permalink}`                                                                 |
| `contact/` (no leading slash)                   | `/contact/` — relative to the output root, not to the file's folder | `/{permalink}`                                                                |
| `/feed.html`, or any path ending in a file name | That file, with no trailing slash                                   | The same, ending in `.html`                                                   |
| A Liquid or Nunjucks expression                 | The rendered path                                                   | Translate it with [§ Permalink expressions](#permalink-expressions)           |

A `permalink` that ends in neither `/` nor a file extension fails the Eleventy 3 build, so a building site has none.

A file with `permalink: false` (often a draft, through `eleventyComputed` or a directory data file) still needs the URL it will build at once published — see [../collection-urls.md § The rule](../collection-urls.md#the-rule).

### Some files set `permalink`, the rest don't

When the files that set `permalink` give their full path and the rest follow the default, one template covers both:

```yaml
pages:
  path: src
  url: "/{permalink|if=permalink}[full_slug|unless=permalink]/"
```

`if=` and `unless=` are CloudCannon template-string filters: each part resolves only when the named key is truthy, or falsy. A missing key is falsy.

## Permalink expressions

Translate a `permalink` expression part by part, keeping its literal text as it is.

| Expression                                           | `url` part                                                                                                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{ page.fileSlug }}` on a flat file                 | `[slug\|strip_leading_date]`. Eleventy drops a leading `YYYY-MM-DD-` from `fileSlug`; CloudCannon's `strip_leading_date` filter does the same                                      |
| `{{ page.fileSlug }}` on `<folder>/index.md`         | `[full_slug]`, when the folder sits at the collection root: `fileSlug` is the folder name                                                                                          |
| `{{ title \| slugify }}`                             | Don't map it to `{title\|slugify}` — see [§ Title-based permalinks](#title-based-permalinks)                                                                                       |
| `{{ page.date \| date: "%Y" }}` and other date parts | `{date\|year}`, `{date\|month}`, `{date\|day}`, only when every file sets `date` in front matter. Otherwise Eleventy takes the date from the file name or the file's creation time |

### A directory data file sets the permalink

A `permalink` in `<folder>/<folder>.11tydata.json` (or `.js`) applies to every template in that folder and its subfolders, including the folder's own `index.md`. With `{"permalink": "/articles/{{ page.fileSlug }}/"}` on `src/posts/`:

| File                                       | Eleventy writes                      | `/articles/[slug\|strip_leading_date]/` gives |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------- |
| `src/posts/two.md`                         | `/articles/two/`                     | `/articles/two/`                              |
| `src/posts/2023-02-03-one.md`              | `/articles/one/`                     | `/articles/one/`                              |
| `src/posts/index.md`                       | `/articles/posts/` — the folder name | `/articles//` — doesn't fit                   |
| `src/posts/own.md` with `permalink: /own/` | `/own/` — front matter wins          | `/articles/own/` — doesn't fit                |

A folder's `index.md` under a `fileSlug` permalink usually builds somewhere nobody meant. Handle it, and any file that sets its own `permalink`, as in [../collection-urls.md § Files that don't follow the collection's pattern](../collection-urls.md#files-that-dont-follow-the-collections-pattern).

### Title-based permalinks

Prefer `page.fileSlug` permalinks over `{{ title | slugify }}`.
**Why:** with a title-based permalink, an editor who fixes a typo in the title moves the page. And `{title|slugify}` doesn't match Eleventy's `slugify`: Eleventy spells `&` as `and` and drops apostrophes (`Hello & World's Best` → `hello-and-worlds-best`), where CloudCannon turns each non-alphanumeric character into a hyphen.

To switch, ask the user first, then:

1. **Rename** each file to the segment it builds at now (from [§ Verify against the build](#verify-against-the-build)), with `git mv`.
2. **Change** the permalink to `{{ page.fileSlug }}` in the same place it was set.
3. **Rebuild** and compare the listing with the one from before. No published URL changes.

## Verify against the build

**MUST:** compare every collection file's computed URL with Eleventy's own URL before hand-off ([../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build)).

```sh
npx @11ty/eleventy --to=json   # [{ url, inputPath, outputPath, … }] for every template; writes nothing
```

- **Match** each `inputPath` to its collection, and the `url` to the collection `url` filled in for that file.
- **Expect** `url: false` for a file with `permalink: false`. It isn't a page now; check it against the URL it builds at once published.

## Trailing slash

Eleventy writes `<path>/index.html` unless a `permalink` names a file, so URLs end in `/`. There is no site-wide setting to change it. A `permalink` ending in `.html` builds a file, and its `url` ends in `.html` too.
