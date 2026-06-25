#!/bin/bash
# Stop hook — re-sella la memoria .phi (solo con clave persistente; no destructivo).
set -uo pipefail
DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SCRIPT="$DIR/phi-companion/companion_memory.py"
[ -f "$SCRIPT" ] || exit 0
PY="$(command -v python3 || command -v python || command -v py || true)"
[ -n "$PY" ] || exit 0
"$PY" "$SCRIPT" seal --require-persistent-key 2>&1 || true
exit 0
