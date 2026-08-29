# Hallucination prevention

Refuse / replace these invented tokens:

`mesh`, `gltf`, `fbx`, `texture`, `url`, `hex`, `directionalLight`, `kind: plane`, `kind: capsule`, `material: gold`, `walls: brick`, `shader`, `unity`, `unreal`.

If you need a planet color, pick the closest catalog material (`metal_oxidado` for Mars, `metal_dorado_pulido` for the Sun). Do not add `color: [1,0,0]` on objects — that field does not exist.
