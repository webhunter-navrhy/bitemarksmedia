#!/usr/bin/env python3
"""Build webu Bite Marks Media: assets/ + content.py + template.html -> dist/ (CZ /, EN /en/).

    python3 build.py
Obrázky se převádějí do WebP jen jednou (cache v .cache/), CSS/JS/obrázky dostávají ?v=<hash>.
"""
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from PIL import Image

from content import COMMON, CZ, EN

ROOT = Path(__file__).resolve().parent
A = ROOT / "assets"
SRC = A / "src"
DIST = ROOT / "dist"
CACHE = ROOT / ".cache"
SITE = json.loads((ROOT / "_data/site.json").read_text())
BASE = SITE["base"]
SITE_URL = SITE["url"]

# název -> (zdroj, šířky, ořez (l, t, r, b) v pixelech zdroje nebo None)
IMAGES = {
    "cover-kvt": ("kvt-str-01.webp", [480, 900], None),
    "cover-shr": ("shr-str-01.webp", [480, 900], None),
    "cover-ci": ("str-01.webp", [480, 900], None),
    "cover-k26": ("forbes-str-01.webp", [480, 900], None),
    "aero-1": ("Aero_BMM_05.webp", [675], None),
    "aero-2": ("Aero_BMM_01.webp", [675], None),
    "aero-poster": ("aero-poster.jpg", [696], None),
    "j-manazer": ("manazer-roku-Macek.webp", [640, 1200], None),
    "j-asd": ("ASD_Fest_vizual_sirka.webp", [640, 1200], None),
    "j-compas": ("COMPAS-foto-3.webp", [640, 1200], None),
    "p-valerie": ("valerie.png", [500], None),
    "p-maryna": ("maryna.png", [500], None),
}
MAGS = {"kvt": "kvt-str", "shr": "shr-str", "ci": "str", "k26": "forbes-str"}


def h(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()[:8]


def webp(img: Image.Image, out: Path, q=80):
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=q, method=6)


def build_images():
    manifest = {}
    for name, (src, widths, crop) in IMAGES.items():
        p = SRC / src
        raw = p.read_bytes()
        key = h(raw + repr((widths, crop)).encode())
        im = Image.open(p)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        if crop:
            im = im.crop(crop)
        W, H = im.size
        ws = [w for w in widths if w <= W] or [W]
        for w in ws:
            out = CACHE / "img" / f"{name}-{w}.{key}.webp"
            if not out.exists():
                r = im if w == W else im.resize((w, round(H * w / W)), Image.LANCZOS)
                webp(r, out, 82 if name.startswith(("hero", "cta")) else 78)
            shutil.copy(out, DIST / "img" / f"{name}-{w}.webp")
        manifest[name] = {"w": ws, "W": ws[-1], "H": round(H * ws[-1] / W), "v": key}
    # stránky příloh pro prohlížečku
    pv = []
    for k, pref in MAGS.items():
        for i in range(1, 17):
            p = A / "pages" / f"{pref}-{i:02d}.webp"
            raw = p.read_bytes(); pv.append(h(raw))
            out = CACHE / "pages" / f"{k}-{i:02d}.{h(raw)}.webp"
            if not out.exists():
                im = Image.open(p).convert("RGB")
                im.thumbnail((1000, 1400), Image.LANCZOS)
                webp(im, out, 76)
            dst = DIST / "img" / "pages" / f"{k}-{i:02d}.webp"
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(out, dst)
    return manifest, h("".join(pv).encode())


def clean_svg(path: Path, cls="") -> str:
    s = path.read_text()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = s[s.index("<g"):s.rindex("</svg>")] if "<g" in s else s
    body = body.replace('fill="#000000"', 'fill="currentColor"')
    nums = [float(x) for x in vb.split()]
    return f'<svg class="{cls}" viewBox="{" ".join(f"{n:g}" for n in nums)}" aria-hidden="true">{body}</svg>'


