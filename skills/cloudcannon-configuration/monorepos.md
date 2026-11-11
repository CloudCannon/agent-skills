# Monorepos

Read when the site lives in a subfolder of its repository, or the repository holds more than one CloudCannon site. The examples use a site at `sites/marketing/`.

## Where the config file goes

| The repository holds           | Config                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| One CloudCannon site           | `cloudcannon.config.yml` at the repository root                                                                 |
| More than one CloudCannon site | One in each site's folder, set as that site's **CloudCannon Configuration Path** in **Site Settings > Details** |

**MUST:** with more than one site, set a configuration path on every site, and keep no `cloudcannon.config.*` at the repository root.
**Why:** a site with no configuration path reads the config at the repository root, so a root config silently becomes the config of any site that doesn't set a path.

The `cloudcannon sites` commands can't set the path, so ask the user to set it in the dashboard. Through the API it is the site's `cloudcannon_config_path` — see [`cloudcannon-sdk`](../cloudcannon-sdk/SKILL.md).

Validate a config outside the root by path, from the repository root:

```sh
npx @cloudcannon/cli validate --configuration-path sites/marketing/cloudcannon.config.yml
```

## Write every path from the repository root

**MUST NOT:** add `source`. Write every path in the config from the repository root: `sites/marketing/src/content/blog`, `sites/marketing/.cloudcannon/schemas/post.md`.
**Why:** `source` re-bases some keys and not others, so one config ends up with two bases. Every path from the root reads the same way in every key.

| Key                                  | With `source` set, resolves from |
| ------------------------------------ | -------------------------------- |
| `collections_config.*.path`          | `source`                         |
| `paths.uploads`                      | `source`                         |
| `schemas.*.path`                     | The repository root              |
| `*_from_glob`                        | The repository root              |
| `build.output_path`, the build's cwd | The repository root              |

A config that already sets `source` works. To remove it, prefix its value to every key the table resolves from `source`, and leave the others alone.

`configure generate` writes paths relative to the folder it scans, or to the `source` it detects. Prefix each with the site folder, and remove `source` — see [configuration-gotchas.md § `source`](configuration-gotchas.md#verify-the-cloudcannon-clis-source-path).

## Build settings

The install and build commands run from the repository root, for every site.

| Key               | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `install_command` | The install where the lockfile is: at the root for a workspace, or `cd sites/marketing && npm ci` |
| `build_command`   | `cd sites/marketing && npm run build`, or the workspace's filtered build                          |
| `output_path`     | From the root: `sites/marketing/dist`                                                             |

Choose the install command for the package manager as in [build-commands.md § Package manager](build-commands.md#package-manager).

**MUST:** put `.cloudcannon/initial-site-settings.json` at the repository root, never in a site folder.
**Why:** CloudCannon reads only the root file, once, when a site is created. A copy in a site folder is ignored.

Every site created from the repository starts with that one file's settings. Write it for the first site. Set each other site's build settings after creating it, with `cloudcannon sites update-build-config` — see [`cloudcannon-cli` § Changing build configuration](../cloudcannon-cli/commands.md#changing-build-configuration).

## Running `cloudcannon dev`

`cloudcannon dev` reads the config only from the root of the folder it starts in, and has no configuration path option. With the config at the repository root, run it from the root. With a config in a site folder, see [`cloudcannon-dev-server` § A site in a monorepo](../cloudcannon-dev-server/setup.md#a-site-in-a-monorepo).

## Checks

- [ ] With more than one site, each site's config is in its own folder
- [ ] With more than one site, each site's CloudCannon Configuration Path points at its config
- [ ] With more than one site, no `cloudcannon.config.*` at the repository root
- [ ] No `source` key
- [ ] Every path in the config starts with the site folder
- [ ] `output_path` starts with the site folder
- [ ] The build command changes into the site folder, or filters to it
- [ ] `validate --configuration-path` passes for each site's config
