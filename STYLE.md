# Skill authoring guide

Two kinds of rule live here. **Repo architecture** governs where a file goes; **writing style** governs what goes in it. Architecture comes first, because bad prose costs one file while a misplaced rule gets copied and then drifts.

Skills are consumed by AI agents with limited context windows. Prose is low signal per token — agents skim past paragraphs and miss rules buried inside them. Every addition to a skill should earn its tokens.

## Repo architecture

### A skill is a capability or a journey — never an SSG

**MUST NOT:** name a skill after an SSG (`migrate-hugo`, `troubleshoot-astro`). SSG-specific content lives in a `<ssg>/` directory inside the skill that already owns the concern.

**Why:** an SSG-named skill has to re-state every CloudCannon-side rule it touches, and the copies drift apart. One concern, one home, N thin SSG deltas.

There are exactly two axes, and each is expressed differently:

| Axis                                                           | Expressed as                           |
| -------------------------------------------------------------- | -------------------------------------- |
| Concern — configuration, snippets, visual editing, translation | The skill                              |
| SSG — Astro, Hugo, Eleventy, …                                 | A `<ssg>/` directory inside that skill |

**Common miss:** a rule that feels SSG-specific usually is not. "A collection that produces pages needs a `url` pattern" is a CloudCannon rule; "Astro's `build.format` decides whether that pattern needs a trailing slash" is the Astro delta. Split them and the base file stays reusable.

### The base file owns the rule; the SSG file owns the delta

**MUST:** state the generic rule in the skill-root file. `<ssg>/<same-name>.md` carries only what differs, and links back to the base in its opening line.

**MUST:** give every `<ssg>/` directory an `overview.md` — the entry point an agent reads first. It gives the reading order, including which root files apply unchanged.

**MUST NOT:** restate a base rule inside an SSG file for convenience.

**Why:** with one SSG the duplication is invisible. At four it is the main source of contradictory guidance, because only one copy ever gets updated.

**MUST NOT:** create `<ssg>/<name>.md` without a root `<name>.md`. If the first SSG file holds rules that apply to every SSG, the root file starts with those rules.

**Why:** without a base file, the first SSG's file becomes the base by default. Later SSGs then link to it for general rules, and those rules end up described in SSG-specific terms.

**MUST NOT:** create `<ssg>/<name>.md` when the SSG has nothing different to say. The `overview.md` reading order points at the root file instead.

**Why:** an SSG file with no real delta pads the reading path, and it tempts the next author to fill it by restating base rules.

Canonical example: `cloudcannon-configuration/collection-urls.md` owns placeholders, filters and troubleshooting; `cloudcannon-configuration/astro/collection-urls.md` covers only the glob-loader `slug` quirk and the `trailingSlash` rule, and links back in its first line.

### SSG directories never depend on each other

**MUST NOT:** link from one SSG's files to another SSG's files. An `<ssg>/` file links only to root files and to the same SSG's files in other skills.

**Why:** a link from one SSG to another means a general rule is stuck in an SSG file, and the linked-to SSG has become the base file by default. The test: deleting any one `<ssg>/` directory must not break another SSG's guidance.

**Common miss:** the same problem from the root side — a root file that links into one SSG's file for a general rule. Root files link into `<ssg>/` only to route, such as a table listing each SSG side by side.

### Every skill belongs to one of three tiers

**MUST:** pick the tier before creating a skill. It fixes the name, the entry shape, and whether the skill keeps state.

| Tier           | What it is                                                        | Named                   | Keeps state                     | Example                  |
| -------------- | ----------------------------------------------------------------- | ----------------------- | ------------------------------- | ------------------------ |
| **Journey**    | Long, multi-phase, run once against a site                        | Verb-first              | Yes — `.cloudcannon/migration/` | `migrate-to-cloudcannon` |
| **Capability** | One CloudCannon feature; delegated to, or entered directly        | `cloudcannon-<feature>` | No                              | `cloudcannon-snippets`   |
| **Operation**  | Short, symptom- or task-driven, against a site that already works | Verb-first              | No                              | `translate-site`         |

