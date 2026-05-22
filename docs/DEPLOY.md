# m13 — Deploy guide

Pasos para llevar el demo a `https://motor13.neonodos.com` y validar en Quest 3.

> **Quién lo hace:** Gato (acción manual en dashboards externos).
> **Por qué no Claude:** requiere acceso a Cloudflare dashboard + Quest 3 físico — fuera del alcance del runtime de Claude Code.

---

## T-059 — Deploy a Cloudflare Pages

### Pre-requisitos
- Build de producción listo: `pnpm --filter @m13/examples build` (ya pasa, 260 KB total)
- Cuenta Cloudflare con el dominio `neonodos.com` administrado
- `wrangler` CLI instalado: `pnpm add -g wrangler`

### Opción A — Deploy directo con wrangler (más rápido)

```bash
cd /home/isai1618/neonodos-core/NeoNodos_System/m13
pnpm --filter @m13/examples build
cd packages/examples
wrangler login   # primera vez, abre browser para auth Cloudflare
wrangler pages deploy dist --project-name=motor13 --branch=main
```

Output esperado:
```
✨ Successfully deployed to https://motor13.pages.dev
```

Después configurar el custom domain:

```bash
wrangler pages project list
wrangler pages deployment list --project-name=motor13
```

En el dashboard de Cloudflare:
1. Workers & Pages → motor13 → Custom domains
2. Add → `motor13.neonodos.com`
3. CF detecta que el dominio ya está administrado → crea CNAME automático
4. Espera ~30s a que propague + SSL aparezca

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

### Test desde URL pública (post T-059)

1. En el Quest, abrir el Meta Quest Browser
2. Visitar `https://motor13.neonodos.com`
3. Click en el canvas → permitir pointer lock
4. Verificar que renderiza la escena `galería` (la primera)
5. Navegar con joystick/controles del Quest (o teclado bluetooth si tienes)
6. Cambiar entre las 5 escenas con `1`-`5` (necesitas teclado o usar el selector en pantalla)
7. **Tomar screenshot del FPS counter** (HUD esquina inferior derecha)
8. **Criterio de éxito:** FPS ≥ 72 en `sala_galeria` (la escena más simple). Si <72, ver "Mitigaciones" abajo.

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

## Estado al cierre de Fase 1

Cuando T-059 + T-061 se completen, marcar en BITACORA:
- [ ] Deploy a `https://motor13.neonodos.com` LIVE
- [ ] Quest 3 verificado ≥72fps en `sala_galeria`
- [ ] Smoke test post-deploy activo en phi cron
- [ ] CLAUDE.md fase 1 marcada ✅ completa (T-067)

---

*Última actualización: 2026-05-21 — generado al cerrar T-058 y T-060.*
