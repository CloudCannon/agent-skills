# Configuration Gotchas (Astro)

Astro-specific pitfalls. The cross-SSG gotchas — select inputs, numeric values, `_editables`, markdown tables, data references, previews — live in [../configuration-gotchas.md](../configuration-gotchas.md). Read that file first.

## `slug` is reserved in Astro 4 legacy collections

In Astro 4's legacy content collections (`src/content/config.ts`), the `slug` field is reserved by Astro. Adding `slug` to the Zod schema throws `ContentSchemaContainsSlugError`. Use a different field name like `permalink` instead. This restriction does not apply to Astro 5+ with the `glob()` loader.

## Folder-per-post content and CC URL placeholders

The problem — `[slug]` resolves to an empty string for `index.md` — is in [../configuration-gotchas.md § Folder-per-post](../configuration-gotchas.md#folder-per-post-content-and-cc-url-placeholders). The Astro fixes:

**Preferred fix:** Flatten to flat files (`blog/01-getting-started.md`). This lets Astro auto-generate slugs from filenames and CC's `[slug]` works natively. See [content.md § Flattening folder-per-post content](../../migrate-to-cloudcannon/astro/content.md#flattening-folder-per-post-content) for the full checklist.

**Fallback (when flattening isn't practical):** Add a `slug` field to each content file's frontmatter matching the folder name, then use `{slug}` (data placeholder) in the CC URL pattern. For legacy Astro collections, `slug` in frontmatter overrides the auto-generated slug without needing to be in the Zod schema. Include `slug` in the CC schema template so new posts get the field.

## TypeScript config files are not CC-editable

Some Astro templates store site configuration in TypeScript files with `as const` objects. CloudCannon reads data from `.json`, `.yml`, `.toml`, and frontmatter — not from `.ts` sources, so these can't be edited in CloudCannon's data editor without conversion.

Options, in order of preference:

1. **Leave as-is** — document as developer-only. Best for small blogs where the config rarely changes.
2. **Convert to JSON** — extract the config into a `.json` file, import it in TypeScript, configure as `data_config` in CC.
3. **Hybrid** — move frequently-edited fields to JSON while keeping developer-only settings in TypeScript.

**Imported assets in TypeScript config:** When the config imports images (e.g. `import ogImage from "@/assets/og-image.png"`), these can't be expressed in JSON. Copy the image to `public/` and reference it as a static path string (e.g. `"/og-image.png"`). Components that consume the value (like `Seo.astro`) typically already handle both `ImageMetadata` objects and string paths via `typeof image === "string"` branching. Keep the TypeScript file as a thin re-export wrapper: `import data from "@/data/site-settings.json"; export const siteConfig = data;` — this preserves all existing import paths while making the data CC-editable.

**Literal types:** JSON imports widen literal types (`"ltr" | "rtl"` → `string`, `true` → `boolean`, `"x" | false` → `string`), so the thin wrapper no longer satisfies the original config type and builds that run `astro check` fail. Cast in the wrapper (`config as SiteConfig`) or validate it (zod parse). A cast removes the compile-time guard, so constrain those values in CloudCannon with `select`/`switch` inputs.

## Pages collection: including `.astro` pages

There are two distinct approaches for pages in CloudCannon. Pick based on the audit classification — picking the wrong one either forces unnecessary refactoring or leaves pages unreachable to editors:

- **`src/content/pages/` collection**: For templates with structured data that should become content collection entries. See [page-building.md](../../migrate-to-cloudcannon/astro/page-building.md).
- **`src/pages/` collection**: For templates where static pages stay as `.astro` files with source editables. Simpler, but no Zod validation and limited to source editables for `.astro` pages.

```yaml
pages:
  path: src/pages
  icon: wysiwyg
  url: "/[slug]/"
  glob:
    - "*.md"
    - "index.astro"
  _enabled_editors:
    - visual
  disable_add: true
```

Only include `.astro` pages that actually have editable regions. The `[slug]` pattern handles `index.astro` correctly — resolves to `/`.

### Prefer one unified pages collection

When a site has both content collection pages (`src/content/pages/*.md`) and source-editable `.astro` pages (`src/pages/contact.astro`), default to including both in a single `pages` collection rather than creating a separate `static_pages` collection. A unified collection avoids confusing editors with two "pages" buckets in the sidebar.

Use `_enabled_editors` and schemas to differentiate behavior within the collection:

- `.md` content collection pages: `_enabled_editors: [visual, content, data]`, structured schemas
- `.astro` source-editable pages: `_enabled_editors: [visual]`, `disable_add: true` on those entries

Only split into separate collections when there's a genuine UX reason — for example, dozens of `.astro` pages that would clutter the main pages list, or fundamentally different workflows where combining them would confuse editors.

### Deciding whether to enable page creation

| Setting             | When                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disable_add: true` | Template is blog-focused and standalone pages are one-offs with hardcoded layouts; enabling creation would give editors a broken or unstyled result. |
| Default (allow add) | Template has a generic page layout that works for arbitrary content; new `.md` pages render correctly with the existing layout and navigation.       |

Use `disable_add: true` to hide the Add button — `add_options: []` has no effect.

### Source editables vs. refactoring to `.md`

| Approach                                        | When                                                                                                                                         | Effort                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Source editables** (`data-editable="source"`) | Long-form prose only. 1–2 inline string edits on a page whose layout _is_ the body.                                                          | Low — no structural changes.       |
| **Refactor to `.md`**                           | Default for unique-layout pages with 2+ content sections. Extract into `pages` collection with structured frontmatter + page-builder schema. | Medium — move content, add schema. |

**Decision rule:** Page builder is the default; source-editable is the exception. Run the page through the [audit.md classification census](../../migrate-to-cloudcannon/astro/audit.md#classifying-static-pages-source-editables-vs-content-collection) and [page-building.md § When to reach for page builder](../../migrate-to-cloudcannon/astro/page-building.md#when-to-reach-for-page-builder).

## Destructuring defaults never fire on content fields

**MUST NOT:** rely on a destructuring default for a prop fed from content. `const { icon = 'tabler:info' } = Astro.props` does nothing when content supplies `icon: null` — destructuring defaults fire only on `undefined`, and optional content fields arrive as `null`. The component renders `null`, and `<Icon name={null} />` crashes `astro build`.

**Why:** the default is still there in the source, so the failure reads as a component bug rather than a content one. It applies to every optional field on every content-fed component, including props forwarded down to shared sub-components.

Resolve the default in the component body, and pick the operator for what the field can legitimately hold:

| Field                                       | Operator | Why                                                      |
| ------------------------------------------- | -------- | -------------------------------------------------------- |
| String                                      | `\|\|`   | Also catches `""`, which is rarely a value worth keeping |
| Number where `0` is real                    | `??`     | `rating \|\| 5` discards a real `0`                      |
| Boolean where an explicit `false` must hold | `??`     | `isReversed \|\| false` discards a real `false`          |

```astro
---
// ❌ Wrong — both defaults are dead for content-fed props
const { icon = 'tabler:info-square', variant = 'info' } = Astro.props;

// ✓ Right — resolved where the value is consumed
const { icon, variant } = Astro.props;
const activeVariant = variant || 'info';
const iconName = icon || variants[activeVariant].icon;
---
```

**Common miss:** spreading a content object straight into a typed third-party API (SEO metadata, an image component) passes its `null` keys through, and a `null` overrides the library's own default. Pick the keys you mean rather than spreading.

Base rule: [structures.md § Handling null values from empty YAML fields](../structures.md#handling-null-values-from-empty-yaml-fields).

## `z.union` silently matches the wrong schema when fields have defaults

When combining multiple page schemas with `z.union`, schemas with many `.default()` and `.nullish()` fields validate successfully against data intended for a different variant. An earlier schema in the union "wins" because all its fields validate; fields from the correct schema are silently absent at runtime (`data.show_form === undefined`), conditional rendering breaks, and blocks of the page disappear.

**Fix:** Use `z.discriminatedUnion("_schema", [...])` with a literal `_schema` field in each schema. This forces Zod to match on the `_schema` value rather than validating fields. Every content file must declare `_schema` explicitly. See the [decision table in configuration.md § Schemas](configuration.md#zod-zunion-vs-zdiscriminatedunion).
