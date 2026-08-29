# API reference (authoring)

There is no programmatic SDK in this kit. The “API” is the YAML document.

Load order for a runtime:
1. parse YAML
2. validate schema
3. resolve concepts
4. spawn player
5. register zones, npc, missions
6. present HUD if `ui.hud == education`

See field tables in `SPECIFICATION/m13-specification.md`.
