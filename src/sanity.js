const R_EARTH = 6371000;

const LANDMARKS = [
  { name: 'New Orleans',     lat: 29.95, lon: -90.07,  ok: (e) => Math.abs(e) < 100 },
  { name: 'Denver',          lat: 39.74, lon: -104.99, ok: (e) => e > 1000 },
  { name: 'Mt. Everest',     lat: 27.99, lon: 86.93,   ok: (e) => e > 4000 },
  { name: 'Challenger Deep', lat: 11.35, lon: 142.20,  ok: (e) => e < -7000 },
];

// Nearest-cell lookup in the same int16 grid the shader samples (row 0 = north).
export function elevationAt({ meta, int16 }, lat, lon) {
  const row = Math.min(meta.height - 1, Math.floor((90 - lat) / meta.cell_deg));
  const col = Math.min(meta.width - 1, Math.floor((lon + 180) / meta.cell_deg));
  return int16[row * meta.width + col];
}

// Mirrors the vertex shader's displacement math on the CPU and logs a table.
// Throws if any landmark elevation is implausible (bad data / bad indexing).
export function runSanityChecks(heightmap, { kLand, kOcean }) {
  const rows = LANDMARKS.map(({ name, lat, lon, ok }) => {
    const e = elevationAt(heightmap, lat, lon);
    if (!ok(e)) {
      throw new Error(`Sanity check failed: ${name} elevation ${e} m is implausible — heightmap orientation or indexing is wrong`);
    }
    const k = e >= 0 ? kLand : kOcean;
    return {
      landmark: name,
      'elevation (m)': e,
      factor: `×${k}`,
      'radius offset': +((e / R_EARTH) * k).toFixed(5),
    };
  });
  console.table(rows);
}
