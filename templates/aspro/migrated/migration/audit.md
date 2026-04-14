# Audit

## Astro version and dependencies

- **Astro**: 6.1.1 (Astro 5+ with `src/content.config.ts` and glob loader)
- **Package manager**: npm (lockfile present)
- **Node version**: No `.nvmrc` or `engines` constraint
- **Framework integrations**: None (no React/Vue/Svelte/Solid) -- all components are `.astro`
- **CSS**: Tailwind v4 via `@tailwindcss/vite`
- **Markdown**: remark-reading-time plugin (injects `minutesRead` into frontmatter), MDX integration installed but unused in content
- **Other integrations**: `@astrojs/sitemap`, `astro-icon` (Iconify), `@vercel/analytics`, `@vercel/speed-insights`

## Content collections

### blog

- **Loader**: `glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" })`
- **Structure**: Flat files (14 `.md` posts, no folder-per-post)
- **Schema fields**:
  - `title`: z.string() -- required
  - `description`: z.string() -- required
  - `pubDate`: z.coerce.date() -- required
  - `author`: z.string() -- required
  - `image`: z.string().optional() -- static paths under `/blog/`
  - `tags`: z.array(z.string()).optional()
  - `category`: z.string().optional()
- **Consumption**: `getCollection("blog")` in listing pages, `render(post)` for single posts
- **Body content**: Rendered via `<Content />` on `[...slug].astro`
- **URL generation**: `post.id` used as slug param (filename without extension). No frontmatter `slug` override found in any post.

### Data files outside collections

- `src/config/site.ts` -- TypeScript config with `siteConfig` object containing nav links, social links, site name/description/url, OG image import. Not CC-editable in current form.

## Pages and routing

| Route | Source | Data source | Classification |
|-------|--------|-------------|----------------|
| `/` | `index.astro` | Hardcoded (Hero + Features + 2× Content2) | Content collection (page builder) |
| `/about` | `about.astro` | Hardcoded (Content2 + Values) | Content collection (page builder) |
| `/services` | `services.astro` | Hardcoded (Content + ServiceList + 3× Content2) | Content collection (page builder) |
| `/contact` | `contact.astro` | Hardcoded (Content + Form + Features) | Content collection (page builder + contact) |
| `/widgets` | `widgets.astro` | Hardcoded demo of all widgets | Exclude (dev showcase) |
| `/404` | `404.astro` | Hardcoded Hero | Source editables |
| `/blog` | `blog/[...page].astro` | `getCollection("blog")` + `paginate()` (6/page) | Pagination, not CC-generated |
| `/blog/:slug` | `blog/[...slug].astro` | `getCollection("blog")` + `render(post)` | Blog collection URL |
| `/blog/category/:cat` | `blog/category/[category].astro` | Filtered by `category` | Taxonomy, not CC-generated |
| `/blog/tags/:tag` | `blog/tags/[tag].astro` | Filtered by `tags` | Taxonomy, not CC-generated |
| `/robots.txt` | `robots.txt.ts` | API route | N/A |
| `/rss.xml` | `rss.xml.js` | RSS feed | N/A |

## Layouts and components

### Base layout

`BaseLayout.astro` wraps all pages: `<Seo>`, `<Schema>` (WebSite JSON-LD), `<Navbar>`, `<Footer>`, `<ClientRouter>`, Vercel analytics, theme script, scroll-reveal script.

### Widget components

All are `.astro` (no unsupported frameworks). All use `WidgetWrapper.astro` which adds the `.reveal` animation class.

| Widget | Props | Arrays | Image handling |
|--------|-------|--------|----------------|
| Hero | title, tagline, description, actions[], animate | actions (CallToAction[]) | None (text only) |
| Features | title, subtitle, tagline, features[] | features (Feature[]) | None |
| Content | title, subtitle, tagline, description[], image, imageAlt | None | `<Image>` (optimized) |
| Content2 | title, subtitle, tagline, description[], image, imageAlt, items[], actions[], isReversed, isAfterContent | items (Feature[]), actions (CallToAction[]) | `<Image>` (optimized) |
| ServiceList | title, subtitle, tagline, services[] | services (Service[]) | None |
| Values | title, subtitle, tagline, items[], columns | items (Value[]) | None |

