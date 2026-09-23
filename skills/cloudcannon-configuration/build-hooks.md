# Build hooks

CloudCannon runs three optional scripts from `.cloudcannon/` around its build. They are
extensionless files in the repository, not keys in `cloudcannon.config.yml`.

| Hook       | File                      | Runs                                                                   |
| ---------- | ------------------------- | ---------------------------------------------------------------------- |
| Preinstall | `.cloudcannon/preinstall` | After the repository files are available, before any install scripts   |
| Prebuild   | `.cloudcannon/prebuild`   | After the install scripts, before any build command                    |
| Postbuild  | `.cloudcannon/postbuild`  | After the build succeeds, before the output is uploaded to CloudCannon |

Source: [CloudCannon — Build hooks](https://cloudcannon.com/documentation/build/hooks/).

**Postbuild runs before the upload, which is the whole reason it is useful.** Anything it writes
into the output directory is deployed.

## How a site with hooks is laid out

**Default to a hook** for any step CloudCannon needs around its build.
**Why:** a hook is a shell script — it takes comments, error handling, and one step per line. The
build command is a single `&&` chain inside a JSON string.

Three files carry the whole arrangement.

**The hook holds the steps**, as named scripts so it stays a list rather than a chain:

```bash
# .cloudcannon/prebuild
#!/usr/bin/env bash
set -e

npm run generate:theme
npm run fetch:remote-data
```

**`package.json` names each step, keeps `build` bare, and composes the hooks separately:**

```json
{
  "scripts": {
    "generate:theme": "node scripts/generate-theme.js",
    "build": "astro build",
    "build:local": "bash .cloudcannon/prebuild && npm run build && bash .cloudcannon/postbuild"
  }
}
```

**`build_command` is `npm run build`** — the bare build. CloudCannon runs the hooks itself, so the
build command never mentions them.

**`build:local` is the parity command**, and the only script that invokes hooks.
**Why:** a step that only ever runs on CloudCannon has a single caller and no way to test it — the
next person to change it finds out in production. The `:local` suffix is what stops anyone
pointing `build_command` at it; the name has to refuse the misuse, because a convention people are
supposed to remember will not.

Use the parity command when serving the site locally. Nothing runs the hooks there, so a bare
`build` drops whatever the postbuild produced on the first rebuild. See
[`cloudcannon-dev-server` § The postbuild](../cloudcannon-dev-server/setup.md#the-postbuild).

### When the step belongs in the build command instead

| Who else builds this site                            | Where the step goes                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Nobody — CloudCannon is the only builder             | The matching hook                                                      |
| CI, a deploy preview, or another host also builds it | Somewhere that entry point already reaches — usually the build command |
| The step must run before dependencies install        | `.cloudcannon/preinstall` — nothing else runs that early               |

**Preinstall cannot be composed into the parity command.** It runs before dependencies install, so
no script in `package.json` can include it — reaching it means `bash .cloudcannon/preinstall && npm install`
by hand. That is a reason to keep preinstall for steps that genuinely cannot run any later.

### Checks

- [ ] `build_command` contains no `.cloudcannon/` path, directly or via the script it calls
- [ ] The parity command runs every hook the site has, in the order CloudCannon runs them
- [ ] The parity command's name cannot be read as the production build command
- [ ] The repo README or `.cloudcannon/README.md` names the parity command

## Which side of the build?

**The deciding question is what the step reads, not what it produces.**

| The step reads                        | Hook       | Examples                                                                                                            |
| ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Source content in the repository      | prebuild   | Generating a stylesheet from a theme data file; fetching remote data into local files; bundling assets              |
| The built output                      | postbuild  | Indexing built HTML for site search; rewriting markup or URLs in the output; generating extra pages from built ones |
| Nothing — it prepares the environment | preinstall | Configuring a package manager or private registry before install runs                                               |

**Common miss: "search indexing" lands on both sides.** An index built from source content
(Markdown, data files) is a prebuild. A tool that crawls the built HTML cannot be — the HTML does
not exist yet when prebuild runs, so it must be a postbuild:

```bash
#!/usr/bin/env bash
set -e

npx pagefind --site <output-dir>
```

A pipeline that rewrites or multiplies the whole output — a localisation pass that regenerates the
build as a per-locale tree, for example — is the same shape, and belongs in the postbuild for the
same reason.

## The build command MUST NOT invoke a hook

**MUST NOT** put `bash .cloudcannon/prebuild`, `bash .cloudcannon/postbuild`, or any script that
calls them, into `build_command`.
**Why:** CloudCannon runs the hooks itself, around the build command. A build command that runs
them too fires every hook twice. A prebuild that regenerates a file survives that; a postbuild that
rewrites or multiplies the output usually does not, and rebuilding does not undo it.

The trap is not hypothetical. `cloudcannon configure detect-build-commands` suggests the
`package.json` `build` script, so if `build` invokes the hooks, taking the CLI's own suggestion is
what breaks the site. This is why `build` stays bare and the parity command is named separately.

## Postbuild MUST NOT write to source files the editor edits

**MUST NOT** let a postbuild add, remove or update files in the repository that editors work on.
**Why:** CloudCannon warns that a postbuild which "adds, removes or updates files used by the
editor" can compromise the editing experience. Rewriting the **output** is what the hook is for and
is safe; reaching back into the repository puts the editor and the deployed site out of step.
