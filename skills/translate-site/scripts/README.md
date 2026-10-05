# Translation Scripts

The mechanical half of translation — classification, translation memory, merging, validation — automated so the AI only does the translating. Each part of the skill is a prepare → translate → merge loop; these scripts are the first and last step of each.

Run them with `node` from the project root. In the paths below, `<skills-dir>` is wherever the skills are installed — `.agents/skills/`, `.cursor/skills/`, or a plugin directory. Every script supports `--help`.

## Part 1: Rosey locale files

### `prepare-translation.mjs`

Reads `rosey/locales/<code>.json`, classifies every entry as untranslated / stale / current, and writes a slim task file containing only the work. Builds a translation memory from already-translated entries and auto-applies exact matches straight back to the locale file, then picks tone/register examples for the AI to match.

```bash
node <skills-dir>/translate-site/scripts/prepare-translation.mjs --locale fr
```

| Flag                  | Meaning                              |
| --------------------- | ------------------------------------ |
| `-l, --locale <code>` | Locale code (required)               |
| `-s, --source <dir>`  | Rosey directory (default: `rosey`)   |
| `-o, --output <path>` | Task file output path                |
| `-e, --examples <n>`  | Number of tone examples (default: 5) |

### `merge-translation.mjs`

Merges the `value` fields from the task file back into the full locale file, sets `original = _base_original` on stale entries to clear the stale flag, and validates that HTML in translated values still matches the original. An entry merged with `value` equal to its original is recorded in `<source>/translate-site-keep.json`, which `prepare-translation.mjs` reads so it isn't offered again until its original changes. Commit that file.

```bash
node <skills-dir>/translate-site/scripts/merge-translation.mjs --locale fr
```

| Flag                  | Meaning                            |
| --------------------- | ---------------------------------- |
| `-l, --locale <code>` | Locale code (required)             |
| `-s, --source <dir>`  | Rosey directory (default: `rosey`) |
| `-i, --input <path>`  | Task file path                     |
| `--dry-run`           | Print changes without writing      |

## Part 2: Split-by-directory content collections

### `prepare-content-translation.mjs`

Compares every file under a locale content directory (subfolders included) against the source file at the same relative path, and writes a task manifest of the files needing translation: translatable frontmatter by path (`content_blocks.0.title`), body content, and any frontmatter it can't read safely under `manual_frontmatter`. The manifest goes in the working directory as `.translation-task-<locale>-content-<locale-dir>.json`, so runs on different directories don't overwrite each other.

```bash
node <skills-dir>/translate-site/scripts/prepare-content-translation.mjs \
  --source-dir src/content/blog \
  --locale-dir src/content/blog_fr \
  --locale fr
```

| Flag                  | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `--source-dir <dir>`  | Source content directory (e.g. `src/content/blog`)    |
| `--locale-dir <dir>`  | Locale content directory (e.g. `src/content/blog_fr`) |
| `-l, --locale <code>` | Locale code (required)                                |
| `-o, --output <path>` | Task manifest output path                             |

### `merge-content-translation.mjs`

Replaces each translated field's lines in the YAML and the body, then reads the frontmatter back. A file whose translated fields don't read back exactly, or whose other fields changed, is left unchanged with a warning, and the manifest is kept. Otherwise the manifest is deleted.

```bash
node <skills-dir>/translate-site/scripts/merge-content-translation.mjs \
  --input .translation-task-fr-content-src-content-blog_fr.json
```

| Flag                 | Meaning                       |
| -------------------- | ----------------------------- |
| `-i, --input <path>` | Task manifest path (required) |
| `--dry-run`          | Print changes without writing |

## Shared

### `frontmatter.mjs`

The YAML frontmatter scanner both Part 2 scripts use. It has no dependencies, so the scripts run from the skills directory with nothing installed. It reads block mappings and sequences, plain and quoted scalars (including quoted values over several lines) and `|` / `>` block scalars, and reports anything else (anchors, aliases, `|+`) as unsupported rather than guessing.
