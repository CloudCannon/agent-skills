# Content (Astro)

Read [../content.md](../content.md) first, and work through its review checklist and addendum. This file covers only the Astro differences: the Zod schema, `.astro` template extraction, `src/assets` images and Astro's file conventions.

## Review checklist

### Astro template artifacts in extracted content

When extracting hardcoded data from `.astro` templates into content frontmatter, check for Astro JSX expression artifacts like `{""}`, `{"</>"}`, or similar sequences that leaked from the template syntax. These are meaningless in YAML content and should be stripped to plain text. Search content files for `{"` to catch them.

### Front matter against the Zod schema

For each collection, compare content files against the Zod schema in `content.config.ts`:

- **Required fields:** a required Zod field missing from a file fails schema validation and breaks the build. Add the field to the files, or make the schema `.optional()` / `.nullish()`. Prefer matching what the schema expects.
- **Defaults:** a field with `z.default(...)` is filled in at runtime only — write it into the files.
- **`draft`:** `!data.draft` treats a missing key as `false`, so the build is safe without it; write it anyway for the editor.
- **Dates:** `z.coerce.date()` accepts both Date objects and ISO strings — keep the files on ISO 8601 regardless.

### Image paths

| Image location            | Frontmatter path                                  | Note                                             |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `public/` (static)        | Relative to public root: `/images/banner.png`     | Served as-is via plain `<img>`.                  |
| `src/assets/` (optimized) | Full repo-relative: `/src/assets/images/hero.jpg` | So `import.meta.glob` can resolve at build time. |

Don't move optimized images from `src/assets/` to `public/`. See [configuration.md § Image path configuration](../../cloudcannon-configuration/astro/configuration.md#image-path-configuration) for the full upload path setup.

### Listing-page files not named `index`

Some templates keep a listing page's metadata in a file with another name, such as `-index.md`, and filter it out of the item list in code. `[slug]` is empty only for a file named `index`, so with `url: "/blog/[slug]/"` that file opens at `/blog/-index/` instead of `/blog/`.

