# 06 — Plugin SDK

## Propósito

Un tercero añade un sistema sin fork de `@m13/runtime` y sin parchear el núcleo ECS.

## Modelo

```
GamePlugin { id, schema?, components?, systems?, onBootstrap?, onSave?, onLoad? }
```

Sin `import()` remoto en MVP. Allowlist local / registro en el host.

## Orden

`command → input → ai → integrate → physics? → triggers → interact → needs → quest → present`

Dos plugins en el mismo slot: orden por `id` lexicográfico.

## Datos en `.m13`

Solo `plugins.<id>`. No top-level inventado (`weather:`). Ascenso a campo core = minor version.

## Qué NO hace

GPUDevice, reemplazar compileScene, eval, marketplace, LLM en tick.

## Criterio de hecho

Plugin `example.flags` headless + save namespaced roundtrip. Quitar el plugin no rompe el parse.
