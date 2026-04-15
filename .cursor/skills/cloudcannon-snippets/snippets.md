# Snippets — Overview

Snippets let editors insert and edit complex markup (components, shortcodes, embeds) inside CloudCannon's rich text Content Editor. CloudCannon doesn't execute the component — it just needs to understand the syntax well enough to parse, display, and re-serialize it.

**Two distinct layers:**

- **SSG layer**: The component implementation, how it's imported/registered, build directives (`client:load` in Astro, etc.). This is what makes the component work at build time.
- **CloudCannon layer**: The `_snippets` config that teaches the Content Editor the component's syntax — its name, attributes, whether it wraps content, and what editor inputs to show. This is purely for the editing experience.

Agents must handle both layers during a migration, but keep them conceptually separate. SSG-specific snippet guidance lives in each SSG's `snippets.md` (e.g. `astro/snippets.md`).

---

## Sub-docs

| Doc | When to read |
|---|---|
| [Template-based snippets](template-based.md) | Component syntax matches a built-in template (most common). Covers MDX templates, snippet model reference, example lifecycle. |
| [Raw snippets](raw.md) | Component needs custom syntax (e.g. `client:load`). Covers parser types, snippet format reference, custom templates. |
| [Built-in templates](built-in-templates.md) | Built-in MDX templates vs MDX default import bundle; patterns, definitions, `mdx_format`, parser internals. |
| [Gotchas](gotchas.md) | Debugging or reviewing. Common pitfalls and workarounds. |

---

## Configuration hierarchy

Root-level config keys that relate to snippets:

