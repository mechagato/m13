/** WGS84 helpers → local meters (equirectangular, good for city-scale twins). */

export interface LatLng {
  lat: number;
  lng: number;
  /** optional timestamp ms */
  t?: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface LocalFrame {
  origin: LatLng;
  /** meters per degree latitude */
  mPerDegLat: number;
  /** meters per degree longitude at origin lat */
  mPerDegLng: number;
}

const M_PER_DEG_LAT = 111_320;

export function makeLocalFrame(origin: LatLng): LocalFrame {
  const latRad = (origin.lat * Math.PI) / 180;
  return {
    origin,
    mPerDegLat: M_PER_DEG_LAT,
    mPerDegLng: M_PER_DEG_LAT * Math.cos(latRad),
  };
}

export function toLocal(frame: LocalFrame, p: LatLng): Vec2 {
  return {
    x: (p.lng - frame.origin.lng) * frame.mPerDegLng,
    z: (p.lat - frame.origin.lat) * frame.mPerDegLat,
  };
}

export function pathToLocal(frame: LocalFrame, path: LatLng[]): Vec2[] {
  return path.map((p) => toLocal(frame, p));
}

export function bboxOf(points: Vec2[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Haversine distance in meters */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthMeters(path: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < path.length; i += 1) {
    sum += haversineMeters(path[i - 1]!, path[i]!);
  }
  return sum;
}
