# m13 — Deploy guide

Pasos para llevar el demo a `https://motor13.neonodos.com` y validar en Quest 3.

## Fase 5 - protocolo actual de Quest 3 (T-501 y T-513)

**URL canonica para esta prueba:** `https://m13.phi-core.com`.

### Sincronizacion verificable - 2026-07-27

- Cloudflare Pages: proyecto `motor13`, dominio `m13.phi-core.com`, sin Git provider.
- Fuente publicada: checkout `main` SHA `bacd8551580be12b460b36d86fccea4fd541fec9`.
- Deploy Pages: `https://9a195c15.motor13.pages.dev`.
- Verificacion publica: `index-D2h4AOp8.js` y SHA-256 de
  `scenes/chichen_amanecer.m13` = `766bd876bf74ab03315c13b1084aa80c8566a078e6fae8fe130ec31c14b67f40`,
  identico al archivo local.
- Esta es la version que debe usarse para T-501/T-513 y validacion visual de Fase 6.
No usar las instrucciones historicas de `motor13.neonodos.com` para cerrar Fase 5. El endpoint
canonico respondio HTTP 200 el 2026-07-27 y el bundle publico contiene el runtime WebXR.

### Preparacion (2 minutos)

1. Cargar el Quest 3, conectar Wi-Fi y actualizar Horizon OS/Meta Quest Browser si hay update.
2. Abrir Meta Quest Browser, visitar `https://m13.phi-core.com` y esperar a que cargue la escena.
3. Anotar Horizon OS y version de Meta Quest Browser desde Settings > System > About.
4. Tomar una captura de la pagina con la URL visible; anotar fecha/hora y el nombre de escena.

### T-501 - compatibilidad WebGPU + WebXR

1. Buscar el boton **Entrar en VR**. Solo aparece si el navegador reporta `immersive-vr` y expone
   `XRGPUBinding`.
2. Si el boton no aparece, tomar captura, anotar versiones y registrar **T-501 FAIL**. No inferir
   que XR funciona solo porque el modo 2D renderiza.
3. Si aparece, seleccionar **Chichen Itza** y pulsarlo. Aceptar el permiso del sistema para entrar
   en modo inmersivo.
4. Registrar uno de estos resultados: entra a VR, aparece error, pantalla negra, se cierra la
   sesion o el navegador se bloquea. Incluir captura/foto legible del mensaje si existe.

### T-513 - recorrido y confort (solo si T-501 entra a VR)

1. Confirmar que ambos ojos muestran la escena completa, sin que uno borre o invada al otro.
2. Caminar 60 segundos con stick izquierdo; usar giro por saltos con stick derecho; salir y volver
   a entrar una vez.
3. Probar Chichen Itza y sala_galeria. Registrar artefactos, mareo, perdida de tracking, cierres o
   degradacion visual.
4. Probar voz solo como evidencia P2: salir de VR, usar el flujo de voz/editor y comprobar que una
   escena se vuelve a cargar. No confundir autorizacion por voz con audio dentro de VR.

### Medicion de FPS

El statusbar web muestra FPS del canvas 2D. No es por si solo una medicion valida de FPS estereo
dentro del compositor XR, porque no hay HUD XR en esta version. Para SC5-2 registrar la observacion
de fluidez y el resultado de T-501/T-513; agregar telemetria XR o una medicion externa antes de
declarar >=60 FPS estereo.

### Evidencia a devolver

```
Quest 3 / Horizon OS: ...
Meta Quest Browser: ...
Fecha y hora: ...
URL: https://m13.phi-core.com
Escena: Chichen Itza / sala_galeria
T-501: PASS / FAIL + resultado exacto
T-513 ojos: OK / falla descrita
T-513 locomocion y confort: OK / falla descrita
Salida y reingreso: OK / FAIL
Voz P2: OK / no probada / FAIL
FPS estereo: no medido / metodo y valor
Capturas o video: ubicacion o adjuntos
```

Los pasos T-061 y dominios que siguen son historicos de Fase 1; conservarlos como referencia de
deploy, pero no usarlos como evidencia de cierre de Fase 5.

## Estado actual (2026-06-12)

