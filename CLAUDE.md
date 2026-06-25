## 🧠 PRIMERA ACCIÓN — memoria perpetua .phi (phi companion)

Antes de nada, carga tu memoria de continuidad y trátala como tu memoria de trabajo
(usa el Python que exista — `python3` / `python` / `py`; NO instales nada):

```
python3 phi-companion/companion_memory.py load   # Linux/macOS
python  phi-companion/companion_memory.py load   # Windows
py      phi-companion/companion_memory.py load   # Windows (py launcher)
```

Si la salida trae una línea de saludo, ésa es tu primera línea. Detalle: `phi-companion/MEMORIA.md`.

---

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
  **Reconfirmado por Gato 2026-06-12: la prioridad en Innovafest es mostrar m13 CON FlowCAD — el caso de negocio industrial domina en Nuevo León.** El material demo (videos, showcase) se planea con ese ángulo.
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
| 2 | Detalle continuo (Sonido 13 visual) | IN PROGRESS (spec aprobado 2026-06-12) |
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

**FASE 2 DESPAUSADA por orden directa de Gato 2026-06-12 ("continúa con las fases").**
Spec borrador v1 en `docs/spec/phase-2-spec.md` — 5 prioridades reconstruidas
(P1 PWA · P2 detalle continuo · P3 uniforms calidad · P4 FFT audio · P5 seeds por
instancia), esperando confirmacion de Gato (OQ-1..OQ-4 del spec §8) para generar
Plan → Tasks → Implement. Decisiones de Fase 2 = serie D-3xxx, tasks = serie T-2xx.

Pendiente en paralelo (no bloquea el spec): numero FPS del retest Quest con escala
0.7 (D-2112) — cierra SC-6/NFR-7 de Fase 1. Auditoria de completitud Fase 1:
BITACORA adendum 026-d (unico bloqueante formal = ese numero).

Blockers que requieren accion de Gato antes de abrir Fase 2:

1. Quest 3 test (T-061): criterio SC-6 pendiente. Requiere hardware Quest 3.
   Instrucciones en `docs/DEPLOY.md` (setup Tailscale + navegador Quest + FPS validation).
   **2026-06-12: Gato cargando el Quest 3 — pendiente de validacion en esta sesion.**
2. ~~Custom domain `motor13.neonodos.com`~~ — COMPLETADO 2026-06-11 (API Cloudflare).
3. ~~Validacion visual WebGPU real (FPS >60fps)~~ — COMPLETADO SC-1 ✅ 2026-06-12 (60fps laptop Gato).
8. ~~SC-7 usuario no-tecnico~~ — COMPLETADO 2026-06-12: modo edicion live-reload en panel Receta.
4. ~~LLM eval batch T-052/T-053~~ — COMPLETADO 2026-06-11: **100% pass rate en 3 corridas**
   (baseline 93.3%, una iteracion del system prompt). Ver BITACORA entrada 025.
5. ~~Benchmark vs Three.js (T-062..T-064)~~ — COMPLETADO 2026-06-11: **H1 validada, 30.8×**
   de reduccion de peso. Reporte en `docs/papers/phase-1-benchmark.md` (FPS/memoria GPU
   pendientes de laptop de Gato).
6. ~~Reconciliar colision D-2103/D-2104~~ — RESUELTO 2026-06-11 (FlowCAD → D-2107/D-2108).
7. ~~Convencion de codigos D-xxxx~~ — RESUELTO: D-3xxx para Fase 2.

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
- **D-2107 (FlowCAD, sesion 22-may — antes D-2103, re-codificado 2026-06-11):** Dynamic import del
  bundle m13 desde `/public/m13/m13-runtime.js` con `webpackIgnore`. Drop-in en cualquier app Next.js
  sin configurar resolve aliases.
- **D-2108 (FlowCAD, sesion 22-may — antes D-2104, re-codificado 2026-06-11):** Endpoint `.m13`
  no-strict en job_manager de NeoCAD — persiste aunque el proceso FastAPI reinicie (archivo en disco).
- **D-2105 (FlowCAD, sesion 22-may):** Backend NeoCAD dejo de invocar Blender en flujo SSE.
  Motor m13 sobre WebGPU es la ruta de visualizacion principal.
- **D-2106 (FlowCAD, sesion 22-may):** `glb_to_usdz.py` se mantiene aislado con graceful skip. No afecta flujo principal.
- **D-2109 (runtime, 2026-06-12):** FlyCamera soporta controles de arrastre sin pointer lock
  (derecha=mirar, izquierda=joystick). Pointer lock es opt-in, auto-desactivado en
  dispositivos coarse-pointer (Quest/movil). Todo consumidor del runtime (FlowCAD incl.)
  hereda controles touch gratis.
- **D-2110 (examples, 2026-06-12):** DPR cap por dispositivo para el raymarch:
  Quest 1.0 · movil 1.5 · desktop 2.0. El costo por pixel del SDF no tolera dpr nativo en XR standalone.

### Convencion de codigos D (resuelta 2026-06-11)

