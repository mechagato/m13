# Supported events

v0.2: `kind: light_flash` with `t`, `duration`, `intensity`.

v0.3 triggers: `enter_zone` `exit_zone` `interact` `talk` `mission_completed` `mission_failed` `quiz_passed` `spawn` `timer`.

Actions: `next` `xp` `badge` `dialog` `sound` `fireworks` `teleport` `[x,y,z]` `unlock` `hint`.

Impossible events (rejected by semantic check): trigger target missing, teleport outside 4× bounds, `next` cycle.