The full list of skills and their tiers is in [ARCHITECTURE.md § Skills by tier](ARCHITECTURE.md#skills-by-tier).

**Why:** the tiers have genuinely different shapes — a journey needs phase gates and handoff notes, an operation needs a symptom table and an exit. Choosing the tier first stops an operation from growing migration scaffolding it will never use.

### Troubleshooting lives with the capability it is about

**MUST:** put symptom → cause → fix tables in the owning skill's `troubleshooting.md`, with SSG-specific rows in `<ssg>/troubleshooting.md`.

**MUST NOT:** create a general troubleshooting skill that owns rules. A front door that only dispatches to the owning skill is fine; one that explains fixes is not.

**Why:** a fix explained away from the rule it belongs to is a second copy of that rule. This is "One canonical source per rule" (below) applied to the repo layout rather than to prose.

### SKILL.md holds routing and always-apply rules

**MUST:** every section of `SKILL.md` is either routing — when to use, when not to use, where to go next — or a rule that every task through the skill needs, such as "download the schemas before writing any key". Everything else goes in a deep-dive.

**Why:** `SKILL.md` is read in full every time the skill triggers. Its length is fine as long as every line is relevant on most paths; situational rules make every task pay for them. Agents also often act on the entry file without following its links, so a rule every task needs must not be one link away.

**MUST:** a rule that lives in `SKILL.md` is owned there. Deep-dives link to it and do not restate it.

**MUST:** include `## When to use`, `## When not to use`, and a `## Contents` table. See [SKILL.md entrypoint shape](#skillmd-entrypoint-shape) for the full structure.

**Why:** `SKILL.md` is matched against the user's request before anything else is read. Skills here share vocabulary — configure, collection, content, build — so anti-triggers are the cheapest defence against routing to the wrong skill, and they only work if every skill carries them.

**Review at about 1,000 words.** This is a prompt to check each section against the first rule, not a limit. Move what fails the check into a deep-dive. Don't compress what passes it into wider tables or terser prose to get under the number. Run `wc -w` to measure; lines undercount, because one wide table row can cost as much as ten lines of prose.

### Design for the reading path, not the file

**MUST:** judge the cost of a change by what an agent reads for a task — `SKILL.md`, then `overview.md`, then the files the path sends it to — not by the length of any one file.

**Why:** a long file read only when its condition applies costs nothing on every other path. A short file on every path costs every time. Irrelevant text in context is what makes output worse, not total size.

| Kind           | What it holds                                       | Read                          | Length                                    |
| -------------- | --------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| Rule file      | MUST rules, Why lines, decision tables              | Front to back, on the path    | Short — every line competes for attention |
| Reference file | Lookup tables, key lists, worked examples, symptoms | Searched, when a link says to | Can be long — agents look up one row      |

**MUST:** label every link in a router or `overview.md` with the condition for reading it ("when an array holds objects"), not only its topic.

**Why:** a condition lets an agent skip the file when it doesn't apply. A topic label invites reading it just in case.

### Add a rule only for an observed failure

**MUST:** trace every new rule to a failure seen in a real run — a regression run, a migration, or a user report — not to a failure that might happen.

**MUST:** before adding a rule, check whether an existing rule caused the failure by being wrong, vague or contradicted. If one did, edit it instead of adding a new one.

**MUST NOT:** carry rules, examples or names from one template into a shared file. Write the rule in terms any site would recognise.

**Why:** each rule competes for the agent's attention with every other rule on the path. Contradictions do more damage than length, because the agent has to guess which one is current.

**Prune:** when you touch a "common mistakes", gotcha or invalid-keys table, delete rows that came from one template and rows current models get right without being told.

### Adding a new SSG

**MUST:** start from each skill's root files, not from an existing `<ssg>/` directory. For each root file, write `<ssg>/<name>.md` only if the new SSG differs; otherwise list the root file in the SSG's `overview.md` reading order.

**Why:** copying an existing `<ssg>/` directory reproduces that SSG's file layout and any general rules still stuck inside it. Starting from the root files makes every SSG file a real delta.

**MUST:** cover every skill that already has an `<ssg>/` directory for another SSG. Then check the skills that have none, in case the new SSG's templates, content or build differ where earlier SSGs didn't.

**MUST:** test each SSG file against real sites built with that SSG before it ships. A delta written only from the SSG's docs is a guess.

**Partial coverage is allowed, silent partial coverage is not.** If an SSG directory does not yet cover the whole workflow, say so in a coverage note at the top of its `overview.md` and mark it Partial in the README matrix.

Then:

- Add a row to the SSG detection table in each affected `SKILL.md`
- Add a row to the coverage matrix in [README.md](README.md)
- Add the new files to the file map in [ARCHITECTURE.md](ARCHITECTURE.md)
- Run `npm run check`

## Writing style

### Core rules

- **Front-load the rule, defer the reason.** First sentence states the rule imperatively. Second sentence (or a `**Why:**` line) explains. No multi-paragraph preambles before a rule.
- **One canonical source per rule.** If a rule appears in 2+ files, one file owns it and the others link. Summary tables in `SKILL.md` entrypoints link to deep-dives; they do not re-explain.
- **One canonical source per list.** Don't write out a list of skills, files or SSGs that the repo or another doc already holds. Point to that source, or state the rule that produces the list ("every skill with an `<ssg>/` directory"). A copied list goes stale the next time something is added.
- **Tables for if/then logic.** Any prose shaped like "if X do Y; if Z do W" becomes a table with columns for condition, action, and (if useful) reason or when-to-use.
- **A table cell holds a sentence at most.** A cell that needs a paragraph is a section disguised as a table — write it as a section, and link to it from the table if needed.
- **Checklists for procedures.** Imperative bullets starting with a verb — `Run`, `Verify`, `Remove`, `Add`. No narrative intros ("First, let's…", "Now we need to…").
- **MUST / MUST NOT for critical rules only.** Rules where getting it wrong breaks the site or the migration get a `**MUST**` or `**MUST NOT**` callout at the top of their section. Pointers, preferences and defaults are plain prose. When everything is MUST, nothing stands out.
- **Include a `**Why:**` when the rule isn't self-evident.** **Why:** the reason lets agents judge edge cases the rule didn't anticipate; without it, rules get over- or under-applied. If the reason is genuinely obvious from the rule, skip it.

### SKILL.md entrypoint shape

`SKILL.md` is the first file an agent reads. It must answer three questions fast: when does this skill apply, when does it not, and where do I go next. It links to deep-dives; it does not re-explain them.

Minimum structure:

```markdown
---
name: <skill-name>
description: <one-line description — used for skill matching, so be specific>
---

# <Skill title>

<One- or two-sentence scope statement.>

## When to use

- <concrete trigger>
- <another trigger>

## When not to use

- <anti-trigger — prevents over-application>

## Contents

| File             | Covers         |
| ---------------- | -------------- |
| [foo.md](foo.md) | <what's in it> |
| [bar.md](bar.md) | <what's in it> |
```

**MUST NOT:** restate a rule that lives in a deep-dive. Link to it instead.
**Why:** duplication drifts — when the rule changes in one place but not the other, agents can't tell which is current.

### Gotcha skeleton

Every gotcha in a `*-gotchas.md` file (and every decision section elsewhere) follows this shape:

```markdown
## <Rule stated imperatively>

**MUST / MUST NOT:** <one-line rule>
**Why:** <one-line reason — often a failure mode or past incident>

<minimal code example, if applicable>

**Common miss:** <optional — what agents get wrong here>
```

If a gotcha doesn't fit this shape, that's usually a sign it's two gotchas.

### Anti-patterns

Do not write:

- Long narrative intros ("Let's look at how CloudCannon handles…"). Delete them. The heading is the intro.
- Justification paragraphs after a rule. If the reason is load-bearing, it's a `**Why:**` line. If it isn't, cut it.
- Reference material as prose. Exhaustive lists of attributes, options, or variants go in a table.
- The same rule re-explained in multiple files. Pick one home; the rest link.
- Multi-clause checklist bullets ("Verify X and also Y and remember Z"). One check per bullet.
- Emoji decorations (✅ ❌ 🎉). MUST/MUST NOT and plain prose do the job.

### When you're not sure

If you can't decide between prose and a table: if a future reader will need to scan for a specific case, it's a table. If they need to read it once end-to-end to understand the concept, prose is fine — but keep it short.

If you're adding a new rule and it feels like it belongs in three places: write it in one, and add one-line pointers from the others. Resist the urge to inline it "for convenience."
