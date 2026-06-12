# Troubleshooting — m13

Problemas reales que ya nos pasaron (documentados en `BITACORA_MOTOR13.md` y
`CLAUDE.md`) con su solución. Formato: síntoma → causa → fix. Si encuentras uno nuevo,
agrégalo aquí y registra la entrada en la BITACORA.

---

## Canvas negro / error "context is not configured"

**Síntoma:** el canvas se queda negro al cargar el demo; la consola muestra
`context is not configured` y el motor se detiene (el guard del render loop captura el
error y para el tick con stack trace visible).

**Causa:** dos `loadScene` concurrentes (p. ej. la escena de boot + una auto-generación
al entrar) compartían el mismo `GPUCanvasContext`. El `unconfigure()` de una carga
aterrizaba DESPUÉS del `configure()` de la otra → contexto sin configurar → el error
guard detenía el motor. Era un bug latente de concurrencia que el guard volvió visible.

**Fix:** resuelto en commit `7ec1fc8` — `loadScene` se serializa vía promise chain +
flag `loading` que aparta al tick del contexto mientras se reemplaza el renderer. Hay
test de concurrencia que lo cubre. Si lo ves: actualiza a una versión ≥ ese commit. Si
estás tocando el engine, NO quites la serialización de `loadScene`.

---

## WebGPU no disponible

**Síntoma:** mensaje "WebGPU no disponible" en el demo; `navigator.gpu` es `undefined`,
o existe pero `requestAdapter()` regresa `null` (caso real: Cerebro4 con GT710 y driver
NVIDIA v470 — `navigator.gpu` reporta pero el adapter falla).

**Causa:** navegador sin soporte WebGPU, o GPU/driver demasiado viejos para exponer un
adapter funcional.

**Fix:**
- Navegadores soportados: **Chrome/Edge 113+**, Safari Technology Preview con flag,
  o el navegador del Quest 3 (Horizon OS v62+).
- **Qué SÍ funciona sin GPU:** las vistas "Crear" y "Por qué m13" del demo operan igual —
  la generación de recetas `.m13` es 100% local y no necesita GPU (D-025-06). Solo el
  render del mundo 3D requiere WebGPU. El parser, compilador, tests y typecheck también
  corren sin GPU.

---

## Next.js: "Module not found" en imports del runtime

**Síntoma:** el editor Next.js falla el build/dev con `Module not found: Can't resolve
'./engine.js'` (o cualquier import interno de `@m13/runtime`).

**Causa:** el monorepo usa imports ESM con extensión `.js` aunque los archivos sean
`.ts` (requisito de `moduleResolution: 'Bundler'`). Webpack 5 de Next.js no resuelve
`.js` → `.ts` por defecto.

**Fix (D-2102):** en `packages/editor/next.config.mjs` ya está el mapeo:

```js
config.resolve.extensionAlias = {
  ...(config.resolve.extensionAlias ?? {}),
  '.js': ['.ts', '.tsx', '.js'],
};
```

Si creas otra app Next.js que importe el runtime, copia ese bloque (o usa el bundle
pre-buildeado como hace FlowCAD, D-2107).

---

## Next.js: crash en SSR por `navigator.gpu`

**Síntoma:** Next.js truena en server-side rendering con `ReferenceError: navigator is
not defined` (o similar) al importar `@m13/runtime`.

**Causa:** el runtime toca `navigator.gpu`, que no existe en Node durante el SSR.

**Fix (D-2103):** importar el engine dinámicamente solo en cliente:

```ts
const { M13Engine } = await import('@m13/runtime'); // dentro de useEffect / código client-only
```

Nunca importes `@m13/runtime` con import estático en un componente que se renderiza
en servidor.

---

## Pointer lock no captura el mouse

**Síntoma:** el walkthrough WASD funciona pero el mouse no rota la cámara.

**Causa:** el pointer lock requiere un **click del usuario sobre el canvas** (gesto
explícito — el navegador lo exige). Además: ESC lo libera, y `requestPointerLock()`
puede fallar silenciosamente (la FlyCamera lo envuelve en try/catch y lo ignora), por
ejemplo en iframes sin permiso.

**Fix:**
- Haz click directo en el canvas para capturar; ESC para soltar.
- Verifica en consola: `document.pointerLockElement` debe ser el canvas.
- Si embebes el demo en un iframe, agrega `allow="pointer-lock"` al iframe.
- El movimiento solo se aplica cuando `locked === true` (ver
  `packages/runtime/src/camera/fly-camera.ts`).

---

## Render corrupto después de tocar shaders (UNIFORM_BYTES = 160)

**Síntoma:** agregaste campos al struct `Uniforms` y ahora el render muestra basura,
colores locos o nada — **sin ningún error en consola**.

**Causa:** el layout del struct WGSL en `shaders/common.ts` y el `writeUniforms` de
`renderer/index.ts` quedaron desincronizados. WebGPU **corrompe memoria en silencio**
si los layouts no coinciden.

**Fix:** actualiza SIEMPRE las tres cosas en el mismo commit:
1. El struct `Uniforms` en `packages/runtime/src/shaders/common.ts` (WGSL).
2. La función `writeUniforms` en `packages/runtime/src/renderer/index.ts`.
3. La constante `UNIFORM_BYTES` (línea 3 de `renderer/index.ts`, hoy `160`).

Ojo con el alignment de WGSL (`vec3<f32>` alinea a 16 bytes). Si puedes evitar tocar
el uniform layout, evítalo — D-025-02 metió el background por `missColor()` generada
en el compilador precisamente para no crecer el struct.

---

## pnpm: el lockfile no se puede leer / quiere regenerarse

**Síntoma:** `pnpm install` falla, ignora el lockfile o pide regenerar
`pnpm-lock.yaml` (errores de versión de lockfile o mismatch con `--frozen-lockfile`).

**Causa:** el lockfile del repo es `lockfileVersion: '9.0'` — **pnpm 8 no lo lee**.
El repo fija `"packageManager": "pnpm@9.15.9"` en el `package.json` raíz.

**Fix:** usa pnpm 9 (`corepack enable` respeta el campo `packageManager`
automáticamente). NUNCA regeneres el lockfile con pnpm 8: rompe el install de todos
los demás.

---

*Última actualización: 2026-06-12 · Fase 1 (v0.1.0)*
