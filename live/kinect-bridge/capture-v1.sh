#!/usr/bin/env bash
# capture-v1.sh — captura un frame de profundidad del Kinect v1 y lo convierte a .m13.
# Pon el objeto a ~60-120cm del Kinect, sin nada más cerca, y corre este script.
set -euo pipefail

cd "$(dirname "$0")"
CAP_DIR="capture/$(date +%H%M%S)"
mkdir -p "$CAP_DIR"

echo "── Capturando 2 segundos de depth (no muevas el objeto) ──"
timeout 2 freenect-record "$CAP_DIR" || true

PGM=$(ls -t "$CAP_DIR"/*.pgm 2>/dev/null | head -1)
if [[ -z "$PGM" ]]; then
  echo "✗ No se capturó depth. ¿freenect-glview funciona? ¿corriste setup-drivers.sh v1?"
  exit 1
fi
echo "✓ Frame: $PGM"

python3 depth2m13.py --pgm "$PGM" --camera v1 --name "${1:-objeto_capturado}"
