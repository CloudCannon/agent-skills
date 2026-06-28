/**
 * Generates `_schedule.txt` from future-dated content for CloudCannon scheduled builds.
 *
 * Drop this into the target repo (e.g. `scripts/generate-schedule.mjs`) and run it
 * from a `.cloudcannon/postbuild` hook:
 *
 *   node scripts/generate-schedule.mjs dist/_schedule.txt
 *
 * Any entry whose date is in the future is also excluded from the build by the
 * publish gate (src/utils/posts.ts). This script lists those future dates so
 * CloudCannon can trigger a build at each one, publishing the entry automatically.
 *
 * Requires `js-yaml` (a transitive Astro dependency — declare it in package.json).
 *
 * ── ADAPT THESE FOUR CONSTANTS ───────────────────────────────────────────────
 */
const CONTENT_DIR = "src/content/blog";      // dir of .md/.mdx entries to scan
const DATE_PATH = ["post_hero", "date"];      // path to the date within front matter
const LABEL = "Publish Post";                  // middle column of each line
const DEFAULT_OUTPUT = "dist/_schedule.txt";   // used when no CLI arg is given
// ──────────────────────────────────────────────────────────────────────────────

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = fileURLToPath(new URL("..", import.meta.url)); // repo root if script lives in scripts/
const SCAN_DIR = join(ROOT, CONTENT_DIR);
const OUTPUT = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, DEFAULT_OUTPUT);

/** Pull the `---` front matter block out of a markdown/MDX file and parse it. */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? yaml.load(match[1]) : null;
}

/** Read a nested value by key path, e.g. ["post_hero", "date"]. */
function getPath(obj, path) {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** Format a date as `2026-10-22T10:00:00+00:00` (UTC, no milliseconds). */
function toScheduleTimestamp(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

const now = Date.now();
const entries = [];

const files = (await readdir(SCAN_DIR)).filter((f) => /\.(md|mdx)$/.test(f));
for (const file of files) {
  const fullPath = join(SCAN_DIR, file);
  const data = parseFrontmatter(await readFile(fullPath, "utf8"));
  const rawDate = getPath(data, DATE_PATH);
  if (!rawDate) continue;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    console.warn(`[schedule] skipping ${file}: unparseable date "${rawDate}"`);
    continue;
  }

  if (date.getTime() > now) {
    const sourcePath = relative(ROOT, fullPath);
    entries.push({ date, line: `${toScheduleTimestamp(date)},${LABEL},${sourcePath}` });
  }
}

entries.sort((a, b) => a.date - b.date);
const contents = entries.map((e) => e.line).join("\n");
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, contents ? `${contents}\n` : "");

console.log(
  `[schedule] ${entries.length} scheduled entr${entries.length === 1 ? "y" : "ies"} written to ${relative(ROOT, OUTPUT)}`,
);
