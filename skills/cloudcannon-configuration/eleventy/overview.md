# Configuration (Eleventy) — entry point

Eleventy-specific configuration guidance. The cross-SSG rules live in the root files in the reading order below, starting with [`../configuration.md`](../configuration.md); the files here carry only what differs for Eleventy.

> **Coverage: Partial.** The CLI baseline, routing, data and image rules come from Eleventy 3 builds and the CloudCannon CLI. A full migration hasn't yet been run end to end with these files.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

**Find the input directory first.** Eleventy reads templates from its input directory (`dir.input` in the config file, or `--input` in the build script; `.` when neither sets it). Every path in `cloudcannon.config.yml` starts with it: `src/blog`, `src/_data/nav.json`. The includes, layouts and data directories are relative to it (`src/_includes`, `src/_data` by default).

## Reading order

| Order | File                                                       | Read when                                                                                      |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1     | [../configuration.md](../configuration.md)                 | Always — the steps for writing config and the shared verification checklist                    |
| 2     | [../schemas.md](../schemas.md)                             | Before writing a collection's `schemas`                                                        |
| 3     | [configuration.md](configuration.md)                       | Always — CLI baseline fixes, collections, data files, images, build settings and the checklist |
| 4     | [../inputs.md](../inputs.md)                               | Before writing `_inputs`                                                                       |
| 5     | [../structures.md](../structures.md)                       | Any field holds an array or an object                                                          |
| 6     | [../collection-urls.md](../collection-urls.md)             | Any collection produces pages                                                                  |
| 7     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (default paths, `permalink`, directory data files, `--to=json`)  |
| 8     | [../build-commands.md](../build-commands.md)               | The build has steps besides Eleventy (Sass, Tailwind, Pagefind)                                |
| 9     | [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating                                            |
| 10    | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only                            |
| 11    | [configuration-gotchas.md](configuration-gotchas.md)       | Choosing `text`, `markdown` or `html` inputs — Liquid and Nunjucks escape output differently   |
