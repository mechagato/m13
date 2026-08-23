# PLAN CANÃ“NICO â€” DistribuciÃ³n agentic-first + confidencialidad industrial

**Estado:** ÃšNICA FUENTE DE VERDAD del arranque monetizable  
**Fecha:** 2026-08-22 Â· **v4** (aÃ±ade blindaje de ciberseguridad / no-fuga de planos confidenciales)  
**Repos:** `m13` Â· `flowcad` Â· `proy3-qro` / Comp3D  

> Tras aprobar: persistir en `docs/plans/plan-canonico-plataforma.md` + BITACORA + `.phi` + pointer README.  
> Etapa 2 (Desktop-all, Web full, WABA, mÃ³vil nativo) = **solo tras â‰¥3 meses de ingreso mensual** + jefe de desarrollo.

---

## 0) Orden de lanzamiento (Gato)

```text
AHORA
1. MCP servers
2. ChatGPT Apps          â† UI embebida en chat / app agentic nativa
3. Portales de config    â† solo lo que no cabe en conversaciÃ³n
4. Landings web
5. FlowCAD desktop sigue + MCP + ChatGPT App

Luego (â‰¥3 meses ingreso mensual recurrente)
â†’ Contratar + jefe de desarrollo
â†’ Desktop all Â· Web apps Â· WABA Â· mÃ³viles nativas
```

**Principio de producto:** cobrar dentro del flujo conversacional; portales = config/admin.  
**Principio de seguridad (nuevo, no negociable para marcas grandes):**  
*mÃ­nima retenciÃ³n Â· cifrado Â· aislamiento por tenant Â· cero entrenamiento con datos del cliente Â· rastro auditable sin filtrar el secreto.*

---

## 1) Veredicto suite (inchangable en fÃ­sica)

| Producto | NÃºcleo | Canal AHORA | No mezclar |
|---|---|---|---|
| **m13** | Entrega espacial `.m13` local-first | MCP + ChatGPT App + landing + portal config | No es visor mesh CAD |
| **FlowCAD** | Kernel CAD + desktop | Desktop + MCP + ChatGPT App | Three.js para malla; m13 solo preview espacial |
| **Comp3D** | Compress + weight reduction | MCP + ChatGPT App + landing | Viewer mesh propio |

---

## 2) Blindaje de ciberseguridad y confidencialidad (CANON)

### 2.1 Realidad honesta (para no vernos â€œalucinadosâ€)
Nada en internet es **literalmente inhackeable**. Lo que sÃ­ ofrecemos a marcas grandes es un **diseÃ±o de amenaza industrial** con controles verificables: reducir superficie, reducir retenciÃ³n, cifrar, aislar, auditar, y poder demostrar *quÃ© pasÃ³* sin filtrar el plano.

Promesa de marketing permitida: **â€œconfidencialidad por diseÃ±o / zero-retention opcional / tenant isolationâ€**.  
Promesa **prohibida:** â€œinhackeable al 100%â€.

### 2.2 ClasificaciÃ³n de datos (todo flujo MCP/App/portal)

| Clase | Ejemplos | Regla |
|---|---|---|
| **S0 PÃºblico** | Landings, demos, escenas showcase | OK CDN |
| **S1 Interno** | Templates genÃ©ricos EHS | Auth bÃ¡sica |
| **S2 Confidencial cliente** | Layouts de planta, `.m13` de inducciÃ³n con geometrÃ­a real, BOM | Cifrado + tenant + ACL |
| **S3 Secreto industrial** | STEP/STL/planos de marca, tolerancias, moldes, CAD fuente Comp3D/FlowCAD | **MÃ¡ximo control** (Â§2.4â€“2.6) |

Planos de â€œgrandes marcasâ€ = **S3** por defecto hasta que el contrato diga lo contrario.

### 2.3 Modelo de amenazas (lo que cuidamos)

1. Fuga por **share link** demasiado permisivo (`#scene=` en URL = cualquiera con el link).  
2. Fuga por **logs/LLM**: prompt con plano adjunto termina en proveedor de modelo.  
3. Fuga por **MCP mal configurado** (stdio en laptop â†’ cloud sync, historial chat).  
4. Fuga por **storage** (S3/R2 sin cifrado o bucket pÃºblico).  
5. Fuga por **empleado interno** / soporte.  
6. Ransomware / robo de laptop con jobs locales.  
7. Tenant confusion (cliente A ve jobs de B).

