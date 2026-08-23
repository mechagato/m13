import { describe, it, expect } from 'vitest';
import { parseScene, compileScene } from '@m13/runtime';
import {
  buildGeoTwinFromPathOnly,
  buildGeoTwinM13,
  parseOverpassJson,
  bboxFromPath,
  buildOverpassQuery,
  pathLengthMeters,
} from '../src/index.js';

const samplePath = [
  { lat: 25.6866, lng: -100.3161 },
  { lat: 25.6870, lng: -100.3155 },
  { lat: 25.6875, lng: -100.3148 },
];

describe('geo-twin Camino A', () => {
  it('path-only twin validates and compiles', () => {
    const r = buildGeoTwinFromPathOnly(samplePath, { name: 'test_mty' });
    expect(r.stats.pathPoints).toBe(3);
    expect(r.stats.pathLengthM).toBeGreaterThan(50);
    expect(r.stats.roadSegments).toBeGreaterThan(0);
    const scene = parseScene(r.yaml, { silent: true });
    expect(() => compileScene(scene)).not.toThrow();
    expect(scene.sky).toBeTruthy();
  });

  it('OSM buildings become boxes', () => {
    const osm = parseOverpassJson({
      elements: [
        { type: 'node', id: 1, lat: 25.6867, lon: -100.316 },
        { type: 'node', id: 2, lat: 25.6867, lon: -100.3158 },
        { type: 'node', id: 3, lat: 25.6869, lon: -100.3158 },
        { type: 'node', id: 4, lat: 25.6869, lon: -100.316 },
        {
          type: 'way',
          id: 10,
          nodes: [1, 2, 3, 4, 1],
          tags: { building: 'yes', 'building:levels': '3' },
        },
      ],
    });
    expect(osm.buildings).toHaveLength(1);
    const r = buildGeoTwinM13(samplePath, osm, { name: 'test_osm', padSynthetic: false });
    expect(r.stats.buildings).toBeGreaterThanOrEqual(1);
    compileScene(parseScene(r.yaml, { silent: true }));
  });

  it('overpass query includes bbox', () => {
    const bb = bboxFromPath(samplePath);
    const q = buildOverpassQuery(bb);
    expect(q).toContain('building');
    expect(q).toContain(String(bb.south));
  });

  it('rejects short paths', () => {
    expect(() => buildGeoTwinFromPathOnly([{ lat: 1, lng: 2 }])).toThrow(/2 puntos/i);
  });

  it('path length is positive', () => {
    expect(pathLengthMeters(samplePath)).toBeGreaterThan(0);
  });
});
