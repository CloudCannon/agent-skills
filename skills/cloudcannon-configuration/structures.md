# Structures

Templates that define the complete shape of data in CloudCannon. They populate new array items and empty objects, and tell the visual editor what fields to expect so existing items don't render with `undefined` errors.

## Mandatory rules (read first)

| #   | Rule                                                                                                                                                                                  | Failure mode if skipped                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Every field in a structure `value` MUST be present in the content frontmatter, even if empty.                                                                                         | `undefined` errors in the visual editor. Most common migration bug.                     |
| 2   | Every array and object input MUST have an `_inputs` entry with `type: array`/`type: object` and an explicit `options.structures: _structures.<name>` link (full path, not bare name). | Editors cannot add items — the Add button won't appear or offers the wrong structure.   |
| 3   | Every structure value MUST include a `preview` block with a meaningful `text` key lookup.                                                                                             | Sidebar cards show only the generic label ("Item", "Action") instead of a useful value. |
| 4   | Every nested object field editors see MUST have `type: object` + `options.preview.icon`.                                                                                              | Generic icon in the data editor; visual clutter.                                        |

These apply in both the main `cloudcannon.config.yml` AND inside co-located structure-value files. Define structures during the configuration phase and use them as the blueprint when creating content files in the content phase — not as a backfill step.

## Verification

**MUST:** after editing content files, cross-reference every block against its structure definition for field completeness.
**Why:** field omissions are the single most common source of CloudCannon editor errors. Rule #1 covers any field that appears on any item — rare (1 of 10), conditional (only populated when `type: dropdown`), or purely decorative. Commonly-forgotten: `tagline`, `content`, `subtitle`, and nested object fields like `callToAction.variant`, `callToAction.icon`, `callToAction.target`.

### Handling null values from empty YAML fields

In YAML, a bare key with no value (`tagline:`) parses as `null`, not as an empty string or `undefined`. Zod's `.optional()` accepts `undefined` but rejects `null`, so content files with empty fields can silently fail validation. Use one of the two approaches below (either works):

| Approach         | How                                                                                                      | When to use                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Zod `.nullish()` | Replace `.optional()` with `.nullish()` on optional fields. Accepts `T \| null \| undefined`.            | Default — no per-field CC configuration needed.                                          |
| CC `empty_type`  | Set `empty_type: string` (or appropriate type) on the input in `_inputs`. Writes `""` instead of `null`. | When downstream code distinguishes `null` from `""`, or the Zod schema must stay strict. |

When using `.nullish()`, component templates should still use truthiness checks (`{title && ...}`) — both `null` and `""` are falsy.

### Optional fields — common mistake

**MUST NOT:** Leave an optional field out of the structure `value` because "only some items use it".
**MUST:** Include every field that appears on any item with a sensible default (`""`, `false`, `0`, `[]`).

Omitting a field means:

- CloudCannon can't match an existing item that _does_ have the field to the structure
- Editors can't add the field to new items from the sidebar
- Items with the field round-trip as "unknown" in the editor

Example — a `nav_items` structure where only the GitHub link has an `icon`:

```yaml
# Wrong — no icon field in the value template
value:
  type: link
  label: Label
  href: /
  external: false

# Right — icon present as empty default
value:
  type: link
  label: Label
  href: /
  icon: ""
  external: false
```

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

**MUST:** Use the full `_structures.<name>` path, not the bare name. Naming-convention fallback is unreliable.

```yaml
# Wrong — bare name
options:
  structures: content_blocks

# Right — full path
options:
  structures: _structures.content_blocks
```

## Split co-located approach (5+ block types)

Each component gets its own structure file next to it:

