# Skill writing style

Skills are consumed by AI agents with limited context windows. Prose is low signal per token — agents skim past paragraphs and miss rules buried inside them. Every addition to a skill should earn its tokens.

## Core rules

- **Front-load the rule, defer the reason.** First sentence states the rule imperatively. Second sentence (or a `**Why:**` line) explains. No multi-paragraph preambles before a rule.
- **One canonical source per rule.** If a rule appears in 2+ files, one file owns it and the others link. Summary tables in `SKILL.md` entrypoints link to deep-dives; they do not re-explain.
- **Tables for if/then logic.** Any prose shaped like "if X do Y; if Z do W" becomes a table with columns for condition, action, and (if useful) reason or when-to-use.
- **Checklists for procedures.** Imperative bullets starting with a verb — `Run`, `Verify`, `Remove`, `Add`. No narrative intros ("First, let's…", "Now we need to…").
- **MUST / MUST NOT for critical rules.** Rules where getting it wrong breaks the migration get a `**MUST**` or `**MUST NOT**` callout at the top of their section.
- **Include a `**Why:**` when the rule isn't self-evident.** **Why:** the reason lets agents judge edge cases the rule didn't anticipate; without it, rules get over- or under-applied. If the reason is genuinely obvious from the rule, skip it — but bias toward including it.

## SKILL.md entrypoint shape

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

## Gotcha skeleton

Every gotcha in a `*-gotchas.md` file (and every decision section elsewhere) follows this shape:

```markdown
## <Rule stated imperatively>

**MUST / MUST NOT:** <one-line rule>
**Why:** <one-line reason — often a failure mode or past incident>

<minimal code example, if applicable>

**Common miss:** <optional — what agents get wrong here>
```

If a gotcha doesn't fit this shape, that's usually a sign it's two gotchas.

## Anti-patterns

Do not write:

- Long narrative intros ("Let's look at how CloudCannon handles…"). Delete them. The heading is the intro.
- Justification paragraphs after a rule. If the reason is load-bearing, it's a `**Why:**` line. If it isn't, cut it.
- Reference material as prose. Exhaustive lists of attributes, options, or variants go in a table.
- The same rule re-explained in multiple files. Pick one home; the rest link.
- Multi-clause checklist bullets ("Verify X and also Y and remember Z"). One check per bullet.
- Emoji decorations (✅ ❌ 🎉). MUST/MUST NOT and plain prose do the job.

## When you're not sure

If you can't decide between prose and a table: if a future reader will need to scan for a specific case, it's a table. If they need to read it once end-to-end to understand the concept, prose is fine — but keep it short.

If you're adding a new rule and it feels like it belongs in three places: write it in one, and add one-line pointers from the others. Resist the urge to inline it "for convenience."