def trim_venture(path: Path) -> str:
    """potrace SVG -> těsný viewBox podle obsahu (bbox spočítaný z PBM)."""
    pbm = path.with_suffix(".pbm")
    s = path.read_text()
    body = s[s.index("<g"):s.rindex("</svg>")].replace('fill="#000000"', 'fill="currentColor"')
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    if pbm.exists():
        im = Image.open(pbm).convert("L").point(lambda v: 255 - v)
        bb = im.getbbox()
        if bb:
            pad = 4
            vb = [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad]
    return f'<svg viewBox="{" ".join(f"{n:g}" for n in vb)}" aria-hidden="true">{body}</svg>'


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "img").mkdir(parents=True)
    (DIST / "media").mkdir()

    # poster videa = první snímek
    poster = SRC / "aero-poster.jpg"
    if not poster.exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", "0.6", "-i", str(SRC / "aero.mp4"), "-frames:v", "1", "-q:v", "3", str(poster)], check=True)
    IMG, pages_v = build_images()

    vid = (SRC / "aero.mp4").read_bytes()
    shutil.copy(SRC / "aero.mp4", DIST / "media" / "aero.mp4")
    VIDEO = {"w": 696, "h": 900, "v": h(vid)}

    LOGOS = {}
    for k in COMMON["clients"]:
        p = A / "logos" / f"{k}.png"
        shutil.copy(p, DIST / "img" / f"logo-{k}.png")
        im = Image.open(p)
        LOGOS[k] = {"w": im.width, "h": im.height, "v": h(p.read_bytes())}

    logo = (A / "bmm-logo.svg").read_text()
    VLOGO = {k: trim_venture(A / f"{k}.svg") for k in ("asd", "dtp", "gryfix", "haso")}

    css = (ROOT / "style.css").read_bytes(); (DIST / "style.css").write_bytes(css)
    js = (ROOT / "app.js").read_bytes(); (DIST / "app.js").write_bytes(js)
    ring = (ROOT / "ring.js").read_bytes(); (DIST / "ring.js").write_bytes(ring)
    fav = (A / "favicon.svg").read_bytes(); (DIST / "favicon.svg").write_bytes(fav)
    og = A / "og.jpg"
    if og.exists():
        shutil.copy(og, DIST / "img" / "og.jpg")
    og_v = h(og.read_bytes()) if og.exists() else "0"

    c = COMMON
    ld = {
        "@context": "https://schema.org", "@type": "ProfessionalService",
        "name": "Bite Marks Media", "legalName": c["company"], "url": "https://bitemarksmedia.com/",
        "slogan": "Leave a mark.", "email": c["email"], "telephone": c["phone"],
        "taxID": c["ico"], "identifier": {"@type": "PropertyValue", "propertyID": "IČO", "value": c["ico"]},
        "address": {"@type": "PostalAddress", "streetAddress": c["street"], "postalCode": c["zip"], "addressLocality": "Praha", "addressCountry": "CZ"},
        "founder": {"@type": "Person", "name": "Valérie Čížková", "jobTitle": "Founder & CEO"},
        "sameAs": [c["linkedin"], c["instagram"], c["facebook"], c["journal"]],
        "knowsAbout": ["employer branding", "content marketing", "event management", "social media", "brand strategy"],
        "subOrganization": [{"@type": "Organization", "name": "ASD Fest", "url": "https://asdfest.cz/"},
                            {"@type": "Organization", "name": "Hasoběh", "url": "https://hasobeh.cz/"},
                            {"@type": "Organization", "name": "Držíme ti palce", "url": "https://drzimetipalce.cz/"}],
    }

    env = Environment(loader=FileSystemLoader(str(ROOT)), autoescape=True, trim_blocks=True, lstrip_blocks=True)
    tpl = env.get_template("template.html")
    for t, out in ((CZ, DIST / "index.html"), (EN, DIST / "en" / "index.html")):
        out.parent.mkdir(parents=True, exist_ok=True)
        html = tpl.render(t=t, c=c, base=BASE, site_url=SITE_URL, IMG=IMG, VIDEO=VIDEO, LOGOS=LOGOS,
                          LOGO=logo, VLOGO=VLOGO, css_v=h(css), js_v=h(js), ring_v=h(ring), fav_v=h(fav), og_v=og_v,
                          pages_v=pages_v, ld=json.dumps(dict(ld, inLanguage=t["lang"]), ensure_ascii=False))
        # nezlomitelná mezera po jednopísmenných předložkách a spojkách (jen CZ text mimo tagy)
        if t["lang"] == "cs":
            html = re.sub(r"(>[^<]*)", lambda m: re.sub(r"(?<=[\s(])([kKsSvVzZoOuUaAiI]) (?=\S)", "\\1\u00a0", m.group(1)), html)
        out.write_text(html)
    (DIST / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (DIST / ".nojekyll").write_text("")
    (DIST / "404.html").write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={BASE}"><title>Bite Marks Media</title>')
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"hotovo: {DIST} ({size/1e6:.1f} MB včetně stránek příloh)")


if __name__ == "__main__":
    main()
