#!/usr/bin/env bash
set -euo pipefail

# Starts the local CloudCannon loop and hands it to the user: build once, start
# a rebuild-on-change watcher, then serve the output under `cloudcannon dev`.
#
# `cloudcannon dev` only serves a directory. It never builds, and it never runs
# .cloudcannon/postbuild, so without the watcher an edit made in the editor
# reaches disk and then nothing regenerates the page that shows it.
#
# Usage: bash cc-serve.sh [project-dir] [--output DIR] [--build-cmd CMD]
#                         [--watch-cmd CMD] [--port 10101]
#                         [--no-build] [--no-postbuild] [--no-watch]
#   project-dir defaults to the current directory.

PROJECT_DIR="."
PORT="${CC_DEV_PORT:-10101}"
OUTPUT=""
BUILD_CMD=""
WATCH_CMD=""
RUN_BUILD=1
RUN_POSTBUILD=1
RUN_WATCH=1

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --build-cmd) BUILD_CMD="$2"; shift 2 ;;
    --watch-cmd) WATCH_CMD="$2"; shift 2 ;;
    --no-build) RUN_BUILD=0; shift ;;
    --no-postbuild) RUN_POSTBUILD=0; shift ;;
    --no-watch) RUN_WATCH=0; shift ;;
    -h|--help) sed -n '3,15p' "$0"; exit 0 ;;
    *) PROJECT_DIR="$1"; shift ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
ROOT="$(pwd)"

# First suggestion for a key of `detect-build-commands` output, read from stdin.
# Node rather than jq, which is not a prerequisite anywhere else.
pick() {
  node -e '
    let raw = "";
    process.stdin.on("data", (d) => (raw += d));
    process.stdin.on("end", () => {
      try {
        process.stdout.write(JSON.parse(raw)[process.argv[1]]?.[0]?.value ?? "");
      } catch {}
    });
  ' "$1"
}

# --- Output directory and build command ---
# `cloudcannon configure detect-build-commands` is the product's own detection.
# It covers every SSG the CLI knows and reports its reasoning, so this script
# never has to keep a competing table of config filenames in sync.
if [ -z "$OUTPUT" ] || [ -z "$BUILD_CMD" ]; then
  DETECTED="$(cloudcannon configure detect-build-commands 2>/dev/null || true)"
  if [ -n "$DETECTED" ]; then
    [ -z "$BUILD_CMD" ] && BUILD_CMD="$(printf '%s' "$DETECTED" | pick build)"
    [ -z "$OUTPUT" ] && OUTPUT="$(printf '%s' "$DETECTED" | pick output)"
  fi
fi

if [ -z "$OUTPUT" ] || { [ -z "$BUILD_CMD" ] && [ "$RUN_BUILD" -eq 1 ]; }; then
  echo "error: could not detect how this site builds." >&2
  echo "       Pass --output DIR and --build-cmd CMD." >&2
  echo "       \`cloudcannon configure detect-ssg\` shows what the CLI makes of this directory." >&2
  exit 1
fi

# --- Refuse a port that is serving something else ---
# A healthy /__api/details proves a dev server is there, not that it is *this*
# site — siteName is only the directory's basename and outputDir is relative, so
# two projects can answer identically. Probe for a token written into our own
# output directory instead. Never stop a listener this script did not start.
if curl -sf -o /dev/null "http://127.0.0.1:$PORT/__api/details" 2>/dev/null; then
  mkdir -p "$OUTPUT"
  PROBE="$OUTPUT/.cc-serve-probe"
  TOKEN="$RANDOM$RANDOM$$"
  echo "$TOKEN" > "$PROBE"
  ANSWER="$(curl -sf "http://127.0.0.1:$PORT/__output/.cc-serve-probe" 2>/dev/null || true)"
  rm -f "$PROBE"

  if [ "$(echo "$ANSWER" | tr -d '[:space:]')" = "$TOKEN" ]; then
    echo "note: this site is already being served on port $PORT — reusing it."
    echo "      http://localhost:$PORT"
    exit 0
  fi

  DETAILS="$(curl -sf "http://127.0.0.1:$PORT/__api/details" 2>/dev/null || true)"
  OTHER="$(printf '%s' "$DETAILS" | sed -n 's/.*"siteName":"\([^"]*\)".*/\1/p')"
  echo "error: port $PORT is serving a different site (${OTHER:-unknown}), not $ROOT." >&2
  echo "       Pass --port with a free port. Do not stop that server — it is not this one." >&2
  exit 1
fi

echo "project: $ROOT"
echo "output:  $OUTPUT"

# --- Build ---
if [ "$RUN_BUILD" -eq 1 ]; then
  echo "--- building ---"
  eval "$BUILD_CMD"
fi

# --- Postbuild ---
# Run in a subshell: CloudCannon SOURCES this file in production, so any shell
# options it sets would otherwise leak into the caller and kill the run.
if [ -f .cloudcannon/postbuild ]; then
  if [ "$RUN_POSTBUILD" -eq 1 ]; then
    echo "--- postbuild ---"
    ( bash .cloudcannon/postbuild )
  fi
  echo
  echo "note: this site has a .cloudcannon/postbuild, and the watcher does not run it."
  echo "      The first rebuild after an edit will overwrite whatever it generates."
  echo "      To keep it in the loop:"
  echo "        --build-cmd '$BUILD_CMD && bash .cloudcannon/postbuild'"
  echo
fi

# --- Watch ---
# `cmd &` records the PID of the subshell bash forks, not of the process that
# subshell goes on to run, so killing $! alone orphans the real one. Walk the
# children instead.
kill_tree() {
  local pid="$1" child
  [ -z "$pid" ] && return 0
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

WATCH_PID=""
if [ "$RUN_WATCH" -eq 1 ]; then
  if [ -z "$WATCH_CMD" ]; then
    WATCH_CMD="node \"$SCRIPT_DIR/watch-build.mjs\" --build-cmd \"$BUILD_CMD\" --output \"$OUTPUT\" --root \"$ROOT\""
  fi
  echo "--- watching ---"
  eval "$WATCH_CMD" &
  WATCH_PID=$!
fi

# --- Serve ---
echo "--- serving ---"
echo
echo "  CloudCannon:  http://localhost:$PORT"
echo "  Stop:         Ctrl-C (stops the watcher too)"
echo
echo "  Edit source files or edit in CloudCannon — either way the site rebuilds"
echo "  and the preview updates itself."
echo

# Both run in the background so this shell stays free to handle a signal. With
# the server in the foreground, bash defers every trap until it exits, which is
# exactly when the cleanup is needed.
cloudcannon dev "$OUTPUT" --port "$PORT" &
SERVE_PID=$!

cleanup() {
  trap - EXIT INT TERM
  kill_tree "$SERVE_PID"
  kill_tree "$WATCH_PID"
}
trap cleanup EXIT INT TERM

# Whichever exits first takes the other down with it. Polled rather than
# `wait -n`, which macOS's bash 3.2 does not have.
while kill -0 "$SERVE_PID" 2>/dev/null; do
  if [ -n "$WATCH_PID" ] && ! kill -0 "$WATCH_PID" 2>/dev/null; then
    echo "the watcher stopped — rebuilds are no longer happening" >&2
    break
  fi
  sleep 1
done
cleanup
