# Configuration (Hugo) — entry point

Hugo-specific configuration guidance. The cross-SSG rules live in the root files in the reading order below, starting with [`../configuration.md`](../configuration.md); the files here carry only what differs for Hugo.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

## Reading order

| Order | File                                                       | Read when                                                                                         |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1     | [../configuration.md](../configuration.md)                 | Always — the steps for writing config and the shared verification checklist                       |
| 2     | [../schemas.md](../schemas.md)                             | Before writing a collection's `schemas`                                                           |
| 3     | [configuration.md](configuration.md)                       | Always — CLI baseline fixes, collections, data, build settings and the Hugo checklist             |
| 4     | [../inputs.md](../inputs.md)                               | Before writing `_inputs`                                                                          |
| 5     | [../structures.md](../structures.md)                       | Any field holds an array or an object                                                             |
| 6     | [../collection-urls.md](../collection-urls.md)             | Any collection produces pages                                                                     |
| 7     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (`[full_slug]`, `_index.md`, page bundles)                          |
| 8     | [../build-commands.md](../build-commands.md)               | The build has steps besides `hugo`                                                                |
| 9     | [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating                                               |
| 10    | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only                               |
| 11    | [configuration-gotchas.md](configuration-gotchas.md)       | Hugo-only pitfalls — markdown rendering, rich text inputs, taxonomies, config files, routing keys |
