export const vertexShader = /* glsl */ `
  uniform sampler2D uHeight;   // meters, R channel, float
  uniform float uKLand;
  uniform float uKOcean;
  varying vec2 vUv;

  const float R_EARTH = 6371000.0;

  void main() {
    vUv = uv;
    float e = texture2D(uHeight, uv).r;
    // piecewise linear: separate exaggeration for land vs ocean
    float k = mix(uKOcean, uKLand, step(0.0, e));
    vec3 displaced = position * (1.0 + (e / R_EARTH) * k);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uColor;
  varying vec2 vUv;

  void main() {
    // ponytail: unlit for v1 -- relief reads via silhouette/parallax;
    // add finite-difference normals + lighting when shading matters
    gl_FragColor = texture2D(uColor, vUv);
  }
`;
