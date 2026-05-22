# m13 · phase 1 — Spec

**Phase:** 1 of N
**Codename:** lenguaje `.m13` + librería de conceptos
**Status:** Drafted · Pending implementation
**Predecessor:** Phase 0 (proof of principle — raymarching SDF en single-file HTML)
**Successor:** Phase 2 (detalle continuo · Sonido 13 visual)
**Owner:** Gato · NeoNodos
**Drafted:** 2026-05-21

---

## 1. Goal

Pasar de **un demo hardcodeado** a un **motor que lee descriptores semánticos y los renderiza**. Al cerrar Fase 1, podemos describir una escena 3D habitable en menos de 50KB de texto estructurado y verla renderizada en navegador con calidad perceptual equivalente a una escena Unity equivalente de varios MB.

---

## 2. Hipótesis a validar

**H1 (de la Constitution)** — Una escena 3D habitable puede describirse en <50KB de descriptor semántico y renderizarse con calidad perceptual equivalente a una escena Unity de varios MB.

**H5 (de la Constitution)** — El editor LLM editor-time puede generar `.m13` válidos a partir de lenguaje natural con >70% de precisión.

Sub-hipótesis específicas de esta fase:

- **H1.1** El formato `.m13` puede expresar escenas arquitectónicas comunes (cuartos, pasillos, mobiliario básico) sin escape hatches a código imperativo.
- **H1.2** Una librería de 8-12 "conceptos materiales" cubre el 80% de los materiales de escenas residenciales / comerciales típicas.
- **H1.3** El parser + compilador `.m13` → shader corre en <200ms para escenas de hasta 50 objetos.

---

## 3. Casos de uso anclados

### 3.1 Diseñador describe un cuarto

Un diseñador (no programador) escribe en un editor web:

```yaml
scene: "sala_minimalista_v1"
bounds: [10, 3, 10]
walls:
  - concept: pared_yeso_blanco
  - concept: pared_concreto_pulido
    on: [north]
floor: piso_madera_envejecida
ceiling: yeso_blanco
objects:
  - concept: pedestal_marmol
    at: [0, 0, 0]
    scale: 1.0
  - concept: esfera_decorativa
    at: [0, 0.8, 0]
    material: bronce_pulido
```

Da save. El motor renderiza la escena en el preview en <500ms.

### 3.2 Diseñador usa lenguaje natural

El mismo diseñador en otro panel escribe en chat:

> "Quiero una sala industrial con paredes de ladrillo, piso de concreto, y una lámpara colgante en el centro del techo."

Claude API (editor-time, NO runtime) produce un `.m13` válido. El editor lo carga y renderiza. El diseñador puede editar el YAML resultante a mano si quiere.

### 3.3 Programador embebe m13 en su web app

Un dev integra m13 en su sitio Next.js:

```typescript
import { M13Engine } from '@m13/runtime'

const engine = new M13Engine(canvas)
await engine.loadScene('/scenes/sala_minimalista_v1.m13')
engine.start()
```

Y ya tiene una escena 3D corriendo a 90fps en el navegador, sin Three.js, sin assets descargados.

---

## 4. Functional requirements

### 4.1 Formato `.m13` v0.1

**FR-1.1** El formato es **YAML estricto** (no JSON5, no TOML). Razones: legible por humanos, soporta comentarios, parser maduro disponible.

**FR-1.2** Esquema raíz incluye al menos: `scene`, `bounds`, `walls`, `floor`, `ceiling`, `objects`, `lights`, `camera` (opcional, default razonable).

**FR-1.3** Cada objeto en `objects` declara `concept` (referencia a la librería), opcionalmente `at` (posición), `rotation`, `scale`, `material` (override), `params` (overrides específicos del concepto).

**FR-1.4** Validación con JSON Schema generado desde TypeScript types. Errores claros con línea y columna.

**FR-1.5** Formato extensible: campos desconocidos se ignoran con warning, no rompen el parser.

**FR-1.6** Especificación versionada en `m13-spec/v0.1.md` con ejemplos y contraejemplos.

### 4.2 Librería de conceptos materiales v0.1

Mínimo 10 conceptos materiales:

1. `pared_yeso_blanco`
2. `pared_concreto_pulido`
3. `pared_ladrillo_viejo`
4. `pared_madera_oscura`
5. `piso_madera_envejecida`
6. `piso_concreto_industrial`
7. `piso_marmol_blanco`
8. `metal_oxidado`
9. `metal_bronce_pulido`
10. `vidrio_esmerilado`

