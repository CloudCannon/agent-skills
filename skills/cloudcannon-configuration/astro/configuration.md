# Configuration (Astro)

Read [../configuration.md](../configuration.md) first: it has the steps and the shared checklist. This file covers only what differs for Astro, and its [Verification checklist](#verification-checklist) adds the Astro items.

## Baseline generation with the CloudCannon CLI

```bash
npx @cloudcannon/cli configure generate --auto --initial-site-settings --ssg astro
```

## Review the generated config

| Key                                           | Rule                                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `collections_config`                          | Each collection's `path` matches a `base` directory in `content.config.ts`.                                                                                                                    |
| `paths`                                       | `static: public` (unless the site uses a different public directory), and `uploads: public/images` when the site has no precedent — see [Image path configuration](#image-path-configuration). |
| `node_version` (`initial-site-settings.json`) | The CLI can omit it even when `.nvmrc` exists, so apply the rule in [§ Build settings](#build-settings-cloudcannoninitial-site-settingsjson).                                                  |

### Build settings (`.cloudcannon/initial-site-settings.json`)

| Key                     | Value                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssg`                   | `"astro"`                                                                                                                                                                                                                    |
| `build.install_command` | From the detected package manager. Omit if none.                                                                                                                                                                             |
| `build.build_command`   | `npm run build` — the site's full build script, including every generator and post-build step. `"astro build"` only when there is no `build` script.                                                                         |
| `build.output_path`     | `"dist"`                                                                                                                                                                                                                     |
| `build.node_version`    | `"file"` if `.nvmrc` or `.node-version` exists (CC reads the version from the file automatically). Otherwise the major version from `package.json` `engines.node` (`">=18"` → `"18"`). Otherwise omit — CC uses its default. |

Put the pre-build steps the audit identified (theme generation, JSON generation, search indexing built from source content) in the `package.json` `build` script before `astro build`, and steps that read the built output (Pagefind and similar HTML indexers) after it — see [../build-commands.md](../build-commands.md).

## Customize the config

- **Map every Zod field:** cross-reference every field in the Zod schemas from the audit against `_inputs`, and give each user-facing field an input per [../configuration.md § Configure every field explicitly](../configuration.md#configure-every-field-explicitly).
- **String inputs:** a plain expression such as `<p>{description}</p>` (escaped) → `text` or `textarea`; `set:html={markdownify(description)}` or another markdown parser → `markdown`; `set:html={description}` with no parser → `html`.
- **`_snippets`:** these are usually MDX components in rich text content. Built-in templates such as `mdx_component` resolve automatically, with no `_snippets_imports` — see the `cloudcannon-snippets` skill.
- **Styled HTML in front matter:** how to convert it is in [content.md § Handling styled HTML in frontmatter](../../migrate-to-cloudcannon/astro/content.md#handling-styled-html-in-frontmatter).
- **Selects over a collection:** when the component looks entries up by Astro entry id or slug, use `value_key: filename_without_ext`, or a `slug` front matter key — see [../inputs.md § Select values from a collection](../inputs.md#select-values-from-a-collection).

### Schemas

Define the CloudCannon schemas as in [../schemas.md](../schemas.md), with each collection's `path` under `src/content/`. Then give the collection's Zod schema in `content.config.ts` one member per CloudCannon schema, combined in a union.

#### Zod: `z.union` vs `z.discriminatedUnion`

| When                                                                                                    | Use                                           | Why                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Page schemas have **required fields that differ between types** (each type has a unique required field) | `z.union([mostSpecific, ..., leastSpecific])` | First match wins — most-specific first ensures correct discrimination.                                                          |
| Page schemas have **many optional fields with defaults** (`.nullish()`, `[].default()`)                 | `z.discriminatedUnion("_schema", [...])`      | Matching by shape becomes unreliable when optional fields blur the boundaries. Discriminator field guarantees correct matching. |

```typescript
const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.union([
    landingSchema, // most specific first
    pageBuilderSchema,
    defaultPageSchema, // catch-all last
  ]),
});
```

## Consolidating single-file collections

Consolidate each single-file collection per [../configuration.md § Consolidate single-file collections](../configuration.md#consolidate-single-file-collections), with these strategies, applied in order:

### Strategy A: Merge simple pages into the `pages` collection

If a single-file collection uses the same schema as `pages` (e.g. an `about` or `contact` collection with standard title/description/image/body fields), merge it into the `pages` collection:

- Move the content file into the `pages` directory (e.g. `src/content/about/index.md` -> `src/content/pages/about.md`)
- Remove the separate collection from `content.config.ts` and `cloudcannon.config.yml`
- Update the page's rendering template in `src/pages/` to fetch from the `pages` collection instead
- The page still uses its own rendering template for routing

### Strategy B: Use `data_config` for reusable section data

If a page has data coming from a file separate from the content page, or a page has data that is consistent across the site (CTA, testimonials, etc.), extract it into JSON data files and configure `data_config` rather than trying to group it into a collection with the page:

- Move section data from `.md` frontmatter into `src/data/*.json` files
- Add `data_config` entries in `cloudcannon.config.yml` pointing to each JSON file
- Import the JSON directly in Astro components (no collection needed)
- Use `@data[key].field` syntax for editable regions (e.g. `data-prop="@data[call-to-action].title"`)

For pages with unique schemas (e.g. a homepage with `banner`/`features`), merge the page into the `pages` collection using a `z.union` in the Zod schema and CC schemas for the correct editor fields (see Fallback below).

### Fallback: Merge unique pages into `pages` with a union

When a page has a unique schema but no related files to justify a collection of its own, merge it into `pages` using the multi-schema pattern in [../schemas.md](../schemas.md) and [§ Schemas](#schemas). Each page type gets its own named Zod schema spreading `commonFields` plus its required fields, combined via `z.union` (or `z.discriminatedUnion` — see the decision table above).

```typescript
const pageSchema = z.object({ ...commonFields });
const contactPageSchema = z.object({ ...commonFields, name_label: z.string() /* ... */ });
const homepageSchema = z.object({
  ...commonFields,
  banner: z.object({
    /* ... */
  }),
  features: z.array(/* ... */),
});

