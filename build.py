#!/usr/bin/env python3
"""Build vícestránkového webu Bite Marks Media: content.py (+ content_en.py) + templates/ + assets/ -> dist/.

    python3 build.py
CZ je v kořeni, EN pod /en/. Obrázky se převádí do WebP jen jednou (cache .cache/), vše s ?v=<hash>.
"""
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from PIL import Image

from content import COMMON, CZ

try:
    from content_en import EN
except Exception:  # EN ještě není hotová
    EN = None

ROOT = Path(__file__).resolve().parent
A = ROOT / "assets"
SRC = A / "src"
DIST = ROOT / "dist"
CACHE = ROOT / ".cache"
SITE = json.loads((ROOT / "_data/site.json").read_text())
BASE = SITE["base"]
SITE_URL = SITE["url"]

# klíč -> (zdroj v assets/src, šířky, ořez)
IMAGES = {
    "cover-kvt": ("kvt-str-01.webp", [480, 900], None),
    "cover-shr": ("shr-str-01.webp", [480, 900], None),
    "cover-ci": ("str-01.webp", [480, 900], None),
    "cover-k26": ("forbes-str-01.webp", [480, 900], None),
    "aero-1": ("Aero_BMM_05.webp", [480, 675], None),
    "aero-2": ("Aero_BMM_01.webp", [480, 675], None),
    "aero-3": ("Aero_BMM_03.webp", [480, 675], None),
    "aero-5": ("Aero_BMM_02.webp", [480, 675], None),
    "aero-6": ("Aero_BMM_06.webp", [480, 675], None),
    "aero-7": ("Aero_BMM_07.webp", [480, 675], None),
    "aero-poster": ("aero-poster.jpg", [696], None),
    "haso-arch": ("v/haso-3.jpg", [800, 1400, 2200], None),
    "haso-run": ("v/haso-4.jpg", [800, 1400, 2200], None),
    "haso-print": ("v/haso-5.jpg", [600, 1086], None),
    "haso-medal": ("v/haso-6.jpg", [600, 997], None),
    "v-asd": ("ASD_Fest_vizual_sirka.webp", [800, 1400, 1915], None),
    "asd-web": ("rerospace-defence.webp", [600, 1100], None),
    "valerie-brand": ("v/valerie-brand.jpg", [480, 667], None),
    "p-valerie": ("valerie.png", [500], None),
    "p-maryna": ("maryna.png", [500], None),
    "akom": ("AKOM-BMM-1-1.webp", [600, 1100], None),
    "j-manazer": ("manazer-roku-Macek.webp", [640, 1200], None),
    "j-asd": ("ASD_Fest_vizual_sirka.webp", [640, 1200], None),
    "j-compas": ("COMPAS-foto-3.webp", [640, 1200], None),
    "j-tos": ("DSC00689.webp", [640, 1200], None),
    "j-wikov": ("IMG_1214.webp", [640, 1200], None),
    "j-msv": ("MSV-vyroba-manufacture-renei-interier12.webp", [640, 1200], None),
    "j-rohde": ("vimperk-25-years-promotional-image-rohde-schwarz_200_121303_1920_1080_4.webp", [640, 1200], None),
    "j-raben": ("EVAK5920-zm.webp", [640, 1200], None),
    "j-doosan": ("CR_STROJE_ENERGIE_FIRMY_DOOSAN_SKODA_POWER_PLZEN_10_575.webp", [640, 1200], None),
}
for i, src in enumerate(["Premiovy-merchandise-12", "Premiovy-merchandise-3", "Premiovy-merchandise-6", "Premiovy-merchandise-10",
                         "Premiovy-merchandise-8", "Premiovy-merchandise-7", "Premiovy-merchandise", "Premiovy-merchandise-4",
                         "Premiovy-merchandise-2", "Premiovy-merchandise-5", "Premiovy-merchandise-9", "Premiovy-merchandise-11"], 1):
    IMAGES[f"merch-{i}"] = (f"{src}.webp", [600, 1200], None)
for s, src in {"skoda": "skoda", "gls": "GLSpdf", "raynet": "RAYNET", "arf": "ARF", "brunch": "SALES-BRUNCH"}.items():
    for n in (1, 2, 3):
        IMAGES[f"car-{s}-{n}"] = (f"{src}-{n}-1.webp", [480, 800], None)
MAGS = {"kvt": "kvt-str", "shr": "shr-str", "ci": "str", "k26": "forbes-str"}

# vizuální výplň hlavní plochy u disciplín (obsahová data jsou v content.py)
SERVICE_MEDIA = {
    "editorials": {"type": "covers"},
    "campaigns": {"type": "triptych", "keys": ["aero-5", "aero-1", "aero-2"]},
    "strategies": {"type": "quote"},
    "events": {"type": "image", "key": "haso-arch"},
    "media": {"type": "carousels", "keys": ["car-skoda-1", "car-gls-1", "car-raynet-1", "car-arf-1"]},
    "experiences": {"type": "image", "key": "merch-2"},
}
WORK_CARD = {"forbes": "covers", "aero": "aero-1", "socialni-site": "carousels", "merchandise": "merch-1"}