Mínimo 4 conceptos geométricos:

1. `pedestal_marmol`
2. `lampara_colgante`
3. `esfera_decorativa`
4. `cubo_basico`

**FR-2.1** Cada concepto es un módulo WGSL exportable + sus parámetros editables documentados.

**FR-2.2** Cada concepto declara su `material_signature` (color base, roughness, normal variation, audio reactivity) y `procedural_seed`.

**FR-2.3** La librería vive en `packages/synth/concepts/` como archivos individuales `.wgsl` + `.json` (manifiesto) por concepto.

### 4.3 Parser + compilador

**FR-3.1** Parser TypeScript en `packages/runtime/src/parser/`. Input: string YAML. Output: `M13Scene` (typed AST).

**FR-3.2** Compilador en `packages/runtime/src/compiler/`. Input: `M13Scene`. Output: ensamble de shaders WGSL listos para WebGPU + uniform layout.

**FR-3.3** El compilador genera código WGSL determinista — mismas entradas, mismo output byte por byte. Útil para caché y debug.

**FR-3.4** Tiempo de compilación <200ms para escenas de hasta 50 objetos en laptop mid-range.

### 4.4 Editor web minimal

**FR-4.1** Editor en `packages/editor/`. Stack: Next.js 14 + Tailwind + Monaco Editor + canvas WebGPU para preview.

**FR-4.2** Layout split: YAML editor a la izquierda, preview 3D a la derecha, panel de errores abajo.

**FR-4.3** Live reload: cualquier cambio en YAML re-compila y re-renderiza en <500ms.

**FR-4.4** Panel "natural language → m13" con input de texto que llama Claude API (configurable via env var). El YAML generado se inserta o reemplaza el editor.

**FR-4.5** Botón "Export bundle" que produce un `.zip` con `.m13` + shader assembly compilado (para deploy estático).

### 4.5 Escenas de ejemplo

Tres escenas en `packages/examples/scenes/`:

1. `sala_galeria.m13` — galería de arte minimalista
2. `cocina_industrial.m13` — cocina estilo loft
3. `oficina_neonodos.m13` — oficina con el "look" NeoNodos

Cada una debe pesar <30KB y renderizarse a >60fps en laptop mid-range.

---

## 5. Non-functional requirements

**NFR-1** Toda la lógica del runtime corre 100% en navegador. Cero llamadas HTTP en runtime salvo carga inicial del `.m13`.

**NFR-2** El editor puede correr offline después de primera carga (PWA-ready).

**NFR-3** Bundle del runtime (sin editor) pesa <100KB minificado + gzipped.

**NFR-4** Cero dependencias de Three.js en runtime. Three.js solo en editor para gizmos / debug visuals.

**NFR-5** TypeScript estricto: `strict: true`, sin `any` salvo en boundaries explícitamente justificados.

**NFR-6** Tests unitarios para parser y compilador con Vitest. Coverage >70%.

**NFR-7** El runtime debe correr en navegador del Quest 3 a 90fps con escenas de ejemplo.

---

## 6. Out of scope (NO en Fase 1)

- ❌ Detalle continuo / Sonido 13 visual avanzado (eso es Fase 2)
- ❌ Síntesis neural de materiales (Fase 3)
- ❌ Gaussian Splatting (Fase 4)
- ❌ Eye tracking / foveated rendering (Fase 5)
- ❌ State delta architecture / replay (Fase 6)
- ❌ Editor visual tipo Unreal con drag-and-drop
- ❌ Sistema de scripting / lógica de juego
- ❌ Físicas
- ❌ Soporte WebXR (vamos en Fase 5)

---

## 7. Deliverables

Al cerrar Fase 1, el repo debe tener:

1. **Especificación `.m13` v0.1** publicada en `m13-spec/v0.1.md`
2. **Runtime package** `@m13/runtime` con parser, compilador, renderer
3. **Synth package** `@m13/synth` con librería de 10+ conceptos
4. **Editor app** desplegada en `m13.neonodos.com` (o dominio temporal)
5. **3 escenas de ejemplo** funcionando
6. **Benchmark report** en `docs/papers/phase-1-benchmark.md` comparando peso de assets vs Unity equivalente
7. **Demo público** con QR code para que cualquiera lo pruebe
8. **BITACORA_MOTOR13.md actualizada** con todas las decisiones de la fase
9. **Spec de Fase 2** drafted

