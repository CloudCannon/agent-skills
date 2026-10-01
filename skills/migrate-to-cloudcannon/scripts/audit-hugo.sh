#!/usr/bin/env bash
set -euo pipefail

# Gathers Phase 1 audit data for a Hugo site.
# Runs CloudCannon CLI commands for SSG/collection/build detection,
# then supplements with project metadata the CLI doesn't cover.
#
# Usage: bash audit-hugo.sh [project-dir]
#   project-dir defaults to the current directory.

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

# Search helpers that tolerate missing directories and no matches.
existing_dirs() {
  for d in "$@"; do
    if [ -d "$d" ]; then echo "$d"; fi
  done
}
grep_files() { # pattern dirs...
  local pattern="$1"; shift
  local dirs
  dirs=$(existing_dirs "$@")
  [ -z "$dirs" ] && return 0
  # shellcheck disable=SC2086
  grep -rlE "$pattern" $dirs 2>/dev/null | sort || true
}
grep_lines() { # pattern dirs...
  local pattern="$1"; shift
  local dirs
  dirs=$(existing_dirs "$@")
  [ -z "$dirs" ] && return 0
  # shellcheck disable=SC2086
  grep -rnE "$pattern" $dirs 2>/dev/null | cut -c1-200 | sort || true
}

# Template roots from `hugo config mounts`: one "label<TAB>dir<TAB>target" line per mount.
# The command prints a stream of JSON objects (one per module), not an array.
ROOTS=""
ROOTS_OK=0
MOUNTS_JSON=""
if command -v hugo >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  if MOUNTS_JSON=$(hugo config mounts 2>/dev/null) && [ -n "$MOUNTS_JSON" ]; then
    ROOTS=$(printf '%s' "$MOUNTS_JSON" | jq -rs '
      .[] | (if .owner == "" then "project" else .path end) as $label
      | (.dir | sub("/$"; "")) as $dir
      | .mounts[]? | select(.target | test("^(layouts|assets|static)"))
      | "\($label)\t\($dir)/\(.source)\t\(.target)"' 2>/dev/null) && ROOTS_OK=1
  fi
fi
if [ "$ROOTS_OK" = "0" ]; then
  # Fallback: the project's own directories only.
  ROOTS=$(printf 'project\t%s/layouts\tlayouts\nproject\t%s/assets\tassets\nproject\t%s/static\tstatic\n' "$PWD" "$PWD" "$PWD")
fi
roots_for() { # target → "label<TAB>dir" for each mount whose target is it or under it (editable-regions itself excluded)
  printf '%s\n' "$ROOTS" | awk -F'\t' -v t="$1" '$1 !~ /CloudCannon\/editable-regions/ && ($3 == t || index($3, t "/") == 1) { print $1 "\t" $2 }'
}
# Run a line or file scan over every root for a target, labelled by module.
# Usage: scan_roots <lines|files> <pattern> <target> [subdir-regex]
scan_roots() {
  local mode="$1" pattern="$2" target="$3" sub="${4:-}"
  local label dir dirs out found=0
  while IFS=$'\t' read -r label dir; do
    [ -d "$dir" ] || continue
    dirs="$dir"
    if [ -n "$sub" ]; then
      dirs=$(find "$dir" -type d 2>/dev/null | grep -E "$sub\$" || true)
      [ -z "$dirs" ] && continue
    fi
    # shellcheck disable=SC2086
    if [ "$mode" = "lines" ]; then
      out=$(grep -rnE "$pattern" $dirs 2>/dev/null | sed "s|^$dir/||" | cut -c1-200 | sort -u || true)
    else
      out=$(grep -rlE "$pattern" $dirs 2>/dev/null | sed "s|^$dir/||" | sort -u || true)
    fi
    [ -z "$out" ] && continue
    found=1
    echo "### [$label] $(basename "$dir")"
    printf '%s\n' "$out"
  done < <(roots_for "$target")
  [ "$found" = "0" ] && echo "(none in $target/)"
  return 0
}
print_unscanned() {
  if [ "$ROOTS_OK" = "0" ]; then
    echo "NOTE: hugo config mounts failed (or hugo/jq is missing), so only the project's own directories were scanned."
    echo "      Templates in themes and modules were NOT scanned. Imports and themes named in the config:"
    config_grep '^\s*(-\s*)?path\s*[:=]|^\s*theme\s*[:=]' | sed 's/^/      /'
  fi
  return 0
}

echo "=== Audit: $(basename "$(pwd)") ==="
echo ""

# --- CloudCannon CLI ---
echo "## CloudCannon CLI: SSG Detection"
echo '```json'
npx @cloudcannon/cli configure detect-ssg 2>/dev/null || echo '{ "error": "npx @cloudcannon/cli configure detect-ssg failed" }'
echo '```'
echo ""

echo "## CloudCannon CLI: Collections"
echo '```json'
npx @cloudcannon/cli configure detect-collections --ssg hugo 2>/dev/null || echo '{ "error": "npx @cloudcannon/cli configure detect-collections failed" }'
echo '```'
echo ""

echo "## CloudCannon CLI: Build Suggestions"
echo '```json'
npx @cloudcannon/cli configure detect-build-commands --ssg hugo 2>/dev/null || echo '{ "error": "npx @cloudcannon/cli configure detect-build-commands failed" }'
echo '```'
echo ""

# --- Hugo version ---
echo "## Hugo Version"
LOCAL_HUGO=""
LOCAL_EXTENDED=0
if command -v hugo >/dev/null 2>&1; then
  LOCAL_LINE=$(hugo version 2>/dev/null | head -1)
  echo "Local: $LOCAL_LINE"
  LOCAL_HUGO=$(printf '%s' "$LOCAL_LINE" | sed -nE 's/.*v([0-9]+\.[0-9]+\.[0-9]+).*/\1/p')
  printf '%s' "$LOCAL_LINE" | grep -q 'extended' && LOCAL_EXTENDED=1
else
  echo "Local: hugo not found on PATH"
fi
for f in .cloudcannon/initial-site-settings.json netlify.toml .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] || continue
  grep -nEi 'hugo_?version|HUGO_VERSION|hugo-version' "$f" 2>/dev/null | sed "s|^|$f:|" || true
