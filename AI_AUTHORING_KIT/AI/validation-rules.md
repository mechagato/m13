# Validation rules

| Code | Level | Rule |
|---|---|---|
| yaml_invalid | error | YAML does not parse |
| unsupported_version | error | version not in 0.1/0.2/0.3 |
| schema | error | type / required / min |
| duplicate_id | error | ids collide (objects, npc, missions, zones) |
| unknown_concept | error | concept not in catalog |
| unknown_geo | error | kind concept with unknown geo id |
| unknown_material | error | material not in catalog |
| broken_ref | error | mission/npc points to missing id |
| cycle | error | mission next forms a loop |
| zone_size | error | box zone missing size |
| zone_radius | error | sphere zone missing radius |
| events_need_v02 | error | events on v0.1 |
| unknown_root | warning | extra top-level key |
| orphan_trigger | warning | event target never fired by a mission |
| spawn_buried | warning | spawn y < -bounds.y |
| overcrowded | warning | > 80 objects |

Semantic: infinite cycles, impossible events (quiz without quizzes[]), orphan triggers.
