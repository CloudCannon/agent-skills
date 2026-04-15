# Structures

Structures are templates that define the complete shape of data in CloudCannon. They serve two purposes:

1. **Array items** — when an editor adds a new item to an array (e.g. a `content_blocks` page builder), the structure populates the item with all required fields.
2. **Object inputs** — when an object input is empty, a structure tells CloudCannon what fields to offer when the editor populates it. Without a structure, CloudCannon can't know the shape of an empty object.

Without structures, CloudCannon can't populate new array items or empty objects, and existing items may have `undefined` fields that break editable regions in the visual editor.

## Field completeness rule

> **MANDATORY — This is not optional and must not be skipped.** Every field in a structure `value` MUST be present in the content frontmatter, even if empty. Missing fields cause ugly `undefined` errors in CloudCannon's visual editor and break the editing experience. This is one of the most common migration mistakes — do not let it happen.

For each content block in a page's `content_blocks` array, open the corresponding structure definition and verify that **every single key** appears in the content. Common fields that get forgotten: `tagline`, `content`, `subtitle`, and nested object fields like `callToAction.variant`, `callToAction.icon`, `callToAction.target`. If a callToAction object exists with only `text` and `href`, you MUST also include `variant`, `icon`, and `target` as empty keys.

**This is not a backfill step.** Structures must be defined during the configuration phase and then used as the blueprint when the agent creates content files during the content phase. For each block type, the structure value is the canonical list of fields — the agent copies the full field list and populates only the ones that have content from the original page, leaving the rest as empty/default values.

**Verification step (required):** After creating or editing content files, the agent MUST cross-reference every block in every content file against its structure definition to confirm field completeness. Do not skip this — it catches the single most common source of CloudCannon editor errors.

### Handling null values from empty YAML fields

In YAML, a bare key with no value (`tagline:`) parses as `null`, not as an empty string or `undefined`. This creates a mismatch: Zod's `.optional()` accepts `undefined` but rejects `null`, so content files with empty fields can silently fail validation.

There are two ways to align what the content files contain with what the schema expects. Use one or both:

- **Zod schema** — use `.nullish()` instead of `.optional()` on all optional fields. `.nullish()` accepts `T | null | undefined`, so null values from empty YAML keys pass validation. This is the recommended default since it requires no per-field CloudCannon configuration.
- **CloudCannon inputs** — set `empty_type: string` (or the appropriate type) on inputs in `_inputs`. This tells CloudCannon to write `""` instead of `null` when an editor clears a field. Useful when downstream code distinguishes between `null` and empty string, or when you want the Zod schema to stay strict.

Either approach works — the goal is that both sides agree on how empty values are represented. When using `.nullish()` in Zod, component templates should continue to use truthiness checks (`{title && ...}`) since both `null` and `""` are falsy.

## Inline approach (small sites)

For sites with fewer than 5 block types, define structures directly in `cloudcannon.config.yml`:

```yaml
_structures:
  content_blocks:
    values:
      - label: Banner
        icon: flag
        value:
          _type: banner
          title:
          content:
          image:
            src:
            alt:
      - label: Rich Text
        icon: article
        value:
          _type: rich_text
          content:

_inputs:
  content_blocks:
    type: array
    options:
      structures: _structures.content_blocks
```

Link the array to the structure explicitly via `_inputs.content_blocks.options.structures` — don't rely on the naming-convention heuristic.

> **MANDATORY — Every array and object input MUST have explicit structure linkage.** Do not rely on CloudCannon's naming-convention heuristic — it is unreliable. Every array field (`items`, `actions`, `stats`, `prices`, `testimonials`, `images`, `inputs`, etc.) MUST have an `_inputs` entry with `type: array` and `options.structures` pointing to the correct structure. This applies in both the main `cloudcannon.config.yml` AND inside co-located structure-value files. Without explicit linkage, editors cannot add items to arrays — the "Add" button won't appear or won't offer the correct structure. This is a blocking UX issue that must be caught before handoff.

## Split co-located approach (5+ block types)

When a site has 5 or more block types, maintaining all structures inline in the config becomes unwieldy. Instead, each component gets its own structure file next to it:

```
src/components/
  Hero.astro
  hero.cloudcannon.structure-value.yml
  Features.astro
  features.cloudcannon.structure-value.yml
  ...
```

The input uses `values_from_glob` to collect them all:

```yaml
_inputs:
  content_blocks:
    type: array
    options:
      structures:
        values_from_glob:
          - /src/components/*.cloudcannon.structure-value.yml
```

