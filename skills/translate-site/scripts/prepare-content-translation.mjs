#!/usr/bin/env node

/**
 * Preprocesses split-by-directory content collection files for AI translation.
 *
 * Compares every content file under the locale directory (subfolders included)
 * with the source-language file at the same relative path, identifies which
 * files need translation, and extracts translatable frontmatter fields (by
 * path, e.g. content_blocks.0.title) and body content into a task manifest.
 * The AI fills in translations, then merge-content-translation.mjs patches
 * them back.
 *
 * Front matter values the scanner can't read safely are listed under
 * `manual_frontmatter` for hand translation; TOML and JSON front matter are
 * reported as `unsupported_format`.
 *
 * Usage:
 *   node prepare-content-translation.mjs --source-dir src/content/blog --locale-dir src/content/blog_fr --locale fr
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, sep } from "node:path";
import { scanYaml, splitFile } from "./frontmatter.mjs";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let sourceDir = null;
let localeDir = null;
let locale = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--source-dir" && args[i + 1]) {
		sourceDir = args[++i];
	} else if (arg === "--locale-dir" && args[i + 1]) {
		localeDir = args[++i];
	} else if ((arg === "--locale" || arg === "-l") && args[i + 1]) {
		locale = args[++i];
	} else if ((arg === "--output" || arg === "-o") && args[i + 1]) {
		outputPath = args[++i];
	} else if (arg === "--help" || arg === "-h") {
		console.log(
			"Usage: node prepare-content-translation.mjs [options]\n\n" +
				"Preprocess content collection files for AI translation.\n\n" +
				"Options:\n" +
				"  --source-dir <dir>    Source content directory (e.g. src/content/blog)\n" +
				"  --locale-dir <dir>    Locale content directory (e.g. src/content/blog_fr)\n" +
				"  -l, --locale <code>   Locale code (required)\n" +
				"  -o, --output <path>   Task manifest output path\n" +
				"                        (default: .translation-task-<locale>-content-<locale-dir>.json)\n" +
				"  -h, --help            Show this help\n",
		);
		process.exit(0);
	}
}

if (!locale) {
	console.error("Error: --locale is required");
	process.exit(1);
}
if (!sourceDir) {
	console.error("Error: --source-dir is required");
	process.exit(1);
}
if (!localeDir) {
	console.error("Error: --locale-dir is required");
	process.exit(1);
}
if (!outputPath) {
	// One manifest per locale directory, in the working directory: never inside
	// a content directory, and never shared between two runs
	const slug = localeDir.replace(/^\.?\/+|\/+$/g, "").replace(/[^A-Za-z0-9_-]+/g, "-");
	outputPath = `.translation-task-${locale}-content-${slug}.json`;
}

// ---------------------------------------------------------------------------
// Field classification
// ---------------------------------------------------------------------------

const CONTENT_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);

// Field names whose values are never prose. Matched against the nearest named
// segment of the path, so `content_blocks.0.buttons.1.url` checks `url`.
const STRUCTURAL_FIELD_NAMES = new Set([
	"_schema",
	"_name",
	"_uuid",
	"_bookshop_name",
	"date",
	"publish_date",
	"created_date",
	"updated_date",
	"lastmod",
	"expirydate",
	"tags",
	"categories",
	"author",
	"authors",
	"image",
	"thumb_image_path",
	"featured_image",
	"canonical_url",
	"href",
	"url",
	"link",
	"src",
	"slug",
	"full_slug",
	"aliases",
	"open_graph_type",
	"author_twitter_handle",
	"no_index",
	"draft",
	"published",
	"layout",
	"type",
	"permalink",
	"weight",
	"identifier",
	"parent",
	"id",
	"target",
	"rel",
	"lang",
	"color",
	"colour",
	"icon",
	"class",
	"style",
	"variant",
	"size",
	"height",
	"width",
	"align",
	"alignment",
	"position",
	"anchor",
	"theme",
	"format",
	"new_tab",
]);

// Suffixes that mark a field as structural: text_color, button_icon, body_class, image_path …
const STRUCTURAL_SUFFIXES = [
	"_color",
	"_colour",
	"_icon",
	"_class",
	"_classes",
	"_url",
	"_link",
	"_path",
	"_image",
	"_src",
	"_id",
	"_anchor",
	"_type",
	"_style",
	"_size",
	"_position",
	"_align",
	"_alignment",
	"_layout",
];

function namedLeaf(dottedPath) {
	return (
		dottedPath
			.split(".")
			.reverse()
			.find((seg) => !/^\d+$/.test(seg)) ?? ""
	).toLowerCase();
}

function isStructuralField(dottedPath, value) {
	const leaf = namedLeaf(dottedPath);

	if (leaf.startsWith("_")) return true;
	if (STRUCTURAL_FIELD_NAMES.has(leaf)) return true;
	if (STRUCTURAL_SUFFIXES.some((suffix) => leaf.endsWith(suffix))) return true;
	// Hugo menus in front matter: only the label is text
	if (/^menus?\./.test(dottedPath) && leaf !== "name" && leaf !== "title") return true;

	if (/^(\/|https?:|mailto:|tel:|#[0-9a-f]{3,8}$)/i.test(value)) return true;
	if (/^(true|false|yes|no|null|~)$/i.test(value)) return true;
	if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
	if (/^[-+]?\d+(\.\d+)?(px|em|rem|%)?$/.test(value)) return true;
	// A single lowercase identifier: primary, top, docs, button-primary
	if (/^[a-z0-9]+([_-][a-z0-9]+)*$/.test(value)) return true;
	// No letters at all: $, +, —
	if (!/\p{L}/u.test(value)) return true;

	return false;
}

function isTranslatableField(dottedPath, value) {
	if (typeof value !== "string" || value.trim() === "") return false;
	return !isStructuralField(dottedPath, value);
}

// ---------------------------------------------------------------------------
// Scan files
// ---------------------------------------------------------------------------

// Every content file under `dir`, as paths relative to it (posix separators)
function listContentFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { recursive: true })
		.map((f) => f.split(sep).join("/"))
		.filter((f) => CONTENT_EXTENSIONS.has(extname(f).toLowerCase()))
		.sort();
}

function frontmatterFields(parsed) {
	const { slots, unsupported } = scanYaml(parsed.yaml);
	const fields = {};
	for (const slot of slots) {
		if (slot.style !== "flow") fields[slot.path] = slot.value;
	}
	return { fields, unsupported };
}

// Fields deliberately left the same as the source (a brand name in a title), recorded
// by merge-content-translation.mjs: { "<locale-dir>": { "<file>": { "<path>": "<source value>" } } }
const KEEP_PATH = "translate-site-keep-content.json";
const keepAll = existsSync(KEEP_PATH) ? JSON.parse(readFileSync(KEEP_PATH, "utf-8")) : {};
const keep = keepAll[localeDir.replace(/\/+$/, "")] ?? {};
let keptFieldCount = 0;

const localeFiles = listContentFiles(localeDir);

const manifest = {
	_meta: {
		locale,
		source_dir: sourceDir,
		locale_dir: localeDir,
	},
	files: {},
};

let untranslatedCount = 0;
let translatedCount = 0;
let noSourceCount = 0;
let unsupportedCount = 0;

for (const filename of localeFiles) {
	const localePath = join(localeDir, filename);
	const sourcePath = join(sourceDir, filename);

	if (!existsSync(sourcePath)) {
		manifest.files[filename] = { status: "no_source" };
		noSourceCount++;
		continue;
	}

	const sourceParsed = splitFile(readFileSync(sourcePath, "utf-8"));
	const localeParsed = splitFile(readFileSync(localePath, "utf-8"));

	if (
		sourceParsed.format === "toml" ||
		sourceParsed.format === "json" ||
		localeParsed.format !== sourceParsed.format
	) {
		manifest.files[filename] = {
			status: "unsupported_format",
			note: `${sourceParsed.format.toUpperCase()} front matter isn't supported. Translate this file by hand (Manual fallback).`,
		};
		unsupportedCount++;
		continue;
	}

	const source =
		sourceParsed.format === "yaml"
			? frontmatterFields(sourceParsed)
			: { fields: {}, unsupported: [] };
	const local =
		localeParsed.format === "yaml"
			? frontmatterFields(localeParsed)
			: { fields: {}, unsupported: [] };

	// Find translatable frontmatter fields that still match the source
	const translatableFields = {};
	let hasUntranslatedFields = false;

	for (const [path, sourceValue] of Object.entries(source.fields)) {
		if (!isTranslatableField(path, sourceValue)) continue;

		const localeValue = local.fields[path];
		if (localeValue === sourceValue && keep[filename]?.[path] === sourceValue) {
			keptFieldCount++;
			continue;
		}
		if (localeValue === sourceValue) {
			translatableFields[path] = sourceValue;
			hasUntranslatedFields = true;
		}
	}

	const bodyIdentical =
		sourceParsed.body.trim() !== "" && localeParsed.body.trim() === sourceParsed.body.trim();

	if (!hasUntranslatedFields && !bodyIdentical && local.unsupported.length === 0) {
		manifest.files[filename] = { status: "already_translated" };
		translatedCount++;
		continue;
	}

	const entry = {
		status: "untranslated",
		locale_path: localePath,
		source_path: sourcePath,
		translatable_frontmatter: translatableFields,
	};

	if (bodyIdentical) {
		entry.body = sourceParsed.body;
	}

	if (local.unsupported.length > 0) {
		// The scanner can't safely read these values; the merge won't touch them
		entry.manual_frontmatter = local.unsupported.map(
			(u) => `${u.path} (file line ${u.line + 1}: ${u.reason})`,
		);
	}

	if (!hasUntranslatedFields && !bodyIdentical) {
		// Only manual fields left
		entry.status = "manual_only";
	} else {
		untranslatedCount++;
	}

	manifest.files[filename] = entry;
	if (entry.manual_frontmatter) unsupportedCount++;
}

// ---------------------------------------------------------------------------
// Write manifest
// ---------------------------------------------------------------------------

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const total = localeFiles.length;
console.log(`Content collection: ${localeDir} (${total} files)`);
console.log(`  Already translated:  ${translatedCount}`);
console.log(`  Needs translation:   ${untranslatedCount}`);
if (noSourceCount > 0) {
	console.log(`  No source file:      ${noSourceCount}`);
}
if (keptFieldCount > 0) {
	console.log(`  Fields kept as source: ${keptFieldCount} (${KEEP_PATH})`);
}
if (unsupportedCount > 0) {
	console.log(
		`  Need manual work:    ${unsupportedCount} (see manual_frontmatter / unsupported_format in the manifest)`,
	);
}
console.log("");

if (untranslatedCount === 0 && unsupportedCount === 0) {
	console.log("Nothing to translate — all files are already translated.");
} else {
	console.log(`Task manifest written to ${outputPath}`);
}
