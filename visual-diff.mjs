#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Cursor's sandbox can set PLAYWRIGHT_BROWSERS_PATH to a temp dir that
// doesn't persist across runs. Clear it so Playwright uses its default cache.
if (process.env.PLAYWRIGHT_BROWSERS_PATH && !existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
	delete process.env.PLAYWRIGHT_BROWSERS_PATH;
}

const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 375, height: 812 },
};

const MIME = {
	'.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
	'.mjs': 'application/javascript', '.json': 'application/json',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
	'.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2',
	'.ttf': 'font/ttf', '.ico': 'image/x-icon', '.xml': 'application/xml',
	'.txt': 'text/plain',
};

const SKIP_FILES = new Set(['404.html', '500.html']);

// --- CLI ---

const [command, siteDir, ...flags] = process.argv.slice(2);

if (!command || !siteDir || !['capture', 'compare'].includes(command)) {
	console.log('Usage: node visual-diff.mjs <capture|compare> <site-dir> [--no-build] [--threshold=1]');
	process.exit(1);
}

const noBuild = flags.includes('--no-build');
const thresholdFlag = flags.find(f => f.startsWith('--threshold='));
const threshold = thresholdFlag ? parseFloat(thresholdFlag.split('=')[1]) : 1;

if (command === 'capture') await capture();
else await compare();

// --- Commands ---

async function capture() {
	const distDir = join(siteDir, 'dist');
	const vdDir = join(siteDir, '.visual-diff');
	const baselineDir = join(vdDir, 'baseline');

	if (!noBuild) build(siteDir);

	if (!existsSync(distDir)) {
		console.error(`Build output not found at ${distDir}`);
		process.exit(1);
	}

	const routes = discoverRoutes(distDir);
	console.log(`Found ${routes.length} representative routes:`);
	routes.forEach(r => console.log(`  ${r}`));

	mkdirSync(baselineDir, { recursive: true });
	const { server, port } = await serve(distDir);

	try {
		await screenshotAll(routes, `http://localhost:${port}`, baselineDir);
	} finally {
		server.close();
	}

	writeFileSync(
		join(vdDir, 'manifest.json'),
		JSON.stringify({ routes, capturedAt: new Date().toISOString() }, null, 2),
	);

	const count = routes.length * Object.keys(VIEWPORTS).length;
	console.log(`\nBaseline captured: ${count} screenshots saved to .visual-diff/baseline/`);
}

async function compare() {
	const distDir = join(siteDir, 'dist');
	const vdDir = join(siteDir, '.visual-diff');
	const compareDir = join(vdDir, 'compare');
	const diffsDir = join(vdDir, 'diffs');
	const manifestPath = join(vdDir, 'manifest.json');

	if (!existsSync(manifestPath)) {
		console.error('No baseline found. Run the `capture` command first.');
		process.exit(1);
	}

	const { routes } = JSON.parse(readFileSync(manifestPath, 'utf-8'));

	if (!noBuild) build(siteDir);

	if (!existsSync(distDir)) {
		console.error(`Build output not found at ${distDir}`);
		process.exit(1);
	}

	rmSync(compareDir, { recursive: true, force: true });
	rmSync(diffsDir, { recursive: true, force: true });
	mkdirSync(compareDir, { recursive: true });
	mkdirSync(diffsDir, { recursive: true });

	const { server, port } = await serve(distDir);
	try {
		await screenshotAll(routes, `http://localhost:${port}`, compareDir);
	} finally {
		server.close();
	}

	const { PNG } = await loadDep('pngjs');
	const pixelmatch = (await loadDep('pixelmatch')).default;

	const results = [];
	for (const route of routes) {
		for (const vp of Object.keys(VIEWPORTS)) {
			const name = toFilename(route, vp);
			const baselinePath = join(vdDir, 'baseline', name);
			const comparePath = join(compareDir, name);

			if (!existsSync(baselinePath) || !existsSync(comparePath)) {
				results.push({ route, vp, diffPercent: null, status: 'missing' });
				continue;
			}

			const img1 = PNG.sync.read(readFileSync(baselinePath));
			const img2 = PNG.sync.read(readFileSync(comparePath));

			const w = Math.max(img1.width, img2.width);
			const h = Math.max(img1.height, img2.height);
			const p1 = padToSize(img1, w, h);
			const p2 = padToSize(img2, w, h);

			const diff = new PNG({ width: w, height: h });
			const numDiff = pixelmatch(p1.data, p2.data, diff.data, w, h, { threshold: 0.1 });
			const pct = (numDiff / (w * h)) * 100;
			const pass = pct <= threshold;

			if (pct > 0) {
				writeFileSync(join(diffsDir, name), PNG.sync.write(diff));
			}

			results.push({ route, vp, diffPercent: pct, status: pass ? 'pass' : 'FAIL' });
		}
	}

	printResults(results);
	if (results.some(r => r.status === 'FAIL')) process.exit(1);
}

// --- Build ---

