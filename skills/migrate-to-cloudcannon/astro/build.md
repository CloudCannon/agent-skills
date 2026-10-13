# Build and Test (Astro)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the Astro additions.

## Build verification checklist

1. **Clean the cache first** -- run `rm -rf .astro dist` before building. Astro's `.astro/` directory caches content collection data, and after major restructuring (adding/removing content files, renaming collections) the cache can serve stale entries that mask real errors or generate ghost routes from deleted files.

2. **Verify the registerComponents script is bundled** -- check that the built JS assets in `dist/` contain the editable-regions code from `src/cloudcannon/registerComponents.ts`. In Astro, this ends up in a hashed JS file (e.g. `Base.astro_astro_type_script_*`).

3. **`prose`-class typography audit.** Grep `class=".*\bprose\b"` across `src/**`. If any match, verify both: (a) `@tailwindcss/typography` is in `package.json` dependencies; (b) the project's main CSS file has `@plugin "@tailwindcss/typography";` directly after `@import "tailwindcss";`. Tailwind 4 is CSS-first — JS-config plugin registration does not work. Symptom of the bug: markdown body renders as unstyled text (no heading sizes, list bullets, link colour).

## Common issues

### Peer dependency conflicts

Current `@cloudcannon/editable-regions` versions declare no Astro peer. Use `--legacy-peer-deps` (npm) or the equivalent only if install actually reports a conflict. **MUST NOT** add it pre-emptively — it can hide real conflicts.

### Style injection

The editable-regions library injects its own styles at runtime via `createElement("style")`. Each web component manages its own styles. You do **not** need to import a separate CSS file.

### `is:inline` style imports don't work

Astro's `<style is:inline>` bypasses Vite processing, so `@import` of node_modules paths won't resolve. Import CSS from `<script>` tags instead -- Vite processes these and handles CSS imports correctly.

### `astro:content` or `astro:assets` import errors in client bundle

If the build fails because Astro virtual modules can't be resolved in the client build, ensure the `editableRegions()` integration is registered in `astro.config.mjs`. The integration's Vite plugin shims these modules for client-side rendering.
