# Build and Test (Next.js)

Read [../build.md](../build.md) first, and work through its checklist. This file covers only the Next.js additions: the export settings, Next's output, and the build command.

## Export settings

- **Set** `output: "export"`, and `images` when the site uses `next/image` — see [cloudcannon-configuration/nextjs/configuration.md § `next.config`](../../cloudcannon-configuration/nextjs/configuration.md#nextconfig-for-static-export). `next build` then writes the whole site to `out/`, or to `distDir` when set.
- **Keep** the site's `trailingSlash`. It decides the built path of every page and the collection `url` patterns — see [cloudcannon-configuration/nextjs/collection-urls.md § Trailing slash rule](../../cloudcannon-configuration/nextjs/collection-urls.md#trailing-slash-rule). Changing the setting changes every public URL, so **ask the user** first.
- **Remove** `rewrites`, `redirects` and `headers` once the audit has a replacement for each. Export ignores them.

## Build verification checklist

- [ ] **Clean build.** Delete `.next/` and `out/` (or the `distDir`), then run the full build script.
- [ ] **Every page is in the output.** Each route from the audit has an `.html` file in `out/`, and each file in a `[slug]` collection has one.
- [ ] **Counting regions.** `grep -rhoE 'data-editable="[a-z_-]+' out --include='*.html' | sort | uniq -c` lists each region type. Keep the grep to HTML: the `.txt` files beside each page hold the same markup as the React payload.
- [ ] **Images load.** Every `<img>` in `out/` points at a file under `out/` or a real remote host.
- [ ] **Base path.** On a site with `basePath`, the built pages load CSS, scripts and images under it.

## CloudCannon build command

| Site has                                                          | `build.build_command`                        | `build.install_command` |
| ----------------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| A `build` script that runs `next build` and every other step      | `npm run build`                              | `npm i`                 |
| A `build` script that misses a step (search index, content layer) | Fix the `build` script, then `npm run build` | `npm i`                 |

- **Set** `build.output_path` and `build.node_version` in `.cloudcannon/initial-site-settings.json` per [cloudcannon-configuration/nextjs/configuration.md § Build settings](../../cloudcannon-configuration/nextjs/configuration.md#build-settings-cloudcannoninitial-site-settingsjson).

## Common issues

### `Page "/blog/[slug]" is missing "generateStaticParams()"`

The route's `generateStaticParams` is missing, or returned an empty list because its content folder is empty — see [content.md § `[slug]` routes](content.md#slug-routes).

### `Image Optimization using the default loader is not compatible with export`

A `next/image` with the default loader — see [§ Export settings](#export-settings).