| Key | Purpose |
|---|---|
| `_snippets` | Define individual snippet configurations (the main key agents write) |
| `_snippets_templates` | Define custom reusable snippet templates (when built-in ones don't cover your syntax) |
| `_snippets_definitions` | Define reusable values shared across snippets via `{ ref: "key" }` syntax |

Most migrations only need `_snippets`.

> **Note:** `_snippets_imports` exists but should not be used during migrations. It loads pre-built catchall snippet instances (including one that hides `import` statements) which can match content incorrectly (e.g. fenced code blocks, CSS/JS blocks). Custom `_snippets` entries give full control without `_snippets_imports`. Built-in **templates** like `mdx_component` are always available by name — "resolve automatically" means CC knows the template pattern without needing `_snippets_imports`, not that `mdx_component` handles import statements. Import handling is an SSG concern: use `astro-auto-import` (or equivalent) to inject imports at build time so `import` lines don't appear in source files. See [astro.md § Auto-import](astro.md#auto-import-keeping-import-statements-out-of-content). For built-in **templates** vs the **import bundle** (catchalls like `_cc_mdx_unknown`), see [built-in-templates.md](built-in-templates.md).

---

## Which approach?

- **Template-based** → component syntax matches a built-in template exactly (no extra directives, standard attribute format). See [template-based.md](template-based.md).
- **Raw** → extra syntax needs to appear literally, or non-standard attribute format, or fine-grained parsing control needed. See [raw.md](raw.md).

Most migrations use template-based for simple components and raw for anything with SSG-specific directives.

For **Astro**, [astro.md](astro.md) connects this choice to the SSG layer: when to adopt the MDX stack (including refactoring from Markdown-only) versus staying on `.md` with more raw parsing work.

---

## Snippet properties

Every entry under `_snippets` supports these keys (shared by both approaches):

| Key | Type | Description |
|---|---|---|
| `template` | string | Template to inherit (mutually exclusive with `snippet`) |
| `snippet` | string | Raw matching pattern with `[[placeholder]]` markers (mutually exclusive with `template`) |
| `definitions` | object | Values for template variables (used with `template`) |
| `params` | object | Parser configs for each placeholder (used with `snippet`) |
| `inline` | boolean | Can this appear mid-sentence? Default `false` (block-level) |
| `preview` | object | Card appearance in the editor |
| `picker_preview` | object | Appearance in the snippet picker modal — same options as `preview`. `key:` lookups are supported but often won't resolve in picker contexts, so literal values are typical. |
| `view` | string | Rendering mode: `card` (default), `inline`, `gallery` |
| `_inputs` | object | Input configurations scoped to this snippet's fields |
| `_structures` | object | Structure definitions for array/object fields in this snippet |
| `_select_data` | object | Fixed dropdown options scoped to this snippet |
| `strict_whitespace` | boolean | Match whitespace exactly? Default `false` (normalized) |
| `alternate_formats` | array | Other syntaxes that should also match this snippet |

---

## Enabling snippets in the toolbar

By default, CloudCannon shows the snippet toolbar action if snippets are configured. If you've customized `_editables`, include `snippet: true`:

```yaml
_editables:
  content:
    blockquote: true
    bold: true
    snippet: true
```

---

## When NOT to use a snippet

If a rich text field contains structured HTML with a fixed layout and only a few changing values (e.g. a banner with specific classes for centering and link styling), don't define it as a snippet. Instead, decompose the HTML into explicit props and let the component own the markup. See [visual-editing-reference.md § Content vs presentation in frontmatter fields](../cloudcannon-visual-editing/astro/visual-editing-reference.md#content-vs-presentation-in-frontmatter-fields) for the full pattern.

---

## Raw snippets for inline HTML in `.md` files

Snippets aren't just for MDX components. Plain `.md` content files often contain HTML blocks that have no markdown equivalent -- `<figure>` with `<figcaption>`, `<video>`, `<details>`/`<summary>`, `<iframe>`, etc. Without a snippet config, editors see raw HTML in the content editor. With a snippet, they get a structured panel with named fields.

No MDX integration or auto-import setup is needed. Raw snippets match the HTML pattern directly in the source text. For `key_values` format requirements, see [raw.md § key_values](raw.md#key_values--keyvalue-pairs).

### When to create an HTML snippet

During the audit, scan content files for HTML blocks and ask: can this be expressed in **standard markdown** or as a **first-class CloudCannon rich-text construct** (below)? If not, it's a snippet candidate. Block-level HTML with multiple attributes or nested elements should usually become snippets.

**First-class elements.** CloudCannon maps these to supported editor semantics. The saved file can show HTML tags or Markdown syntax depending on `markdown.options` (and the toolbar on `_editables.content` where those features have buttons — same idea as [Markdown tables in configuration-gotchas](../cloudcannon-configuration/astro/configuration-gotchas.md#set-markdownoptionstable-when-content-has-markdown-tables)):

- **Block:** `p`, `h1`–`h6`, `blockquote`, `hr`, `ul`, `ol`, `li`, `table`, fenced code blocks / `pre` with `code`
- **Inline:** `strong`, `em`, `code`, `a`, `img`, `u`, `s` (strikethrough), `sub`, `sup`

**Strikethrough:** When parsing, CloudCannon treats `<s>`, `<strike>`, and `<del>` as strikethrough. On save, output is normalized toward a single canonical HTML form (expected to converge on `<s>`). Legacy `<strike>` in source does not require a snippet. Set **`markdown.options.strikethrough`** to match the SSG: if `true`, strikethrough can round-trip as Markdown `~~text~~`; if `false`, it stays as HTML.

**Examples (align options with what you see in content):**

- **`<sup>`** — Default **`superscript: false`** keeps literal `<sup>` in the file. Use **`superscript: true`** only if the SSG understands caret superscript (`^text^`) and the site should save that way.
- **Line breaks / `<br>`** — Use **`markdown.options.breaks`** with **`markdown.options.xhtml`** so hard breaks match the SSG and existing files. Per CloudCannon, `breaks: true` preserves newlines as `\n` in the saved file; with `breaks: false`, `xhtml: false` vs `true` affects whether hard breaks serialize as `<br>` vs `<br />`. See [options.breaks](https://cloudcannon.com/documentation/developer-articles/configure-your-markdown-engine/#options.breaks).
- **`<mark>`** — Treat like the other first-class inline cases: no snippet for highlight markup alone. A dedicated `markdown.options` flag is not in product yet but is planned; re-check docs when it ships.

Full option list and behavior: [Configure your Markdown engine](https://cloudcannon.com/documentation/developer-articles/configure-your-markdown-engine/).

### Workflow

1. **Inventory** (audit phase) -- grep content directories for HTML tags. For each pattern, note attributes and varying values. If the tag is **first-class** (list above), verify `markdown.options` (and `_editables.content` where relevant) match how the repo authors that markup instead of assuming a snippet.
2. **Normalize** (content phase) -- standardize all instances of each pattern to a consistent format. Remove class attributes that belong in CSS, collapse unnecessary whitespace, ensure all instances use the same attribute order. This is essential -- the snippet pattern must match every instance.
3. **Configure** (configuration phase) -- write raw snippet configs. Identify which parts are fixed structure (literal text in the `snippet` string) vs editable values (`[[placeholder]]` markers with parsers).

### Pattern design

Separate **editor concerns** from **developer concerns**. Attributes like `src`, `alt`, caption text, and `href` are editor concerns -- expose them as snippet fields. Presentation attributes like `autoplay`, `muted`, `class`, `loop` are developer concerns -- hardcode them in the literal portion of the snippet pattern.

When a pattern has multiple variants (e.g. video with controls vs video with loop), create separate snippets rather than trying to make attributes optional. Each snippet has a fixed structure with only content values as placeholders.

### Example: `<figure>` with image and caption

Source pattern in markdown:

```html
<figure>
<img src="https://example.com/photo.jpg" alt="Description" />
<figcaption>
Photo by <a href="https://example.com">Author</a>
</figcaption>
</figure>
```

Snippet config:

```yaml
_snippets:
  figure:
    snippet: |-
      <figure>
      <img [[img_attrs]] />
      <figcaption>
      [[caption]]
      </figcaption>
      </figure>
    inline: false
    view: gallery
    preview:
      gallery:
        image:
          - key: src
        fit: contain
      text:
        - key: alt
        - Figure
      icon: image
    picker_preview:
      gallery:
        icon:
          - image
      text:
        - Figure
    params:
      img_attrs:
        parser: key_values
        options:
          models:
            - editor_key: src
              type: string
            - editor_key: alt
              type: string
          format:
            root_value_delimiter: "="
            string_boundary:
              - '"'
      caption:
        parser: content
        options:
          editor_key: caption
    _inputs:
      src:
        type: image
      alt:
        type: text
      caption:
        type: html
```

The `key_values` parser handles the `<img>` tag's `src` and `alt` attributes as a group. Use `key_values` (not `argument`) for HTML attribute values — see [gotchas](gotchas.md) for why. The `content` parser handles rich text (including nested HTML like `<a>` tags) in the figcaption. The `view: gallery` + `preview.gallery.image` shows the actual image in the content editor — see [snippet preview for images](#snippet-preview-for-images) below.

### Example: `<video>` with fixed attributes

```yaml
_snippets:
  video_controls:
    snippet: |-
      <video autoplay muted="muted" controls plays-inline="true">
      <source [[source_attrs]] type="video/mp4">
      </video>
    inline: false
    preview:
      text: Video
      icon: videocam
    params:
      source_attrs:
        parser: key_values
        options:
          models:
            - editor_key: src
              type: string
          format:
            root_value_delimiter: "="
            string_boundary:
              - '"'
    _inputs:
      src:
        type: url
```

All presentation attributes are literal. Only the video URL is editable. Even with a single variable attribute, use `key_values` — the `argument` parser does not work for values inside HTML attribute quotes. Fixed attributes like `type="video/mp4"` stay in the literal text after the `[[placeholder]]`.

---

## Snippet preview for images

Any snippet that contains an image (figure, hero, card, etc.) should use `view: gallery` so editors see the actual image in the content editor instead of a generic icon card.

Three keys work together:

- `view: gallery` — switches the snippet from a compact card to a large image preview
- `preview.gallery.image` — cascading option pointing at the image field's `editor_key`
- `preview.gallery.fit` — `cover` (default, crops to fill) or `contain` (shows full image)

Use `picker_preview` to override the gallery for the snippet picker modal (where you choose which snippet to insert). The picker doesn't have image data yet, so disable the gallery image and show a static icon instead.

```yaml
view: gallery
preview:
  gallery:
    image:
      - key: src
    fit: contain
  text:
    - key: alt
    - Fallback label
  icon: image
picker_preview:
  gallery:
    icon:
      - image
  text:
    - Snippet Name
```

Apply this pattern to every snippet that has an image `editor_key` — not just `<figure>`. If the snippet has an image field, give it a gallery preview.

---

**SSG-specific guidance:**
- Astro: [astro.md](astro.md)
