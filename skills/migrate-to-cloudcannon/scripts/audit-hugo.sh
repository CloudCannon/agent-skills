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
echo "## Hugo Version (editable regions needs 0.150.0+)"
if command -v hugo >/dev/null 2>&1; then
  echo "Local: $(hugo version 2>/dev/null | head -1)"
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
  echo "BOOKSHOP SITE → read cloudcannon-visual-editing/migrating-from-bookshop.md"
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
  echo "### _index.md files (list pages — URL behaviour unverified, see hugo/collection-urls.md)"
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
  find layouts -type f -name '*.html' ! -path '*/partials/*' ! -path '*/shortcodes/*' ! -path '*/_markup/*' | sort | sed 's/^/- /'
  echo "### Partials (can be component regions)"
  find layouts -type f -path '*/partials/*' | sort | sed 's/^/- /'
  echo "### Shortcodes (snippet candidates)"
  find layouts -type f -path '*/shortcodes/*' | sort | sed 's/^/- /'
  echo "### Render hooks"
  find layouts -type f -path '*/_markup/*' | sort | sed 's/^/- /'
  echo "### Existing editable-regions wiring"
  grep_lines 'partial "editable-regions"' layouts
else
  echo "No layouts/ directory (templates come from a theme or module)"
fi
echo ""

# --- Editor-runtime risks ---
echo "## Asset pipeline calls (guard with site.Params.ENV_CLIENT in partials)"
grep_lines 'resources\.(Get|GetRemote|Match)|\.(Resize|Fill|Fit|Crop|Process)\b|images\.' layouts component-library/components
echo ""

echo "## .Content in partials (empty in the editor)"
grep_lines '\.Content\b' layouts/partials component-library/components
echo ""

echo "## Shortcode usage in content"
if [ -d "content" ]; then
  grep -rhoE '\{\{[<%] */?[a-zA-Z0-9_-]+' content 2>/dev/null | sed -E 's/\{\{[<%] *\/?//' | sort | uniq -c | sort -rn || true
fi
echo ""

echo "## Positional CSS selectors (a <template> blueprint shifts :nth-child)"
grep_lines ':first-child|:last-child|:nth-child|:nth-last-child' assets static/css static/scss component-library/components
echo ""

echo "## Global JS bindings (don't reach re-rendered markup)"
grep_lines 'DOMContentLoaded|document\)\.ready|\$\(function|querySelectorAll|IntersectionObserver' assets/js static/js
echo ""

echo "## Inline scripts and styles in partials"
grep_files '<script|<style' layouts/partials component-library/components
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