```
src/components/
  Hero.astro
  hero.cloudcannon.structure-value.yml
  Features.astro
  features.cloudcannon.structure-value.yml
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

**Naming:** Structure-value files use the `_type` key as filename prefix: `hero.cloudcannon.structure-value.yml` for `_type: hero`.

### `values_from_glob` vs `_structures_from_glob`

| Helper                  | What it imports                                                                          | Use when                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `values_from_glob`      | Individual structure values into an array. One file = one structure value.               | Split co-located approach (one file per component). Default choice.                      |
| `_structures_from_glob` | Named structure groups. One file defines an `_structures`-like block with multiple keys. | Grouping multiple related structures in one file (e.g. `header_links` + `footer_links`). |

## Shared sub-structures

Structures used by multiple block types (`actions`, `items`, `stats`, `prices`, `testimonials`) stay in the main `cloudcannon.config.yml` under `_structures` and are referenced by name from structure-value files and the config.

### Shared structure → shared preview

A structure's `preview` applies wherever the structure is used — a shared `_nav_items` can't have different icons per consumer. Pick an icon meaningful to the structure's own identity (`link` for `_nav_items`, `help` for `_faq_items`), not to any one consumer's context.

❌ Forking `_nav_items` into `_nav_items_primary` / `_nav_items_footer` just to vary the icon — clutters `_structures` with near-duplicates.
❌ Adding `[*]` overrides on the array per-consumer to "override" the preview — silently ignored when `structures:` is defined (see [configuration-gotchas.md § Array item previews](astro/configuration-gotchas.md#array-item-previews--vs-structure-value)).
✅ One structure, one preview. If two consumers truly need different previews, they need different structures. _(L39)_

### Duplicated select values across structure-value files

If two structure-value files define the same color palette or icon enum, the third will drift. Move shared enums to `_select_data.<name>` at the root of `cloudcannon.config.yml` and reference with `values: _select_data.<name>`. _(L5)_

**MUST:** Only share when all consumers render the same fields. If one component needs fields the others don't, create a separate structure (e.g. `timeline_items`) rather than a union. Union structures clutter the editor with inputs that do nothing — editors fill them in and nothing appears on the page.

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

Shared sub-structures need `preview` blocks like any other structure — inline location is not an excuse to omit them.

**Linking sub-structures from co-located files:** Every co-located structure-value file that contains an array field (`items: []`, `actions: []`, etc.) MUST include an `_inputs` entry linking that array to the shared sub-structure:

```yaml
_inputs:
  items:
    type: array
    options:
      structures: _structures.items
```

The same applies to nested arrays inside shared sub-structures (e.g. if `prices` contains `items: []`, the `prices` structure definition must include `_inputs.items` linking to `_structures.items`).

## Previews

Previews go on **every** structure value — co-located `*.cloudcannon.structure-value.yml` files, inline `_structures` entries in the main config, AND inline structures defined inside `file_config._inputs` for data files. If an array has `structures:`, its item previews live here, **not** on the array's `[*]` path — see [configuration-gotchas.md § Array item previews](astro/configuration-gotchas.md#array-item-previews--vs-structure-value). _(L38)_

Every structure value should include both `picker_preview` and `preview`:

| Preview          | Where it shows                       | Key lookups                                                         | Typical shape                             |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------- |
| `picker_preview` | Modals (Add menu, structure picker)  | Often won't resolve (item has no data yet) — use literal fallbacks. | Literal `text` + `icon`.                  |
| `preview`        | Sidebar cards, collection file lists | Supported — pull data from the item with literal fallbacks.         | Cascade: `key:` lookup, literal fallback. |

Both accept cascading arrays for `text`, `icon`, `image`, and `subtext`. Default to arrays for consistency. CloudCannon tries each cascade entry in order and uses the first non-empty result. Literal strings (not `{key: ...}` objects) serve as fallbacks.

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
```

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

| Key              | Purpose                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `label`          | Display name in the Add menu                                                                      |
| `icon`           | Material Icons name                                                                               |
| `picker_preview` | How it looks in modals (Add menu, structure picker)                                               |
| `preview`        | How it looks as a card elsewhere (sidebar, collection lists) — cascade format with `key:` lookups |
| `value`          | The data template — `_type` discriminator plus all fields                                         |
| `_inputs`        | Field type configuration scoped to this component                                                 |

### The `_type` discriminator

Every structure value must include a discriminator key so CloudCannon can match array items to the correct structure definition. `_type` is our standard — the name is arbitrary (`_name`, `_component`) but must be consistent across all values in a given array. The discriminator value must match the key used in `componentMap` and `registerAstroComponent` calls.

### Scoped `_inputs`

Field type configuration inside a structure-value file is scoped to that component. Only include fields that need non-default types — strings, arrays, and objects work without explicit configuration.

**MUST:** Nested object inputs inside structures need `type: object` + `options.preview.icon`. This applies to co-located structure-value files AND inline `_structures` entries (e.g. `prices`, `testimonials`, `items`):

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

