# Collection URLs (SvelteKit)

SvelteKit-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Route folders give the path

A page builds at its route folder's path under `src/routes/`, from that folder's `+page.svelte` (or `+page.md` with mdsvex). Groups (`(marketing)`) add no segment. `[slug]` is a dynamic segment, `[[slug]]` an optional one, `[...path]` a rest segment, and `[slug=matcher]` a segment that a matcher in `src/params/` restricts. Folders with only `+server.js` build files or endpoints, not pages.

Read the page's `load` (in `+page.js`, `+page.ts` or `+page.server.js`) for what each value comes from. A load that imports `` `$lib/posts/${params.slug}.md` `` or looks the file up by name makes the value `[slug]`. A lookup by a front matter field makes it `{field}`.

| Route folder                     | Content                       | Built path (`trailingSlash` unset) | `url`               |
| -------------------------------- | ----------------------------- | ---------------------------------- | ------------------- |
| `src/routes/blog/[slug]/`        | `src/lib/posts/my-post.md`    | `build/blog/my-post.html`          | `/blog/[slug]`      |
| `src/routes/(site)/[slug]/`      | `content/pages/about.md`      | `build/about.html`                 | `/[slug]`           |
| `src/routes/docs/[...path]/`     | `content/docs/a/intro.md`     | `build/docs/a/intro.html`          | `/docs/[full_slug]` |
| `src/routes/about/` (hard-coded) | `content/pages/about.yml`     | `build/about.html`                 | `/[slug]`           |
| `src/routes/about/+page.md`      | The route file is the content | `build/about.html`                 | See below           |

A `+page.md` route file holds its own content, so its URL comes from its folder. Give a collection over `src/routes` a `glob` of `**/+page.md`, so it lists no `.svelte` files, and `url: "/[relative_base_path]"`. A group folder stays in `[relative_base_path]` but not in the built path, so set the collection's `path` inside the group (`src/routes/(marketing)`).

## Trailing slash rule

SvelteKit sets `trailingSlash` as a page option, exported from a `+layout.js`, `+layout.server.js` or `+page.js`, and it applies to every route below that file. Search `src/routes` for `trailingSlash`; the root `+layout` is the usual place.

| `trailingSlash`                | Built path                      | `url` pattern   |
| ------------------------------ | ------------------------------- | --------------- |
| unset, `"never"` or `"ignore"` | `build/blog/my-post.html`       | `/blog/[slug]`  |
| `"always"`                     | `build/blog/my-post/index.html` | `/blog/[slug]/` |

The `.html` layout follows [../collection-urls.md § Pages built as `.html` files](../collection-urls.md#pages-built-as-html-files). A route folder with its own `+page.svelte` below the root (`src/routes/blog/`) builds as `build/blog.html`. When a collection has an `index` file for such a page, export `trailingSlash = "always"` from the root `+layout.js` after asking the user.

When routes set different values, each collection follows the value on its own route.

## The home page

The home page builds at `build/index.html` with any `trailingSlash` setting. In a collection with `url: "/[slug]"`, `index.md` gets the URL `/`.

## Listing the build

For [../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build), list the pages with `find build -name '*.html'`. Drop `.html` (or `/index.html` under `"always"`) to compare: `build/blog/my-post.html` matches `/blog/my-post`, and `build/index.html` matches `/`. `build/_app/` holds assets, not pages. A fallback page set in `adapter-static`'s `fallback` option (`200.html`, `404.html`) is not a page either.

**A page missing from the build** isn't reached by the prerender crawl → [configuration.md § Every page must be prerendered](configuration.md#every-page-must-be-prerendered).
