# Configuration (SvelteKit) — entry point

SvelteKit-specific configuration guidance. The cross-SSG rules live in the root files in the reading order below, starting with [`../configuration.md`](../configuration.md); the files here carry only what differs for SvelteKit.

**MUST:** download the JSON schemas before writing any configuration — see [`../SKILL.md`](../SKILL.md#do-this-before-writing-any-configuration). Training data hallucinates keys.

**Find the adapter first.** `svelte.config.js` names it. Only `@sveltejs/adapter-static` writes a site CloudCannon can serve → [configuration.md § Static output](configuration.md#static-output).

**Find where content lives next.** SvelteKit has no content convention. Read each route's `load` (`+page.js`, `+page.server.js`, `+layout.*`) and the modules it calls. Every collection `path` comes from there.

## Reading order

| Order | File                                                       | Read when                                                                                                         |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1     | [../configuration.md](../configuration.md)                 | Always — the steps for writing config and the shared verification checklist                                       |
| 2     | [../schemas.md](../schemas.md)                             | Before writing a collection's `schemas`                                                                           |
| 3     | [configuration.md](configuration.md)                       | Always — CLI baseline fixes, static output, prerendering, collections, string inputs, data files, images, checks  |
| 4     | [../inputs.md](../inputs.md)                               | Before writing `_inputs`                                                                                          |
| 5     | [../structures.md](../structures.md)                       | Any field holds an array or an object                                                                             |
| 6     | [../collection-urls.md](../collection-urls.md)             | Any collection produces pages                                                                                     |
| 7     | [collection-urls.md](collection-urls.md)                   | Any collection produces pages (route folders, `trailingSlash`, the home page, listing the build)                  |
| 8     | [../build-commands.md](../build-commands.md)               | Writing `install_command` or `node_version`, or the build has steps besides `vite build`                          |
| 9     | [../server-features.md](../server-features.md)             | The live site needs a server (auth, accounts, form actions, endpoints the browser calls), so it keeps its adapter |
| 10    | [../monorepos.md](../monorepos.md)                         | The SvelteKit app is one package in a workspace                                                                   |
| 11    | [../routing.md](../routing.md)                             | The site sets headers, redirects or rewrites                                                                      |
| 12    | [../scheduled-builds.md](../scheduled-builds.md)           | Future-dated content should publish on its date                                                                   |
| 13    | [../cloudcannon-cli-guide.md](../cloudcannon-cli-guide.md) | Generating the baseline step by step, or validating                                                               |
| 14    | [../configuration-gotchas.md](../configuration-gotchas.md) | During and after configuration — cross-SSG pitfalls, reference only                                               |
