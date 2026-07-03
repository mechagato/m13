# Spec — Fase 6: Edición temporal + replay determinista + Sabio Compositor

**Proyecto:** m13 motor gráfico · **Fase:** 6 de 6 · codename **"tiempo"**
**Estado:** BORRADOR v1 — esperando check-in de Gato (OQ-6.x en §10)
**Fecha:** 2026-07-03 · **Spec anterior:** phase-5-spec.md (WebXR inmersivo)
**Series:** tasks T-6xx · decisiones D-6xxx · CHANGELOG target 0.4.0
**Roadmap:** ago-sep 2026 (después de Fase 5). Cierra la última fase del Constitution.

---

## 1. La tesis de esta fase

Fases 1-5 sintetizan **espacio** (geometría + materiales + detalle continuo + inmersión). Fase 6
agrega la cuarta dimensión: **el tiempo como descriptor semántico**. Igual que un `.m13` describe
un mundo en 2KB, describirá su EVOLUCIÓN — amaneceres, aperturas, eventos — con keyframes en YAML,
compilados a WGSL determinista. Y como el render ya es **determinista** (§3.5: mismas entradas =
mismo frame), grabar la trayectoria del usuario permite **replay exacto** — "la grabación ES el
mundo + el paseo", en unos KB.

Esto cierra el motor de las 6 fases Y **sienta el cimiento técnico del multiplayer** (m13-platform,
proyecto hermano): determinismo + replay = lockstep/rollback netcode sin sincronizar estado pesado.

## 2. Functional requirements

### FR-6.1 — Timeline / keyframes en el formato `.m13`
- `animate` v2 (unión retro-compatible con v1): además de `mode: bob|rotate|pulse`, acepta
  ```yaml
  animate:
    duration: 10          # segundos del ciclo
    loop: true            # ¿repetir? (default false → congela en el último keyframe)
    keyframes:
      - { t: 0,  position: [0, -2, 0] }
      - { t: 5,  position: [0,  1, 0], rotation: [0, 180, 0] }
      - { t: 10, position: [0, -2, 0] }
  ```
- Interpolación entre keyframes: **compilada a WGSL** (como bob/rotate/pulse hoy) — el compiler
  emite una función que, dado `u.time`, encuentra el tramo activo e interpola. Determinista, cero
  CPU por-frame, escala a muchos objetos.
- Campos animables por keyframe (v1): `position`, `rotation`, `scale`. Material temporal → §4.
- Easing por keyframe: `ease: linear|smooth|in|out` (default `smooth` = smoothstep).

### FR-6.2 — Eventos temporales (P1 ligero)
- `events: [{ t: 3, kind: 'audio_pulse' | 'light_flash', ... }]` a nivel de escena — disparadores
  determinísticos evaluados en el shading (p.ej. un `light_flash` que modula `lightIntensity`
  alrededor de `t`). Alcance mínimo: los que se resuelven en WGSL sin estado. Los que requieran
  side-effects (sonido real) se marcan como editor-time/host, no runtime.

### FR-6.3 — Replay determinista
- `RecordController` en `@m13/runtime`: en modo RECORD graba por frame `{ t, camPos, yaw, pitch }`
  (2D) o `{ t, rigPos, rigYaw, viewerPose? }` (XR) a un buffer; `export()` → JSON compacto.
- En modo REPLAY, el engine ignora el input en vivo y reproduce la trayectoria grabada contra el
  MISMO `u.time` → frame idéntico (verificable: hash de screenshot estable). Sin grabar geometría:
  solo la escena `.m13` + la trayectoria.
- Un replay se comparte como `.m13` + trayectoria (link `#replay=` o archivo). "El paseo viaja en la URL".

### FR-6.4 — Schema versioning (pre-requisito de la auditoría)
- `version: "0.2"` para escenas con features de Fase 6. `parseScene` enruta por versión con
  migración v0.1→v0.2 (defaults sensatos). **Escenas v0.1 → WGSL byte-idéntico** (hash-regression
  lo blinda; el `animate` v1 no cambia).
- `SCHEMA_VERSION` semántico documentado; cada cambio de formato → BITÁCORA + migración.

