/**
 * A dependency-free scanner for YAML front matter, shared by the content
 * translation scripts.
 *
 * It doesn't build a YAML document. It finds every scalar value, records its
 * path (`content_blocks.0.title`), its decoded string, its quoting style and the
 * exact lines it occupies, so a translated value can replace those lines and
 * nothing else.
 *
 * Supported: block mappings, block sequences (of scalars or of mappings), plain
 * single-line scalars, single- and double-quoted single-line scalars, and
 * literal (|, |-) and folded (>, >-) block scalars. Flow collections ([a, b],
 * {a: b}) are skipped as structural. Anything else — multi-line plain or quoted
 * scalars, anchors, aliases, tags, |+ / >+ — is reported in `unsupported` and
 * never returned as a slot, so callers can't mistranslate it.
 */

const KEY_RE = /^([A-Za-z0-9_][\w.-]*)\s*:(?:\s+(.*))?$/;

/** Splits a file into front matter and body. */
export function splitFile(content) {
	if (/^\+\+\+\r?\n/.test(content)) return { format: "toml" };
	if (/^\{/.test(content)) return { format: "json" };
	const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
	if (!match) return { format: "none", body: content };
	return {
		format: "yaml",
		open: match[1],
		yaml: match[2],
		close: match[3],
		body: match[4],
	};
}

function indentOf(line) {
	return line.match(/^ */)[0].length;
}

function isSkippable(line) {
	const t = line.trim();
	return t === "" || t.startsWith("#");
}

function stripComment(text) {
	// A plain scalar's comment starts at " #"
	const i = text.search(/\s#/);
	return (i === -1 ? text : text.slice(0, i)).trim();
}

function decodeDouble(inner) {
	return inner.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_, c) => {
		if (c[0] === "u") return String.fromCharCode(parseInt(c.slice(1), 16));
		return { n: "\n", t: "\t", r: "\r", 0: "\0", '"': '"', "\\": "\\", "/": "/" }[c] ?? c;
	});
}

/**
 * Scans YAML text. Returns { slots, unsupported }:
 *   slots: [{ path, value, style, start, end, prefix, contentIndent }]
 *     style: "plain" | "single" | "double" | "literal" | "folded" | "flow"
 *     start/end: line range (end exclusive) the value occupies
 *     prefix: the first line up to where the value starts ("  - title: ")
 *   unsupported: [{ path, line, reason }]
 */
