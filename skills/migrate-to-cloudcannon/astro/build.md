# Build and Test (Astro)

Guidance for validating an Astro migration works end-to-end.

## Build verification checklist

1. **Clean the cache first** -- run `rm -rf .astro dist` before building. Astro's `.astro/` directory caches content collection data, and after major restructuring (adding/removing content files, renaming collections) the cache can serve stale entries that mask real errors or generate ghost routes from deleted files.

2. **Run the full build pipeline** -- run whatever `package.json` defines as `build`, not just `astro build`. Generators, search indexes and data generation must all be part of that script. See [build-commands.md](../../cloudcannon-configuration/build-commands.md).

3. **Verify editable attributes in output HTML** -- spot-check key pages in `dist/` to confirm `data-editable` attributes survived the build. Count occurrences on the homepage (should be the highest) and a content page.

4. **Verify the registerComponents script is bundled** -- check that the built JS assets in `dist/` contain the editable-regions code from `src/cloudcannon/registerComponents.ts`. In Astro, this ends up in a hashed JS file (e.g. `Base.astro_astro_type_script_*`).

5. **Prompt user to test in CloudCannon** -- agents should not attempt this. Use the checklist and handoff guidance in [SKILL.md § Handoff and verification](../handoff.md) (including what to ask them to verify and what to send back).

6. **`prose`-class typography audit.** Grep `class=".*\bprose\b"` across `src/**`. If any match, verify both: (a) `@tailwindcss/typography` is in `package.json` dependencies; (b) the project's main CSS file has `@plugin "@tailwindcss/typography";` directly after `@import "tailwindcss";`. Tailwind 4 is CSS-first — JS-config plugin registration does not work. Symptom of the bug: markdown body renders as unstyled text (no heading sizes, list bullets, link colour).

## CloudCannon build command

The build command goes in `.cloudcannon/initial-site-settings.json` as `build_command`. Point it at the site's full build script:

```bash
npm run build
```

Steps that run either side of `astro build` belong in that `build` script, so CloudCannon and a local build run the same thing. Steps that must run before dependencies install go in `install_command`. See [build-commands.md](../../cloudcannon-configuration/build-commands.md).

## Common issues

### Peer dependency conflicts

Current `@cloudcannon/editable-regions` versions declare no Astro peer. Use `--legacy-peer-deps` (npm) or the equivalent only if install actually reports a conflict. **MUST NOT** add it pre-emptively — it can hide real conflicts.

### Style injection

The editable-regions library injects its own styles at runtime via `createElement("style")`. Each web component manages its own styles. You do **not** need to import a separate CSS file.

### `is:inline` style imports don't work

Astro's `<style is:inline>` bypasses Vite processing, so `@import` of node_modules paths won't resolve. Import CSS from `<script>` tags instead -- Vite processes these and handles CSS imports correctly.

### `astro:content` or `astro:assets` import errors in client bundle

If the build fails because Astro virtual modules can't be resolved in the client build, ensure the `editableRegions()` integration is registered in `astro.config.mjs`. The integration's Vite plugin shims these modules for client-side rendering.
