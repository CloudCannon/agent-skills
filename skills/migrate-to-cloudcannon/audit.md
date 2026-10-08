# Audit — shared rules

The SSG-agnostic parts of Phase 1. The audit procedure itself is per SSG — [astro/audit.md](astro/audit.md), [hugo/audit.md](hugo/audit.md) — and links here for the decisions below.

## Classifying static pages

Use this decision table for every page that isn't already content in a collection. **Page builder is the default for unique-layout pages whose templates the project owns** — source-editable is the exception, reserved for long rich-text sections.

| Page characteristics                                                                                                            | Pattern                                                                | Why                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Many entries, identical shape (blog posts, team profiles, products, articles)                                                   | **Fixed-schema collection**                                            | Consistency matters; editors fill fields, not layout                                                                                                                                                |
| Multiple "sibling" pages that share most structure (services, locations, team members)                                          | **Fixed-schema collection**                                            | Shared shape benefits all entries; one template change updates all                                                                                                                                  |
| Unique layout per page, but multiple such pages exist (homepage, about, our-team, contact, landing pages, FAQ, marketing pages) | **Page builder `pages` collection** ← DEFAULT                          | Editors compose from blocks. New pages addable from CMS. Multiple schemas in the same collection are fine.                                                                                          |
| Pages a theme renders from front matter and site params (templates from a theme or module the project doesn't own)              | **Keep the theme's model** — its front matter and params become inputs | Replacing a theme page with a page builder forks its layout, stops upstream updates, and makes the theme's docs wrong for the site. The SSG's audit guide covers adding regions to a theme template |
| Long-form prose with minimal structure (legal, policy docs, terms)                                                              | **`default` schema in the `pages` collection**, with a markdown body   | Body is the content; structure is minimal                                                                                                                                                           |
| Truly one-shot, never edited by content team (404, system pages)                                                                | **Hardcoded template**                                                 | No editor value                                                                                                                                                                                     |
| "Only n=2 pages — small enough to be a data file"                                                                               | ❌ Data file because count is low                                      | ✅ Collection — if a route renders frontmatter-shaped content for ONE entity (its own URL, hero, body, sections), it's a collection even at n=2. Data files are for shared lookups.                 |
| Page re-declares an array that overlaps with a data file (`services`, `team`, `faq`)                                            | ❌ Local array + data file both maintained                             | Delete the local array and read from the data file. Editors change the data file, the page stays stale.                                                                                             |
| Cross-collection membership (category ↔ posts) with both sides storing the list                                                 | ❌ Both sides own the list — drifts when one is updated                | ✅ One canonical side owns the list (per-entity collection). The other side reverse-looks-up. Add a CMS comment: "X is pulled automatically — edit Y to add/remove".                                |

### Content files whose body is layout components

A content file whose body is mostly layout components (MDX components, Hugo shortcodes) counts as a static page for the census. Classify each component used in content:

| Component kind                                                  | Becomes                                                                       | Why                                                                                                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout component on page-like content (hero, feature grid, CTA) | A page-builder block: a component copying its markup, fed by the blocks array | In the Visual Editor a snippet inside the body shows as a card, not its rendered markup. Blocks render as on the site, with in-place editing and add, remove and reorder |
| Inline or prose component (alert, badge, figure, button)        | A snippet                                                                     | Belongs in the body                                                                                                                                                      |

### Census table

Produce this **mandatory census table** in `.cloudcannon/migration/audit.md` for every page that isn't already in a collection. Filling it forces you to count sections and answer the "would the editor want to add another like this?" question explicitly:

| Page file | Distinct content sections         | Layout repeated on other pages? | Editor will add similar pages? | Recommended pattern         | Needs editable region? |
| --------- | --------------------------------- | ------------------------------- | ------------------------------ | --------------------------- | ---------------------- |
| home      | hero, features, testimonials, cta | No                              | Maybe                          | Page builder                | Yes                    |
| about     | hero, story, team, cta            | No                              | Maybe                          | Page builder                | Yes                    |
| privacy   | title, long markdown body         | Yes (terms, etc.)               | No                             | `default` schema in `pages` | Body only              |
| ...       | ...                               | ...                             | ...                            | ...                         | ...                    |

The Phase 4 handoff gate reads the **Needs editable region?** column.

Don't classify a unique-layout page as source-editable just because it's "the only one of its kind." The right question is whether it has 2+ distinct content sections. If yes, page builder. Source-editable is for a long rich-text section; a page that is all prose gets the `default` schema in `pages`.

Don't propose a CloudCannon "collection of one" (a `homepage` collection with one entry, an `about` collection with one entry, etc.). One `pages` collection holds homepage, about, contact, landing pages, etc. -- possibly with multiple schemas. The only exception is when the site genuinely has a single landmark page plus one repeating section (e.g. homepage + blog).

This classification feeds directly into the configuration phase. For census rows that send a page to the `pages` collection, read [page-building.md](page-building.md), then the SSG's `page-building.md`.

### Follow-on censuses

Two more checks per page template. The SSG's audit guide gives the form each takes.

| Census                  | Question                                                                                                       | Target                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each value the template outputs: is it a field read as-is, or computed (conditional, lookup, shared data)? | Zero computed values in page templates — each moves into a registered component or a `@data[key]` binding |
| Frontmatter co-location | For each registered component: are its fields nested under one front matter key (or one data file)?            | Refactor before shipping, rather than working around scattered fields                                     |
