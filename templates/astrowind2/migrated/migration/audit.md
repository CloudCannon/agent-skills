# Audit — AstroWind2

## 1. Astro version and dependencies

- **Astro 5.12.9** (Astro 5+ — full editable regions support)
- **No framework integrations** — all components are `.astro`, no React/Vue/Svelte/Solid
- **CSS**: Tailwind CSS 3.4
- **Markdown**: `@astrojs/mdx` 4.3.3, custom remark (`readingTimeRemarkPlugin`) and rehype plugins (`responsiveTablesRehypePlugin`, `lazyImagesRehypePlugin`) in `src/utils/frontmatter`
- **Package manager**: npm (lockfile present)
- **Node**: `^18.17.1 || ^20.3.0 || >= 21.0.0`
- **Other integrations**: `@astrojs/sitemap`, `@astrojs/tailwind`, `astro-icon` (tabler + flat-color-icons), `astro-compress`, custom `vendor/integration` (astrowind config loader)

## 2. Content collections

### `post` collection

- **Loader**: `glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' })`
- **Base directory**: `src/data/post/` (6 files: 4 `.md`, 2 `.mdx`)
- **Content structure**: Flat files
- **Schema fields**: `publishDate` (date, optional), `updateDate` (date, optional), `draft` (boolean, optional), `title` (string, required), `excerpt` (string, optional), `image` (string, optional), `category` (string, optional), `tags` (array of strings, optional), `author` (string, optional), `metadata` (nested SEO object, optional)
- **Consumed by**: `getCollection('post')` in `src/utils/blog.ts`, normalized via `getNormalizedPost()`
- **Body content**: Rendered as blog post pages — not data-only

### Data files outside collections

- **`src/config.yaml`**: Site settings (name, URL, SEO defaults, blog config, analytics, UI theme). Consumed by custom vendor integration → virtual module `astrowind:config`
- **`src/navigation.ts`**: Header/footer navigation data (TypeScript with `getPermalink()` calls — developer-only)

## 3. Pages and routing

### Static pages
- `index.astro` — homepage, reads no collection data
- `about.astro`, `services.astro`, `pricing.astro`, `contact.astro` — static pages with hardcoded widget data
- `homes/saas.astro`, `homes/startup.astro`, `homes/mobile-app.astro`, `homes/personal.astro` — demo home variants
- `landing/lead-generation.astro`, `landing/sales.astro`, `landing/click-through.astro`, `landing/product.astro`, `landing/pre-launch.astro`, `landing/subscription.astro` — landing page variants
- `privacy.md`, `terms.md` — markdown pages using `MarkdownLayout.astro`

### Dynamic routes
- `[...blog]/index.astro` — single post, `params.blog = post.permalink` from `getStaticPathsBlogPost()`
- `[...blog]/[...page].astro` — paginated blog listing at `/blog/`
- `[...blog]/[category]/[...page].astro` — category archives
- `[...blog]/[tag]/[...page].astro` — tag archives

### Blog URL generation
- `POST_PERMALINK_PATTERN = trimSlash(APP_BLOG?.post?.permalink)` → from config `/%slug%` → `%slug%`
- `slug = cleanSlug(entry.id)` where `entry.id` = filename without extension
- Result: posts at `/<slug>/` (no `/blog/` prefix with default config)
- Blog listing at `/blog/`, categories at `/category/<cat>/`, tags at `/tag/<tag>/`
- CC URL for posts: `url: "/[slug]/"` (filename-based)

## 4. Layouts and components

