#!/usr/bin/env bash
# setup-drivers.sh — instala el stack de drivers del Kinect (requiere sudo).
# Uso: bash setup-drivers.sh v1   |   bash setup-drivers.sh v2   |   bash setup-drivers.sh both
set -euo pipefail

V="${1:-both}"

if [[ "$V" == "v1" || "$V" == "both" ]]; then
  echo "── Kinect v1: libfreenect desde apt ──"
  sudo apt install -y freenect libfreenect-dev
  # Regla udev para usar el Kinect sin root
  sudo tee /etc/udev/rules.d/51-kinect.rules > /dev/null << 'EOF'
SUBSYSTEM=="usb", ATTR{idVendor}=="045e", ATTR{idProduct}=="02ae", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="045e", ATTR{idProduct}=="02ad", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="045e", ATTR{idProduct}=="02b0", MODE="0666"
EOF
  sudo udevadm control --reload-rules
  echo "✓ v1 listo. Conecta el Kinect y prueba: freenect-glview"
fi

if [[ "$V" == "v2" || "$V" == "both" ]]; then
  echo "── Kinect v2: libfreenect2 desde fuente ──"
  sudo apt install -y build-essential cmake pkg-config libusb-1.0-0-dev \
    libturbojpeg0-dev libglfw3-dev ocl-icd-opencl-dev
  if [[ ! -d "$HOME/libfreenect2" ]]; then
    git clone https://github.com/OpenKinect/libfreenect2.git "$HOME/libfreenect2"
  fi
  cd "$HOME/libfreenect2"
  mkdir -p build && cd build
  cmake .. -DENABLE_CXX11=ON -DBUILD_OPENNI2_DRIVER=OFF
  make -j"$(nproc)"
  sudo make install
  sudo cp ../platform/linux/udev/90-kinect2.rules /etc/udev/rules.d/
  sudo udevadm control --reload-rules
  echo "✓ v2 listo. Conecta el Kinect (USB 3.0 azul) y prueba: ./bin/Protonect"
fi

echo ""
echo "Después de conectar: bash detect-kinect.sh"
