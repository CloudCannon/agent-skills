# CloudCannon Setup with Gadget — AI Skill Guide

This guide is for AI agents and skill file authors who want to automate CloudCannon CMS setup for a project. Gadget is a CLI tool that inspects a project's file structure and generates the configuration files CloudCannon needs.

## Prerequisites

- Node.js 22+ installed
- A project with source files (HTML, Markdown, data files, etc.)

## Quick Setup (One Command)

For fully automated setup, run from the project root:

```bash
npx @cloudcannon/gadget generate --auto --init-settings
```

This generates:
- `cloudcannon.config.yml` — CloudCannon configuration with detected SSG settings, collections, and paths
- `.cloudcannon/initial-site-settings.json` — Build settings (install command, build command, output path) so the site builds on first upload

> **One-time only:** `initial-site-settings.json` is read when CloudCannon provisions the site for the first time. After that, these settings live in the CloudCannon UI and the file is ignored. If a user asks to change build commands, Node version, or other build settings for an existing site, the agent cannot make that change via code — recommend the user check **Site Settings > Builds > Configuration** in the CloudCannon dashboard instead.

## Step-by-Step Setup (More Control)

For more control, run each detection step independently. All subcommands output JSON to stdout.

### 1. Detect the Static Site Generator

```bash
npx @cloudcannon/gadget detect-ssg
```

Returns the detected SSG and confidence scores:
```json
{
  "ssg": "astro",
  "scores": { "astro": 50, "hugo": 0, "jekyll": 0 }
}
```

Use the detected SSG key in subsequent commands via `--ssg`.

### 2. Detect the Source Folder

```bash
npx @cloudcannon/gadget detect-source --ssg astro
```

Returns:
```json
{ "source": "src", "ssg": "astro" }
```

This is informational only — **do not set `source` in `cloudcannon.config.yml`** during migration. See [astro/configuration.md](astro/configuration.md) for details on why `source` should be omitted.

### 3. Inspect Available Collections

```bash
npx @cloudcannon/gadget collections --ssg astro
```

Returns a tree of detected collections. Each collection has a `suggested: true/false` flag indicating whether gadget recommends including it. Collections represent groups of files for editing in CloudCannon (e.g., blog posts, pages, data files).

### 4. Inspect Build Suggestions

```bash
npx @cloudcannon/gadget build --ssg astro
```

Returns build command suggestions with attributions explaining why each was suggested (e.g., "because of your package.json file", "most common for Astro sites").

### 5. Generate Everything

```bash
npx @cloudcannon/gadget generate --auto --init-settings --ssg astro
```

Or get raw JSON for programmatic processing:

```bash
npx @cloudcannon/gadget generate --auto --json
```

## Customizing After Generation

Gadget generates a baseline configuration. After generation, you may want to customize:

- **`collections_config`** — Declares each **collection** CloudCannon should expose (paths, schemas, URLs) and scopes **collection-level** settings to that collection.
- **`_inputs`** — Configure how fields appear in the CloudCannon editor (dropdowns, date pickers, image uploaders, etc.)
- **`_structures`** — Define reusable component structures for array-based content
- **`collection_groups`** — Organize collections into sidebar groups
- **`_editables`** — Configure rich text editor toolbars
- **`markdown`** — Set `markdown.options.table: true` if content contains Markdown-syntax tables (default is `false` / HTML tables)
- **`_snippets`** — Add snippet support for your SSG's component syntax
- **`_select_data`** — Define shared dropdown options
- **`file_config`** — Per-file configuration overrides

The full list of available configuration keys is defined in the [CloudCannon Configuration JSON Schema](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/cloudcannon-config.schema.json). For autocomplete and validation in the editor, use JSON Schema Store and the extensions below—not ad-hoc schema comments in YAML.

## JSON Schemas

CloudCannon’s config schemas are published on the [JSON Schema Store](https://www.schemastore.org/). Editors that use Schema Store map filenames such as `cloudcannon.config.yml`, `cloudcannon.config.json`, and `.cloudcannon/initial-site-settings.json` to the right schema automatically.

**Do not** add or keep a first-line `# yaml-language-server: $schema=...` comment in `cloudcannon.config.yml`. That directive overrides the Schema Store association and forces a specific URL instead of the catalogued schema.

**VS Code / Cursor:** Recommend extensions via `.vscode/extensions.json` so YAML and JSON pick up Schema Store. A minimal set used in CloudCannon’s Astro templates includes [`redhat.vscode-yaml`](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) plus Astro/Tailwind helpers—for example the same recommendations as [sendit-astro-template’s `.vscode/extensions.json`](https://github.com/CloudCannon/sendit-astro-template/blob/main/.vscode/extensions.json):

```json
{
  "recommendations": [
    "astro-build.astro-vscode",
    "redhat.vscode-yaml",
    "bradlc.vscode-tailwindcss"
  ],
  "unwantedRecommendations": []
}
```

Use the schema URLs above (and CloudCannon’s docs) when you need the raw key reference outside the IDE.

## File Placement

- **`cloudcannon.config.yml`** and **`.cloudcannon/initial-site-settings.json`** live at the **repository root**, not under `src/` or another app subdirectory.

## Example Skill File Workflow

```
1. Run `npx @cloudcannon/gadget detect-ssg` to identify the SSG
2. Parse the JSON output to get the SSG key
3. Run `npx @cloudcannon/gadget generate --auto --init-settings --ssg <key>`
4. Read the generated cloudcannon.config.yml
5. Add any project-specific customizations (_inputs, _structures, etc.)
6. Write the updated config back to disk
```

## Reference Links

- [CloudCannon Documentation](https://cloudcannon.com/documentation/)
- [Configuration File Reference](https://cloudcannon.com/documentation/developer-reference/configuration-file/)
- [Initial Site Settings Reference](https://cloudcannon.com/documentation/developer-reference/initial-site-settings-file/)
- [JSON Schemas](https://cloudcannon.com/documentation/developer-reference/schemas/)
- [Gadget on GitHub](https://github.com/CloudCannon/gadget)
- [Gadget on npm](https://www.npmjs.com/package/@cloudcannon/gadget)

> **Note:** Examples use `npx @cloudcannon/gadget`. If you install the CLI globally, you can run `gadget` instead.
