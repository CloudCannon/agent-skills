# Configuration (Next.js) — entry point

> **Coverage: Partial.** Static export (`output: "export"`) with the App Router only.

Next.js-specific configuration guidance. The cross-SSG rules live in the root files in the reading order below, starting with [`../configuration.md`](../configuration.md); the files here carry only what differs for Next.js.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

**Find where content lives first.** Next.js has no content or data directory. Read the code that loads content (`node:fs` reads, a content library, JSON `import`s) and the `app/` (or `src/app/`) routes that render it. Every collection `path` comes from there.

## Reading order

| Order | File                                                       | Read when                                                                                                 |
| ----- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1     | [../configuration.md](../configuration.md)                 | Always — the steps for writing config and the shared verification checklist                               |
| 2     | [../schemas.md](../schemas.md)                             | Before writing a collection's `schemas`                                                                   |
| 3     | [configuration.md](configuration.md)                       | Always — CLI baseline fixes, `next.config`, collections, data files, images, the checklist                |
| 4     | [../inputs.md](../inputs.md)                               | Before writing `_inputs`                                                                                  |
| 5     | [../structures.md](../structures.md)                       | Any field holds an array or an object                                                                     |
| 6     | [../collection-urls.md](../collection-urls.md)             | Any collection produces pages                                                                             |
| 7     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (route segments, `trailingSlash`, `.html` paths, the home page, `basePath`) |
| 8     | [../build-commands.md](../build-commands.md)               | The build has steps besides `next build`                                                                  |
| 9     | [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating                                                       |
| 10    | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only                                       |