### 2.4 Controles obligatorios en ESTA fase (antes de cobrar S2/S3)

| Control | DÃ³nde | Nota |
|---|---|---|
| **Tenant isolation** | Portal + API + object keys | `org_id` en cada objeto; queries siempre filtradas |
| **Cifrado en trÃ¡nsito** | TLS 1.2+ everywhere | Apps/MCP remote solo HTTPS |
| **Cifrado en reposo** | Storage de jobs/planos | SSE-KMS o equival.; keys por tenant si enterprise |
| **Zero-retention mode** | Comp3D/FlowCAD jobs S3 | Procesar â†’ devolver resultado â†’ **borrar fuente** en TTL corto (p.ej. 1hâ€“24h configurable) |
| **No-train / no-log payloads** | Contratos LLM + config | Prohibido usar archivos S3 como training; logs solo metadatos (hash, tamaÃ±o, timestamps) |
| **LLM editor-time sin subir S3** | m13 / FlowCAD chat | Preferir: el modelo **no recibe** el binario STEP; recibe IDs/params; o cliente trae su key + modo local |
| **Share links confidenciales** | m13 | Para S2/S3: **no** poner YAML completo en `#scene=` pÃºblico. Usar link firmado de un solo uso / auth / expira; o cifrar payload con key que no viaja en clear |
| **Firmas y hash** | Evidence EHS + exports | Hash de escena/archivo para integridad; no sustituye ACL |
| **Audit trail** | Portal | QuiÃ©n publicÃ³ / quiÃ©n abriÃ³ / quiÃ©n descargÃ³ â€” **sin** guardar el plano en el log |
| **Secrets** | CI/CD | No keys en repo; rotaciÃ³n; least privilege |
| **Dependency/supply chain** | CI | `pnpm audit` / locks; ya hay hÃ¡bito en m13 |
| **Threat model doc** | `docs/security/` | Un DOC por producto + checklist pre-piloto marca |

### 2.5 Modos de despliegue para marcas grandes (oferta enterprise)

Orden de preferencia segÃºn paranoia del cliente:

1. **Local-first / on-prem edge** â€” motor m13 y, si aplica, jobs FlowCAD/Comp3D en red del cliente; nosotros no guardamos S3.  
2. **Dedicated tenant + region** â€” cloud nuestro pero cuenta/KMS aislada, zero-retention ON, DPA firmado.  
3. **Shared multi-tenant** â€” solo S0â€“S1 o clientes que acepten riesgo; **no** default para marcas.

ChatGPT App / MCP en cloud de OpenAI: **superficie extra**. Para S3:
- El App puede orquestar, pero el **binario no debe subirse al hilo** si el cliente lo prohÃ­be.
- PatrÃ³n: chat pide job â†’ portal/desktop procesa en tenant privado â†’ chat solo recibe â€œjob listo + link authâ€.
- Documentar en el pitch: *ChatGPT es canal de UX; el vault del plano no vive en OpenAI.*

### 2.6 m13 especÃ­fico (share + local-first = ventaja)

- Fortaleza real: **render local** â†’ menos necesidad de hospedar el mundo en nuestros servers.  
- Riesgo real: `#scene=` base64 en URL se filtra por historial, analytics, screenshots.  
- Canon v1 confidencial:  
  - `publish_private(scene) â†’ https://portalâ€¦/p/{id}?token=` (token corto, revocable),  
  - player descarga YAML cifrado o por sesiÃ³n auth,  
  - opciÃ³n **airgap**: entregar `.m13` + player offline PWA sin nube.  
- Evidence EHS: guardar **hash + checklist results**, no necesariamente el plano completo.

### 2.7 FlowCAD / Comp3D especÃ­fico

