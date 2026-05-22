# CLAUDE.md — m13 motor gráfico

> **Instrucciones persistentes para Claude Code.** Lee este archivo al inicio de cada sesión antes de hacer cualquier cambio. Si el usuario pide algo que contradice este documento, pausa y pregunta antes de proceder.

---

## TL;DR

**m13** es un motor gráfico experimental **local-first** para WebGPU/WebXR. Sintetiza mundos 3D desde archivos `.m13` (YAML semántico) usando SDF raymarching + conceptos materiales procedurales — sin assets pesados, sin red en runtime.

**Estado actual:** Fase 1 en implementación. El bootstrap está completo, ahora falta extender la librería de conceptos, agregar editor minimal con LLM editor-time, hacer benchmark vs Unity, y testear en Quest 3.

**Owner del proyecto:** Gato (Genaro Isaí García Torres) — CEO NeoNodos.

**Idioma:** español mexicano informal en docs/comentarios/commits. APIs públicas y nombres de tipos/funciones en inglés.

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
| 0 | Proof of principle SDF raymarching | ✅ COMPLETED (demos HTML standalone) |
| 1 | Lenguaje .m13 + librería conceptos | 🚧 IN PROGRESS (bootstrap hecho, impl pendiente) |
| 2 | Detalle continuo (Sonido 13 visual) | ⏳ PENDING |
| 3 | Síntesis neural local con ONNX | ⏳ PENDING |
| 4 | Gaussian Splatting híbrido | ⏳ PENDING |
| 5 | WebXR + Quest 3 + voz | ⏳ PENDING |
| 6 | Edición temporal + Sabio Compositor | ⏳ PENDING |

Lee `docs/spec/phase-1-spec.md` para el detalle de qué falta en Fase 1.

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

## Próximos pasos prioritarios (Fase 1)

Según `docs/spec/phase-1-spec.md`:

1. Resolver Open Questions OQ-1 a OQ-4 (preguntar a Gato).
2. Generar `docs/plans/phase-1-plan.md` desde el spec.
3. Generar `docs/tasks/phase-1-tasks.md` desde el plan.
4. Extender librería de conceptos: de 8 actuales a ~15. Sugerencias: `vidrio_traslucido`, `tela_lino`, `agua_quieta`, `papel_tapiz_geometrico`, `metal_oxidado`, `madera_clara`, `azulejo_talavera`.
5. Implementar editor minimal en Next.js con LLM editor-time (Claude API) que tome prompt en español → genere `.m13` válido → preview en vivo.
6. Benchmark vs Unity WebGL build: tiempo de carga, FPS sostenido, peso del bundle.
7. Test en Quest 3 (navegador del Quest soporta WebGPU desde Horizon OS v62+).

---

## Decisiones técnicas registradas

- **D-001:** Monorepo con pnpm workspaces (sobre Nx/Turbo). Razón: simplicidad, ya usado en NeoNodos.
- **D-002:** `main` de packages apunta a `./src/index.ts`, no `./dist/`. Razón: dev sin build previo.
- **D-003:** Parsing con `yaml` + validación con `zod`. Razón: ambos son standard, Zod nos da tipos TS de regalo.
- **D-004:** SDF raymarching como base de Fase 1, no rasterización clásica. Razón: alinea con la tesis del Sonido 13 (continuidad).
- **D-005:** Conceptos materiales como módulos TS que exportan WGSL como string. Razón: tree-shakeable, refactor-friendly, no requiere loader custom.
- **D-006:** Look del HUD: JetBrains Mono + accent dorado `#c9a227` + grain + scanlines. Razón: identidad visual NeoNodos.
- **D-007:** Escenas servidas desde `packages/examples/public/scenes/`. Razón: Vite las sirve estáticamente sin configuración.

Cualquier decisión técnica nueva durante sesiones de Claude Code se agrega aquí con código D-XXX incremental.

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

*Última actualización: bootstrap inicial · v0.1.0*
