---
name: migrating-to-cloudcannon
description: >-
  Migrate an existing SSG site to work with CloudCannon. Use when the user wants
  to onboard a site to CloudCannon, add CMS support, or make a template
  CloudCannon-compatible.
---

# Migrating to CloudCannon

Orchestrates a full migration of an existing SSG site to CloudCannon. Coordinates five phases, delegating domain-specific work to standalone skills that can also be used independently.

**MUST:** use a high-reasoning model for this skill.
**Why:** migrations involve multi-file architectural decisions across five phases; fast/lightweight models miss structural issues.

## Supported SSGs

| SSG   | Guide                                  |
| ----- | -------------------------------------- |
| Astro | [astro/overview.md](astro/overview.md) |

## Chaining with upstream skills

If the site is being **generated** as part of this task (e.g. converting from WordPress), read [astro/cc-friendly-conventions.md](astro/cc-friendly-conventions.md) before scaffolding — it covers the structural choices that make the migration smooth. Once scaffolded, return here and run the migration phases.

## Step 1: Detect the SSG

Run from the project root:

```bash
npx @cloudcannon/cli configure detect-ssg
```

Use the detected SSG to pick the correct guide above.

## Migration phases

Each SSG guide walks through these in order. Phases that delegate to standalone skills are marked below.

1. **Audit** — Analyze content structure, components, routing, and build pipeline before changing anything.
2. **Configuration** — Generate and customize CloudCannon config files.
   - Read the `cloudcannon-configuration` skill.
   - If the site uses MDX components or inline HTML in content, also read the `cloudcannon-snippets` skill.
3. **Content** — Restructure content files if needed so they're CMS-friendly.
4. **Visual editing** — Add editable regions for CloudCannon's Visual Editor.
   - Read the `cloudcannon-visual-editing` skill.
5. **Build and test** — Validate the migration end-to-end.

Not every site needs all phases. Small sites may skip Phase 3 if content is already well-structured. Phase 4 is optional but high-value.

### Phase discipline

**MUST:** read each phase doc's checklist before starting the phase, then verify every item before marking it complete.
**Why:** checklists catch things you will otherwise miss — data collections missing from `collections_config`, `data_config` entries missing for referenced data files, blog/detail page editables skipped while focusing on page builder blocks, arrays not linked to structures.

**Phases are sequential, not siloed.** When a later-phase concern (e.g. a missing frontmatter field) blocks the current phase from producing the right result, make the targeted fix now. Small, mechanical fixes (adding a missing field, normalizing a value) are fine in any phase. Structural changes (moving files, reorganizing collections, altering rendering) wait for their proper phase.

## Sectioning large migrations

After the audit, count from `migration/audit.md`:

| Signal | Threshold | Source |
|---|---|---|
| Total pages | > 30 | Audit § Pages and routing |
| Hardcoded `.astro` → YAML conversions | > 15 | Audit census table rows recommending page-builder or fixed-schema collection |
| Distinct collections | > 5 | Audit § Content collections + new collections from census |

**If any 2 thresholds are tripped, pause before Phase 2 and propose a sectioning plan to the user.** Single-pass migrations erode agent context and miss helper-script opportunities.

| Shape | When |
|---|---|
| **Vertical (per-collection)** | Page-builder pages or unique-shape collections dominate — each unit has its own schema/visual-editing decisions |
| **Horizontal (per-phase)** | Collections are mostly uniform — repetitive per-collection work benefits from one mental model at a time |

Present as: *"Audit shows N pages / M hardcoded conversions / K collections. Recommend breaking into X sessions: [proposed split]. One pass is faster wall-clock; sectioning trades that for fresher context and fewer repeat mistakes. One pass, or break it up?"*

**Repetition → script rule:** After migrating 2 entries of the same shape, write a throwaway script for the rest. 23 hand-conversions of the same article shape is wasted tokens and an error multiplier.

## Scripts

Deterministic migration steps are automated as scripts in [scripts/](scripts/). Run these before or during the relevant phase.

## Migration notes

Create a `migration/` directory at the project root with one file per phase (`audit.md`, `configuration.md`, `content.md`, `visual-editing.md`, `build.md`). Document decisions, findings, and anything the user should review as work progresses.

## Handoff and verification

### Testing boundaries

| Check                                                   | Owner  |
| ------------------------------------------------------- | ------ |
| Local build (`npm run build` or whatever `package.json` defines) | Agent  |
| Builds, greps, small scripts, `dist/` inspection        | Agent  |
| Fidelity checks in CloudCannon (preview, inline edit, save-to-git) | Human  |

Prefer asking the user to run CloudCannon verification over spinning up long-lived dev servers or heavy end-to-end testing in the agent session.

### When to close with the user

Close after a **meaningful chunk**, not every tiny edit. At minimum: when Phase 5 (Build and test) is done for a first full migration pass. If the user stops earlier (e.g. after configuration only), hand off at that milestone instead.

### What to say

Be direct and brief:

1. A short summary of what changed.
2. A checklist the user can run.
3. One clear ask for feedback.

Skip empty phrases ("let me know if you need anything"). Thanking them once for checking is fine.

### What to ask the user to verify

- **Local build** — the project's real build entrypoint, not a partial command. If it fails, paste the full error output (command, exit code, last ~30 lines of stderr).
- **Checks you already ran** — state them in one line so the user doesn't duplicate work.
- **CloudCannon (human)** — confirm in the hosted environment:
  - Inline text regions can be edited in the preview on representative pages
  - Image regions open the image picker
  - Array regions show add/remove/reorder controls where arrays were wired
  - Cross-file editables (`@file`, shared partials) update the intended source file
  - Saved changes land in the expected files in git

### What to ask the user to send back

Concrete signals: the exact command run, CloudCannon build log snippets if the remote build failed, the page URL and what they clicked if the editor misbehaved, or a short description of what differs from expected.

### Iteration

End with one line that invites the next pass — when they've run those checks, reply with any failures or odd behavior.

## Naming conventions

Follow existing project conventions when present. Otherwise:

- `kebab-case` for files
- `camelCase` for JavaScript and JSON
- Markdown frontmatter and YAML: match existing component prop names so frontmatter keys pass through without translation
- New fields with no existing convention: prefer `snake_case`

## Common pitfalls

For migration process and architecture mistakes, see the phase docs:

| Topic                                          | Owner                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Classifying static pages (source-editable vs page-builder vs collection) | [astro/audit.md § Classifying static pages](astro/audit.md#classifying-static-pages-source-editables-vs-content-collection) |
| `home.md` vs `index.md`, collection-of-one     | [astro/page-building.md § Common mistakes](astro/page-building.md#common-mistakes)                                                    |
| Shared UI (CTA banners, footers, share blocks) | [astro/cc-friendly-conventions.md § Shared-UI treatment table](astro/cc-friendly-conventions.md#shared-ui-treatment-table)            |
| Multi-schema collections (`pages` with `z.union`) | [../cloudcannon-configuration/astro/configuration.md § Schemas](../cloudcannon-configuration/astro/configuration.md#schemas)       |
| Config-syntax hallucinations (wrong keys/types) | [`cloudcannon-configuration` § Common invalid keys](../cloudcannon-configuration/SKILL.md#common-invalid-keys)                        |
| Markdown body renders as unstyled text — no heading sizes, list bullets, or link colour — despite `prose prose-lg` classes | `@tailwindcss/typography` not installed or not registered. Tailwind 4 needs `@plugin "@tailwindcss/typography";` in the main CSS (after `@import "tailwindcss";`). Two-line fix: `npm install @tailwindcss/typography` + add the `@plugin` directive. *(L47)* |
