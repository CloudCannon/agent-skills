# The dev server HTTP API

`cloudcannon dev` serves the CloudCannon app, the built site and this API on one origin,
`http://localhost:10101` by default. Everything here is unauthenticated and needs no browser.

## Routes

| Route                  | Method | Returns                                                          |
| ---------------------- | ------ | ---------------------------------------------------------------- |
| `/` and `/index.html`  | GET    | The CloudCannon app, **not** the site's homepage                 |
| `/__api/details`       | GET    | `{ sourceFiles, outputDir, siteName, userName }`                 |
| `/__api/megafile`      | GET    | NDJSON of every non-binary source file with content, size, mtime |
| `/__api/file/<path>`   | GET    | `{ content, file_size, last_modified }`                          |
| `/__api/upload/<path>` | POST   | Writes the body to disk as the app would                         |
| `/__api/move_path`     | POST   | `{ paths: [{ source, target }], allow_overwrite }`               |
| `/__api/delete_path`   | POST   | `{ paths: [{ target }] }`                                        |
| `/__api/events`        | GET    | SSE stream of file changes                                       |
| `/__source/<path>`     | GET    | Raw source file contents                                         |
| `/__output/<path>`     | GET    | A file from the built output                                     |
| anything else          | GET    | Falls through to the built output                                |

**The built homepage is at `/__output/index.html`.** `/` and `/index.html` are claimed by the app
before the fall-through applies, so they are the one pair of paths the fall-through does not cover.

The field names are `file_size` and `last_modified` — not `size` / `mtime`.

`siteName` is the project directory's basename, titleized, and `outputDir` is relative. Neither
identifies a site — see [setup.md § Ports](setup.md#ports).

## No directory index

**A request for a directory returns 500, not 404.**
**Why:** the server opens the path as a file; on a directory that raises EISDIR, which surfaces
as a 500. `/about/` fails, `/about/index.html` succeeds. A 500 here means "that is a directory", not
"the server is broken".

## Events

`/__api/events` is a Server-Sent Events stream, debounced by 200ms per path.

| Event                                       | Fires when                                                            |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `file-create` / `file-edit` / `file-delete` | A **source** file changes on disk                                     |
| `output-change`                             | Files in the output directory change; batched into `{ paths: [...] }` |

The CloudCannon app reloads its preview on `output-change`, which is what makes the loop close
without a manual refresh.

**A write through `/__api/upload` to a file that already exists produces no `file-edit`.**
**Why:** the server marks the path before writing and drops the watcher event that comes back, so
the stream reports external writes only. A save made in the editor takes the same route and is
equally silent.

**An upload that creates a new file does produce `file-create`.** The mark is only set for a path
that already exists, so creates and deletes are never suppressed — only edits.

| You want to know                           | Use                                         |
| ------------------------------------------ | ------------------------------------------- |
| Whether a file on disk holds an edit       | Read the file                               |
| Whether the output was regenerated         | `output-change`, or read `/__output/<path>` |
| What an external tool or build is touching | The event stream                            |

**MUST NOT capture the event stream into a file inside the watched directory.**
**Why:** the watcher sees the capture file grow, emits `file-edit` for it, which grows the capture
file again. A few hundred events arrive within seconds, none of them about the file under test,
and the stream reads as though every write is being echoed. Write the capture outside the site
root.
