# Snippets (SvelteKit) — entry point

SvelteKit-specific snippet guidance: Svelte components in mdsvex bodies. The cross-SSG model — the SSG layer vs the CloudCannon layer, `_snippets` properties, toolbar setup, raw HTML snippets — is in [../snippets.md](../snippets.md). Read that first.

## Which path the site is on

| Content is…                                                 | Snippet work                                                                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown rendered to HTML in a `load` (`marked`, `unified`) | Root guidance only — raw HTML snippets per [../snippets.md](../snippets.md#raw-snippets-for-inline-html-in-md-files), including the renderer check |
| mdsvex files (`mdsvex` in `svelte.config.js` `preprocess`)  | [§ mdsvex](#mdsvex), then [§ Components to snippets](#components-to-snippets)                                                                      |

## mdsvex

mdsvex compiles each markdown file into a Svelte component. A component tag in a body must be imported in a `<script>` block in that file, and mdsvex has no shared components map. Apply [../snippets.md § No imports in content, one shared components map](../snippets.md#no-imports-in-content-one-shared-components-map) with a remark plugin in `svelte.config.js` that adds the imports to every file:

```js
// svelte.config.js
import { mdsvex } from "mdsvex";

// Components content may use, by tag name.
const contentComponents = {
  Callout: "$lib/components/Callout.svelte",
  YouTube: "$lib/components/YouTube.svelte",
};

function importContentComponents() {
  const imports = Object.entries(contentComponents)
    .map(([name, path]) => `import ${name} from "${path}";`)
    .join("\n");
  return (tree) => {
    const at = tree.children[0]?.type === "yaml" ? 1 : 0;
    tree.children.splice(at, 0, { type: "html", value: `<script>\n${imports}\n</script>` });
  };
}

export default {
  extensions: [".svelte", ".md"],
  preprocess: [mdsvex({ extensions: [".md"], remarkPlugins: [importContentComponents] })],
};
```

Keep the site's own mdsvex options and plugins, and add `importContentComponents` to its `remarkPlugins`.

- [ ] Add each component used in content to `contentComponents`
- [ ] Delete the `<script>` block from every content file. A file that keeps one fails the build: a component can have only one top-level `<script>`
- [ ] Run the build; a tag missing from the map fails that page's prerender with `<Name> is not defined`

**MUST NOT:** let body text hold `{` or `}` outside code. mdsvex compiles the body as Svelte, so `{name}` in a paragraph is an expression, and the page fails to prerender with `name is not defined`. An HTML entity (`&#123;`) fails the same way. Braces inside inline code and code fences are safe. Tell editors in the Editor README → [cloudcannon-configuration/configuration.md § Editor README](../../cloudcannon-configuration/configuration.md#editor-readme).

## Components to snippets

Every component tag in content needs a `_snippets` entry or a source-and-data-only file — see [../snippets.md § Every component must be accounted for](../snippets.md#every-component-must-be-accounted-for).

Svelte component tags in mdsvex bodies use the same syntax as MDX components, so the built-in MDX templates fit — see [../template-based.md § MDX templates](../template-based.md#mdx-templates).

| Content shape                             | Configure with                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Self-closing, string props                | `mdx_component`                                                                                                           |
| Wraps content                             | `mdx_paired_component`                                                                                                    |
| `{expression}` props, non-standard syntax | Move the expression into the component, or a raw snippet — see [../raw.md](../raw.md)                                     |
| Nested tree (`<Tabs><Tab>…</Tab></Tabs>`) | One raw snippet with the `repeating` parser — see [../raw.md](../raw.md#repeating--repeat-a-child-pattern-as-array-items) |

List the component names content uses with [../snippets.md § Component inventory grep](../snippets.md#component-inventory-grep), with `-g '*.md'` and every other extension the site's mdsvex config lists (`*.svx`).

## Verification

- [ ] Every name from the grep has a `_snippets` entry, or its file is limited to source and data editing with the reason recorded
- [ ] No `<script>` block remains in any content file
- [ ] Every component in content is in `contentComponents`
- [ ] `snippet: true` is in `_editables.content` — see [../snippets.md § Enabling snippets in the toolbar](../snippets.md#enabling-snippets-in-the-toolbar)
- [ ] The build passes
- [ ] One content file per snippet type opened in the Content Editor, edited and saved; the diff touches only the edited value
