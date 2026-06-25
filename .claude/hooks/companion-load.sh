#!/bin/bash
# SessionStart hook — carga la memoria .phi del phi-companion (stdlib pura, 0 deps).
set -uo pipefail
DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SCRIPT="$DIR/phi-companion/companion_memory.py"
[ -f "$SCRIPT" ] || exit 0
PY="$(command -v python3 || command -v python || command -v py || true)"
[ -n "$PY" ] || exit 0
"$PY" "$SCRIPT" load --format hook 2>/dev/null || exit 0
