# CLAUDE.md — m13 motor gráfico

> **Instrucciones persistentes para Claude Code.** Lee este archivo al inicio de cada sesión antes de hacer cualquier cambio. Si el usuario pide algo que contradice este documento, pausa y pregunta antes de proceder.

---

## TL;DR

**m13** es un motor gráfico experimental **local-first** para WebGPU/WebXR. Sintetiza mundos 3D desde archivos `.m13` (YAML semántico) usando SDF raymarching + conceptos materiales procedurales — sin assets pesados, sin red en runtime.

**Estado actual:** Fase 1 al 85%. Editor base funcional. Demo público LIVE en `motor13.pages.dev`. Falta cerrar editor LLM E2E + Quest 3 test + benchmark.

**Owner del proyecto:** Gato (Genaro Isaí García Torres) — CEO NeoNodos.

**Idioma:** español mexicano informal en docs/comentarios/commits. APIs públicas y nombres de tipos/funciones en inglés.

---

## 🎯 DIRECTIVA ESTRATÉGICA — PRIORIDAD #1 NeoNodos hasta Innovafest diciembre 2026

**Decisión tomada por Gato el 2026-05-22, no se renegocia hasta Innovafest.**

m13 es el proyecto **#1 prioritario** del catálogo NeoNodos desde junio a diciembre 2026. Razón: es el diferenciador técnico real más fuerte del portafolio NeoNodos vs cualquier competidor del mercado (Unity, PlayCanvas, Babylon, Spline, Polycam, etc.). La combinación Sonido 13 visual + semantic descriptors + LLM editor-time + WebXR + local-first es única y defensible 12-18 meses mínimo.

### Roadmap revisado para Innovafest

| Mes | Foco m13 | Otros proyectos NeoNodos |
|---|---|---|
| **mayo restante** | Cerrar Fase 1 (editor LLM E2E + Quest 3 + custom domain + benchmark + README) | Modo mantenimiento (orquestador + Sabios) |
| **junio** | Fase 2 — Sonido 13 visual (subdivisión microtonal del detalle) | idem |
| **julio** | Fase 5 — WebXR + Quest 3 inmersivo. **SE SALTAN Fases 3-4 del Constitution.** | idem |
| **agosto** | B2B piloto #1 (PLANVR o Cocinas Domus) | idem |
| **septiembre** | Polish + landing motor13.neonodos.com + paper técnico | idem |
| **octubre** | B2B piloto #2 + casos de éxito documentados | idem |
| **noviembre** | Buffer + ensayos + demo video profesional | idem |
| **diciembre** | **Innovafest** 🎯 | — |

### División de responsabilidades

- **m13 (Claude Code + Gato):** desarrollo técnico exclusivo. Gato dedica ≥60% de su tiempo. Claude Code es el agente principal.
- **FlowCAD (ex-NeoCAD) = CASO DE USO PRIMARIO de m13.** No es proyecto separado en modo mantenimiento — es el showcase principal. m13 le da el render engine para que piezas CAD se vean en navegador sin instalar nada. Pitch ganador de Innovafest: "CAD-killer (vs SolidWorks/Blender) que corre en browser gracias a m13".
- **Otros proyectos NeoNodos (INMA, NeoPos, NeoPets, SyShops, ArinStudio, PanteroSecurity, Cocinas Domus, neonodos.com v2, etc):** **modo mantenimiento bajo el orquestador phi**.
  - Solo continuidad de clientes existentes
  - Cero features nuevas excepto críticas
  - Bug fixes por Sabios Yin/Yang
  - Reportan al orquestador cada lunes
- **Cocinas Domus:** caso de uso secundario candidato (configurador vertical). Confirmar estado/viabilidad en pregunta posterior.

### Skip rules

- Fase 3 (síntesis neural ONNX) → saltada para Innovafest
- Fase 4 (Gaussian Splatting híbrido) → saltada para Innovafest
- Cualquier feature de m13 fuera de roadmap revisado → **no en scope** hasta enero 2027

### Esta directiva sobrevive:

- Cualquier crisis de cliente en otro proyecto (los Sabios resuelven, no Gato)
- Sugerencias de "abrir nuevos frentes"
- Tentaciones de "agregar feature cool"
- Excepciones por presión externa

---

## Visión