done
if [ -f ".cloudcannon/initial-site-settings.json" ] && grep -q '"hugoVersion"' .cloudcannon/initial-site-settings.json; then
  echo "WARNING: initial-site-settings.json uses \"hugoVersion\" — the schema key is \"build.hugo_version\"; this one is ignored."
fi
if [ -f "package.json" ] && grep -qE '"hugo-(extended|bin)"' package.json; then
  echo "npm Hugo pin (wins over hugo_version when the build runs through npm):"
  grep -nE '"hugo-(extended|bin)"' package.json | sed 's/^/  package.json:/'
fi
echo ""

# --- Config files ---
echo "## Site Config Files"
CONFIG_FILES=""
for f in hugo.toml hugo.yaml hugo.yml hugo.json config.toml config.yaml config.yml config.json; do
  if [ -f "$f" ]; then
    echo "- $f"
    CONFIG_FILES="$CONFIG_FILES $f"
  fi
done
if [ -d "config" ]; then
  find config -type f \( -name '*.toml' -o -name '*.yaml' -o -name '*.yml' -o -name '*.json' \) | sort | sed 's/^/- /'
  CONFIG_FILES="$CONFIG_FILES $(find config -type f \( -name '*.toml' -o -name '*.yaml' -o -name '*.yml' -o -name '*.json' \) | tr '\n' ' ')"
fi
[ -z "$CONFIG_FILES" ] && echo "No Hugo config file found"
echo ""

