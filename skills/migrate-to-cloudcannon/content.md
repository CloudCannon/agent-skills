# Content

Read when running Phase 3. These rules apply to every SSG; `<ssg>/content.md` adds the SSG's schema, template and file conventions.

> **Checklist discipline:** this doc ends with a [Review checklist addendum](#review-checklist-addendum). Work through the review checklist as you go, then verify the addendum before marking the phase complete.

Run this phase after configuration (Phase 2). Small content fixes that a configuration decision needs (adding `slug` fields, normalizing values) can happen during Phase 2 — see [SKILL.md § Phases are sequential, not siloed](SKILL.md).

## When to skip this phase

Skip content changes when the audit shows content is already well-structured: consistent front matter, clean markdown, no page to convert to a page builder and no data file to reshape. Document the patterns anyway.

## Review checklist

Work through these checks for every migration. Document findings even when no changes are needed.

### Front matter consistency

- **Required fields present in every file.** Templates and schemas often tolerate a missing key. Add the key to every file, empty if need be, so the editor and the schema agree.
- **Defaults written into files.** A default the SSG or template fills in at build time is invisible to editors: they see what the file holds, so a file without the key shows an empty input. Write commonly used defaults into the files.
- **Every key in the schema.** Each key any file uses is in the collection's schema file, and each key whose schema default would change behaviour (`draft: true`) is explicit in existing files — see [configuration-gotchas.md § The first edit writes every schema key](../cloudcannon-configuration/configuration-gotchas.md#the-first-edit-writes-every-schema-key).
- **`draft`.** If the site filters on `draft`, write `draft: false` on published content so the sidebar shows the switch consistently. Collections with a `draft` field default to the content editor (`editor: content` on add options, or `_enabled_editors` starting with `content`): draft pages aren't built, so the visual editor has no page to preview.
- **Dates.** One format across a collection, ISO 8601 (`2022-04-04T05:00:00Z`) by default. The SSG may parse several, but editors see whatever the file holds.
- **Image paths.** One convention per input, matching how the template reads it. The SSG's `content.md` and configuration files give the paths.

### Field naming

- Match the existing component prop names. If components use `imageAlt`, use `imageAlt` in front matter, not `image_alt`, so components need no translation layer.
- Avoid CloudCannon's reserved keys (`_inputs`, `_structures`, `_schema`).
- Keep names consistent across collections: always `image`, not sometimes `image` and sometimes `thumbnail`.

### Mixed-type fields

Some templates give a field mixed types: `price` is the string `"Free"` for some items and an object `{monthly, annual}` for others. CloudCannon's data editor works best with one type per field. If the template only uses one branch (it only displays `price.monthly`), simplify the content files to a single type and update the rendering code to match.

### Content references (string-based)

Some templates reference related content by a string rather than an ID: `author: "John Doe"`, matched by slugifying the name and comparing it to author filenames. This works, but renaming an author breaks the link.

No content change is needed. In Phase 2, give the field a select input so editors pick from valid values — see [inputs.md § Select values from a collection](../cloudcannon-configuration/inputs.md#select-values-from-a-collection).

### Markdown content body

Check for:

- **Components and shortcodes in the body.** CloudCannon's editors can't render them, but can parse and re-serialize them once snippets are configured. Record which files use them and each component's props; this inventory feeds the snippet configuration in Phase 2. See the `cloudcannon-snippets` skill.
- **Body components moved to the layout.** For each component the user agreed to move ([audit.md § Components repeated at a fixed point in the body](audit.md#components-repeated-at-a-fixed-point-in-the-body)), copy its values into the new front matter field and delete it from the body. Rebuild and compare against the parity baseline: the page should render the same.
- **Inline HTML with no markdown equivalent** (`<figure>`, `<video>`, `<details>`, `<iframe>`). These become snippets, so editors get a structured interface instead of raw HTML. For each pattern from the audit, normalize every instance to one format (same attributes, same whitespace) and record the pattern in the migration notes. The snippet config is created in Phase 2 — see [snippets.md § Raw snippets for inline HTML](../cloudcannon-snippets/snippets.md#raw-snippets-for-inline-html-in-md-files). Simple inline HTML editors don't need to change (`<sup>`, `<br>`) can stay.
- **Empty bodies.** Index files and section data often keep everything in front matter. This is normal.
- **Markdown plugin output.** If build-time plugins transform markdown (heading IDs, wrapped images), note them but don't change the content.

### Styled HTML in front matter

**Rule — markdown fields:** markdown fields (`type: markdown` inputs) hold plain markdown, or plain HTML without class attributes. Class attributes, inline styles and other attributed HTML collapse into uneditable snippet chips in the rich-text editor: authors can't click into the element to change link text or URLs.

❌ `<a href="/x" class="text-primary font-medium">text</a>` (becomes an uneditable chip)
✅ `<a href="/x">text</a>`, with styling in CSS targeting the rendered prose container
✅ `[text](/x)`

**Rule:** front matter stores content; components own presentation.

Pick the approach that matches the source pattern, in preference order from the top:

| Source pattern                                                                                                              | Approach                                 | How                                                                                                                                                                                                                                                                                                                                | When                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Inline text styling (highlighted or accented text, brand emphasis) — e.g. `<span class="text-accent">Astro 5.0</span>`      | `type: html` input + editor styles CSS   | Configure the input as `type: html` with `options.styles: .cloudcannon/styles/editor.css`. Define semantic classes (`span.highlight-text { ... }`) in the stylesheet. The component renders the value unescaped. Editors toggle styles in the toolbar like bold and italic. Replace utility classes with the semantic class names. | Any styling expressible as a CSS class. Preferred default.                                                                    |
| Fixed-structure multi-part text — e.g. `Graphic Designer <br /> <span>ABC Studio</span> <br /> <span>2021 - Present</span>` | Decompose into structured sub-fields     | Split into `job_title`, `company`, `date_range`. Template each segment in the component.                                                                                                                                                                                                                                           | Each segment has distinct semantic meaning.                                                                                   |
| Line-separated list items (`<br />` between entries)                                                                        | Convert to HTML list or array of strings | Either `<ul><li>...</li></ul>` in a `type: html` field with `allow_custom_markup: true`, or an array of strings in a plain text field.                                                                                                                                                                                             | The content is semantically a list. (In a rich text field, `<br />` is fine as a line break — only convert when it's a list.) |
| Responsive layout HTML — e.g. `<br class="block sm:hidden" />`, `&nbsp;`                                                    | Strip the HTML                           | Store plain text. Handle responsiveness in CSS or component logic.                                                                                                                                                                                                                                                                 | Always — layout concerns don't belong in content.                                                                             |

### Page-builder content

Every field from a block's structure `value` appears in the content file, even if empty — see [structures.md § The four rules](../cloudcannon-configuration/structures.md#the-four-rules-read-first). The visual editor throws errors when an editable region references a field missing from the file. Getting this right now avoids a backfill later.

#### Extraction pattern (per block)

1. Identify the block's `_type` from the original hardcoded page.
2. Look up the structure definition (`cloudcannon.config.yml` under `_structures.content_blocks`, or the co-located `*.cloudcannon.structure-value.yml` file).
3. Copy the full field list from the structure `value`.
4. Populate fields that have content from the original page.
5. For each remaining field, decide between _empty_ and _absent_:

   | The original page…                                                                                   | Write into the content file                                                |
   | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
   | passed a value                                                                                       | that value                                                                 |
   | passed nothing, and no default exists                                                                | the empty value (bare key, `false`, `[]`, nested object with empty fields) |
   | passed nothing, and the component — **or a sub-component it forwards props to** — supplies a default | that resolved default                                                      |

   **MUST NOT:** write an empty value over a default the original page was rendering.
   **Why:** migration must not change what the page renders. `button:` on a form whose component defaults `button` to `'Send'` deletes a visible button, and nothing in the build catches it.

   Read the parameters of the block component _and_ of any component it forwards props to. Rule #1 requires the **key** to be present, not a fabricated **value** — see [structures.md § Don't seed empty strings](../cloudcannon-configuration/structures.md#dont-seed-empty-strings-for-genuinely-optional-fields).

Keep presentation in the component — class names, SVG, layout `<br>` — and copy into content only what an editor should change. See [visual-editing-reference.md § Where does a value belong](../cloudcannon-visual-editing/visual-editing-reference.md#where-does-a-value-belong--frontmatter-structure-value-default-or-hardcoded).

#### YAML quoting

Quote strings that contain HTML (`<span class="...">`, `<br />`), start with a special character (`*`, `&`, `:`, `#`, `{`, `[`), or contain `: ` or ` #`. Unquoted, they parse as mappings, aliases or comments and corrupt the value.
**How:** use `>-` for multiline strings, or double quotes with escaped inner quotes.

#### Field completeness at scale

Cross-reference each block against its structure definition systematically — don't work from memory. With 15+ block types it's easy to miss fields on one or two, and the failure only surfaces when an editor opens that block.

#### Build early, build often

Extract one or a few representative pages, build, and fix errors before extracting the rest. Schema mismatches and guard issues compound as pages accumulate.

#### Null values in YAML

A bare key (`tagline:`) parses as `null`, not as an absent key or an empty string. The schema must accept `null` for optional fields, and templates must guard on the value — see [structures.md § Handling null values from empty YAML fields](../cloudcannon-configuration/structures.md#handling-null-values-from-empty-yaml-fields).

### One field per visual slot

When a component shows `propA || propB` (e.g. `subtitle || description`), two fields feed the same visual slot. Keep one field for that slot, and use its name everywhere — the structure, the schema, the content files and the component.

- If the two fields have no semantic distinction (`description` is just an alias for `subtitle`), remove one. Use the name that best describes what the editor sees.
- If the fallback serves a different purpose (`description` is also the page's meta description), keep both, renamed to make the distinction obvious: `subtitle` for the visual slot, `meta_description` for SEO. Add a `comment` on the SEO input explaining its purpose.

The goal: every field in the data panel corresponds to exactly one thing on the page, and every inline editable's `data-prop` points to a field in the structure. See [visual-editing-reference.md § Page builder blocks](../cloudcannon-visual-editing/visual-editing-reference.md#page-builder-blocks) for when a shared component renames the prop.

### API-driven content → local files

Convert build-time API fetches (headless CMS, REST endpoints, placeholder APIs) to a local collection. Fetched content is invisible to CloudCannon, so editors can't manage it.

- **Create** content files matching the API's data shape, a schema covering the fields the templates use, and routes that read the local files. Remove the API URL from environment variables and config.
- **Sample content:** enough entries to exercise pagination and listing pages (6+ for a blog paginated at 6). Thematically appropriate beats lorem ipsum.
- **Match** route parameters to the new files' IDs. API-driven pages often have custom slug logic (truncation, transliteration) that differs from filename-derived IDs, and a mismatch is a 404.

### Settings in code → data files

Move editor-facing settings (navigation, social links, colours, CTAs, footer copy) out of code and templates into data files. CloudCannon can't edit code, so settings locked in a config module or a template are out of editors' reach.

| Keep in code                                          | Move to a data file                         |
| ----------------------------------------------------- | ------------------------------------------- |
| Asset imports                                         | Navigation, social links, CTAs              |
| Computed values                                       | Label text, icon names, colour scheme names |
| Framework-specific settings (CSS var mappings, flags) | Any value an editor should control          |
| Anything referencing other code modules               |                                             |

1. Sort the settings into what editors should control and what is developer-only.
2. Create one data file per editable group (`navigation`, `social-links`).
3. Update the consuming components to read the data files, and strip the moved values from the code.
4. Add `data_config` entries, and `file_config` entries with `_inputs` and `_structures`, in the CloudCannon config.

After extraction, audit the consuming component for hardcoded values (icons, colours, link targets, label text, image paths) and move those into the data file too. If an editor can see it and it could reasonably vary, it belongs in the data file. Which treatment each shared section gets is in [cc-friendly-conventions.md § Shared-UI treatment table](cc-friendly-conventions.md#shared-ui-treatment-table).

### Data collections

Data collections hold content that doesn't build its own page. Purpose decides, not location:

| Content usage                                                             | Pattern                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| Builds its own page (blog post, service page)                             | Page collection with a `url` pattern              |
| Used on one page only (home page hero)                                    | That page's front matter — no separate collection |
| Used across multiple pages (navigation, social links, testimonials, tags) | Data collection                                   |

Set `disable_url: true` on data collections. They don't produce pages; without it, CloudCannon builds a URL and the Visual Editor breaks.

**Verify the data files:**

- JSON/YAML is valid and well-formatted
- Nesting isn't so deep the editor becomes unwieldy (3+ levels is a flag)
- A list of like-shaped items is a top-level array, not a map keyed by slug; arrays of objects have consistent shapes or are backed by a structure per shape

## Review checklist addendum

Run this checklist on every content file before marking the content phase complete.

- [ ] **Field completeness (CRITICAL):** every block in `content_blocks` includes ALL fields from its structure definition — cross-reference field by field against [structures.md § The four rules](../cloudcannon-configuration/structures.md#the-four-rules-read-first). Common misses: `tagline`, `content`, `subtitle`, and nested sub-keys like `callToAction.variant`.
- [ ] Fields the original page didn't pass hold the resolved default, or an empty value when there is none — see [§ Extraction pattern](#extraction-pattern-per-block).
- [ ] Front matter strings contain no block-level HTML (`<br />`, `<p>`, `<ul>`) unless the matching `_inputs` entry uses a rich-text or markdown input.
- [ ] Every array inside a structure-value file links to its `_structures` entry via an explicit `_inputs` block — see [structures.md § The four rules](../cloudcannon-configuration/structures.md#the-four-rules-read-first).
- [ ] Every visible value in a data file's consuming component that an editor would reasonably change (icons, link targets, label text, image paths) lives in the data file.
- [ ] `.cloudcannon/migration/content.md` records every structural change.
