# Security Policy

## Supported versions

The `main` branch of this repository is the supported line for security fixes.

## Runtime threat model (summary)

Full skeleton: [`docs/security/threat-model-v1.md`](./docs/security/threat-model-v1.md) · product canon §2: [`docs/plans/plan-canonico-plataforma.md`](./docs/plans/plan-canonico-plataforma.md).

- **Rendering is local.** Opening a `.m13` scene should not require contacting m13 servers.
- **Shared scenes** (`#scene=` / `#replay=`) are untrusted input and, for confidential (S2/S3) customer data, must not rely on cleartext YAML in the URL — use tokenized/private publish when that path ships.
- **LLM / MCP tools are editor-time.** They must not be wired into the frame loop, and must not receive customer CAD binaries (S3) in prompts/logs.
- We do **not** claim systems are “unhackable”; we design for **minimize retention, tenant isolation, and vault-outside-chat**.

## Reporting a vulnerability

Please email the maintainer privately rather than opening a public issue for exploitable bugs:

- Maintainer: Genaro Isaí García Torres
- Prefer GitHub Security Advisories on this repository when available.

Include: affected package/path, reproduction steps, and impact (e.g. crash, GPU hang, unexpected network call, path traversal in tooling).

We aim to acknowledge reports within a few business days.
