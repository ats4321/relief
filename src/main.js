import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0.8, 3.0);

  // no colorSpace set: pass sRGB texel values straight through unlit
  const colorTex = await new THREE.TextureLoader().loadAsync('/textures/earth_color.jpg');
  const material = new THREE.MeshBasicMaterial({ map: colorTex });

  // segment count far exceeds the 1440x720 heightmap grid, ready for displacement
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 960, 480), material));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 10;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

init().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;top:8px;left:8px;color:#f66;font:13px monospace;white-space:pre-wrap">${err.message}</pre>`
  );
});