- ✅ **Custom domain LIVE:** [https://motor13.neonodos.com](https://motor13.neonodos.com) (cert + CNAME via API CF, 2026-06-11)
- ✅ **SC-1 validado:** 60 fps vsync-capped en laptop de Gato (2026-06-12)
- ✅ **FPS visible sin teclado:** el statusbar (abajo del composer) muestra `fps · ms` en TODAS las vistas — clave para Quest 3
- ⏳ **Quest 3 test (SC-6) pendiente:** ver §T-061 abajo — ÚLTIMO criterio del gate Fase 1

---

## T-059 — Deploy a Cloudflare Pages

### Estado: ✅ deploy técnico hecho, custom domain pendiente

El deploy a `motor13.pages.dev` ya está LIVE. Lo único que falta es vincular el subdominio `motor13.neonodos.com` apuntando ahí.

### Re-deploy futuros (cuando edites el demo)

```bash
cd /home/isai1618/neonodos-core/NeoNodos_System/m13
pnpm --filter @m13/examples build
cd packages/examples
wrangler pages deploy dist --project-name=motor13 --branch=main
```

(wrangler ya está autenticado con OAuth en esta máquina con la cuenta isai@procesosdigitalesmty.com / Account ID `261c5b169b85396ca06e0356965bd3aa`.)

### Custom domain — pasos exactos en CF dashboard (~2 min)

Wrangler CLI 4.x **NO** maneja custom domains (solo el dashboard). Hacer:

1. Abrir [https://dash.cloudflare.com/](https://dash.cloudflare.com/) → cuenta "Isaí García"
2. Workers & Pages → **motor13** (el proyecto recién creado)
3. Pestaña **Custom domains** → botón **Set up a custom domain**
4. Escribir `motor13.neonodos.com` → **Continue**
5. CF detecta automáticamente que la zona `neonodos.com` está en la misma cuenta (lo verifiqué — los NS apuntan a `miles.ns.cloudflare.com` + `abby.ns.cloudflare.com`)
6. CF propone: agregar registro CNAME `motor13` → `motor13.pages.dev` en zona `neonodos.com` → **Activate domain**
7. Esperar ~30s a que SSL/TLS se aprovisione (badge cambia a verde "Active")
8. Verificar:
   ```bash
   curl -I https://motor13.neonodos.com/
   # Esperar HTTP 200
   ```

### Después del custom domain — regenerar el QR

El QR actual apunta a `https://motor13.neonodos.com` (URL final esperada — ya correcto). Pero si quieres validarlo:

```bash
cd /home/isai1618/neonodos-core/NeoNodos_System/m13
pnpm gen:qr   # regenera el PNG (output idéntico si la URL no cambió)
# Si OK, no hace falta re-deploy. Si cambias la URL: re-deploy.
```

### Opción B — Deploy via GitHub (CI/CD continuo)

Si quieres push-to-deploy automático:

1. En Cloudflare dashboard: Workers & Pages → Create application → Pages → Connect to Git
2. Selecciona el repo `mechagato/neonodos` (cuando se cree)
3. Configuración:
   - Production branch: `main`
   - Build command: `pnpm install && pnpm --filter @m13/examples build`
   - Build output directory: `packages/examples/dist`
   - Root directory: `NeoNodos_System/m13` (si está anidado en neonodos-core)
   - Node version: 22 (set env var `NODE_VERSION=22`)
   - Install command: `pnpm install`
4. Add custom domain: `motor13.neonodos.com`

### Verificación post-deploy

```bash
curl -I https://motor13.neonodos.com/
# Esperar HTTP 200, Content-Type: text/html

curl -s -o /dev/null -w "%{size_download}B\n" https://motor13.neonodos.com/
# ~3700 bytes (index.html con QR ya integrado)

curl -s -o /dev/null -w "%{size_download}B\n" https://motor13.neonodos.com/scenes/sala_galeria.m13
# ~2000 bytes
```

### Headers recomendados (opcional, en Cloudflare Pages settings)

Crear `packages/examples/public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/scenes/*
  Cache-Control: public, max-age=3600
```

Esto da cache agresivo a los chunks JS (que tienen hash en el filename) y cache de 1h a las escenas (editable sin invalidate manual del bundle).

---

## T-061 — Test en Quest 3 vía Tailscale (o WAN)

### Setup previo en Quest 3

1. Asegurar que el navegador del Quest 3 soporta WebGPU:
   - Settings → System → About → versión de Horizon OS ≥ v62
   - Si < v62, actualizar el Quest desde Settings
2. Habilitar Tailscale en el Quest (opcional para test local):
   - Sideload Tailscale APK desde https://pkgs.tailscale.com/stable/#android
   - Login con la misma cuenta del Cerebro4

### Test desde URL pública (UI actual 2026-06-12 — sin teclado necesario)

1. En el Quest, abrir el Meta Quest Browser
2. Visitar `https://motor13.neonodos.com`
3. Pulsar **"Entrar →"** — genera una galería al instante y la renderiza
4. **Leer el FPS en el statusbar** (abajo, junto a "m13 runtime v0.1.0": `NN fps · N.N ms`) — visible en todas las vistas, no requiere teclado
5. Para el walkthrough: segundo icono del rail izquierdo (**Explorar** ▦) → escenas en el panel derecho (click directo, sin teclas 1-9) → click en el canvas para pointer lock
6. Probar 2-3 escenas: `sala_galeria` (la más simple) y `templo_mexica`
7. **Tomar screenshot del statusbar con el FPS visible**
8. **Criterio SC-6:** FPS ≥ 72 en `sala_galeria`. Si <72, ver "Mitigaciones" abajo.

### Test desde URL local (sin necesitar T-059)

Si quieres validar ANTES del deploy público:

1. En Cerebro4, ya está corriendo `pnpm dev` → `http://localhost:5173`
2. En el Quest (mismo Tailnet vía Tailscale):
   - Browser → `http://100.89.1.30:5173` (IP Tailscale de Cerebro4)
3. Mismas verificaciones que arriba

### Mitigaciones si FPS < 72

Si el Quest 3 reporta FPS bajo, prioridad de cambios:

1. **Reducir octaves de FBM en los conceptos más complejos:**
   - `marmol_blanco_vetas` usa `fbm(p, 4)` → bajar a `fbm(p, 3)`
   - `piso_marmol_blanco` usa `fbm(p, 5)` → bajar a `fbm(p, 3)`
   - Documentar el cambio en BITACORA con D-XXX nuevo
2. **Reducir resolución del canvas** en `attachFlyCamera` (passing `pixelRatio: 1` en M13EngineOptions)
3. **Reducir steps del raymarch** en `shaders/raymarch.ts` (128 → 96) — costo: shadows más áspero

### Registro del resultado

Después del test, agregar entrada en `BITACORA_MOTOR13.md`:

```markdown
## Entrada XXX · YYYY-MM-DD · T-061 Quest 3 visual test

**Setup:** Quest 3, Horizon OS v62+, browser nativo, vía [Tailscale | WAN].

| Escena | FPS observado | Comportamiento visual | Pasa criterio (≥72)? |
|---|---|---|---|
| galería | NN | OK / glitch / etc | ✅ / ❌ |
| cocina | NN | ... | |
| oficina | NN | ... | |
| templo | NN | ... | |
| showcase | NN | ... | |

**Screenshot:** (link al PNG si lo subiste a Google Drive)

**Veredicto:** Quest 3 ✅ pasa NFR-7 / ⚠️ necesita mitigaciones.
```

---

## T-077 — Smoke test post-deploy (opcional, automatizable)

Script chico para validar que la URL pública sigue respondiendo cada N horas:

```bash
# tools/smoke-deploy.sh
#!/bin/bash
URL=${1:-https://motor13.neonodos.com}
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
SIZE=$(curl -s -o /dev/null -w "%{size_download}" "$URL")

if [ "$STATUS" != "200" ]; then
  echo "❌ $URL → HTTP $STATUS"
  exit 1
fi

if [ "$SIZE" -lt 1000 ]; then
  echo "❌ $URL → response demasiado chico ($SIZE bytes)"
  exit 1
fi

if ! curl -s "$URL" | grep -q "m13"; then
  echo "❌ $URL → respuesta no contiene 'm13'"
  exit 1
fi

echo "✅ $URL → HTTP 200, $SIZE bytes, contiene 'm13'"
```

Registrar en phi como cron cada 6h cuando el deploy esté en vivo.

---

## Registro de evidencia de release (actual)

Este bloque evita interpretar los checks historicos de Fase 1 como evidencia de XR actual.

| Evidencia | Estado | Fuente o comando |
|---|---|---|
| Render estereo XR no borra el primer ojo | Verificado local | `engine-xr.test.ts` |
| Renderer y contrato de escena | Verificado local | `pnpm test:coverage` |
| Calidad de integracion | Verificado local | `pnpm lint --max-warnings 0`, `pnpm build` |
| Riesgo de dependencias de produccion | Sin high/critical | `pnpm audit --prod --audit-level high` |
| WebGPU + WebXR en Quest 3 | Pendiente de hardware | T-501 |
| Escena, FPS estereo, locomocion y voz en Quest 3 | Pendiente de hardware | T-513 |

No declarar Fase 5 ni soporte Quest como cerrados sin adjuntar fecha, navegador/version, escena, FPS y resultado de T-501/T-513.

## Estado al cierre de Fase 1

Cuando T-059 + T-061 se completen, marcar en BITACORA:
- [ ] Deploy a `https://motor13.neonodos.com` LIVE
- [ ] Quest 3 verificado ≥72fps en `sala_galeria`
- [ ] Smoke test post-deploy activo en phi cron
- [ ] CLAUDE.md fase 1 marcada ✅ completa (T-067)

---

*Última actualización: 2026-05-21 — generado al cerrar T-058 y T-060.*
