// scene.js — T-062: réplica Three.js (WebGL) de sala_galeria.m13
// Galería white-cube: cuarto 6×3.5×6, piso de mármol, esfera escultórica sobre
// pedestal central, torus de bronce y cubo de mármol vetado sobre pedestales laterales.
// Valores tomados 1:1 del .m13 (bounds, spawn, light, fog, posiciones de objetos).

import * as THREE from './node_modules/three/build/three.module.min.js';

const BOUNDS = { x: 6, y: 3.5, z: 6 };

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0.07, 0.075, 0.085);
scene.fog = new THREE.FogExp2(new THREE.Color(0.07, 0.075, 0.085), 0.01 * 6);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 0, -4); // spawn del .m13
camera.lookAt(0, -0.5, 0);

// --- texturas (assets requeridos por Three.js) ---
const loader = new THREE.TextureLoader();
function tex(file, repeatX = 1, repeatY = 1) {
  const t = loader.load(`./textures/${file}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const texYeso = tex('yeso_blanco.jpg', 3, 2);
const texMarmolPiso = tex('marmol_blanco.jpg', 4, 4);
const texMarmolVetas = tex('marmol_vetas.jpg');
const texBronce = tex('bronce.jpg', 2, 1);

// --- materiales ---
const matYeso = new THREE.MeshStandardMaterial({ map: texYeso, roughness: 0.95 });
const matMarmolPiso = new THREE.MeshStandardMaterial({ map: texMarmolPiso, roughness: 0.15, metalness: 0.05 });
const matMarmolVetas = new THREE.MeshStandardMaterial({ map: texMarmolVetas, roughness: 0.2 });
const matBronce = new THREE.MeshStandardMaterial({ map: texBronce, roughness: 0.25, metalness: 0.9 });
const matEsfera = new THREE.MeshPhysicalMaterial({
  color: 0xf6f6f8, roughness: 0.18, metalness: 0.1,
  iridescence: 0.6, iridescenceIOR: 1.3, clearcoat: 0.5,
});

// --- cuarto (paredes + piso + techo) ---
// orden BoxGeometry: [+X, -X, +Y(techo), -Y(piso), +Z, -Z]
const roomMats = [matYeso, matYeso, matYeso, matMarmolPiso, matYeso, matYeso]
  .map((m) => { const c = m.clone(); c.side = THREE.BackSide; return c; });
const room = new THREE.Mesh(new THREE.BoxGeometry(BOUNDS.x, BOUNDS.y, BOUNDS.z), roomMats);
room.receiveShadow = true;
scene.add(room);

// --- pedestales (cilindros de mármol) ---
function pedestal(x, z, sx, sy) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(sx, sx * 1.1, sy * 2.2, 24), matMarmolVetas.clone());
  p.position.set(x, -BOUNDS.y / 2 + sy * 1.1, z);
  p.castShadow = p.receiveShadow = true;
  scene.add(p);
  return p;
}
pedestal(0, 0, 0.4, 0.4);        // pedestal_centro
pedestal(-2.5, -1.5, 0.3, 0.35); // pedestal_izq
pedestal(2.5, -1.5, 0.3, 0.35);  // pedestal_der

// --- esfera escultórica (animación bob speed 0.3 amplitude 0.04) ---
const esfera = new THREE.Mesh(new THREE.SphereGeometry(0.38, 48, 32), matEsfera);
esfera.position.set(0, -0.65, 0); // y=-1.5 en coords m13 (origen al centro del cuarto)
esfera.castShadow = true;
scene.add(esfera);

// --- torus de bronce ---
const torus = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 24, 64), matBronce);
torus.position.set(-2.5, -0.85, -1.5);
torus.rotation.x = Math.PI / 2;
torus.castShadow = true;
scene.add(torus);

// --- cubo de mármol vetado ---
const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matMarmolVetas);
cubo.position.set(2.5, -0.85, -1.5);
cubo.castShadow = true;
scene.add(cubo);

// --- iluminación de galería (cenital + ambient del .m13) ---
const luz = new THREE.PointLight(new THREE.Color(0.98, 0.99, 1.02), 1.25 * 8, 0, 1.6);
luz.position.set(0, 1.55, 0); // y=3.2 en coords m13 ≈ techo
luz.castShadow = true;
luz.shadow.mapSize.set(1024, 1024);
scene.add(luz);
scene.add(new THREE.AmbientLight(new THREE.Color(0.2, 0.21, 0.23), 1.4));

// --- loop + FPS counter ---
const hud = document.getElementById('hud');
let frames = 0, last = performance.now();
function animate(t) {
  requestAnimationFrame(animate);
  esfera.position.y = -0.65 + Math.sin(t * 0.001 * 0.3 * Math.PI * 2) * 0.04;
  camera.position.x = Math.sin(t * 0.0001) * 0.5; // paseo sutil
  camera.lookAt(0, -0.5, 0);
  renderer.render(scene, camera);
  frames++;
  if (t - last >= 1000) {
    hud.textContent = `Three.js r165 (WebGL) — ${frames} FPS`;
    frames = 0; last = t;
  }
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
