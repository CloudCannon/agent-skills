# Template-Based Snippets

Use when the SSG's component syntax matches a built-in template exactly. Simpler and less verbose than raw snippets.

Read [snippets.md](snippets.md) first for overview and shared snippet properties.

---

## How it works

Set `template` to a built-in template name, then fill in the required `definitions`. CloudCannon handles the parsing format internally — you don't need to configure `format`, `params`, or parsers.

```yaml
_snippets:
  callout:
    template: mdx_component
    definitions:
      component_name: Callout
      named_args:
        - editor_key: type
          type: string
        - editor_key: message
          type: string
```

---

## MDX templates

Built-in templates for Astro, Next.js and generic MDX sites. No `_snippets_imports` required — these resolve automatically when referenced by name. Hugo shortcode templates are listed in [built-in-templates.md § Hugo shortcodes](built-in-templates.md#hugo-shortcodes), with worked examples in [hugo/overview.md](hugo/overview.md). Eleventy shortcode and include templates are in [built-in-templates.md § Eleventy shortcodes and includes](built-in-templates.md#eleventy-shortcodes-and-includes), with worked examples in [eleventy/overview.md](eleventy/overview.md).

### `mdx_component` (self-closing)

Matches: `<ComponentName arg1="val1" arg2="val2" />`

Required definitions:

- `component_name` (string) — the component tag name as it appears in content
- `named_args` (array of snippet models) — the component's attributes

### `mdx_paired_component` (wraps content)

Matches: `<ComponentName arg1="val1">inner content</ComponentName>`

Required definitions:

- `component_name` (string)
- `named_args` (array of snippet models)
- `content_key` (string) — the editor key for the content between the tags

### Array-of-objects props

An `mdx_component` arg of `type: array` holds a list of objects, such as a gallery's images. Write each object on one line, with unquoted keys and double-quoted values, which is the format CloudCannon writes:

```mdx
<Gallery
  images={[
    { src: "/images/a.jpg", alt: "First" },
    { src: "/images/b.jpg", alt: "Second" },
  ]}
/>
```

**MUST:** normalise existing content to this format before configuring the snippet.
**Why:** an object with quoted keys (`{ "src": "/images/a.jpg" }`) doesn't match its structure, so editors can't edit the item.

```yaml
_structures:
  gallery_images:
    values:
      - label: Image
        icon: image
        preview:
          text: [{ key: alt }, Image]
          image: [{ key: src }]
        value:
          src:
          alt:
        _inputs:
          src:
            type: image
          alt:
            type: text

_snippets:
  gallery:
    template: mdx_component
    inline: false
    preview:
      text: Gallery
      icon: photo_library
    definitions:
      component_name: Gallery
      named_args:
        - editor_key: images
          type: array
    _inputs:
      images:
        type: array
        options:
          structures: _structures.gallery_images
```

---

## Snippet Model

The model config for each argument/attribute. Used in template `named_args` and raw `key_values.models`.

| Field             | Type    | Description                                                                  |
| ----------------- | ------- | ---------------------------------------------------------------------------- |
| `editor_key`      | string  | Key shown in the CC editor. Also used for `_inputs` targeting.               |
| `source_key`      | string  | Key in the source text. Defaults to `editor_key`. Only set when they differ. |
| `type`            | string  | Data type: `string`, `number`, `boolean`, `array`, `object`                  |
| `optional`        | boolean | Whether this arg is required. Default `false`.                               |
| `default`         | any     | Default value when creating a new snippet in the editor                      |
| `remove_empty`    | boolean | Omit from output if empty. Requires `optional: true`. Default `false`.       |
| `allowed_values`  | array   | Restrict to specific values. Pair with a select input on the `editor_key`.   |
| `implied_boolean` | boolean | Any value aliases to `true`, empty to `false`. Default `false`.              |

Template `named_args` use array syntax:

```yaml
named_args:
  - editor_key: type
    source_key: kind
    type: string
  - editor_key: message
    type: string
```

---

## Example: full snippet lifecycle

Given this MDX component in content:

```mdx
<Notice type="warning">Check your configuration before deploying.</Notice>
```

The CC config to support it:

```yaml
_snippets:
  notice:
    template: mdx_paired_component
    inline: false
    preview:
      text: Notice
      icon: info
    definitions:
      component_name: Notice
      content_key: inner_content
      named_args:
        - editor_key: type
          type: string
    _inputs:
      type:
        type: select
        options:
          values:
            - note
            - tip
            - info
            - warning
```

What happens:

1. CC's Content Editor sees `<Notice type="warning">...</Notice>` in the MDX
2. The built-in `mdx_paired_component` template matches it against the `notice` snippet definition
3. The editor displays it as a "Notice" block (with the info icon from `preview`)
4. Clicking it opens a panel with a `type` dropdown and an `inner_content` text field
5. On save, CC serializes the data back to the MDX component syntax
