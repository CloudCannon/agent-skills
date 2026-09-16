#!/usr/bin/env node
// Re-runs a site's build command whenever a source file changes, so the output
// directory `cloudcannon dev` serves stays current without anyone rebuilding by
// hand.
//
// Usage: node watch-build.mjs --build-cmd "npm run build" --output _site [--root DIR]
//
// Watches --root recursively and ignores --output, so the build's own writes
// cannot retrigger it.

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { parseArgs, handleHelp, fail } from "./lib/args.mjs";

const USAGE = `
watch-build.mjs — rebuild on source change

  --build-cmd CMD   Shell command that builds the site (required)
  --output DIR      Output directory to ignore, relative to --root (required)
  --root DIR        Directory to watch (default: cwd)
  --debounce MS     Quiet period before rebuilding (default: 300)
`;

const { flags } = parseArgs();
handleHelp(flags, USAGE);

const buildCmd = flags["build-cmd"];
const outputFlag = flags.output;
if (typeof buildCmd !== "string") fail("--build-cmd is required");
if (typeof outputFlag !== "string") fail("--output is required");

const root = resolve(typeof flags.root === "string" ? flags.root : process.cwd());
const output = resolve(root, outputFlag);
const debounceMs = Number.parseInt(flags.debounce ?? "300", 10);

// Directories whose churn never warrants a rebuild. The output directory is
// handled separately because it is the build's own target.
const IGNORED = new Set(["node_modules", ".git", ".cache", ".astro", ".netlify"]);

function isIgnored(filename) {
	if (!filename) return true;
	const full = resolve(root, filename);
	if (full === output || !relative(output, full).startsWith("..")) return true;
	return filename.split(sep).some((part) => IGNORED.has(part) || part.startsWith(".#"));
}

let building = false;
let pending = false;
let timer;

function build() {
	if (building) {
		// A change arrived mid-build; the build may have already read the old
		// file, so queue one more pass rather than dropping it.
		pending = true;
		return;
	}
	building = true;
	const started = Date.now();
	const child = spawn(buildCmd, { cwd: root, shell: true, stdio: "inherit" });
	child.on("exit", (code) => {
		building = false;
		const secs = ((Date.now() - started) / 1000).toFixed(1);
		console.log(
			code === 0
				? `rebuilt in ${secs}s`
				: `build failed (exit ${code}) after ${secs}s — the served output is unchanged`,
		);
		if (pending) {
			pending = false;
			build();
		}
	});
}

const watcher = watch(root, { recursive: true }, (_event, filename) => {
	if (isIgnored(filename)) return;
	clearTimeout(timer);
	timer = setTimeout(build, debounceMs);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		watcher.close();
		process.exit(0);
	});
}

console.log(`watching ${root} — rebuilding with: ${buildCmd}`);
