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
