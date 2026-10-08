# Inputs: where they live and what they match

Read before writing `_inputs`. This covers where an input can be defined, how its key finds a field, and what a select over a collection stores. The pitfalls are in [configuration-gotchas.md § Inputs](configuration-gotchas.md#inputs).

## Where `_inputs` live

`_inputs` can be set at each level of the configuration cascade. Levels are listed least to most specific:

| Level           | Where                                                             | Covers                                |
| --------------- | ----------------------------------------------------------------- | ------------------------------------- |
| Global          | `_inputs` at the config root                                      | Every file                            |
| Collection      | `collections_config.<name>._inputs`                               | Files in that collection              |
| Schema          | `collections_config.<name>.schemas.<schema>._inputs`              | Files using that schema               |
| File config     | `file_config[]._inputs`                                           | Files matching the entry's `glob`     |
| In file         | `_inputs` in a file's front matter, or at the root of a data file | That file                             |
| Structure value | `_structures.<name>.values[]._inputs`                             | Items added from that structure value |

`_inputs` from every level that covers a field merge into one input. Where two levels configure the same key, the more specific one wins. Merging is specific to `_inputs`: most other cascading options use the most specific level that sets them.

**Scope each input as narrowly as its fields need.** A broad input reaches every field with that key name: a global `type: html` on `description`, or `hidden` on `url`, also changes fields in data files, config files and structures that mean something else. Set it at a broader level when one input should cover the same field across several files, and you've checked that every field the key matches should get it. Fields inside a structure are the exception: define their inputs on the structure value even when a broader key already reaches them.

- **Global:** keys that mean the same thing everywhere on the site.
- **Collection or schema:** keys specific to one kind of content.
- **File config:** data and config files, and anything that needs the file root (`$`).
- **Structure value:** the fields of a structure. Inputs from outside a structure value reach into it today, but that could change. Defining them on the structure value keeps it portable, behaving the same wherever it is used, and easier to maintain, usually for little extra config: share a definition with `_inputs_from_glob` or a YAML alias.

## How a key matches a field

| Key                | Matches                                                                      | Use for                                                                 |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `title`            | `title` at any depth                                                         | Keys that mean the same thing wherever they appear                      |
| `menu.main.weight` | That path only; beats a plain `weight`                                       | Scoping a short, common name that means different things                |
| `features[*]`      | Each item of the `features` array                                            | The item type of an array of primitives (`features[*]: { type: text }`) |
| `$`                | The root of the file or structure value                                      | Top-level arrays and objects in data files                              |
| `$.title`          | `title` at the root of each file **and** at the root of each structure value | Root-level keys whose name nested fields also use                       |
| `$[*]`             | Each item of a top-level array                                               | The item type of a top-level array of primitives                        |

An array of objects takes a structure, with the item preview on the structure value, never a `[*]` input — see [configuration-gotchas.md § Array item previews](configuration-gotchas.md#array-item-previews---vs-structure-value).

## The file root

`$` is the root of the file. It is mostly used in `file_config`, for data and config files whose root is an array or an object with no key name to match.

A top-level array of objects gets a structure, like any other array of objects:

```yaml
file_config:
  - glob: data/offices.json
    _inputs:
      $:
        type: array
        options:
          structures: _structures.offices
```

A top-level array of primitives sets its item type with `$[*]`:

```yaml
file_config:
  - glob: data/tags.yaml
    _inputs:
      $:
        type: array
        label: Tags
      $[*]:
        type: text
        label: Tag
```

A top-level object can take a preview icon, which gives each data file its own icon in the sidebar:

```yaml
file_config:
  - glob: data/footer.yaml
    _inputs:
      $:
        type: object
        options:
          preview:
            icon: bottom_navigation
```

`$.key` also works in `collections_config.<name>._inputs`. `$.title` matches each file's root `title` and the `title` at the root of every structure value, so it does not separate a page title from a block's title; don't give it a page-specific label. To give block titles their own input, define `title` in that structure value's `_inputs`.

## Select values from a collection

Read when a `select` or `multiselect` takes its values from a collection (`values: collections.posts`). `value_key` decides what is stored in the file:

| `value_key`                            | Stored value                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| omitted                                | The default checks `id`, `uuid`, `path`, `title` and `name` in that order, so it usually stores the file path, such as `/content/posts/my-post.md` |
| `filename_without_ext`                 | `my-post`                                                                                                                                          |
| `filename`                             | `my-post.md`                                                                                                                                       |
| `url`                                  | The file's collection URL                                                                                                                          |
| any front matter key (`title`, `slug`) | That key's value                                                                                                                                   |

Match the stored value to how the template looks the entry up: `filename_without_ext` or a `slug` key when it finds the entry by file name or slug.
