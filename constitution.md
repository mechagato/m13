# m13 — Constitution

**Versión:** 0.1.1
**Estado:** Research / Experimental
**Mantenedor:** Genaro Isaí "Gato" García Torres
**Repositorio:** github.com/mechagato/m13
**Licencia:** MIT
**Última actualización:** 2026-08-22

---

## 1. Identidad del proyecto

`m13` es un motor de **síntesis local de mundos interactivos** basado en representación semántica y detalle continuo subdividido matemáticamente. Se inspira conceptualmente en el **Sonido 13 de Julián Carrillo** (microtonalismo aplicado a geometría espacial) y en los principios de **compresión semántica** (transmitir significado en lugar de datos crudos).

El nombre `m13` honra a Carrillo, a la tradición experimental mexicana, y al principio matemático de subdivisión infinita entre valores discretos.

### Distinción de identidad

- **Nombre técnico / research:** `m13`
- **Nombre comercial futuro (TBD):** M13 Engine · Continuum 13
- **Nombre en código de aplicaciones derivadas:** `m13-renderer`, `m13-editor`, `m13-runtime`

---

## 2. Visión

Construir un motor gráfico que **no almacena mundos como geometría pesada**, sino como descriptores semánticos compactos, sintetizando detalle, materiales y temporalidad localmente en el dispositivo del usuario.

El objetivo NO es competir con Unity o Unreal en su categoría. El objetivo es **abrir una categoría nueva**: motores de síntesis para WebXR y aplicaciones donde el peso de assets, el tiempo de iteración y la portabilidad importan más que la compatibilidad con pipelines tradicionales.

### Casos de uso ancla

1. **PLANVR** — visualización CAD-to-VR para inmobiliarias y manufactura. Cliente piloto natural.
2. **WebXR experiences** — Quest 3, Vision Pro, Pico, navegadores móviles con XR.
3. **Configuradores de espacios** — cocinas (Cocinas Quintana), interiores, retail.
4. **Investigación abierta** — papers, demos, contribución a la comunidad de gráficos.

### Nota de roadmap (2026-07-02, formaliza decisión de Gato del 2026-05-22)

El roadmap operativo hacia Innovafest (dic 2026), definido en CLAUDE.md, SALTA las Fases 3 (síntesis neural) y 4 (Gaussian Splatting) y prioriza Fase 5 (WebXR inmersivo). Las Fases 3-4 se re-agendan post-Innovafest (2027) con decisión go/no-go explícita de Gato. La tesis H4 (síntesis neural) queda deliberadamente sin validar hasta entonces — riesgo aceptado y documentado. Bump de versión 0.1.0→0.1.1 por esta nota (regla §8.1); justificación en BITACORA_MOTOR13.md entrada 033.

---

## 3. Principios arquitectónicos (NO negociables)

### 3.1 Local-first absoluto

Todo el runtime del motor corre en el dispositivo del usuario. **Cero dependencia de nube para renderizar**. La nube puede usarse exclusivamente para:
- Almacenamiento de descriptores `.m13` (assets, no compute)
- Editor colaborativo (no runtime)
- Distribución de modelos neurales pre-entrenados

Si una funcionalidad requiere internet activo para que la escena se vea, NO entra al core.

### 3.2 WebGPU como API gráfica única

Se descarta WebGL y Canvas 2D. Se descarta también soporte nativo Vulkan/Metal/DX en el MVP. **WebGPU es la única superficie de hardware soportada**. Esto cubre:
- Chrome/Edge desktop y mobile
- Safari (cuando libere WebGPU estable)
- Navegador del Quest 3 (basado en Chromium)
- Vision Pro (Safari + WebGPU progresivo)

Beneficio: un solo target, compute shaders nativos, paridad cross-platform.

### 3.3 Representación semántica antes que geométrica

El formato `.m13` describe **qué es** un objeto, no **cómo se ve píxel por píxel**. La síntesis ocurre en runtime. Esto implica:
- Cero archivos `.fbx`, `.obj`, `.gltf` como ciudadanos de primera clase
- Texturas se sintetizan, no se cargan (excepto Gaussian Splats de captura real)
- Una escena completa se describe en kilobytes, no gigabytes

### 3.4 Detalle continuo, no discreto

El motor evalúa funciones matemáticas continuas (SDFs, ruido, neural fields) en lugar de polígonos discretos. El detalle escala con la atención del usuario (distancia + foveación), no con un LOD fijo.

