---
name: cloudcannon-scheduled-publishing
description: >-
  Use when setting up scheduled (future-dated) publishing for a CloudCannon
  Astro site — letting editors give a post or page a future date so it stays
  out of the build until a build runs on or after that date, then publishes
  automatically. Covers the publish gate, the `_schedule.txt` generator, the
  build hook, and enabling scheduled builds in CloudCannon.
---

# CloudCannon Scheduled Publishing (Astro)

Let editors set a future date on content and have it publish itself at that time, with no draft sitting live and no manual step. A static build can't "wait" — so this works in two halves that must both be in place:

1. **Publish gate** — at build time, exclude any entry whose date is in the future from *every* place it would otherwise appear.
2. **Schedule file** — write the future dates into `_schedule.txt` at the **root of the build output**. CloudCannon reads it and triggers a fresh build at each timestamp. When that build runs, the date has passed, the gate lets the entry through, and it goes live.

The date itself is just a normal `datetime` input — no special field. The work is the gate (done right, it leaks nowhere) and the schedule file (generated into the build output, not committed).

## When to use this skill

- Scheduling blog posts / news / events to publish at a future date on a CloudCannon Astro site
- "Embargoed" content that must not appear anywhere until a set time
- Debugging a scheduled post that leaked into the build early (showed in a list, feed, or sitemap before its date)
- Setting up the `.cloudcannon/prebuild` / `postbuild` hook that produces `_schedule.txt`

Published alongside the other CloudCannon skills — you will usually need them too:

| Also use | For |
| -------- | --- |
| [cloudcannon-configuration](../cloudcannon-configuration/SKILL.md) | The collection, the `datetime` `_input` for the date field, and `cloudcannon.config.yml`. The date field must be a real input editors can set. |
| [cloudcannon-visual-editing](../cloudcannon-visual-editing/SKILL.md) | Making the date field (and the rest of the post) editable in the Visual Editor. |
| [migrating-to-cloudcannon](../migrating-to-cloudcannon/SKILL.md) | If the Astro collection / build settings don't exist yet. |

## How it works

```
editor sets future date  ──►  build excludes the entry (publish gate)
                              └► build hook writes _schedule.txt into the output
CloudCannon reads _schedule.txt  ──►  schedules a build at each timestamp
scheduled build runs  ──►  date has now passed  ──►  gate lets entry through  ──►  live
```

"Now" is frozen at build time, so the comparison is just `entryDate <= buildTime`. Everything else is making sure that single decision is applied everywhere and that CloudCannon knows when to rebuild.

## Part 1 — The publish gate

Add one helper and route **every** consumer of the collection through it. Centralising matters: the bug in this feature is always a consumer you forgot.

```ts
// src/utils/posts.ts  (adapt collection name + date field path)
import { getCollection, type CollectionEntry } from "astro:content";

export function isPublished(post: CollectionEntry<"blog">, now = Date.now()): boolean {
  return new Date(post.data.post_hero.date).getTime() <= now;
}

/** Published posts only, newest first. Use everywhere instead of getCollection("blog"). */
export async function getPublishedPosts(): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog", (post) => isPublished(post));
  return posts.sort(
    (a, b) =>
      new Date(b.data.post_hero.date).getTime() -
      new Date(a.data.post_hero.date).getTime(),
  );
}
```

### Find every consumer — this is the whole job

`getCollection(...)` (and `getEntry`) is called from more places than you expect. Grep for all of them and route each through the gate:

```bash
grep -rn 'getCollection("blog")\|getCollection(.blog.)\|getEntry("blog"' src/
```

Typical consumers, all of which must filter:

| Consumer | File (typical) | If you miss it |
| -------- | -------------- | -------------- |
| Per-entry routes (`getStaticPaths`) | `src/pages/blog/[slug].astro` | Future post gets a live page at its URL |
| Paginated index | `src/pages/blog/[...page].astro` | Future post shows in the list / changes page counts |
| Tag / category pages | `src/pages/tags/[tag]/[...page].astro` | Future post listed under its tag; an orphan tag page builds |
| RSS / Atom feed | `src/pages/feed.xml.js` | Future post syndicated early |
| "Recent / related posts" | `src/layouts/Post.astro` | Future post surfaces in related lists |
| Sitemap, search index, homepage teasers, `getStaticPaths` for OG images | various | Leaks via the side door |

For `getStaticPaths`, filtering means the future entry produces **no route** — its URL 404s until the publishing build. That is the desired behaviour.

## Part 2 — Generate `_schedule.txt`

`_schedule.txt` must land at the **root of the build output** (`dist/_schedule.txt`). Comma-separated, one scheduled build per line:

```
2026-10-22T10:00:00+00:00,Publish Post,src/content/blog/because-of-the-internet.mdx
```

`<ISO 8601 timestamp, UTC>,<label>,<source path>`. Use a UTC timestamp without milliseconds (`...+00:00`).

A ready-to-adapt generator is in [scripts/generate-schedule.mjs](scripts/generate-schedule.mjs) — change the four config constants at the top (content dir, date field path, label, default output). It parses front matter with `js-yaml` (a transitive Astro dep; declare it explicitly in `package.json`).