Inspirado en el **Sonido 13** de Julián Carrillo (microtonalismo = subdivisión continua de la escala) aplicado a gráficos: en lugar de discretizar el mundo en triángulos y texturas, lo sintetizamos como función continua que se puede subdividir indefinidamente. Esto invierte el cuello de botella tradicional: gastamos compute GPU (que sobra) para evitar memory bandwidth (que es el cuello real en engines tradicionales).

**No competimos con Unity/Unreal en su categoría.** Atacamos un nicho nuevo: WebXR, asset-light, semantic-first. Cliente piloto natural: PLANVR (CAD-to-VR), Cocinas Quintana, cualquier app NeoNodos que necesite 3D embebible sin assets.

---

## Constitution (NO NEGOCIABLE)

Lee `constitution.md` completo. Lo crítico:

1. **Runtime 100% local.** Cero llamadas a nube en compute. Storage de assets sí puede ser remoto, render no.
2. **WebGPU única API gráfica.** No WebGL, no Three.js como dependency core. Three se puede usar opcionalmente para utilidades de matrices.
3. **LLM solo en editor-time, nunca runtime.** El motor en producción no llama a Claude/GPT. Solo el editor puede usar LLMs para generar/modificar `.m13`.
4. **TypeScript + WGSL como bases.** No Rust/WASM en v0.1 (queda para Fase 3+ si benchmark lo justifica).
5. **Cada fase es Spec Kit completo.** Spec → Plan → Tasks → Implement. No saltes pasos.

Si una propuesta de cambio viola alguno de estos puntos, **detente y pregunta a Gato antes de implementar**.

---

## Estado de fases

| Fase | Codename | Estado |
|---|---|---|
| 0 | Proof of principle SDF raymarching | COMPLETED (demos HTML standalone) |
| 1 | Lenguaje .m13 + librería conceptos | COMPLETED (gate cerrado 2026-05-28) |
| 2 | Detalle continuo (Sonido 13 visual) | PENDING |
| 3 | Síntesis neural local con ONNX | PENDING |
| 4 | Gaussian Splatting híbrido | PENDING |
| 5 | WebXR + Quest 3 + voz | PENDING |
| 6 | Edición temporal + Sabio Compositor | PENDING |

Lee `docs/spec/phase-1-spec.md` para el detalle de lo entregado en Fase 1.
Lee `BITACORA_MOTOR13.md` entrada 2026-05-28 para el gate de cierre.

---

## Stack