---

## 8. Success criteria

La fase se considera **exitosa** si:

- ✅ Las 3 escenas de ejemplo renderizan a >60fps en laptop mid-range
- ✅ Cada escena pesa <50KB de `.m13`
- ✅ El editor permite editar YAML con live reload <500ms
- ✅ El endpoint LLM produce `.m13` válido en >70% de prompts de prueba (suite de 30 prompts)
- ✅ Benchmark muestra reducción de peso >10× vs equivalente Unity
- ✅ Quest 3 navegador renderiza una escena a 72fps mínimo
- ✅ Una persona no-técnica puede editar el YAML y ver el resultado sin onboarding

La fase se considera **fallida** (y requiere pivote) si:

- ❌ <60fps en laptop mid-range con escena básica
- ❌ Compilación >500ms para escenas de 50 objetos
- ❌ El editor LLM produce <40% de `.m13` válidos

---

## 9. Risks y mitigaciones

**R1: Latencia de compilación de shaders WGSL**
Generar shaders dinámicamente puede tener costos de compilación que rompan el live reload.
*Mitigación:* caché de shaders compilados por hash de input. Composición de subroutines pre-compiladas en lugar de regeneración total.

**R2: Explosión combinatoria de variantes de shader**
Cada combinación de materiales puede generar un shader distinto.
*Mitigación:* shader uber con branches por material ID en lugar de generación por escena.

**R3: WebGPU inestabilidad en navegadores móviles**
Quest 3 puede tener bugs específicos.
*Mitigación:* probar en Quest 3 al final de la fase, no al inicio. Tener WebGL fallback fuera de scope pero documentar el path.

**R4: Claude API rate limits para editor LLM**
Si muchos devs prueban el editor, podemos pegarle a rate limits.
*Mitigación:* cachear respuestas por prompt hash. Permitir traer tu propia API key en el editor.

**R5: Calidad visual decepcionante sin neural synthesis**
Solo procedural puede verse "demo-90s" en algunas escenas.
*Mitigación:* curar conceptos cuidadosamente, evitar materiales que requieren detalle alto en Fase 1. Esperar a Fase 3 para los materiales que requieren neural.

---

## 10. Open questions

- **OQ-1:** ¿Conceptos materiales son parametrizables o fixed? Inclinación: parametrizables pero con defaults sensatos.
- **OQ-2:** ¿Permitimos `extends` o composición de conceptos en `.m13`? Inclinación: no en v0.1, abrir en v0.2 si hay demanda.
- **OQ-3:** ¿El editor LLM corre client-side (con API key del usuario) o server-side (con nuestro proxy)? Inclinación: ambos, configurable.
- **OQ-4:** ¿Logging / telemetría del editor para entender uso? Inclinación: sí, anónimo, opt-out.

Resolver antes de implementación.

---

## 11. Timeline estimado

- **Semana 1:** Especificación `.m13` v0.1 + JSON Schema + tests
- **Semana 2:** Parser + compilador core + 4 conceptos materiales base
- **Semana 3:** Resto de conceptos (10+ total) + 4 geométricos + render pipeline
- **Semana 4:** Editor minimal + 3 escenas de ejemplo + endpoint LLM
- **Semana 5:** Benchmark + Quest 3 testing + demo público + docs

**Total estimado: 5 semanas** trabajando ~15-20 horas/semana con Claude Code.

---

## 12. Decisión gate para arrancar implementación

Antes de escribir una línea de Fase 1, validar:

- [ ] Demo Fase 0 corre a >60fps en hardware del owner
- [ ] La dirección estética del Fase 0 se siente "viable" (no demo-noventero)
- [ ] Owner confirma stack: Next.js 14 + Vite para runtime + Vitest + Monaco
- [ ] Repo `motor-13` creado en GitHub bajo `mechagato/neonodos` con constitution.md commit
- [ ] Plan de Fase 1 (`docs/plans/phase-1-plan.md`) generado a partir de este spec

Una vez los 5 puntos están checados, abrimos sesión de Claude Code y arrancamos.

---

*Fin del spec de Fase 1. Cualquier desvío de este documento debe quedar registrado en BITACORA_MOTOR13.md con justificación.*
