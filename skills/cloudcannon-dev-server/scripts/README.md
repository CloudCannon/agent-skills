# Scripts

One optional script. ESM, no dependencies, nothing here opens a browser.

## `watch-build.mjs`

Re-runs the build when a source file changes, so the directory `cloudcannon dev` serves stays
current. Optional: rebuilding by hand does the same job, and the preview reloads itself either
way.

```sh
node watch-build.mjs --root /path/to/site \
  --build-cmd "npm run build" \
  --watch src
```

| Flag          | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| `--build-cmd` | Shell command that builds the site (required)                 |
| `--watch`     | Source directory to watch; repeatable (at least one required) |
| `--root`      | Project root (default: cwd)                                   |
| `--debounce`  | Quiet period before rebuilding, in ms (default: 300)          |

It builds once at startup, then on every change. It never runs two builds at once, and a change
that arrives mid-build queues one more pass rather than being dropped. Run it alongside
`cloudcannon dev` in a second terminal; neither supervises the other.

**It watches only the directories you pass, plus files directly in the project root** (for
`cloudcannon.config.yml` and the SSG's own config). It exits if a `--watch` directory doesn't
exist, and prints what it watches at startup.

**MUST pass every directory a person edits, and none the build writes to.** Read them from the
site: its content, data and template directories, and any its SSG config moves elsewhere. Leave
out static-asset directories such as `public/` unless you've checked the build never writes there.

**Why:** a build that writes back into the source tree — `cp -r dist/pagefind public/`, a generator
writing into `src/` — retriggers a watcher pointed at its target, forever. Watching only what a
person edits is what makes that impossible, and it needs no per-site ignore list.

If a build does feed itself anyway, the script stops after five back-to-back rebuilds and says so,
rather than looping silently.

**Hugo with editable regions:** don't pass `--watch assets`. Rebuild by hand after SCSS or theme
changes instead.
**Why:** every build rewrites `assets/jsconfig.json`, so a watched `assets/` retriggers itself until
the loop guard stops it.

`cloudcannon dev` is expected to grow a build-and-watch mode of its own. No flag belongs here that
a different `--build-cmd` or `--watch` can already express, and this file goes when that ships.