### FR-6.5 — Sabio Compositor (editor-time, P2)
- Extiende el generador/MCP para AUTORAR escenas temporales por lenguaje natural ("haz que
  amanezca sobre la pirámide en 20 segundos") → `.m13` v0.2 con keyframes. **Editor-time puro**
  (§3.7): compone el YAML; el runtime jamás llama a un LLM. Es el agente AURAI (polo Yang) del §196.

## 3. Non-functional requirements
- **NFR-6.1** Determinismo: 100 corridas de una escena temporal a un `t` fijo → 1 hash (tests T-012 extendidos).
- **NFR-6.2** Retro-compat DURA: las 11 escenas actuales (v0.1) → hash idéntico (hash-regression 11/11).
- **NFR-6.3** Costo: keyframes compilados no añaden CPU por-frame; el WGSL crece ~O(nº keyframes) por objeto animado.
- **NFR-6.4** Replay ≤ pocos KB para paseos de minutos (grabar a ~10-20 Hz + interpolar).
- **NFR-6.5** 100% local (§3.1) · typecheck/tests verdes por task.

## 4. Out of scope (Fase 6)
- Keyframes de **material** (cambiar de concepto en el tiempo) — difícil en WGSL (despacho por
  región); → P2 o fase futura. Keyframes de luz/fog SÍ son viables (P2).
- Física / simulación temporal (partículas, telas). Multiplayer/netcode → **m13-platform** (post).
- Edición no-lineal tipo NLE con pistas múltiples — v1 es una timeline por objeto.
- Audio real disparado por eventos (side-effect) en runtime.

## 5. Success criteria (gate de cierre)
- **SC6-1** Una escena `.m13` v0.2 con keyframes de position/rotation/scale se compila y anima
  determinísticamente (demo: Chichén con sol que recorre el cielo / puerta del templo que se abre).
- **SC6-2** Retro-compat: las 11 escenas v0.1 con hash idéntico (CI verde).
- **SC6-3** RECORD→REPLAY de un paseo reproduce frames idénticos (hash de frame estable a `t` fijo).
- **SC6-4** Determinismo temporal: tests T-012 extendidos a escenas con timeline.
- **SC6-5** [Gato] validación visual: la animación se ve fluida y sin pops.
- **SC6-6** [P2] Sabio Compositor genera una escena temporal por voz/texto.

## 6. Deliverables
Schema v0.2 (`animate` v2 + `events` + versioning + migración) · compiler de keyframes→WGSL ·
`RecordController` (record/replay) + link `#replay=` · demo temporal (Chichén amanecer) · tests
(keyframes math + determinismo + hash-regression) · docs (BITÁCORA + `docs/tasks/phase-6-tasks.md`).

## 7. Diseño técnico (bosquejo)
- **Interpolación en WGSL:** el compiler ordena los keyframes por `t` y emite, por objeto animado,
  código que calcula `local_t = loop ? fract(u.time/duration)*duration : min(u.time, duration)` y
  selecciona el tramo `[k_i, k_{i+1}]` con `mix(k_i.val, k_{i+1}.val, ease(f))`. Position se suma
  al offset actual; rotation compone con la matriz Euler ya existente; scale multiplica.
- **Determinismo:** todo deriva de `u.time` (ya en el uniform) — cero `Math.random`, cero estado.
- **Migración schema:** `parseSceneAnyVersion(yaml)` (auditoría) — v0.1 pasa igual; v0.2 valida el
  schema extendido. El hash de una escena v0.1 no cambia (el `animate` v1 emite el mismo WGSL).

## 8. Riesgos
| Riesgo | Mitigación |
|---|---|
| Romper retro-compat (hash de escenas v0.1) | La rama `animate` v1 NO se toca; keyframes es una rama nueva del union. hash-regression 11/11 en CI |
| WGSL de keyframes crece mucho con N keyframes | Cap razonable (p.ej. ≤16 keyframes/objeto) + `log()` si se excede; la mayoría de animaciones usan 2-5 |
| Replay diverge (no determinista) | El render ya es determinista; grabar solo cámara+t. Test de hash de frame a `t` fijo |
| Material temporal tienta a meterse | Explícitamente out-of-scope v1 (§4) |

## 9. Método
Spec → plan → tasks (T-6xx) → implement con commits chicos; auditoría adversarial del WGSL antes
de deploy; hash-regression + determinismo en CI; validación visual de Gato; BITÁCORA + memoria .phi.

## 10. Open questions (Gato — resolver en el check-in)
- **OQ-6.1** Keyframes de MATERIAL/luz: ¿luz/fog en Fase 6 (viable) y material como P2, o todo material a fase futura?
- **OQ-6.2** Replay: ¿link `#replay=` (comparte paseo por URL, mi recomendación) y/o archivo `.m13replay`?
- **OQ-6.3** Sabio Compositor: ¿en Fase 6 (P2) o se difiere (es agente, no motor)?
- **OQ-6.4** Easing default de keyframes: ¿`smooth` (smoothstep, recomendado) o `linear`?
- **OQ-6.5** ¿La demo temporal de cierre es "amanecer sobre Chichén" (recomendada, Innovafest) u otra?
