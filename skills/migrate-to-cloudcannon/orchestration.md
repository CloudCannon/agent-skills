# Orchestrating a migration

How the main agent runs a migration: it orchestrates, and each phase runs in a subagent. Read this before Phase 1.

**Why:** a migration reads dozens of docs and touches most of the site. In one context, later phases (especially Phase 4) recall earlier decisions through a long backscroll and quality drops. Subagents keep the orchestrator's context small; they are not there for speed.

## Roles

**Orchestrator** (the main agent):

- Talks to the user. Subagents don't.
- Dispatches one subagent per phase, in order, and tracks one task per phase (or chunk).
- Reads this file, `SKILL.md` and each subagent's return. Reads a phase doc or note only when it needs it to answer the user or check a readiness row.
- Never does phase work itself. A fix found while checking goes back to a subagent.

**Phase subagent**:

- Owns one phase, or one chunk of one when `plan.md` splits it.
- Reads its phase docs per [reading-order.md](reading-order.md), does the work, tracks the phase's checklist items, and writes the phase note — see [SKILL.md § Per-phase workflow](SKILL.md#per-phase-workflow).
- Never dispatches subagents of its own.

**Host without a subagent tool:** the orchestrator runs each phase itself, in order, with the same notes, gates and checklists.

## Dispatch brief

Give each subagent:

- The skills directory and the detected SSG
- The phase (and chunk scope, if any) and the docs to read first
- The notes to read as input — `audit.md` and every earlier phase note, plus `plan.md` if it exists
- The note to write, and when to stop: the phase's row in [SKILL.md § Phase handoff readiness](SKILL.md#phase-handoff-readiness) is met
- The answers the user has already given that bear on this phase
- The return format below

## Return

At most 10 lines:

- Status: done, blocked, or stopped on a question
- Path of the phase note
- Files changed outside the phase's scope, and why
- Blocking question, if any
- Count of open questions recorded in the note

## Questions for the user

**Blocking** — the phase can't go on without the answer (a framework upgrade, moving files the user may object to): the subagent stops and returns the question. The orchestrator asks the user, then continues the same subagent with the answer so its context stays intact. Dispatch a new subagent with the answer in its brief only when the host can't resume one.

**Non-blocking** — the phase doc recommends a default: the subagent takes the default, records the question under **Open questions** in its note, and keeps going. The orchestrator raises open questions with the user at the end of the phase. A changed answer goes back to the subagent that owns that phase's files.

## What runs when

- One subagent per phase, in order. The next phase starts only once the current phase's readiness row is verified.
- Phases 3 and 4 split into chunks only when `plan.md` lists them. Chunks run one at a time, in the listed order; the first chunk sets the patterns the rest follow (`plan.md` § Global decisions).
- Nothing runs in parallel. Phases and chunks share `cloudcannon.config.yml`, layouts, component registration and the build output.

## Verification

The agent that did a phase never verifies it. Verification checks the phase's readiness row and checklist; it doesn't redo or re-review the work.

| Sizing (below)      | Who verifies                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Not tripped         | The orchestrator, with cheap checks: the note exists, the build exits 0, a grep finds the expected config entry |
| Tripped (`plan.md`) | A fresh verifier subagent per phase. It returns pass or fail per readiness and checklist item                   |

Failures go back to the subagent that did the work — continued if the host allows, otherwise a new one briefed with the failure list. Then verify again with a fresh verifier.

## Sizing

Evaluate at the end of Phase 1, against `.cloudcannon/migration/audit.md`:

| Signal                                | Threshold | Source                                                                       |
| ------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| Total pages                           | > 30      | Audit § Pages and routing                                                    |
| Hardcoded template → YAML conversions | > 15      | Audit census table rows recommending page-builder or fixed-schema collection |
| Distinct collections                  | > 5       | Audit § Content collections + new collections from census                    |

If any 2 are tripped, the audit subagent writes `.cloudcannon/migration/plan.md` from the template below. The orchestrator shows the user the chunk list in a few lines and waits for a go before Phase 2.

| Shape                         | When                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Vertical (per-collection)** | Page-builder pages or unique-shape collections dominate — each unit has its own schema/visual-editing decisions |
| **Horizontal (per-phase)**    | Collections are mostly uniform — repetitive per-collection work benefits from one mental model at a time        |

## `.cloudcannon/migration/plan.md` template

```markdown
# Migration plan

## Sizing

- Total pages: <n> (threshold >30: <tripped|ok>)
- Hardcoded → YAML conversions: <n> (threshold >15: <tripped|ok>)
- Distinct collections: <n> (threshold >5: <tripped|ok>)
- Tripped: <count>/3

## Shape

<vertical|horizontal> — because: <one-line reason>

## Chunks

Each row is one subagent dispatch, run in order. Phases 2 and 5 are one row each.

| #   | Scope                            | Phase | Inputs                     | Output                    |
| --- | -------------------------------- | ----- | -------------------------- | ------------------------- |
| 1   | <e.g. all collections — config>  | 2     | audit.md                   | configuration.md          |
| 2   | <e.g. blog collection — content> | 3     | audit.md, configuration.md | content.md (blog section) |
| 3   | <...>                            | ...   | ...                        | ...                       |

## Global decisions (set by the first chunk of each phase; later chunks follow them)

- Collection URL patterns
- Shared structures (`_structures`)
- Snippet configs (if MDX components, shortcodes or inline HTML)
- Editable-regions setup (Astro: `registerComponents.ts`; Hugo: module import and the `editable-regions` partial; Eleventy: the plugin and the bundle script tag on the Liquid path, nothing on the Nunjucks path; Next.js: the `EditableRegions` root in `app/layout.tsx` or `pages/_app`, the `CloudCannonEditor` gated dynamic import, `componentMap.ts` and `registerComponents.ts`)
```

## Repetition → script

After migrating 2 entries of the same shape, write a throwaway script for the rest. 23 hand-conversions of the same article shape is wasted tokens and an error multiplier.
