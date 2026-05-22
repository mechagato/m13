/**
 * Escena inicial que carga el editor al primer mount.
 *
 * Es un YAML mínimo válido — el usuario puede editarlo en vivo o
 * pedirle al LLM editor-time (Fase 1.5+) que la modifique.
 */
export const INITIAL_SCENE = `version: "0.1"
name: mi_escena
description: "Editable en vivo — modifica y mira el cambio al instante."

bounds: [5, 3, 5]
spawn: [0, 0, -3.5]

ambient:
  ambientColor: [0.18, 0.19, 0.21]
  tint: [0.98, 1.0, 1.02]
  fogColor: [0.06, 0.065, 0.07]
  fogDensity: 0.010

light:
  position: [0, 2.8, 0]
  color: [1.0, 0.96, 0.90]
  intensity: 1.3

walls:
  concept: pared_yeso_blanco

floor:
  concept: piso_marmol_blanco
  params:
    veinIntensity: 0.3

ceiling:
  concept: pared_yeso_blanco

objects:
  - id: pedestal
    kind: concept
    concept: pedestal_marmol
    position: [0, -2.5, 0]
    scale: [0.4, 0.4, 0.4]

  - id: esfera
    kind: sphere
    position: [0, -1.5, 0]
    scale: 0.4
    material: metal_dorado_pulido
    audio_reactive: true
    animate:
      mode: bob
      speed: 0.6
      amplitude: 0.1
`;
