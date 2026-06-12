#!/usr/bin/env python3
"""
depth2m13 — convierte un frame de profundidad (Kinect) en una escena .m13.

El objeto físico más cercano a la cámara se segmenta del fondo, se nubea a 3D
con las intrínsecas del Kinect, y se ajusta a N esferas (metaballs) que el motor
m13 funde con su smooth union. Salida: archivo .m13 validado + share link que
abre el mundo caminable en motor13.neonodos.com (Quest incluido).

Pipeline: depth → máscara del objeto más cercano → backproject 3D → k-means →
esferas → YAML .m13 → validación contra el parser/compiler real → share URL.

Uso:
  python3 depth2m13.py --fake                    # demo sin Kinect (depth sintético)
  python3 depth2m13.py --pgm capture/depth.pgm   # frame de freenect-record (Kinect v1)
  python3 depth2m13.py --npy depth_mm.npy        # array HxW en milímetros (cualquier fuente)

Opciones: --camera v1|v2 · --spheres N · --material <concepto> · --name <id> · --out dir
"""

from __future__ import annotations

import argparse
import base64
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage
from sklearn.cluster import MiniBatchKMeans

M13_ROOT = Path("/home/isai1618/neonodos-core/NeoNodos_System/m13")
SHARE_BASE = "https://motor13.neonodos.com/#scene="

# Intrínsecas del depth registrado (valores estándar de calibración de fábrica)
CAMERAS = {
    "v1": {"fx": 594.21, "fy": 591.04, "cx": 339.3, "cy": 242.7},  # 640×480
    "v2": {"fx": 365.46, "fy": 365.46, "cx": 254.9, "cy": 205.6},  # 512×424
}


# ──────────────────────────────────────────────────────────────
# Entrada de depth
# ──────────────────────────────────────────────────────────────
def load_pgm(path: Path) -> np.ndarray:
    """Lee PGM 16-bit de freenect-record. Si los valores parecen raw 11-bit
    de Kinect v1 (<=2047), los convierte a milímetros con la fórmula de tangente."""
    with open(path, "rb") as f:
        magic = f.readline().strip()
        if magic not in (b"P5", b"P2"):
            sys.exit(f"[depth2m13] {path} no es un PGM (magic {magic!r})")
        line = f.readline()
        while line.startswith(b"#"):
            line = f.readline()
        w, h = map(int, line.split())
        maxval = int(f.readline())
        if magic == b"P5":
            dtype = ">u2" if maxval > 255 else "u1"
            data = np.frombuffer(f.read(), dtype=dtype, count=w * h).reshape(h, w)
        else:
            data = np.loadtxt(f, dtype=np.uint16).reshape(h, w)
    data = data.astype(np.float64)
    if data.max() <= 2047:  # raw 11-bit Kinect v1 → mm
        with np.errstate(all="ignore"):
            depth_m = 0.1236 * np.tan(data / 2842.5 + 1.1863)
        depth_m[data >= 2047] = 0  # 2047 = sin lectura
        return depth_m * 1000.0
    return data  # ya está en mm


def fake_depth() -> np.ndarray:
    """Depth sintético 640×480 en mm: pared al fondo + un 'objeto' tipo muñeco
    de nieve (tres esferas apiladas) a ~90cm. Para probar el pipeline sin Kinect."""
    h, w = 480, 640
    cam = CAMERAS["v1"]
    depth = np.full((h, w), 2200.0)  # pared a 2.2m
    vv, uu = np.mgrid[0:h, 0:w]
    # esferas del objeto: (X, Y, Z en metros, radio)
    spheres = [(0.0, -0.12, 0.92, 0.16), (0.0, 0.10, 0.90, 0.12), (0.0, 0.26, 0.89, 0.08)]
    for X, Y, Z, R in spheres:
        # proyectar el frente de cada esfera al z-buffer
        x = (uu - cam["cx"]) / cam["fx"]
        y = -(vv - cam["cy"]) / cam["fy"]
        # rayo (x, y, 1) normalizado contra esfera centrada en (X, Y, Z)
        a = x * x + y * y + 1
        b = -2 * (x * X + y * Y + Z)
        c = X * X + Y * Y + Z * Z - R * R
        disc = b * b - 4 * a * c
        hit = disc > 0
        t = np.where(hit, (-b - np.sqrt(np.abs(disc))) / (2 * a), np.inf)
        z_mm = t * 1000.0  # t ≈ profundidad en metros sobre el rayo ~z
        depth = np.where(hit & (z_mm < depth), z_mm, depth)
    depth += np.random.default_rng(13).normal(0, 3, depth.shape)  # ruido sensor
    return depth