### Where to run it — build hook, not the build command

Generate into the build output from a CloudCannon build hook, so the schedule file always matches what was actually built and never lives in source control:

- **`postbuild` (preferred)** — runs after `astro build`, when `dist/` exists. Write straight into it, the same way a Pagefind step does:
  ```sh
  # .cloudcannon/postbuild
  npx -y pagefind --site dist
  node scripts/generate-schedule.mjs dist/_schedule.txt
  ```
- **`prebuild` alternative** — if you must generate before the build, write to `public/_schedule.txt`; Astro copies `public/` to the output root.

Do **not** chain it into `npm run build` (`"build": "node ... && astro build"`) — the user running this skill specifically wants it in a CloudCannon build hook, and a plain local `npm run build` should stay vanilla Astro. Add an `npm run schedule` script for local inspection instead.

## Part 3 — Enable scheduled builds in CloudCannon

The repo side is inert until CloudCannon is told to read the file. Scheduled builds must be **enabled for the site** in CloudCannon so it polls `_schedule.txt` from the published output and queues a build per timestamp. Point the user at CloudCannon's scheduled-builds documentation for the current dashboard location and any plan requirements — don't assert exact menu paths you can't verify.

Document all of this in the repo's `README.md` and `.cloudcannon/README.md` so the demo is self-explanatory.

## Verification — prove the entry is excluded *and* scheduled

Set one entry to a future date, build, run the generator, then confirm every exclusion. Don't stop at "the index looks right":

```bash
npm run build
node scripts/generate-schedule.mjs dist/_schedule.txt

cat dist/_schedule.txt                                  # future entry present, correct format
ls dist/blog/ | grep -i <slug> || echo "no page (correct)"   # no route built
grep -rl "<Title>" dist/blog/index.html dist/feed.xml 2>/dev/null || echo "not listed (correct)"
ls dist/tags/<only-tag-of-future-post> 2>/dev/null && echo "WRONG" || echo "no orphan tag page (correct)"
```

Then flip the date to the past, rebuild, and confirm it now appears and `_schedule.txt` no longer lists it.

## Checklist

Read before starting; verify every item when done.

- [ ] A `datetime` `_input` exists for the date field (see [cloudcannon-configuration](../cloudcannon-configuration/SKILL.md)) so editors can set future dates
- [ ] One `isPublished` / `getPublishedPosts`-style gate exists; date comparison is absolute (UTC epoch), not string compare
- [ ] `grep` confirms **every** `getCollection`/`getEntry` consumer routes through the gate — routes, index, tags, feed, related, sitemap, search, homepage teasers
- [ ] `getStaticPaths` uses the gate, so future entries build no route
- [ ] Generator writes ISO-8601 UTC lines to the **root** of the build output (`dist/_schedule.txt`)
- [ ] Generation runs from a `.cloudcannon/prebuild`/`postbuild` hook, **not** chained into `astro build`
- [ ] `js-yaml` (or your parser) declared in `package.json`, not relied on transitively
- [ ] `_schedule.txt` is not committed (it's a build artifact)
- [ ] Verified: future entry absent from page, index, feed, tags; present in `_schedule.txt`
- [ ] Verified: past date → entry appears, drops out of `_schedule.txt`
- [ ] CloudCannon scheduled builds enabled; documented in `README.md` + `.cloudcannon/README.md`

## Common mistakes

| Excuse | Reality |
| ------ | ------- |
| "I filtered the blog index, that's the user-facing list" | The index is one of six-plus consumers. The feed, tag pages, related-posts, sitemap, and per-post routes each read the collection independently. Grep for every `getCollection`/`getEntry` and gate all of them — one missed consumer leaks the post. |
| "`getStaticPaths` can build the page, the gate hides it elsewhere" | A built route is a live, shareable, indexable URL. The gate must run *inside* `getStaticPaths` so the future entry produces no path at all. |
| "I'll compare the date strings" | Timezone offsets make string compare wrong. Parse to epoch (`new Date(x).getTime()`) and compare against `Date.now()` so the offset in the value is respected. |
| "Chaining it into the build script is simpler" | The feature belongs in a CloudCannon build hook so the schedule file matches the built output and local `npm run build` stays vanilla Astro. Use `postbuild` (writes into `dist/`) or `prebuild` (writes into `public/`). |
| "Put `_schedule.txt` in the repo root / commit it" | Astro doesn't copy repo-root files into the build, and a committed copy goes stale. Generate it into the build output (`dist/`, or `public/` which Astro copies to the output root). Add it to `.gitignore`. |
| "The script can rely on `js-yaml` being there" | It's only a transitive Astro dep — declare it in `package.json`, or the hook breaks on a clean install with `NODE_ENV=production`. |
| "Code's done, scheduling works" | Nothing fires until **scheduled builds is enabled in CloudCannon** to read `_schedule.txt`. The repo side is inert without it. |
| "Empty `_schedule.txt` means it's broken" | No future-dated entries → empty file is correct. To demo the feature, the repo needs at least one entry dated in the future. |
| "The future post's tag page is missing" | Correct — if the only post with that tag is scheduled, its tag page shouldn't build yet. It appears with the publishing build. |
