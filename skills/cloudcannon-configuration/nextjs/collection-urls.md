# Collection URLs (Next.js)

Next.js-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Route segments give the path

The App Router builds a page at its route folder's path under `app/`. Route groups (`(marketing)`) and parallel-route slots (`@modal`) add no segment. The Pages Router builds a page at its file's path under `pages/`, with `index` files at their folder's path. `_app`, `_document` and `api/` build no page. A dynamic segment takes each value `generateStaticParams` returns, or each `params` value in the `paths` from `getStaticPaths`.

Read `generateStaticParams` or `getStaticPaths` for what each value comes from. When it returns file names without the extension, the value is `[slug]`; when it returns a field from front matter, it is `{field}`; a catch-all `[...slug]` built from the file's path under the collection is `[full_slug]`.

| Route file                          | Content                   | Built path (`trailingSlash: false`) | `url`               |
| ----------------------------------- | ------------------------- | ----------------------------------- | ------------------- |
| `app/blog/[slug]/page.tsx`          | `content/blog/my-post.md` | `out/blog/my-post.html`             | `/blog/[slug]`      |
| `app/(site)/[slug]/page.tsx`        | `content/pages/about.md`  | `out/about.html`                    | `/[slug]`           |
| `app/docs/[...slug]/page.tsx`       | `content/docs/a/intro.md` | `out/docs/a/intro.html`             | `/docs/[full_slug]` |
| `app/about/page.tsx` (hard-coded)   | `content/pages/about.md`  | `out/about.html`                    | `/[slug]`           |
| `pages/blog/[slug].jsx`             | `content/blog/my-post.md` | `out/blog/my-post.html`             | `/blog/[slug]`      |
| `pages/[slug].jsx`                  | `content/pages/about.md`  | `out/about.html`                    | `/[slug]`           |
| `pages/blog/index.jsx` (hard-coded) | `content/pages/blog.md`   | `out/blog.html`                     | `/[slug]`           |

## Trailing slash rule

Check `trailingSlash` in `next.config`; the `url` follows it. Unset or `false` is the recommended layout, and `true` writes a folder per page.

| `trailingSlash`  | Built path                    | `url` pattern   |
| ---------------- | ----------------------------- | --------------- |
| unset or `false` | `out/blog/my-post.html`       | `/blog/[slug]`  |
| `true`           | `out/blog/my-post/index.html` | `/blog/[slug]/` |

**MUST NOT:** end the `url` in `.html`.
**Why:** `index.md` then resolves to `/.html`, and the Visual Editor can't open it.

**MUST:** set `trailingSlash: true` when a collection has an `index` file below the site root, such as `content/docs/index.mdx` at `/docs/`. It changes every page's URL, so ask the user first.
**Why:** CloudCannon resolves that file to `/docs/`. With `trailingSlash` unset or `false` the page is `out/docs.html`, which `/docs/` doesn't reach, so the index won't open in the Visual Editor.

## Internal links

With `trailingSlash` unset or `false`, clean URLs like `/about` rely on the host serving `out/about.html` without the extension. In CloudCannon Hosting that is **Serve Extensionless URLs** under **Site Settings > Routing**, on by default; elsewhere, turn on the host's clean-URL setting. **Redirect to Extensionless URLs** is optional. `/about/` still returns 404.

- **`<Link>`** from `next/link` strips a trailing slash from its `href` in both routers, so `<Link href="/about/">` works.
- **A plain `<a>`** keeps the slash and returns 404. This covers links in markdown bodies, and data-file hrefs rendered without `<Link>`.

Write those links without the trailing slash, or set `trailingSlash: true` so the build writes `out/about/index.html`.

## The home page

The home page builds at `out/index.html` with either `trailingSlash` setting. Name its content file `index.md`: in a collection with `url: "/[slug]"`, `index.md` gets the URL `/`. CloudCannon resolves the index file to `/` (see [../../migrate-to-cloudcannon/page-building.md § Common mistakes](../../migrate-to-cloudcannon/page-building.md#common-mistakes)).

## `basePath`

With `basePath` set, `next build` still writes each page at its route path under `out/` (`out/about.html`), with no `basePath` folder. The prefix goes only into URLs inside the pages: `<Link>` hrefs, `/_next/` asset paths and statically imported images. A string `src` on `next/image` or `<img>` doesn't get it, so the component adds it.

## Listing the build

For [../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build), list the pages with `find out -name '*.html'`. Drop `.html` to compare: `out/blog/my-post.html` matches `/blog/my-post`, and `out/index.html` matches `/`. The rest is router data, not pages: in the App Router, the `.txt` files and the folder beside each `.html` (`out/about/` next to `out/about.html`); in the Pages Router, the `.json` files under `out/_next/data/`.
