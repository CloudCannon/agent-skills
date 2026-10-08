# Schemas

Read before writing a collection's `schemas`. A schema is a file template — usually front matter, but it can include body content, and in a data collection it's a whole data file. It gives new files their starting content, and it decides which fields an existing file shows in the editor. What differs per SSG is in that SSG's `configuration.md`.

## Give editors a schema to add files from

Define at least one schema for every collection where editors add files.

**Why:** without a schema, **+ Add** builds new files from an existing file in the collection with its values cleared, so a new file inherits whatever fields that file happened to have. An empty collection can't create a file at all.

## One collection, many schemas

Give one collection several schemas when its files need different fields. Don't create a collection just to get a new schema. A `pages` collection can hold a markdown page, a page-builder page and a landing page side by side; editors pick the schema when they create a file.

```yaml
collections_config:
  pages:
    path: content/pages
    url: "/[slug]/"
    schemas:
      default:
        path: .cloudcannon/schemas/page.md
        name: Page (markdown body)
      page_builder:
        path: .cloudcannon/schemas/page-builder.md
        name: Page Builder
      landing:
        path: .cloudcannon/schemas/landing.md
        name: Landing Page
```

## Schema files

Put schema files in `.cloudcannon/schemas/`, in the same format as the collection's files: the same front matter delimiters (`---` YAML, `+++` TOML) for content files, or the same file type for data files.

- **Include** every field a template reads, with a representative empty value — `content_blocks: []` for a page-builder page.
- **List** the front matter keys in use across the collection with the recipe in [configuration-gotchas.md § An `_inputs` key that names no field is ignored](configuration-gotchas.md#an-_inputs-key-that-names-no-field-is-ignored), and diff them against each schema file.

A data collection's schemas are data files of the same type:

```yaml
collections_config:
  people:
    path: data/people
    schemas:
      staff:
        path: .cloudcannon/schemas/staff.json
        name: Staff Member
      author:
        path: .cloudcannon/schemas/author.json
        name: Author
```

## Set `_schema` on every file

Set `_schema: <key>` in every file in a collection that has schemas — in the front matter, or at the top level of a data file — and hide it in `_inputs`.

**Why:** CloudCannon's matching of a file to a schema by its shape is unreliable. A file matched to the wrong schema shows the wrong fields, and loses the keys that schema lacks (see below).

```markdown
---
_schema: default
title: About us
---
```

```yaml
_inputs:
  _schema:
    hidden: true
```

### Index pages

An index file whose front matter differs from the collection's items, such as `blog/index.md` with a hero and intro beside `blog/post-1.md`, is a common reason for a second schema. Give it one when its fields differ; when they match the items, it uses the items' schema.

```yaml
blog:
  path: content/blog
  url: "/blog/[slug]/"
  schemas:
    default:
      path: .cloudcannon/schemas/post.md
      name: Blog Post
    blog_index:
      path: .cloudcannon/schemas/blog-index.md
      name: Blog Index
```

The index file's URL needs no special handling: `[slug]` is empty for a file named `index` — see [collection-urls.md § Fixed placeholders](collection-urls.md#fixed-placeholders).

## Keep every key in the schema

**MUST:** put every key that any file in the collection uses into the schema that file uses, or set `remove_extra_inputs: false` on that schema.
**Why:** `remove_extra_inputs` defaults to `true`. Keys missing from the schema, nested keys included, are hidden when the file loads and removed from the file when it's saved. An edit to one field can delete data the templates still read, and nothing reports an error. A key hidden in `_inputs` is kept; a key missing from the schema isn't.

```yaml
collections_config:
  blog:
    schemas:
      default:
        path: .cloudcannon/schemas/post.md
        remove_extra_inputs: false
```

The same first edit also writes every schema key with its default — see [configuration-gotchas.md § The first edit writes every schema key](configuration-gotchas.md#the-first-edit-writes-every-schema-key).
