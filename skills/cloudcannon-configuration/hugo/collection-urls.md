# Collection URLs (Hugo)

Hugo-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Use `[full_slug]`, not `[slug]`

**MUST:** use `[full_slug]` in Hugo collection URLs.
**Why:** Hugo's output path is the file's directory plus its name. `[slug]` is the filename alone, so any file in a subdirectory of the collection loses its directory; `[full_slug]` keeps it.

| File (collection `path`)                      | `url`                  | Resolves to            |
| --------------------------------------------- | ---------------------- | ---------------------- |
| `content/about.md` (`content`)                | `/[full_slug]/`        | `/about/`              |
| `content/docs/guide/install.md` (`content`)   | `/[full_slug]/`        | `/docs/guide/install/` |
| `content/docs/guide/install.md` (`content`)   | `/[slug]/` — **wrong** | `/install/`            |
| `content/blog/first-post.md` (`content/blog`) | `/blog/[full_slug]/`   | `/blog/first-post/`    |

## Page bundles

A leaf bundle — `content/blog/first-post/index.md` with its images beside it — builds to `/blog/first-post/`. `[slug]` is empty for a file named `index`, and `[full_slug]` is its directory, so `/blog/[full_slug]/` resolves correctly with no front matter changes.

**MUST NOT:** flatten a page bundle to fix its URL. Its page resources (`.Resources.Get "cover.jpg"`) live in the bundle directory and stop resolving if the file moves.

## `_index.md` — list pages and the home page

Hugo builds `content/_index.md` to `/` and `content/blog/_index.md` to `/blog/`. CloudCannon's docs say `[slug]` is empty for a file named `index`; they don't say whether `_index` gets the same treatment.

**Unverified:** whether `[slug]` and `[full_slug]` collapse `_index` the way they collapse `index`. If they don't, `/[full_slug]/` resolves `content/_index.md` to `/_index/`, and the home page and every section list page fail to open in the Visual Editor. Leaf pages are unaffected either way.

- **Open** the home page and one section list page in the Visual Editor before configuring the rest of the site.
- **Record** the result in `.cloudcannon/migration/configuration.md`.
- **Tell** the user if it fails — it needs a CloudCannon-side answer, not a per-site workaround.

Whether `_index.md` belongs in its section's collection is a separate choice — see [configuration.md § Section collections](configuration.md#section-collections).

## Front matter that changes the URL

Hugo lets front matter override the path. Mirror each override in the CloudCannon `url`, or the Visual Editor opens the wrong page:

| Front matter or config                        | Hugo output             | CloudCannon `url`                                                  |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| `slug: my-post` on a file                     | Directory + `my-post`   | `/blog/{slug}/` — only if every file in the collection sets `slug` |
| `url: /custom/path/` on a file                | Exactly that path       | `{url}` — only if every file sets `url`                            |
| `[permalinks] blog = "/:year/:month/:slug/"`  | Date-based path         | `/{date\|year}/{date\|month}/[slug]/`                              |
| `[permalinks] blog = "/:sections/:filename/"` | Section path + filename | `/blog/[full_slug]/`                                               |

**MUST:** make an override uniform across the collection before relying on it. If some posts set `slug` and others don't, add `slug` (matching the filename) to the rest and to the collection's schema file, so one pattern fits every file.

Check the site config for a `permalinks` block during the audit; it's easy to miss because it lives outside `content/`.

## Trailing slash

Hugo builds `dir/index.html` by default, so URLs end in `/`. With `uglyURLs: true` it builds `page.html`, so URLs end in `.html` and the pattern is `/[full_slug].html`. `uglyURLs` can be set per section (`uglyURLs: { blog: true }`) — check each collection's section separately.
