# Build and Test (Astro)

Guidance for validating an Astro migration works end-to-end.

## Visual diff check (optional)

If a baseline was captured during the audit phase, run the visual comparison after building. If no baseline was captured (user opted out or Playwright wasn't available), skip this step and rely on manual spot-checks.

```bash
node visual-diff.mjs compare <site-dir>
```

This requires full sandbox permissions (`required_permissions: ["all"]`) because Playwright launches Chromium.

This screenshots the same routes, diffs them against the baseline, and reports any pages exceeding the pixel-diff threshold (default 1%). Diff images are saved to `<site-dir>/.visual-diff/diffs/` for manual review. Use `--no-build` if you've already built, or `--threshold=N` to adjust the percentage threshold.

## Build verification checklist

1. **Clean the cache first** -- run `rm -rf .astro dist` before building. Astro's `.astro/` directory caches content collection data, and after major restructuring (adding/removing content files, renaming collections) the cache can serve stale entries that mask real errors or generate ghost routes from deleted files.

2. **Run the full build pipeline** -- use whatever `package.json` defines as the `build` script, not just `astro build`. Pre-build scripts (theme generation, search index, JSON data generation) must be included.

3. **Verify editable attributes in output HTML** -- spot-check key pages in `dist/` to confirm `data-editable` attributes survived the build. Count occurrences on the homepage (should be the highest) and a content page.

4. **Verify the registerComponents script is bundled** -- check that the built JS assets in `dist/` contain the editable-regions code from `src/cloudcannon/registerComponents.ts`. In Astro, this ends up in a hashed JS file (e.g. `Base.astro_astro_type_script_*`).

5. **Prompt user to test in CloudCannon** -- agents should not attempt this. Use the checklist and handoff guidance in [SKILL.md § Handoff and verification](../SKILL.md#handoff-and-verification) (including what to ask them to verify and what to send back).

## CloudCannon build command

The build command CloudCannon runs must match the full pipeline—usually the same sequence as the `build` script in `package.json`. For sites that run generators or other steps before Astro, chain them with `&&` before `astro build`.

**Example only** (replace with your real scripts; many sites need only `astro build` or `npm run build`):

```bash
node scripts/your-prebuild-step.js && node scripts/another-step.js && astro build
```

This goes in `.cloudcannon/initial-site-settings.json` as the `build_command`, or in `.cloudcannon/prebuild` if using the prebuild script approach (see [configuration.md](../../cloudcannon-configuration/astro/configuration.md)).

## Common issues

### Peer dependency conflicts

Older `@cloudcannon/editable-regions` versions may not list Astro 5+ as a supported peer. Use `--legacy-peer-deps` (npm) or equivalent to bypass.

### Style injection

The editable-regions library injects its own styles at runtime via `createElement("style")`. Each web component manages its own styles. You do **not** need to import a separate CSS file.

### `is:inline` style imports don't work

Astro's `<style is:inline>` bypasses Vite processing, so `@import` of node_modules paths won't resolve. Import CSS from `<script>` tags instead -- Vite processes these and handles CSS imports correctly.

### `astro:content` or `astro:assets` import errors in client bundle

If the build fails because Astro virtual modules can't be resolved in the client build, ensure the `editableRegions()` integration is registered in `astro.config.mjs`. The integration's Vite plugin shims these modules for client-side rendering.

