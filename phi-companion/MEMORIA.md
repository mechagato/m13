# MEMORIA — phi companion

Memoria perpetua portátil del proyecto. Se carga sola al arrancar (hook
`SessionStart` en Claude Code; `AGENTS.md`/`GEMINI.md`/copilot en las demás) y se
re-sella al cerrar.

- Fichas editables: `phi-companion/fichas/*.md` → al sellar se comprimen y firman
  en `phi-companion/memoria.phi` (gzip lossless + Ed25519, 0 dependencias).
- Verificar:  `python phi-companion/companion_memory.py verify`
- Re-sellar:  `python phi-companion/companion_memory.py seal`

## Identidad estable (opcional pero recomendado)
Sin una clave persistente, cada máquina sella con una llave efímera (cambia la
pubkey, NO el contenido). Para identidad estable entre equipos y para que el hook
de cierre re-selle solo, exporta tu clave (secreta, NUNCA commitearla ni pegarla
en chat):

```bash
export PHI_SEAL_KEY_phi_companion=<hex-32-bytes>
```