config_grep() { # pattern
  [ -z "$CONFIG_FILES" ] && return 0
  # shellcheck disable=SC2086
  grep -nEi "$1" $CONFIG_FILES 2>/dev/null | cut -c1-200 || true
}

echo "## Config: Routing, Markdown, Languages"
echo "### permalinks / uglyURLs / publishDir / baseURL"
config_grep '^\s*\[?permalinks|uglyURLs|uglyurls|publishDir|baseURL'
echo "### Goldmark (unsafe: false drops raw HTML from content)"
config_grep 'goldmark|unsafe'
echo "### Taxonomies"
config_grep '^\s*\[?taxonomies'
echo "### Languages (multilingual → make-site-multilingual skill)"
config_grep '^\s*\[?languages|defaultContentLanguage'
echo ""

# --- Modules and themes ---
echo "## Modules and Themes"
[ -f "go.mod" ] && { echo "### go.mod"; cat go.mod; } || echo "No go.mod — not a Hugo module project (hugo mod init needed before adding editable-regions)"
echo "### Module imports / theme"
config_grep '^\s*(-\s*)?path\s*[:=]|^\s*theme\s*[:=]|replacements'
if [ -d "themes" ]; then
  echo "### themes/"
  find themes -mindepth 1 -maxdepth 1 -type d | sort | sed 's/^/- /'
fi
[ -d "_vendor" ] && echo "_vendor/ present (vendored modules are bundled for the editor)"
echo "### version keys on module imports (remove them — see hugo/audit.md § 1)"
VERSION_KEYS=$(config_grep '^\s*(-\s*)?version\s*[:=]')
if [ -n "$VERSION_KEYS" ]; then
  printf '%s\n' "$VERSION_KEYS"
  echo "WARNING: a module import has a version key — every component fails in the editor"
else
  echo "(none)"
fi
echo ""

echo "## Hugo Version Window (pin hugo_version inside every one)"
version_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; } # $1 >= $2
check_window() { # label min max extended
  local label="$1" min="$2" max="$3" ext="$4"
  [ -z "$min$max$ext" ] && return 0
  echo "- [$label] min=${min:-—} max=${max:-—} extended=${ext:-—}"
  [ -z "$LOCAL_HUGO" ] && return 0
  if [ -n "$min" ] && ! version_ge "$LOCAL_HUGO" "$min"; then echo "  WARNING: local Hugo $LOCAL_HUGO is below $min"; fi
  if [ -n "$max" ] && ! version_ge "$max" "$LOCAL_HUGO"; then echo "  WARNING: local Hugo $LOCAL_HUGO is above $max"; fi
  if [ "$ext" = "true" ] && [ "$LOCAL_EXTENDED" = "0" ]; then echo "  WARNING: extended Hugo required, local Hugo is not extended"; fi
  return 0
}
read_window() { # dir label — module.hugoVersion from the module's config, min_version from theme.toml
  local dir="$1" label="$2" f block min="" max="" ext="" mv
  for f in "$dir"/hugo.toml "$dir"/hugo.yaml "$dir"/hugo.yml "$dir"/config.toml "$dir"/config.yaml "$dir"/config.yml "$dir"/config/_default/module.toml "$dir"/config/_default/module.yaml "$dir"/config/_default/hugo.toml "$dir"/config/_default/hugo.yaml; do
    [ -f "$f" ] || continue
    block=$(grep -iA4 'hugoVersion' "$f" 2>/dev/null || true)
    [ -z "$block" ] && continue
    min=$(printf '%s\n' "$block" | sed -nE 's/^[[:space:]]*min[[:space:]]*[:=][[:space:]]*["'\'']?([0-9.]+).*/\1/p' | head -1)
    max=$(printf '%s\n' "$block" | sed -nE 's/^[[:space:]]*max[[:space:]]*[:=][[:space:]]*["'\'']?([0-9.]+).*/\1/p' | head -1)
    ext=$(printf '%s\n' "$block" | sed -nE 's/^[[:space:]]*extended[[:space:]]*[:=][[:space:]]*(true|false).*/\1/p' | head -1)
    break
  done
  check_window "$label module.hugoVersion" "$min" "$max" "$ext"
  if [ -f "$dir/theme.toml" ]; then
    mv=$(sed -nE 's/^[[:space:]]*min_version[[:space:]]*=[[:space:]]*"?([0-9.]+).*/\1/p' "$dir/theme.toml" | head -1)
    [ -n "$mv" ] && check_window "$label theme.toml min_version, not enforced by Hugo" "$mv" "" ""
  fi
  return 0
}
if [ "$ROOTS_OK" = "1" ]; then
  while IFS=$'\t' read -r label dir; do
    read_window "$dir" "$label"
  done < <(printf '%s' "$MOUNTS_JSON" | jq -rs '.[] | "\(if .owner == "" then "project" else .path end)\t\(.dir | sub("/$"; ""))"' | sort -u)
