import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { vertexShader, fragmentShader } from './shaders.js';

async function loadHeightmap() {
  const meta = await (await fetch('/data/heightmap_meta.json')).json();
  const buf = await (await fetch(`/data/heightmap_${meta.width}x${meta.height}.bin`)).arrayBuffer();
  return { meta, int16: new Int16Array(buf) };
}

function buildHeightTexture({ meta, int16 }) {
  const { width, height } = meta;
  // bin is row 0 = north; GL texture rows go bottom-up, so flip vertically
  // (matches the flipY=true orientation of the loaded color JPEG)
  const data = new Float32Array(width * height);
  for (let r = 0; r < height; r++) {
    const src = r * width;
    const dst = (height - 1 - r) * width;
    for (let c = 0; c < width; c++) data[dst + c] = int16[src + c];
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.FloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping; // antimeridian seam
  tex.needsUpdate = true;
  return tex;
}

async function init() {
  const heightmap = await loadHeightmap();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0.8, 3.0);

  // no colorSpace set: pass sRGB texel values straight through the unlit shader
  const colorTex = await new THREE.TextureLoader().loadAsync('/textures/earth_color.jpg');

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHeight: { value: buildHeightTexture(heightmap) },
      uColor: { value: colorTex },
      uExaggeration: { value: 60.0 },
    },
  });
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
    `<pre style="position:fixed;top:8px;left:8px;color:#f66;font:13px monospace;white-space:pre-wrap">${err.message}\n\nDid you run: python tools/prepare_heightmap.py ?</pre>`
  );
});
