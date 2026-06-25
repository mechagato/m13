---
name: glosario
description: Términos del dominio de m13.
metadata: {type: reference}
---

# Glosario — m13

- **`.m13`** — archivo de escena: YAML semántico que describe un mundo 3D (no malla pesada).
- **SDF (signed distance field) + raymarching** — cómo se renderiza la geometría continua en WebGPU.
- **synth** — el sintetizador que convierte `.m13` → escena renderizable.
- **concepto material** — material procedural (sin texturas pesadas).
- **`@m13/mcp`** — server MCP: un LLM genera `.m13` validado y devuelve un link caminable (editor-time).
- **share link `#scene=`** — la URL ES el mundo; la escena viaja en el hash, sin backend.
- **runtime local-first** — el renderer corre 100% en el cliente (WebGPU), nunca llama a la nube.
- **WebXR / Quest 3** — destino de realidad mixta.
- **motor13.neonodos.com / motor13.pages.dev** — demo público.