Inspiración Sonido 13: metáfora cultural de subdivisión más allá de una grilla fija. En runtime se implementa como detalle continuo por footprint (`fbm_continuous`) — técnica de gráficos (LOD/fBm), no el motor de escalas musicales de Carrillo. El homenaje es intencional; el claim de “algoritmo musical de Carrillo en GPU” no forma parte de esta constitution.

### 3.5 Determinismo en runtime

Las mismas entradas producen las mismas salidas. **El LLM no participa en runtime**. Toda generación procedural usa seeds explícitas. Esto permite:
- Replay confiable
- Debug temporal (Fase 6)
- Multiplayer eventual sin sincronización compleja

### 3.6 Aprovechamiento del silicio dormido

El motor distribuye carga deliberadamente para usar hardware subutilizado:
- **GPU compute shaders:** 55-65% del trabajo (raymarching, evaluación procedural)
- **NPU / Neural Engine:** 15-20% (síntesis neural de materiales)
- **CPU:** 10-15% (parser, scheduler, físicas básicas)
- **RAM:** caché agresivo de resultados sintetizados

Se prioriza compute sobre memory bandwidth, que es el cuello de botella real de los motores actuales.

### 3.7 Editor-time vs runtime separados con disciplina

Toda funcionalidad asistida por LLM, generación creativa, autoría natural, integración con AURAI vive en **editor-time**. El runtime es matemática pura + inferencia neural local determinista. Esta separación es ley.

### 3.8 Documentación en español mexicano para el core, inglés para APIs públicas

- `BITACORA_MOTOR13.md`, comentarios internos, decisiones de arquitectura: español mexicano informal (tono NeoNodos)
- READMEs públicos, JSDoc, API references: inglés técnico
- Mensajes de commit: inglés conciso

---

## 4. Stack tecnológico

### 4.1 Frontend / runtime

- **Lenguaje:** TypeScript estricto (`strict: true`, `noImplicitAny: true`)
- **Build:** Vite 5+ con WebGPU types
- **Render API:** WebGPU (sin fallback)
- **Shader language:** WGSL
- **Scene graph helper (opcional):** Three.js solo para cámara/controles, no para render
- **Inferencia neural:** ONNX Runtime Web con backend WebGPU
- **Audio (Fase 0+):** Web Audio API + Tone.js
- **Gaussian Splatting (Fase 4+):** gsplat.js o implementación propia
- **WebXR:** WebXR Device API nativa, sin frameworks intermedios

### 4.2 Editor (Fase 2+)

- **UI:** Next.js 14 + React + Tailwind (consistencia con stack NeoNodos)
- **3D preview:** mismo runtime `m13`
- **Storage de `.m13`:** Supabase (consistencia NeoNodos)
- **LLM editor-time:** Claude API (compilador de intención → `.m13` formal)

### 4.3 Infra

- **Hosting demos:** Vercel (rápido, edge, gratis para research)
- **Repo:** GitHub `mechagato/neonodos`, submódulo `motor-13/`
- **CI:** GitHub Actions para build + deploy de demos
- **Documentación pública:** mkdocs material o Nextra (decidir en Fase 1)

---

## 5. Restricciones explícitas

### Lo que `m13` NO es y NO será

- ❌ NO es un fork de Unreal, Unity, Godot, Bevy, ni de ningún engine existente
- ❌ NO renderiza polígonos como ciudadanos de primera clase
- ❌ NO depende de la nube para funcionar
- ❌ NO usa LLM en runtime
- ❌ NO promete reemplazar pipelines AAA en su MVP
- ❌ NO se desarrolla en C++ ni Rust nativo en el MVP (post-MVP quizá)
- ❌ NO soporta WebGL ni navegadores legacy

### Lo que NO está en scope hasta nuevo aviso

- Multiplayer / netcode
- Audio espacial 3D avanzado (más allá del modulador audio-reactivo experimental)
- Editor visual completo tipo Unreal (Fase 4+ tiene editor mínimo)
- Marketplace de assets
- Sistema de scripting tipo Blueprints
- Compatibilidad con consolas (PS5, Xbox)

---

## 6. Estructura del repositorio (target)