else
  read_window "$PWD" project
  for d in themes/*/; do [ -d "$d" ] && read_window "${d%/}" "${d%/}"; done
  print_unscanned
fi
echo ""

echo "## Agent docs shipped by themes and modules (read before auditing their templates)"
AGENT_DOCS=0
while IFS=$'\t' read -r label dir; do
  [ "$label" = "project" ] && continue
  base="${dir%/layouts}"
  for f in "$base/AGENTS.md" "$base/CLAUDE.md" "$base/.claude/skills"; do
    if [ -e "$f" ]; then echo "- [$label] $f"; AGENT_DOCS=1; fi
  done
done < <(roots_for layouts)
[ "$AGENT_DOCS" = "0" ] && echo "(none)"
echo ""

# --- Bookshop ---
echo "## Bookshop"
BOOKSHOP=0
[ -d "component-library" ] && { echo "- component-library/ exists ($(find component-library -name '*.bookshop.yml' | wc -l | tr -d ' ') *.bookshop.yml files)"; BOOKSHOP=1; }
[ -f "package.json" ] && grep -q '@bookshop/' package.json && { echo "- @bookshop/* in package.json"; BOOKSHOP=1; }
[ -f ".cloudcannon/postbuild" ] && grep -q 'bookshop' .cloudcannon/postbuild && { echo "- @bookshop/generate in .cloudcannon/postbuild"; BOOKSHOP=1; }
config_grep '(path|replacements).*bookshop' | sed 's/^/- config: /'
BS_CONTENT=$(grep_files '_bookshop_name' content | wc -l | tr -d ' ')
[ "$BS_CONTENT" != "0" ] && { echo "- _bookshop_name in $BS_CONTENT content files"; BOOKSHOP=1; }
BS_CALLS=$(grep_files 'partial "bookshop' layouts | wc -l | tr -d ' ')
[ "$BS_CALLS" != "0" ] && { echo "- partial \"bookshop…\" calls in $BS_CALLS layout files"; BOOKSHOP=1; }
CMS_ATTRS=$(grep_files 'data-cms-(bind|edit)' layouts component-library | wc -l | tr -d ' ')
[ "$CMS_ATTRS" != "0" ] && echo "- data-cms-bind / data-cms-edit in $CMS_ATTRS files (remove when adding regions)"
if [ "$BOOKSHOP" = "1" ]; then
  echo "BOOKSHOP SITE → read cloudcannon-bookshop/SKILL.md"
  if [ -d "component-library/components" ]; then
    echo "### Bookshop components (future partials: layouts/partials/<path>.html)"
    find component-library/components -name '*.hugo.html' | sort | sed -E 's|component-library/components/(.*)/[^/]+\.hugo\.html|- \1|'
  fi
else
  echo "No Bookshop markers"
fi
echo ""

# --- Existing CloudCannon config ---
echo "## Existing CloudCannon Config"
FOUND_CC=0
for f in cloudcannon.config.yml cloudcannon.config.yaml cloudcannon.config.json cloudcannon.config.js cloudcannon.config.cjs cloudcannon.config.mjs .cloudcannon/initial-site-settings.json; do
  [ -f "$f" ] && { echo "- $f"; FOUND_CC=1; }
done
for d in .cloudcannon/schemas schemas .cloudcannon/structures; do
  [ -d "$d" ] && { echo "- $d/ ($(find "$d" -type f | wc -l | tr -d ' ') files)"; FOUND_CC=1; }
done
if [ "$FOUND_CC" = "1" ]; then
  echo "Existing config → customize in place; run configure generate with --dry-run only"
else
  echo "None"
fi
echo ""

# --- Content ---
echo "## Content"
if [ -d "content" ]; then
  echo "### Sections (top-level directories under content/)"
  find content -mindepth 1 -maxdepth 1 -type d | sort | while read -r d; do
    echo "- $d ($(find "$d" -name '*.md' | wc -l | tr -d ' ') .md files)"
  done
  echo "### Top-level content files"
  find content -mindepth 1 -maxdepth 1 -type f | sort | sed 's/^/- /'
  echo "### _index.md files (list pages)"
  find content -name '_index.md' | sort | sed 's/^/- /'
  echo "### Leaf bundles (index.md)"
  find content -name 'index.md' | sort | sed 's/^/- /'
  echo "### Front matter formats"
  echo "- YAML (---): $(grep -rlE '^---\s*$' content 2>/dev/null | wc -l | tr -d ' ')"
  echo "- TOML (+++): $(grep -rlE '^\+\+\+\s*$' content 2>/dev/null | wc -l | tr -d ' ')"
  echo "- JSON ({):   $(find content -name '*.md' -exec sh -c 'head -c1 "$1" | grep -q "{"' _ {} \; -print 2>/dev/null | wc -l | tr -d ' ')"
  echo "### Front matter keys that change the URL"
  echo "- slug: $(grep_files '^slug\s*[:=]' content | wc -l | tr -d ' ') files"
  echo "- url:  $(grep_files '^url\s*[:=]' content | wc -l | tr -d ' ') files"
else
  echo "No content/ directory"
fi
[ -d "archetypes" ] && { echo "### Archetypes (seed schema files from these)"; find archetypes -type f | sort | sed 's/^/- /'; }
echo ""

# --- Data ---
echo "## Data Files"
if [ -d "data" ]; then
  find data -type f | sort | sed 's/^/- /'
else
  echo "No data/ directory"
fi
echo ""

# --- Layouts ---
echo "## Layouts"
if [ -d "layouts" ]; then
  echo "### Page templates (never re-rendered in the editor — primitives only)"
  find layouts -type f -name '*.html' ! -path '*/partials/*' ! -path '*/_partials/*' ! -path '*/shortcodes/*' ! -path '*/_shortcodes/*' ! -path '*/_markup/*' | sort | sed 's/^/- /'
  echo "### Partials (can be component regions)"
  find layouts -type f \( -path '*/partials/*' -o -path '*/_partials/*' \) | sort | sed 's/^/- /'
  echo "### Shortcodes (snippet candidates)"
  find layouts -type f \( -path '*/shortcodes/*' -o -path '*/_shortcodes/*' \) | sort | sed 's/^/- /'
  echo "### Render hooks"
  find layouts -type f -path '*/_markup/*' | sort | sed 's/^/- /'
  echo "### Existing editable-regions wiring"
  grep_lines 'partial "editable-regions"' layouts
else
  echo "No layouts/ directory (templates come from a theme or module)"
fi
echo "### Templates in themes and modules"
TPL_FOUND=0
while IFS=$'\t' read -r label dir; do
  [ "$label" = "project" ] && continue
  [ -d "$dir" ] || continue
  TPL_FOUND=1
  echo "- [$label] $(find "$dir" -type f -name '*.html' | wc -l | tr -d ' ') templates in $dir"
done < <(roots_for layouts)
[ "$TPL_FOUND" = "0" ] && echo "(none)"
print_unscanned
echo ""

echo "## Hugo built-in shortcodes overridden by the project, a theme or a module (write a custom snippet, not hugo_<name>)"
BUILTINS='comment|details|figure|gist|highlight|instagram|param|qr|ref|relref|vimeo|x|youtube|twitter|tweet'
OVR=0
while IFS=$'\t' read -r label dir; do
  [ -d "$dir" ] || continue
  hits=$(find "$dir" -type f \( -path '*/shortcodes/*' -o -path '*/_shortcodes/*' \) 2>/dev/null | grep -E "/_?shortcodes/($BUILTINS)\.[a-z]+$" || true)
  [ -z "$hits" ] && continue
  OVR=1
  printf '%s\n' "$hits" | sed "s|^$dir/|- [$label] |"
done < <(roots_for layouts)
[ "$OVR" = "0" ] && echo "(none)"
echo ""

# --- Editor-runtime risks ---
# Each scan runs over every template root from `hugo config mounts`, labelled by module.
ASSET_RE='resources\.(Get|GetRemote|Match)|\.(Resize|Fill|Fit|Crop|Process)\b|images\.'
echo "## Asset pipeline calls (guard with site.Params.ENV_CLIENT in partials the editor re-renders)"
scan_roots lines "$ASSET_RE" layouts
[ -d component-library/components ] && grep_lines "$ASSET_RE" component-library/components
echo ""

echo "## Images chosen by resource glob (no input type can pick one)"
scan_roots lines 'GetMatch|Resources\.Match' layouts
echo ""

echo "## .Content in partials — candidates (only .Content on a Page is the body)"
scan_roots lines '\.Content\b' layouts '/_?partials'
[ -d component-library/components ] && grep_lines '\.Content\b' component-library/components
echo ""

echo "## Shortcode usage in content (opening tags only)"
if [ -d "content" ]; then
  grep -rhoE '\{\{[<%] *[a-zA-Z0-9_-]+' content 2>/dev/null | sed -E 's/\{\{[<%] *//' | sort | uniq -c | sort -rn || true
