# Page building

Read when the audit's census sends pages to a `pages` collection or a page builder. These rules apply to every SSG; the SSG's `page-building.md` adds the routes, templates and block dispatcher.

## When to reach for a page builder

Classify each page with [audit.md § Classifying static pages](audit.md#classifying-static-pages) first. For a page the census sends to the `pages` collection, pick the approach here:

| Signal                                                                     | Use                                                        | Why                                                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Page has 2+ distinct content sections (hero, features, testimonials, CTA)  | Page builder                                               | Sections are the editing unit, and editors need to add, remove and reorder them.            |
| Sections reappear on other pages, or could                                 | Page builder                                               | Shared blocks only pay off when editors can address them.                                   |
| Editors need to reorder, add or remove sections without engineering        | Page builder                                               | It's the only approach that gives editors array-level control.                              |
| Site has more than one unique-layout page                                  | Page builder, in one `pages` collection                    | One collection with several schemas scales; a collection per page doesn't.                  |
| Page is structurally unique and mostly free prose (a long-form article)    | `default` schema in `pages`                                | A markdown body is enough.                                                                  |
| Short separate strings (headings, buttons, captions) need source editables | Page builder                                               | Needing source editables on short strings is the signal that the page is structured.        |
| Small page with one section (a headline and a paragraph)                   | Page builder                                               | Source editables are for long rich-text sections.                                           |
| Page has a long rich-text section among structured ones                    | Source editable on that section, page builder for the rest | A source editable is a content editor inside the page; the other sections are still blocks. |

Components inside a source editable are snippets: editors see the snippet interface, not the rendered component they get in a component region. When the section needs rendered components, make it blocks.

## Choose the page types editors can create

Review the audit's component inventory for components used on more than one page. A page type built from them is a candidate for a creatable schema, so editors can create more pages of that type without a developer. For each one:

- **Add** a schema in `.cloudcannon/schemas/` with representative front matter — see [schemas.md](../cloudcannon-configuration/schemas.md).
- **Offer** it on the Add button with an editor it can open in — see [configuration.md § New files and the Add button](../cloudcannon-configuration/configuration.md#new-files-and-the-add-button).
- **Add** the rendering for it — see the SSG's `page-building.md`.

Check whether the base layout supports a generic title-and-body page. If it does, add a `default` schema for simple markdown pages.

One-off pages with their own route (homepage, contact, 404) get a schema for editing, but stay off the Add button — see the same section.

## Array-based page builder

A schema with a `content_blocks` array lets editors assemble pages from reusable blocks in any order. Use one when the site has 3+ reusable block components (heroes, banners, features, CTAs, testimonials, rich text). With fewer, give each page type its own schema instead.

Define the structures during the configuration phase. **Why:** the content phase uses them as the blueprint for field completeness. The full structures reference (inline vs split, field completeness, previews, deriving from components) is in [structures.md](../cloudcannon-configuration/structures.md).

### Schema structure

```yaml
_schema: page_builder
title:
description:
meta_title:
image:
hero_content:
draft: false
content_blocks: []
```

### Structures

Define a structure for each block type, with the key the SSG's dispatcher reads to pick the block's template as the discriminator. For 5+ block types, use the [split co-located approach](../cloudcannon-configuration/structures.md#split-co-located-approach-5-block-types).

### Reference blocks vs inline blocks

| Kind            | Shape                                                                             | Use for                                                                           |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Inline block    | Full data lives on the block instance in the page array                           | One-off content unique to this page (hero copy, page-specific CTA)                |
| Reference block | The block in the page array is only a type marker; its template reads a data file | Shared content reused across pages (CTA banner, testimonial list)                 |
| Combined        | Reference block plus per-instance props                                           | Shared body copy from a data file, with per-instance `background` and `textColor` |

Editors get visual editing on reference blocks through `@data[key]` regions — see [visual-editing-reference.md § Shared-data / computed-content handling](../cloudcannon-visual-editing/visual-editing-reference.md#shared-data--computed-content-handling).

### CSS class overrides between blocks

Templates often pass CSS class overrides to visually join adjacent blocks, such as removing the top padding of the block below a header. Don't expose `classes` as a CMS field. **Why:** raw class strings are implementation details editors can't use safely.

Accept minor visual diffs (around 3–5%) in adjacent block spacing. If the spacing matters, give the component an editor-friendly prop such as `compact: true` (a boolean) and handle the classes inside it.

## Common mistakes

| Excuse                                  | Reality                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| "I'll call the homepage file `home.md`" | Use the SSG's index file, which CloudCannon resolves to `/`; `home.md` resolves to `/home/`, so the Visual Editor opens the wrong URL.            |
| "I'll route another file to `/`"        | Custom routes and redirects separate the built URL from the URL the Visual Editor opens; the index file is the only mechanism the editor follows. |