- Node.js 20+, pnpm 8+
- TypeScript 5.4+ (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- Vite 5 (solo para `@m13/examples`)
- Zod 3 para validación de schemas
- yaml 2 para parsing
- @webgpu/types 0.1.40
- Cero React/Vue/etc en el core. Si en algún momento se agrega editor, será modular.

---

## Estructura del repo

```
m13/
├── CLAUDE.md                           # este archivo
├── constitution.md                     # principios no negociables
├── README.md                           # presentación pública (inglés)
├── BITACORA_MOTOR13.md                 # log de sesiones (español)
├── GETTING_STARTED.md                  # cómo arrancar
├── docs/
│   ├── spec/phase-1-spec.md            # Spec Kit Fase 1
│   ├── plans/                          # planes por fase (vacío hasta que generes)
│   └── tasks/                          # task breakdowns (vacío hasta que generes)
└── packages/
    ├── runtime/                        # @m13/runtime — el motor
    │   └── src/
    │       ├── engine.ts                   # M13Engine class (API pública)
    │       ├── index.ts                    # barrel export
    │       ├── types.ts
    │       ├── parser/                     # YAML → M13Scene tipada (Zod)
    │       ├── compiler/                   # M13Scene → WGSL ensamblado
    │       ├── renderer/                   # WebGPU pipeline + uniforms
    │       ├── camera/                     # FlyCamera con pointer lock
    │       ├── audio/                      # MicAudioInput opcional
    │       └── shaders/                    # common.ts + raymarch.ts (WGSL como strings)
    ├── synth/                          # @m13/synth — librería de conceptos materiales
    │   └── src/
    │       ├── index.ts                    # registry
    │       └── concepts/                   # 8 conceptos iniciales
    └── examples/                       # @m13/examples — Vite app
        ├── index.html
        ├── vite.config.ts
        ├── src/{main.ts, style.css}
        └── public/scenes/                  # 4 escenas .m13 reales
```

---

## Workflow Spec Kit aplicado a m13

Cada fase del motor sigue el flujo de 4 etapas. **No empieces a implementar sin pasar las anteriores.**

1. **Spec** — `docs/spec/phase-N-spec.md`. Qué se va a construir, criterios de éxito, restricciones, open questions.
2. **Plan** — `docs/plans/phase-N-plan.md`. Cómo se construirá: desglose técnico, dependencias entre componentes, riesgos, validación.
3. **Tasks** — `docs/tasks/phase-N-tasks.md`. Lista numerada de tareas accionables (T-001, T-002, ...) cada una completable en 30–90 min, con criterio de done.
4. **Implement** — código real, una task a la vez, con commits chiquitos y BITACORA actualizada.

Si te piden "implementa X" y aún no existe el plan/tasks correspondiente, genera primero el plan/tasks y espera aprobación de Gato antes de tocar código.

---

## Reglas de oro (no negociables en cada sesión)

1. **BITACORA al final de cada sesión.** Agrega una entrada al final de `BITACORA_MOTOR13.md` con: fecha, qué se hizo, decisiones tomadas (con código D-XXX), problemas encontrados, próximo paso. Sin esto la siguiente sesión va a perder contexto.
2. **`pnpm typecheck` debe pasar limpio antes de declarar una task done.** Si arroja errores, arréglalos antes de commitear. No commitees con `// @ts-ignore` salvo en casos extremos justificados.
3. **`pnpm dev` debe arrancar sin errores en consola** antes de cerrar la sesión. Abre el browser y revisa DevTools.
4. **Constitution no se viola.** Si te piden algo que la rompe, pausa y pregunta.
5. **Commits chiquitos y semánticos** en inglés con scope:
   - `feat(runtime): parse rotation field in .m13 objects`
   - `fix(synth): correct UV scaling in pared_ladrillo_viejo`
   - `docs: update BITACORA with session 003 notes`
   - `chore: bump zod to 3.23.5`
   Un commit = un cambio coherente. No mezcles refactor con feature.
6. **No agregues dependencias sin justificar.** Si necesitas una librería nueva, anótalo en BITACORA con razón y alternativas evaluadas. Pregunta antes si te late que es polémica.
7. **Inglés en código, español en docs/comentarios/commits.** Excepción: nombres de conceptos materiales son español (`pared_yeso_blanco`) porque son identificadores del dominio.
8. **No reformatees código que no estás tocando.** Si ves un estilo inconsistente, anótalo pero no lo "limpies" en el mismo commit del feature.

---

## Comandos útiles

```bash
pnpm install              # instalar deps de todo el monorepo
pnpm dev                  # arrancar @m13/examples en localhost:5173
pnpm typecheck            # tsc --noEmit en todos los packages
pnpm build                # build production de todos
pnpm --filter @m13/runtime build       # build solo de runtime
pnpm --filter @m13/synth typecheck     # typecheck solo de synth
```

---

## Convenciones técnicas

- **Imports con extensión `.js`** aunque los archivos sean `.ts` (requisito ESM con `moduleResolution: 'Bundler'`).
- **Conceptos materiales:** la función WGSL debe ser `fn mat_<concept_id>(p: vec3<f32>, n: vec3<f32>, audioAmp: f32) -> vec3<f32>` — el compilador asume esa firma exacta.
- **Escenas `.m13`:** YAML estricto, validado contra `m13SceneSchema` en `packages/runtime/src/parser/schema.ts`. Cualquier campo nuevo del formato requiere actualizar el schema + el compilador + un ejemplo en `packages/examples/public/scenes/`.
- **Uniform layout:** `UNIFORM_BYTES = 160` en `renderer/index.ts`. Si agregas campos al struct `Uniforms` en `shaders/common.ts`, **debes actualizar tanto el WGSL como el `writeUniforms` en `renderer/index.ts` y `UNIFORM_BYTES`** simultáneamente. WebGPU silenciosamente corrompe memoria si los layouts no coinciden.
- **`packages/*/package.json`:** `main` y `exports` apuntan a `./src/index.ts` (no a `./dist/`) para que Vite procese TS al vuelo sin build previo en dev. El campo `dist` queda solo para builds de producción.

---

## Proximos pasos prioritarios (Fase 2)

Fase 1 cerrada el 2026-05-28. La Fase 2 (Sonido 13 visual) es la siguiente segun el
roadmap revisado (CLAUDE.md seccion "Directiva Estrategica").

IMPORTANTE: el spec de Fase 2 (`docs/spec/phase-2-spec.md`) esta EN PAUSA por orden
de Gato. T-066 fue cancelada. No crear ni borradorear ese spec sin instruccion directa
de Gato. El contenido y direccion de Fase 2 se define cuando Gato lo indique.

Blockers que requieren accion de Gato antes de abrir Fase 2:

1. Quest 3 test (T-061): criterio de Fase 1 aun pendiente. Requiere hardware Quest 3.
   Instrucciones en `docs/DEPLOY.md` (setup Tailscale + navegador Quest + FPS validation).
2. Custom domain `motor13.neonodos.com`: accion en Cloudflare Pages dashboard.
3. Validacion visual WebGPU real (FPS >60fps): requiere laptop de Gato con GPU compatible.
4. LLM eval batch T-052/T-053: 30 prompts de evaluacion, target >70% pass rate.
   Aun no ejecutado. Requiere sesion con API key activa.
5. Benchmark vs Three.js (T-062..T-064): no completado. Reporte `docs/papers/phase-1-benchmark.md` no existe.
6. Reconciliar colision de codigos D-2103/D-2104 en BITACORA.
7. Decidir convencion de codigos D-xxxx para Fase 2.

Una vez que Gato aprueba el cierre y da la orden, el siguiente flujo es:
  Spec Fase 2 (Gato dirige direccion) → Plan → Tasks → Implement.

---

## Decisiones técnicas registradas

Las decisiones D-001..D-007 son del bootstrap inicial. Las D-2xx..D-9xx son de Fase 1
(codigos usados en BITACORA; ver ahi la serie completa). Se documentan aqui solo las
decisiones de alto impacto arquitectonico que todo nuevo agente debe conocer al arrancar.

### Bootstrap (pre-Fase 1)

- **D-001:** Monorepo con pnpm workspaces (sobre Nx/Turbo). Razon: simplicidad, ya usado en NeoNodos.
- **D-002:** `main` de packages apunta a `./src/index.ts`, no `./dist/`. Razon: dev sin build previo.
- **D-003:** Parsing con `yaml` + validacion con `zod`. Razon: ambos son standard, Zod da tipos TS de regalo.
- **D-004:** SDF raymarching como base de Fase 1, no rasterizacion clasica. Razon: alinea con tesis Sonido 13.
- **D-005:** Conceptos materiales como modulos TS que exportan WGSL como string. Razon: tree-shakeable, refactor-friendly.
- **D-006:** Look del HUD: JetBrains Mono + accent dorado `#c9a227` + grain + scanlines. Razon: identidad NeoNodos.
- **D-007:** Escenas servidas desde `packages/examples/public/scenes/`. Razon: Vite las sirve estaticamente.

### Fase 1 — decisiones arquitectonicas clave (sesiones 2026-05-21/22)

Nota: los codigos D-2xx..D-9xx viven en BITACORA_MOTOR13.md. Se extraen aqui los que
afectan a cualquier trabajo futuro en Fase 2+:

- **D-2101 (editor):** Scaffold manual del editor Next.js (no `pnpm create next-app`). Sin TTY en Claude Code.
- **D-2102 (editor):** `next.config.mjs` con `resolve.extensionAlias` mapea `.js` → `.ts` para webpack 5.
  Sin esto Next falla con "Module not found" en imports ESM del runtime.
- **D-2103 (editor):** M13Engine importado dinamicamente con `await import('@m13/runtime')` en editor.
  Razon: evita que Next.js ejecute `navigator.gpu` en SSR.
- **D-2104 (editor):** Debounce 250ms YAML → loadScene en live reload. Cumple FR-4.3 (<500ms) sin saturar compiler.
- **D-2103 (FlowCAD, sesion 22-may):** Dynamic import del bundle m13 desde `/public/m13/m13-runtime.js`
  con `webpackIgnore`. Drop-in en cualquier app Next.js sin configurar resolve aliases.
  NOTA: este codigo D-2103 colisiona con el editor — la BITACORA tiene dos entradas con ese codigo.
  Pendiente reconciliar en inicio de Fase 2.
- **D-2104 (FlowCAD, sesion 22-may):** Endpoint `.m13` no-strict en job_manager de NeoCAD — persiste
  aunque el proceso FastAPI reinicie (archivo en disco). Colision de codigo con D-2104 editor.
- **D-2105 (FlowCAD, sesion 22-may):** Backend NeoCAD dejo de invocar Blender en flujo SSE.
  Motor m13 sobre WebGPU es la ruta de visualizacion principal.
- **D-2106 (FlowCAD, sesion 22-may):** `glb_to_usdz.py` se mantiene aislado con graceful skip. No afecta flujo principal.

### Blocker de nomenclatura pendiente para Fase 2

Los codigos D-2103 y D-2104 tienen colision en BITACORA (dos sesiones distintas los reutilizaron).
Al iniciar Fase 2, Gato debe decidir la convencion de codigos D-xxxx para la nueva fase
(se sugiere D-3xxx para Fase 2, reservando D-2xxx para Fase 1 ya cerrada).

Cualquier decision tecnica nueva durante sesiones de Claude Code se agrega aqui con codigo D-XXX incremental.

---

## Ideas futuras (NO en scope de Fase 1)

Estas surgieron en conversaciones con Gato. No están en el plan de Fase 1 actual y NO se trabajan hasta que se acuerden explícitamente. Documentadas aquí solo para no perderlas.

### Idea 1 — PWA instalable (Fase 2 candidato)

**Origen:** sesión 2026-05-21, BITACORA entrada 015 + 016.
**Costo estimado:** 2 días de trabajo.
**Beneficio:** los diseñadores industriales pueden "instalar" m13 como app desktop desde el navegador. Ícono en escritorio/dock, ventana standalone sin barra del browser, funciona offline después de primera carga.
**Qué incluye:**
- `packages/examples/public/manifest.json` con icons + theme color + display=standalone
- Service worker que cachea el bundle + escenas .m13 para offline
- Botón "Install app" detectado por Chrome
**Cuándo:** primera tarea de Fase 2, después de cerrar Fase 1.

### Idea 2 — m13-platform (POST-éxito de Fase 1-5, NO comprometido a fecha)

**Origen:** Gato preguntó si m13 puede ser base de un "nuevo Roblox" con agentic systems estilo GTA 6.
**Confirmado por Gato (2026-05-21):** se evalúa SOLO después de que m13 con su alcance actual demuestre éxito comercial. No es Fase 1-5.
**Hipótesis:** m13 como motor de plataforma para experiencias multiplayer con NPCs LLM-powered.
**Qué requeriría:**
- Proyecto hermano `m13-platform` (repo separado)
- Netcode (WebRTC + estado distribuido)
- Physics (Rapier o Cannon)
- Avatares + animación + lipsync
- LLM local en runtime (ONNX + Llama 3 8B quantizado para Quest 3 + RTX consumer)
- Resolución explícita de Constitution §3.5 (determinismo runtime) vs LLM en NPCs
**Por qué post-éxito:**
- Costo ~18-24 meses de trabajo en paralelo a Fase 4-5
- Necesita validación comercial de m13 actual primero (PLANVR, Cocinas Domus, otros B2B)
- Mercado actual saturado (Roblox, Inworld, Convai, Project Athena rumor) — entrar requiere ventaja clara
**Caminos comerciales intermedios** (Fase 4-5, no requieren m13-platform):
- PLANVR + asistente IA (LLM editor-time genera mundos por descripción, runtime determinista)
- Cocinas Domus con voz (cliente describe cocina, m13 sintetiza)
- Educativas para niños (tutor IA en mundo 3D)

---

## Si te desvías o te pierdes

Si en algún punto pierdes contexto, no estás seguro de qué hacer, o el usuario te pide algo que parece contradecir este documento:

1. **Para.**
2. **Re-lee este `CLAUDE.md` completo.**
3. **Lee `constitution.md` y `BITACORA_MOTOR13.md`** (las últimas 3 entradas).
4. **Si sigues con duda, pregúntale a Gato directamente antes de actuar.**

Mejor parar y preguntar que destruir el proyecto con buenas intenciones.

---

*Ultima actualizacion: 2026-05-28 · T-067 cierre Fase 1 · v0.1.0*
