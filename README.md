# Relief

An interactive 3D globe that visualizes Earth by elevation and ocean depth instead of a flat map — low-lying places like New Orleans (below sea level) sit visibly at the globe's sea-level surface, while high places like Denver (~1,600 m) stand off it, and ocean trenches sink inward.

## Why

Elevation is hard to *perceive* on flat maps. Color scales encode it, but reading a legend is not the same as seeing it: you know Denver is "the Mile High City," but a choropleth won't make you feel how far a mile is next to sea level, or how much deeper the Challenger Deep is than Everest is tall. Relief makes elevation physically intuitive by turning it into actual 3D displacement — mountains bulge out of the globe, basins and trenches sink in, and the difference between −2 m and +1,600 m becomes something you can see by rotating a sphere.

## How it works

- **Three.js / WebGL** — a single displaced sphere, orbit controls, no framework.
- **ETOPO 2022 (NOAA)** — combined land elevation + ocean bathymetry, downsampled to a 0.25° (1440×720) 16-bit heightmap by a one-time preprocessing script; the runtime app is fully static.
- **GLSL vertex shader displacement** — each vertex is pushed along its normal by `radius = 1 + (elevation / R_earth) × exaggeration`, sampled from the heightmap texture on the GPU.
- **Piecewise-linear exaggeration** — separate factors for land and ocean, because mean ocean depth (~3,700 m) would otherwise visually dominate mean land elevation (~840 m).

## Screenshot

<!-- TODO: replace with a screenshot/GIF of the displaced globe -->
*Screenshot coming soon.*

## Setup

The heightmap and color texture are committed, so the app runs with Node alone:

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

To regenerate the heightmap from source data (optional — requires Python 3 + numpy):

```bash
python3 -m venv tools/.venv
tools/.venv/bin/pip install numpy
tools/.venv/bin/python tools/prepare_heightmap.py
```

The script fetches a strided subset of NOAA's ETOPO 2022 60-arcsec grid via OpenDAP (~37 MB, cached in `tools/cache/`), block-means it to 0.25°, and writes `public/data/heightmap_1440x720.bin` + meta JSON. On startup the app logs a sanity table (New Orleans, Denver, Everest, Challenger Deep) showing each landmark's elevation and computed radius offset, and throws if any value is implausible.

Use the **Exaggeration** panel (top right) to tune the land and ocean factors live.

## License

[MIT](LICENSE)
