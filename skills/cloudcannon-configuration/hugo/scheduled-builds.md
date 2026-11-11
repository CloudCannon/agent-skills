# Scheduled builds (Hugo)

Hugo's delta on [../scheduled-builds.md](../scheduled-builds.md). Read that first.

## Hugo already leaves future pages out

Hugo skips a page whose `publishDate` is after the build time, unless `buildFuture` is on. Check the build command doesn't pass `-F` or `--buildFuture`, and no site config or environment config sets `buildFuture: true`.

## Build the schedule from `hugo list future`

`hugo list future` prints, as CSV, exactly the pages Hugo held back. Pass it the same config and environment flags the build passes.

| Column        | Use as                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| `path`        | Source path, relative to where `hugo` runs                               |
| `publishDate` | Run date, already in RFC 3339 with its offset — the date Hugo filters on |

**MUST:** parse the output as CSV. Don't split lines on commas.
**Why:** Hugo quotes a `title` that holds a comma, so splitting shifts every later column.
