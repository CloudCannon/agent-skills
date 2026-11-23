# Configuration (Nuxt) — entry point

Nuxt-specific configuration guidance. The cross-SSG rules live in the root files in the reading order below, starting with [`../configuration.md`](../configuration.md); the files here carry only what differs for Nuxt.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

**Find the source directory first.** Nuxt 4 keeps `pages/`, `layouts/`, `components/` and `plugins/` under `app/`; Nuxt 3, and a Nuxt 4 site with an empty `app/`, keeps them at the root. `content/`, `public/` and `server/` are at the root in both.

**Find where content lives next.** `@nuxt/content` in `package.json` means Nuxt Content: its collections in `content.config.ts` name every content folder. Without it, read the code that loads content (`import.meta.glob`, `node:fs`, JSON `import`s) and the pages that render it. Every collection `path` comes from there.

## Reading order

| Order | File                                                       | Read when                                                                                              |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1     | [../configuration.md](../configuration.md)                 | Always — the steps for writing config and the shared verification checklist                            |
| 2     | [../schemas.md](../schemas.md)                             | Before writing a collection's `schemas`                                                                |
| 3     | [configuration.md](configuration.md)                       | Always — CLI baseline fixes, static generation, collections, string inputs, data files, images, checks |
| 4     | [../inputs.md](../inputs.md)                               | Before writing `_inputs`                                                                               |
| 5     | [../structures.md](../structures.md)                       | Any field holds an array or an object                                                                  |
| 6     | [../collection-urls.md](../collection-urls.md)             | Any collection produces pages                                                                          |
| 7     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (file routes, Nuxt Content paths, trailing slashes, the home page)       |
| 8     | [../build-commands.md](../build-commands.md)               | Writing `install_command` or `node_version`, or the build has steps besides `nuxt generate`            |
| 9     | [../routing.md](../routing.md)                             | The site sets headers, redirects or rewrites (`routeRules`, `nitro.routeRules`)                        |
| 10    | [../scheduled-builds.md](../scheduled-builds.md)           | Future-dated content should publish on its date                                                        |
| 11    | [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating                                                    |
| 12    | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only                                    |
