# BITACORA · motor-13

> Log de sesiones de desarrollo del proyecto m13.
> Una entrada por sesión. Español mexicano informal. Sin maquillaje.

---

## Entrada 001 · 2026-05-21 · Bootstrap

**Duración:** ~1 sesión de planeación + producción de bootstrap
**Owner:** Gato
**Asistencia:** Claude Opus 4.7

### Contexto

Conversación de exploración con Gemini y ChatGPT sobre la idea de combinar el Sonido 13 de Julián Carrillo (microtonalismo) con compresión semántica de datos para crear un motor gráfico nuevo. Ambos LLMs dieron buen análisis conceptual pero ninguno aterrizó un plan ejecutable.

Decisión clave: NO intentar matar Unreal/Unity en su categoría. Atacar un nicho nuevo: motores de **síntesis local de mundos** para WebXR, donde el peso de assets y la portabilidad importan más que la compatibilidad con pipelines tradicionales.

### Lo que se hizo

1. Análisis honesto de las ideas de las dos conversaciones previas: separar lo que sí funciona hoy (SDFs, Gaussian Splatting, WebGPU, ONNX local) de lo que es humo o research de 10 años (LLM en runtime, MPM físicas universales, "generar mundos desde concepto puro").
2. Decisión de arquitectura: **runtime 100% local, cero nube**. LLM solo en editor-time.
3. Decisión de stack: WebGPU + TypeScript + WGSL como bases inamovibles.
4. Decisión de nombre: **m13** para todo (research y producto interno). Nombre comercial futuro pendiente.
5. Roadmap de 6 fases drafted: phase 0 (proof) → 1 (lenguaje .m13) → 2 (detalle continuo) → 3 (neural local) → 4 (splatting híbrido) → 5 (WebXR Quest 3) → 6 (tiempo + Sabio Compositor).
6. Constitution.md redactada con principios no negociables.
7. Demo Fase 0 producido: single-file HTML con WebGPU + raymarching SDF de un cuarto, materiales procedurales, soft shadows, AO, audio reactivo desde micrófono. Pesa 25KB total.
8. Spec de Fase 1 drafted.

### Decisiones tomadas

- **D-001:** El runtime nunca depende de internet activo. La nube es para storage, no para compute.
- **D-002:** WebGPU es la única API gráfica. No WebGL, no Canvas2D, no nativo.
- **D-003:** YAML como formato `.m13` v0.1 (no JSON, no TOML).
- **D-004:** Tres.js NO entra al runtime — solo en editor para gizmos/debug.
- **D-005:** El idioma para BITACORA, comentarios internos y decisiones es español mexicano. APIs públicas y READMEs en inglés.
- **D-006:** Cada fase es un Spec Kit completo (spec + plan + tasks + implement).
- **D-007:** El demo Fase 0 incluye audio reactivo desde mic como experimento Sonido 13 literal — si no aporta, se quita en Fase 2.

### Pendientes para próxima sesión

- [ ] Owner corre el demo Fase 0 y reporta FPS + impresión estética + reacción al audio reactivo
- [ ] Crear repo `mechagato/neonodos` submódulo `motor-13` en GitHub
- [ ] Commit inicial con constitution.md, README.md, BITACORA, m13-phase0.html
- [ ] Resolver Open Questions del spec Fase 1 (OQ-1 a OQ-4)
- [ ] Generar `docs/plans/phase-1-plan.md` a partir del spec
- [ ] Decidir hosting del demo público (Vercel probable)
- [ ] Definir si el editor LLM corre client-side o server-side

### Open questions abiertas

- ¿Confirmar Vite como build tool del runtime, o evaluar esbuild puro?
- ¿Monorepo con pnpm workspaces o multi-repo? Inclinación: monorepo.
- ¿Licencia abierta desde el inicio o mantener privado hasta Fase 3?

### Reflexiones

La parte más sólida del proyecto es la **distribución de carga GPU compute + NPU + RAM caché** que evita el cuello de botella de memory bandwidth de los engines tradicionales. Esa es la tesis técnica defendible.

La parte más arriesgada — y más interesante — es la subdivisión microtonal del detalle visual. Puede no producir nada perceptual, o puede generar una firma estética única. Apostamos por descubrirlo en Fase 2.

El audio reactivo en Fase 0 es un guiño literal a Carrillo. Si Gato lo usa con música y siente algo, esa rama se profundiza en Fase 6 (Sabio Compositor / escenas temporales).

---

## Entrada 002 · 2026-05-21 · Bootstrap aterrizado en Cerebro4 + plan Fase 1

**Duración:** ~1 sesión Claude Code en Cerebro4
**Owner:** Gato
**Asistencia:** Claude Opus 4.7 (xhigh)

### Contexto

Gato bajó el bootstrap tar.gz a `NeoNodos_System/m13/`, pidió arrancar el proyecto siguiendo los 4 prompts del workflow Spec Kit (read+validate → plan → tasks → implement). Esta sesión cubre Prompt #1 (lectura+validación) y Prompt #2 (generación del plan).

### Lo que se hizo

