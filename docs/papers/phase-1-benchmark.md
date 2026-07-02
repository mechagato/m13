# Benchmark Fase 1 — m13 vs Three.js (T-062 / T-063 / T-064)

> Criterio SC-5 del Spec Kit Fase 1. Hipótesis **H1**: m13 logra **>10× de reducción
> de peso de assets** vs un motor tradicional para una escena equivalente.
>
> Fecha: 2026-06-11 · Entorno: Cerebro4 (Ubuntu, Node v22.22.2) · Three.js r165 · m13 v0.1.0
> Material para Innovafest — credibilidad > marketing: se reportan también los números
> que NO favorecen a m13.

---

## Encuadre obligatorio al citar este benchmark (auditoría 2026-07-02)

Puntos verificados forensemente — cualquier cita externa de este documento (pitch,
landing, paper, Innovafest) debe respetar este encuadre:

- **El 30.8× es reducción de PESO DE ASSETS DE ESCENA** (descriptor semántico de
  2,014 B vs HTML+JS+4 texturas JPG = 62,115 B), **NO rendimiento del motor**.
- **El 91% del peso Three.js son texturas** (56,414 B); sin texturas el ratio cae a
  ~2.83×. El claim >10× depende del supuesto de pipeline texturizado tradicional
  (defendible como caso típico, pero hay que declararlo).
- Considerando el bundle del motor, la reducción de **PRIMERA CARGA total es ~2.5×**.
- El bundle m13 citado abajo (289,461 B raw / 70,935 gz) quedó **desactualizado tras
  Fase 2**: hoy ~319,474 B raw / ~80,458 gz. El claim "bundle m13 < bundle Three"
  se mantiene (~2.1×).
- "Compila a WGSL válido" está **verificado en CI**; "renderiza a 60fps" es una
  **medición manual en un solo equipo** (laptop de Gato), no reproducida
  independientemente.

---

## Resumen ejecutivo

Se replicó la escena `sala_galeria.m13` (galería white-cube: cuarto 6×3.5×6 m con
paredes de yeso, piso de mármol, esfera escultórica, torus de bronce, cubo de mármol,
luz cenital + fog) en Three.js r165 sobre WebGL, con texturas JPG procedurales como
assets reales — porque eso es lo que un motor tradicional necesita descargar.

**Resultado central: la escena m13 pesa 2,014 bytes; la escena Three.js equivalente
pesa 62,115 bytes (HTML + JS + 4 texturas). Reducción de 30.8×. H1 (>10×) VALIDADA.**

Dato secundario ya medido en FlowCAD: pieza GLB de 15 KB → `.m13` de 0.9 KB = **16×**.
Dos casos independientes, ambos arriba del umbral 10×.

---

## Metodología

### Escena de referencia

`packages/examples/public/scenes/sala_galeria.m13` — 2,014 bytes de YAML semántico.
6 objetos + walls/floor/ceiling con conceptos materiales procedurales
(`pared_yeso_blanco`, `piso_marmol_blanco`, `pedestal_marmol`, `metal_bronce_pulido`,
`marmol_blanco_vetas`, `esfera_decorativa`).

### Réplica Three.js (`tools/bench/threejs-comparison/`)

- `index.html` + `scene.js`: escena WebGL standalone sin framework. Cuarto BoxGeometry
  con materiales por cara (BackSide), 3 pedestales cilíndricos, esfera con
  `MeshPhysicalMaterial` iridiscente, torus de bronce metálico, cubo de mármol,
  PointLight cenital con sombras + AmbientLight + FogExp2. Valores (bounds, spawn,
  posiciones, animación bob 0.3/0.04) tomados 1:1 del `.m13`.
- `generate-textures.mjs`: Three.js no puede expresar "mármol con vetas" sin un asset.
  Se generaron 4 texturas JPG 512×512 q80 con value-noise/fBm en JS puro + `sharp`
  (yeso, mármol piso, mármol vetado, bronce). 512 px y JPEG q80 es ya un presupuesto
  *generoso a favor de Three.js* — producción típica usa 1K–2K y mapas adicionales
  (normal/roughness) que aquí ni se contaron.
- `bench-load.mjs`: tiempos de preparación de escena en Node (sin GPU), 200 iteraciones.

### Qué se mide y qué no

GPU GT710 de Cerebro4 **no tiene WebGPU funcional** → FPS y memoria GPU quedan
`[PENDIENTE — laptop Gato]`. Las métricas de peso y CPU son exactas y reproducibles aquí.

---

## Tabla de resultados

| # | Métrica | m13 v0.1.0 (WebGPU) | Three.js r165 (WebGL) | Ratio |
|---|---------|---------------------|----------------------|-------|
| 1 | **Peso de assets de escena** | `.m13` = **2,014 B** | html 856 + scene.js 4,845 + 4 texturas JPG 56,414 = **62,115 B** | **30.8× a favor de m13** |
| 2 | **Bundle del motor** (raw / gzip -9) | 289,461 B / 70,935 B (size-limit reporta 58.64 KB con su compresión) | 677,935 B / 167,483 B (`three.module.min.js`) | 2.34× raw · 2.36× gzip a favor de m13 |
| 3 | **Preparación de escena en CPU** (Node, 200 iter) | parse + compileScene: p50 = 1.90 ms · p95 = 4.37 ms (ref previa: p95 = 21.67 ms con 50 objetos) | scene-graph build: p50 = 1.04 ms · p95 = 3.54 ms | **~1.8× a favor de Three.js** (ver Análisis) |
| 4 | FPS render | `[PENDIENTE — laptop Gato]` | `[PENDIENTE — laptop Gato]` | — |
| 5 | Memoria GPU | `[PENDIENTE — laptop Gato]` | `[PENDIENTE — laptop Gato]` | — |

