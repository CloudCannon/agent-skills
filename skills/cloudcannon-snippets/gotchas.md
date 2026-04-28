# Snippet Gotchas

Common pitfalls when configuring CloudCannon snippets.

---

## Set `root_value_delimiter` and `string_boundary` on raw `key_values`

**MUST:** Set both fields in `format:` for any raw `key_values` parser handling `key="value"` syntax.
**Why:** The schema marks them optional, but the parser's defaults don't produce MDX/HTML-style parsing. Without `root_value_delimiter`, you get `Expected delimiter` (unless all values are implied via `allow_implied_values`). Without `string_boundary` including your quote character, quoted values aren't parsed as strings. Template-based snippets set this internally — raw snippets don't.

```yaml
# Works
format:
  root_value_delimiter: "="
  string_boundary:
    - '"'

# Broken — missing root_value_delimiter
format:
  string_boundary:
    - '"'
```

---

## `key_values` models must be an array, not a map

**MUST:** Use array syntax for `models:` (same format as template-based `named_args`).
**Why:** Some CC docs examples show `models` as an object keyed by source key, but the runtime validates it as an array and rejects the map form.

```yaml
# Correct
models:
  - editor_key: id
    type: string

# Wrong — CloudCannon rejects this at runtime
models:
  id:
    editor_key: id
    type: string
```

---

## Do not use `_snippets_imports` during migrations

**MUST NOT:** Rely on `_snippets_imports` when migrating a site.
**Why:** It can match unintended content. See [snippets.md § Configuration hierarchy](snippets.md#configuration-hierarchy) for the full rationale.

---

## Enable `escape_snippets_in_code_blocks` whenever snippets are configured

**MUST:** Set `markdown.options.escape_snippets_in_code_blocks: true` as part of snippet setup.
**Why:** Custom snippets otherwise match inside fenced code blocks. A documentation post showing `:::note` admonition syntax in a ` ```md ` block will be parsed as real snippets.

```yaml
markdown:
  options:
    escape_snippets_in_code_blocks: true
```

---

## Keep `import` statements out of content files

**MUST NOT:** Leave `import` lines in content files that editors open.
**Why:** Rich text editors show the file contents verbatim. Non-technical editors see the raw imports and get confused.
**How:** Use the SSG's auto-import mechanism — e.g. `astro-auto-import` for Astro. See [astro.md § MDX setup pipeline](astro.md#mdx-setup-pipeline-must-complete-all-four).

---

## Use the `repeating` parser for parent/child patterns

**MUST:** Configure parent/child patterns like `<Tabs><Tab>…</Tab></Tabs>` as a single snippet with `repeating` and an inline template.
**MUST NOT:** Define the child (`Tab`) as a separate `_snippets` entry.
**Why:** The content parser matches the child standalone before the parent's `repeating` parser runs, which empties the parent and breaks the match.
**See:** [raw.md § repeating](raw.md#repeating--repeat-a-child-pattern-as-array-items) for the reference and a working example.

---

## Fix snippet config ambiguity when round-trip throws "unparseable"

**MUST:** Resolve the underlying ambiguity rather than working around the error.
**Why:** CloudCannon re-parses its own serialized output to verify round-trip safety. When re-parsing produces a different snippet sequence, it throws `Stringified content would be unparseable`. This means two snippets match overlapping syntax, or a format issue causes re-parse divergence — workarounds hide the parser bug that will resurface elsewhere.

---

## Do not use `argument` for HTML attribute values

**MUST NOT:** Use the `argument` parser to parse values inside HTML `key="value"` syntax.
**MUST:** Use `key_values` for HTML attributes. Pull variable attributes into a single `[[placeholder]]`; leave fixed attributes in the literal text.
**Why:** `argument` is designed for positional shortcode arguments like `{{<figure image.png>}}`. It doesn't work inside HTML attribute context — not even with `forbidden_tokens` or `string_boundary`.

```yaml
# Correct — key_values for multiple variable attributes
snippet: |-
  <img [[img_attrs]] />
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

# Correct — key_values even for a single variable attribute
# Fixed attributes (type) stay in the literal text after the placeholder
snippet: |-
  <source [[source_attrs]] type="video/mp4">
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

# Broken — argument parser cannot parse HTML attribute values
snippet: '<img src="[[src]]" alt="[[alt]]" />'
params:
  src:
    parser: argument
    options:
      model:
        editor_key: src
        type: string
```

---

## `_cc_` snippets are deprioritized in matching (FYI)

**FYI:** Snippet types starting with `_cc_` are sorted after all user-defined snippets in the matching loop.
**Why this matters:** Your custom `_snippets` entries always get first chance to match. No need to worry about hidden catchall patterns (`_cc_*_unknown`) stealing matches from explicit configs — migrations without `_snippets_imports` typically never load them anyway.
