# Scripts

One optional script. ESM, no dependencies, nothing here opens a browser.

## `watch-build.mjs`

Re-runs the build when a source file changes, so the directory `cloudcannon dev` serves stays
current. Optional: rebuilding by hand does the same job, and the preview reloads itself either
way.

```sh
node watch-build.mjs --root /path/to/site \
  --build-cmd "npm run build"
```

| Flag          | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| `--build-cmd` | Shell command that builds the site (required)        |
| `--watch`     | Extra directory to watch; repeatable                 |
| `--root`      | Project root (default: cwd)                          |
| `--debounce`  | Quiet period before rebuilding, in ms (default: 300) |

It builds once at startup, then on every change. It never runs two builds at once, and a change
that arrives mid-build queues one more pass rather than being dropped. Run it alongside
`cloudcannon dev` in a second terminal; neither supervises the other.

**It watches an allowlist of source directories, not the whole project.** `src`, `content`,
`data`, `layouts`, `_includes`, `_posts` and similar, whichever exist, plus files directly in the
project root for `cloudcannon.config.yml` and the SSG's own config. It prints the list at startup.

**Why:** a build that writes back into the source tree — `cp -r dist/pagefind public/`, a generator
writing into `src/` — retriggers a watcher pointed at its target, forever. Watching only what a
person edits is what makes that impossible, and it needs no per-site ignore list. Static-asset
directories are absent for that reason; add one with `--watch public` where the build does not
write there.

If a build does feed itself anyway, the script stops after five back-to-back rebuilds and says so,
rather than looping silently.

`cloudcannon dev` is expected to grow a build-and-watch mode of its own. No flag belongs here that
a different `--build-cmd` or `--watch` can already express, and this file goes when that ships.
