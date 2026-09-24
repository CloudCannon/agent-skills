# Build and install commands

CloudCannon builds a site by running its install command, then its build command, then uploading
the output directory. Everything the site needs to build — generators, data fetching, search
indexing, output rewriting — belongs in one of those two commands.

## The build script

**`package.json` names each step, and `build` runs all of them in order:**

```json
{
  "scripts": {
    "generate:theme": "node scripts/generate-theme.js",
    "fetch:data": "node scripts/fetch-remote-data.js",
    "index:search": "pagefind --site dist",
    "build": "npm run generate:theme && npm run fetch:data && astro build && npm run index:search"
  }
}
```

**`build_command` is `npm run build`.** It's the same command a developer runs locally, in CI, or
on any other host. That gives one build that runs the same everywhere and can be tested locally
before it reaches CloudCannon. It is also what `cloudcannon configure detect-build-commands`
suggests.

Named scripts keep the chain readable and let each step run on its own while debugging. Where a
step outgrows a one-liner, move it into a Node script (`node scripts/build.mjs`) rather than
growing the chain.

## Where each step goes

**The deciding question is what the step reads, not what it produces.**

| The step reads                        | Where it goes                         | Examples                                                                                                            |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Source content in the repository      | `build`, before the SSG               | Generating a stylesheet from a theme data file; fetching remote data into local files; bundling assets              |
| The built output                      | `build`, after the SSG                | Indexing built HTML for site search; rewriting markup or URLs in the output; generating extra pages from built ones |
| Nothing — it prepares the environment | `install_command`, before the install | Configuring a package manager or private registry                                                                   |

**Common miss: "search indexing" lands on both sides.** An index built from source content
(Markdown, data files) runs before the SSG. A tool that crawls the built HTML runs after it,
because the HTML does not exist until then: `astro build && pagefind --site dist`.

A pipeline that rewrites or multiplies the whole output is the same shape and runs after the SSG.
A localisation pass that regenerates the build as a per-locale tree is one example.

## The install command

`install_command` is the package manager's install (`npm ci`) plus anything that must happen before
dependencies install, for example `npm config set @scope:registry https://… && npm ci`. Where a
committed `.npmrc` can express the same setting, prefer it and keep the install command plain.

## Checks

- [ ] `npm run build` alone produces the complete output, including every generated file
- [ ] `build_command` is `npm run build` (or the package manager's equivalent)
- [ ] Anything that must run before install is in `install_command` or `.npmrc`

## Steps after the build MUST NOT write to source files the editor edits

**MUST NOT** let a step that runs after the SSG add, remove or update files in the repository that
editors work on.
**Why:** CloudCannon's editor works from the repository, while the preview comes from the output.
Rewriting the **output** is safe. Reaching back into the repository puts the editor and the
deployed site out of step.

## `.cloudcannon/` hook files

**MUST NOT** add `.cloudcannon/preinstall`, `prebuild` or `postbuild` files.
**Why:** CloudCannon runs these around its build, but nothing else does. A step in one of them is
skipped by a local build, CI and every other host.

If a site already has them, move their steps into the commands above (preinstall into
`install_command`, prebuild before the SSG, postbuild after it) and delete the files in the same
change. CloudCannon runs any hook file it finds, so leaving one next to a build script that does the
same work runs the step twice.