```
motor-13/
├── constitution.md           # Este documento
├── README.md                 # Inglés, público
├── BITACORA_MOTOR13.md      # Español, log de sesiones
├── docs/
│   ├── spec/                 # Specs SDD por fase
│   ├── plans/                # Planes técnicos
│   ├── tasks/                # Task lists por fase
│   └── papers/               # Documentos técnicos / research notes
├── packages/
│   ├── runtime/              # Core engine (TypeScript + WGSL)
│   ├── renderer/             # Render pipeline WebGPU
│   ├── synth/                # Síntesis procedural + neural
│   ├── editor/               # Next.js editor (Fase 2+)
│   └── examples/             # Demos por fase
├── shaders/
│   ├── sdf/                  # Primitivas y operaciones SDF
│   ├── materials/            # Materiales procedurales
│   ├── neural/               # Shaders de inferencia
│   └── compose/              # Composición híbrida
├── models/                   # ONNX models (Git LFS)
├── m13-spec/                 # Especificación del formato .m13
└── tools/
    ├── m13-compiler/         # CLI: .m13 → bundles optimizados
    └── m13-cli/              # CLI dev: serve, build, deploy
```

---

## 7. Glosario

- **`.m13`** — formato de descriptor semántico de escena. JSON o YAML estructurado.
- **Sabio Sintetista** — agente AURAI (polo Yang) responsable de componer `.m13` y elegir representaciones (Fase 4+).
- **Sabio Compositor** — agente AURAI (polo Yang) responsable de escenas temporales (Fase 6+).
- **SDF** — Signed Distance Field. Función matemática que define geometría implícita.
- **WGSL** — WebGPU Shading Language. Lenguaje de shaders del motor.
- **Foveated rendering** — renderizado con detalle alto solo donde el ojo enfoca.
- **TRIO obligatorio** — regla NeoNodos: Landing + WhatsApp Agent + Contenido juntos. NO aplica directamente a `m13` por ser research, pero al lanzar producto comercial sí aplicará.

---

## 8. Reglas de gobernanza

### 8.1 Cambios a esta Constitution

Esta Constitution se modifica solo con commit explícito en `main`, justificación en `BITACORA_MOTOR13.md`, y bump de versión. Los principios de la sección 3 requieren además discusión documentada antes de cambiar.

### 8.2 SDD por fase

Cada fase del roadmap genera su propio Spec Kit:
- `docs/spec/phase-N-spec.md`
- `docs/plans/phase-N-plan.md`
- `docs/tasks/phase-N-tasks.md`

Claude Code es el agente de desarrollo principal, con check-ins humanos en cada fase.

### 8.3 Bitácora

`BITACORA_MOTOR13.md` se actualiza al menos una vez por sesión de desarrollo con:
- Fecha y duración
- Qué se intentó
- Qué jaló y qué no
- Decisiones tomadas
- Próximo paso concreto

### 8.4 Licencia

**MIT** (decisión de Gato, 2026-08-22). El repositorio se publica como open source gratuito. Ver `LICENSE` en la raíz. Dual-license comercial queda descartada para este lineamiento; un fork o producto derivado puede tener su propio modelo de negocio sin cambiar la licencia del core.

---

## 9. Tesis verificables (lo que estamos probando)

Estas son las hipótesis científicas que `m13` busca validar:

**H1.** Una escena 3D habitable puede describirse en <50KB de descriptor semántico y renderizarse con calidad perceptual equivalente a una escena Unity de varios MB.

**H2.** El detalle visual continuo subdividido matemáticamente (Sonido 13) produce una firma estética identificable y agradable, distinta de cualquier motor actual.

**H3.** La distribución de carga GPU compute + NPU + RAM caché supera en eficiencia (FPS por watt) al pipeline de memory-bandwidth-pesado de motores tradicionales en hardware móvil/XR.

**H4.** La síntesis neural local de materiales en NPU puede producir variedad y calidad superior al texturing precargado en hardware mid-range (Quest 3, iPhone 15 Pro, M3).

**H5.** El editor LLM editor-time puede generar `.m13` válidos a partir de lenguaje natural con >70% de precisión, sin contaminar el runtime con dependencias de nube.

Cada hipótesis tendrá su demo público y su documento de resultados.

---

## 10. Firma fundacional

> "El motor no descarga gráficos. Descarga significado."
>
> — Principio cero, m13

---

*Fin de la Constitution. Cualquier código, decisión, o spec que contradiga este documento queda invalidado hasta resolución explícita.*