export function scanYaml(yaml) {
	const lines = yaml.split("\n");
	const slots = [];
	const unsupported = [];

	function nextSignificant(i) {
		while (i < lines.length && isSkippable(lines[i])) i++;
		return i;
	}

	// Lines after `start` that belong to a value at `parentIndent` (more indented, or blank)
	function continuationEnd(start, parentIndent) {
		let i = start;
		let last = start;
		while (i < lines.length) {
			if (lines[i].trim() === "") {
				i++;
				continue;
			}
			if (indentOf(lines[i]) <= parentIndent) break;
			i++;
			last = i;
		}
		return last;
	}

	// Parses the value text after "key:" or "- " on line `i`.
	// `prefix` is everything on the line before the value; `parentIndent` is the
	// indent a continuation line must exceed.
	function parseValue(i, rest, prefix, parentIndent, path) {
		const text = rest ?? "";
		const trimmed = stripComment(text);

		if (trimmed === "") {
			// Nested node on the following lines
			const j = nextSignificant(i + 1);
			if (j < lines.length) {
				const ind = indentOf(lines[j]);
				const isSeq = /^\s*-(\s|$)/.test(lines[j]);
				if (ind > parentIndent || (isSeq && ind === parentIndent && prefix.trim() !== "-")) {
					return parseNode(j, ind, path);
				}
			}
			slots.push({
				path,
				value: "",
				style: "plain",
				start: i,
				end: i + 1,
				prefix,
				contentIndent: 0,
			});
			return i + 1;
		}

		const first = text.trimStart()[0];
		if (first === "&" || first === "*" || first === "!") {
			unsupported.push({ path, line: i + 1, reason: "anchor, alias or tag" });
			return continuationEnd(i + 1, parentIndent);
		}

		if (first === "|" || first === ">") {
			const header = trimmed;
			if (!/^[|>]-?$/.test(header)) {
				unsupported.push({ path, line: i + 1, reason: `block scalar header "${header}"` });
				return continuationEnd(i + 1, parentIndent);
			}
			const end = continuationEnd(i + 1, parentIndent);
			const body = lines.slice(i + 1, end);
			const contentIndent = Math.min(
				...body.filter((l) => l.trim() !== "").map(indentOf),
				Number.POSITIVE_INFINITY,
			);
			const ci = Number.isFinite(contentIndent) ? contentIndent : parentIndent + 2;
			const content = body.map((l) => l.slice(ci));
			while (content.length && content[content.length - 1] === "") content.pop();
			let value;
			if (first === "|") {
				value = content.join("\n");
			} else {
				if (content.some((l) => /^\s/.test(l))) {
					unsupported.push({ path, line: i + 1, reason: "folded scalar with indented lines" });
					return end;
				}
				value = content
					.join("\n")
					.replace(/([^\n])\n(?=[^\n])/g, "$1 ")
					.replace(/\n\n/g, "\n");
			}
			if (!header.endsWith("-") && value !== "") value += "\n";
			slots.push({
				path,
				value,
				style: first === "|" ? "literal" : "folded",
				start: i,
				end,
				prefix,
				contentIndent: ci,
			});
			return end;
		}

		if (first === "[" || first === "{") {
			const end = continuationEnd(i + 1, parentIndent);
			slots.push({ path, value: trimmed, style: "flow", start: i, end, prefix, contentIndent: 0 });
			return end;
		}

		if (first === "'" || first === '"') {
			const t = text.trimStart();
			const re = first === "'" ? /^'((?:[^']|'')*)'\s*(#.*)?$/ : /^"((?:[^"\\]|\\.)*)"\s*(#.*)?$/;
			const m = t.match(re);
			let raw;
			let end = i + 1;
			if (m) {
				raw = m[1];
			} else {
				// A quoted scalar over several lines: find the line that closes it
				const close =
					first === "'" ? /^((?:[^']|'')*)'\s*(#.*)?$/ : /^((?:[^"\\]|\\.)*)"\s*(#.*)?$/;
				const parts = [t.slice(1)];
				let found = false;
				while (end < lines.length) {
					const cm = lines[end].trim().match(close);
					end++;
					if (cm) {
						parts.push(cm[1]);
						found = true;
						break;
					}
					parts.push(lines[end - 1].trim());
				}
				if (!found) {
					unsupported.push({ path, line: i + 1, reason: "unclosed quoted scalar" });
					return end;
				}
				// YAML folding: a line break becomes a space, an empty line a newline
				raw = parts
					.map((p, k) => (k === 0 ? p.trimEnd() : p.trim()))
					.join("\n")
					.replace(/([^\n])\n(?=[^\n])/g, "$1 ")
					.replace(/\n\n/g, "\n");
			}
			const value = first === "'" ? raw.replace(/''/g, "'") : decodeDouble(raw);
			slots.push({
				path,
				value,
				style: first === "'" ? "single" : "double",
				start: i,
				end,
				prefix,
				contentIndent: 0,
			});
			return end;
		}

		// Plain scalar: must fit on one line
		const end = continuationEnd(i + 1, parentIndent);
		if (end > i + 1) {
			unsupported.push({ path, line: i + 1, reason: "multi-line plain scalar" });
			return end;
		}
		slots.push({
			path,
			value: trimmed,
			style: "plain",
			start: i,
			end: i + 1,
			prefix,
			contentIndent: 0,
		});
		return i + 1;
	}

	// Parses a mapping or sequence whose items start at `indent`, from line `i`.
	function parseNode(i, indent, path) {
		i = nextSignificant(i);
		if (i >= lines.length) return i;
		if (/^\s*-(\s|$)/.test(lines[i])) return parseSequence(i, indent, path);
		return parseMapping(i, indent, path, "");
	}

	function parseSequence(i, indent, path) {
		let index = 0;
		while (true) {
			i = nextSignificant(i);
			if (i >= lines.length) return i;
			const line = lines[i];
			if (indentOf(line) !== indent || !/^\s*-(\s|$)/.test(line)) return i;
			const itemPath = [...path, String(index++)];
			const after = line.slice(indent + 1);
			const rest = after.replace(/^\s+/, "");
			const itemCol = indent + 1 + (after.length - rest.length);
			if (KEY_RE.test(stripComment(rest)) || /^[A-Za-z0-9_][\w.-]*\s*:\s*$/.test(rest)) {
				// "- key: value" starts a mapping at the item's column
				i = parseMapping(i, itemCol, itemPath, line.slice(0, itemCol));
			} else {
				i = parseValue(
					i,
					rest,
					rest === "" ? `${line.trimEnd()} ` : line.slice(0, itemCol),
					indent,
					itemPath,
				);
			}
		}
	}

	// `firstPrefix` is set when the first pair shares a line with "- "
	function parseMapping(i, indent, path, firstPrefix) {
		let first = firstPrefix !== "";
		while (true) {
			if (!first) {
				i = nextSignificant(i);
				if (i >= lines.length) return i;
			}
			const line = lines[i];
			const body = first ? line.slice(indent) : line.trimStart();
			if (!first && indentOf(line) !== indent) return i;
			const m = body.match(/^([A-Za-z0-9_][\w.-]*)\s*:(\s+.*|\s*)$/);
			if (!m) {
				if (!first && indentOf(line) === indent && /^\s*-(\s|$)/.test(line)) return i;
				unsupported.push({ path: path.join("."), line: i + 1, reason: "unrecognised line" });
				return continuationEnd(i + 1, indent - 1);
			}
			const key = m[1];
			const valueText = m[2].replace(/^\s+/, "");
			const prefix =
				valueText === "" ? `${line.trimEnd()} ` : line.slice(0, line.length - valueText.length);
			i = parseValue(i, valueText === "" ? null : valueText, prefix, indent, [...path, key]);
			first = false;
		}
	}

	const start = nextSignificant(0);
	if (start < lines.length) parseNode(start, indentOf(lines[start]), []);

	for (const slot of slots) slot.path = slot.path.join(".");
	for (const u of unsupported) if (Array.isArray(u.path)) u.path = u.path.join(".");
	return { slots, unsupported };
}

function isPlainSafe(value) {
	return (
		value !== "" &&
		value === value.trim() &&
		!/^[-?:,[\]{}#&*!|>'"%@`]/.test(value) &&
		!/^[-+.]?\d/.test(value) &&
		!value.includes(": ") &&
		!value.includes(" #") &&
		!value.endsWith(":") &&
		!/^(true|false|yes|no|on|off|null|~)$/i.test(value)
	);
}

/** Renders `value` in place of `slot`, keeping its key, indentation and, where possible, its style. */
export function renderSlot(slot, value) {
	if (slot.style === "literal" || slot.style === "folded") {
		const text = value.replace(/\n+$/, "");
		// A folded scalar stays folded while the text is one line; a line break needs literal style
		const indicator = slot.style === "folded" && !text.includes("\n") ? ">" : "|";
		const header = indicator + (value.endsWith("\n") ? "" : "-");
		const pad = " ".repeat(slot.contentIndent);
		const body = text.split("\n").map((l) => (l === "" ? "" : pad + l));
		return [slot.prefix + header, ...body];
	}
	if (value.includes("\n")) {
		const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
		return [`${slot.prefix}"${escaped}"`];
	}
	if (slot.style === "plain" && isPlainSafe(value)) return [slot.prefix + value];
	if (slot.style === "double") {
		return [`${slot.prefix}"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`];
	}
	return [`${slot.prefix}'${value.replace(/'/g, "''")}'`];
}