### Naming convention

Structure-value files use the `_type` key as the filename prefix: `hero.cloudcannon.structure-value.yml` for `_type: hero`, `blog_latest_posts.cloudcannon.structure-value.yml` for `_type: blog_latest_posts`.

## `values_from_glob` vs `_structures_from_glob`

Both import structure definitions from files, but they work at different levels:

- **`values_from_glob`** — imports individual structure values into an array. Each file defines a single structure value (label, icon, value, previews). Use this for the split co-located approach where one file = one component.
- **`_structures_from_glob`** — imports named structure groups. Each file defines a complete `_structures`-like block with named keys and value arrays. Use this when grouping multiple related structures (e.g. a file defining both `header_links` and `footer_links`).

**Recommendation:** Use `values_from_glob` for per-component splits. Reserve `_structures_from_glob` for cases where one file needs to define multiple named structure groups.

## Shared sub-structures

Structures used by multiple block types — like `actions` (button arrays), `items` (feature/step lists), `stats`, `prices`, `testimonials` — stay in the main `cloudcannon.config.yml` under `_structures`. They're referenced by name from within the structure-value files and from the config.

**Only share when all consumers render the same fields.** If one component renders fields the others don't, create a separate structure for it instead of a union. For example, if a Timeline component renders `job_title`, `company`, and `date_range` but an ItemGrid component only renders `title`, `description`, and `icon`, don't put the Timeline-only fields in the shared `items` structure — create a `timeline_items` structure and reference it from the Timeline's widget. A union structure clutters the editor with inputs that do nothing; editors fill them in expecting results on the page and get confused when nothing appears.

```yaml
_structures:
  actions:
    values:
      - label: Action
        preview:
          text:
            - key: text
            - Action
          icon:
            - ads_click
        value:
          text:
          href:
          variant: primary
          icon:
          target:
  items:
    values:
      - label: Item
        preview:
          text:
            - key: title
            - Item
          icon:
            - list
        value:
          title:
          description:
          icon:
```

Shared sub-structures need `preview` blocks just like co-located widget structures. Without a `preview`, array items in the sidebar show only the generic label ("Item", "Action") instead of pulling a meaningful value like the item's title. Don't omit `preview` because the structure is inline.

**Linking sub-structures from co-located files:** Every co-located structure-value file that contains an array field (e.g. `items: []`, `actions: []`, `stats: []`) MUST include an `_inputs` entry linking that array to the shared sub-structure. For example, a `features3.cloudcannon.structure-value.yml` with `items: []` in its `value` needs:

```yaml
_inputs:
  items:
    type: array
    options:
      structures: _structures.items
```

The same applies to nested arrays inside shared sub-structures. For example, if `prices` contains `items: []`, the prices structure definition must include `_inputs.items` linking to `_structures.items`.

## Previews

Every structure value should include both `picker_preview` and `preview`:

- **`picker_preview`** — how the item appears in modals (the "Add" menu, structure picker). `key:` lookups are supported but often won't resolve in picker contexts (e.g. adding a new item where no data exists yet), so literal fallback values are typical.
- **`preview`** — how the item appears as a card everywhere else (sidebar array cards, collection file lists). Uses `key:` lookups to pull data from the item, with literal fallbacks.

Both accept cascading arrays for `text`, `icon`, `image`, and `subtext`. Default to arrays for each field for consistency.

```yaml
label: Hero
icon: flag
picker_preview:
  text:
    - Hero
  icon:
    - flag
preview:
  text:
    - key: title
    - Hero
  icon:
    - flag
  image:
    - key: image.src
value:
  _type: hero
  title:
  subtitle:
  # ...
```

The cascade format is an array of lookup objects — CloudCannon tries each entry in order and uses the first non-empty result. Literal strings (not objects with `key`) serve as fallbacks.

## Structure-value file anatomy

A complete `*.cloudcannon.structure-value.yml` file:

```yaml
label: Content
icon: article
picker_preview:
  text:
    - Content
  icon:
    - article
preview:
  text:
    - key: title
    - Content
  icon:
    - article
value:
  _type: content
  title:
  subtitle:
  tagline:
  content:
  items: []
  image:
    src:
    alt:
  isReversed: false
  isAfterContent: false
_inputs:
  content:
    type: html
    options:
      allow_custom_markup: true
  image:
    type: object
    options:
      preview:
        icon: image
  isReversed:
    type: switch
  isAfterContent:
    type: switch
```

### Required parts

