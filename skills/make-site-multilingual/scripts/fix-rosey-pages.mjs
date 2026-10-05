#!/usr/bin/env node
// Fixes what `rosey build` leaves in the default language on the locale pages
// it generates. Run it after `rosey build`, while the untranslated copy still
// exists. Default-language-at-root mode only.
//
// A generated page is one in <dest>/<locale>/ with no file at the same path in
// <source>/<locale>/. On each one it:
//
// 1. Points <link rel="canonical">, og:url and alias redirects
//    (<meta http-equiv="refresh">) at the locale copy of the page they name,
//    when that copy exists: its own URL, or another page's (a paginator page
//    whose canonical is its listing). A URL with no locale copy, such as a
//    canonical on another site, is left alone.
// 3. Adds the page to the sitemap when its default-language URL is in one of
//    the SSG's sitemaps, so pages the SSG left out stay out. It writes to
//    <dest>/<locale>/sitemap.xml if the SSG wrote one, otherwise to
//    <dest>/sitemap.xml, and skips a sitemap that is a <sitemapindex>.
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

// Every URL path listed in any sitemap*.xml in the untranslated site
function sitemapPathsIn(dir) {
	const paths = new Set();
	const files = fs
		.readdirSync(dir, { recursive: true })
		.filter((f) => /(^|\/)sitemap[^/]*\.xml$/.test(f));
	for (const file of files) {
		for (const m of fs.readFileSync(path.join(dir, file), "utf8").matchAll(/<loc>(.*?)<\/loc>/g)) {
			const u = splitUrl(m[1]);
			if (u) paths.add(u.path);
		}
	}
	return paths;
}

function addToSitemap(sitemap, paths) {
	const xml = fs.readFileSync(sitemap, "utf8");
	if (!xml.includes("<urlset")) {
		console.warn(`fix-rosey-pages: ${sitemap} is not a <urlset>; add the locale pages yourself`);
		return 0;
	}
	// Reuse the origin the SSG wrote into its own <loc> values (empty if they are root-relative)
	const firstLoc = xml.match(/<loc>(.*?)<\/loc>/)?.[1] ?? "";
	const origin = splitUrl(firstLoc)?.origin ?? "";
	const existing = new Set([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]));
	const entries = paths.map((p) => origin + p).filter((loc) => !existing.has(loc));
	if (!entries.length) return 0;
	const urls = entries.map((loc) => `<url><loc>${loc}</loc></url>`).join("\n  ");
	fs.writeFileSync(sitemap, xml.replace("</urlset>", `  ${urls}\n</urlset>`));
	return entries.length;
}

const listedPaths = sitemapPathsIn(values.source);

for (const locale of values.locales.split(",")) {
	const srcDir = path.join(values.source, locale);
	const destDir = path.join(values.dest, locale);
	const generated = htmlFiles(destDir).filter((f) => !fs.existsSync(path.join(srcDir, f)));
	const sitemapPaths = [];
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
		const ownPath = urlPath(file);
		fs.writeFileSync(full, fixHead(html, locale, destDir));

		if (listedPaths.has(ownPath)) sitemapPaths.push(`/${locale}${ownPath}`);
	}

	if (deleted.size) removeHreflangLinks(values.dest, deleted);

	const localeSitemap = path.join(destDir, "sitemap.xml");
	const rootSitemap = path.join(values.dest, "sitemap.xml");
	const sitemap = [localeSitemap, rootSitemap].find((f) => fs.existsSync(f));
	const added = sitemap && sitemapPaths.length ? addToSitemap(sitemap, sitemapPaths) : 0;

	console.log(
		`fix-rosey-pages [${locale}]: ${generated.length} generated pages, ${deleted.size} paginator pages deleted, ${added} added to ${sitemap ? path.relative(values.dest, sitemap) : "no sitemap"}`,
	);
}
