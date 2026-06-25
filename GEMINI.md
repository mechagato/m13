# GEMINI.md — memoria perpetua (phi companion)

> Lo lee **Gemini CLI** al arrancar. Equivale a `CLAUDE.md` y `AGENTS.md`.

## PRIMERA ACCIÓN DE CADA SESIÓN
Ejecuta el cargador (usa `python3` en Linux/macOS o `python` en Windows) y trata
su salida como tu memoria de continuidad:

```
python3 phi-companion/companion_memory.py load   # Linux/macOS
python  phi-companion/companion_memory.py load   # Windows
py      phi-companion/companion_memory.py load   # Windows (py launcher)
```

Sin dependencias externas. NO instales Python; usa el que ya exista.
