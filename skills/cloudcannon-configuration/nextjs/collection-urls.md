# Collection URLs (Next.js)

Next.js-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Route segments give the path

The App Router builds a page at its route folder's path under `app/`. Route groups (`(marketing)`) and parallel-route slots (`@modal`) add no segment. A dynamic segment takes each value `generateStaticParams` returns.

Read `generateStaticParams` for what each value comes from. When it returns file names without the extension, the value is `[slug]`; when it returns a field from front matter, it is `{field}`; a catch-all `[...slug]` built from the file's path under the collection is `[full_slug]`.

| Route file                        | Content                   | Built path (`trailingSlash: false`) | `url`                    |
| --------------------------------- | ------------------------- | ----------------------------------- | ------------------------ |
| `app/blog/[slug]/page.tsx`        | `content/blog/my-post.md` | `out/blog/my-post.html`             | `/blog/[slug].html`      |
| `app/(site)/[slug]/page.tsx`      | `content/pages/about.md`  | `out/about.html`                    | `/[slug].html`           |
| `app/docs/[...slug]/page.tsx`     | `content/docs/a/intro.md` | `out/docs/a/intro.html`             | `/docs/[full_slug].html` |
| `app/about/page.tsx` (hard-coded) | `content/pages/about.md`  | `out/about.html`                    | `/[slug].html`           |

## Trailing slash rule

The URL must match the built path exactly. Check `trailingSlash` in `next.config`:

| `trailingSlash`  | Built path                    | `url` pattern       |
| ---------------- | ----------------------------- | ------------------- |
| unset or `false` | `out/blog/my-post.html`       | `/blog/[slug].html` |
| `true`           | `out/blog/my-post/index.html` | `/blog/[slug]/`     |

## The home page

The home page builds at `out/index.html` with either `trailingSlash` setting. Name its content file `index.md`; how `[slug]` treats `index` is in [../collection-urls.md § Fixed placeholders](../collection-urls.md#fixed-placeholders).

## `basePath`

With `basePath` set, `next build` still writes each page at its route path under `out/` (`out/about.html`), with no `basePath` folder. The prefix goes only into URLs inside the pages: `<Link>` hrefs, `/_next/` asset paths and statically imported images. A string `src` on `next/image` or `<img>` doesn't get it, so the component adds it.

## Listing the build

For [../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build), list the pages with `find out -name '*.html'`. The `.txt` files and the folder beside each `.html` (`out/about/` next to `out/about.html`) hold router data, not pages.
