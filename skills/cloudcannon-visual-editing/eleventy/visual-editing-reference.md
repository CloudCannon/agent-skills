# Visual Editing Reference (Eleventy)

What Eleventy does differently from the generic pattern reference in [../visual-editing-reference.md](../visual-editing-reference.md). Read sections on demand, when [visual-editing.md](visual-editing.md) links here — don't read it front to back.

Targets Eleventy 3. Sections are about the Liquid path unless they say otherwise. [§ Data paths](#data-paths-in-eleventy), [§ Text regions and markdown](#text-regions-and-markdown-in-eleventy) and the empty-array guard in [§ `ENV_CLIENT`](#env_client-in-eleventy) apply to both paths, and [§ Nunjucks sites](#nunjucks-sites) only to Nunjucks. [overview.md § Which path the site takes](overview.md#which-path-the-site-takes) decides the path.

## What the editor can re-render

**MUST:** put anything you want re-rendered in a Liquid include. The editor re-renders a component region by running `{% include "<data-component>" %}` in an in-browser Liquid engine. Layouts and page templates are never re-rendered.
**Why:** a section written inline in a layout or page file has no include to run, so its component region can't re-render.

The bundle holds every `.liquid` and `.html` file under the includes and input directories (`liquid.componentDirs`, `liquid.extensions` change this). Files in the output directory and `node_modules` are skipped.

| Region in a layout or page template     | Works?                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| `text`, `image`, `array`, `source`      | Yes — primitives update the live DOM and never re-render      |
| `component` wrapping a Liquid include   | Yes — the include is bundled                                  |
| `component` around inline markup        | No — move the markup into an include first                    |
| `component` wrapping a Nunjucks include | No — primitives only, see [§ Nunjucks sites](#nunjucks-sites) |

## Component names are include paths

**MUST NOT:** look for a registration step. There isn't one. `data-component` is the include path relative to the includes directory, exactly as `{% include %}` takes it.

| Include file                       | `data-component` / `_type` |
| ---------------------------------- | -------------------------- |
| `_includes/components/hero.liquid` | `components/hero`          |
| `_includes/components/hero.html`   | `components/hero.html`     |

The engine appends `.liquid` to a name with no extension, so an `.html` include needs its extension in the name. A name that resolves to nothing fails with `Failed to find included template "<name>"`.

Name components so the content discriminator is the include path. Then `_type: components/hero` both selects the structure and names the include, and the page builder needs no lookup table. Prefer `.liquid` for component includes, so names carry no extension. The value is whatever path the include already has: match the site's existing include layout, and don't rename or move includes to add a prefix such as `components/`.

**Common miss:** a discriminator value of `hero` for `_includes/components/hero.liquid`. The value must match in the structure value, the content, `data-component` and the `includeWith` call.

When existing content values can't change, pin names with `liquid.components` (name → file path from the project root). Pinned names win over include resolution:

```js
eleventyConfig.addPlugin(editableRegions, {
  liquid: { components: { hero: "./src/_includes/components/hero.liquid" } },
});
```

## The include's data is the `data-prop` value

**MUST:** render a component include with `{% includeWith "<name>", <value> %}`, where `<value>` is exactly the object the region's `data-prop` points at.
**Why:** on re-render the editor spreads the `data-prop` value into the include as top-level variables, and nothing else. `includeWith` does the same at build time, so the include reads the same variables in both.

```liquid
<editable-component data-component="components/hero" data-prop="hero">
  {% includeWith "components/hero", hero %}
</editable-component>
```

`includeWith` takes two arguments, a path and one object:

- The object must be a variable, not an inline object — Liquid has no object literals.
- Extra arguments are dropped without an error.
- A value that isn't an object renders nothing.
- The path can be a variable (`{% includeWith block._type, block %}`).

**MUST NOT:** read a variable the include isn't passed — a loop variable, a page variable, another include's `assign`.
**Why:** at build time `includeWith` pushes the object onto the caller's scope, so parent variables are still visible and the build looks right. In the editor only the spread object and the globals exist, and the variable is empty.

| The include needs             | Pass it as                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Its own fields                | Keys of the `data-prop` object                                                                    |
| Global data an editor changes | The data file itself as the `data-prop` — see [§ Data files and `@data`](#data-files-and-data)    |
| Global values no region edits | The plugin's `globals` option                                                                     |
| A collection                  | `collections.<key>` — in the editor, CloudCannon collections by collection key, front matter only |

**Scalar-taking includes** (an image include called with `src` and `alt`) can't be component regions. Give them the region's paths as parameters, and emit each attribute only when its path is passed:

```liquid
{% include "image.liquid", src: hero.image, alt: hero.alt, prop_src: "hero.image", prop_alt: "hero.alt" %}

{%- comment -%} inside image.liquid {%- endcomment -%}
<img src="{{ src }}" alt="{{ alt }}"
  {% if prop_src %}data-editable="image" data-prop-src="{{ prop_src }}"{% endif %}
  {% if prop_alt %}data-prop-alt="{{ prop_alt }}"{% endif %}>
```

**MUST NOT:** default one path parameter while the caller passes the other. Default paths together or not at all.
**Why:** a default relative `prop_alt` next to a caller's `@data[nav].logo` source writes a stray `alt` key into every page's front matter.

**Presentational includes** (a section shell, a card frame) take the inner HTML as a captured string, not data:

```liquid
{% capture body %}<h2 data-editable="text" data-prop="title">{{ title }}</h2>{% endcapture %}
{% include "section-shell.liquid", body: body %}
```

**MUST:** keep a section's own root element (with its variant classes) inside the region host, never as the host.
**Why:** a re-render replaces only the host's children. A class bound on the host itself stays at its build value.

Data synthesised in the template — a `capture` parsed as YAML, an `assign` built from several fields — has no path in the file, so it can't be a region's `data-prop`. Store it as real front matter, or leave it `sidebar-only`.

## Page builder blocks in Eleventy

The dispatcher is a `for` loop in the layout, with each block's `_type` naming its include:

```liquid
{% if content_blocks %}
<div data-editable="array" data-prop="content_blocks" data-component-key="_type">
  {% for block in content_blocks %}
    <div data-editable="array-item" data-id="{{ block._type }}" data-component="{{ block._type }}">
      {% includeWith block._type, block %}
    </div>
  {% endfor %}
</div>
{% endif %}
```

- `data-id-key` defaults to `data-component-key`, so it can be omitted when both are `_type`.
- Put `data-component-key` only on arrays that mix block types. A homogeneous array puts the fixed `data-component` on each item.
- Put the dispatcher in every layout that renders `content_blocks`.
- `{% if content_blocks %}` keeps the container for an empty list — see [§ `ENV_CLIENT` in Eleventy](#env_client-in-eleventy).
- Run [../visual-editing-reference.md § Wrapper elements change the formatting context](../visual-editing-reference.md#wrapper-elements-change-the-formatting-context) before adding the item wrappers. Retarget sizing rules at direct children (`.grid > * { … }`) rather than at the include's root, and never use `display: contents` on a region host.

The generic three-layer rule is in [../visual-editing-reference.md § Page builder blocks](../visual-editing-reference.md#page-builder-blocks).

## `ENV_CLIENT` in Eleventy

The plugin defines `ENV_CLIENT` as a Liquid global, `true` in the editor's engine and undefined in the build. It is Eleventy's form of [../visual-editing-reference.md § Detecting the editor](../visual-editing-reference.md#detecting-the-editor-and-skipping-build-only-logic). It only changes what the editor re-renders, so guard inside component includes and the includes they call.

| Use                                                            | Pattern                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Skip an image shortcode                                        | `{% if ENV_CLIENT %}<img src="{{ src }}" alt="{{ alt }}">{% else %}{% image src, alt %}{% endif %}` |
| Render an empty array's container inside a re-rendered include | `{% if items or ENV_CLIENT %}<ul data-editable="array" data-prop="items">…</ul>{% endif %}`         |
| Skip an inline script                                          | `{% unless ENV_CLIENT %}<script>…</script>{% endunless %}`                                          |

**MUST:** guard every image shortcode, and every filter or shortcode that calls a Node-only package, inside a component include. Stub the package as well — see [§ The config runs in the browser](#the-config-runs-in-the-browser).
**Why:** a stubbed package called at render time throws, and the component shows an error card.

**Empty arrays in layouts and page templates:** these are never re-rendered, so `ENV_CLIENT` can't help there. Guard on the key's presence, which keeps the container when the list is empty. Seed the key (`content_blocks: []`) in the schema file.

| Guard                                                       | Empty list (`[]`) | Use? |
| ----------------------------------------------------------- | ----------------- | ---- |
| `{% if items %}` — Liquid and Nunjucks                      | Renders           | Yes  |
| Liquid `items.size > 0`, `items != empty`, `items != blank` | Hidden            | No   |
| Nunjucks `items \| length`, `items.length`                  | Hidden            | No   |

An empty array is truthy in both engines; only a missing or null key is falsy.

**Common miss:** an empty-array container shows in the editor with no height — see [../visual-editing-reference.md § Array editing](../visual-editing-reference.md#array-editing) for the editor-only CSS.

## The config runs in the browser

The bundle imports the site's real Eleventy config and replays it in the browser, so filters and shortcodes keep their closures and imports.

| Mirrored into the editor                                                         | Not mirrored                                                                                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `addFilter`, `addAsyncFilter`, `addLiquidFilter`                                 | Nunjucks and JavaScript-template variants (`addNunjucksFilter`, …)                             |
| `addShortcode`, `addAsyncShortcode`, `addLiquidShortcode` and their paired forms | Global data (`addGlobalData`, `_data/`) — see [§ Data files and `@data`](#data-files-and-data) |
| `addLiquidTag`                                                                   | `addCollection` — the editor's `collections` come from CloudCannon                             |
| Helpers registered inside plugins                                                | Helpers with a [reserved name](#reserved-names)                                                |

Node built-ins, `@11ty/eleventy` and its subpaths, and the plugin itself are stubbed automatically. Everything else the config imports is bundled for the browser.

**MUST:** list every other Node-only package the config imports in `liquid.browserStub` — `@11ty/eleventy-img`, `sharp`, `esbuild`, and other build tools.
**Why:** they can't be bundled for the browser, and they aren't stubbed for you. Don't stub browser-safe libraries (`markdown-it`, `js-yaml`) that power real filters; the filters would stop working in the editor.

```js
eleventyConfig.addPlugin(editableRegions, {
  liquid: { browserStub: ["@11ty/eleventy-img", "sharp"] },
});
```

A stubbed package called while the config replays is skipped with a console warning. The same call made while rendering throws. When a helper genuinely needs Node at render time, give it a browser override — `liquid.filters`, `liquid.shortcodes`, `liquid.pairedShortcodes` or `liquid.tags`, each mapping a name to a module that default-exports the replacement. The override wins, and the name is left out of the mirror.

**Config replay stops at a throw.** A throw inside an `addPlugin` call is caught, and helpers registered before it are kept. A throw anywhere else in the config function stops the replay: every helper registered after that line is missing in the editor, and the console shows `Replaying the Eleventy config to mirror its helpers threw: …`. The usual cause is a plugin factory called as `addPlugin(pluginFactory({ … }))` — the factory runs before `addPlugin`. Stub the package the factory comes from, or give the lost helpers overrides.

**MUST:** write filters and shortcodes that read `this` (`this.page`, `this.ctx`) as `function`, not arrow functions.
**Why:** Eleventy binds `this` only on `function` callbacks; an arrow function reads `undefined` in the build and in the editor.

**Helpers that read the data cascade** (`this.context.environments`, `this.ctx` for global data) find nothing in the editor. Pass the value in as an argument instead.

**Custom tags** must evaluate their arguments asynchronously. A tag that calls `evalValueSync` breaks when an argument uses an async filter.

### Reserved names

The plugin ships its own browser versions of these, and skips a config helper with the same name without a warning:

| Kind      | Names                                                                                                                                                                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filters   | `slug`, `slugify`, `log`, `url`, `dateToRfc3339`, `dateToRfc822`, `htmlDateString`, `getNewestCollectionItemDate`, `getCollectionItem`, `getPreviousCollectionItem`, `getNextCollectionItem`, `getCollectionItemIndex`, `inputPathToUrl`, `htmlBaseUrl`, `serverlessUrl`, `renderContent` |
| Shortcode | `renderFile`                                                                                                                                                                                                                                                                              |
| Tag       | `renderTemplate`                                                                                                                                                                                                                                                                          |

**MUST:** rename a site helper that uses one of these names for something else, and update every template that calls it. The usual one is a markdown filter named `renderContent` — see [§ Text regions and markdown](#text-regions-and-markdown-in-eleventy).

## Data paths in Eleventy

`data-prop` names the path in the file being edited — never the template's variable name for it. Inside a `for` loop over an array region, paths are relative to the item: `data-prop="title"`, not `block.title`. An `assign` alias (`{% assign hero = page_hero %}`) binds to `page_hero`.

Eleventy's data cascade renders values that live outside the page file. These have no path the editor can write to:

| Value comes from                                                                       | Region?                          |
| -------------------------------------------------------------------------------------- | -------------------------------- |
| The page file's front matter                                                           | Yes — relative path              |
| A data file in `_data/` (JSON or YAML)                                                 | Yes — `@data[<name>]`, see below |
| A layout's front matter                                                                | No — leave read-only             |
| `eleventyComputed`                                                                     | No — leave read-only             |
| JavaScript data (`_data/*.js`, `*.11tydata.js`), directory data files, `addGlobalData` | No — leave read-only             |

A region bound to one of these shows an error card naming the path. Leave the value read-only, or move it into the page's front matter if editors need it per page.

### Data files and `@data`

JSON and YAML files in `<input>/_data/` (YAML only when the config registers it — see [configuration.md § Data files](../../cloudcannon-configuration/eleventy/configuration.md#data-files)) are editable through `data_config` and `@data[<name>]` selectors, from any page. Primitive regions on them work in a layout as they are:

```liquid
<p><editable-text data-prop="@data[footer].copyright">{{ footer.copyright }}</editable-text></p>
```

**MUST:** pass global data into a component include through the region, with the data file as its `data-prop`. Never let the include read `_data` by name.
**Why:** the editor's engine has no global data. An include that reads `nav.links` directly renders empty after an edit, or shows the build-time value.

```liquid
{%- comment -%} layout {%- endcomment -%}
<editable-component data-component="components/navbar" data-prop="@data[nav]">
  {% includeWith "components/navbar", nav %}
</editable-component>

{%- comment -%} _includes/components/navbar.liquid — fields of nav are top-level {%- endcomment -%}
<nav data-editable="array" data-prop="links">
  {% for link in links %}
    <a data-editable="array-item" href="{{ link.url }}"><editable-text data-prop="text">{{ link.text }}</editable-text></a>
  {% endfor %}
</nav>
```

Inside the component, selectors are relative to `@data[nav]` — `data-prop="links"`, not `@data[nav].links`.

**MUST:** register `<name>` in `data_config`. Otherwise the selector never resolves.

The plugin's `globals` option embeds a JSON snapshot in the bundle at build time. Use it only for values editors never change (a site name, an API base URL), and never for secrets.

## Text regions and markdown in Eleventy

A rich text region on a `markdown` input saves markdown ([../visual-editing-reference.md § Text editing](../visual-editing-reference.md#text-editing)). Eleventy has no built-in markdown filter for template fields: sites register one, usually with `markdown-it`. Find it in the config before wiring regions.

| `data-type`         | Render the field as                                 |
| ------------------- | --------------------------------------------------- |
| `span` (or omitted) | `{{ field }}`                                       |
| `text`              | `{{ field \| markdown }}` — the site's filter       |
| `block`             | `{{ field \| markdown }}` on a block host (`<div>`) |

On a site with no markdown filter, register one (`markdown-it` is browser-safe and mirrors into the editor), or make the region `data-type="span"` if the field never holds formatting.

**MUST NOT:** name the markdown filter `renderContent`, or use Eleventy's `renderContent: "md"` from the Render plugin, in a component include.
**Why:** the plugin reserves `renderContent`, and its browser version renders only Liquid and HTML. Markdown shows raw in the editor. Rename the filter (`renderMarkdown`) and update its callers.

## Nunjucks sites

Nunjucks templates can't be component regions, but the site keeps its includes: shared partials stay reusable and editable through primitive regions. Primitive regions (`text`, `image`, `array`, `source`, `@content`, `@data`) work with no plugin and no script tag. These rules replace the Liquid sections above.

**Paths.** A Nunjucks include sees the caller's whole context, layouts included, so `data-prop` is the real front-matter path. Inside an array loop, paths are relative to the `array-item`, whatever the loop variable, `set` alias or `renderFile` data is called.

**MUST:** write every `data-prop` in a shared include so it resolves to the right stored path from every place the include is used. Relative paths inside an `array-item` do this for any array.
**Why:** the include's `data-prop` is written once, and it reads the caller's context. An include that would need a different path per caller (a `card.njk` that renders `hero` on one page and `promo` on another through a `set` alias) can't be made editable without restructuring — ask the user.

**Page builders use template arrays.** Nothing re-renders, so "Add" builds a new block from a `<template>` blueprint. Put one blueprint per block type inside the array container, rendered by the same include with an empty block:

```njk
<div data-editable="array" data-prop="content_blocks" data-id-key="_type">
  {% for block in content_blocks %}
    <section data-editable="array-item" data-id="{{ block._type }}">
      {% include "blocks/" + block._type + ".njk" %}
    </section>
  {% endfor %}
  {% set block = {} %}
  <template data-id="hero"><section>{% include "blocks/hero.njk" %}</section></template>
  <template data-id="text"><section>{% include "blocks/text.njk" %}</section></template>
</div>
```

The blueprint rules are in [../visual-editing-reference.md § When HTML `<template>` blueprints are needed](../visual-editing-reference.md#when-html-template-blueprints-are-needed). Adding blocks also needs `_structures` on the array's input.

**MUST:** use the block type as `data-id`, make every visible part of a block a region, and put no `{% if %}` around a block's optional parts.
**Why:** `data-id` both matches items and picks the blueprint. A unique id per item breaks adding, because no blueprint matches it. With type ids, reordering two blocks of the same type can reuse the other block's DOM, so anything outside a region shows the other block's markup — and an edit there saves into the wrong block.

**Until the next build**, these don't update in the editor: values passed through a filter, class, style and conditional bindings, and the conditional parts of a new block. Record them in the census as primitives plus a rebuild note.

**Keep** the array container rendered when the list is empty — see [§ `ENV_CLIENT` in Eleventy](#env_client-in-eleventy) for the guard.

**Not editable through page paths:** layout front matter, `eleventyComputed` and JS data, as in [§ Data paths in Eleventy](#data-paths-in-eleventy). `.njk` page files open and edit like `.md`.

**MUST NOT:** convert templates to Liquid, or rewrite includes as macros, to get component regions without asking the user. Macros aren't supported.

## Checking re-renders locally

The bundle installs `window.cc_components[<name>]`, an async `(props) => HTMLElement` renderer for each component — the call the editor makes. Render every component region's data through it in Node, to catch editor-only failures before handing off. Write the script for the site; requirements:

- **Shim** the browser globals the bundle touches before importing it: `window` (as `globalThis`), `document` (with `createElement` returning an object with an `innerHTML` property), `customElements`, `HTMLElement`, `MutationObserver`, `requestAnimationFrame`, `location`. Don't touch `navigator` — Node defines it read-only.
- **Import** `_site/register-components.js`, then **wait** for `window.cc_components` to appear. It is published after the config replay, asynchronously.
- **Read** every page's front matter, and every `@data` file a component region binds.
- **Call** `await window.cc_components[block._type](block)` for every page-builder block, and the bound value for every standalone component region.
- **Fail** on a thrown error, an empty result, or a block whose visible text is missing from the build output for that page.

A pass shows the includes render from their own data. It doesn't prove the editor works — a site can pass every local check and still fail in the editor. Say so in the handoff.

## Troubleshooting

Eleventy-specific symptom → fix is in [troubleshooting.md](troubleshooting.md); generic symptoms are in [../troubleshooting.md](../troubleshooting.md).