### Layouts
- **`Layout.astro`** — root HTML shell (head, metadata, scripts, slots)
- **`PageLayout.astro`** — wraps Layout with Header, Footer, Announcement, main slot
- **`LandingLayout.astro`** — narrower header variant of PageLayout (used by landing/* pages)
- **`MarkdownLayout.astro`** — PageLayout + title + prose wrapper (used by privacy.md, terms.md)

### Widget components (19 types)
All in `src/components/widgets/`, all `.astro`, no `client:*` directives:

| Widget | Key props | Arrays | Sub-components |
|--------|-----------|--------|----------------|
| Hero | title, subtitle, tagline, content, actions, image | actions[] | Image, Button |
| Hero2 | title, subtitle, tagline, content, actions, image | actions[] | Image, Button |
| HeroText | title, subtitle, tagline, content, callToAction, callToAction2 | — | Button |
| Note | icon, title, description | — | Icon |
| Features | title, subtitle, tagline, items, columns, defaultIcon | items[] | Headline, ItemGrid |
| Features2 | title, subtitle, tagline, items, columns | items[] | Headline, ItemGrid2 |
| Features3 | title, subtitle, tagline, items, columns, image, isBeforeContent, isAfterContent | items[] | Headline, ItemGrid, Image |
| Content | title, subtitle, tagline, content, callToAction, items, columns, image, isReversed, isAfterContent | items[] | Headline, ItemGrid, Image, Button |
| Steps | title, subtitle, tagline, items, image, isReversed | items[] | Headline, Timeline, Image |
| Steps2 | title, subtitle, tagline, callToAction, items, isReversed | items[] | Headline, Button, Icon |
| FAQs | title, subtitle, tagline, items, columns | items[] | Headline, ItemGrid |
| Stats | title, subtitle, tagline, stats | stats[] | Headline, Icon |
| CallToAction | title, subtitle, tagline, actions | actions[] | Headline, Button |
| Testimonials | title, subtitle, tagline, testimonials, callToAction | testimonials[] | Headline, Button, Image |
| Pricing | title, subtitle, tagline, prices | prices[] (nested items[]) | Headline, Button, Icon |
| BlogLatestPosts | title, linkText, linkUrl, information, count | — (fetches via getCollection) | Grid |
| BlogHighlightedPosts | title, linkText, linkUrl, information, postIds | — (fetches via getCollection) | Grid |
| Brands | title, subtitle, tagline, icons, images | icons[], images[] | Headline, Image, Icon |
| Contact | title, subtitle, tagline, inputs, textarea, disclaimer, button, description | inputs[] | Headline, Form |

### Shared UI components
- **`Headline.astro`** — title, subtitle, tagline (slot defaults)
- **`ItemGrid.astro`** — items[], columns, defaultIcon, classes
- **`ItemGrid2.astro`** — items[], columns, defaultIcon, classes
- **`Timeline.astro`** — items[], defaultIcon, classes
- **`Button.astro`** — variant, text, icon, href, target, type
- **`Form.astro`** — inputs[], textarea, disclaimer, button, description

### Static page classification
ALL 15+ static pages → **content collection entries with page builder** (3+ structured widget sections each with arrays)

### Presentational wrapper components
- `Button.astro` wraps `<a>` — appears in slot content; needs snippet or inline HTML treatment for source editables. Since we're using page builder approach (not source editables), this is handled by component registration.

## 5. Build pipeline

- **Build script**: `"build": "astro build"` (no pre-build steps)
- **Output**: static (default)
- **`trailingSlash`**: not set in `astro.config.ts` (Astro default: `'ignore'`)
- **`build.format`**: not set (default: `'directory'` → pages as `dir/index.html`)
- **`site`**: not set in astro.config (set in `src/config.yaml` as `https://astrowind.vercel.app`)
- **Image domains**: `cdn.pixabay.com`
- **Environment variables**: none required

## 6. Flags and special patterns

- **Custom vendor integration**: `vendor/integration/` creates virtual module `astrowind:config` from `src/config.yaml`. CC build will use this as-is.
- **Decap CMS**: `public/decapcms/` — existing config points to wrong folder (`src/content/post` instead of `src/data/post`). Leave as-is.
- **`set:html` usage**: Used in Headline component for title/subtitle rendering — affects how text editables work (content can contain HTML)
- **Markdown tables**: Found in `markdown-elements-demo-post.mdx` — configure `markdown.options.table: true`
- **MDX components**: `Logo` (custom), `YouTube`, `Tweet`, `Vimeo` (from `astro-embed`) — all in `markdown-elements-demo-post.mdx`. Need snippet configs.
- **No inline HTML** in `.md` blog posts
- **Blog widgets use server-only API**: `BlogLatestPosts` and `BlogHighlightedPosts` use `getCollection('post')` — need `ENV_CLIENT` editing fallbacks
- **`Announcement.astro`**: Empty component (no props, static markup) — skip editability
- **Astro version**: 5.12.9 — full editable regions integration support, `slug` not reserved in schema
