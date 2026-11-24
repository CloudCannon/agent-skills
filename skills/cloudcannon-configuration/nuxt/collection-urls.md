# Collection URLs (Nuxt)

Nuxt-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Page files give the path

A page builds at its file's path under `pages/`, with `index.vue` at its folder's path. `[slug].vue` is a dynamic segment, `[[slug]].vue` an optional one, and `[...slug].vue` a catch-all. Read the page's data call (`queryCollection(…).path(route.path)`, or a lookup by `route.params.slug`) for what each value comes from.

`nuxt generate` writes every page as a folder with an `index.html`, so every `url` ends in `/`.

| Page file                      | Content                           | Built path                                       | `url`           |
| ------------------------------ | --------------------------------- | ------------------------------------------------ | --------------- |
| `pages/blog/[slug].vue`        | `content/blog/my-post.md`         | `.output/public/blog/my-post/index.html`         | `/blog/[slug]/` |
| `pages/[...slug].vue`          | `content/about.md`                | `.output/public/about/index.html`                | `/[full_slug]/` |
| `pages/[...slug].vue`          | `content/docs/getting-started.md` | `.output/public/docs/getting-started/index.html` | `/[full_slug]/` |
| `pages/about.vue` (hard-coded) | `content/pages/about.yml`         | `.output/public/about/index.html`                | `/[slug]/`      |

## Nuxt Content paths

A page collection gives each file a `path` from its location under the collection's source: `content/blog/hello.md` is `/blog/hello`, and `index.md` is its folder's path. A catch-all page that queries by `route.path` builds each file at that path, so `[full_slug]` fits when the collection's CloudCannon `path` is the Nuxt Content source root.

| Content source setting                                 | Effect on the path                                   | `url`                                                               |
| ------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `source: "blog/**"` (no `prefix`)                      | The static part of the glob is the prefix: `/blog/…` | `/blog/[full_slug]/` on a collection whose `path` is `content/blog` |
| `source: { include: "blog/**", prefix: "/" }`          | No prefix: `/hello`                                  | `/[full_slug]/`                                                     |
| `source: { include: "posts/**", prefix: "/articles" }` | The prefix replaces the folder: `/articles/hello`    | `/articles/[full_slug]/`                                            |

A `path` key in a file's front matter, or at the top level of a YAML page file, replaces the path Nuxt Content derives. When every file in a collection sets it, `url` is `"{path}/"`.

### Numeric ordering prefixes

**MUST:** check every file and folder name for a numeric ordering prefix (`3.blog/1.launch.md`). Nuxt Content strips it from the path, so the page is `/blog/launch`, but `[slug]` and `[full_slug]` keep it.
**Why:** the computed URL then points at a page that doesn't exist, and the Visual Editor stays on "Loading page...". No placeholder filter strips the prefix.

No template can compute these paths, so the content changes. Ask the user first:

| The prefixes                                                            | Fix                                                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Order nothing editors see (posts listed by date)                        | Rename the files without them; `[slug]` or `[full_slug]` then fits                     |
| Order navigation or a list (docs sidebars, `queryCollectionNavigation`) | Keep them, set `path` in every file to the path it builds at, and use `url: "{path}/"` |

With `path` front matter, give the `path` input a visible `_inputs` entry, so editors set it on a new file. A new file without it builds at the derived path, prefix stripped.

A prefix on the folder the collection's `source` names (`source: "3.blog/**"`) is stripped from the path too. It's outside the CloudCannon collection's `path`, so write the clean folder into the `url` literally: `/blog/[slug]/`.

## The home page

The home page builds at `.output/public/index.html`. In a collection with `url: "/[slug]/"` or `"/[full_slug]/"`, `index.md` gets the URL `/`.

## Internal links

`<NuxtLink>` writes hrefs without a trailing slash (`/about`), while the build writes `about/index.html`. Static hosts, CloudCannon Hosting included, answer `/about` with the folder's `index.html`, so links work as written. Leave `trailingSlash` on `<NuxtLink>` as the site has it.

## `app.baseURL`

With `app.baseURL` set, `nuxt generate` still writes each page at its route path under `.output/public/`, with no base folder. The prefix goes only into URLs inside the pages. Write `url` without it.

## Listing the build

For [../collection-urls.md § Check every file against the build](../collection-urls.md#check-every-file-against-the-build), list the pages with `find .output/public -name index.html`. Drop `index.html` to compare: `.output/public/blog/my-post/index.html` matches `/blog/my-post/`, and `.output/public/index.html` matches `/`. `200.html`, `404.html`, `_payload.json` files and `_nuxt/` are not pages.

**A page missing from the build** isn't linked from any crawled page. `nuxt generate` builds only the pages it reaches through links, plus `prerender.routes` → [configuration.md § Every page must be reachable](configuration.md#every-page-must-be-reachable).
