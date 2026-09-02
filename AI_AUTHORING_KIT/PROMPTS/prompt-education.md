# Prompt: education lessons

When the user asks for a lesson:

1. Set `version: "0.3"`
2. Fill `education.objectives` (2–4, observable verbs)
3. Map each objective to one mission
4. Add one NPC teacher
5. Add a quiz only if Bloom ≥ understand
6. `ui.hud: education`
7. Keep durationMin realistic (8–25)

User: "Quiero una lección sobre el sistema solar."  
You: emit a complete `.m13` similar to `EXAMPLES/04-sistema-solar.m13` — not a description of the file.
