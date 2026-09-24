---
name: cloudcannon-dev-server
description: >-
  Use when running a CloudCannon site locally with `cloudcannon dev` — starting
  the local editing loop so the user can edit in the CloudCannon editor and see
  the site rebuild, choosing the build command per SSG, and reading the
  `/__api` surface the server exposes.
---

# The CloudCannon dev server

`cloudcannon dev` runs the real CloudCannon app against local files, with no login, on one origin. This skill starts the local editing loop and hands it to the user.

## The rule that costs the most sessions

**MUST rebuild the site after every change. `cloudcannon dev` never builds.**

**Why:** the server serves a directory and syncs source files; it does not run the SSG. `--live-sync` carries an editor save to disk, so the field shows the new text — but the preview renders the built output, and nothing regenerated it. The user sees their edit in the field and the old page beside it, with no error anywhere.

## The loop

```sh
cloudcannon configure detect-build-commands   # build command and output directory
<build the site>                              # see The build command, below
cloudcannon dev <output-dir> --port 10101     # leave running
```

Then tell them to open `http://localhost:10101`, and that Ctrl-C stops the server.

| They do this                       | This happens                                                      |
| ---------------------------------- | ----------------------------------------------------------------- |
| Change a source file in the editor | It reaches disk. **Rebuild**, then the preview updates itself     |
| Change a source file on disk       | Same — the server syncs it into the app. **Rebuild**, same result |

The preview reloads itself whenever the output directory changes, so a rebuild in a second terminal closes the loop with nothing else running. See [dev-server-api.md § Events](dev-server-api.md#events).

**Offer the user both routes and let them pick:**

| Route       | What they do                             | Costs                                           |
| ----------- | ---------------------------------------- | ----------------------------------------------- |
| **Manual**  | Re-run the build after a batch of edits  | Nothing. Rebuild when they want a fresh preview |
| **Watched** | Run [watch-build.mjs](scripts/README.md) | A full build per change                         |

Default to manual when the build is slow or has a post-build step that rewrites the whole output. Default to watched when the user is editing in the browser and wants the page to follow along.

## The build command

**MUST detect the build with the CLI rather than by looking for config files.** `cloudcannon configure detect-build-commands` is the product's own detection and covers every SSG the CLI knows. **MUST NOT** keep a second detection table anywhere in this skill; it would drift from the CLI's. Take the command it suggests (`npm run build`), not the bare SSG command — see [setup.md § Build commands](setup.md#build-commands).

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

## Contents

| File                                     | Covers                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| [setup.md](setup.md)                     | Prerequisites, what `cloudcannon dev` does and does not do, the build, ports |
| [dev-server-api.md](dev-server-api.md)   | The `/__api` surface — every route and the event stream                      |
| [troubleshooting.md](troubleshooting.md) | Symptom → cause → fix                                                        |
| [scripts/README.md](scripts/README.md)   | `watch-build.mjs` and its flags                                              |

## Common mistakes

| Excuse                                             | Reality                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "`cloudcannon dev` is running, so the loop works." | It serves a directory and nothing else. Until something rebuilds, the preview is whatever was built last. |
| "The editor saved but the page did not change."    | Expected. Rebuild — and with a watcher, wait for the build to finish.                                     |
| "I will open `/index.html` to see the built page." | `/` and `/index.html` both serve the CloudCannon app. The built homepage is at `/__output/index.html`.    |
| "`/about/` returns 500, the server is broken."     | The server has no directory index. Request `/about/index.html`.                                           |
| "Port 10101 answers, so my site is up."            | It proves a dev server is there, not that it is yours. Serve on a port you chose and know is free.        |
| "The diff is huge, something corrupted it."        | CloudCannon reserialises the whole frontmatter on save. Diff the field you changed.                       |