# ──────────────────────────────────────────────────────────────
# Segmentación + nube de puntos
# ──────────────────────────────────────────────────────────────
def segment_nearest(depth_mm: np.ndarray, band_mm: float = 350.0) -> np.ndarray:
    """Máscara del objeto más cercano: banda de profundidad desde el percentil 2
    de lecturas válidas + componente conexa más grande."""
    valid = depth_mm > 300  # <30cm = ruido/min range del Kinect
    if valid.sum() < 1000:
        sys.exit("[depth2m13] frame casi vacío — ¿el Kinect está tapado?")
    zmin = np.percentile(depth_mm[valid], 2)
    mask = valid & (depth_mm <= zmin + band_mm)
    labels, n = ndimage.label(mask)
    if n == 0:
        sys.exit("[depth2m13] no se encontró objeto en la banda cercana")
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    mask = labels == (1 + int(np.argmax(sizes)))
    if mask.sum() < 500:
        sys.exit(f"[depth2m13] objeto demasiado chico ({int(mask.sum())} px) — acércalo")
    return mask


def backproject(depth_mm: np.ndarray, mask: np.ndarray, cam: dict) -> np.ndarray:
    """Pixeles enmascarados → puntos 3D en metros (Y hacia arriba)."""
    vv, uu = np.nonzero(mask)
    z = depth_mm[vv, uu] / 1000.0
    x = (uu - cam["cx"]) * z / cam["fx"]
    y = -(vv - cam["cy"]) * z / cam["fy"]
    return np.column_stack([x, y, z])


