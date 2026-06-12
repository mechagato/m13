# Auditoría de seguridad — Fase 1 (editor + demo público + cadena de share links)

> **Tarea:** T-075 · Auditoría READ-ONLY del código de Fase 1.
> **Fecha:** 2026-06-11 · **Alcance:** `packages/editor`, `packages/examples`,
> `packages/runtime` (parser/compiler), `packages/mcp`.
> **Método:** lectura del código real + verificación empírica de las afirmaciones
> (Zod/YAML/tamaños) con Node en el workspace. Cero hallazgos inventados: cada
> ítem de la tabla se cruzó contra el código antes de reportarse.

---

## Resumen ejecutivo

El núcleo de la cadena más peligrosa — **share link `#scene=` → YAML arbitrario →
parser → compiler → WGSL** — está **bien defendido contra inyección de shader y XSS**.
El compilador resuelve todos los ids de material/concepto contra el registry de
`@m13/synth` y **lanza error antes de emitir WGSL** si un id no existe, así que no se
puede interpolar código WGSL arbitrario desde el YAML. El render de la receta en el DOM
pasa por `escapeHtml` en todos los caminos y se inserta como contenido de elemento (no
como atributo), por lo que **no hay XSS reflejado** desde un link compartido.

Los problemas reales son dos:

1. **(ALTO) El editor expone el token del gateway LLM al cliente** (`NEXT_PUBLIC_PHI_LLM_TOKEN`)
   y **no existe ningún Route Handler server-side** (`app/api/**` está vacío): el browser
   habla directo con el gateway con `Authorization: Bearer`. Si el editor se despliega con
   un token de producción contra un gateway alcanzable por internet, cualquiera lo extrae
   del bundle y abusa del gateway (costo/cuota). En dev no es explotable (token
   `phi-dev-local` contra `localhost`).
2. **(MEDIO) DoS client-side por share link:** el schema no limita la cantidad de objetos
   de una escena. Un `#scene=` con miles de objetos genera un shader WGSL gigante que puede
   congelar o crashear el tab de la víctima (GPU device lost).

Lo demás son endurecimientos menores (robustez ante `Infinity`, token LLM del demo en
localStorage). El paquete `packages/mcp` todavía **no tiene código** (solo `package.json`),
así que no hay `share_url` que auditar ahí aún.

---

## Tabla de hallazgos

| ID | Severidad | Componente | Descripción | Explotabilidad real | Recomendación |
|----|-----------|-----------|-------------|---------------------|---------------|
| **H-01** | **ALTO** | `packages/editor/lib/llm-client.ts` (+ ausencia de `app/api/**`) | El token del gateway se lee de `NEXT_PUBLIC_PHI_LLM_TOKEN` (líneas 12-13). El prefijo `NEXT_PUBLIC_` hace que Next.js **inyecte el valor en el bundle del cliente**. No hay proxy server-side: `NLPrompt` (`'use client'`) llama a `chat()`, que hace `fetch(GATEWAY_URL/llm/chat)` con `Authorization: Bearer <token>` **desde el browser**. | **Condicional al deploy.** En dev el token es `phi-dev-local` contra `localhost:9095` → no explotable. Si el editor se publica con un token real y el gateway es alcanzable por internet, **cualquiera extrae el token del JS** (DevTools/bundle) y consume el gateway gratis → abuso de costo/cuota de phi. El demo público actual es `examples`, no el editor, pero la falla arquitectónica existe igual. | Crear `app/api/llm/route.ts` (Route Handler) que use `PHI_LLM_TOKEN` **sin** `NEXT_PUBLIC_`, proxee al gateway server-side, valide `Origin`/`Referer` y aplique rate limiting. El cliente debe llamar a `/api/llm`, nunca al gateway directo. El token jamás debe salir del server. |
| **H-02** | **MEDIO** | `packages/runtime/src/parser/schema.ts` (`objects`), `compiler/index.ts`, `packages/examples/src/main.ts` (`readSharedScene`/boot) | `objects: z.array(objectSchema).default([])` **sin `.max()`**. `generateMapFunction`/`generateMaterialFunction` emiten un bloque SDF + un `opUnion`/`if` por objeto, y el raymarch evalúa `map()` por cada paso por cada pixel. Un `#scene=` con miles de objetos produce un WGSL enorme: la compilación del shader y/o el render por-frame pueden congelar el tab o provocar *device lost* (TDR). | **Real, impacto acotado.** Requiere que la víctima abra un link malicioso (ingeniería social); no hay auth de por medio. El daño se limita a su propio tab/GPU (se cierra y listo): **sin** robo de datos, **sin** persistencia, **sin** escalada. Verificado: 10 000 objetos = 869 034 B de YAML → ~1 158 712 chars base64 en el hash de la URL (cabe en `location.hash`). | Añadir `.max(256)` (o el cap que haga sentido) al array `objects` del schema; además un guard en `compileScene` que lance si `scene.objects.length` supera el límite; y un tope al tamaño del YAML decodificado en `readSharedScene` **antes** de `engine.loadScene`. |
| **H-03** | **BAJO** | `packages/runtime/src/parser/schema.ts` (`vec3`/`rgb`/`positiveVec3`) | `Infinity` atraviesa el schema: `z.number()` y `z.number().positive()` **aceptan Infinity** (verificado), y `yaml` parsea `.inf`/`-.inf` a ±Infinity. Llega a `f(n)=n.toFixed(6)` → literal `"Infinity"` en el WGSL → el shader no compila → `loadScene` lanza (capturado). `NaN` sí lo rechaza Zod. | Muy baja. No hay crash ni inyección: solo rompe la invariante "todo número del YAML es seguro de interpolar". Resultado: un mensaje de error de compilación en lugar de un error claro de validación. | Usar `.finite()` en `vec3`/`rgb`/`positiveVec3` (o un `superRefine` global) para rechazar `±Infinity` en el parse y devolver un error de schema legible. |
| **H-04** | **BAJO** | `packages/examples/src/llm.ts`, `packages/examples/src/main.ts` (Ajustes) | El token (`m13_llm_token`) y el endpoint (`m13_llm_url`) del demo se guardan en `localStorage` sin validar host/esquema. Riesgos: (a) cualquier XSS en el origin exfiltra el token; (b) un usuario inducido a pegar un `m13_llm_url` malicioso hace que el browser mande `Authorization: Bearer <token>` a ese host (exfil del token vía endpoint del atacante). | Baja. El share link (`#scene=`) **no** puede setear estos valores (solo trae YAML), así que no es remoto sin XSS (no se encontró XSS) o ingeniería social. Por default no hay endpoint → no se manda token. | Validar que `m13_llm_url` sea `https://` y mostrar en la UI que "tu token se envía a este endpoint". Considerar `sessionStorage` o no persistir el token. Defensa en profundidad para que H-04(a) nunca se vuelva relevante: mantener intacto el escape del render (ver "No encontrado"). |
| **H-05** | **INFO** | gateway phi-llm (fuera de este repo) | En la arquitectura cliente-directo del editor, el cliente **es** la frontera de confianza: controla `system`, `messages`, `max_tokens`, etc. "Inyección del system prompt" y "rate limiting en el editor" no son defendibles del lado cliente. La única frontera real es el gateway. | N/A (no es código de este repo). | El gateway debe imponer **auth, rate limiting y políticas server-side**, y su **CORS no debe ser `*`** aceptando credenciales de orígenes arbitrarios (si lo fuera, cualquier sitio podría usar el token expuesto de un usuario). Verificar en el repo del gateway. |

