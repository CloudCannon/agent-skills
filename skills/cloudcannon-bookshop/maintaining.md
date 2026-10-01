# Maintaining a Bookshop site

Changing a site that stays on Bookshop. Read [bookshop.md](bookshop.md) first for the pieces; the SSG's `bookshop.md` has the template syntax.

**MUST NOT:** migrate as a side effect. A component change on a Bookshop site is made the Bookshop way.

## Adding a component

- **Create** the component in the library: `npx @bookshop/init --component <path>` from the library root creates the template, `<name>.bookshop.yml` and `<name>.scss`. Some sites ship their own script instead (`npm run new-component`) — use it if there is one.
- **Put** every prop the template reads into `blueprint`, with the value a new instance should start with.
- **Add** the structure key the page's array uses to `spec.structures` — usually `content_blocks`. Check the matching input points at `_structures.<key>` in `cloudcannon.config.yml`.
- **Add** `_inputs` for any prop whose type CloudCannon would guess wrong — selects, images, markdown.
- **Render** it through the existing dispatcher or `page` helper. No layout change is needed for a block in `content_blocks`.
- **Build** locally. The new block appears in the editor's Add menu only after a CloudCannon build, because `@bookshop/generate` makes the structures there.

## Changing a component

| Change                             | Watch out for                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A new prop                         | Add it to `blueprint`. Existing pages don't have it — guard it in the template                         |
| A renamed or removed prop          | Existing front matter keeps the old key. Rewrite the content files, or keep reading both               |
| A renamed or moved component       | Its name is stored in every page's `_bookshop_name`. Rewrite every value, or don't rename              |
| A nested component slot            | `bookshop:<name>` starts empty (`null`); guard it in the template. `bookshop:<name>!` starts filled in |
| An array of objects in a blueprint | The first item becomes the template for new items; the array starts empty on new components            |

**Blueprint changes affect new components only.** Nothing migrates existing front matter.

## Code that can't run live

The live engine renders in the browser, with only the library available. When a component needs something the editor can't provide — an asset pipeline, a page lookup, a site template outside the library — branch on the SSG's live-editing flag and render a stand-in:

- **Branch** on the flag — see the SSG's `bookshop.md` for its name.
- **Turn off** live rendering for one top-level call with `live_render: false` (also `_live_render` in a blueprint). It doesn't reach nested components.
- **Pass** `--skip-live` to `@bookshop/generate` to turn live editing off site-wide, or `--disable-bindings` to keep live rendering without the click-to-edit overlays.

## Upgrading Bookshop

- [ ] Run `npx @bookshop/up@latest` — it moves every npm package, the Hugo module or the Jekyll gem to one version, and runs Bookshop's own migrations.
- [ ] Check `package.json` pins every `@bookshop/*` package to the same exact version.
- [ ] Build locally, then on CloudCannon, and check the editor's console for Bookshop's version error.

## Checklist

- [ ] Every prop the template reads is in `blueprint`
- [ ] `spec.structures` names the key the page's array input uses
- [ ] Every `@bookshop/*` package, and the SSG plugin, are on one version
- [ ] `.cloudcannon/postbuild` still runs `npx @bookshop/generate`
- [ ] The component renders in a local build, and live in the editor after a CloudCannon build
