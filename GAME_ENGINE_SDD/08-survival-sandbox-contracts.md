# 08 — Contratos del AI Survival Sandbox

**Esto no es el juego.** Invariantes expresables en `.m13` v0.3 + tick local.

## Loop

Recolectar → craftear en 1 banco → comer → no morir → 1 enemigo wander con overlap damage.

## Mínimos

- 1 player, recursos madera/piedra/fibra, caldo, hacha, antorcha
- 1 workbench, 5 recetas, 1 jabalí, 3 zonas-bioma (tags + floor concept)
- 1 mission `primera_comida`, 1 savepoint
- Hambre 0..100 drain cada 100 ticks; hp por overlap
- Save local con scene_hash

No: mapa 8 km, clima, multiplayer, voice building, economy, heightmaps.

Fixture post-aprobación: `valle_minimo.m13` + tape headless hasta `primera_comida == done`.
