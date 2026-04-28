---
name: cloudcannon-snippets
description: >-
  Use when adding snippet support to a CloudCannon site, configuring MDX
  components for the Content Editor, debugging snippet round-trip issues,
  or setting up inline HTML snippets in markdown content.
---

# CloudCannon Snippets

Snippets let editors insert and edit complex markup (components, shortcodes, embeds) inside CloudCannon's rich text Content Editor. Covers the SSG layer (how components are imported/built) and the CloudCannon layer (`_snippets` config that teaches the editor the syntax).

## When to use

- Adding snippet support to a new or existing CloudCannon site
- Configuring MDX components for the Content Editor
- Adding inline HTML snippets (figure, video, details) to markdown content
- Debugging snippet parsing, round-trip, or toolbar issues

## Docs

| Doc                                            | When to read                                                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [snippets.md](snippets.md)                     | Start here. Overview of both layers, configuration hierarchy, which approach to use, snippet properties, toolbar setup, raw HTML snippets in `.md` files |
| [template-based.md](template-based.md)         | Component syntax matches a built-in template (most common path)                                                                                          |
| [raw.md](raw.md)                               | Component needs custom syntax (e.g. `client:load`, non-standard attributes)                                                                              |
| [built-in-templates.md](built-in-templates.md) | Understanding built-in MDX templates, the import bundle, parser internals                                                                                |
| [gotchas.md](gotchas.md)                       | Debugging or reviewing. Common pitfalls and workarounds                                                                                                  |

**SSG-specific:**

| SSG   | Doc                                                                           |
| ----- | ----------------------------------------------------------------------------- |
| Astro | [astro.md](astro.md) — MDX stack, `astro-auto-import`, when to use MDX vs raw |

## Quick decision

| Case                                         | Approach                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Component syntax matches a built-in template | Template-based — see [template-based.md](template-based.md)                                                           |
| Extra syntax, SSG directives, custom parsing | Raw — see [raw.md](raw.md)                                                                                            |
| Inline HTML in `.md` (`<figure>`, `<video>`) | Raw snippets — see [snippets.md § Raw snippets for inline HTML](snippets.md#raw-snippets-for-inline-html-in-md-files) |

## Completion checklist

**MUST:** verify every item before marking snippets done.
**Why:** snippets silently degrade — a missing toolbar entry or broken round-trip looks fine until an editor opens the file.

- [ ] Every component used in content files has a `_snippets` entry
- [ ] `_editables` includes `snippet: true` on relevant content blocks
- [ ] Each snippet round-trips correctly (insert via editor, save, reopen — markup unchanged)
- [ ] `_inputs` are configured for snippet fields (image fields get `type: image`, etc.)
- [ ] Snippet previews are configured (`view: gallery` for image-bearing snippets)
- [ ] `picker_preview` uses static values (not `key:` lookups, which don't resolve in picker context)

## Common pitfalls

For toolbar config, `_snippets_imports`, round-trip failures, and image-grid extraction patterns, see [gotchas.md](gotchas.md). Astro MDX pipeline gotchas live in [astro.md § MDX setup pipeline](astro.md#mdx-setup-pipeline-must-complete-all-four).
