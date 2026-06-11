// bench-load.mjs — T-063: tiempo de carga/parse en Node (sin GPU)
//
// Compara el costo CPU de "preparar la escena para render":
//   m13:      parseScene(yaml) + compileScene(scene)  → WGSL listo para pipeline
//   Three.js: construcción del scene graph (geometrías + materiales + luces)
//
// Lo que NO se mide aquí (requiere browser/GPU): carga de texturas JPG de Three.js
// (red + decode de imagen), creación de pipeline WebGPU de m13, upload a GPU.
// Ambos quedan como [PENDIENTE — laptop Gato].
//
// Uso: node bench-load.mjs

import { readFileSync } from 'fs';
import * as THREE from 'three';
import { parseScene, compileScene } from '../../../packages/runtime/dist/m13-runtime.js';

const ITER = 200;
const yamlSrc = readFileSync('../../../packages/examples/public/scenes/sala_galeria.m13', 'utf8');

function stats(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const p = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { p50: p(0.5).toFixed(3), p95: p(0.95).toFixed(3), min: s[0].toFixed(3) };
}

// ---- m13: parse + compile ----
const m13Samples = [];
for (let i = 0; i < ITER; i++) {
  const t0 = performance.now();
  const scene = parseScene(yamlSrc);
  compileScene(scene);
  m13Samples.push(performance.now() - t0);
}

// ---- Three.js: construcción del scene graph equivalente (sin texturas ni GPU) ----
function buildThreeScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x121316, 0.06);
  const mats = [
    new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.05 }),
    new THREE.MeshStandardMaterial({ roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.9 }),
    new THREE.MeshPhysicalMaterial({ roughness: 0.18, iridescence: 0.6, clearcoat: 0.5 }),
  ];
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 6), mats[0]));
  for (const [x, z, sx, sy] of [[0, 0, 0.4, 0.4], [-2.5, -1.5, 0.3, 0.35], [2.5, -1.5, 0.3, 0.35]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(sx, sx * 1.1, sy * 2.2, 24), mats[2]);
    p.position.set(x, 0, z);
    scene.add(p);
  }
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 48, 32), mats[4]));
  scene.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 24, 64), mats[3]));
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mats[2]));
  scene.add(new THREE.PointLight(0xffffff, 10));
  scene.add(new THREE.AmbientLight(0x353638, 1.4));
  scene.updateMatrixWorld(true);
  return scene;
}

const threeSamples = [];
for (let i = 0; i < ITER; i++) {
  const t0 = performance.now();
  buildThreeScene();
  threeSamples.push(performance.now() - t0);
}

const m = stats(m13Samples);
const t = stats(threeSamples);
console.log(`Iteraciones: ${ITER} · Node ${process.version}`);
console.log(`m13   parse+compile (sala_galeria.m13): p50=${m.p50}ms p95=${m.p95}ms min=${m.min}ms`);
console.log(`three scene-graph build (equivalente):  p50=${t.p50}ms p95=${t.p95}ms min=${t.min}ms`);
console.log('NOTA: Three.js NO incluye carga/decode de texturas JPG ni upload GPU (solo browser).');
console.log('NOTA: m13 NO incluye creación de pipeline WebGPU (solo browser).');