Payload total primera carga (motor + escena, raw): m13 = 291,475 B vs Three.js = 740,050 B → **2.5×**.

---

## Análisis — ratio de compresión semántica

La ventaja de m13 no está en comprimir bytes sino en **dónde vive la información**.
`piso_marmol_blanco` con `veinIntensity: 0.25` son ~50 bytes que se expanden en
editor/compile-time a una función WGSL procedural; Three.js necesita transportar el
*resultado* (textura rasterizada de 12,900 bytes) por la red. El ratio crece con:

- **Resolución**: la textura m13 es continua (Sonido 13) — no hay versión "2K". Con
  texturas Three.js de 1K el ratio pasa de 30.8× a >100×.
- **Número de materiales**: cada concepto nuevo en m13 cuesta ~30-60 bytes de YAML;
  en Three.js cuesta otro archivo de imagen.
- **Geometría**: aquí Three.js usó primitivas (gratis). Con mallas reales (caso FlowCAD:
  GLB 15 KB → .m13 0.9 KB = 16×) el ratio de geometría también supera 10×.

**Honestidad sobre la métrica 3**: la construcción de scene-graph de Three.js es más
rápida que parse+compile de m13 (1.04 vs 1.90 ms p50). Es esperable — m13 ensambla y
valida WGSL completo. La comparación además es asimétrica en ambos sentidos: el número
de Three.js *no* incluye descarga+decode de las 4 JPG ni upload a GPU (solo medible en
browser), y el de m13 no incluye creación del pipeline WebGPU. A escala humana ambos
son <5 ms: irrelevantes frente al tiempo de red que sí domina (60 KB extra de assets).

---

## Veredicto H1

> **H1 VALIDADA: 30.8× de reducción de peso de assets de escena (2,014 B vs 62,115 B), supera el umbral de 10× por 3×.**

Corroborado por el caso independiente FlowCAD (16×). Si se incluye el bundle del motor
en el total, la reducción es 2.5× — útil saberlo, pero H1 se formuló sobre assets de
escena, que es lo que escala con el contenido (el motor se descarga una vez y se cachea).

---

## Limitaciones (lectura obligada antes de citar esto en público)

1. **FPS y memoria GPU sin medir** — Cerebro4 (GT710) no corre WebGPU. Es perfectamente
   posible que Three.js/WebGL gane en FPS en hardware modesto: raymarching SDF es
   compute-bound. H1 es sobre peso, no sobre velocidad de render.
2. **Three.js gana en madurez y compatibilidad**: WebGL corre en ~98% de dispositivos;
   WebGPU hoy es Chrome/Edge desktop + Quest 3. Ecosistema, docs y tooling de Three.js
   son incomparablemente mayores.
3. **Three.js gana en preparación CPU de escena** (~1.8×) y su pipeline rasterizado
   escala mejor con número de objetos que un raymarcher naive.
4. La "equivalencia visual" es por juicio humano, no por métrica perceptual (SSIM
   pendiente como trabajo futuro).
5. Texturas de 512 px favorecen a Three.js; el ratio reportado es **conservador**.

### Cómo cierra Gato las métricas 4 y 5 en su laptop (2 pasos)

1. `cd tools/bench/threejs-comparison && npm run serve` → abrir `http://localhost:8413`
   (FPS en HUD); para m13: `pnpm dev` → cargar `sala_galeria` (FPS en HUD del ejemplo).
2. Memoria GPU: Chrome DevTools → More tools → Performance monitor → "GPU memory"
   (o `chrome://gpu`), anotar ambos valores con la escena corriendo 60 s.

---

## Comandos de reproducción

```bash
cd tools/bench/threejs-comparison
npm install                       # three 0.165.0 + sharp (NO es parte del workspace pnpm)

# Métrica 1 — peso de assets
wc -c ../../../packages/examples/public/scenes/sala_galeria.m13    # 2014
node generate-textures.mjs                                         # regenera ./textures/
wc -c index.html scene.js textures/*.jpg                           # 62115 total

# Métrica 2 — bundle del motor
wc -c ../../../packages/runtime/dist/m13-runtime.js                          # 289461
gzip -9 -c ../../../packages/runtime/dist/m13-runtime.js | wc -c             # 70935
wc -c node_modules/three/build/three.module.min.js                           # 677935
gzip -9 -c node_modules/three/build/three.module.min.js | wc -c              # 167483

# Métrica 3 — preparación de escena (Node, sin GPU)
node bench-load.mjs

# Visual — abrir la réplica Three.js en browser
npm run serve     # http://localhost:8413
```

---

*T-062/T-063/T-064 · Fase 1 SC-5 · benchmark ejecutado en Cerebro4, FPS/GPU pendientes de laptop con WebGPU.*
