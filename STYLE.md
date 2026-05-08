# Skill writing style

Skills are consumed by AI agents with limited context windows. Every addition should earn its tokens — but "earning tokens" doesn't mean "no prose." A paragraph that lets an agent judge an edge case is worth more than a table that flattens the nuance. The aim is high signal per token, not minimum tokens.

## Core rules

- **Front-load the rule, defer the reason.** First sentence states the rule imperatively; explanation follows. The main thing to cut is multi-paragraph preambles before the rule appears.
- **One canonical source per rule.** If a rule appears in 2+ files, one file owns it and the others link. Summary tables in `SKILL.md` entrypoints link to deep-dives; they do not re-explain.
- **Reach for the shape that fits the content.** Tables for if/then logic, side-by-side comparisons, and dense reference. Checklists for procedures. Prose for explaining a mechanism, walking through a non-obvious flow, or giving an agent enough context to handle a case the rule didn't anticipate. Don't force prose into a table or vice versa.
- **MUST / MUST NOT for critical rules.** Rules where getting it wrong breaks the migration get a `**MUST**` or `**MUST NOT**` callout. Use sparingly — if everything is MUST, nothing is.
- **Examples beat description.** A short YAML or code block usually carries more signal than the paragraph describing it. Show wrong/right pairs when the difference is subtle.
- **Include the reason when it's load-bearing.** A `**Why:**` line or a sentence of prose lets agents handle edge cases the rule didn't anticipate. If the reason is genuinely obvious from the rule, skip it — but bias toward including it.

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

## Gotcha and rule section shapes

Gotchas come in a few shapes — pick the one that fits, don't force a template:

| Shape         | When to use                                                       | Looks like                                                         |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Pure rule     | The rule is terse and self-contained                              | Imperative heading, one or two sentences, optional minimal example |
| Symptom → fix | The same underlying mistake surfaces as several distinct symptoms | Table with columns: symptom, fix, (optional) why                   |
| Walkthrough   | The right behaviour needs explaining, not just stating            | Short prose explaining the mechanism, plus a wrong/right code pair |
| Comparison    | The agent picks between two or more valid shapes                  | Table with columns: when to use, what it gives you, gotcha         |

Common to all: state the rule before explaining it; show wrong/right pairs when both are plausible; cut anything that doesn't change agent behaviour.

## Anti-patterns

Do not write:

- Long narrative intros ("Let's look at how CloudCannon handles…"). Delete them — the heading is the intro.
- The same rule re-explained in multiple files. Pick one home; the rest link.
- Multi-clause checklist bullets ("Verify X and also Y and remember Z"). One check per bullet.
- Emoji decorations (✅ ❌ 🎉). MUST/MUST NOT and plain prose do the job.
- Tables forced onto content that doesn't naturally split into columns. A two-row table with three words per cell is worse than the prose.
- Reasoning trimmed away entirely. If an agent needs the reason to handle a variation, the reason is part of the rule, not optional decoration.

## When you're not sure

Ask which question the reader is bringing to the section. Scanning for a specific case → table. Reading once to build a model → prose. Repeating a procedure → checklist. The same skill can need all three shapes in adjacent sections.

If a new rule feels like it belongs in three places: write it in one, and add one-line pointers from the others. Resist the urge to inline it "for convenience."
