# Snippets (Astro) — entry point

Guidance for configuring CloudCannon snippets for MDX components in an Astro site. Read the cross-SSG [snippets overview](../snippets.md) first for CC snippet concepts and reference. This page complements that overview’s template-based vs raw discussion by focusing on the **Astro + MDX** stack (content shape, auto-import, and Astro-specific raw patterns such as `client:load`).

## When this doc applies (MDX path)

This workflow assumes editors use **MDX component tags** in content. Concretely:

- MDX integration (`@astrojs/mdx`) installed and registered in `astro.config.mjs`
- Content files that use those components are `.mdx` (not `.md`)

**Agent discretion:** A site may start as Markdown-only. Either refactor toward the bullets above—install MDX, register it, convert or rename affected entries to `.mdx`—when built-in `mdx_*` templates and auto-import are simpler than a large raw-snippet surface, or keep `.md` and rely on **raw** snippets per [raw.md](../raw.md) and [Which approach?](../snippets.md#which-approach) in the overview. Raw snippets offer maximum flexibility and literal syntax control; the MDX + template path is often less complicated for standard props and paired content, at the cost of format and build setup.

## MDX setup pipeline (must complete all four)

Steps 1–3 meet [../snippets.md § No imports in content](../snippets.md#no-imports-in-content-one-shared-components-map). `astro-auto-import` is the default route — one integration config that applies to every MDX render. Where it can't be installed, a [shared `components` map](#alternative-components-prop) satisfies steps 1–2 instead.

| #   | Step                                                                                                                              | File                     | Skip = broken                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------ |
| 1   | Check `astro-auto-import`'s `peerDependencies.astro` range against the site's Astro version, then `npm install astro-auto-import` | `package.json`           | `import` statements leak into editor |
| 2   | Register `AutoImport({ imports: [...] })` **before** `mdx()`                                                                      | `astro.config.mjs`       | Components not resolved at build     |
| 3   | Delete `import` lines from all `.mdx` content files                                                                               | `src/content/**/*.mdx`   | Raw imports shown to editors         |
| 4   | Add `_snippets` entries (or raw snippet) for every JSX tag                                                                        | `cloudcannon.config.yml` | Components shown as broken in editor |

All four are mandatory. Steps 1+2 without 4 = editor still can't insert/parse the components. Step 4 without 1+2 = build fails. Verify at the end with the [component inventory grep](../snippets.md#component-inventory-grep).

## Auto-import: keeping import statements out of content

Astro content uses an auto-import mechanism so components are available without `import` lines, per [../snippets.md § No imports in content](../snippets.md#no-imports-in-content-one-shared-components-map).

### `astro-auto-import`

The default approach. This Astro integration injects imports into MDX files at build time.

Before installing, compare the package's `peerDependencies.astro` range (`npm view astro-auto-import peerDependencies`) with the site's Astro version. If the range excludes it, use the [`components` map](#alternative-components-prop) instead of forcing the install.

```bash
npm install astro-auto-import
```

In `astro.config.mjs`, register it **before** the `mdx()` integration:

```javascript
import AutoImport from "astro-auto-import";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [
    AutoImport({
      imports: ["@/shortcodes/Button", "@/shortcodes/Notice", "@/shortcodes/Youtube"],
    }),
    mdx(),
  ],
});
```

Each entry maps a module to a default import. The component is available in MDX by its filename (e.g. `Button`, `Notice`). Named exports use object syntax:

```javascript
imports: [{ "astro-embed": ["Tweet", "YouTube"] }];
```

### Alternative: `components` prop

Pass components explicitly when rendering content. Use this when the auto-import package can't be installed (its peer range excludes the site's Astro version) or fails to resolve components (path alias issues, pnpm hoisting).

Define one shared components map in a single file and pass it at every `<Content />` / `render()` site, per [../snippets.md § No imports in content](../snippets.md#no-imports-in-content-one-shared-components-map):

```ts
// src/components/mdx-components.ts
import Button from "@/shortcodes/Button.astro";
import Notice from "@/shortcodes/Notice.astro";
export const mdxComponents = { Button, Notice };
```

```astro
---
import { render } from "astro:content";
import { mdxComponents } from "@/components/mdx-components";
const { Content } = await render(entry);
---
<Content components={mdxComponents} />
```

List every render site with `rg '<Content|render\(' src`.

## Built-in templates for Astro

Astro MDX files use standard MDX component syntax. The built-in `mdx_component` and `mdx_paired_component` templates match JSX/MDX syntax and resolve automatically when referenced by name in `_snippets`.

## Workflow: from component to snippet config

For each component used in MDX content:

1. **Find the component source** — check the auto-import config or shortcodes directory
2. **Read its props** — look at the TypeScript interface or function parameters
3. **Check how it's used in content** — self-closing or wrapping content? Uses `client:load`?
4. **Choose the approach** — see table below
5. **Write the snippet config** — map props to named_args/models, add `_inputs` for good editor UX
6. **Add `_inputs` for constrained values** — use `select` for props with known options, `url` for links, etc.

| Content shape                             | Approach                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| No `client:load` + self-closing           | `mdx_component` template                                                                                    |
| No `client:load` + wraps content          | `mdx_paired_component` template                                                                             |
| Has `client:load` (any directive)         | Raw snippet — templates can't output directives                                                             |
| Nested tree (`<Tabs><Tab>…</Tab></Tabs>`) | Single raw snippet with `repeating` parser. See [§ Nested components](#nested-components-repeating-parser). |

## Handling `client:load` directives

Astro's `client:load`, `client:idle`, `client:visible` directives trigger client-side hydration for interactive components. The MDX templates (`mdx_component`, `mdx_paired_component`) don't output these directives — they produce plain `<Component />` syntax.

Use raw snippet syntax to include the directive as literal text.

For raw `key_values` on MDX attributes, include `format` with `root_value_delimiter` and `string_boundary` whenever you use normal `prop="value"` (or similar) syntax — optional in schema, required in practice. See [raw.md — `key_values`](../raw.md#key_values--keyvalue-pairs).

### Self-closing with `client:load`

```yaml
youtube:
  snippet: "<Youtube client:load [[named_args]] />"
  inline: false
  preview:
    text: YouTube Video
    icon: play_circle
  params:
    named_args:
      parser: key_values
      options:
        models:
          - editor_key: id
            type: string
          - editor_key: title
            type: string
        format:
          root_value_delimiter: "="
          string_boundary:
            - '"'
  _inputs:
    id:
      type: text
      comment: YouTube video ID
```

### Paired with `client:load`

```yaml
accordion:
  snippet: "<Accordion client:load [[named_args]]>[[inner_content]]</Accordion>"
  inline: false
  preview:
    text: Accordion
    icon: expand_more
  params:
    named_args:
      parser: key_values
      options:
        models:
          - editor_key: title
            type: string
        format:
          root_value_delimiter: "="
          string_boundary:
            - '"'
    inner_content:
      parser: content
      options:
        editor_key: inner_content
```

The directive appears literally in the `snippet` string outside any `[[placeholder]]`, so it's preserved as-is during parsing and re-serialization.

### Custom template for multiple `client:load` components

If several components all need `client:load`, define a custom template to avoid repetition:

```yaml
_snippets_templates:
  astro_client_component:
    snippet: "<[[component_name]] client:load [[named_args]] />"
    params:
      component_name:
        parser: literal
        options:
          literal:
            ref: component_name
      named_args:
        parser: key_values
        options:
          models:
            ref: named_args
          format:
            root_value_delimiter: "="
            string_boundary:
              - '"'
```

Then individual snippets inherit from it:

```yaml
_snippets:
  youtube:
    template: astro_client_component
    definitions:
      component_name: Youtube
      named_args:
        - editor_key: id
          type: string
        - editor_key: title
          type: string
```

## Nested components (repeating parser)

For nested patterns like `<Tabs><Tab>...</Tab></Tabs>`, use a single snippet with the `repeating` parser. See [raw.md § repeating](../raw.md#repeating--repeat-a-child-pattern-as-array-items) for the full parser reference. Do NOT define the child as a separate `_snippets` entry — it would match standalone and steal content from the parent.

**Astro-specific note:** Tabs components typically need `client:load` on the parent element. Include this in the snippet template string:

```yaml
_structures:
  tab_items:
    values:
      - label: Tab
        icon: tab
        preview:
          text: [{ key: name }, Tab]
          icon: [tab]
        _inputs:
          name:
            type: text
          tab_content:
            type: markdown
            options:
              bold: true
              italic: true
              link: true
              bulletedlist: true
              numberedlist: true
        value:
          name: ""
          tab_content: ""

_snippets:
  tabs:
    snippet: "<Tabs client:load>[[repeating_tabs]]</Tabs>"
    inline: false
    preview:
      text: Tabs
      icon: tab
    _inputs:
      tab_items:
        type: array
        options:
          structures: _structures.tab_items
    params:
      repeating_tabs:
        parser: repeating
        options:
          snippet: "<Tab [[named_args]]>[[tab_content]]</Tab>"
          editor_key: tab_items
          default_length: 2
          style:
            output: block
            between: "\n\n"
            block:
              leading: "\n\n"
              trailing: "\n\n"
      named_args:
        parser: key_values
        options:
          models:
            - editor_key: name
              type: string
          format:
            root_value_delimiter: "="
            string_boundary:
              - '"'
      tab_content:
        parser: content
        options:
          editor_key: tab_content
          style:
            block:
              leading: "\n\n"
              trailing: "\n\n"
```

Configure the repeating parser's `editor_key` (`tab_items`) as an array input with a structure. Put the item preview and the inputs for each item's fields on the structure value, as for any array of objects.

## Every MDX component must be accounted for

Apply [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for), then run [the component inventory grep](../snippets.md#component-inventory-grep). Astro components with `client:load` need a raw snippet, since the directive appears literally — see [§ Handling `client:load` directives](#handling-clientload-directives).

## Verification

After adding snippet configs:

- [ ] MDX setup pipeline (steps 1–4) complete — see [table above](#mdx-setup-pipeline-must-complete-all-four)
- [ ] Component inventory grep returns zero unconfigured names — see [../snippets.md § Component inventory grep](../snippets.md#component-inventory-grep)
- [ ] No `^import ` lines remain in any `.mdx` content file
- [ ] `_snippets` entries exist in `cloudcannon.config.yml` (no `_snippets_imports` needed — built-in templates resolve automatically)
- [ ] Every component used in MDX content has a corresponding `_snippets` entry, or the file uses `_enabled_editors: [data]` only as a last resort with rationale in migration notes
- [ ] Components with `client:load` use raw snippet syntax, not templates
- [ ] `_inputs` are configured for constrained values (select dropdowns, url inputs, etc.)
- [ ] `astro build` passes cleanly
- [ ] Components in existing `.mdx` files should round-trip correctly (CC parses and re-serializes without losing attributes)

## Common mistakes

| Mistake                                                                  | Correct                                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Adding `_snippets` entries without `astro-auto-import`                   | Steps 1–4 in the [MDX setup pipeline](#mdx-setup-pipeline-must-complete-all-four) are all required                                |
| Skipping `<Image>` from `astro:assets` because "it's a layout component" | Every JSX tag in `.mdx` must have a `_snippets` entry — layout isn't an exemption                                                 |
| Leaving `import` lines at the top of `.mdx` content files                | Delete them; let `AutoImport` inject them. Editors shouldn't see raw imports.                                                     |
| Registering `AutoImport` after `mdx()` in `astro.config.mjs`             | Order matters — `AutoImport` must come earlier in the `integrations` array                                                        |
| "I'll configure the common ones now and add the rest later"              | Run the [component inventory grep](../snippets.md#component-inventory-grep); unconfigured components show as broken in the editor |
