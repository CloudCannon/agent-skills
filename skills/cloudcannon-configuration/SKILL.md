---
name: cloudcannon-configuration
description: >-
  Use when configuring a site for CloudCannon for any of the following. Download
  the JSON schemas before writing any configuration (see the top of SKILL.md).

  - Setting up cloudcannon.config.yml or .cloudcannon/initial-site-settings.json
  - Generating a baseline with the CloudCannon CLI
  - Adding or modifying Collections, Inputs, Structures, or Select Data
  - Setting up Structures for Array and Object Inputs
  - Configuring Collection URLs
  - Troubleshooting missing fields or Input types
---

# CloudCannon configuration

## When to use

- Creating or customizing `cloudcannon.config.yml` or `.cloudcannon/initial-site-settings.json`
- Adding or changing Collections, Inputs, Structures, or Select Data
- A field is missing from the editor, or shows the wrong Input type
- Configuring Collection URLs so pages open in the Visual Editor

## When not to use

- **Adding editable regions to templates** — that is [`cloudcannon-visual-editing`](../cloudcannon-visual-editing/SKILL.md). This skill configures the data behind them.
- **MDX components or inline HTML in content** — that is [`cloudcannon-snippets`](../cloudcannon-snippets/SKILL.md)
- **Running a full migration** — start at [`migrate-to-cloudcannon`](../migrate-to-cloudcannon/SKILL.md), which enters this skill at Phase 2
- **Operating on a hosted site** — authenticating, listing or creating sites, reading and writing site files, triggering builds, or changing an existing site's build configuration is [`cloudcannon-cli`](../cloudcannon-cli/SKILL.md). This skill decides what a configuration should say; that one runs the commands.

## Do this before writing any configuration

```bash
mkdir -p .cloudcannon/migration
curl -sL "https://github.com/cloudcannon/configuration-types/releases/latest/download/cloudcannon-config.latest.schema.json" \
  -o .cloudcannon/migration/cloudcannon-config.latest.schema.json
curl -sL "https://github.com/cloudcannon/configuration-types/releases/latest/download/cloudcannon-initial-site-settings.schema.json" \
  -o .cloudcannon/migration/cloudcannon-initial-site-settings.schema.json
```

Do not proceed until both files exist. Training data hallucinates keys — the schemas are the only authoritative source.

Query recipes, the `.gitignore` rule, and the `yaml-language-server` rule are in [json-schemas.md](json-schemas.md).

