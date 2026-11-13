# Custom editor tooling

Rules for building your own UI inside the Visual Editor: a bulk image uploader, a "fill from template" button, a picker that writes several fields at once. The API itself is in [editable-regions-internals.md § CloudCannon JavaScript API](editable-regions-internals.md#cloudcannon-javascript-api).

Build a tool only when no input or region does the job. A tool is editor-only code that reads or writes the page's data through the API, and lives inside markup the editor re-renders.

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

**MUST:** write data by dispatching a bubbling `cloudcannon-api` event from the region whose data changes, with `source` relative to that region.
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
| `move-array-item`   | `source`, `fromIndex`, `toIndex`, `fromSlug`     | `file.data.moveArrayItem`   |
| `get-input-config`  | `source`, `callback` (receives the input config) | `file.getInputConfig`       |

`source` ending in `@content` sets the file's body. Use `file.data.*` directly only for data the tool doesn't render inside a region, such as `api.file("data/settings.yml")`.

## Upload files with the field's input config

**MUST:** pass the target field's input config to `api.uploadFile`, awaited, or use `file.data.upload(file, { slug })` when the upload fills one field.
**Why:** the input config sets the upload path and allowed types. `getInputConfig` returns a Promise; passed un-awaited it can't cross the editor's `postMessage` boundary, so the upload fails with `DataCloneError`.

For an array of images, read the config of the item's image field (`images.0.image`) through a `get-input-config` event from the array element, then call `uploadFile` once per file and add one item per URL.

Each upload is an unsaved change. The editor's save writes the new files and the page together.

## Test in the Visual Editor

The API exists only inside the Visual Editor, so test the tool there, on the hosted site or through [`cloudcannon-dev-server`](../cloudcannon-dev-server/SKILL.md).

- Open devtools on the preview frame (right-click inside the preview → Inspect), not on the CloudCannon app.
- Log behind a `localStorage` flag, so the tool is silent unless someone is debugging it.
- Edit a field in the same component after using the tool, and check the tool's UI survives the re-render.
- Move the block to another position, use the tool again, and check the data lands in the moved block.
- Check the save dialog lists the expected files.
