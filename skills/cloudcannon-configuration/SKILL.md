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

This skill covers creating and customizing `cloudcannon.config.yml`, which tells CloudCannon how to understand and present the site's content, and `.cloudcannon/initial-site-settings.json`, which tells CloudCannon how to build the site.

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

Check for an existing config in any format — `cloudcannon.config.{yml,yaml,json,js,cjs,mjs}`, not only `.yml`. If one exists, customize it, and run `configure generate` only with `--dry-run`, for reference; without `--dry-run` the CLI writes a second `cloudcannon.config.yml` beside it. If none exists, generate a baseline — see [configuration.md § Generate a baseline](configuration.md#generate-a-baseline).

## Rules for every task

- **Read** the [Verification checklist](configuration.md#verification-checklist) and the SSG's checklist before starting, so you know what to aim for.
- **Finish** only when every item in both checklists is verified.
- **Give** every field editors see an explicit `_inputs` entry; type inference is a fallback — see [configuration.md § Configure every field explicitly](configuration.md#configure-every-field-explicitly).
- **Run** `npx @cloudcannon/cli validate` after every round of changes. When it flags a key, look up the correct one in [configuration-gotchas.md § Invalid keys](configuration-gotchas.md#invalid-keys).

## Contents

| File                                                 | Read when                                                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [configuration.md](configuration.md)                 | Always, first, when writing config — the steps and the shared verification checklist.                                         |
| [json-schemas.md](json-schemas.md)                   | Before writing any key, to check it exists in the schema.                                                                     |
| [cloudcannon-cli-guide.md](cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating; the rest of the CLI is [`cloudcannon-cli`](../cloudcannon-cli/SKILL.md). |
| [schemas.md](schemas.md)                             | Before adding a collection or writing its `schemas` — one collection can hold many schemas.                                   |
| [inputs.md](inputs.md)                               | Before writing `_inputs`.                                                                                                     |
| [structures.md](structures.md)                       | Any field holds an array or an object, since editors can't add items without a structure.                                     |
| [collection-urls.md](collection-urls.md)             | Any collection produces pages, or a page fails to load in the Visual Editor.                                                  |
| [build-commands.md](build-commands.md)               | The build has generators or post-build steps.                                                                                 |
| [configuration-gotchas.md](configuration-gotchas.md) | Looking up a cross-SSG pitfall while configuring, or a key that `validate` flagged.                                           |
| [troubleshooting.md](troubleshooting.md)             | Configuration is already wrong and you're working from a symptom.                                                             |

**SSG-specific:** enter through the SSG's `overview.md`; it gives the reading order and lists every file for that SSG.

| The site uses | Start at                               |
| ------------- | -------------------------------------- |
| Astro         | [astro/overview.md](astro/overview.md) |
| Hugo          | [hugo/overview.md](hugo/overview.md)   |

**Other skills:**

| Skill                                                        | Read when                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [make-site-multilingual](../make-site-multilingual/SKILL.md) | Configuring a multilingual site: locale datasets, per-locale collections and locale-prefixed URLs. |
| [cloudcannon-dev-server](../cloudcannon-dev-server/SKILL.md) | The user wants to open the configured site in CloudCannon and try the collections and inputs.      |
