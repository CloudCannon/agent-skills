# Input validation

Read before adding `required`, a `pattern` or a limit to an input. Validation keys go in the input's `options`. A field that breaks a rule shows an error beside it, and the file can't be saved until it's fixed. Hidden and disabled inputs skip validation.

## When to validate

Add a rule where a bad value breaks the site or its build, not to enforce style:

| Field                                                                 | Rule                                                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Digits that must stay a string: postcodes, phone numbers, IDs         | `type: text` with a `pattern` — see [§ Numbers kept as strings](#numbers-kept-as-strings) |
| A slug or other value that ends up in a URL                           | `pattern: '^[a-z0-9-]+$'`                                                                 |
| A field the template renders with no fallback                         | `required: true`                                                                          |
| An array whose layout assumes a count (a three-card grid, `items[0]`) | `min_items` / `max_items`                                                                 |
| A list of references that must not repeat                             | `unique_on`                                                                               |
| An SEO title or description the site limits                           | `max_length`                                                                              |
| A field the site's own schema constrains, such as a Zod schema        | The matching keys — the mapping is in the SSG's `configuration.md`                        |

## Keys by input type

| Input type                                                               | Keys                                                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `text`, `textarea`, `markdown`, `html`, `code`, `color`, `url`, `select` | `required`, `pattern`, `pattern_flags`, `min_length` / `max_length`, `min_words` / `max_words`, `min_graphemes` / `max_graphemes`       |
| `file`, `image`, `document`                                              | The text keys, plus `max_file_size` in kB                                                                                               |
| `number`, `range`                                                        | `required`, `min`, `max`, `step`                                                                                                        |
| `date`, `datetime`                                                       | `required`, `start_from` (inclusive), `end_before` (exclusive), as ISO 8601                                                             |
| `time`, `object`                                                         | `required`                                                                                                                              |
| `array`, `multiselect`, `multichoice`                                    | `required`, `min_items` / `max_items`, `unique_on` — a JSON Path: `'$'` for an array of primitives, `'$.path'` for a key on each object |

On a `select`, `pattern` and the length keys need `allow_create: true`. Every key has a `<key>_message` that replaces the default error.

## Patterns

**MUST:** anchor every pattern with `^…$`, and set `pattern_message`.
**Why:** a pattern matches anywhere in the value, so `[0-9]+` accepts `abc1`. The default error prints the raw regex to editors.

```yaml
_inputs:
  slug:
    type: text
    options:
      pattern: "^[a-z0-9-]+$"
      pattern_message: Lowercase letters, numbers and hyphens only
```

- **Empty values:** an empty field fails a pattern. An optional field needs a pattern that matches empty, such as `'^[0-9]*$'`.
- **Syntax:** patterns are JavaScript regular expressions, so lookaheads work. Set flags with `pattern_flags` (`ignore_case: true`).
- **Quoting:** wrap the pattern in single quotes in YAML, so a `\` stays literal (`'^\d+$'`).

## Numbers kept as strings

Use a `text` input with a digits-only pattern for a value that must stay a string: a postcode with a leading zero, a phone number, an ID. A `number` input writes a number and drops leading zeros. A `text` input writes new values quoted (`postcode: '0123'`).

```yaml
_inputs:
  postcode:
    type: text
    options:
      pattern: "^[0-9]+$"
      pattern_message: Numbers only
```

Quote the values already in the content first — see [configuration-gotchas.md § Quote numeric values that map to text inputs](configuration-gotchas.md#quote-numeric-values-that-map-to-text-inputs).

## Check existing content before adding a rule

**MUST:** check the field's current values against a new rule, and fix the content or loosen the rule before keeping it.
**Why:** a value that already breaks a rule shows the error as soon as the file opens, and no change to that file can be saved until an editor fixes it.

```bash
# Current values of one front matter key across a collection (YAML front matter)
grep -rhE '^\s*<key>:' <collection dir> | sort | uniq -c
```
