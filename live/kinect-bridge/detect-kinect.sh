#!/usr/bin/env bash
# detect-kinect.sh — identifica qué Kinect está conectado y qué hacer después.
set -u

echo "── Buscando Kinect en USB ──"
USB=$(lsusb)

if echo "$USB" | grep -q "045e:02ae\|045e:02b0\|045e:02ad"; then
  echo "✓ KINECT v1 (Xbox 360) detectado"
  echo "$USB" | grep "045e:02a\|045e:02b0"
  echo ""
  echo "Driver: sudo apt install -y freenect libfreenect-dev   (si no está)"
  echo "Probar visor:   freenect-glview"
  echo "Capturar:       bash capture-v1.sh"
  exit 0
fi

if echo "$USB" | grep -q "045e:02d8\|045e:02d9\|045e:02c4"; then
  echo "✓ KINECT v2 (Xbox One) detectado"
  echo "$USB" | grep "045e:02d8\|045e:02d9\|045e:02c4"
  echo ""
  echo "⚠ Necesita puerto USB 3.0 (los azules) + su adaptador de corriente."
  echo "Driver: bash setup-drivers.sh v2   (build de libfreenect2, ~5 min)"
  echo "Probar visor:   ~/libfreenect2/build/bin/Protonect"
  exit 0
fi

if echo "$USB" | grep -qi "045e:097"; then
  echo "✓ AZURE KINECT detectado — avisa a Claude, se prepara el SDK k4a."
  exit 0
fi

echo "✗ No hay ningún Kinect en USB."
echo ""
echo "Checklist:"
echo "  1. Kinect v1 (Xbox 360): necesita su adaptador de corriente naranja + USB."
echo "  2. Kinect v2 (Xbox One): necesita el adaptador de corriente + puerto USB 3.0 (azul)."
echo "  3. Conéctalo a Cerebro4 y vuelve a correr: bash detect-kinect.sh"
echo ""
echo "USB actual:"
echo "$USB"
exit 1
