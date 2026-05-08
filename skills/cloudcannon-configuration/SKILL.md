---
name: cloudcannon-configuration
description: >-
  Use when configuring a site for CloudCannon, setting up cloudcannon.config.yml,
  adding collections, configuring inputs or structures, or troubleshooting
  CloudCannon configuration issues.
---

# CloudCannon Configuration

This skill covers creating and customizing `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` — the files that tell CloudCannon how to understand and present your site's content.

## When to use this skill

- Setting up CloudCannon configuration for a new site
- Adding or modifying collections, inputs, structures, or select data
- Configuring the CloudCannon CLI to generate a baseline config
- Troubleshooting collection URLs, missing fields, or editor input types
- Setting up structures for arrays and object inputs

## Schema is source of truth

The config has a JSON schema. When you're unsure about a key name, type, or shape, **read the TypeScript source — don't guess**. Agents have repeatedly invented keys the schema rejects (e.g. `disable_url_preview`, `type: hidden`, `options.collections`, `paths.collections`). The TS files are shorter and more readable than the generated JSON schema; every property has a `.meta({ description: ... })`.

Reflex: writing a novel key or input type? WebFetch the relevant TS file first, scan for the property, then write.

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
| `options.collections: [team]` (invented)                            | `values: collections.team` with `value_key` / `preview`                                                                                        | [`src/inputs.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/inputs.ts) `SharedSelectInputOptionsSchema` |
| `options.structures: my_blocks` (bare name, unreliable)             | `options.structures: _structures.my_blocks` (full path)                                                                                        | [`src/structures.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/structures.ts)                          |
| `paths.collections`, `paths.data`                                   | No such keys. Use `collections_config.<name>.path` and `data_config.<name>.path`                                                               | [`src/paths.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/paths.ts)                                    |
| Arbitrary Material Symbols name (e.g. `place`)                      | Icon must be in the fixed enum (e.g. `location_on`). Invalid names silently fall back — grep the file                                          | [`src/icon.ts`](https://raw.githubusercontent.com/CloudCannon/configuration-types/main/src/icon.ts)                                      |

## Symptom-driven gotchas

Issues you'll hit while configuring or debugging a real site, with their fix.

| Symptom                                                                                                                                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded `{value, label}` pairs for values that live in a data file                                                                         | Reference `values: data.<file>` + `value_key` + `preview` so the dropdown stays in sync with the data.                                                                                                                                                                                                                                                                                                                                                                             |
| Defined a switch/boolean in `_inputs` but the template never reads it                                                                        | An editor-visible switch that toggles nothing is a broken UX signal. For every boolean/enum field, grep the template for a conditional render. If none, add one or remove the field.                                                                                                                                                                                                                                                                                               |
| `type: markdown` with no `options:`, or using plural `snippets:`                                                                             | Editor shows an "unconfigured snippets" toolbar. Every markdown input needs explicit `options:`. Once you declare any option, all omitted keys become false. Valid keys: `bold`, `italic`, `link`, `bulletedlist`, `numberedlist`, `blockquote`, `format`, `image`, `removeformat`, `table`, `snippet` (singular). The inline `data-editable="text" data-type="block"` region and the sidebar input panel are independent channels — configuring one does not configure the other. |
| Data file is a top-level object keyed by slug (`{ "office-a": {...}, "office-b": {...} }`)                                                   | Editors can't add a third item — keys are baked into `file_config`. Convert to a top-level array with an explicit `slug` field per item; consumers switch from `data[slug]` to `data.find(d => d.slug === s)`. `values: data.<file>` + `value_key: slug` is unchanged.                                                                                                                                                                                                             |
| Visual editor errors on one entry but not others — the errored entry has a frontmatter field populated that the template renders as editable | The collection's `_inputs` has no entry for that field. Grep every `data-prop=` in the template, grep `_inputs:` in the collection config, diff the keys. Any editable region without a matching `_inputs` entry is the bug. Add an entry whose `type:` matches the region's `data-type`.                                                                                                                                                                                          |

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

## Key concepts

### CloudCannon CLI

`npx @cloudcannon/cli configure generate --auto --initial-build-settings` produces a structural baseline. It detects your SSG, collections, and build settings. **CloudCannon CLI output always needs customization** — it cannot infer input types, structures, select data, or editor toolbar configuration.

### Structures

Every array and object input needs a structure definition. Without one, editors can't add new items. See [structures.md](structures.md) for the field completeness rule and definition patterns.

### Collection URLs

Collections that produce pages need a `url` pattern so the Visual Editor can open them. A wrong URL is the most common reason pages fail to load in the Visual Editor. See [collection-urls.md](collection-urls.md).

### Inputs

Every user-facing frontmatter field needs an `_inputs` entry with the right type (`textarea`, `datetime`, `image`, `select`, `markdown`, `html`, etc.). CloudCannon's type inference is often wrong — don't rely on it.

### Multi-schema collections

One collection, many schemas. Don't make a new collection just because you need a new schema. Both CloudCannon (`schemas:` config) and Astro (Zod `z.union`) support multiple schemas in one collection. A `pages` collection can hold a default markdown page, a page-builder page, and a landing page side-by-side. See [astro/configuration.md § Schemas](astro/configuration.md#schemas) for the worked pattern.

## Checklist reinforcement

The SSG-specific configuration docs contain detailed verification checklists. These are not optional.

- **Read the checklist BEFORE starting** so you know what to aim for
- **You are not done until every checklist item is verified**
- Cross-reference every Zod schema field against `_inputs` — missing fields get wrong editor types
- Every array field needs both a structure definition AND an `_inputs` entry linking to it

## Common mistakes

| Excuse                                                                                 | Reality                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The CloudCannon CLI output is good enough"                                            | The CloudCannon CLI gives a baseline. It always needs customization — inputs, structures, select data, toolbars.                                                                                                                                                                                                        |
| "This array doesn't need a structure"                                                  | Every array needs a structure or editors can't add items. No exceptions.                                                                                                                                                                                                                                                |
| "I'll add `_inputs` config later"                                                      | Missing inputs now means broken editing later. Configure as you go.                                                                                                                                                                                                                                                     |
| "CloudCannon will infer the right input type"                                          | CC's inference is unreliable. Explicit `_inputs` entries prevent wrong editor types.                                                                                                                                                                                                                                    |
| "The URL pattern looks right"                                                          | Test it. Wrong URLs are the #1 reason pages fail to load in the Visual Editor. Check trailing slashes.                                                                                                                                                                                                                  |
| "Data collections don't need configuration"                                            | Data files need `data_config` entries with `file_config` for proper input types and structures.                                                                                                                                                                                                                         |
| "I don't need `_select_data` — editors can type values"                                | Free-text entry leads to inconsistency. Use `_select_data` for any field with a fixed set of valid values.                                                                                                                                                                                                              |
| "I split theme/navigation/socials into 3 collections for nicer sidebar icons"          | Single `data` collection + per-file `file_config` is the default; use `$.options.preview.icon` on each file's root to get per-file icons without the config bloat. See [astro/configuration.md § Single `data` collection or split?](astro/configuration.md#single-data-collection-or-split).                           |
| "I copied the colors block from a reference config — it has `accent` and `background`" | Before adding `_inputs`, grep the actual JSON for keys. Inputs for missing keys are silently ignored; missing inputs for real keys fall through to plain text. See [astro/configuration-gotchas.md § Data inputs must follow the JSON](astro/configuration-gotchas.md#data-inputs-must-follow-the-json-not-a-template). |
| "The icon field is optional so I left it out of the structure value"                   | Every field that appears on any item must be in the value template with a default — otherwise CC can't match existing items and editors can't add the field to new ones. See [structures.md § Common mistakes — optional fields](structures.md#common-mistakes--optional-fields).                                       |
| "It's just a string field, `type: text` is fine"                                       | If the component branches on the value (`variant === 'primary'`, `target === '_blank'`), it's an enum. Use `type: select` with the known values. Free-text for an enum is a silent-bug factory.                                                                                                                         |
