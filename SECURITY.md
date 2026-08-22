# Security Policy

## Supported versions

The `main` branch of this repository is the supported line for security fixes.

## Runtime threat model (summary)

- **Rendering is local.** Opening a `.m13` scene should not require contacting m13 servers.
- **Shared scenes** (`#scene=` / `#replay=`) are untrusted input. The runtime validates schema, bounds complexity, and rejects unknown fields on public loads.
- **LLM / MCP tools are editor-time.** They must not be wired into the frame loop.

## Reporting a vulnerability

Please email the maintainer privately rather than opening a public issue for exploitable bugs:

- Maintainer: Genaro Isaí García Torres
- Prefer GitHub Security Advisories on this repository when available.

Include: affected package/path, reproduction steps, and impact (e.g. crash, GPU hang, unexpected network call, path traversal in tooling).

We aim to acknowledge reports within a few business days.
