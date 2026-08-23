# @m13/geo-twin — Camino A

**GPS path → OpenStreetMap footprints → semantic `.m13` street twin.**

Fast ship for immersive street walks with m13 identity (WebGPU / VR / share link).  
**Not** photoreal street cloning.

## UI

```bash
pnpm playground
# open http://127.0.0.1:8790/geo
```

1. Record GPS (or paste path / use demo MTY)
2. Generate with OSM (or synthetic pads if OSM fails)
3. Open in local player (`pnpm dev` on :5173) or copy public share URL

## Library

```ts
import { buildGeoTwinFromPathOnly, buildGeoTwinM13 } from '@m13/geo-twin';
```

## Honest limits

- Axis-aligned building boxes from OSM footprints
- SDF budget capped (~60 buildings)
- Feels like “the same zone”, not Street View
