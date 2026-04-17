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

## Docs

| Doc | When to read |
|---|---|
| [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md) | Generating baseline config with the CloudCannon CLI |
| [structures.md](structures.md) | Defining structures for arrays and object inputs. **Read this early** — missing structures are the most common config mistake |
| [collection-urls.md](collection-urls.md) | URL patterns for collections. Wrong URLs = pages won't load in the Visual Editor |

**SSG-specific:**

| SSG | Doc | Purpose |
|---|---|---|
| Astro | [astro/configuration.md](astro/configuration.md) | Full configuration workflow, customization checklist, verification checklist |
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

## Checklist reinforcement

The SSG-specific configuration docs contain detailed verification checklists. These are not optional.

- **Read the checklist BEFORE starting** so you know what to aim for
- **You are not done until every checklist item is verified**
- Cross-reference every Zod schema field against `_inputs` — missing fields get wrong editor types
- Every array field needs both a structure definition AND an `_inputs` entry linking to it

## Common mistakes

| Excuse | Reality |
|--------|---------|
| "The CloudCannon CLI output is good enough" | The CloudCannon CLI gives a baseline. It always needs customization — inputs, structures, select data, toolbars. |
| "This array doesn't need a structure" | Every array needs a structure or editors can't add items. No exceptions. |
| "I'll add `_inputs` config later" | Missing inputs now means broken editing later. Configure as you go. |
| "CloudCannon will infer the right input type" | CC's inference is unreliable. Explicit `_inputs` entries prevent wrong editor types. |
| "The URL pattern looks right" | Test it. Wrong URLs are the #1 reason pages fail to load in the Visual Editor. Check trailing slashes. |
| "Data collections don't need configuration" | Data files need `data_config` entries with `file_config` for proper input types and structures. |
| "I don't need `_select_data` — editors can type values" | Free-text entry leads to inconsistency. Use `_select_data` for any field with a fixed set of valid values. |
| "I split theme/navigation/socials into 3 collections for nicer sidebar icons" | Single `data` collection + per-file `file_config` is the default; use `$.options.preview.icon` on each file's root to get per-file icons without the config bloat. See [astro/configuration.md § Single `data` collection or split?](astro/configuration.md#single-data-collection-or-split). |
| "I copied the colors block from a reference config — it has `accent` and `background`" | Before adding `_inputs`, grep the actual JSON for keys. Inputs for missing keys are silently ignored; missing inputs for real keys fall through to plain text. See [astro/configuration-gotchas.md § Data inputs must follow the JSON](astro/configuration-gotchas.md#data-inputs-must-follow-the-json-not-a-template). |
| "The icon field is optional so I left it out of the structure value" | Every field that appears on any item must be in the value template with a default — otherwise CC can't match existing items and editors can't add the field to new ones. See [structures.md § Common mistakes — optional fields](structures.md#common-mistakes--optional-fields). |
