# Custom editor tooling

Rules for building your own UI inside the Visual Editor: a bulk image uploader, a "fill from template" button, a picker that writes several fields at once. The API itself is in [editable-regions-internals.md § CloudCannon JavaScript API](editable-regions-internals.md#cloudcannon-javascript-api). For a method or option not listed there, read the package's types; see [§ Reading the API's own types](editable-regions-internals.md#reading-the-apis-own-types).

A tool is editor-only code that reads or writes the page's data through the API, and lives inside markup the editor re-renders. It is extra code the site has to maintain.

**MUST NOT:** build a tool during a migration, or because an input feels clumsy at first sight.
**Why:** inputs and regions cover almost every editing job, and editors already know them. A tool fits a gap that people editing the site have found and asked to close, such as adding forty gallery images one at a time. Before building one, check whether an input option or a structure already does the job.

## Load tool code only in the editor

**MUST:** load the tool from the same editor-only entry point that registers components, behind `window.inEditorMode`, with a dynamic `import()`.
**Why:** production never downloads the code, and a custom element that is never defined in production renders nothing there. `window.inEditorMode` is set before the page's scripts run; see [visual-editing-reference.md § Load-time behaviour in the editor](visual-editing-reference.md#load-time-behaviour-in-the-editor).

```javascript
if (window.inEditorMode) {
  import("./editor-tools/bulk-uploader.js").catch((e) =>
    console.error("Editor tool failed to load:", e),
  );
}
```

Load each tool in its own `import()`, so one failing doesn't stop component registration.

`window.CloudCannonAPI` can arrive after the tool's module runs. Get the API through a helper that waits for `cloudcannon:load` when it is not there yet:

```javascript
const apiReady = window.CloudCannonAPI
  ? Promise.resolve(window.CloudCannonAPI.useVersion("v1", true))
  : new Promise((resolve) =>
      document.addEventListener(
        "cloudcannon:load",
        () => resolve(window.CloudCannonAPI.useVersion("v1", true)),
        {
          once: true,
        },
      ),
    );
```

## Hide the tool outside the editor with `:defined`

Put the tool's custom element in the component's markup, and hide it until it is defined:

```css
bulk-uploader {
  display: none;
}
bulk-uploader:defined {
  display: block;
}
```

The element is defined only where the editor-only import ran, so production and the hosted static copy never show it.

## Keep the tool's UI in a shadow root

**MUST:** render the tool's UI into a shadow root, and keep its state in JS properties or the shadow root, not in light-DOM children or attributes on the host.
**Why:** when a registered component re-renders, the runtime diffs the host's light DOM against the fresh render. Children the render doesn't contain are removed, and attributes it doesn't carry are stripped. The diff never enters a shadow root.

```javascript
class BulkUploader extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" }).innerHTML =
      `<style>…</style><label>Add images<input type="file" multiple hidden></label>`;
  }
}
if (!customElements.get("bulk-uploader")) customElements.define("bulk-uploader", BulkUploader);
```

**Common miss:** UI built with `this.innerHTML` works until the first edit, then leaves an empty, sized element behind.

### Tools written in React or another framework

Mount the framework's root inside the custom element's shadow root. The element loads, hides and places like any other tool, in any SSG, and the framework's state survives the component's re-renders.

```jsx
import { createRoot } from "react-dom/client";

class AltTextTool extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const mount = document.createElement("div");
    this.attachShadow({ mode: "open" }).append(mount);
    createRoot(mount).render(<Tool host={this} />);
  }
}
```

Pass the host element into the component, so it can dispatch events from the light DOM.

## Place the tool beside the region, not inside it

**MUST:** place the tool's element outside any `data-editable="array"` element, as a sibling inside a shared wrapper.
**Why:** an array treats every direct child as an item; see [visual-editing-reference.md § Don't mix array items with non-array siblings](visual-editing-reference.md#dont-mix-array-items-with-non-array-siblings).

```html
<div class="gallery" style="position: relative">
  <div data-editable="array" data-prop="images">…</div>
  <bulk-uploader></bulk-uploader>
</div>
```

## Write through the region, so the path resolves itself

**MUST:** write data by dispatching a bubbling `cloudcannon-api` event from the region whose data changes, or from the tool's host element, with `source` relative to the element it is sent from.
**Why:** each editable ancestor prefixes its own `data-prop` as the event bubbles, and an `@data[...]`, `@file[...]` or `@collections[...]` source routes the write to that file. A tool inside a page-builder block writes to `content_blocks.3.images` without knowing its index. Building the slug by hand for `file.data.*` means re-deriving every ancestor's path, and writes to the wrong file when a region's source isn't the current page.

```javascript
arrayEl.dispatchEvent(
  new CustomEvent("cloudcannon-api", {
    bubbles: true,
    detail: {
      action: "add-array-item",
      source: arrayEl.dataset.prop,
      newIndex: arrayEl.querySelectorAll(':scope > [data-editable="array-item"]').length,
      value: { image: url, image_alt: "" },
    },
  }),
);
```

| `action`            | Detail fields                                    | Calls                       |
| ------------------- | ------------------------------------------------ | --------------------------- |
| `set`               | `source`, `value`                                | `file.data.set`             |
| `add-array-item`    | `source`, `newIndex`, `value`                    | `file.data.addArrayItem`    |
| `remove-array-item` | `source`, `fromIndex`                            | `file.data.removeArrayItem` |
| `move-array-item`   | `source`, `fromIndex`, `toIndex`                 | `file.data.moveArrayItem`   |
| `get-input-config`  | `source`, `callback` (receives the input config) | `file.getInputConfig`       |

**Common miss:** an event dispatched from an element inside the tool's shadow root stops at the shadow boundary, and no region sees it. Dispatch from the region or the host element.

**Common miss:** `move-array-item` also accepts `fromSlug`, for a move between two arrays. Leave it out for a move within one array. `fromSlug` gets no ancestor's path in front, so a relative value names a field that doesn't exist and the move does nothing.

**Common miss:** a source starting `@data[...]`, `@file[...]` or `@collections[...]` works only when the event is sent from the region bound to that source. Sent from any other element, the nearest editable ancestor adds its own path to the front, and the write never reaches that file.

`source` ending in `@content` sets the file's body. Use `file.data.*` directly only for data the tool doesn't render inside a region, such as `api.file("data/settings.yml")`.

## Upload files with the field's input config

**MUST:** read the target field's input config with a `get-input-config` event, await it, and pass it to `api.uploadFile`.
**Why:** the input config sets the upload path and allowed types. `getInputConfig` returns a Promise; passed un-awaited it can't cross the editor's `postMessage` boundary, so the upload fails with `DataCloneError`.

For an array of images, read the config of the item's image field (`images.0.image`) through a `get-input-config` event from the array element, then call `uploadFile` once per file and add one item per URL. To fill one field, upload the same way and write the URL with a `set` event.

`file.data.upload(file, { slug })` uploads with the field's config and sets the field in one call, but `slug` is the full path from the file's root. Inside a page-builder block that means building the block's index from the DOM, so use it only for a field outside any block.

Each upload is an unsaved change. The editor's save writes the new files and the page together.

## Give the tool its own inputs with a data panel

When the tool needs inputs of its own, such as alt text for every image in a gallery at once, open a panel with `api.createCustomDataPanel`. The panel uses CloudCannon's inputs.

**MUST:** pass `config` as a cascade, with the inputs under `_inputs`, as in the configuration file.
**Why:** the panel reads input settings only from `_inputs`. A bare map of inputs is ignored, and every field falls back to its default type and label.

- `onChange` receives the panel's full data object on every keystroke. Compare it with the last value and write only what changed, with `set` events as above.
- Pass your own `id`, and close the panel with `api.destroyCustomDataPanel(id)`.
- `position` takes a `DOMRect`; the panel opens over that rectangle.
- The panel's inputs use only the `data` and `config` you pass. Set `allowFullDataCascade: true` to resolve them against the page and the site configuration, as the editor's own panels do.
- A region's own data panel shows a value the tool wrote only after it is closed and reopened.

Show each image beside its field by giving array items an image preview on the `[*]` key:

```javascript
const imgs = [...arrayEl.querySelectorAll(':scope > [data-editable="array-item"] img')];
let last = imgs.map((img) => img.alt);

api.createCustomDataPanel({
  id: "gallery-alt-text",
  title: "Alt text",
  data: { images: imgs.map((img) => ({ image: img.getAttribute("src"), alt_text: img.alt })) },
  config: {
    _inputs: {
      images: {
        type: "array",
        options: { disable_add: true, disable_remove: true, disable_reorder: true },
      },
      "images[*]": {
        type: "object",
        options: {
          preview: {
            text: [{ key: "alt_text" }, "No alt text"],
            image: [{ key: "image" }],
          },
        },
      },
      image: { type: "image", disabled: true },
      alt_text: { type: "text" },
    },
  },
  onChange: (data) => {
    data?.images?.forEach((item, i) => {
      if (item.alt_text === last[i]) return;
      arrayEl.dispatchEvent(
        new CustomEvent("cloudcannon-api", {
          bubbles: true,
          detail: {
            action: "set",
            source: `${arrayEl.dataset.prop}.${i}.alt_text`,
            value: item.alt_text,
          },
        }),
      );
    });
    last = data?.images?.map((item) => item.alt_text) ?? last;
  },
});
```

## Test in the Visual Editor

The API exists only inside the Visual Editor, so test the tool there, on the hosted site or through [`cloudcannon-dev-server`](../cloudcannon-dev-server/SKILL.md).

- Open devtools on the preview frame (right-click inside the preview → Inspect), not on the CloudCannon app.
- Log behind a `localStorage` flag, so the tool is silent unless someone is debugging it.
- Edit a field in the same component after using the tool, and check the tool's UI survives the re-render.
- Move the block to another position, use the tool again, and check the data lands in the moved block.
- Check the save dialog lists the expected files.
