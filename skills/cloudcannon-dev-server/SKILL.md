---
name: cloudcannon-dev-server
description: >-
  Use when running a CloudCannon site locally with `cloudcannon dev` — starting
  the local editing loop so the user can edit in the CloudCannon editor and see
  the site rebuild, choosing the build and watch commands per SSG, and reading
  the `/__api` surface the server exposes.
---

# The CloudCannon dev server

`cloudcannon dev` runs the real CloudCannon app against local files, with no login, on one origin. This skill starts the local editing loop and hands it to the user.

## The loop

One command gives the user both halves of it:

```sh
bash scripts/cc-serve.sh /path/to/site
```

| They do this                       | This happens                                             |
| ---------------------------------- | -------------------------------------------------------- |
| Change a source file in the editor | The rebuild watcher rebuilds, the preview updates itself |
| Change a source file on disk       | The same watcher rebuilds, the preview updates itself    |

Then tell them to open `http://localhost:10101`, and that Ctrl-C stops everything.

## When to use

- The user wants to see and edit their site in CloudCannon before it is deployed anywhere
- You just wrote editable regions, collections or inputs and the user needs to try them
- The user reports a page as missing, blank or broken in CloudCannon, and you need to reproduce it locally against the real app

## When not to use

- **Authoring collections, inputs or structures** — that is [`cloudcannon-configuration`](../cloudcannon-configuration/SKILL.md). This skill serves the result; it does not decide it.
- **Authoring editable regions** — that is [`cloudcannon-visual-editing`](../cloudcannon-visual-editing/SKILL.md).
- **Checking that a site's output is correct** — whether URLs match the collection config, whether pages are orphaned. This skill starts a server; it does not grade the site.
- **Driving the editor in a browser** — clicking regions, dumping inputs, screenshotting. Ask the user to look.
- **Final sign-off.** Local CloudCannon has no real save-to-git, no build pipeline and no permissions. A human still confirms on the hosted site.

## The rule that costs the most sessions

**MUST start a rebuild watcher alongside `cloudcannon dev`, not `cloudcannon dev` alone.**

**Why:** the server syncs, it does not build. `--live-sync` carries source changes between disk and the app, so an editor save reaches the file and the editor shows the new text — but the preview renders the built output, and nothing regenerated it. The user sees their edit in the field and the old page beside it, with no error anywhere. `cc-serve.sh` starts the watcher; a hand-rolled equivalent must too.

## SSG coverage

`cloudcannon dev` is SSG-agnostic — it serves a directory, and `cc-serve.sh` asks the CLI which directory that is:

```sh
cloudcannon configure detect-ssg              # which SSG, and the scores behind the guess
cloudcannon configure detect-build-commands   # build command, output directory, with attribution
```

That covers every SSG the CLI knows — Astro, Eleventy, Hugo, Jekyll, Next.js, SvelteKit, Gatsby, Nuxt, Docusaurus, Lume, Bridgetown, Hexo, MkDocs, Sphinx. **MUST NOT** keep a second detection table anywhere in this skill; it would drift from the CLI's.

Override either answer with `--output` and `--build-cmd`. See [setup.md § Build and watch commands](setup.md#build-and-watch-commands).

## Contents

| File                                     | Covers                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| [setup.md](setup.md)                     | Prerequisites, what `cloudcannon dev` does and does not do, build/watch, ports |
| [dev-server-api.md](dev-server-api.md)   | The `/__api` surface — every route and the event stream                        |
| [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix                                                          |
| [scripts/README.md](scripts/README.md)   | Every script and its flags                                                     |

## Scripts

**Locate the scripts before running them.** The commands here assume this skill sits at `skills/cloudcannon-dev-server/`. Depending on the install route it may be under `.agents/skills/`, `.cursor/skills/`, or a plugin directory outside the project — adjust the path to wherever this skill's `scripts/` actually sits.

| Script                                     | Purpose                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| [cc-serve.sh](scripts/cc-serve.sh)         | Build, warn about the postbuild, start the watcher and serve |
| [watch-build.mjs](scripts/watch-build.mjs) | Rebuild on source change. `cc-serve.sh` starts it            |

## Common mistakes

| Excuse                                                     | Reality                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| "`cloudcannon dev` is running, so the loop works."         | It serves a directory and nothing else. Without a watcher, nothing regenerates after a save.                                   |
| "The editor saved but the page did not change."            | Expected without a watcher, and expected for a few seconds with one — the build has to finish. Check the `cc-serve.sh` output. |
| "I will open `/index.html` to see the built page."         | `/` and `/index.html` both serve the CloudCannon app. The built homepage is at `/__output/index.html`.                         |
| "`/about/` returns 500, the server is broken."             | The server has no directory index. Request `/about/index.html`.                                                                |
| "Port 10101 answers, so my site is up."                    | It proves a dev server is there, not that it is yours. `cc-serve.sh` probes for its own output before trusting the port.       |
| "The diff is huge, something corrupted it."                | CloudCannon reserialises the whole frontmatter on save. Diff the field you changed.                                            |
| "The site built, so the postbuild's output will be there." | A plain build skips `.cloudcannon/postbuild`. See [troubleshooting.md](troubleshooting.md).                                    |
