# Configuration (Hugo) — entry point

Hugo-specific configuration guidance. The cross-SSG rules live one level up: [`../SKILL.md`](../SKILL.md) owns the CloudCannon CLI, Collections, Inputs, Structures and Select Data, and [`../configuration-gotchas.md`](../configuration-gotchas.md) owns the cross-SSG pitfalls. The files here carry only what differs for Hugo.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

## Reading order

| Order | File                                                       | Read when                                                                      |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | [configuration.md](configuration.md)                       | Always — the Phase 2 workflow: CLI baseline, collections, data, build settings |
| 2     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (`[full_slug]`, `_index.md`, page bundles)       |
| 3     | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only            |
| 4     | [configuration-gotchas.md](configuration-gotchas.md)       | Hugo-only pitfalls — markdown rendering, taxonomies, front matter formats      |

## Cross-SSG deep-dives

| File                                                       | Covers                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| [../structures.md](../structures.md)                       | Structures — inline vs split, previews, field completeness |
| [../collection-urls.md](../collection-urls.md)             | URL placeholders, filters, troubleshooting                 |
| [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | CloudCannon CLI commands and options                       |
| [../build-commands.md](../build-commands.md)               | Build and install commands — where each build step goes    |
