# One-pager — m13 Inducción espacial industrial (EHS / planta)

**Producto:** entrega espacial por URL (categoría nueva)  
**Vertical P0:** industria — inducción y recorrido de seguridad en planta/almacén  
**Fecha:** 2026-08-22 · **Estado:** oferta para conversación de piloto  
**Demo técnica:** https://m13.phi-core.com · **Repo:** https://github.com/mechagato/m13 (MIT)

---

## El problema (lo que ya les duele)

- Inducir personal nuevo o contratistas en un layout real **cuesta paro de línea** o tiempo de un supervisor.
- El PDF / video **no deja evidencia** de que alguien recorrió *la versión aprobada* del pasillo o proceso.
- Cambió una máquina o una ruta: hay que **rehacer material** (PowerPoint, tour guiado, a veces un 3D caro).
- Llevar a todos a un simulador Unity/PC instalado **no escala** en piso ni en plantas con red limitada.

---

## La oferta (una frase)

**Publicamos un pasillo o proceso de su planta como mundo caminable en el navegador (y Quest), versionado, con checklist de riesgos — listo el mismo ciclo de trabajo, sin instalar app.**

No vendemos “cumplimiento automático ante STPS/OSHA”.  
Vendemos **entrenamiento espacial + evidencia de recorrido** sobre una escena con hash fijo.

---

## Qué recibe el cliente en el piloto

| Entrega | Detalle |
|---|---|
| **1 escenario** | Un pasillo o un proceso acotado (acordado en kickoff) |
| **3 riesgos** | Puntos de atención visibles en el recorrido (atropello, zona restringida, EPP, etc.) |
| **Checklist** | Lista corta que el participante completa durante/al final |
| **Link + PWA** | URL compartible en intranet o controlada; funciona en Chrome/Edge |
| **Quest opcional** | Misma escena en VR (Meta Quest Browser) para sala de capacitación |
| **Versión firmada** | Hash de la escena `.m13` = “esta es la v1.3 que aprobó EHS” |
| **Replay opcional** | Evidencia de trayectoria 2D del recorrido (cuando aplique) |
| **Capacitación flash** | 1 sesión para el dueño del contenido (cómo pedir cambios) |

**Duración piloto sugerida:** 4–6 semanas · **Sitio:** una planta / un almacén real (contenido autorizado por ustedes).

---

## Qué no incluye (límites honestos)

- No es digital twin BIM completo ni gemelo con IoT en vivo.
- No sustituye cursos normativos certificados ni dictámenes legales.
- No fotorealismo tipo Unity/Unreal (la claridad del layout y los riesgos es el objetivo).
- No multiplayer masivo ni avatares sociales en el piloto.
- Cambios de alcance (segunda línea, 20 riesgos, SCORM/LMS profundo) = fase 2 cotizada aparte.

---

## Precios de referencia (MXN, orientativos)

Ajustables según tamaño de planta y si hay Quest en sitio.

| Concepto | Rango | Notas |
|---|---|---|
| **Piloto cerrado** (1 escenario + 3 riesgos + checklist + link + 1 ronda de ajustes) | **$80,000 – $200,000** | Precio fijo; 50% kickoff / 50% aceptación |
| **Licencia anual** post-piloto (mismo sitio, hasta N escenarios acordados) | **$120,000 – $400,000 / año** | Hosting viewer, soporte, N revisiones/mes |
| **Escenario adicional** | **$25,000 – $60,000** | Pasillo/proceso extra sobre la misma planta |
| **Jornada Quest en sala** (opcional) | **$15,000 – $35,000** | Setup + ensayo con su equipo (hardware del cliente o renta) |
| **Actualización urgente de layout** | **$8,000 – $20,000** | Cuando mueven equipo y hay que republicar hash |

**Ancla de conversación (piloto estándar):** **$120,000 MXN** — un pasillo, 3 riesgos, checklist, link, una revisión mayor, cierre con métrica.

Moneda y factura: según entidad NeoNodos / acuerdo comercial vigente.

---

## Métrica de éxito del piloto (elegir 1–2 con el sponsor)

1. **Tiempo** de inducción supervisada baja ≥20% vs proceso actual (PDF/tour).  
2. **Errores** en ejercicio de riesgos bajan (pre/post o grupo control).  
3. Sponsor EHS **acepta el hash** como versión oficial del recorrido de inducción.  
4. ≥80% de una cohorte piloto **completa** checklist en el mundo.

Sin métrica acordada en kickoff = no hay piloto (evita demos de marketing sin compra).

---

## Quién debe estar en la primera reunión (30 min)

- **Comprador:** EHS, Operaciones o Capacitación (quien tiene presupuesto).  
- **Dueño del layout:** alguien que pueda autorizar fotos/planos/recorrido del pasillo real.  
- **IT (opcional):** si el link vivirá solo en intranet.

Guion de validación: ver `docs/market-validation-mvps.md` (sección Industria).

---

## Por qué m13 (categoría nueva, no “otro Unity”)

- **La URL es el mundo** — distribuir inducción como un link, no como instalador.  
- **Local-first** — el render corre en el dispositivo; útil con red industrial floja.  
- **Semántico** — cambios de layout sin rearmar un proyecto 3D pesado.  
- **WebXR** — misma escena en pantalla y en Quest.  
- **Open source MIT del motor** — el cliente paga el **piloto, plantillas y operación**, no un lock-in opaco del runtime.

---

## CTA

1. Agendar kickoff de 30 min.  
2. Elegir **un** pasillo/proceso real.  
3. Firmar alcance del piloto (precio + métrica).  
4. Publicar v1 del link en ≤3 semanas desde contenido autorizado.

**Contacto comercial:** Genaro Isaí García Torres (Gato) · NeoNodos / m13