- Cadena S3: upload â†’ process â†’ download â†’ **secure delete** fuente y derivados no contratados.  
- Watermarking / forensic ID en exports opcionales (etapa enterprise).  
- Desktop FlowCAD: cifrado de project dir, lock screen, no telemetrÃ­a de geometrÃ­a.  
- Comp3D API: auth por org, rate limit, virus scan de uploads, max size, quarantine.

### 2.8 Compliance / contratos (comercial + legal, paralelo a D1)

- DPA + NDA + clÃ¡usula **no entrenamiento de modelos**.  
- Lista de subprocesadores (hosting, LLM).  
- Derecho a auditorÃ­a / borrado (â€œright to erasureâ€ operativo = wipe job + keys).  
- ClasificaciÃ³n en el one-pager enterprise: â€œModo confidencialâ€.  
- Bug bounty interno ligero post-ingreso (etapa 2).

### 2.9 Definition of Done de seguridad (gate antes de piloto marca)

- [ ] Threat model escrito y revisado.  
- [ ] Zero-retention demostrable en un job de prueba (logs sin payload).  
- [ ] Share privado m13 (no YAML clear en URL) para plantilla confidencial.  
- [ ] Tenant isolation test (A no lee a B).  
- [ ] Secrets scan limpio en CI.  
- [ ] DPA/NDA template listo.  

Sin este gate: **solo demos S0/S1**, no planos de marcas.

---

## 3) Frontends de esta fase (con seguridad)

| ID | Superficie | Rol | Seguridad |
|---|---|---|---|
| A1 MCP | Tools | Productividad agente | Auth, no log bodies S3, scopes |
| A2 ChatGPT App | UI embebida | DistribuciÃ³n | No subir S3 al modelo; vault fuera |
| A3 Portal config | Web mÃ­nima | ACL, keys, retention TTL, audit | |
| A4 Landing | PÃºblico | Cero datos cliente | |
| A5 FlowCAD desktop | CAD | Proyecto local cifrado / sync opt-in | |
| A6 Player | Destino CTA | Auth/token para S2/S3 | |

---

## 4) Cronograma (D0â€“D4) + seguridad embebida

### D0 Canon
Persistir este plan v4 en git.

### D1 Capa conversacional + **security skeleton**
- Domain API + adaptadores MCP/ChatGPT.  
- Esqueleto tenant, TLS, secret management, retention TTL flags.  
- Threat model v1 en `docs/security/`.

### D2 m13 productivo
- Templates + publish **privado** + player auth.  
- Portal config.  
- Landings.  
- Gate Â§2.9 para pasar de demo a piloto confidencial.

### D3 FlowCAD MCP/App
- Desktop no se frena.  
- Tools sin filtrar geometrÃ­a a LLM.  
- Deep-link desktop.

### D4 Comp3D packaging
- Zero-retention default ON para uploads demoâ†’prod.  
- Widgets ROI sin exponer archivo fuente.

### Gate ingreso â†’ 3 meses â†’ Etapa 2
Incluye hardening enterprise (KMS por cliente, on-prem, pen-test externo) bajo jefe de desarrollo.

---

## 5) CRM / LMS

Sin cambio: externos. Eventos de audit/completion **sin** adjuntar planos en el CRM.

---

## 6) Criterio â€œfase terminadaâ€

AdemÃ¡s de MCP/App/portal/landing/cobro:

- [ ] Modo confidencial documentado y demoable.  
- [ ] Zero-retention + share privado + isolation A/B.  
- [ ] Lenguaje pÃºblico sin claim â€œinhackeableâ€; sÃ­ â€œdiseÃ±ado para no fuga / mÃ­nima retenciÃ³nâ€.

---

## 7) Persistencia al aprobar

1. `docs/plans/plan-canonico-plataforma.md` â† este documento.  
2. `docs/security/threat-model-v1.md` (skeleton en el mismo commit o inmediato D1).  
3. README pointer + BITACORA 036 + seal `.phi`.  
4. Commit + push `m13`.  
5. Pointer en flowcad / proy3-qro cuando se toquen esos repos.

---

## 8) ConfirmaciÃ³n

Â¿Aprobamos **v4** (agentic-first **+** blindaje confidencial industrial honesto) como canon Ãºnico y al aprobar persistimos D0 en GitHub?

