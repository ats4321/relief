# Relief

An interactive 3D globe that visualizes Earth by elevation and ocean depth instead of a flat map — low-lying places like New Orleans (below sea level) sit visibly at the globe's sea-level surface, while high places like Denver (~1,600 m) stand off it, and ocean trenches sink inward.

## Why

Elevation is hard to *perceive* on flat maps. Color scales encode it, but reading a legend is not the same as seeing it: you know Denver is "the Mile High City," but a choropleth won't make you feel how far a mile is next to sea level, or how much deeper the Challenger Deep is than Everest is tall. Relief makes elevation physically intuitive by turning it into actual 3D displacement — mountains bulge out of the globe, basins and trenches sink in, and the difference between −2 m and +1,600 m becomes something you can see by rotating a sphere.

## How it works

- **Three.js / WebGL** — a single displaced sphere, orbit controls, no framework.
- **ETOPO 2022 (NOAA)** — combined land elevation + ocean bathymetry, downsampled to a 0.25° (1440×720) 16-bit heightmap by a one-time preprocessing script; the runtime app is fully static.
- **GLSL vertex shader displacement** — each vertex is pushed along its normal by `radius = 1 + (elevation / R_earth) × exaggeration`, sampled from the heightmap texture on the GPU.
- **Piecewise-linear exaggeration** — separate factors for land and ocean, because mean ocean depth (~3,700 m) would otherwise visually dominate mean land elevation (~840 m).

## Setup

Early scaffolding — setup instructions will land here as the pieces come together.

## License

[MIT](LICENSE)