const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "src/content/pages" }),
  schema: z.union([homepageSchema, contactPageSchema, pageSchema]),
});
```

**In templates**, narrow the union with an `in` check before accessing schema-specific fields: `if (!("banner" in data)) throw new Error(...)`. The page still uses its own rendering template in `src/pages/` — routing is independent of collection structure.

Every Zod schema in the union needs a matching CC schema in `.cloudcannon/schemas/` and a corresponding entry under the collection's `schemas` key in `cloudcannon.config.yml`.

## Splitting nested subdirectories into their own collections

When you split `src/content/pages/` subdirectories into collections, nothing changes on the Astro side: the content collection's glob loader already picks up all nested files, and the catch-all route uses `entry.id`, which includes the subdirectory path.

## Data config for shared data

Import a `data_config` file's JSON directly in Astro templates:

```astro
---
import callToActionData from "@/data/call-to-action.json";
---
<CallToAction call_to_action={callToActionData} />
```

For visual editing, use `@data[key].path` syntax in editable regions:

```astro
<h2 data-editable="text" data-prop="@data[call-to-action].title">
  {call_to_action.title}
</h2>
```

`data_config` makes a file a dataset; it doesn't put it in the sidebar or configure its inputs. For the collection that makes data files editable, see [../configuration-gotchas.md § Data files: editing and datasets are separate](../configuration-gotchas.md#data-files-editing-and-datasets-are-separate) and [§ Single `data` collection or split?](../configuration-gotchas.md#single-data-collection-or-split).

## Image path configuration

| Image type | Location      | How served                                              | Frontmatter path                                                                       | Config                                |
| ---------- | ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Static     | `public/`     | Plain `<img>`, served as-is                             | Relative to public root (`images/photo.jpg` or `/images/photo.jpg`) — NOT `public/...` | Global `paths.uploads`.               |
| Optimized  | `src/assets/` | Astro pipeline (`<Image>`, `<Picture>`, `astro:assets`) | Full repo-relative (`/src/assets/images/hero.jpg`)                                     | Per-input override with `static: ""`. |

Don't move images out of `src/assets/` into `public/` — if images are in `src/assets/`, the developer intended optimization.

Optimized image inputs need a per-input `static: ""` (empty string). Without it, CC strips the path prefix and `import.meta.glob` can't resolve the image.

### Global vs per-input paths

Set global paths for the common case (static) and override per-input for optimized fields:

```yaml
# Global: blog images, inline markdown images, general uploads
paths:
  static: public
  uploads: public/images