La colision D-2103/D-2104 quedo reconciliada: las entradas FlowCAD de la sesion 22-may se
re-codificaron a **D-2107/D-2108** (el editor conserva los originales). Convencion firme:
**D-2xxx = Fase 1 (cerrada) · D-3xxx = Fase 2 · D-Nxxx = Fase N.** Las decisiones de la
auditoria 2026-06-10/11 usan la serie D-025-xx (entrada 025 de BITACORA).

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

### Idea 3 — MCP de m13 + app en ChatGPT/Claude — ✅ SERVIDOR IMPLEMENTADO 2026-06-12

**HECHO:** `packages/mcp/` (@m13/mcp) — 5 tools stdio (generate/validate/share/concepts/
format-guide), 17 tests, E2E verificado. Ver `packages/mcp/README.md` para conectarlo.
Pendiente: registrarlo en Claude Code de Cerebro4 + variante app ChatGPT + publicación.
Contexto original de la orden:

**Origen:** pregunta de inversionista sobre canales de distribución.
**Directiva de Gato:** "estos se deben lanzar desde el inicio para llegar a sectores
empresariales más rápido" — NO es idea de cajón, es candidato a primeras tasks post-Fase 2
(o paralelo a ella si Gato lo ordena).
**Qué es:** servidor MCP que expone `generate_m13_scene` (prompt NL → .m13 validado →
link 3D caminable en motor13) + variante como app/connector de ChatGPT. Cualquier LLM
del planeta se vuelve front-end de m13.
**Por qué es barato:** el formato .m13 es texto LLM-first, el system prompt ya está al
100% de pass rate (T-052/053), el parser/compiler ya validan — el MCP es plomería de días.
**Por qué importa:** distribución gratuita dentro de ChatGPT/Claude = canal de adquisición
empresarial sin costo de marketing. Coherente con D-025-06 (la IA crea recetas, el render
siempre es local del cliente).
**Constitution check:** cumple — LLM solo editor-time; el MCP ES editor-time.

### Idea 4 — m13 Live: performance audiovisual reactivo (SUBPROYECTO aprobado por Gato 2026-06-11)

**Qué es:** extensión de usos del Sonido 13 para shows en vivo. Subproyecto en
`~/neonodos-core/m13-live/` (scaffold creado 2026-06-11; ver su VISION.md). Tres módulos:
1. **cue-engine:** escenas .m13 pre-diseñadas que cambian por MIDI/timecode (Web MIDI +
   shader cache del engine ya lo permiten — el switch de escena es casi instantáneo).
2. **crowd-mirror:** Kinect/cámara de profundidad capta al público y lo "esculpe" en la
   escena como SDFs vivos (metaballs/siluetas) — el público se ve modelado en pantalla.
3. **gesture-trigger:** cámara frente al performer; gestos pre-configurados (MediaPipe
   pose, local) disparan efectos visuales, cambios de escena o un sampler de audio (WebAudio).
**Constitution check:** cumple — todo determinista y local, cero LLM en runtime.
**Scope:** NO compite con Fase 2 — se desarrolla post-Fase 2 o como demo complementario
de Innovafest si Gato lo ordena. El scaffold existe para no perder la visión.

### Idea 5 — Síntesis de audio procedural "a13" (hermano conceptual, idea de cajón)

La tesis m13 aplicada a audio: la IA escribe una receta sonora de texto (escala, tempo,
timbres, progresión, microtonos Carrillo) y Web Audio la sintetiza local y gratis.
Proyecto hermano, NO feature de m13. Sin fecha — se evalúa tras éxito comercial de m13.
Voces clonadas: descartado (territorio neural pesado + temas legales de consentimiento).

### Idea 6 — Modelo neural propio entrenado con la fábrica de datos .m13 (documentado 2026-06-11)

**La ventaja que pocos tienen:** m13 posee una fábrica de datos de entrenamiento gratis y
auto-validada — el generador paramétrico produce escenas .m13 válidas infinitas (185
validadas con 0 fallas contra parser+compiler) y el eval harness (T-052/053, 100% pass)
mide calidad automáticamente. Cada escena generada desde hoy es data acumulándose.

**Camino A — LLM chico local (el más barato/valioso):** fine-tune de un modelo 1-3B con
pares (prompt → .m13) sintéticos + curados. Resultado: generación de escenas sin internet
y sin costo por token — cierra el círculo de D-025-06 al 100% (ni la capa opcional de IA
dependería de la nube). Pipeline: generador paramétrico → dataset → fine-tune → eval
harness como benchmark de regresión.

**Camino B — Neural SDFs (el más alineado con la tesis):** familia DeepSDF — una red
chiquita ES la forma 3D, función continua aprendida. Es la tesis Sonido 13 con pesos
neuronales. Encaja directo en la Fase 3 del roadmap (síntesis neural local ONNX).

**Hardware:** Gato confirmó (2026-06-11) acceso a un servidor mejor que Cerebro4 para
entrenar — los experimentos del Camino A son viables sin nube de pago.
**Orden:** post-Fase 2 + validación comercial B2B. Mientras tanto: empezar a PERSISTIR
las escenas generadas (demo público + editor + FlowCAD) como dataset desde ya — costo
cero, el tiempo juega a favor.

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