See [configuration.md § Object inputs need preview icons](astro/configuration.md#object-inputs-need-preview-icons).

## Deriving structures from components

1. Read the component's Props interface (or destructuring) for all fields
2. Write each field into the structure `value` with the correct default
3. Exclude internal-only props (see table below)
4. Wire up field-type mapping

### Field-to-YAML mapping

| Prop type | YAML default                                     | Notes                                                                                                                                                  |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| String    | bare key (`title:`)                              | Parses as `null`.                                                                                                                                      |
| Boolean   | `false`                                          |                                                                                                                                                        |
| Number    | `0` or the component default (e.g. `columns: 3`) | Input must be `type: number`. If input is `type: text`, quote as string (`price: "29"`) — bare numbers with text inputs cause a "misconfigured" error. |
| Array     | `[]`                                             |                                                                                                                                                        |
| Object    | nested shape with empty fields                   | E.g. `image:\n  src:\n  alt:`. Gives CC the field structure for the object input.                                                                      |

### Fields to include vs exclude

| Include                                                           | Exclude                                 |
| ----------------------------------------------------------------- | --------------------------------------- |
| Content: `title`, `subtitle`, `tagline`, `content`, `description` | `id` — HTML anchors, not content        |
| Media: `image`, `images`                                          | `isDark` — theme variant, hardcoded     |
| Behaviour: `isReversed`, `isAfterContent`, `isBeforeContent`      | `classes` — CSS customization           |
| Array: `items`, `actions`, `stats`, `prices`, `testimonials`      | `bg` — background slot content          |
| Configuration: `columns`, `count`                                 | `defaultIcon` — component-level default |

### Guarding empty objects and arrays in components

In YAML, `image:\n  src:\n  alt:` creates `{ src: null, alt: null }` — a truthy object. `actions: []` is also truthy. Component conditionals must check for meaningful content, not just the outer value:

- Objects: check a meaningful inner field — `image?.src &&` not `image &&`, `(callToAction?.text || callToAction?.icon) &&` not `callToAction &&`.
- Arrays: check `.length` — `actions?.length > 0 &&` not `actions &&`.

When iterating, filter items that have nothing visible to render: `actions.filter((a) => a?.text || a?.icon).map(...)`.

Check and update these guards during the visual-editing phase when wiring up editable regions. See [visual-editing-reference.md § Content-sourced objects and arrays are never falsy](../cloudcannon-visual-editing/astro/visual-editing-reference.md#content-sourced-objects-and-arrays-are-never-falsy) for the full pattern with code examples.

## Default values from components

When a component defines default values in its destructuring (e.g. `columns = 3`, `isReversed = false`), use those same defaults in the structure value. This ensures new blocks added via CloudCannon match the component's expected defaults.

## Common mistakes

| Symptom / mistake                                                                                                     | Fix                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure-value has `value:` with multiple fields but no `_inputs`                                                    | Editor falls back to CC's type inference — free-text for every field. Add a per-value `_inputs` block. Use `style: modal` on the structure so the editor opens a proper form. Applies equally to inline array structures, `_structures` entries, and array fields in `file_config._inputs`. _(L14)_ |
| "One item in an array data file has a different icon/preview from its siblings, despite declaring the same structure" | The divergent item's top-level key set doesn't exactly match the structure's `value:` shape — CC fell back to inferred preview. Fix in the data: grep each item's top-level keys, compare, drop dead keys or add empty defaults until shapes match. Don't tweak the structure config first. _(L43)_ |

> **Diagnostic — icon mismatch between sibling items:** cause is almost always divergent top-level keys, not a structures config bug. List each item's keys, find the odd one out, fix the data. Common culprits: stray field from a hand-edit, or an optional field present on some items and absent on others (add `field: ""` to all items so the shape matches). _(L43)_

### Omit empty optional fields in structure-value defaults _(L51)_

❌ Seeding empty strings for optional fields — they persist into frontmatter, satisfy `z.string().optional()` validators (the field looks "set"), and surface as visible empty editable regions:

```yaml
value:
  heading: Ready to Begin Your Journey?
  primaryLabel: Schedule a Consultation
  secondaryLabel: "" # ← persists, breaks ?.trim() button conditionals
  secondaryHref: ""
```

✅ Omit optional fields entirely — editor "Add" produces clean frontmatter; the optional secondary button only appears when an editor explicitly fills both fields:

```yaml
value:
  heading: Ready to Begin Your Journey?
  primaryLabel: Schedule a Consultation
```

- [ ] Audit all three default-value locations — `*.cloudcannon.structure-value.yml`, `_structures.*.values[].value` in `cloudcannon.config.yml`, and `.cloudcannon/schemas/<collection>.md` — for `: ""` on optional fields. Each hit is either required (keep, fill with a real default) or optional (delete the key). No empty-string defaults survive. _(Cross-links: L11 button conditionals, L17 hero-CTA census)_
