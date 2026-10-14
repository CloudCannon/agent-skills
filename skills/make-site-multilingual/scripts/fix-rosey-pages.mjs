#!/usr/bin/env node
// Fixes what `rosey build` leaves in the default language on the locale pages
// it generates. Run it after `rosey build`, while the untranslated copy still
// exists. Default-language-at-root mode only.
//
// A generated page is one in <dest>/<locale>/ with no file at the same path in
// <source>/<locale>/. On each one it points <link rel="canonical">, og:url and
// alias redirects (<meta http-equiv="refresh">) at the locale copy of the page
// they name, when that copy exists: its own URL, or another page's (a paginator
// page whose canonical is its listing). A URL with no locale copy, such as a
// canonical on another site, is left alone.
//
// Sitemaps are left to the site: how they are split and written varies too much
// to handle here.
//
// With --pager-segment page, it also deletes generated paginator pages
// (<listing>/page/N/) whose listing the SSG built in the locale itself, and
// removes the hreflang links pointing at them. Rosey builds those from the
// default-language listing, so they list default-language posts and nothing
// links to them.
//
// Usage:
//   node fix-rosey-pages.mjs --source _untranslated_site --dest dist --locales fr,de [--pager-segment page]

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
	options: {
		source: { type: "string" },
		dest: { type: "string" },
		locales: { type: "string" },
		"pager-segment": { type: "string" },
	},
});
if (!values.source || !values.dest || !values.locales) {
	console.error(
		"Usage: fix-rosey-pages.mjs --source <dir> --dest <dir> --locales fr,de [--pager-segment page]",
	);
	process.exit(1);
}

const pagerSegment = values["pager-segment"];
const pagerRe = pagerSegment ? new RegExp(`^(.*?)${pagerSegment}/\\d+/index\\.html$`) : null;

function htmlFiles(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".html"));
}

// "blog/post/index.html" -> "/blog/post/"; "404.html" -> "/404.html"
function urlPath(file) {
	return (
		"/" +
		file
			.split(path.sep)
			.join("/")
			.replace(/(^|\/)index\.html$/, "$1")
	);
}

// Splits an absolute or root-relative URL into origin and path; null for anything else.
function splitUrl(url) {
	const m = url.match(/^(https?:\/\/[^/]+)?(\/[^?#]*)(.*)$/);
	return m ? { origin: m[1] ?? "", path: m[2], rest: m[3] } : null;
}

function fixHead(html, locale, destDir) {
	// The locale URL of the page `url` names, if that page has a locale copy
	const localized = (url) => {
		const u = splitUrl(url);
		if (!u || u.path.startsWith(`/${locale}/`)) return url;
		const target = path.join(destDir, u.path, u.path.endsWith("/") ? "index.html" : "");
		return fs.existsSync(target) ? `${u.origin}/${locale}${u.path}${u.rest}` : url;
	};
	return html.replace(/<(link|meta)\b[^>]*>/g, (tag) => {
		if (/\brel=["']?canonical\b/.test(tag)) {
			return tag.replace(/\bhref=(["'])(.*?)\1/, (_, q, url) => `href=${q}${localized(url)}${q}`);
		}
		if (/\bproperty=["']?og:url\b/.test(tag)) {
			return tag.replace(
				/\bcontent=(["'])(.*?)\1/,
				(_, q, url) => `content=${q}${localized(url)}${q}`,
			);
		}
		if (/\bhttp-equiv=["']?refresh\b/i.test(tag)) {
			return tag.replace(/(url=)([^"'\s>]+)/i, (_, pre, url) => pre + localized(url));
		}
		return tag;
	});
}

function removeHreflangLinks(dir, urls) {
	for (const file of htmlFiles(dir)) {
		const full = path.join(dir, file);
		const html = fs.readFileSync(full, "utf8");
		const out = html.replace(/[ \t]*<link\b[^>]*\bhreflang=[^>]*>\n?/g, (tag) => {
			const href = tag.match(/\bhref=["']?([^"'\s>]+)/)?.[1] ?? "";
			return urls.has(splitUrl(href)?.path) ? "" : tag;
		});
		if (out !== html) fs.writeFileSync(full, out);
	}
}

for (const locale of values.locales.split(",")) {
	const srcDir = path.join(values.source, locale);
	const destDir = path.join(values.dest, locale);
	const generated = htmlFiles(destDir).filter((f) => !fs.existsSync(path.join(srcDir, f)));
	const deleted = new Set();

	for (const file of generated) {
		const full = path.join(destDir, file);
		const pager = pagerRe && file.split(path.sep).join("/").match(pagerRe);
		if (pager && fs.existsSync(path.join(srcDir, pager[1], "index.html"))) {
			fs.rmSync(path.dirname(full), { recursive: true });
			deleted.add(`/${locale}${urlPath(file)}`);
			continue;
		}

		const html = fs.readFileSync(full, "utf8");
		fs.writeFileSync(full, fixHead(html, locale, destDir));
	}

	if (deleted.size) removeHreflangLinks(values.dest, deleted);

	console.log(
		`fix-rosey-pages [${locale}]: ${generated.length} generated pages, ${deleted.size} paginator pages deleted`,
	);
}
