# CloudCannon Agent Skills

Agent skills that help AI coding agents migrate existing SSG sites to [CloudCannon](https://cloudcannon.com) -- a git-based CMS. Copy the skills into your project, open it in your AI coding agent, and ask it to migrate your site.

## Prerequisites

- An AI coding agent that supports skills (e.g. an agent mode in your IDE)
- An existing SSG site (see [supported SSGs](#supported-ssgs))
- A [CloudCannon](https://cloudcannon.com) account (for final verification)

## Supported SSGs

| SSG   | Status    |
| ----- | --------- |
| Astro | Supported |

More SSGs are planned. Each SSG has its own directory within the relevant skills containing SSG-specific guidance.

## Available skills

The tooling is split across composable skills that can be used together or independently.

| Skill                        | Purpose                       | When to use                                                                                   |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| `migrating-to-cloudcannon`   | Full migration orchestrator   | Migrating a site to CloudCannon end-to-end (audit, configure, content, visual editing, build) |
| `cloudcannon-configuration`  | CloudCannon config setup      | Setting up `cloudcannon.config.yml`, collections, inputs, structures, or the CloudCannon CLI  |
| `cloudcannon-snippets`       | Snippet configuration         | Configuring MDX components or inline HTML for CloudCannon's Content Editor                    |
| `cloudcannon-visual-editing` | Visual Editor support         | Adding editable regions so page content can be edited inline in CloudCannon's Visual Editor   |
| `brainstorming`              | Structured design exploration | Exploring intent, requirements, and tradeoffs before implementation                           |

For a full migration, start with `migrating-to-cloudcannon` -- it orchestrates the other skills at the right time. The standalone skills (`cloudcannon-configuration`, `cloudcannon-snippets`, `cloudcannon-visual-editing`) are useful when you only need one piece, e.g. "add visual editing to my existing CloudCannon site".

## Getting started

1. Run `npx skills add CloudCannon/agent-skills` in the root of your project
2. Open your project in your AI coding agent
3. Ask the agent to migrate your site to CloudCannon

The agent picks up skills automatically based on their trigger descriptions in `SKILL.md`. For a full migration, something like "migrate this site to CloudCannon" is enough to get started.

## How it works

A full migration runs through five phases:

1. **Audit** -- Analyze the site's content structure, components, routing, and build pipeline
2. **Configuration** -- Generate and customize CloudCannon config files (delegates to `cloudcannon-configuration` and optionally `cloudcannon-snippets`)
3. **Content** -- Restructure content files if needed so they're CMS-friendly
4. **Visual editing** -- Add editable regions for inline editing in CloudCannon's Visual Editor (delegates to `cloudcannon-visual-editing`)
5. **Build and test** -- Validate the migration works end-to-end

Each phase has a verification checklist. The agent reads docs just-in-time during each phase rather than front-loading everything. Deterministic steps are automated as scripts to save tokens and improve consistency.

Not every site needs all phases. Small sites may skip content restructuring. Visual editing is optional but high-value.

## Contributing

### Repo structure

```
skills/
  migrating-to-cloudcannon/         # Migration orchestrator
  cloudcannon-configuration/        # Config skill (standalone)
  cloudcannon-snippets/             # Snippets skill (standalone)
  cloudcannon-visual-editing/       # Visual editing skill (standalone)
  brainstorming/                    # Design exploration skill
```

### Key conventions

- **Living documents** -- Skills are actively maintained. When an agent uncovers a new pattern or edge case during a migration, update the relevant skill as part of the same task rather than leaving it as a follow-up.
- **Just-in-time reading** -- Agents read docs as needed during each phase rather than loading everything upfront. The skills are structured to support this.

For a detailed walkthrough of how agents traverse the skill files, see [GUIDE.md](skills/migrating-to-cloudcannon/GUIDE.md).
