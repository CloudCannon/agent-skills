#!/usr/bin/env node
// Re-runs a site's build whenever a source file changes, so the directory
// `cloudcannon dev` serves stays current without anyone rebuilding by hand.
//
// A stopgap: `cloudcannon dev` is expected to build and watch for itself. Keep
// this small enough to delete in one commit — anything a different --build-cmd
// or --watch can already express does not get an option.
//
// Usage: node watch-build.mjs --build-cmd "npm run build" --watch DIR [--watch DIR]... [--root DIR]

import { spawn } from "node:child_process";
import { existsSync, statSync, watch } from "node:fs";
import { join, resolve } from "node:path";

const USAGE = `
watch-build.mjs — rebuild a site when its source changes

  node watch-build.mjs --build-cmd CMD --watch DIR [flags]

  --build-cmd CMD   Shell command that builds the site (required)
  --watch DIR       Source directory to watch; repeatable (at least one required)
  --root DIR        Project root (default: cwd)
  --debounce MS     Quiet period before rebuilding (default: 300)
`;

/** Root-level churn that is never an edit: editor scratch, and build lock files. */
const NOISE = /^(\.DS_Store|Thumbs\.db|\.hugo_build\.lock|4913)$|^\.#|~$|\.sw[a-p]$/;

function parseArgs(argv) {
	const flags = {};
	const watchDirs = [];
	for (let i = 0; i < argv.length; i++) {
		const [name, inline] = argv[i].replace(/^--?/, "").split(/=(.*)/s);
		const value = inline ?? (argv[i + 1]?.startsWith("-") === false ? argv[++i] : true);
		if (name === "watch") watchDirs.push(value);
		else flags[name] = value;
	}
	return { flags, watchDirs };
}

const { flags, watchDirs } = parseArgs(process.argv.slice(2));
if (flags.help || flags.h) {
	console.log(USAGE.trim());
	process.exit(0);
}

const buildCmd = flags["build-cmd"];
if (typeof buildCmd !== "string") {
	console.error("error: --build-cmd is required");
	process.exit(1);
}

// The directories a source edit lands in, named by whoever knows the site. An
// allowlist, not "everything except the output directory": a build that writes
// back into the tree cannot retrigger a watcher that was never pointed at its
// target.
if (watchDirs.length === 0 || watchDirs.some((dir) => typeof dir !== "string")) {
	console.error("error: --watch DIR is required; pass each source directory the site edits");
	process.exit(1);
}

const root = resolve(typeof flags.root === "string" ? flags.root : ".");
const debounceMs = Number.parseInt(flags.debounce ?? "300", 10);
const missing = watchDirs.filter((dir) => !existsSync(join(root, dir)));
if (missing.length) {
	console.error(`error: --watch directory not found under ${root}: ${missing.join(" ")}`);
	process.exit(1);
}

let building = false;
let pending = false;
let lastEnded = 0;
let backToBack = 0;

function build() {
	if (building) {
		// The build may have already read the file that just changed, so queue one
		// more pass rather than drop the edit.
		pending = true;
		return;
	}
	// A rebuild that starts the instant the last one ended, five times running, is
	// the build feeding itself through a watched directory. Stop loudly: a runaway
	// loop is otherwise silent apart from the fan.
	backToBack = lastEnded && Date.now() - lastEnded < 1000 ? backToBack + 1 : 0;
	if (backToBack >= 5) {
		console.error(
			"the build keeps retriggering itself — it writes into a watched directory.\n" +
				"drop that directory from --watch, or have the build write elsewhere.",
		);
		process.exit(1);
	}

	building = true;
	const started = Date.now();
	const child = spawn(buildCmd, { cwd: root, shell: true, stdio: "inherit" });
	child.on("exit", (code) => {
		building = false;
		lastEnded = Date.now();
		const secs = ((lastEnded - started) / 1000).toFixed(1);
		console.log(
			code === 0
				? `built in ${secs}s`
				: `build failed (exit ${code}) after ${secs}s — the served output is unchanged`,
		);
		if (pending) {
			pending = false;
			build();
		}
	});
}

let timer;
function queue() {
	clearTimeout(timer);
	timer = setTimeout(build, debounceMs);
}

for (const dir of watchDirs) {
	watch(join(root, dir), { recursive: true }, (_event, name) => {
		if (name && !NOISE.test(name)) queue();
	});
}

// The root itself, one level deep, for `cloudcannon.config.yml` and the SSG's
// own config file. Directory entries are skipped, so the build output sitting
// at the root never registers.
watch(root, { recursive: false }, (_event, name) => {
	if (!name || NOISE.test(name)) return;
	try {
		if (!statSync(join(root, name)).isFile()) return;
	} catch {
		// Removed between the event and the check — a deleted config counts.
	}
	queue();
});

console.log(`watching: ${watchDirs.join(" ")} (and files in the project root)`);
console.log(`build:    ${buildCmd}`);
build();
