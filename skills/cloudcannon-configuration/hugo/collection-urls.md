# Collection URLs (Hugo)

Hugo-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

**MUST:** make each collection's `url` resolve to the path Hugo builds for every file in it ([../collection-urls.md § The rule](../collection-urls.md#the-rule)). Hugo builds the path from three inputs: the file's location, the site's `permalinks`, and `slug`/`url` front matter. Check all three in the audit, then template them as below.

## Default routing: `[full_slug]`, not `[slug]`

**MUST:** use `[full_slug]` for a section that has no `permalinks` entry and whose files set no `slug` or `url`. With a `permalinks` entry, see [§ Front matter that changes the URL](#front-matter-that-changes-the-url).
**Why:** by default Hugo's output path is the file's directory plus its name. `[slug]` is the filename alone, so any file in a subdirectory of the collection loses its directory; `[full_slug]` keeps it.

Hugo lowercases output paths (unless `disablePathToLower: true`), but `[full_slug]` keeps the folder's case. For a folder such as `docs/Getting-Started/`, use `/docs/[full_slug|lowercase]/` rather than renaming the folder.

| File (collection `path`)                      | `url`                  | Resolves to            |
| --------------------------------------------- | ---------------------- | ---------------------- |
| `content/about.md` (`content`)                | `/[full_slug]/`        | `/about/`              |
| `content/docs/guide/install.md` (`content`)   | `/[full_slug]/`        | `/docs/guide/install/` |
| `content/docs/guide/install.md` (`content`)   | `/[slug]/` — **wrong** | `/install/`            |
| `content/blog/first-post.md` (`content/blog`) | `/blog/[full_slug]/`   | `/blog/first-post/`    |

## Page bundles

A leaf bundle — `content/blog/first-post/index.md` with its images beside it — builds to `/blog/first-post/`. `[slug]` is empty for a file named `index`, and `[full_slug]` is its directory, so `/blog/[full_slug]/` resolves correctly with no front matter changes.

**MUST NOT:** flatten a bundle that still holds resources. Its page resources (`.Resources.Get "cover.jpg"`) live in the bundle directory and stop resolving if the file moves. A migration flattens a bundle only once its images have moved out — see [migrate-to-cloudcannon/hugo/content.md § Keep Hugo's file conventions](../../migrate-to-cloudcannon/hugo/content.md#keep-hugos-file-conventions).

A `permalinks` entry that drops the bundle's parent folders (`/:section/:year/:slugorcontentbasename/` over a section with subsections) builds the bundle at its directory name alone. No placeholder gives that: `[slug]` is empty and `[full_slug]` includes the parent folders. A flat file in the same place templates with `[slug]`, so flatten emptied bundles there. A bundle that keeps its resources needs `slug` on every file and `{slug}` in the `url`, which is a content change to ask the user about.

## `_index.md` — list pages and the home page

Hugo builds `content/_index.md` to `/` and `content/blog/_index.md` to `/blog/`. `[full_slug]` collapses `_index` the way it collapses `index`, so with `url: /[full_slug]/` the home page opens at `/` and each section list page at its list URL.

Whether `_index.md` belongs in its section's collection is a separate choice — see [configuration.md § Section collections](configuration.md#section-collections).

## Front matter that changes the URL

Hugo lets front matter override the path. Mirror each override in the CloudCannon `url`, or the Visual Editor opens the wrong page:

| Front matter or config                                                             | Hugo output                                                   | CloudCannon `url`                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug: my-post` on a file                                                          | Directory + `my-post`                                         | `/blog/{slug}/` — only if every file in the collection sets `slug`                                                                                                                                       |
| `url: /custom/path/` on a file                                                     | Exactly that path                                             | `{url}` — only if every file sets `url`                                                                                                                                                                  |
| `[permalinks] blog = "/:year/:month/:slug/"`                                       | Date-based path; `:slug` is the `slug` field, else the title  | `/{date\|year}/{date\|month}/{slug}/` when every file sets `slug`; otherwise see [§ When only some files set `slug`](#when-only-some-files-set-slug). `[slug]` is the file name, not Hugo's `:slug`      |
| `[permalinks] blog = "/:section/:year/:month/:contentbasename/"`, with subsections | `/blog/2024/05/my-post/` — the subsection folder is dropped   | `/blog/{date\|year}/{date\|month}/[slug]/` for flat files at any depth. A bundle doesn't fit — see [§ Page bundles](#page-bundles)                                                                       |
| `[permalinks] blog = "/:sections/:filename/"`                                      | Section path + filename                                       | `/blog/[full_slug]/`                                                                                                                                                                                     |
| `[permalinks] blog = "/posts/:slugorcontentbasename/"` (Hugo 0.144+)               | `slug`, else the file name — for a leaf bundle, its directory | `/posts/{slug}/` if every file sets `slug`; otherwise `/posts/[full_slug]/`, when the section holds only flat files and leaf bundles (no subsections). `[slug]` alone is empty for a bundle's `index.md` |

### Permalink tokens

Translate a `permalinks` pattern token by token, and keep its literal text as it is.

| Hugo token                | CloudCannon `url` part                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:year`, `:month`, `:day` | `{date\|year}`, `{date\|month}`, `{date\|day}`                                                                                                     |
| `:section`                | The section name as literal text (`blog`), for a collection rooted at that section                                                                 |
| `:sections`               | The section as literal text, then `[relative_base_path]`                                                                                           |
| `:contentbasename`        | `[slug]` for a flat file. For a leaf bundle it's the directory: `[full_slug]` only when no folders sit between                                     |
| `:slugorcontentbasename`  | `{slug}` if every file sets `slug`, as `:contentbasename` if none does. Mixed: [§ When only some files set `slug`](#when-only-some-files-set-slug) |
| `:slug`                   | `{slug}` if every file sets `slug`. Otherwise Hugo falls back to the title: [§ When only some files set `slug`](#when-only-some-files-set-slug)    |
| `:title`                  | `{title\|slugify}`, checked against the build                                                                                                      |
| `:filename` (deprecated)  | As `:contentbasename`                                                                                                                              |

### When only some files set `slug`

A pattern with `{slug}` fails for files without it, and no placeholder falls back from one to the other. Prefer URLs that come from the file name ([../collection-urls.md § The rule](../collection-urls.md#the-rule)): editors rename a file rather than keep a field in step, and new files take their name from `create.path`. Each fix below changes content or site config, so ask the user first.

- **When most files set `slug`**, or the section's archetype includes it, the site is committed to it. Add `slug` to the rest, set to the segment each file builds at now (from [`hugo list all`](#verify-against-hugo-list-all)), add it to the collection's schema file, and use `{slug}`.
- **When few or no files set `slug`**, and Hugo falls back to the file name (default routing, `:slugorcontentbasename`): rename each file that sets `slug` to its slug value, delete the key, and use `[full_slug]` or `[slug]` as the permalink tokens give.
- **When few or no files set `slug`**, and `permalinks` uses `:slug`: Hugo falls back to the title, which `{title|slugify}` doesn't match exactly (Hugo keeps `.` and drops `'`). Switch the token to `:slugorcontentbasename` (Hugo 0.144+), then rename every file to the segment it builds at now and delete its `slug` key. No published URL changes, and the `url` uses `[slug]` or `[full_slug]` as the permalink tokens give.

Rename a file with `git mv`, and rename its translations to match: Hugo pairs translations by file name. Rebuild and compare `hugo list all` with the listing from before the change.

Check the site config for a `permalinks` block during the audit; it's easy to miss because it lives outside `content/`.

### Permalinks and section list pages

A flat `permalinks` entry (`blog: /posts/:slug/`) applies to the section's pages, not its list pages: `content/blog/_index.md` and any subsection `_index.md` keep their default paths (`/blog/`, `/blog/<subsection>/`). A collection holding both can't share one `url` pattern.

| Collection holds                    | Fix                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages only                          | Mirror the entry, and exclude list pages with `!**/_index.md`                                                                                                      |
| List pages editors need to open too | Let them fall through to `pages`, whose `/[full_slug]/` gives their list URLs — see [configuration.md § Section collections](configuration.md#section-collections) |

## Verify against `hugo list all`

**MUST:** compare every collection file's computed URL with Hugo's own permalink before hand-off ([../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build)).

```sh
hugo list all   # CSV: path, …, draft, permalink, kind — every page, including _index.md
```

- **Parse** it as CSV. A title with a comma is quoted, so `cut -d,` shifts the columns.
- **Strip** `baseURL` from each permalink. For each file a collection's `path` and `glob` match, the result must equal the collection `url` filled in for that file.
- **Check** drafts, future-dated and expired pages like the rest. The listing includes them, with the permalink each builds at once published.

## Trailing slash

Hugo builds `dir/index.html` by default, so URLs end in `/`. With `uglyURLs: true` it builds `page.html`, so URLs end in `.html` and the pattern is `/[full_slug].html`. `uglyURLs` can be set per section (`uglyURLs: { blog: true }`) — check each collection's section separately.
