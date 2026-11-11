# Scheduled builds

CloudCannon reads `_schedule.txt` from the root of the build output after every build, and schedules a build for each line. Use it to publish future-dated content on its date without anyone triggering a build. Full reference: [Scheduling your next build automatically](https://cloudcannon.com/documentation/developer-articles/scheduling-your-next-build-automatically/).

It takes two parts of the build working together:

1. The SSG leaves out content dated after the time the build runs.
2. A step after the SSG writes `_schedule.txt`, with one line for each item the SSG left out.

At the scheduled time the item's date has passed, so that build includes it.

Each build replaces the schedule with the file it writes. When an editor moves an item's date into the past, the next build leaves its line out and CloudCannon drops that scheduled build. Nothing needs clearing by hand.

The file is served with the rest of the site, so anyone can read its build names and source paths. Tell the user that upcoming file paths, which usually include the slug, are public before they schedule anything they want kept secret.

## The file format

One build per line, three comma-separated fields:

```text
2030-10-22T10:00:00+00:00,Publish src/content/blog/launch-day.md,src/content/blog/launch-day.md
2030-11-22T09:00:00+10:00,Publish src/content/blog/year-in-review.md,src/content/blog/year-in-review.md
```

| Field       | Holds                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Run date    | ISO 8601 date and time with a UTC offset — the moment the SSG starts treating the item as published            |
| Build name  | The label shown under Site Settings > Schedule                                                                 |
| Source path | The item's file, relative to the site's source folder; the schedule's **Update** button opens it in the editor |

**MUST NOT:** put a comma in the build name. Build it from the source path, not the title.
**Why:** the format has no quoting, so a comma in a title shifts the source path into the wrong field.

**MUST:** write the run date in the zone the SSG reads the content date in. A date with no time or offset in front matter becomes midnight in that zone.
**Why:** a run date in a different zone fires before the item's date has passed, and that build leaves it out again.

## The SSG leaves future content out

**MUST:** compare each item's date to the time the build runs, using the same date field the schedule is built from.
**Why:** the scheduled build publishes the item only because its date is now in the past. A filter on another field, or against a fixed date, schedules a build that changes nothing.

Apply the filter wherever the item appears, not only on its own page: listings, feeds, sitemaps and search indexes too. A future-dated item isn't in the output, so the Visual Editor can't open it until it publishes; editors work on it in the Content Editor.

## Generate the schedule

**MUST:** generate `_schedule.txt` in the build from the dates that decide publishing, usually the content's front matter dates.
**Why:** a file written by hand, in the static folder or anywhere else, is a second copy of those dates. When an editor changes a date and the file isn't updated, the scheduled build runs at the wrong time, or the item never publishes.

When the user says something else decides publishing, such as a data file of release times or an external calendar, generate the schedule from that source instead, and filter on it too.

- **Run** the step after the SSG, chained with `&&`, writing to the root of the output directory.
- **Take** the list of items from the same query the filter uses, or from the SSG's own list where it has one.

**Common miss:** [build-commands.md § Where each step goes](build-commands.md#where-each-step-goes) puts a step that reads source content before the SSG. This one reads source content but writes into the output, which the SSG may clear, so it runs after.

## Check

- [ ] A local build's output root has `_schedule.txt`, with one line for each future-dated item
- [ ] No future-dated item appears anywhere in the local build's output
- [ ] Each line has exactly three fields
- [ ] After a CloudCannon build, Site Settings > Schedule > **Automatic** lists each scheduled build