# Per-input: optimized image fields in page builder blocks, structured components
_inputs:
  image:
    type: image
    options:
      paths:
        uploads: /src/assets/images
        static: ""
```

Place the per-input override on image inputs that feed into `<Image>` or `<Picture>`. When all component images are optimized and only rich text / blog images are static, the global path handles the static case.

### Rich text / toolbar images

Blog post inline images inserted via markdown or the rich text toolbar use the global `paths.uploads` (`public/images`) — markdown `![](...)` produces plain `<img>`, which Astro does not optimize. If editors should not insert raw `<img>` (because all images should be optimized), disable the image toolbar button in `_editables` and offer optimized images only through structured inputs or snippets.

## Page building patterns

See [migrate-to-cloudcannon/page-building.md](../../migrate-to-cloudcannon/page-building.md) for content-backed pages and array-based page builders, then [its Astro file](../../migrate-to-cloudcannon/astro/page-building.md) for the catch-all route, BlockRenderer and CC collection config.

## Verification checklist

**MUST:** complete the [shared checklist](../configuration.md#verification-checklist) first, then these Astro items. One check per line.

### Blocking gates

- [ ] **MDX gate:** if any `.mdx` file uses JSX components (`rg '<[A-Z]' -g '*.mdx' src/content`), the [MDX setup pipeline](../../cloudcannon-snippets/astro/overview.md#mdx-setup-pipeline-must-complete-all-four) is fully complete. `_snippets` alone is not enough — component resolution without content imports (`astro-auto-import`, or a shared `components` map passed at every render site) and `import` removal are both required. #1 source of migration regressions.

### Files

- [ ] `.cloudcannon/initial-site-settings.json` has `"ssg": "astro"`
- [ ] `node_version` set: `"file"` when `.nvmrc`/`.node-version` exists; major version from `package.json` `engines.node` otherwise
- [ ] The `package.json` `build` script passes [build-commands.md § Checks](../build-commands.md#checks)

### Images

- [ ] If the site has both optimized (`src/assets/`) and static (`public/`) images, global paths target static and per-input overrides target optimized — see [§ Image path configuration](#image-path-configuration)

### Snippets

- [ ] Every MDX component has a `_snippets` entry OR the file uses `_enabled_editors: [source, data]` with rationale in migration notes — see [cloudcannon-snippets/astro/overview.md § Every MDX component must be accounted for](../../cloudcannon-snippets/astro/overview.md#every-mdx-component-must-be-accounted-for)
- [ ] MDX files with `import` statements have them removed, and components resolve via `astro-auto-import` or a shared `components` map passed at every `<Content />` / `render()` site — see [astro/overview.md § Auto-import](../../cloudcannon-snippets/astro/overview.md#auto-import-keeping-import-statements-out-of-content)

### Content specifics

- [ ] Styled HTML and `<br />` lists in front matter are handled per [content.md § Handling styled HTML in frontmatter](../../migrate-to-cloudcannon/astro/content.md#handling-styled-html-in-frontmatter)
- [ ] When an array data file's items each correspond to a page route, the route is a single dynamic `[slug].astro` with `getStaticPaths` reading the data file — not one hardcoded `.astro` per known slug.

### Schemas

- [ ] Every Zod schema field has an `_inputs` entry

For Astro-only pitfalls, see [configuration-gotchas.md](configuration-gotchas.md).
