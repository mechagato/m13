/**
 * Build a semantic street .m13 from a GPS path + optional OSM extract.
 * Authoring-time only — runtime stays local WebGPU.
 */

import { parseScene, compileScene } from '@m13/runtime';
import {
  bboxOf,
  makeLocalFrame,
  pathLengthMeters,
  pathToLocal,
  type LatLng,
} from './coords.js';
import {
  densifyPath,
  footprintLocalAabb,
  type OsmExtract,
} from './osm.js';

export interface BuildGeoTwinOptions {
  name?: string;
  /** Max building boxes (SDF budget). Default 60. */
  maxBuildings?: number;
  /** Road half-width meters. Default 4. */
  roadHalfWidth?: number;
  /** Default building height if OSM has no levels/height. */
  defaultBuildingHeightM?: number;
  /** Include synthetic roadside blocks when OSM has few buildings. */
  padSynthetic?: boolean;
}

export interface GeoTwinResult {
  yaml: string;
  stats: {
    name: string;
    pathPoints: number;
    pathLengthM: number;
    buildings: number;
    roadSegments: number;
    bounds: [number, number, number];
  };
}

function yamlEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildingHeight(b: { levels?: number; heightM?: number }, fallback: number): number {
  if (b.heightM && b.heightM > 1) return Math.min(60, b.heightM);
  if (b.levels && b.levels > 0) return Math.min(60, b.levels * 3);
  return fallback;
}

