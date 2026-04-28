---
name: cloudcannon-configuration
description: >-
  Use when configuring a site for CloudCannon, setting up cloudcannon.config.yml,
  adding collections, configuring inputs or structures, or troubleshooting
  CloudCannon configuration issues.
---

# CloudCannon Configuration

Create and customize `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` — the files that tell CloudCannon how to understand and present a site's content.

## When to use

- Setting up CloudCannon configuration for a new site
- Adding or modifying collections, inputs, structures, or select data
- Configuring the CloudCannon CLI to generate a baseline config
- Troubleshooting collection URLs, missing fields, or editor input types
- Setting up structures for arrays and object inputs

## Schema is source of truth

**MUST:** when writing a novel key or input type, WebFetch the relevant TS file below and scan for the property before writing.
**Why:** agents repeatedly invent keys the schema rejects (`disable_url_preview`, `type: hidden`, `options.collections`, `paths.collections`). TS files are shorter than the generated JSON schema and every property has a `.meta({ description: ... })`.

| TS file                                                                                                               | What it defines                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/configuration.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/configuration.ts) | Top-level keys: `paths`, `source`, `collections_config`, `collection_groups`, `data_config`, `file_config`, `editor`, `markdown`, `timezone`, `_snippets*`  |
| [`src/cascade.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/cascade.ts)             | Keys that work at root or inside collections: `_inputs`, `_select_data`, `_structures`, `_editables`, `_enabled_editors`                                    |
| [`src/paths.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/paths.ts)                 | The 7 `paths.*` keys (asset directories only — nothing else)                                                                                                |
| [`src/collections.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/collections.ts)     | `CollectionConfig` (every key on a `collections_config` entry), `AddOption`, `Schema`, `SortOption`, `CollectionGroup`                                      |
| [`src/inputs.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/inputs.ts)               | The 29 input types and per-type options. Shared properties (`hidden`, `disabled`, `comment`, `context`, `instance_value`) live on `BaseInputSchema`         |
| [`src/editables.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/editables.ts)         | `TextEditable` (inline-only), `BlockEditable` (inline + block + image), `ToolbarOptions`, and how `_editables.{content,block,text,image,link}` map to these |
| [`src/structures.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/structures.ts)       | `_structures` shape, structure values, `style: select \| modal`, `id_key`                                                                                   |
| [`src/select-values.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/select-values.ts) | `_select_data` and how select `values` accept a dataset reference string                                                                                    |
| [`src/icon.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/icon.ts)                   | The fixed icon enum (curated subset of Material Symbols — arbitrary names silently fall back)                                                               |

The published JSON schema is also available at [`cloudcannon-config.schema.json`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/cloudcannon-config.schema.json), but prefer the TS source for reading.

**Feedback loop:** modern IDEs auto-validate `cloudcannon.config.yml` via [JSON Schema Store](https://www.schemastore.org/) — red squigglies appear on every invalid key in real time. Use it as the safety net. See [cloudcannon-cli-guide.md § JSON Schemas](cloudcannon-cli-guide.md#json-schemas). **Do not** add a `# yaml-language-server: $schema=...` comment — it breaks the SchemaStore association.

## Common invalid keys

Observed LLM hallucinations. Not exhaustive — the TS source is authoritative. Each row links to the file where the real key is defined.

| Wrong                                                               | Right                                                                                                                                          | Defined in                                                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `disable_url_preview: true`                                         | `disable_url: true` (toggles whether the collection has an output URL)                                                                         | [`src/collections.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/collections.ts)                        |
| `output: false` (legacy Jekyll/Hugo key)                            | Omit `url:` and add `disable_url: true` — or use `data_config` instead of a collection                                                         | [`src/collections.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/collections.ts)                        |
| `type: hidden`                                                      | `hidden: true` (sibling of `type`, works on any input; also `hidden: "<query>"` for conditional hiding)                                        | [`src/inputs.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/inputs.ts) `BaseInputSchema`                |
| `options.max` on text/textarea                                      | `options.max_length` (paired with `min_length`)                                                                                                | [`src/inputs.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/inputs.ts) `TextValidationSchema`           |
| `_editables.text: { bulletedlist, blockquote, format, table, ... }` | `_editables.text` is inline-only (`TextEditable`). For block-level formatting use `_editables.content` or `_editables.block` (`BlockEditable`) | [`src/editables.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/editables.ts)                            |
| `heading2: true`, `heading3: true`                                  | `format: "p h1 h2 h3 h4 h5 h6"` (space-separated string)                                                                                       | [`src/editables.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/editables.ts) `ToolbarOptions`           |
| `options.collections: [therapists]` (invented)                      | `values: collections.therapists` with `value_key` / `preview`                                                                                  | [`src/inputs.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/inputs.ts) `SharedSelectInputOptionsSchema` |
| `options.structures: my_blocks` (bare name, unreliable)             | `options.structures: _structures.my_blocks` (full path)                                                                                        | [`src/structures.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/structures.ts)                          |
| `paths.collections`, `paths.data`                                   | No such keys. Use `collections_config.<name>.path` and `data_config.<name>.path`                                                               | [`src/paths.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/paths.ts)                                    |
| Arbitrary Material Symbols name (e.g. `place`)                      | Icon must be in the fixed enum (e.g. `location_on`). Invalid names silently fall back — grep the file                                          | [`src/icon.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/icon.ts)                                      |

## Docs

| Doc                                                  | When to read                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md) | Generating baseline config with the CloudCannon CLI                                                                           |
| [structures.md](structures.md)                       | Defining structures for arrays and object inputs. **Read this early** — missing structures are the most common config mistake |
| [collection-urls.md](collection-urls.md)             | URL patterns for collections. Wrong URLs = pages won't load in the Visual Editor                                              |

**SSG-specific:**

| SSG   | Doc                                                              | Purpose                                                                         |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Astro | [astro/configuration.md](astro/configuration.md)                 | Full configuration workflow, customization checklist, verification checklist    |
| Astro | [astro/configuration-gotchas.md](astro/configuration-gotchas.md) | Icon fields, numeric values, markdown tables, and other Astro-specific pitfalls |

## Checklists are mandatory

**MUST:** read each SSG doc's verification checklist before starting the phase, then verify every item before marking it done.
**Why:** the checklists catch things you will otherwise miss — missing `_inputs` entries, unlinked structures, wrong URL patterns. See [structures.md § Mandatory rules](structures.md#mandatory-rules-read-first) and the relevant `astro/*.md`.