1. Extracción del bootstrap (`tar --strip-components=1`) directamente en `m13/`.
2. `git init -b main` local + commit inicial `a34095e — feat: m13 v0.1.0 bootstrap`.
3. Lectura completa de `CLAUDE.md`, `constitution.md`, `docs/spec/phase-1-spec.md`, `BITACORA_MOTOR13.md`, `GETTING_STARTED.md`, `README.md`.
4. `pnpm install` ✅ (11s, 15 paquetes, pnpm 9.15.9, node 22, TS 5.9.3).
5. `pnpm typecheck` ❌ inicial: 1 error en `@m13/synth` (falta `@webgpu/types` en devDeps) + 2 errores en `@m13/runtime` por TS 5.9+ más estricto que la versión asumida por el bootstrap.
6. `pnpm dev` ✅ — Vite ready 315ms en `http://localhost:5173/`, transformación de runtime/synth/examples OK, scene .m13 servida 200 OK.
7. **Chore T-000 — Fix typecheck baseline:**
   - Agregar `@webgpu/types` a `packages/synth/package.json` devDependencies.
   - Quitar `type Concept` no usado de `packages/runtime/src/compiler/index.ts` (noUnusedLocals).
   - Tipar explícitamente `data: Uint8Array<ArrayBuffer> | null` y construir con `new Uint8Array(new ArrayBuffer(N))` en `packages/runtime/src/audio/mic-input.ts` para TS 5.7+ generic Uint8Array.
   - `pnpm install` + `pnpm typecheck` → todo limpio. `pnpm dev` sigue arrancando OK.
8. Audit read-only del código existente: parser/compiler/renderer/camera/audio/shaders/8 conceptos/4 escenas todo funcional — el bootstrap entregó un esqueleto sólido.
9. **Plan Fase 1 generado** en `docs/plans/phase-1-plan.md` (~600 líneas):
   - 8 deliverables D-1..D-8, 53 componentes técnicos C-XXX, 104-148h estimado
   - Camino crítico identificado, paralelización marcada para subagent-driven-development
   - 10 riesgos (5 del spec + 5 nuevos: R6..R10), 10 decisiones nuevas D-100..D-110
   - Open Questions OQ-1..OQ-4 del spec resueltas con inclinaciones del Constitution
   - Scope-cutting options priorizadas por si la fase amenaza deadline

### Decisiones tomadas

- **D-008:** TypeScript 5.9.3 es el baseline del runtime y synth. El bootstrap asumía 5.4 pero no había razón fuerte para pinear hacia atrás — los 2 errores se corrigieron forward-compatible.
- **D-009:** `git init` quedó dentro de `NeoNodos_System/m13/` (repo anidado del monorepo neonodos-core). Pendiente decidir si subir como repo independiente `mechagato/motor-13` o convivir como subcarpeta.
- **D-100 a D-110:** ver `docs/plans/phase-1-plan.md` §10.

### Lo que tronó

- TS 5.9.3 instalado por pnpm (semver `^5.4.5` lo permite) trajo 2 errores que el bootstrap original no veía. Se arreglaron sin pinear TS hacia atrás.
- Si pnpm en futuro instala TS más nuevo con más reglas estrictas, podría volver a romper. Mitigación documentada en R7 del plan.

### Pendientes para próxima sesión

- [ ] Gato aprueba el plan tal cual o pide modificaciones (sección §12 del plan)
- [ ] Si aprueba: ejecutar Prompt #3 — generar `docs/tasks/phase-1-tasks.md`
- [ ] Decidir si subir como repo independiente o mantener anidado
- [ ] Validación visual de las 4 escenas bootstrap en sesión interactiva (decision gate del spec §12, items 1-2)
- [ ] Hosting: comprar/configurar subdomain `m13.neonodos.com` (no urgente, primero D-4)

### Open questions abiertas

- ¿Repo independiente o subcarpeta de `mechagato/neonodos`? El Constitution dice `mechagato/neonodos/motor-13`, lo que sugiere submódulo o subcarpeta. Confirmar con Gato.
- ¿Test Quest 3 sí o no en Fase 1? NFR-7 lo requiere; si Gato no tiene el Quest disponible, mover a Fase 5.

### Reflexiones

El bootstrap está mejor de lo que esperaba — el compiler ya hace generación dinámica de WGSL deterministic-ish (falta C-204 para garantizarlo), el renderer ya tiene UNIFORM_BYTES correcto, el FlyCamera ya tiene bounds, el audio ya está conectado. Esto significa que la Fase 1 NO es "construir desde cero" sino **completar la spec** (D-1) + **multiplicar la librería** (D-3) + **agregar el editor** (D-4). El editor es el componente más pesado y más nuevo — 35% del esfuerzo total — y donde más riesgo hay (R10).

Si Gato aprueba el plan, recomiendo arrancar Prompt #3 con orden de tasks: spec formal primero (D-1), luego tests del runtime (D-2 parser/compiler), luego conceptos faltantes (D-3) en paralelo con escenas (D-5), después editor (D-4) que ya depende de todo lo anterior, y cierre con benchmark+demo+docs (D-6, D-7, D-8).

---

## Plantilla para entradas futuras

```
## Entrada NNN · YYYY-MM-DD · <título corto>

**Duración:** <tiempo>
**Owner:** <quién>
**Asistencia:** <Claude Code / Opus / ninguno>

### Contexto
<dónde estábamos>

### Lo que se hizo
<acciones concretas>

### Decisiones tomadas
- **D-NNN:** <decisión> — <razón>

### Lo que tronó
<qué falló y por qué>

### Pendientes para próxima sesión
- [ ] <task>

### Reflexiones
<observaciones libres>
```