| Key | Purpose |
|-----|---------|
| `label` | Display name in the Add menu |
| `icon` | Material Icons name |
| `picker_preview` | How it looks in modals (Add menu, structure picker) |
| `preview` | How it looks as a card elsewhere (sidebar, collection lists) — cascade format with `key:` lookups |
| `value` | The data template — `_type` discriminator plus all fields |
| `_inputs` | Field type configuration scoped to this component |

### The `_type` discriminator

Every structure value must include a discriminator key so CloudCannon can match array items to the correct structure definition. We use `_type` as our standard, but the name is arbitrary — `_name`, `_component`, or anything else works as long as it's consistent across all values in a given array. Similarly, `content_blocks` is our standard array name for page builder blocks, but any name works with the right config. The discriminator value must match the key used in `componentMap` and `registerAstroComponent` calls.

### Scoped `_inputs`

Field type configuration inside a structure-value file is scoped to that component. This keeps input config co-located with the component rather than polluting the main config. Only include fields that need non-default types — strings, arrays, and objects work fine without explicit configuration.

**Nested object inputs need preview icons too.** Object fields within a structure (e.g. `callToAction`, `image`) show a generic icon in the data editor without explicit `type: object` + `options.preview.icon`. This applies to **both** co-located structure-value files **and** inline `_structures` entries in `cloudcannon.config.yml` (e.g. `prices`, `testimonials`, `items`). Add these in the structure's `_inputs` alongside other field configs:

```yaml
_inputs:
  callToAction:
    type: object
    options:
      preview:
        icon: ads_click
  image:
    type: object
    options:
      preview:
        icon: image
```

This applies to all nested objects editors will see — not just top-level fields. See [configuration.md § Object inputs need preview icons](astro/configuration.md#object-inputs-need-preview-icons).

## Deriving structures from components

Read the component's Props interface (or destructuring) to determine all fields:

1. **Strings** — bare key with no value (e.g. `title:`) which YAML parses as `null`
2. **Booleans** — `false`
3. **Numbers** — `0` or a sensible default from the component (e.g. `columns: 3`). The input must be `type: number` for bare numeric values. If the input is `type: text` (or untyped), quote the value as a string instead (e.g. `price: "29"`). Bare numbers with text inputs cause a "misconfigured" error in CloudCannon.
4. **Arrays** — `[]`
5. **Objects** — nested shape with empty fields (e.g. `image:\n  src:\n  alt:`). This gives CloudCannon the field structure for the object input.

### Guarding empty objects and arrays in components

In YAML, `image:\n  src:\n  alt:` creates `{ src: null, alt: null }` — a truthy object. Similarly, `actions: []` creates an empty array — also truthy. Component conditionals must check for meaningful content, not just the outer value:

**Objects** — check a meaningful inner field:
- `image?.src &&` instead of `image &&`
- `(callToAction?.text || callToAction?.icon) &&` instead of `callToAction &&`
- `link?.href &&` instead of `link &&`

This applies to any content-sourced object, not just these specific prop names. The key question is: "what inner field indicates this object has real content?"

**Arrays** — check `.length`:
- `actions?.length > 0 &&` instead of `actions &&`

When iterating, filter out items that have nothing visible to render — check the fields responsible for visible output, not every field: `actions.filter((a) => a?.text || a?.icon).map(...)`.

Check and update these guards during the visual-editing phase when wiring up editable regions. See [visual-editing-reference.md § Content-sourced objects and arrays are never falsy](../cloudcannon-visual-editing/astro/visual-editing-reference.md#content-sourced-objects-and-arrays-are-never-falsy) for the full pattern with code examples.

### Fields to include

Include all props that are meaningful for editors:
- Content fields: `title`, `subtitle`, `tagline`, `content`, `description`
- Media fields: `image`, `images`
- Behaviour fields: `isReversed`, `isAfterContent`, `isBeforeContent`
- Array fields: `items`, `actions`, `stats`, `prices`, `testimonials`
- Configuration fields: `columns`, `count`

### Fields to exclude

Omit internal component props that don't belong in the CMS:
- `id` — used for HTML anchors, not content
- `isDark` — theme variant, typically hardcoded
- `classes` — CSS customization, not for editors
- `bg` — background slot content, not frontmatter
- `defaultIcon` — component-level default, not per-instance

## Default values from components

When a component defines default values in its destructuring (e.g. `columns = 3`, `isReversed = false`), use those same defaults in the structure value. This ensures new blocks added via CloudCannon match the component's expected defaults.
