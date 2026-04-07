# Build and Test (Astro)

Guidance for validating an Astro migration works end-to-end.

## Build verification checklist

1. **Run the full build pipeline** -- use whatever `package.json` defines as the `build` script, not just `astro build`. Pre-build scripts (theme generation, search index, JSON data generation) must be included.

2. **Verify editable attributes in output HTML** -- spot-check key pages in `dist/` to confirm `data-editable` attributes survived the build. Count occurrences on the homepage (should be the highest) and a content page.

3. **Verify the registerComponents script is bundled** -- check that the built JS assets in `dist/` contain the editable-regions code from `src/cloudcannon/registerComponents.ts`. In Astro, this ends up in a hashed JS file (e.g. `Base.astro_astro_type_script_*`).

4. **Prompt user to test in CloudCannon** -- agents should not attempt this. Provide the user with what to verify:
   - Inline text regions can be edited in the preview on representative pages
   - Image regions open the image picker
   - Array regions show add/remove/reorder controls where arrays were wired
   - Cross-file editables (`@file`, shared partials, etc.) update the intended source file—not always the page being viewed
   - Saved changes land in the expected files in git

## CloudCannon build command

The build command CloudCannon runs must match the full pipeline—usually the same sequence as the `build` script in `package.json`. For sites that run generators or other steps before Astro, chain them with `&&` before `astro build`.

**Example only** (replace with your real scripts; many sites need only `astro build` or `npm run build`):

```bash
node scripts/your-prebuild-step.js && node scripts/another-step.js && astro build
```

This goes in `.cloudcannon/initial-site-settings.json` as the `build_command`, or in `.cloudcannon/prebuild` if using the prebuild script approach (see [configuration.md](configuration.md)).

## Common issues

### Peer dependency conflicts

Older `@cloudcannon/editable-regions` versions may not list Astro 5+ as a supported peer. Use `--legacy-peer-deps` (npm) or equivalent to bypass.

### Style injection

The editable-regions library injects its own styles at runtime via `createElement("style")`. Each web component manages its own styles. You do **not** need to import a separate CSS file.

### `is:inline` style imports don't work

Astro's `<style is:inline>` bypasses Vite processing, so `@import` of node_modules paths won't resolve. Import CSS from `<script>` tags instead -- Vite processes these and handles CSS imports correctly.

### `astro:content` or `astro:assets` import errors in client bundle

If the build fails because Astro virtual modules can't be resolved in the client build, ensure the `editableRegions()` integration is registered in `astro.config.mjs`. The integration's Vite plugin shims these modules for client-side rendering.

