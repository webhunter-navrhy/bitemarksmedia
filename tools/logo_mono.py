#!/usr/bin/env python3
"""Loga partnerů -> jednotná černá silueta na průhledném pozadí (assets/partners/<slug>.png).
Barvu pak web volí přes CSS (filter). Bílá loga (pro tmavé pozadí) i barevná se převedou stejně.
    python3 tools/logo_mono.py
"""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets/partners_raw"
OUT = ROOT / "assets/partners"
OUT.mkdir(exist_ok=True)


def load(p: Path) -> Image.Image:
    if p.suffix == ".svg":
        tmp = Path(tempfile.mkstemp(suffix=".png")[1])
        subprocess.run(["rsvg-convert", "-h", "400", "-o", str(tmp), str(p)], check=True)
        p = tmp
    im = Image.open(p)
    im.load()
    return im.convert("RGBA")


def mask_of(im: Image.Image) -> np.ndarray:
    a = np.asarray(im).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3]
    lum = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
    transparent = (al < .5).mean() > .05
    if transparent:
        op = al > .5
        mean_l = lum[op].mean() if op.any() else 0
        if mean_l > .8:            # bílé logo pro tmavé pozadí
            return al
        # barevné/černé logo: bílé plochy uvnitř loga jsou díry
        return al * np.clip((.93 - lum) / .13, 0, 1)
    # neprůhledné (jpg): pozadí podle rohů
    h, w = lum.shape
    corners = np.concatenate([rgb[:4, :4].reshape(-1, 3), rgb[:4, -4:].reshape(-1, 3), rgb[-4:, :4].reshape(-1, 3), rgb[-4:, -4:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    return np.clip((dist - .08) / .25, 0, 1)


def process(src: Path, slug: str) -> dict:
    m = mask_of(load(src))
    ys, xs = np.where(m > .08)
    if not len(xs):
        raise ValueError("prázdné logo")
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    alpha = Image.fromarray((m * 255).astype(np.uint8), "L")
    alpha.thumbnail((640, 220), Image.LANCZOS)
    out = Image.new("RGBA", alpha.size, (0, 0, 0, 0))
    out.putalpha(alpha)
    blk = Image.new("RGBA", alpha.size, (17, 17, 17, 255)); blk.putalpha(alpha)
    blk.save(OUT / f"{slug}.png", optimize=True)
    # "ink" = podíl pokrytí, pro optické vyrovnání velikosti
    return {"w": alpha.width, "h": alpha.height, "ink": float(m.mean())}


def main():
    meta = json.loads((RAW / "meta.json").read_text())
    res = {}
    for x in meta:
        slug = Path(x["file"]).stem
        try:
            res[slug] = {"name": x["name"], "cat": x["cat"], **process(RAW / x["file"], slug)}
        except Exception as e:
            print("CHYBA", x["file"], e, file=sys.stderr)
    for p in sorted((ROOT / "assets/logos").glob("*.png")):
        res["c-" + p.stem] = {"name": p.stem, "cat": "Klienti", **process(p, "c-" + p.stem)}
    (OUT / "index.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(len(res), "log")


if __name__ == "__main__":
    main()
