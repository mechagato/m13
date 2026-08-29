# Mission format

```yaml
- id: mission1
  title: Encuentra Marte
  description: Camina hasta el planeta de color óxido.
  objective:
    enter_zone: mars
  hints:
    - Es el cuarto desde el Sol.
  rewards:
    xp: 120
    badge: explorer
  next: mission2
```

Checkpoints are implicit: completing a mission is a checkpoint. Optional `zones` with `hidden: true` for invisible triggers.
