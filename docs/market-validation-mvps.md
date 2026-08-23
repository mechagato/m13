# Validacion de mercado para MVPs M13

Fecha: 2026-07-27

## Objetivo

Elegir un MVP con una conversacion de compra real, no solo con factibilidad tecnica.
No se iniciara Fase 6 ni un bridge M13 a Roblox hasta contar con evidencia de al menos un
segmento que pueda describir su problema, presupuesto, proceso de compra y piloto.

## Segmentos a validar

| Segmento | Problema a comprobar | Propuesta M13 | Comprador inicial |
|---|---|---|---|
| Turismo comunitario Riviera Maya | La oferta local tiene baja visibilidad y conversion directa fuera del corredor hotelero | Preview espacial movil de una experiencia, reserva directa y pasaporte de aliados | Cooperativa, operador local u hotel con concierge |
| Industria | Capacitar en seguridad y cambios de layout cuesta tiempo y no deja evidencia del escenario aprobado | Simulador web de planta/almacen con recorridos, riesgos y evaluacion | Responsable EHS, operaciones o capacitacion |
| Educacion clinica | La simulacion de flujos fisicos depende de infraestructura y no se puede practicar entre sesiones | Escenarios web para induccion, roles, checklist y debriefing | Direccion de simulacion de universidad u hospital escuela |

## Conversaciones requeridas

Hacer tres entrevistas de 30 minutos, una por segmento. No vender primero; validar el flujo actual.

1. "Cuentame la ultima vez que necesitaste mostrar, capacitar o vender una experiencia espacial."
2. "Que herramientas usaste, cuanto tomo y que salio mal?"
3. "Quien aprueba el contenido y quien tiene presupuesto?"
4. "Que dato demostraria que la solucion funciono en 30 dias?"
5. "Si un piloto resolviera esto, que tendria que incluir y que no podriamos tocar?"
6. "Aceptarias aportar una ubicacion, escenario o experiencia real para un piloto?"

## Experimentos minimos

### Turismo

Crear un preview bilingue de 90 segundos para una sola experiencia autorizada. Medir visualizaciones,
finalizacion, clic a contacto/reserva y valor de reservas atribuidas. El anfitrion controla historia,
imagenes, capacidad y precio.

### Industria

Modelar un solo pasillo o proceso con tres riesgos y un checklist. Comparar tiempo para completar
induccion y errores en un ejercicio supervisado. No afirmar cumplimiento normativo solo por usar el simulador.

**P0 comercial (2026-08-22):** oferta y precios en
`docs/commercial/onepager-industria-ehs.md`.

### Educacion clinica

Modelar una ruta de induccion o flujo de roles sin datos de pacientes ni recomendacion clinica. Medir
comprension previa/posterior y utilidad reportada por instructores. No analizar imagenes medicas, diagnosticar
ni recomendar tratamientos.

## Senales de decision

Continuar un vertical solo si al menos dos conversaciones confirman problema repetido, comprador definido,
piloto con contenido real y una metrica economica u operativa medible.

- Turismo: al menos 10% de previews termina en contacto o reserva atribuible.
- Industria: el responsable acepta un piloto con sitio real y define una metrica de seguridad/capacitacion.
- Educacion clinica: un centro de simulacion aporta instructor y protocolo educativo para validar.

Detener o replantear si el interlocutor solo pide una demo de marketing, no controla presupuesto o no puede
aportar contenido autorizado.

## Orden recomendado

1. Turismo comunitario: prueba rapida de conversion y derrama local.
2. Industria: contrato B2B de mayor valor si existe sponsor EHS/operaciones.
3. Educacion clinica: solo como entrenamiento/educacion; evaluar regulacion antes de cualquier funcion clinica.

## Limites de producto

- La aprobacion y version/hash de M13 son obligatorias antes de publicar una experiencia.
- No almacenar datos clinicos personales en el MVP.
- No publicar imagenes, ubicaciones sensibles ni narrativa cultural sin permiso explicito del anfitrion.
- Roblox es canal opcional de descubrimiento o juego; no es dependencia para validar los MVPs web.
