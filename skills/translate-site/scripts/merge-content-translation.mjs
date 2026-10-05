#!/usr/bin/env node

/**
 * Merges AI-translated content back into locale collection MDX/MD files.
 *
 * Reads the task manifest produced by prepare-content-translation.mjs (with
 * translated frontmatter fields and body filled in by the AI) and patches the
 * translations into the locale files. Each field's lines are replaced in place,
 * then the front matter is read back: if a translated field doesn't decode to
 * its translation, or any other field changed, the file is left unchanged.
 *
 * Usage:
 *   node merge-content-translation.mjs --input .translation-task-fr-content.json [--dry-run]
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { renderSlot, scanYaml, splitFile } from "./frontmatter.mjs";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let inputPath = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if ((arg === "--input" || arg === "-i") && args[i + 1]) {
		inputPath = args[++i];
	} else if (arg === "--dry-run") {
		dryRun = true;
	} else if (arg === "--help" || arg === "-h") {
		console.log(
			"Usage: node merge-content-translation.mjs --input <path> [--dry-run]\n\n" +
				"Merge AI translations from task manifest into content files.\n\n" +
				"Options:\n" +
				"  -i, --input <path>    Task manifest path (required)\n" +
				"  --dry-run             Print changes without writing\n" +
				"  -h, --help            Show this help\n",
		);
		process.exit(0);
	}
}

if (!inputPath) {
	console.error("Error: --input is required");
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Read manifest
// ---------------------------------------------------------------------------

let manifest;
try {
	manifest = JSON.parse(readFileSync(inputPath, "utf-8"));
} catch (err) {
	console.error(`Error: Could not read manifest ${inputPath}: ${err.message}`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Frontmatter patching
// ---------------------------------------------------------------------------

/**
 * Replaces each translated field's lines in the YAML, then re-reads the result.
 * Returns { yaml, problems }; any problem means the file must not be written.
 */
function patchFrontmatter(yaml, translations) {
	const { slots } = scanYaml(yaml);
	const byPath = new Map(slots.map((slot) => [slot.path, slot]));
	const problems = [];
	const patches = [];

	for (const [path, value] of Object.entries(translations)) {
		const slot = byPath.get(path);
		if (!slot || slot.style === "flow") {
			problems.push(`field "${path}" not found in the front matter`);
			continue;
		}
		if (typeof value !== "string") {
			problems.push(`field "${path}": translation is not a string`);
			continue;
		}
		patches.push({ slot, value });
	}
	if (problems.length) return { yaml, problems };

	const lines = yaml.split("\n");
	for (const { slot, value } of patches.sort((a, b) => b.slot.start - a.slot.start)) {
		lines.splice(slot.start, slot.end - slot.start, ...renderSlot(slot, value));
	}
	const patched = lines.join("\n");

	// Read it back: every translated field must decode to the translation, and
	// every other field must be unchanged
	const after = new Map(scanYaml(patched).slots.map((slot) => [slot.path, slot.value]));
	for (const slot of slots) {
		const expected = Object.hasOwn(translations, slot.path)
			? normalizeTrailingNewline(translations[slot.path], slot)
			: slot.value;
		if (after.get(slot.path) !== expected) {
			problems.push(
				`field "${slot.path}" would read back as ${JSON.stringify(after.get(slot.path))}, expected ${JSON.stringify(expected)}`,
			);
		}
	}
	if (after.size !== byPath.size) problems.push("the number of front matter fields changed");

	return { yaml: patched, problems };
}

// A block scalar keeps at most one trailing newline; others never end in one
function normalizeTrailingNewline(value, slot) {
	if (slot.style === "literal" || slot.style === "folded")
		return value.replace(/\n+$/, (m) => (m ? "\n" : ""));
	return value;
}

// ---------------------------------------------------------------------------
// Process files
// ---------------------------------------------------------------------------

// Fields translated as identical to the source are recorded here, so
// prepare-content-translation.mjs doesn't offer them again
const KEEP_PATH = "translate-site-keep-content.json";
const keepAll = existsSync(KEEP_PATH) ? JSON.parse(readFileSync(KEEP_PATH, "utf-8")) : {};
const keepDirKey = String(manifest._meta?.locale_dir ?? "").replace(/\/+$/, "");
let keptFieldCount = 0;

const warnings = [];
let patchedCount = 0;
let skippedCount = 0;
let refusedCount = 0;

for (const [filename, entry] of Object.entries(manifest.files)) {
	if (entry.status !== "untranslated") continue;

	const hasTranslatedFrontmatter =
		entry.translated_frontmatter && Object.keys(entry.translated_frontmatter).length > 0;
	const hasTranslatedBody = typeof entry.translated_body === "string";

	if (!hasTranslatedFrontmatter && !hasTranslatedBody) {
		skippedCount++;
		continue;
	}

	const localePath = entry.locale_path;
	let content;
	try {
		content = readFileSync(localePath, "utf-8");
	} catch (err) {
		warnings.push(`${filename}: Could not read ${localePath}: ${err.message}`);
		skippedCount++;
		continue;
	}

	const parsed = splitFile(content);
	if (parsed.format !== "yaml" && hasTranslatedFrontmatter) {
		warnings.push(`${filename}: no YAML front matter to patch — file left unchanged`);
		refusedCount++;
		continue;
	}

	let frontmatterYaml = parsed.yaml;
	let body = parsed.body;

	if (hasTranslatedFrontmatter) {
		const result = patchFrontmatter(frontmatterYaml, entry.translated_frontmatter);
		if (result.problems.length) {
			for (const problem of result.problems) warnings.push(`${filename}: ${problem}`);
			warnings.push(`${filename}: file left unchanged — fix the manifest, or translate it by hand`);
			refusedCount++;
			continue;
		}
		frontmatterYaml = result.yaml;
	}

	if (hasTranslatedBody) {
		body = entry.translated_body;
		if (!body.endsWith("\n")) body += "\n";
	}

	const output =
		parsed.format === "yaml" ? `${parsed.open}${frontmatterYaml}${parsed.close}${body}` : body;

	if (dryRun) {
		console.log(`\n--- ${filename} ---`);
		console.log(output);
	} else {
		writeFileSync(localePath, output);
	}

	for (const [path, value] of Object.entries(entry.translated_frontmatter ?? {})) {
		if (value === entry.translatable_frontmatter?.[path]) {
			((keepAll[keepDirKey] ??= {})[filename] ??= {})[path] = value;
			keptFieldCount++;
		}
	}

	patchedCount++;
}

if (!dryRun && keptFieldCount > 0) {
	writeFileSync(KEEP_PATH, JSON.stringify(keepAll, null, 2) + "\n");
	console.log(`Recorded ${keptFieldCount} fields kept as the source in ${KEEP_PATH}`);
}

// Clean up manifest, unless a file was refused and still needs it
if (!dryRun && patchedCount > 0 && refusedCount === 0) {
	try {
		unlinkSync(inputPath);
		console.log(`Removed task manifest ${inputPath}`);
	} catch {
		// Already removed
	}
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("");
console.log(`Patched:  ${patchedCount} files`);
if (skippedCount > 0) {
	console.log(`Skipped:  ${skippedCount} (no translations provided)`);
}
if (refusedCount > 0) {
	console.log(`Refused:  ${refusedCount} (see warnings; the manifest was kept)`);
}

if (warnings.length > 0) {
	console.log(`\nWarnings (${warnings.length}):`);
	for (const w of warnings) {
		console.log(`  ⚠ ${w}`);
	}
}