Rename it to `index.md` (or `index.mdx`), then update every query that fetches it or filters it out by the old ID. It stays in the same collection as its siblings, with its own schema — see [schemas.md § Index pages](../../cloudcannon-configuration/schemas.md#index-pages).

### MDX in the content body

- **MDX components** are auto-imported or imported with explicit `import` statements in `.mdx` files. Record whether each uses `client:load` alongside its props.
- **`set:html`** in the rendering template may not round-trip complex embedded HTML cleanly. Usually not an issue for content bodies.
- **Remark and rehype plugins** are the build-time plugins to note.

### Null values and the Zod schema

Use `.nullish()` on optional Zod fields, not `.optional()`. `.optional()` rejects the `null` a bare key parses to, so content files with empty fields fail validation, and `z.union` silently falls through to a non-page-builder schema — stripping `content_blocks` from the data. Those `null`s then reach every component, where destructuring defaults do not fire on them — see [configuration-gotchas.md § Destructuring defaults never fire on content fields](../../cloudcannon-configuration/astro/configuration-gotchas.md#destructuring-defaults-never-fire-on-content-fields).

### Astro slot content → frontmatter field

When an Astro component receives rich content via a `<slot />` (e.g. `<Content2>` receiving a `<Fragment>` with headings and paragraphs), this content must become a frontmatter field for CMS editing. The pattern:

1. **Add a `content` prop** to the component alongside the slot. Render it with `set:html` when populated, falling back to the slot for backward compatibility:
   ```astro
   const slotContent = Astro.props.content || await Astro.slots.render("default");
   // ...
   {slotContent && <div set:html={slotContent} />}
   ```
2. **Add the field to the structure** with `type: html` and `allow_custom_markup: true`.
3. **In content files**, put the HTML string in the `content` YAML field using `>-` for multiline.

A component that falls back from one prop to another (`subtitle || description`) keeps one field for that slot — see [../content.md § One field per visual slot](../content.md#one-field-per-visual-slot).

### Resolving optimized image paths from frontmatter

When components receive image paths as strings from frontmatter (e.g. `/src/assets/images/hero.jpg`) but need `ImageMetadata` for `<Image>` or `<Picture>`, use `import.meta.glob` to resolve them at build time. Reference: [CloudCannon astro-minimal-starter `left-right.astro`](https://github.com/CloudCannon/astro-minimal-starter/blob/main/src/components/left-right/left-right.astro).

```astro
---
import type { ImageMetadata } from "astro";
import { Picture } from "astro:assets";

const { image, imageAlt } = Astro.props;

const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{jpeg,jpg,png,gif,svg,webp,avif}",
  { eager: true },
);
const imageSrc = typeof image === "string"
  ? (images[image]?.default ?? image)
  : image;
---

{imageSrc && <Picture src={imageSrc} alt={imageAlt} widths={[400, 800]} />}
```

Key points:

- `{ eager: true }` resolves at build time (no async)
- The `typeof` check handles components whose prop type allows both `ImageMetadata` and `string` (common in templates with dual static/optimized support)
- The `?? image` fallback handles external URLs or `public/` paths gracefully
- Works with `<Image>`, `<Picture>`, or any `astro:assets` component
- Frontmatter stores the full repo-relative path (`/src/assets/images/...`) — this matches the `import.meta.glob` pattern

When migrating a component that originally used `import` statements for images (e.g. `import heroImg from "@/assets/images/hero.jpg"`), replace the import with this glob pattern so the image path can come from CMS-editable frontmatter instead of hardcoded imports.

### Flattening folder-per-post content

Flatten folder-per-post content (`blog/my-post/index.md`) to flat files (`blog/my-post.md`) unless the folder structure encodes meaningful grouping beyond the slug. CC's `[slug]` placeholder resolves to an empty string when the filename is `index`, forcing `slug` frontmatter + `{slug}` data placeholder workarounds. Flat files let Astro auto-generate slugs from the filename and CC's `[slug]` works natively.

**Checklist before flattening:**

1. **Check for sibling assets** — images or other files co-located in the post's directory. Move images to `src/assets/images/` (preserving Astro's image optimization) and other static files to `public/`. Update references accordingly — imported images use the new `src/assets/images/` path, static files use absolute paths from `public/`.
2. **Check for relative imports in MDX** — components imported with `./component.astro` paths. Move them to `src/components/` and make them available without explicit imports — `astro-auto-import` by default, or the shared `components` map (see [MDX setup pipeline](../../cloudcannon-snippets/astro/overview.md#mdx-setup-pipeline-must-complete-all-four)).
3. **Rename files** — `dir/index.md` becomes `dir.md`. Remove the now-empty directories.
4. **Remove `slug` frontmatter** — no longer needed since the filename provides the slug.
5. **Update CC config** — switch URL patterns from `{slug}` to `[slug]`.

When the folder structure encodes meaningful grouping beyond the slug, keep folder-per-post and use the `{slug}` workaround in [configuration-gotchas.md](../../cloudcannon-configuration/astro/configuration-gotchas.md#folder-per-post-content-and-cc-url-placeholders).

### API-driven content → a content collection

The rule is in [../content.md § API-driven content → local files](../content.md#api-driven-content--local-files). In Astro:

1. Create the collection directory (e.g. `src/content/blog/`) with markdown files matching the API's data shape.
2. Add a collection definition to `content.config.ts` with a Zod schema covering the fields the templates use.
3. Refactor page routes that called `fetch()` to use `getCollection()` / `getEntry()` + `getStaticPaths()`, with `params: { post: post.id }`.
4. Refactor components that also fetched from the API (listing components, launchers, search).

### Extracting TypeScript config to JSON data files

The rule and the keep/move table are in [../content.md § Settings in code → data files](../content.md#settings-in-code--data-files). In Astro, put the JSON files in `src/data/` and import them from the consuming components.

JSON imports widen literal types (`"ltr" | "rtl"` → `string`, `true` → `boolean`, `"x" | false` → `string`), so a TS module that re-exports the JSON no longer satisfies the original config type and builds that run `astro check` fail. Cast in the wrapper (`config as SiteConfig`) or validate it (zod parse). A cast removes the compile-time guard, so constrain those values in CloudCannon with `select`/`switch` inputs.

### Data collections in Astro

A data collection can live inside `src/content/` (an Astro content collection) or outside it (standalone JSON/YAML files exposed via `data_config`). Which pattern to use is in [../content.md § Data collections](../content.md#data-collections).
