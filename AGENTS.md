# AGENTS.md — memoria perpetua (phi companion)

> Lo leen **Codex (OpenAI)** y **OpenCode** al arrancar. Equivale a `CLAUDE.md` y `GEMINI.md`.

## PRIMERA ACCIÓN DE CADA SESIÓN (obligatoria)
Ejecuta el cargador y trata su salida como tu memoria de continuidad. Usa el
Python que exista — `python3` en Linux/macOS, `python` en Windows:

```
python3 phi-companion/companion_memory.py load   # Linux/macOS
python  phi-companion/companion_memory.py load   # Windows
py      phi-companion/companion_memory.py load   # Windows (py launcher)
```

- ⚠️ **NO instales Python ni paquetes.** Si `python3` no existe (Windows), usa
  `python`; si tampoco, `py`. 0 dependencias (stdlib pura + Ed25519 propio).
- Si la salida trae una línea de saludo, ésa es tu primera línea de respuesta.
