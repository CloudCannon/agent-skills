# Collection URLs (Astro)

Astro-specific URL pattern guidance. For the general collection URL reference (placeholders, filters, troubleshooting), see [../collection-urls.md](../collection-urls.md).

## Glob loader and `slug` frontmatter

Astro's `glob()` loader has a built-in feature: if a content file's frontmatter contains a `slug` field, it overrides the auto-generated `id` (which is normally the filename without extension). This means `post.id` — which most templates use for routing — can come from either:

1. The frontmatter `slug` field (when present)
2. The filename (when `slug` is absent)

This is easy to miss because the `slug` field doesn't need to be in the Zod schema — the glob loader consumes it before validation. The application code doesn't reference `data.slug` either; it's already baked into `post.id`.

**Implications for CC URLs:** When a template uses `post.id` for routing (common pattern: `params: { slug: post.id }` in `getStaticPaths`), and some content files have a `slug` frontmatter that differs from the filename, CC's `[slug]` placeholder (filename-based) gives the wrong URL for those files. Use `{slug}` (frontmatter-based) when every file in the collection sets `slug`.

**When only some files set `slug`:** no single placeholder fits, because `{slug}` is empty for the rest. Prefer URLs that come from the file name ([../collection-urls.md § The rule](../collection-urls.md#the-rule)), and ask the user before either change:

- **When few files set `slug`**, rename each one to its slug value and delete the key, so `[slug]` (or `[full_slug]` for an id that includes folders) fits every file.
- **When most files set `slug`**, the site is committed to it. Add `slug` to the rest, matching the file name, add it to the collection's schema file, and use `{slug}`. Leave the `slug` input visible so editors can set the URL of new files.

## Trailing slash rule

The URL must match the built output path exactly. Check `astro.config.mjs` for `trailingSlash` and `build.format`:

- **`build.format: "directory"` (default)** -- Astro builds pages as `dir/index.html`. URLs need a trailing slash: `/about/`, `/blog/my-post/`. This is the default even when `trailingSlash` is set to `"never"`.
- **`build.format: "file"`** -- Astro builds pages as `page.html`. URLs do not have a trailing slash: `/about`, `/blog/my-post`.
- **`build.format: "preserve"`** -- matches the source file structure. Check the output to determine the pattern.
