# Getting Started · m13

> Cómo arrancar el monorepo en local desde cero.

---

## Requisitos

- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- **pnpm 8+** — si no lo tienes: `npm i -g pnpm`
- **Chrome / Edge 113+** (necesario para WebGPU)

---

## 1. Descomprimir y entrar al proyecto

```bash
tar xzf m13-bootstrap.tar.gz
cd m13
```

---

## 2. Instalar dependencias

```bash
pnpm install
```

Esto descarga e instala todo, incluyendo Vite, Zod, yaml, @webgpu/types y TypeScript. La primera vez tarda 30-60 segundos.

---

## 3. Arrancar el dev server

```bash
pnpm dev
```

Vite abrirá `http://localhost:5173`. Si el navegador no se abre solo, pégalo a mano. Verás el demo corriendo con la primera escena cargada (`sala_basica`).

---

## 4. Probar las escenas

- Click en el canvas para capturar el cursor
- `WASD` + mouse para moverte
- `Space` / `Shift` para subir/bajar
- `1` `2` `3` `4` para cambiar entre las 4 escenas (sala, galería, loft, templo)
- `M` para activar el micrófono (la flama del templo y la esfera dorada de la sala reaccionan)
- `Esc` para liberar el cursor

---

## 5. Verificar tipos

```bash
pnpm typecheck
```

Esto corre `tsc --noEmit` en todos los packages. No debería arrojar errores.

---

## 6. Build de producción

```bash
pnpm build
```

Genera artefactos en cada `packages/*/dist/` y la app estática lista para deploy en `packages/examples/dist/`. Puedes subir esa carpeta a Vercel, Netlify o cualquier hosting estático.

---

## Estructura del proyecto

```
m13/
├── constitution.md          # principios no negociables
├── README.md
├── BITACORA_MOTOR13.md      # log de sesiones de desarrollo
├── docs/
│   └── spec/phase-1-spec.md
├── packages/
│   ├── runtime/             # @m13/runtime — el motor
│   │   └── src/
│   │       ├── engine.ts        # M13Engine class (API pública)
│   │       ├── parser/          # YAML → M13Scene tipada
│   │       ├── compiler/        # M13Scene → WGSL ensamblado
│   │       ├── renderer/        # WebGPU pipeline + uniforms
│   │       ├── camera/          # FlyCamera con pointer lock
│   │       ├── audio/           # MicAudioInput opcional
│   │       └── shaders/         # WGSL común (SDF, noise, raymarch)
│   ├── synth/               # @m13/synth — librería de conceptos materiales
│   │   └── src/concepts/        # 8 conceptos: ladrillo, mármol, madera, etc.
│   └── examples/            # @m13/examples — Vite app
│       ├── index.html
│       ├── src/main.ts
│       └── public/scenes/       # 4 escenas .m13 reales
```

---

## Crear tu propia escena

Edita o duplica un archivo en `packages/examples/public/scenes/` con extensión `.m13`:

```yaml
version: "0.1"
name: mi_escena
description: "Mi primera escena en m13"

bounds: [5, 3, 5]
spawn: [0, 0, -3.5]

ambient:
  background: [0.05, 0.05, 0.05]
  ambientColor: [0.1, 0.1, 0.1]
  tint: [1, 1, 1]
  fogColor: [0.05, 0.05, 0.05]
  fogDensity: 0.015

light:
  position: [0, 2.5, 0]
  color: [1, 0.9, 0.7]
  intensity: 1

walls:
  concept: pared_yeso_blanco

floor:
  concept: piso_madera_envejecida

ceiling:
  concept: pared_yeso_blanco

objects:
  - id: mi_esfera
    kind: sphere
    position: [0, -1.5, 0]
    scale: 0.5
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 0.8
      amplitude: 0.1
```

Luego agrégala al array `SCENES` en `packages/examples/src/main.ts`.

---

## Conceptos materiales disponibles (v0.1)

| ID | Categoría | Para |
|---|---|---|
| `pared_yeso_blanco` | wall | Yeso blanco neutral |
| `pared_ladrillo_viejo` | wall | Ladrillo rojizo audio-reactivo |
| `piso_madera_envejecida` | floor | Madera con vetas |
| `piso_concreto_industrial` | floor | Concreto pulido |
| `marmol_blanco_vetas` | universal | Mármol blanco con vetas |
| `piedra_volcanica` | universal | Piedra oscura prehispánica |
| `metal_dorado_pulido` | object | Dorado mate audio-reactivo |
| `cuero_vintage` | object | Cuero envejecido con poros |

Para agregar un nuevo concepto:

1. Crea `packages/synth/src/concepts/mi_concepto.ts` siguiendo el patrón
2. Importa y registra en `packages/synth/src/index.ts`
3. Ya puedes referenciarlo desde cualquier `.m13`

---

## Próximos pasos del proyecto

Lee `docs/spec/phase-1-spec.md` para entender qué falta para completar Fase 1, y `constitution.md` para los principios fundacionales.

Después de Fase 1, vienen:

- **Fase 2** — detalle continuo (Sonido 13 visual completo)
- **Fase 3** — síntesis neural local con ONNX
- **Fase 4** — Gaussian Splatting híbrido
- **Fase 5** — WebXR + Quest 3 + voz
- **Fase 6** — edición temporal + Sabio Compositor

---

## Troubleshooting

**"WebGPU no disponible"**
Necesitas Chrome 113+ o Edge 113+. Safari requiere flag manual. Firefox aún no soporta WebGPU estable en mayo 2026.

**"pnpm: command not found"**
`npm i -g pnpm` y reabre la terminal.

**Pantalla negra sin error**
Abre DevTools (F12) y revisa la consola. Lo más común: shader inválido por algún concepto que no existe. Verifica que el `concept:` en tu `.m13` esté registrado en `@m13/synth`.

**Pointer lock no jala**
Algunos navegadores bloquean pointer lock cuando abres el HTML desde `file://`. Siempre usa `pnpm dev` (sirve por HTTP local).

---

*m13 v0.1.0 · NeoNodos*