fi
echo ""

echo "## GitHub-style alerts in content (a rich-text save breaks them)"
if [ -d "content" ]; then
  echo "$(grep -rlE '^[[:space:]]*>[[:space:]]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]' content 2>/dev/null | wc -l | tr -d ' ') content files"
fi
echo ""

POS_RE=':first-child|:last-child|:nth-child|:nth-last-child'
echo "## Positional CSS selectors (a <template> blueprint shifts :nth-child)"
scan_roots lines "$POS_RE" assets
scan_roots lines "$POS_RE" static '/(css|scss)'
[ -d component-library/components ] && grep_lines "$POS_RE" component-library/components
echo ""

JS_RE='DOMContentLoaded|document\)\.ready|\$\(function|querySelectorAll|IntersectionObserver'
echo "## Global JS bindings (don't reach re-rendered markup)"
scan_roots lines "$JS_RE" assets '/js'
scan_roots lines "$JS_RE" static '/js'
echo ""

echo "## Inline scripts and styles in partials"
scan_roots files '<script|<style' layouts '/_?partials'
[ -d component-library/components ] && grep_files '<script|<style' component-library/components
print_unscanned
echo ""

# --- Package and build ---
echo "## package.json scripts"
if [ -f "package.json" ]; then
  node -e 'const p=require("./package.json"); console.log(JSON.stringify(p.scripts||{},null,2))' 2>/dev/null || grep -A20 '"scripts"' package.json
else
  echo "No package.json (build command is plain hugo)"
fi
[ -f ".cloudcannon/postbuild" ] && { echo "### .cloudcannon/postbuild"; cat .cloudcannon/postbuild; }
echo ""

echo "=== End of audit ==="
