# BITACORA — m13 Live

## 2026-06-11 — Génesis del subproyecto
- ✅ Scaffold creado por orden de Gato: VISION.md con los 3 módulos (cue-engine,
  crowd-mirror, gesture-trigger), reglas de scope (no compite con Fase 2 de m13)
- ✅ Registrado como Idea 4 en CLAUDE.md de m13 (junto con Idea 5, audio procedural "a13")
- Estado: VISIÓN. Sin código. Esperando orden de Gato para abrir Spec Kit.
- Stopper: crear repo GitHub requiere `gh auth login` con cuenta mechagato (tokens inválidos)

## 2026-06-12 — kinect-bridge v0: pipeline objeto físico → .m13 LISTO (falta solo el hardware)

Orden de Gato: "preparar todo para conectar el Kinect y renderizar un objeto físico".

- ✅ `kinect-bridge/depth2m13.py` — pipeline completo: depth → segmentación del objeto
  más cercano → backproject (intrínsecas v1/v2) → k-means a ≤24 metaballs → .m13
  validado contra el parser/compiler real → share link para Quest. **Probado E2E con
  depth sintético: 59,662 puntos → 24 esferas → escena válida de 3,584 bytes.**
- ✅ `detect-kinect.sh` — identifica v1/v2/Azure por USB id y dice qué sigue.
- ✅ `setup-drivers.sh` — instala libfreenect (v1, apt) y/o libfreenect2 (v2, build).
- ✅ `capture-v1.sh` — freenect-record 2s → frame PGM → depth2m13 → link.
- ✅ `tools/validate-scene.ts` agregado al repo m13 (validador CLI reutilizable).
- Estado: NO hay Kinect conectado a Cerebro4 aún (lsusb limpio). STOPPER para Gato:
  conectar el Kinect + correr `setup-drivers.sh` (pide sudo). Después: capture-v1.sh.
- Scope: esto es crowd-mirror v0 (captura estática). El bridge WebSocket en vivo
  (SDFs dinámicos por storage buffer) sigue siendo post-Fase 2 según VISION.md.

## 2026-06-12 — Nota de respaldo
Repo commiteado solo LOCAL (sin remote). Gato indicó que ya existen 2 repos del
ecosistema (mechagato/m13 + mechagato/flowcad) — NO crear repo nuevo sin su orden.
Decisión pendiente: respaldo de m13-live (repo propio vs integrarlo a uno existente).

## 2026-06-12 — Integrado al repo m13 (orden de Gato)
m13-live vive ahora en `<m13>/live/` (subtree con historia completa preservada).
El repo local viejo `~/neonodos-core/m13-live` queda como archivo con nota MOVED.
Respaldo en GitHub: ahora via mechagato/m13. Decisión de respaldo CERRADA.