---

## No encontrado (revisado y limpio)

Tan valioso como los hallazgos: esto se auditó explícitamente y **salió sano**.

- **Inyección de shader (WGSL) desde el YAML — NO.** Es el riesgo más serio de la cadena de
  share links y está cerrado. `compileScene` (compiler/index.ts:58-68) recolecta todos los
  ids de concepto (`collectConceptIds`: walls/floor/ceiling + `effectiveConceptId` de cada
  objeto) y resuelve cada uno con `getConcept(id)`; si **alguno** no está en el registry de
  `@m13/synth`, lanza `"Concepto desconocido"` **antes** de emitir una sola línea de WGSL.
  Solo ids ya validados se interpolan como `mat_<id>` / `sdf_<id>`. Los strings libres del
  YAML (`name`, `description`) **nunca** se emiten al shader. Todo lo demás interpolado son
  números formateados con `f()=toFixed(6)`.
- **XSS reflejado por el share link en el DOM — NO.** `showRecipe` → `highlightYamlLine`
  llama a `escapeHtml` (escapa `&`, `<`, `>`) y el resultado se inserta como **contenido de
  elemento** (no atributo), donde escapar esos tres caracteres es suficiente. `sceneName`,
  `sceneDesc` y las líneas de tarea usan `textContent`. El syntax-highlight reinserta `<span>`
  solo alrededor de grupos ya escapados (keys `[\w_.-]+`, números) — no reintroduce HTML.
- **`innerHTML` peligroso — NO.** Solo dos usos (`main.ts:258` y `:373`): el primero usa
  `scene.label` de `SCENES`, que son **constantes estáticas** (scenes.ts), no input del
  usuario; el segundo (`recipeCode.innerHTML`) usa contenido escapado.
- **Inyección de HTML por el textarea de edición de receta — NO.** El `<textarea>` usa
  `.value` (no interpreta HTML); su contenido solo llega a `recipeCode.innerHTML` vía un
  `showRecipe` posterior, que escapa.
- **Decodificación robusta del share link — OK.** `decodeSceneHash` (`atob`/`TextDecoder`)
  va dentro de `try/catch` en `readSharedScene` → si falla devuelve `null` → carga la escena
  default. Errores de YAML (`parseScene`) y de compilación se capturan en el `try/catch` del
  boot → `fail()` con `textContent`. Input malformado **no** crashea.
- **`eval` / `new Function` / `document.write` — ninguno** en el código auditado.
- **`NaN` en campos numéricos — rechazado** por Zod (`z.number().safeParse(NaN).success === false`,
  verificado). Solo `Infinity` pasa (ver H-03).
- **MCP (`packages/mcp`) — sin código aún.** Solo existe `package.json`; `src/` está vacío,
  no hay `share_url` ni handler que auditar. Cuando se implemente, debe **reusar el
  parser+compiler** (validación de ids vía registry) y aplicar el cap de objetos de H-02.

---

## Verificación empírica realizada

Ejecutado con Node dentro de `packages/runtime` (deps del workspace, sin instalar nada):

```
z.number().safeParse(NaN).success            = false
z.number().safeParse(Infinity).success       = true
z.number().positive().safeParse(Infinity)    = true   (.positive() acepta Infinity)
z.number().positive().safeParse(NaN)         = false
YAML .inf/.nan/-.inf                          = { a: Infinity, b: NaN, c: -Infinity }
YAML 10 000 objetos                           = 869 034 bytes
base64 del share link (#scene=)               = ~1 158 712 chars
```

Estos números sustentan H-02 (DoS por tamaño de escena) y H-03 (Infinity pasa el schema).

---

*Auditoría T-075 · m13 Fase 1 · 2026-06-11 · READ-ONLY (único archivo creado: este).*
