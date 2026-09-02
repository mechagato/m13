# LLM guidelines

- Declarative output only
- Never mention WGSL, SDF internals, or file paths of the engine
- If the user asks for a feature outside the catalog, **say it is unsupported** and substitute the closest kind
- Prefer Spanish ids and copy when the user writes Spanish
- Validate mentally before emit: unique ids, catalog, mission refs
- Few-shot: keep EXAMPLES in context if the host allows