### Shared UI components

- **Headline.astro**: Renders title (`set:html`), subtitle (`set:html`), tagline. Used by all widgets.
- **Button.astro**: Link or button with variant/size. Used in Hero and Content2 actions.
- **Card.astro**: Wrapper div with border styling.
- **Form.astro**: Contact form (name, email, message). Static HTML form, no backend.

### Content2 slot pattern

Several pages pass `<Fragment>` slot content to Content2:
```astro
<Content2 ...>
  <Fragment>
    <h3 class="text-2xl font-bold tracking-tight sm:text-3xl mb-2">Development</h3>
    We provide a solid foundation...
  </Fragment>
</Content2>
```
This slot content feeds into the subtitle/description display via `Headline`. Must become a `content` frontmatter field for CMS editability.

### Description as string array

Content and Content2 accept `description` as `string[]` and join them. Content2 passes `subtitle || description.join(" ")` to Headline's subtitle. This needs simplification to a single field.

### Image handling

- **Blog images**: Static, in `public/blog/`. Referenced as string paths (`/blog/welcome.webp`).
- **Page images**: Optimized, in `src/assets/images/`. Imported and passed as `ImageMetadata` to `<Image>`.
- Components using `<Image>`: Content.astro, Content2.astro. These need `import.meta.glob` for CMS string path resolution.

## Build pipeline

- `build` script: `astro build` (no pre-build steps)
- `output` mode: static (default)
- `trailingSlash`: not set (default -- directory format, trailing slash URLs)
- `build.format`: not set (default: `directory`)
- `build.inlineStylesheets`: `always`
- `site`: `https://astrostarterpro.com/`
- No `.env` files or `astro:env` usage
- i18n configured (en/es) but no localized routes exist

## Flags and special patterns

### Scroll-reveal animations

- CSS: `.reveal { opacity: 0; transform: translateY(30px); }` in `src/styles/global.css`
- JS: `IntersectionObserver` in `BaseLayout.astro` inline script, adds `.active` class
- All widgets opt into this via `WidgetWrapper.astro` (`class:list={[{ reveal: animate }]}`)
- **Fix needed**: `.cms-editor-active` CSS override + `ENV_CLIENT` guard on WidgetWrapper

### Hero inline HTML

Homepage hero title contains gradient styling:
```
Starter Template for <br class="hidden md:block" /> <span class="bg-linear-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Web Developers</span>
```
- Strip `<br>` (responsive layout concern)
- Replace Tailwind gradient classes with semantic `highlight-text` class
- Configure editor styles CSS

### TypeScript config

`src/config/site.ts` contains `siteConfig` with imported `ogImage`. Convert to JSON data file for CC editability, move OG image to `public/`.

### Icons (21 unique)

All from `lucide` Iconify set: arrow-right, box, briefcase, check, eye, github, globe, home, lightbulb, mail, map-pin, palette, phone, refresh-cw, rocket, scan-search, search, user-check, users, wrench, zap.

### Icon classes (9 unique)

bg-blue-500/10 text-blue-400, bg-green-500/10 text-green-400, bg-indigo-500/10 text-indigo-400, bg-orange-500/10 text-orange-400, bg-pink-500/10 text-pink-400, bg-purple-500/10 text-purple-400, bg-red-500/10 text-red-400, bg-teal-500/10 text-teal-400, bg-yellow-500/10 text-yellow-400.

### No markdown tables in blog content

Checked all blog `.md` files -- no pipe-delimited table syntax found.

### No MDX components in content

MDX integration is installed but all blog posts are `.md`. No auto-import config, no snippet candidates.

### Vercel integrations

`@vercel/analytics` and `@vercel/speed-insights` are in BaseLayout. Leave as-is.

### Blog date locale

Date formatting in `[...slug].astro` uses `es-ES` locale ("19 de enero de 2026"). Pagination label in `Pagination.astro` also uses Spanish ("Página"). These are hardcoded UI strings, not content issues.
