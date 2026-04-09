# CloudCannon Migration Skill

This repo develops and tests a [Cursor skill](https://docs.cursor.com/context/skills) for migrating existing SSG sites to [CloudCannon](https://cloudcannon.com) -- a git-based CMS. The skill lives at `.cursor/skills/migrating-to-cloudcannon/` and includes procedural docs, reference material, and automation scripts. The goal is to package this skill so it can be given to prospective customers, letting an AI agent guide them through onboarding.

## How it works

We develop the skill by working through real site templates:

1. Pick an existing SSG template that has no CloudCannon knowledge
2. Add the untouched template to `templates/<name>/pristine/` and copy it to `templates/<name>/migrated/`
3. Use an AI agent (armed with the skill) to migrate `migrated/`
4. Review the result and refine the skill docs and scripts based on what we learn

The skill docs are **living documents** -- agents are expected to update them as they discover new patterns, edge cases, or better approaches.

## Repository structure

```
.cursor/
  rules/                              # Project-specific agent rules (not shipped)
  skills/
    migrating-to-cloudcannon/         # The skill -- this is the primary output
      SKILL.md                        # Entry point -- detects SSG, routes to SSG guide
      GUIDE.md                        # Human traversal guide (file map, reading order, decision tree)
      gadget-guide.md                 # Core: Gadget CLI commands and options
      editable-regions.md             # Core: region types, attribute reference
      editable-regions-internals.md   # Core: lifecycle, JS API, quirks (read on demand)
      collection-urls.md              # Core: URL patterns, placeholders, trailing slash
      structures.md                   # Core: inline vs split, previews, field completeness
      snippets.md                     # Core: snippet concepts, when to use, config patterns
      snippets/                       # Snippet sub-docs
        built-in-templates.md         #   MDX template reference, parser internals
        raw.md                        #   Raw snippet syntax, all parser types
        template-based.md             #   Template-based snippet workflow
        gotchas.md                    #   Snippet pitfalls and debugging
      astro/                          # Astro-specific migration guide
        overview.md                   #   Astro entry point with phase links
        audit.md                      #   Phase 1: Analyze the Astro site
        configuration.md              #   Phase 2: CC config, schemas, inputs
        configuration-gotchas.md      #   Phase 2: Patterns and pitfalls
        page-building.md              #   Phase 2/4: Pages collection, page builder
        content.md                    #   Phase 3: Content review
        snippets.md                   #   Phase 2: Astro snippet configuration
        visual-editing.md             #   Phase 4: Visual editor setup
        build.md                      #   Phase 5: Build and validate
      scripts/                        # Deterministic migration scripts
        README.md                     #   Script descriptions and future ideas
        audit-astro.sh                #   Phase 1: Gather audit data
        rename-dash-index.sh          #   Phase 3: Rename -index.md to index.md
        setup-editable-regions.sh     #   Phase 4: Install + configure editable regions

add-test-site.mjs                    # Clone a template repo into pristine/ + migrated/
run-test-site.mjs                    # Install, build, and launch Fog Machine for a template

templates/
  <name>/
    pristine/                         # Untouched original (never modify)
    migrated/                         # Agent works here
      migration/
        transcripts/                  # Archived agent transcripts (.jsonl)
```

## Agent reading order

For a detailed walkthrough of how agents (and humans reviewing agent behavior) traverse the skill files -- including reading order per phase, decision trees for optional docs, and a cross-reference map -- see [GUIDE.md](.cursor/skills/migrating-to-cloudcannon/GUIDE.md).

The short version: `SKILL.md` detects the SSG and routes to `astro/overview.md`, which links to phase docs (audit -> configuration -> content -> visual-editing -> build). Each phase doc references core docs and scripts on demand. The ideal agent reads just-in-time rather than front-loading all reference docs at once.

## Key principles

**Scripts first**: Anything deterministic and repetitive should be a script, not an agent task. This saves tokens, improves consistency, and makes the process more predictable.

**Just-in-time reading**: Agents should read docs as needed during each phase rather than loading everything upfront. The skill is structured to support this.

## Getting started

### Prerequisites

- [Cursor](https://cursor.com) IDE with agent mode
- [Fog Machine](https://github.com/CloudCannon/fog-machine) for testing CloudCannon locally (human-operated, not for agents)

### Working on a template

1. Add a new template: `npm run add-template -- <name> <repo-url>`
   - Clones the repo into `templates/<name>/pristine/`, removes `.git`, and copies to `migrated/`
2. Open the repo in Cursor and ask the agent to migrate `migrated/` -- it will pick up the `migrating-to-cloudcannon` skill automatically
3. As the agent works, review its changes and prompt it to update the skill docs if it discovers something new
4. Test the result: `npm run fog-template -- <name>`
   - Installs dependencies, builds, and launches Fog Machine on the output
5. To start fresh, delete `migrated/` and copy `pristine/` again

### Editing the skill directly

The files in `.cursor/skills/migrating-to-cloudcannon/` are the primary output of this project. Edit them directly or let agents update them during migrations. The `.cursor/rules/` directory contains project-specific conventions for how we develop the skill -- these are not part of the shipped deliverable.

## Templates

| Template | SSG | Status |
|----------|-----|--------|
| [accessible-astro-starter](templates/accessible-astro-starter/) | Astro | Migrated |
| [astro-cactus](templates/astro-cactus/) | Astro | Migrated |
| [astro-nano](templates/astro-nano/) | Astro | Migrated |
| [astro-paper](templates/astro-paper/) | Astro | Migrated |
| [astrofy](templates/astrofy/) | Astro | Migrated |
| [astroplate](templates/astroplate/) | Astro | Migrated |
| [astroship](templates/astroship/) | Astro | Migrated |
| [astrowind](templates/astrowind/) | Astro | Migrated |
| [astrowind2](templates/astrowind2/) | Astro | Migrated |
