# Audit: Aspro

## 1. Astro version and dependencies

- **Astro**: ^6.1.1 (latest, no upgrade needed)
- **Integrations**: @astrojs/mdx ^5.0.3, @astrojs/sitemap ^3.7.2, @astrojs/rss ^4.0.18, astro-icon
- **No unsupported frameworks**: No Vue/Svelte/Solid -- only .astro components
- **CSS**: Tailwind v4 via @tailwindcss/vite
- **Markdown**: remark-reading-time (adds `minutesRead` to frontmatter at build)
- **Package manager**: npm (lockfile present)
- **Node version**: No .nvmrc or engines field

## 2. Content collections

### blog
- **Loader**: `glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" })`
- **Structure**: Flat files (14 posts)
- **Schema**: title (string), description (string), pubDate (coerce.date), author (string), image (string, optional), tags (array string, optional), category (string, optional)
- **Consumed by**: `getCollection("blog")` in blog pages
- **Body content**: Rendered via `<Content />` from `render(post)` on detail pages
- **Image paths**: String paths to public/ (e.g. `/blog/welcome.webp`)

## 3. Pages and routing

| Route | File | Data source |
|---|---|---|
| `/` | index.astro | Hardcoded + siteConfig |
| `/about` | about.astro | Hardcoded |
| `/services` | services.astro | Hardcoded |
| `/contact` | contact.astro | Hardcoded |
| `/widgets` | widgets.astro | Hardcoded (demo) |
| `/404` | 404.astro | Hardcoded |
| `/blog/` | blog/[...page].astro | `getCollection("blog")`, paginate(6) |
| `/blog/:slug` | blog/[...slug].astro | `getCollection("blog")` by id |
| `/blog/category/:cat` | blog/category/[category].astro | Filtered blog |
| `/blog/tags/:tag` | blog/tags/[tag].astro | Filtered blog |
| `/rss.xml` | rss.xml.js | blog collection |
| `/robots.txt` | robots.txt.ts | siteConfig |

Blog slug comes from `post.id` (filename-based via glob loader).

## 4. Layouts and components

### Base layout
`BaseLayout.astro` -- full document shell (html, head, body), Seo, Schema, Navbar, main slot, Footer, theme script, scroll-reveal, Vercel analytics, ClientRouter.

### Widget components (page builder candidates)
- **Hero.astro** -- title (set:html), tagline, description, actions[]
- **Features.astro** -- title, subtitle, tagline, features[] (each: title, description, icon, iconClass)
- **Content.astro** -- centered section: title, subtitle, tagline, description[], optional image
- **Content2.astro** -- two-column: title, subtitle, tagline, items[], image, imageAlt, actions[], isReversed, isAfterContent, slot content
- **Values.astro** -- grid: title, subtitle, tagline, items[] (title, description), columns
- **ServiceList.astro** -- card grid: title, subtitle, tagline, services[] (title, description, icon)
- **Form.astro** -- static HTML contact form (no configurable props)

### Shared UI
- **Headline.astro** -- renders tagline/title/subtitle with `set:html`
- **Button.astro** -- `<a>` or `<button>`, variants primary/secondary/link
- **Card.astro** -- styled card wrapper
- **WidgetWrapper.astro** -- section shell with reveal animation

### No interactive islands
No `client:*` directives on any component. All server-rendered.

## 5. Page classification

| Page | Classification | Reason |
|---|---|---|
| index.astro | Content collection (page builder) | Hero + Features + 2x Content2 = 4 structured sections |
| about.astro | Content collection (page builder) | Content2 + Values = structured arrays |
| services.astro | Content collection (page builder) | Content + ServiceList + 3x Content2 = 6 sections |
| contact.astro | Content collection (page builder) | Content + Form + Features = structured sections |
| widgets.astro | Content collection (page builder) | Demo page with all 7 widget types |
| 404.astro | Exclude from CMS | Error page |

All pages use 3+ reusable widget components -> page builder with content_blocks.

## 6. Data files

`src/config/site.ts` contains:
- `navLinks`: array of {text, href} -- extract to `src/data/nav.json`
- `socialLinks`: {twitter, github, discord} -- extract to `src/data/social.json`
- `name`, `description`, `url`, etc. -- site metadata, keep in code (developer-managed)

No other JSON/YAML data files.

## 7. Build pipeline

- Build script: `astro build` (no pre-build steps)
- Output: static (default)
- `trailingSlash`: not set (default: ignore)
- `build.inlineStylesheets`: "always"
- i18n configured (en, es) but only en routes exist -- no Spanish pages present
- `site`: "https://astrostarterpro.com/"

## 8. Flags and special patterns

- **No MDX components in blog content** -- posts are plain .md, MDX integration present but unused
- **No styled HTML in content** -- no `<span class="...">` in frontmatter
- **No `set:html` on content fields** that would complicate editing
- **Hero title contains inline HTML**: `<br class="hidden md:block" />` and `<span class="bg-linear-to-r ...">` on index.astro -- needs handling during content extraction (strip responsive br, use editor styles for gradient text or simplify)
- **Content2 slot content**: Several pages pass `<Fragment>` slot content with `<h3>` headings and text -- needs conversion to a frontmatter field (e.g. `content` as html type)
- **Images**: Widget components use Astro `ImageMetadata` imports -- must switch to string paths for content-backed pages
- **remark-reading-time**: Injects `minutesRead` at build time -- works transparently, no config needed
- **Markdown tables**: Not found in blog content
- **`description` field**: Some components accept `string[]` (joined with spaces) -- will simplify to single string in content
- **`getImage()` preload**: about.astro preloads an optimized image -- will need adjustment when switching to string paths
