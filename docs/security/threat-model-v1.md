# Threat model v1 — m13 (suite-aware)

**Status:** skeleton · **Canon:** `docs/plans/plan-canonico-plataforma.md` §2  
**Date:** 2026-08-22 · **Scope:** m13 runtime + MCP + future ChatGPT App + config portal  
**Related products:** FlowCAD (mesh/CAD vault), Comp3D (upload jobs) — their binaries are **S3** and must not land in LLM logs.

## 1. Assets

| Asset | Class | Notes |
|---|---|---|
| Public showcase `.m13` | S0 | CDN OK |
| Generic EHS templates | S1 | Auth optional |
| Customer plant layouts / induction scenes | S2 | Tenant + encryption |
| Brand CAD (STEP/STL) via siblings | S3 | Never default to `#scene=` cleartext; prefer vault outside ChatGPT |

## 2. Trust boundaries

- Browser player (local WebGPU render) — **trusted for rendering**, not for ACL alone.
- MCP host (Claude/Cursor/ChatGPT) — **untrusted for S3 payloads**.
- OpenAI / LLM provider — **must not receive S3 binaries**.
- Our portal/API/storage — trusted only within tenant + KMS controls.
- Share URLs — **hostile if leaked** (treat as bearer tokens).

## 3. Top threats

1. Cleartext `#scene=` YAML leakage (history, screenshots, proxies).
2. LLM prompt/logging exfiltration of geometry or BOM.
3. Cross-tenant read (IDOR).
4. Public bucket / misconfigured CORS.
5. Insider support access without audit.
6. Dependency compromise (npm supply chain).

## 4. Controls (phase gate — see canon §2.9)

- [x] Private share mode in MCP (`classification` S2/S3 → `private_local`, hash only; no `#scene=` cleartext) — D1
- [x] Portal tokenized publish URL (`@m13/gateway` `POST /v1/publish` → `?p=&token=`) — D2
- [x] Retention TTL enforced in vault (S2=24h, S3=1h defaults) — D2
- [x] Org scene list metadata-only (no YAML) — D2
- [ ] Metadata-only request logs on production HTTPS deploy
- [ ] Tenant-scoped queries + automated A≠B test (multi-tenant hardening)
- [ ] TLS termination in production; secrets not in git
- [ ] DPA/NDA + no-train clause before brand pilots

## 5. Explicit non-claims

We do **not** claim “unhackable”. We claim **confidentiality-by-design**: minimize retention, isolate tenants, keep vaults out of chat providers, and leave an audit trail that does not itself leak secrets.

## 6. Next revision

Fill attack trees per surface (MCP, App, portal, player) when D1 security skeleton lands.
