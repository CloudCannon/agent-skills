# CC-Friendly Conventions — shared rules

SSG-agnostic conventions for content that editors will change in CloudCannon. Scaffolding conventions per SSG live beside this file — Astro: [astro/cc-friendly-conventions.md](astro/cc-friendly-conventions.md).

## Shared data

Cross-page content (navigation, CTAs, testimonials, site settings) lives in data files rather than scattered across collection front matter, so it has one place to edit.

**Default to editable.** All user-facing text should be editable. Never leave common UI sections hardcoded without explicit justification from the customer. If an editor can see it on the page, they must be able to edit it.

### Shared-UI treatment table

Every site has most of these. For each row, the default treatment is non-negotiable unless you have a written technical reason not to — scan the repo for each one and either implement it or document the exception in `.cloudcannon/migration/visual-editing.md`.

| Section                             | Default treatment                         | Data file / approach                                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header / Navigation                 | data-file + component                     | A `navigation` data file with an `items[]` structure. **Hugo:** keep Hugo menus and edit them where they're defined — [configuration.md § Menus](../cloudcannon-configuration/hugo/configuration.md#menus) |
| Footer link columns                 | data-file + array                         | A `footer` data file — `columns[{heading, links[]}]`                                                                                                                                                       |
| Footer tip / credits / image credit | data-file                                 | The same `footer` data file, under `tip`, `credits`, `image_credit` keys                                                                                                                                   |
| CTA banner (above footer)           | data-file + `editable-component`          | A `cta` data file — `title`, `link`, `link_text`                                                                                                                                                           |
| Share block (post / project detail) | source editables OR a `sharing` data file | `data-editable="source"` on heading + description in the page template                                                                                                                                     |
| Author card                         | data-file                                 | An `authors` data file holding a top-level array, each item with a `slug`; front matter `author: <slug>`; `select` input with `values: data.authors` and `value_key: slug`                                 |
| Cookie banner / announcement bar    | data-file                                 | An `announcement` data file or similar                                                                                                                                                                     |

The SSG's guide says where data files live (Astro: `src/data/`; Hugo: `data/`).
