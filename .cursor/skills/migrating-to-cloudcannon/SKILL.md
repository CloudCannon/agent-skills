---
name: migrating-to-cloudcannon
description: >-
  Migrate an existing SSG site to work with CloudCannon. Use when the user wants
  to onboard a site to CloudCannon, add CMS support, or make a template
  CloudCannon-compatible.
---

# Migrating to CloudCannon

This skill walks through migrating an existing SSG site so it works well with CloudCannon. The migration follows five phases, with SSG-specific guidance for each.

> **Model recommendation:** This migration involves multi-file architectural decisions across five phases. Use a high-reasoning model (not a fast/lightweight one) for best results.

## Supported SSGs

| SSG | Guide |
|---|---|
| Astro | [astro/overview.md](astro/overview.md) |

## Chaining with upstream skills

If the Astro site is being **generated** as part of this task (e.g. converting from WordPress or another platform), read [astro/cc-friendly-conventions.md](astro/cc-friendly-conventions.md) before scaffolding. It summarizes the structural choices that make the CloudCannon migration smooth — output mode, content collection layout, image handling, component framework, and page structure. Following those conventions upfront avoids refactoring work in the migration phases.

Once the site is scaffolded, return here and run the migration phases as normal.

## Step 1: Detect the SSG

Before starting, identify the SSG. Run from the project root:

```bash
npx @cloudcannon/gadget detect-ssg
```

This returns the detected SSG and confidence scores. Use the result to select the correct SSG guide above.

## Migration phases (summary)

Each SSG guide walks through these phases in order with SSG-specific instructions:

1. **Audit** -- Analyze the site's content structure, components, routing, and build pipeline before making changes.
2. **Configuration** -- Generate a baseline `cloudcannon.config.yml` and `.cloudcannon/initial-site-settings.json` using Gadget, then customize. Create `.cloudcannon/README.md` as an editor-facing guide for the Site Dashboard. Includes snippet configuration for sites using MDX/shortcode components in content (see [snippets.md](snippets.md)).
3. **Content** -- Restructure content files if needed so they're CMS-friendly.
4. **Visual editing** -- Add support for CloudCannon's Visual Editor with editable regions.
5. **Build and test** -- Validate the migration works end-to-end.

Not every site needs all phases. Small sites may skip Phase 3 if content is already well-structured. Visual editing (Phase 4) is optional but high-value.

**Phases are sequential, not siloed.** When a later-phase concern (e.g. a missing frontmatter field) blocks the current phase from producing the right result, make the targeted fix now rather than settling for a worse outcome. A human migrating a site wouldn't leave a broken URL pattern just because "content changes belong in Phase 3." Small, mechanical fixes (adding a missing field, normalizing a value) are fine in any phase. Structural changes (moving files, reorganizing collections, altering rendering) should still wait for their proper phase. Agents should feel free to modify files outside their current phase when needed — e.g. updating CC config during the visual-editing phase, or fixing content during configuration. The phases exist to organize the work, not to restrict when changes can be made.

## Scripts

Deterministic migration steps are automated as scripts in [scripts/](scripts/). Run these before or during the relevant phase to save time and repetition.

## Migration notes

Create a `migration/` directory at the project root with one file per phase (`audit.md`, `configuration.md`, `content.md`, `visual-editing.md`, `build.md`). Use these to document decisions, findings, and anything the user should review. The agent writes to them as work progresses; the user can read them to understand what changed and why.

## Handoff and verification

### Testing boundaries (agents vs humans)

- **CloudCannon and the visual editor** -- Fidelity checks inside the real product (preview, inline edit, save-to-git) are **human** tasks. Do not assume you can fully replicate CloudCannon in the local environment.
- **After a substantive pass** -- Prefer asking the user to run verification (build, CloudCannon) rather than starting a long-lived dev server or heavy end-to-end testing in the agent session.
- **Light automation** -- Builds, greps, small scripts, and checks described in SSG phase docs (e.g. inspecting `dist/`) are appropriate; keep them proportional.
- **Deeper agent testing** -- When the task truly requires it, more advanced automated checks are fine; keep them proportional to the task.

### When to close with the user

Do this after a **meaningful chunk** of work, not after every tiny edit. At minimum: when **Build and test** is done for a first full migration pass. If the user stops earlier (e.g. after configuration only), hand off at that milestone instead.

### What to say

Be direct and brief: a short summary of what changed, then a **checklist** the user can run, then **one clear ask** for feedback. Skip empty phrases ("let me know if you need anything"). Thanking them once for checking is fine.

### What to ask the user to verify

1. **Local build** -- The project's real build entrypoint (usually `npm run build` or whatever `package.json` defines), not a partial command. If it failed, they should paste the **full** error output (or at least the command, exit code, and the last ~30 lines of stderr).
2. **Checks you already ran** -- If you ran SSG-specific checks from the build doc (e.g. grep `dist/` for editable attributes), say so in one line so they do not duplicate work.
3. **CloudCannon (human)** -- They should confirm in the hosted environment:
   - Inline text regions can be edited in the preview on representative pages
   - Image regions open the image picker
   - Array regions show add/remove/reorder controls where arrays were wired
   - Cross-file editables (`@file`, shared partials, etc.) update the intended source file—not always the page being viewed
   - Saved changes land in the expected files in git

SSG-specific build and `dist/` checks stay in each SSG's build phase doc.

### What to ask the user to send back

So the next turn is actionable, ask for **concrete** signals: the exact command they ran, CloudCannon build log snippets if the remote build failed, the page URL and what they clicked if the editor misbehaved, or a short description of what differs from what they expected.

### Iteration

End with one line that invites the next pass on their reply—for example: when they have run those checks, they should reply with any failures or odd behavior so you can adjust in a follow-up.

## Naming conventions

Follow the project's existing conventions when present. Otherwise:

- `kebab-case` for files
- `camelCase` for JavaScript and JSON
- `snake_case` for Markdown frontmatter and YAML
