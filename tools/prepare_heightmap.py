#!/usr/bin/env python3
"""Bake a 1440x720 (0.25 deg) int16 heightmap from ETOPO 2022.

Fetches a stride-5 subset of NOAA's 60-arcsec grid via OpenDAP (~37 MB
instead of the full 478 MB netCDF), 3x3 block-means it to 0.25 deg, and
writes public/data/heightmap_1440x720.bin (int16 LE, row 0 = north,
col 0 = 180W) plus a JSON meta file. Also fetches the Blue Marble color
texture. Requires numpy only. Run once: python tools/prepare_heightmap.py
"""
import json
import struct
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / "cache"
DATA_DIR = ROOT / "public" / "data"
TEX_DIR = ROOT / "public" / "textures"

DODS_URL = (
    "https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/"
    "60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc.dods"
    "?z.z[0:5:10799][0:5:21599]"
)
BLUE_MARBLE_URL = (
    "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/"
    "land_shallow_topo_2048.jpg"
)

SRC_H, SRC_W = 2160, 4320  # stride-5 subset of the 10800x21600 grid
OUT_H, OUT_W = 720, 1440   # 0.25 deg
CELL_DEG = 0.25
R_EARTH = 6_371_000


def fetch(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"cached: {dest}")
        return
    print(f"downloading {url}\n  -> {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    urllib.request.urlretrieve(url, tmp)
    tmp.rename(dest)


def parse_dods(raw: bytes) -> np.ndarray:
    """Extract the XDR-encoded Float32 array from a DAP2 .dods response."""
    i = raw.index(b"Data:")
    i = raw.index(b"\n", i) + 1
    n1, n2 = struct.unpack(">II", raw[i : i + 8])
    assert n1 == n2 == SRC_H * SRC_W, f"unexpected array size {n1}/{n2}"
    z = np.frombuffer(raw, dtype=">f4", count=n1, offset=i + 8)
    return z.reshape(SRC_H, SRC_W).astype(np.float32)


def cell(grid: np.ndarray, lat: float, lon: float) -> float:
    row = min(OUT_H - 1, int((90 - lat) / CELL_DEG))
    col = min(OUT_W - 1, int((lon + 180) / CELL_DEG))
    return float(grid[row, col])


def main() -> None:
    dods_path = CACHE / "etopo2022_60s_stride5.dods"
    fetch(DODS_URL, dods_path)
    fetch(BLUE_MARBLE_URL, TEX_DIR / "earth_color.jpg")

    z = parse_dods(dods_path.read_bytes())
    z = z[::-1]  # source lat is ascending (south first) -> flip so row 0 = north
    out = z.reshape(OUT_H, 3, OUT_W, 3).mean(axis=(1, 3))
    out_i16 = np.clip(np.rint(out), -32768, 32767).astype("<i2")

    zmin, zmax = int(out_i16.min()), int(out_i16.max())
    assert 5000 <= zmax <= 8849, f"suspicious max elevation {zmax} m"
    assert -11000 <= zmin <= -8000, f"suspicious min depth {zmin} m"

    landmarks = [
        ("New Orleans", 29.95, -90.07, lambda e: abs(e) < 100),
        ("Denver", 39.74, -104.99, lambda e: e > 1000),
        ("Mt. Everest", 27.99, 86.93, lambda e: e > 4000),
        ("Challenger Deep", 11.35, 142.20, lambda e: e < -7000),
    ]
    print(f"\n{'landmark':<16}{'elev (m)':>10}{'factor':>8}{'radius offset':>15}")
    for name, lat, lon, ok in landmarks:
        e = cell(out_i16, lat, lon)
        assert ok(e), f"sanity check failed: {name} = {e} m"
        k = 60 if e >= 0 else 25
        print(f"{name:<16}{e:>10.0f}{'x' + str(k):>8}{e / R_EARTH * k:>15.5f}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    bin_path = DATA_DIR / f"heightmap_{OUT_W}x{OUT_H}.bin"
    bin_path.write_bytes(out_i16.tobytes())
    meta = {
        "width": OUT_W,
        "height": OUT_H,
        "dtype": "int16",
        "row0": "north",
        "col0_lon": -180,
        "cell_deg": CELL_DEG,
        "min_m": zmin,
        "max_m": zmax,
        "source": "ETOPO 2022 60s (NOAA), stride-5 OpenDAP subset, 3x3 block mean",
    }
    (DATA_DIR / "heightmap_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"\nwrote {bin_path} ({bin_path.stat().st_size:,} bytes), range [{zmin}, {zmax}] m")


if __name__ == "__main__":
    main()