This skill covers creating and customizing `cloudcannon.config.yml` (tells CloudCannon how to understand and present your site's content), and `.cloudcannon/initial-site-settings.json` (tells CloudCannon how build your site).

Generate a baseline configuration with the CloudCannon CLI if the site has no CloudCannon config yet — check for `cloudcannon.config.{yml,yaml,json,js,cjs,mjs}`, not only `.yml`. If one exists, run the command below with `--dry-run` for reference only and customize the existing file; without `--dry-run` the CLI writes a second `cloudcannon.config.yml` beside it. Otherwise, run:

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings
```

This detects your SSG, collections, and build settings, and writes `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json`. The output likely needs customization — it does not infer input types, structures, select data, or editor toolbars. See [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md) for step-by-step control and customization targets.

Observed hallucinations and their real keys: [§ Common invalid keys](#common-invalid-keys).

## Contents

| File                                                 | Covers                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [configuration.md](configuration.md)                 | **Start here when writing config** — the baseline, review, customization and shared verification checklist that every SSG follows                                                                                                           |
| [json-schemas.md](json-schemas.md)                   | Querying the authoritative schemas — do this before writing any key                                                                                                                                                                         |
| [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md) | Generating a baseline with `configure`, and `validate`. CLI output **always** needs customization — it infers no input types, structures, select data, or toolbars. The rest of the CLI is [`cloudcannon-cli`](../cloudcannon-cli/SKILL.md) |
| [structures.md](structures.md)                       | **Read early.** Every array and object Input needs a structure or editors cannot add items. Field completeness rule and definition patterns                                                                                                 |
| [collection-urls.md](collection-urls.md)             | Collections that produce pages need a `url`. A wrong one is the most common reason a page fails to load in the Visual Editor                                                                                                                |
| [build-commands.md](build-commands.md)               | Where generators and post-build steps go — the `build` script and `install_command`                                                                                                                                                         |
| [schemas.md](schemas.md)                             | Read before writing a collection's `schemas`: one collection with many schemas, `_schema` on every file, and keeping every front matter key in the schema                                                                                   |
| [inputs.md](inputs.md)                               | **Read before writing `_inputs`.** Where inputs can be defined, cascade order, and how keys match fields (dotted paths, `[*]`, `$`)                                                                                                         |
| [configuration-gotchas.md](configuration-gotchas.md) | Cross-SSG pitfalls — select inputs, numeric values, `_editables`, markdown tables, data references, previews. Reference, not a front-to-back read                                                                                           |
| [troubleshooting.md](troubleshooting.md)             | Symptom → fix, for when configuration is already wrong                                                                                                                                                                                      |

**SSG-specific:**

Enter through the SSG's `overview.md`; it gives the reading order for that SSG's files.

| SSG   | Doc                                                              | Purpose                                                                                                    |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Astro | [astro/overview.md](astro/overview.md)                           | **Start here for Astro** — reading order and what each file covers                                         |
| Astro | [astro/configuration.md](astro/configuration.md)                 | Astro build values, Zod schema unions, image paths, Astro checklist items                                  |
| Astro | [astro/collection-urls.md](astro/collection-urls.md)             | Glob-loader `slug` override and the `trailingSlash` rule                                                   |
| Astro | [astro/configuration-gotchas.md](astro/configuration-gotchas.md) | `.astro` pages, TypeScript config, destructuring defaults, `z.union`                                       |
| Hugo  | [hugo/overview.md](hugo/overview.md)                             | **Start here for Hugo** — reading order and what each file covers                                          |
| Hugo  | [hugo/configuration.md](hugo/configuration.md)                   | CLI baseline fixes, section and bundle collections, images, site config as data, build settings, checklist |
| Hugo  | [hugo/collection-urls.md](hugo/collection-urls.md)               | `[full_slug]`, page bundles, `_index.md`, `permalinks` and `slug`/`url` overrides                          |
| Hugo  | [hugo/configuration-gotchas.md](hugo/configuration-gotchas.md)   | Goldmark and raw HTML, taxonomies, quoted numbers, routing keys, YAML config files                         |

**Rules that live in a deep-dive, flagged here because agents miss them:**

| Rule                                                                                                                                | Owner                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Explicit `_inputs` beat inference — CloudCannon's type inference is a fallback, not a substitute for configuration                  | [configuration.md](configuration.md#configure-every-field-explicitly) |
| One collection, many schemas — do not create a collection just to get a new schema (`schemas:` config; in Astro also Zod `z.union`) | [schemas.md](schemas.md)                                              |

**Other skills:**

| Skill                                                        | When to read                                                                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [make-site-multilingual](../make-site-multilingual/SKILL.md) | Configuring a multilingual site — `locales_{code}` entries under `data_config`, per-locale collections, locale-prefixed collection URLs, and why a `source:` key breaks `rosey/locales/` resolution |
| [cloudcannon-dev-server](../cloudcannon-dev-server/SKILL.md) | Letting the user open the configured site in CloudCannon and try the collections and inputs                                                                                                         |

## Checklist reinforcement

The SSG-specific configuration docs contain detailed verification checklists. These are not optional.

- **Read the checklist BEFORE starting** so you know what to aim for
- **You are not done until every checklist item is verified**
- **After every round of changes, run `npx @cloudcannon/cli validate`** — fixes unknown keys and type errors before they become hard-to-debug editor issues. See [cloudcannon-cli-guide.md § Validating Configuration](cloudcannon-cli-guide.md#validating-configuration)
- Cross-reference every Zod schema field against `_inputs` — missing fields get wrong editor types
- Every Array Input needs both a structure definition AND an `_inputs` entry linking to it (arrays of primitives instead take a `<field>[*]` input for the item type — see [structures.md § The four rules](structures.md#the-four-rules-read-first))

## Common invalid keys

Observed LLM hallucinations — not exhaustive, the JSON schemas are authoritative. Each row specifies the real key for each hallucination. Run `npx @cloudcannon/cli validate` to catch unknown keys automatically — see [cloudcannon-cli-guide.md § Validating Configuration](cloudcannon-cli-guide.md#validating-configuration).

| Wrong                                                               | Correct                                                                                                                                                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disable_url_preview: true`                                         | `disable_url: true` (toggles whether the collection has an output URL)                                                                                                           |
| `output: false` (legacy Jekyll/Hugo/Eleventy key)                   | Omit `url:` and add `disable_url: true` — or use `data_config` instead of a collection                                                                                           |
| `type: hidden` (deprecated value)                                   | `hidden: true` (sibling of `type`, works on any input; also `hidden: "<query>"` for conditional hiding)                                                                          |
| `options.max` on text/textarea                                      | `options.max_length` (paired with `min_length`)                                                                                                                                  |
| `_editables.text: { bulletedlist, blockquote, format, table, ... }` | `_editables.text` is inline-only (`TextEditable`). A region's toolbar comes from its bound input's `options`; for the Content Editor, use `_editables.content` (`BlockEditable`) |
| `heading2: true`, `heading3: true`                                  | `format: "p h1 h2 h3 h4 h5 h6"` (space-separated string)                                                                                                                         |
| `options.collections: [team]` (invented)                            | `values: collections.team` with `value_key` / `preview` — see [what each `value_key` stores](inputs.md#select-values-from-a-collection)                                          |
| `options.structures: my_blocks` (bare name, invalid)                | `options.structures: _structures.my_blocks` (full path)                                                                                                                          |
| `timezone: "+10:00"` (UTC offset, invalid)                          | `timezone` is a top-level key and a strict IANA-name enum (e.g. `Australia/Melbourne`, `America/New_York`), not a UTC offset. Default `Etc/UTC`                                  |
| `paths.collections`, `paths.data` (legacy keys)                     | No such keys. Use `collections_config.<name>.path` and `data_config.<name>.path`                                                                                                 |
| `paths.output` (invented)                                           | No such key. `paths` configures asset directories only. Tell the build tool where the output is; nothing reads it from config                                                    |
| Arbitrary Material Symbols name (e.g. `place`)                      | Icon must be in the fixed enum (e.g. `location_on`). Invalid names render as a broken icon — check the schema for names                                                          |

## Common mistakes

| Excuse                                                                                 | Reality                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The CloudCannon CLI output is good enough"                                            | The CloudCannon CLI gives a baseline. It always needs customization — inputs, structures, select data, toolbars.                                                                                                                                                                                                                                                             |
| "This array doesn't need a structure"                                                  | Every array of objects needs a structure, or editors can't add items. No exceptions. An array of primitives (strings, numbers) takes a `<field>[*]` input for its item type instead → [structures.md § The four rules](structures.md#the-four-rules-read-first).                                                                                                             |
| "I'll add `_inputs` config later"                                                      | Missing inputs now means broken editing later. Configure as you go.                                                                                                                                                                                                                                                                                                          |
| "CloudCannon will infer the right input type"                                          | CC's inference is a fallback to configuration. Explicit `_inputs` entries prevent wrong editor types.                                                                                                                                                                                                                                                                        |
| "The URL pattern looks right"                                                          | Test it. Wrong URLs are the #1 reason pages fail to load in the Visual Editor. Check trailing slashes.                                                                                                                                                                                                                                                                       |
| "Data collections don't need configuration"                                            | Data files need inputs and structures like any other content: per file with `file_config` (the default, which keeps keys scoped to the file), or on the collection that holds them. `data_config` is separate: it exposes a file as a dataset (`values: data.<name>`, `@data[<name>]` regions, the Visual Editor API). It doesn't configure editing.                         |
| "I don't need `_select_data` — editors can type values"                                | Every select needs its options configured; free text drifts, and `allow_create` values never join the list. Decide the home by who adds an option — a dataset (`values: data.<name>`) when editors do, `_select_data` for a small list the code branches on. See [configuration-gotchas.md § Editor-owned option lists](configuration-gotchas.md#editor-owned-option-lists). |
| "I split theme/navigation/socials into 3 collections for nicer sidebar icons"          | Single `data` collection + per-file `file_config` is the default; use `$.options.preview.icon` on each file's root to get per-file icons without the config bloat. See [configuration-gotchas.md § Single `data` collection or split?](configuration-gotchas.md#single-data-collection-or-split).                                                                            |
| "I copied the colors block from a reference config — it has `accent` and `background`" | Before adding `_inputs`, list the data file's actual keys. Inputs for missing keys are silently ignored; missing inputs for real keys fall through to plain text. See [configuration-gotchas.md § Data inputs must follow the data file](configuration-gotchas.md#data-inputs-must-follow-the-data-file-not-a-template).                                                     |
| "The icon field is optional so I left it out of the structure value"                   | Every field that appears on any item must be in the value template with a default — otherwise CC can't match existing items and editors can't add the field to new ones. See [structures.md § Optional fields — common mistake](structures.md#optional-fields--common-mistake).                                                                                              |
| "It's just a string field, `type: text` is fine"                                       | If the component branches on the value (`variant === 'primary'`, `target === '_blank'`), it's an enum. Use `type: select` with the known values. Free-text for an enum is a silent-bug factory.                                                                                                                                                                              |