function build(dir) {
	const pm = detectPM(dir);
	console.log(`Installing deps with ${pm}...`);
	execSync(`${pm} install`, { cwd: dir, stdio: 'inherit' });
	console.log('Building...');
	execSync(`${pm} run build`, { cwd: dir, stdio: 'inherit' });
}

function detectPM(dir) {
	if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
	if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
	return 'npm';
}

// --- Route discovery ---

function findHtml(dir, base = dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...findHtml(full, base));
		} else if (entry.name.endsWith('.html') && !SKIP_FILES.has(entry.name)) {
			out.push(relative(base, full));
		}
	}
	return out.sort();
}

function discoverRoutes(distDir) {
	const files = findHtml(distDir);
	const routes = files.map(f => {
		let r = '/' + f.replace(/\\/g, '/');
		return r.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
	});

	// Keep one representative per route pattern to avoid screenshotting
	// dozens of near-identical collection pages (e.g. blog posts).
	const seen = new Map();
	for (const route of routes) {
		const pat = routePattern(route);
		if (!seen.has(pat)) seen.set(pat, route);
	}
	return [...seen.values()];
}

function routePattern(route) {
	const segs = route.split('/').filter(Boolean);
	if (segs.length <= 2) return route;
	return '/' + segs.slice(0, 2).join('/') + '/*';
}

// --- Static file server ---

async function serve(dir) {
	const absDir = resolve(dir);
	const server = createServer(async (req, res) => {
		const urlPath = new URL(req.url, 'http://localhost').pathname;
		let filePath = resolve(dir, '.' + urlPath);

		if (!filePath.startsWith(absDir)) {
			res.writeHead(403);
			res.end();
			return;
		}

		if (!extname(filePath)) {
			if (existsSync(join(filePath, 'index.html'))) {
				filePath = join(filePath, 'index.html');
			} else if (existsSync(filePath + '.html')) {
				filePath = filePath + '.html';
			}
		}

		try {
			const data = await readFile(filePath);
			res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end();
		}
	});

	return new Promise(resolve => {
		server.listen(0, () => resolve({ server, port: server.address().port }));
	});
}

// --- Screenshots ---

async function screenshotAll(routes, baseUrl, outDir) {
	const { chromium } = await loadDep('playwright');
	const browser = await chromium.launch();

	const allowedOrigin = new URL(baseUrl).origin;

	for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
		const ctx = await browser.newContext({ viewport: vpSize });
		const page = await ctx.newPage();

		await page.route('**/*', (route) => {
			const url = new URL(route.request().url());
			if (url.origin === allowedOrigin) return route.continue();
			return route.abort();
		});

		for (const route of routes) {
			await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 10000 });
			await page.waitForTimeout(500);

			const name = toFilename(route, vpName);
			await page.screenshot({ path: join(outDir, name), fullPage: true });
			console.log(`  ${vpName} ${route}`);
		}

		await ctx.close();
	}

	await browser.close();
}

// --- Image diffing ---

function padToSize(img, targetW, targetH) {
	if (img.width === targetW && img.height === targetH) return img;

	const data = Buffer.alloc(targetW * targetH * 4, 0);
	for (let y = 0; y < img.height; y++) {
		const srcOff = y * img.width * 4;
		const dstOff = y * targetW * 4;
		img.data.copy(data, dstOff, srcOff, srcOff + img.width * 4);
	}
	return { data, width: targetW, height: targetH };
}

function printResults(results) {
	console.log('\n--- Visual Diff Results ---\n');
	const maxRoute = Math.max(...results.map(r => r.route.length), 5);

	for (const r of results) {
		const pct = r.diffPercent !== null ? r.diffPercent.toFixed(2) + '%' : 'n/a';
		const tag = r.status === 'pass' ? '[ok]  ' : r.status === 'FAIL' ? '[FAIL]' : '[??]  ';
		console.log(`  ${tag}  ${r.route.padEnd(maxRoute)}  ${r.vp.padEnd(7)}  ${pct.padStart(8)}`);
	}

	const fails = results.filter(r => r.status === 'FAIL');
	const missing = results.filter(r => r.status === 'missing');
	console.log('');
	if (fails.length) {
		console.log(`${fails.length} page(s) exceed the ${threshold}% diff threshold. See .visual-diff/diffs/ for diff images.`);
	}
	if (missing.length) {
		console.log(`${missing.length} page(s) could not be compared (missing screenshot).`);
	}
	if (!fails.length && !missing.length) {
		console.log('All pages within threshold. No visual regressions detected.');
	}
}

// --- Helpers ---

function toFilename(route, viewport) {
	const slug = route === '/' ? '_index' : route.replace(/^\/|\/$/g, '').replace(/\//g, '--');
	return `${slug}--${viewport}.png`;
}

async function loadDep(name) {
	try {
		return await import(name);
	} catch {
		console.error(`${name} is not installed. Run: npm install --save-dev ${name}`);
		if (name === 'playwright') {
			console.error('Then run: npx playwright install chromium');
		}
		process.exit(1);
	}
}
