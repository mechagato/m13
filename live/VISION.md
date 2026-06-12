# m13 Live — performance audiovisual reactivo (Sonido 13 en vivo)

**Subproyecto de m13 · aprobado por Gato 2026-06-11 · estado: VISIÓN (pre-spec)**
**Regla de scope:** no compite con la Fase 2 de m13. Se implementa post-Fase 2 o como
demo complementario de Innovafest si Gato lo ordena explícitamente.

## La tesis

m13 ya sintetiza mundos desde recetas de texto y ya reacciona a audio (audioAmp en cada
material). m13 Live lo lleva al escenario: pantalla panorámica donde los visuales son
instrumentos más de la banda. Todo local, cero nube, cero LLM en runtime (constitution m13).

## Los 3 módulos

### 1. cue-engine — escenas .m13 por MIDI/timecode
- Cue list: lista ordenada de escenas .m13 pre-diseñadas (el "setlist visual")
- Web MIDI API: nota/CC del teclado, pedalera o secuenciador dispara el cambio de cue
- Timecode: sincronía con el DAW vía MIDI clock para shows programados
- El shader cache del M13Engine hace el switch casi instantáneo (ya medido: re-load con
  hash idéntico = 0 recompilación)
- Crossfades: transición entre escenas (requiere render a 2 targets + mix — diseño pendiente)

### 2. crowd-mirror — el público esculpido en la escena
- Captura: Kinect (vía bridge libfreenect2→WebSocket) o cámara + MediaPipe segmentation
- El depth/pose del público se convierte en SDFs vivos dentro de la escena:
  metaballs por persona (opSmoothUnion ya existe en el motor), siluetas extruidas,
  o campo de alturas — "el público se ve a sí mismo modelado en el mundo m13, editado raro"
- Reto técnico real: inyectar SDFs dinámicos al map() (hoy el WGSL se compila por escena;
  se necesita un buffer de primitivas dinámicas — candidato a uniform/storage buffer)

### 3. gesture-trigger — gestos del performer disparan efectos
- Cámara frente a la cantante; MediaPipe pose (local, ya en stack NeoNodos) reconoce
  gestos PRE-CONFIGURADOS (brazo arriba, giro, mano al frente...)
- Cada gesto mapea a: efecto visual (parámetro de material/luz), cambio de cue,
  o disparo de sampler de audio (WebAudio buffer player)
- Configurador: UI para grabar/asignar gestos antes del show (editor-time)

## Dependencias de m13 core (lo que Fase 2 le regala a Live)
- FFT audio→visual (prioridad 4 de Fase 2): graves/agudos/nota → parámetros de escena
- Seeds por instancia: variación visual por persona del público
- Uniforms de calidad (candidatos documentados en raymarch.ts): bajar calidad para
  panorámicas 4K+ en GPUs medias

## Mercado
VJs, festivales, teatro, iglesias, corporativos con experiencias. Venta como servicio
(NeoNodos opera el show) o licencia de la herramienta.

## Próximo paso (cuando Gato lo ordene)
Spec Kit formal: spec → plan → tasks. Primer milestone sugerido: cue-engine solo
(MIDI → switch de escenas) — es 90% plomería sobre lo que ya existe y ya es demo-able.