def fit_metaballs(points: np.ndarray, n_spheres: int) -> list[tuple[np.ndarray, float]]:
    """K-means sobre la nube → (centro, radio) por cluster. El radio se infla
    25% para que el smooth union del motor funda las esferas en una superficie."""
    k = min(n_spheres, max(4, len(points) // 80))
    km = MiniBatchKMeans(n_clusters=k, n_init=4, random_state=13).fit(points)
    balls = []
    for i, c in enumerate(km.cluster_centers_):
        pts = points[km.labels_ == i]
        if len(pts) < 12:
            continue
        r = float(np.percentile(np.linalg.norm(pts - c, axis=1), 80)) * 1.25
        balls.append((c, float(np.clip(r, 0.05, 0.40))))
    return balls


def normalize_to_room(balls: list[tuple[np.ndarray, float]], target_h: float = 1.5):
    """Centra el objeto en el origen de la sala, lo escala a ~1.5m de alto
    y lo asienta sobre el piso (y = -2.7 + margen)."""
    centers = np.array([c for c, _ in balls])
    radii = np.array([r for _, r in balls])
    lo = (centers - radii[:, None]).min(axis=0)
    hi = (centers + radii[:, None]).max(axis=0)
    size = hi - lo
    scale = target_h / max(size[1], 1e-6)
    scale = min(scale, 2.5)  # no inflar objetos chicos más de 2.5×
    centers = (centers - (lo + hi) / 2) * scale
    radii = radii * scale
    floor_y = -2.7 + 0.05
    centers[:, 1] += floor_y + (size[1] * scale) / 2  # asentado en el piso
    centers[:, 2] *= -1  # la cámara Kinect mira +z; la sala mira -z
    centers[:, 2] -= centers[:, 2].mean()  # centrado en z de la sala
    return [(centers[i], float(radii[i])) for i in range(len(balls))]


# ──────────────────────────────────────────────────────────────
# Emisión .m13 + validación + share link
# ──────────────────────────────────────────────────────────────
def emit_m13(balls, name: str, material: str) -> str:
    f3 = lambda v: f"[{v[0]:.3f}, {v[1]:.3f}, {v[2]:.3f}]"
    objs = []
    for i, (c, r) in enumerate(sorted(balls, key=lambda b: b[0][1])):
        objs.append(
            f"  - id: blob_{i:02d}\n"
            f"    kind: sphere\n"
            f"    material: {material}\n"
            f"    position: {f3(c)}\n"
            f"    scale: {r:.3f}"
        )
    return f"""# {name} — objeto físico capturado con Kinect → metaballs m13
# Generado por depth2m13.py (m13-live / kinect-bridge)

version: "0.1"
name: {name}
description: "Objeto físico escaneado con Kinect y esculpido como SDFs en m13"

bounds: [4.5, 2.7, 4.5]
spawn: [0, 0, -3.6]

ambient:
  background: [0.05, 0.055, 0.06]
  ambientColor: [0.16, 0.17, 0.18]
  tint: [1.0, 1.0, 1.0]
  fogColor: [0.05, 0.055, 0.06]
  fogDensity: 0.012

light:
  position: [0.8, 2.4, -1.2]
  color: [1.0, 0.96, 0.9]
  intensity: 1.5

walls:
  concept: pared_concreto_pulido

floor:
  concept: piso_concreto_industrial

ceiling:
  concept: pared_yeso_blanco

objects:
{chr(10).join(objs)}
"""


def validate(m13_path: Path) -> str:
    """Valida contra el parser/compiler REAL del motor (no una copia)."""
    r = subprocess.run(
        ["npx", "tsx", "tools/validate-scene.ts", str(m13_path)],
        cwd=M13_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if r.returncode != 0:
        sys.exit(f"[depth2m13] la escena NO validó contra el motor:\n{r.stderr.strip()}")
    return r.stdout.strip()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--fake", action="store_true", help="depth sintético (probar sin Kinect)")
    src.add_argument("--pgm", type=Path, help="PGM de freenect-record (Kinect v1)")
    src.add_argument("--npy", type=Path, help="array numpy HxW en mm")
    ap.add_argument("--camera", choices=["v1", "v2"], default="v1")
    ap.add_argument("--spheres", type=int, default=24, help="máx esferas (default 24)")
    ap.add_argument("--material", default="metal_dorado_pulido")
    ap.add_argument("--name", default="objeto_capturado")
    ap.add_argument("--out", type=Path, default=Path(__file__).parent / "out")
    args = ap.parse_args()

    if args.fake:
        depth = fake_depth()
    elif args.pgm:
        depth = load_pgm(args.pgm)
    else:
        depth = np.load(args.npy).astype(np.float64)

    cam = CAMERAS[args.camera]
    mask = segment_nearest(depth)
    pts = backproject(depth, mask, cam)
    print(f"[depth2m13] objeto: {mask.sum()} px → {len(pts)} puntos 3D")
    balls = normalize_to_room(fit_metaballs(pts, args.spheres))
    print(f"[depth2m13] {len(balls)} metaballs ajustadas")

    yaml_text = emit_m13(balls, args.name, args.material)
    args.out.mkdir(parents=True, exist_ok=True)
    out_path = args.out / f"{args.name}.m13"
    out_path.write_text(yaml_text)
    print(f"[depth2m13] {out_path} · {validate(out_path)}")

    token = base64.urlsafe_b64encode(yaml_text.encode()).decode().rstrip("=")
    print(f"\n🔗 ÁBRELO EN EL QUEST / CUALQUIER NAVEGADOR:\n{SHARE_BASE}{token}\n")


if __name__ == "__main__":
    main()
