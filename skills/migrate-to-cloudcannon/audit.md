# Audit — shared rules

The SSG-agnostic parts of Phase 1. The audit procedure itself is per SSG — [astro/audit.md](astro/audit.md), [hugo/audit.md](hugo/audit.md), [eleventy/audit.md](eleventy/audit.md), [nextjs/audit.md](nextjs/audit.md), [nuxt/audit.md](nuxt/audit.md), [sveltekit/audit.md](sveltekit/audit.md) — and links here for the decisions below.

## Site-wide facts

Record for every site:

- **Package manager and version** — see [build-commands.md § Package manager](../cloudcannon-configuration/build-commands.md#package-manager).
- **Where the site sits in the repository** — the root, or a subfolder beside other code or other sites. For a subfolder, record the folder and how many CloudCannon sites the repository will hold — see [monorepos.md](../cloudcannon-configuration/monorepos.md).
- **Where the live site is hosted.** Advise the user, then record their choice:
  - **The site needs no server:** recommend CloudCannon hosting. It is static hosting on Cloudflare, and forms post to an Inbox.
  - **Parts of the site need a server** (auth, accounts, checkout, API routes the browser calls): name those parts, and recommend keeping the live site on a host that runs them, with CloudCannon for editing.
- **Headers and redirects**, from every source: the SSG's config, `_headers`, `_redirects`, `netlify.toml`, `vercel.json`. When CloudCannon hosts the site, they move to `.cloudcannon/routing.json` — see [routing.md](../cloudcannon-configuration/routing.md).

### Forms

Keep pages with forms, and make their content editable like any other page. CloudCannon handles form submissions, so a form is never a reason to leave a page out.

| Case                              | What the form submits to                                                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CloudCannon hosts the site        | A CloudCannon Inbox: `method="post"` and a hidden `inbox_key` field — see [Connecting your site to an Inbox](https://cloudcannon.com/documentation/developer-articles/connecting-your-site-to-an-inbox/) |
| The live site is hosted elsewhere | Its own backend on the live site. In the CloudCannon build, an Inbox as above, switched on a variable only that build sets — see [server-features.md](../cloudcannon-configuration/server-features.md)   |
| Sign-in, sign-up or account forms | They need a server, so the live site stays on a host that runs them. In the CloudCannon build, render them as editing fallbacks                                                                          |

## Existing hydration errors

On a site that hydrates in the browser, run the unchanged site on the SSG's dev server. Load the home page and one page per layout with the console open, and record each hydration error with the component that causes it. Fix them, or **ask the user**, before Phase 4. The audit subagent runs the check when it has a browser. Without one, it lists those pages in the audit, and the orchestrator asks the user to check them.

**Why the dev server:** some production builds don't log hydration mismatches (Svelte 5), so a clean console on a production build proves nothing.

**Why:** in the Visual Editor a hydration error makes React render the page again under the regions, which leaves stray region controls and missing content. An error the site already had then looks like a CloudCannon problem.

## Load-time behaviour

Record the files behind anything hidden, faded, offset or unclickable until a script runs, and anything that changes on its own (carousels, autoplay, timers, count-ups). Search for `opacity: 0` in CSS, initial-state animation props (such as Framer Motion's `initial={{ opacity: 0 }}`), `IntersectionObserver` and `setInterval` in JS, and class names like `reveal`, `aos`, `animate-on-scroll` and `fade-in`.

**Why:** the editor shows elements before scripts run and resets script-applied state on every edit, so Phase 4 patches these files — see [visual-editing-reference.md § Load-time behaviour in the editor](../cloudcannon-visual-editing/visual-editing-reference.md#load-time-behaviour-in-the-editor).

## Classifying static pages

Use this decision table for every page that isn't already content in a collection. **Page builder is the default for unique-layout pages whose templates the project owns.** The choice turns on who owns the page's structure — see [page-building.md § When to reach for a page builder](page-building.md#when-to-reach-for-a-page-builder).

| Page characteristics                                                                                                                                                                                                              | Pattern                                                                | Why                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Many entries, identical shape (blog posts, team profiles, products, articles)                                                                                                                                                     | **Fixed-schema collection**                                            | Consistency matters; editors fill fields, not layout                                                                                                                                                                    |
| Multiple "sibling" pages that share most structure (services, locations, team members)                                                                                                                                            | **Fixed-schema collection**                                            | Shared shape benefits all entries; one template change updates all                                                                                                                                                      |
| Unique layout per page, but multiple such pages exist (homepage, about, our-team, contact, landing pages, FAQ, marketing pages)                                                                                                   | **Page builder `pages` collection** ← DEFAULT                          | Editors compose from blocks. New pages addable from CMS. Multiple schemas in the same collection are fine.                                                                                                              |
| Pages a theme renders from front matter and site params (templates from a theme or module the project doesn't own)                                                                                                                | **Keep the theme's model** — its front matter and params become inputs | Replacing a theme page with a page builder forks its layout, stops upstream updates, and makes the theme's docs wrong for the site. Where the SSG has themes, its audit guide covers adding regions to a theme template |
| Long-form prose with minimal structure (legal, policy docs, terms)                                                                                                                                                                | **`default` schema in the `pages` collection**, with a markdown body   | Body is the content; structure is minimal                                                                                                                                                                               |
| One-off page whose structure stays with the developer; editors change text in place — only when every condition in [page-building.md § When to reach for a page builder](page-building.md#when-to-reach-for-a-page-builder) holds | **Source editables** (the exception)                                   | See [visual-editing-reference.md § When to use source editables](../cloudcannon-visual-editing/visual-editing-reference.md#when-to-use-source-editables)                                                                |
| Truly one-shot, never edited by content team (404, system pages)                                                                                                                                                                  | **Hardcoded template**                                                 | No editor value                                                                                                                                                                                                         |
| "Only n=2 pages — small enough to be a data file"                                                                                                                                                                                 | ❌ Data file because count is low                                      | ✅ Collection — if a route renders frontmatter-shaped content for ONE entity (its own URL, hero, body, sections), it's a collection even at n=2. Data files are for shared lookups.                                     |
| Page re-declares an array that overlaps with a data file (`services`, `team`, `faq`)                                                                                                                                              | ❌ Local array + data file both maintained                             | Delete the local array and read from the data file. Editors change the data file, the page stays stale.                                                                                                                 |
| Cross-collection membership (category ↔ posts) with both sides storing the list                                                                                                                                                   | ❌ Both sides own the list — drifts when one is updated                | ✅ One canonical side owns the list (per-entity collection). The other side reverse-looks-up. Add a CMS comment: "X is pulled automatically — edit Y to add/remove".                                                    |

### Content files whose body is layout components

A content file whose body is mostly layout components (MDX components, Nuxt Content MDC components, Svelte components in mdsvex, Hugo or Eleventy shortcodes) counts as a static page for the census. Classify each component used in content:

| Component kind                                                                                       | Becomes                                                                                | Why                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout component on page-like content (hero, feature grid, CTA)                                      | A page-builder block: a component copying its markup, fed by the blocks array          | In the Visual Editor a snippet inside the body shows as a card, not its rendered markup. Blocks render as on the site, with in-place editing and add, remove and reorder |
| Inline or prose component (alert, badge, figure, button)                                             | A snippet                                                                              | Belongs in the body                                                                                                                                                      |
| Presentational wrapper derivable from the content's structure (a card around each heading's section) | A build-time transform, so the file stays plain markdown; a snippet is the alternative | A snippet card in the Content Editor hides all the text it wraps                                                                                                         |

### Components repeated at a fixed point in the body

Record each component found in body content across every collection, with how many files use it and where in the body it sits (start, end, mid-prose).

A component at the same point in 3 or more files of a collection (a notice at the top of docs pages) may belong in the layout as an optional front matter field: it renders and updates live in the Visual Editor, where a snippet shows as a card. Apply the tests in [snippets.md § Snippet or layout field?](../cloudcannon-snippets/snippets.md#snippet-or-layout-field), and **ask the user** before moving any.

### Census table

Produce this **mandatory census table** in `.cloudcannon/migration/audit.md` for every page that isn't already in a collection. Count copy held in code as hardcoded: strings in templates, and the config modules and data arrays (`.js` or `.ts` objects) that templates read. Filling it forces you to count sections and answer the "would the editor want to add another like this?" question explicitly:

| Page file | Distinct content sections         | Layout repeated on other pages? | Editor will add similar pages? | Recommended pattern         | Needs editable region? |
| --------- | --------------------------------- | ------------------------------- | ------------------------------ | --------------------------- | ---------------------- |
| home      | hero, features, testimonials, cta | No                              | Maybe                          | Page builder                | Yes                    |
| about     | hero, story, team, cta            | No                              | Maybe                          | Page builder                | Yes                    |
| privacy   | title, long markdown body         | Yes (terms, etc.)               | No                             | `default` schema in `pages` | Body only              |
| ...       | ...                               | ...                             | ...                            | ...                         | ...                    |

The Phase 4 handoff gate reads the **Needs editable region?** column.

Don't classify a unique-layout page as source-editable just because it's "the only one of its kind." Ask who owns its structure: if editors need to add, remove or reorder sections, or create more pages like it, use a page builder. See [visual-editing-reference.md § When to use source editables](../cloudcannon-visual-editing/visual-editing-reference.md#when-to-use-source-editables).

Don't propose a CloudCannon "collection of one" (a `homepage` collection with one entry, an `about` collection with one entry, etc.). One `pages` collection holds homepage, about, contact, landing pages, etc. -- possibly with multiple schemas. The only exception is when the site genuinely has a single landmark page plus one repeating section (e.g. homepage + blog).

This classification feeds directly into the configuration phase. For census rows that send a page to the `pages` collection, read [page-building.md](page-building.md), then the SSG's `page-building.md`.

### Follow-on censuses

Two more checks per page template. The SSG's audit guide gives the form each takes.

| Census                  | Question                                                                                                       | Target                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Primitive-vs-computed   | For each value the template outputs: is it a field read as-is, or computed (conditional, lookup, shared data)? | Zero computed values in page templates — each moves into a registered component or a `@data[key]` binding |
| Frontmatter co-location | For each registered component: are its fields nested under one front matter key (or one data file)?            | Refactor before shipping, rather than working around scattered fields                                     |

## Markdown-extension syntax

List the markdown plugins that add syntax (remark, rehype or markdown-it plugins, and the SSG's own extensions). Then grep the content folders for each form they add, with `grep -rnE '<pattern>' <content dirs>`:

| Form                     | Pattern                     |
| ------------------------ | --------------------------- |
| Footnotes                | `\[\^`                      |
| Display math             | `\$\$`                      |
| Display math on one line | `\$\$.+\$\$`                |
| Inline math              | `\$[^$ ][^$]*\$`            |
| Escaped dollar signs     | `\\\$`                      |
| Dollar entities          | `&dollar;`                  |
| Citations                | `\[@`                       |
| Alerts                   | `^> \[!`                    |
| Directives               | `^:{2,}[a-z]`               |
| Abbreviations            | `^\*\[`                     |
| Fence options            | ``^ *[`~]{3}[a-z-]* +[^ ]`` |
| Nested fences            | ``^ *`{4}``                 |

The Content Editor rewrites these forms when it saves. For each form found, pick one:

- A raw snippet for the form — see [snippets.md § Raw snippets](../cloudcannon-snippets/snippets.md#raw-snippets-for-inline-html-in-md-files).
- Normalise the content to a form the editor keeps, such as `$$` on its own lines, where the built page stays the same. List the files and changes for the user, and make them only once approved.

For fence options and nested fences, see [gotchas.md § Code blocks](../cloudcannon-snippets/gotchas.md#code-blocks).

**MUST NOT:** keep a file out of the Content Editor (`_enabled_editors: [data]`) to protect its body from save damage. If neither a snippet nor a content change keeps the syntax through a save, stop and report the form, the files and what was tried.
**Why:** editors migrate to edit their content; a body they can't edit defeats the migration.