def h(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()[:8]


def build_images():
    out = {}
    for name, (src, widths, crop) in IMAGES.items():
        p = SRC / src
        if not p.exists():
            continue
        raw = p.read_bytes()
        key = h(raw + repr((widths, crop)).encode())
        im = Image.open(p)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        if crop:
            im = im.crop(crop)
        W, H = im.size
        ws = [w for w in widths if w <= W] or [W]
        for w in ws:
            c = CACHE / "img" / f"{name}-{w}.{key}.webp"
            if not c.exists():
                c.parent.mkdir(parents=True, exist_ok=True)
                (im if w == W else im.resize((w, round(H * w / W)), Image.LANCZOS)).save(c, "WEBP", quality=80, method=6)
            shutil.copy(c, DIST / "img" / f"{name}-{w}.webp")
        out[name] = {"w": ws, "W": ws[-1], "H": round(H * ws[-1] / W), "v": key}
    pv = []
    for k, pref in MAGS.items():
        for i in range(1, 17):
            p = A / "pages" / f"{pref}-{i:02d}.webp"
            raw = p.read_bytes(); pv.append(h(raw))
            c = CACHE / "pages" / f"{k}-{i:02d}.{h(raw)}.webp"
            if not c.exists():
                c.parent.mkdir(parents=True, exist_ok=True)
                im = Image.open(p).convert("RGB"); im.thumbnail((1000, 1400), Image.LANCZOS); im.save(c, "WEBP", quality=76, method=6)
            d = DIST / "img" / "pages" / f"{k}-{i:02d}.webp"; d.parent.mkdir(parents=True, exist_ok=True); shutil.copy(c, d)
    return out, h("".join(pv).encode())


def venture_svg(path: Path) -> str:
    s = path.read_text()
    body = s[s.index("<g"):s.rindex("</svg>")].replace('fill="#000000"', 'fill="currentColor"')
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    pbm = path.with_suffix(".pbm")
    if pbm.exists():
        bb = Image.open(pbm).convert("L").point(lambda v: 255 - v).getbbox()
        if bb:
            vb = [bb[0] - 4, bb[1] - 4, bb[2] - bb[0] + 8, bb[3] - bb[1] + 8]
    return f'<svg viewBox="{" ".join(f"{n:g}" for n in vb)}" aria-hidden="true">{body}</svg>'


def nbsp(html: str) -> str:
    """nezlomitelná mezera po jednopísmenných předložkách a spojkách (jen text mimo tagy)"""
    return re.sub(r"(>[^<]*)", lambda m: re.sub(r"(?<=[\s(])([kKsSvVzZoOuUaAiI]) (?=\S)", "\\1\u00a0", m.group(1)), html)


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "img").mkdir(parents=True)
    (DIST / "media").mkdir()
    poster = SRC / "aero-poster.jpg"
    if not poster.exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", "0.6", "-i", str(SRC / "aero.mp4"), "-frames:v", "1", "-q:v", "3", str(poster)], check=True)
    IMG, pages_v = build_images()
    vid = (SRC / "aero.mp4").read_bytes(); shutil.copy(SRC / "aero.mp4", DIST / "media" / "aero.mp4")
    VIDEO = {"w": 696, "h": 900, "v": h(vid)}
    LOGOS = {}
    for k in COMMON["clients"]:
        p = A / "logos" / f"{k}.png"; shutil.copy(p, DIST / "img" / f"logo-{k}.png")
        im = Image.open(p); LOGOS[k] = {"w": im.width, "h": im.height, "v": h(p.read_bytes())}
    LOGO = (A / "bmm-logo.svg").read_text()
    VLOGO = {k: venture_svg(A / f"{k}.svg") for k in ("asd", "dtp", "gryfix", "haso")}
    files = {}
    for f in ("style.css", "app.js", "ring.js"):
        b = (ROOT / f).read_bytes(); (DIST / f).write_bytes(b); files[f] = h(b)
    for f in ("favicon.svg", "og.jpg"):
        if (A / f).exists():
            shutil.copy(A / f, DIST / (f if f.endswith("svg") else "img/" + f)); files[f] = h((A / f).read_bytes())

    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=True, trim_blocks=True, lstrip_blocks=True)
    c = COMMON
    langs = [(CZ, "")] + ([(EN, "en/")] if EN else [])
    count = 0
    for t, pre in langs:
        def page(tpl, path, **kw):
            nonlocal count
            out = DIST / pre / path / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            alt_pre = "en/" if pre == "" else ""
            ctx = dict(t=t, ui=t["ui"], c=c, base=BASE, pre=pre, path=path, site_url=SITE_URL, IMG=IMG, VIDEO=VIDEO,
                       LOGOS=LOGOS, LOGO=LOGO, VLOGO=VLOGO, V=files, pages_v=pages_v, has_en=bool(EN),
                       alt_url=f"{BASE}{alt_pre}{path + '/' if path else ''}", SERVICE_MEDIA=SERVICE_MEDIA, WORK_CARD=WORK_CARD)
            ctx.update(kw)
            html = env.get_template(tpl).render(**ctx)
            if t["lang"] == "cs":
                html = nbsp(html)
            out.write_text(html); count += 1
        page("home.html", "")
        page("services.html", "sluzby")
        S = t["services"]
        for i, s in enumerate(S):
            page("service.html", f"sluzby/{s['slug']}", s=s, idx=i, nxt=S[(i + 1) % len(S)])
        page("work.html", "prace")
        W = t["work"]
        for i, w in enumerate(W):
            page("case.html", f"prace/{w['slug']}", w=w, nxt=W[(i + 1) % len(W)])
        page("built.html", "built-by")
        VV = t["ventures"]
        for i, v in enumerate(VV):
            page("venture.html", f"built-by/{v['slug']}", v=v, nxt=VV[(i + 1) % len(VV)])
        page("journal.html", "journal")
        page("about.html", "o-nas")
        page("contact.html", "kontakt")
    (DIST / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (DIST / ".nojekyll").write_text("")
    (DIST / "404.html").write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={BASE}"><title>Bite Marks Media</title>')
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"hotovo: {count} stránek, {size/1e6:.1f} MB")


if __name__ == "__main__":
    main()
