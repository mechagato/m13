# How to generate worlds, NPC, missions, dialogs

## Worlds
1. Classify interior vs exterior
2. Pick 1 wall, 1 floor, 1 ceiling (or sky)
3. Place 5–20 objects with unique ids
4. Light position above the focal piece
5. Spawn looking toward the focal piece (negative Z)

## NPC
- One teacher/guide near spawn
- `dialog` 3–5 short lines, imperative
- `role: teacher` for lessons, `guide` for museums
- `position` on the floor plane (`y ≈ -bounds.y`)

## Missions
Sequence: talk → explore zone → interact object → optional quiz  
Always set `next` except on the last. `rewards.xp` 40–140.

## Dialogs
Spanish unless the user asks otherwise. No emoji. No slang walls of text.

## Reuse
Copy `EXAMPLES/03-museo.m13` for white-cube, `04-sistema-solar.m13` for STEM exterior, `05-historia-mexico.m13` for prehispanic, `11-gemelo-digital.m13` for NeoNodos brand.
