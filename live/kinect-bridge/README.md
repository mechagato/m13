# kinect-bridge — objeto físico → mundo m13

Captura un objeto real con el Kinect y lo convierte en SDFs (metaballs) dentro
de una escena `.m13` caminable — abrible en el Quest 3 vía share link, sin backend.

**Módulo del subproyecto m13 Live (Idea 4, crowd-mirror v0).** Este es el paso 1:
captura estática de UN objeto. El paso 2 (público en vivo por WebSocket) viene después.

## Flujo para Gato (5 minutos)

```bash
cd ~/neonodos-core/m13-live/kinect-bridge

# 1. Conecta el Kinect a Cerebro4 (v1: adaptador naranja + USB · v2: adaptador + USB 3.0 azul)
bash detect-kinect.sh          # te dice qué Kinect es y qué sigue

# 2. UNA VEZ: instalar drivers (pide tu password de sudo)
bash setup-drivers.sh v1       # o v2, o both si no sabes cuál es

# 3. Verifica que el Kinect ve: (v1)
freenect-glview                # debes ver el depth en colores — ciérralo con ESC

# 4. Pon el objeto a 60-120cm del Kinect (nada más cerca) y captura:
bash capture-v1.sh mi_objeto   # → genera out/mi_objeto.m13 + share link

# 5. Abre el link impreso en el Quest 3 / celular / laptop. Camina alrededor.
```

## Probar SIN Kinect (ya verificado)

```bash
python3 depth2m13.py --fake    # objeto sintético → .m13 válido + share link
```

## Cómo funciona

```
Kinect depth (mm) ──→ segmentación del objeto más cercano (banda percentil-2 +
componente conexa) ──→ backproject con intrínsecas v1/v2 ──→ nube de puntos ──→
k-means a ≤24 esferas (radio p80 ×1.25 para que el smooth-union las funda) ──→
YAML .m13 (sala de concreto + luz cálida) ──→ validación contra el parser/compiler
REAL del motor (tools/validate-scene.ts) ──→ share link #scene= base64url
```

- Constitution m13 ✓: todo local, cero nube, cero LLM.
- El `.m13` resultante pesa ~3.5 KB — el "escaneo" completo viaja en una URL.
- Material por default `metal_dorado_pulido` (cámbialo con `--material piedra_volcanica`, etc.)

## Kinect v2 (Xbox One)

`capture-v1.sh` usa freenect-record (solo v1). Para v2: `setup-drivers.sh v2` compila
libfreenect2; el dump de frames v2 → `depth2m13.py --npy` requiere un grabber corto
(pendiente — se hace en cuanto sepamos que el Kinect de Gato es v2).

## Limitaciones honestas v0

- Captura UN frame estático: el lado oculto del objeto no existe (es depth, no scan 360°).
  Para volumen completo: girar el objeto y fusionar 4 capturas (v1 del roadmap).
- 24 esferas = silueta abstracta/escultórica, no réplica fiel — ese es el look m13 Live
  ("el público se ve modelado, editado raro"), no fotogrametría.