export function buildGeoTwinM13(
  path: LatLng[],
  osm: OsmExtract | null,
  opts: BuildGeoTwinOptions = {},
): GeoTwinResult {
  if (path.length < 2) {
    throw new Error('Se necesitan al menos 2 puntos GPS (lat/lng)');
  }

  const maxBuildings = opts.maxBuildings ?? 60;
  const roadHalf = opts.roadHalfWidth ?? 4;
  const defaultH = opts.defaultBuildingHeightM ?? 9;
  const name = opts.name ?? 'geo_twin_paseo';

  const frame = makeLocalFrame(path[0]!);
  const localPath = pathToLocal(frame, path);
  const dense = densifyPath(localPath, 10);
  const bb = bboxOf(localPath);
  const pad = 40;
  const spanX = Math.max(40, bb.maxX - bb.minX + pad * 2);
  const spanZ = Math.max(40, bb.maxZ - bb.minZ + pad * 2);
  const boundsY = 40;
  // Center the twin so spawn sits near origin
  const offX = -((bb.minX + bb.maxX) / 2);
  const offZ = -((bb.minZ + bb.maxZ) / 2);

  const objects: string[] = [];
  let roadSegments = 0;

  // Road segments as flat boxes
  for (let i = 1; i < dense.length; i += 1) {
    const a = dense[i - 1]!;
    const b = dense[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) continue;
    const cx = (a.x + b.x) / 2 + offX;
    const cz = (a.z + b.z) / 2 + offZ;
    // approximate orientation with scale stretch along dominant axis
    const alongX = Math.abs(dx) >= Math.abs(dz);
    const sx = alongX ? Math.max(len, 2) : roadHalf * 2;
    const sz = alongX ? roadHalf * 2 : Math.max(len, 2);
    objects.push(`  - id: road_${roadSegments}
    kind: box
    position: [${cx.toFixed(2)}, -1.35, ${cz.toFixed(2)}]
    scale: [${sx.toFixed(2)}, 0.12, ${sz.toFixed(2)}]
    material:
      concept: piso_concreto_industrial`);
    roadSegments += 1;
    if (roadSegments >= 120) break;
  }

  // Buildings from OSM
  let buildingCount = 0;
  const buildings = osm?.buildings ?? [];
  // Prefer buildings closer to path
  const ranked = buildings
    .map((b) => {
      const aabb = footprintLocalAabb(frame, b.ring);
      if (!aabb) return null;
      let minDist = Infinity;
      for (const p of localPath) {
        const d = Math.hypot(p.x - aabb.cx, p.z - aabb.cz);
        minDist = Math.min(minDist, d);
      }
      return { b, aabb, minDist };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, c) => a.minDist - c.minDist);

  for (const item of ranked) {
    if (buildingCount >= maxBuildings) break;
    if (item.minDist > 120) continue;
    const h = buildingHeight(item.b, defaultH);
    const cx = item.aabb.cx + offX;
    const cz = item.aabb.cz + offZ;
    const sy = h / 2;
    objects.push(`  - id: bld_${buildingCount}
    kind: round_box
    position: [${cx.toFixed(2)}, ${(-1.4 + sy).toFixed(2)}, ${cz.toFixed(2)}]
    scale: [${(item.aabb.sx / 2).toFixed(2)}, ${sy.toFixed(2)}, ${(item.aabb.sz / 2).toFixed(2)}]
    material:
      concept: pared_concreto_pulido
      params:
        darkness: 0.45
        roughness: 0.4`);
    buildingCount += 1;
  }

  // Synthetic pads if OSM empty / sparse
  if ((opts.padSynthetic ?? true) && buildingCount < 8) {
    for (let i = 0; i < dense.length; i += 6) {
      if (buildingCount >= Math.min(maxBuildings, 24)) break;
      const p = dense[i]!;
      const side = i % 2 === 0 ? 1 : -1;
      const hx = 4 + (i % 3);
      const hz = 6 + (i % 4);
      const h = 8 + (i % 5);
      const cx = p.x + offX + side * (roadHalf + hx + 2);
      const cz = p.z + offZ;
      objects.push(`  - id: syn_${buildingCount}
    kind: box
    position: [${cx.toFixed(2)}, ${(-1.4 + h / 2).toFixed(2)}, ${cz.toFixed(2)}]
    scale: [${hx.toFixed(2)}, ${(h / 2).toFixed(2)}, ${hz.toFixed(2)}]
    material:
      concept: pared_ladrillo_viejo`);
      buildingCount += 1;
    }
  }

  // Path markers (waypoints)
  for (let i = 0; i < localPath.length; i += Math.max(1, Math.floor(localPath.length / 8))) {
    const p = localPath[i]!;
    objects.push(`  - id: wp_${i}
    kind: cylinder
    position: [${(p.x + offX).toFixed(2)}, -1.25, ${(p.z + offZ).toFixed(2)}]
    scale: [0.35, 0.2, 0.35]
    material:
      concept: metal_dorado_pulido`);
  }

  const spawn = localPath[0]!;
  const next = localPath[Math.min(1, localPath.length - 1)]!;
  // FlyCamera uses spawn position; facing is free-look — place slightly behind start
  const spawnX = spawn.x + offX;
  const spawnZ = spawn.z + offZ - 0.01;
  void next;

  const yaml = `version: "0.1"
name: ${name}
description: "${yamlEscape(`Gemelo semántico GPS→OSM→m13. Path ${pathLengthMeters(path).toFixed(0)} m · ${buildingCount} edificios. No fotorealismo — cuadras sintéticas.`)}"

bounds: [${spanX.toFixed(1)}, ${boundsY}, ${spanZ.toFixed(1)}]
spawn: [${spawnX.toFixed(2)}, 0.5, ${spawnZ.toFixed(2)}]
cameraSpeed: 8

sky:
  horizon: [0.85, 0.78, 0.65]
  zenith: [0.28, 0.48, 0.82]

ambient:
  background: [0.55, 0.72, 0.92]
  ambientColor: [0.35, 0.38, 0.42]
  tint: [1.0, 0.98, 0.95]
  fogColor: [0.65, 0.75, 0.88]
  fogDensity: 0.006

light:
  position: [20, 35, -10]
  color: [1.0, 0.96, 0.9]
  intensity: 1.55

floor:
  concept: piso_concreto_industrial

objects:
${objects.join('\n')}
`;

  // Validate against runtime schema + compile
  const scene = parseScene(yaml, { silent: true });
  compileScene(scene);

  return {
    yaml,
    stats: {
      name: scene.name,
      pathPoints: path.length,
      pathLengthM: pathLengthMeters(path),
      buildings: buildingCount,
      roadSegments,
      bounds: [spanX, boundsY, spanZ],
    },
  };
}

export function buildGeoTwinFromPathOnly(path: LatLng[], opts?: BuildGeoTwinOptions): GeoTwinResult {
  return buildGeoTwinM13(path, null, { ...opts, padSynthetic: true });
}
