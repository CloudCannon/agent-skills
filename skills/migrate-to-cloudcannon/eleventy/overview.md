# Migration (Eleventy) — entry point

Guidance for migrating an Eleventy site to CloudCannon. Follow the phases in order. Before starting, run the [quick checks](#quick-checks) below to gather site information.

## Eleventy scope

This guide covers Eleventy sites that:

- Build with Eleventy 3. On Eleventy 2 or older, **ask the user** before upgrading — see [visual-editing.md § Setup steps — Liquid path](../../cloudcannon-visual-editing/eleventy/visual-editing.md#setup-steps--liquid-path)
- Keep page files under the input directory as Markdown, Liquid, Nunjucks or HTML with YAML front matter
- Write templates in Liquid, Nunjucks, or both. Which one renders the sections editors change decides how much of Phase 4 applies — see [overview.md § Which path the site takes](../../cloudcannon-visual-editing/eleventy/overview.md#which-path-the-site-takes)
- Produce static output in `_site/` (or the configured output directory)

A multilingual Eleventy site also needs [`make-site-multilingual`](../../make-site-multilingual/SKILL.md), independent of these phases. A site using Bookshop (`@bookshop/eleventy-bookshop` in `package.json`) needs [`cloudcannon-bookshop`](../../cloudcannon-bookshop/SKILL.md) before Phase 2.

## Quick checks

Run these from the site root before the audit, and record the output in `.cloudcannon/migration/audit.md`. [audit.md](audit.md) says what each answer decides.

- **Config file** — the first of these that exists is the one Eleventy loads:

  ```sh
  ls .eleventy.js eleventy.config.js eleventy.config.mjs eleventy.config.cjs 2>/dev/null
  ```

- **Directories and engines** — set in the config's returned object or `export const config`, or as `--input`/`--output` flags in `package.json` scripts:

  ```sh
  grep -nE 'dir|input|output|includes|layouts|data|TemplateEngine|pathPrefix' <config file> package.json
  ```

  Unset means the defaults: input `.`, includes `_includes`, data `_data` (both inside the input directory), output `_site`, and Liquid for `.md` and `.html` files.

- **Template files by type** under the input directory:

  ```sh
  find <input> -type f \( -name '*.md' -o -name '*.liquid' -o -name '*.njk' -o -name '*.html' \) -not -path '*/node_modules/*' -not -path '*/_site/*' | sed 's/.*\.//' | sort | uniq -c
  ```

- **Helpers the config registers** — shortcodes, filters, tags and plugins:

  ```sh
  grep -nE 'add(Async)?(Paired)?Shortcode|add(Async)?Filter|add(Liquid|Nunjucks)Tag|addPlugin|addDataExtension|addPassthroughCopy|require\(|^import' <config file>
  ```

- **Tags used in content** — every `{% name` in Markdown files. Shortcodes and includes here are snippet or block candidates; `if`, `for` and `raw` are template logic:

  ```sh
  grep -rhoE '\{%-? *[a-zA-Z_]+' <input> --include='*.md' --exclude-dir=node_modules | sed -E 's/\{%-? *//' | sort | uniq -c | sort -rn
  ```

- **Data** — data files by type, directory data files, and computed data:

  ```sh
  ls <input>/<data dir>
  find <input> -name '*.11tydata.*' -not -path '*/node_modules/*'
  grep -rln 'eleventyComputed' <input> --include='*.md' --include='*.json' --include='*.js' --include='*.yml' --exclude-dir=node_modules
  ```

- **Bookshop** — `grep -n bookshop package.json <config file>`.

## Phases

### Phase 1: Audit

Analyze the site before making any changes. Map the config, directories, template languages, page files, data and the build pipeline.

See [audit.md](audit.md). It sends you to [../audit.md](../audit.md) for classifying static pages.

### Phase 2: Configuration

Generate a baseline with the CloudCannon CLI, then customize it from the audit. If content uses shortcodes or includes, configure snippets in this phase too.

**Read the `cloudcannon-configuration` skill** — its Eleventy entry point is [cloudcannon-configuration/eleventy/overview.md](../../cloudcannon-configuration/eleventy/overview.md). For shortcodes and includes in content, **read the `cloudcannon-snippets` skill** — [cloudcannon-snippets/eleventy/overview.md](../../cloudcannon-snippets/eleventy/overview.md).

### Phase 3: Content

Restructure content files where needed so they work in the CMS.

Read [../content.md](../content.md), then [content.md](content.md) for directory data, JS data and data-file formats. For pages that become page-builder entries, read [../page-building.md](../page-building.md), then [page-building.md](page-building.md).

### Phase 4: Visual editing

On the Liquid path, add the `@cloudcannon/editable-regions` Eleventy plugin; on the Nunjucks path, add primitive regions with no plugin.

**Read the `cloudcannon-visual-editing` skill** — its Eleventy entry point is [cloudcannon-visual-editing/eleventy/overview.md](../../cloudcannon-visual-editing/eleventy/overview.md).

### Phase 5: Build and test

Validate the migration end to end with [../build.md](../build.md), then [build.md](build.md) for parity checks and the build command. Then hand off using [../handoff.md](../handoff.md) so the user can verify in CloudCannon.

## Notes

- Not every site needs all phases. A site with well-structured front matter may skip Phase 3.
- Visual editing (Phase 4) is optional but high-value.
