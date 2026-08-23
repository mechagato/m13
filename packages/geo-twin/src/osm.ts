/** OpenStreetMap / Overpass helpers (authoring-time fetch). */

import type { LatLng } from './coords.js';
import { makeLocalFrame, toLocal, type LocalFrame, type Vec2 } from './coords.js';

export interface OsmBuilding {
  id: string;
  /** polygon in lat/lng (closed or open) */
  ring: LatLng[];
  levels?: number;
  heightM?: number;
  name?: string;
}

export interface OsmWay {
  id: string;
  ring: LatLng[];
  highway?: string;
}

export interface OsmExtract {
  buildings: OsmBuilding[];
  highways: OsmWay[];
}

export function bboxFromPath(path: LatLng[], padDeg = 0.0015): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  for (const p of path) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return {
    south: south - padDeg,
    west: west - padDeg,
    north: north + padDeg,
    east: east + padDeg,
  };
}

export function buildOverpassQuery(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): string {
  const bb = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `
[out:json][timeout:25];
(
  way["building"](${bb});
  relation["building"](${bb});
  way["highway"](${bb});
);
out body;
>;
out skel qt;
`.trim();
}

/** Parse Overpass JSON into buildings + highways. */
export function parseOverpassJson(data: unknown): OsmExtract {
  const root = data as {
    elements?: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      nodes?: number[];
      tags?: Record<string, string>;
      members?: Array<{ type: string; ref: number; role: string }>;
    }>;
  };
  const elements = root.elements ?? [];
  const nodes = new Map<number, LatLng>();
  for (const el of elements) {
    if (el.type === 'node' && el.lat != null && el.lon != null) {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }

  const buildings: OsmBuilding[] = [];
  const highways: OsmWay[] = [];

  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes?.length) continue;
    const ring: LatLng[] = [];
    for (const nid of el.nodes) {
      const n = nodes.get(nid);
      if (n) ring.push(n);
    }
    if (ring.length < 2) continue;
    const tags = el.tags ?? {};
    if (tags.building) {
      const levels = tags['building:levels'] ? Number(tags['building:levels']) : undefined;
      const heightM = tags.height ? Number(String(tags.height).replace(/m$/i, '')) : undefined;
      buildings.push({
        id: `w${el.id}`,
        ring,
        levels: Number.isFinite(levels) ? levels : undefined,
        heightM: Number.isFinite(heightM) ? heightM : undefined,
        name: tags.name,
      });
    } else if (tags.highway) {
      highways.push({ id: `w${el.id}`, ring, highway: tags.highway });
    }
  }

  return { buildings, highways };
}

export function footprintLocalAabb(
  frame: LocalFrame,
  ring: LatLng[],
): { cx: number; cz: number; sx: number; sz: number } | null {
  const pts = ring.map((p) => toLocal(frame, p));
  if (pts.length < 2) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const sx = Math.max(2, maxX - minX);
  const sz = Math.max(2, maxZ - minZ);
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, sx, sz };
}

export function densifyPath(local: Vec2[], stepM = 8): Vec2[] {
  if (local.length < 2) return local;
  const out: Vec2[] = [local[0]!];
  for (let i = 1; i < local.length; i += 1) {
    const a = local[i - 1]!;
    const b = local[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.ceil(len / stepM));
    for (let k = 1; k <= n; k += 1) {
      const t = k / n;
      out.push({ x: a.x + dx * t, z: a.z + dz * t });
    }
  }
  return out;
}

export { makeLocalFrame };
