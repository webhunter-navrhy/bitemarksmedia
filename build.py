#!/usr/bin/env python3
"""Build vícestránkového webu Bite Marks Media: _data/*.json + templates/ + assets/ -> dist/.

    python3 build.py
Obsah je v _data/ (cs.json, en.json, spolecne.json, partneri.json) a upravuje ho klientka v administraci (/admin/,
backend webhunter-admin). Po uložení web přegeneruje GitHub Action (.github/workflows/deploy.yml).
CZ je v kořeni, EN pod /en/. CZ určuje pořadí projektů a fotky, EN jen překládá texty (párování přes slug).
Fotky z administrace (img/uploads/…) se převádí stejně jako ostatní (klíč u-<název>).
Obrázky se převádí do WebP jen jednou (cache .cache/), vše s ?v=<hash>.
"""
import hashlib
import os
import json
import re
import shutil
import subprocess
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape
from PIL import Image

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
    # vlastní art-direction rendery (vygenerované pro web, ne z moodboardu) a produktové kompozice
    "r-cherry": ("r/cherry.jpg", [960, 1440, 1920], None),
    "r-cherry-m": ("r/cherry-m.jpg", [600, 900], None),
    "r-suede": ("r/suede.jpg", [800, 1200, 1600], None),
    "r-suede-p": ("r/suede-p.jpg", [600, 870], None),
    "r-covers": ("r/covers.jpg", [800, 1300, 2000], None),
    "r-cars": ("r/carousels.jpg", [800, 1300, 1800], None),
    "r-covers-p": ("r/covers-p.jpg", [600, 900, 1200], None),
    "r-cars-p": ("r/cars-p.jpg", [600, 900, 1200], None),
    "r-aero": ("r/aero-duo.jpg", [800, 1350], None),
    "asd-spark": ("v/asd-12.jpg", [600, 1024], None),
    "konf": ("Konference-Zeny-Zenam-2024_3.webp", [800, 1400, 1920], None),
    "tech": ("DSC03180.webp", [800, 1400, 1920], None),
    "haso-trail": ("v/haso-9.jpg", [600, 941], None),
}
for i, src in enumerate(["Premiovy-merchandise-12", "Premiovy-merchandise-3", "Premiovy-merchandise-6", "Premiovy-merchandise-10",
                         "Premiovy-merchandise-8", "Premiovy-merchandise-7", "Premiovy-merchandise", "Premiovy-merchandise-4",
                         "Premiovy-merchandise-2", "Premiovy-merchandise-5", "Premiovy-merchandise-9", "Premiovy-merchandise-11"], 1):
    IMAGES[f"merch-{i}"] = (f"{src}.webp", [600, 1200], None)
for s, src in {"skoda": "skoda", "gls": "GLSpdf", "raynet": "RAYNET", "arf": "ARF", "brunch": "SALES-BRUNCH"}.items():
    for n in (1, 2, 3):
        IMAGES[f"car-{s}-{n}"] = (f"{src}-{n}-1.webp", [480, 800], None)
for f in sorted((SRC / "asd").glob("asd-*.jpg")):
    IMAGES[f.stem] = (f"asd/{f.name}", [640, 1200, 2000], None)
OFFICE = {"of-atrium": "ct-NR7_12.jpg", "of-atrium2": "ct-Namesti_Republiky_7_Chapman_Taylor_Architects_10.jpg",
          "of-hall": "ct-Namesti_Republiky_7_Chapman_Taylor_Architects_30.jpg", "of-cafe": "ct-Namesti_Republiky_7_Chapman_Taylor_Architects_40.jpg",
          "of-kitchen": "ct-NR7_5.jpg", "of-meet": "ct-NR7_6.jpg"}
for k, f in OFFICE.items():
    IMAGES[k] = (f"office/{f}", [640, 1200, 1800], None)
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
SERVICE_IMG = {"editorials": "r-covers-p", "campaigns": "aero-1", "strategies": "akom", "events": "konf", "media": "r-cars-p", "experiences": "merch-6"}
SERVICE_COLLAGE = {
    "editorials": ["cover-kvt", "v-asd", "cover-k26"],
    "campaigns": ["aero-1", "aero-5", "aero-2"],
    "strategies": ["valerie-brand", "j-manazer", "merch-7"],
    "events": ["haso-run", "haso-arch", "aero-6"],
    "media": ["car-skoda-1", "j-compas", "car-raynet-1"],
    "experiences": ["merch-6", "merch-2", "haso-medal"],
}


UPLOAD = re.compile(r"^img/uploads/[\w./-]+\.(webp|jpe?g|png)$")
SHARED = {"work": ("img", "gallery", "card", "sets"), "ventures": ("img", "card", "peek", "gallery", "logo", "url"),
          "services": ("img", "work")}


def load_data():
    """_data/*.json -> COMMON, CZ, EN; fotky z administrace -> IMAGES; EN se páruje s CZ přes slug"""
    rd = lambda n: json.loads((ROOT / "_data" / f"{n}.json").read_text())
    common, cz, en = rd("spolecne"), rd("cs"), rd("en")

    def walk(o):
        if isinstance(o, dict):
            return {k: walk(v) for k, v in o.items()}
        if isinstance(o, list):
            return [walk(v) for v in o]
        if isinstance(o, str) and UPLOAD.match(o):
            if not (ROOT / o).exists():
                return ""
            key = "u-" + re.sub(r"[^a-z0-9-]+", "-", o[len("img/uploads/"):].rsplit(".", 1)[0].lower()).strip("-")
            IMAGES[key] = (str(ROOT / o), [640, 1200, 1800], None)
            return key
        return o
    cz, en = walk(cz), walk(en)

    def fix(items):
        out = []
        for it in items:
            if it.get("skryt"):
                continue
            g = it.get("gallery") or []
            g = [k for k in g if k]
            if "gallery" in it:
                it["gallery"] = g
                al = list(it.get("alts") or [])
                it["alts"] = (al + [""] * len(g))[:len(g)]
            out.append(it)
        return out
    for key in ("work", "ventures"):
        cz[key] = fix(cz[key])
    if en:
        for key, shared in SHARED.items():
            by = {x.get("slug"): x for x in en.get(key, [])}
            merged = []
            for c in cz[key]:
                e = by.get(c["slug"])
                if not e:
                    merged.append(c); continue
                m = {**c, **{k: v for k, v in e.items() if k not in shared and k != "skryt"}}
                if "gallery" in c:
                    al = e.get("alts") or []  # popisky fotek EN podle pořadí, chybějící z CZ
                    m["alts"] = [(al[i] if i < len(al) and al[i] else c["alts"][i]) for i in range(len(c["gallery"]))]
                merged.append(m)
            en[key] = merged
        en["about"]["office_imgs"] = cz["about"].get("office_imgs", en["about"].get("office_imgs"))
    return common, cz, en


def build_partners():
    """černé siluety log partnerů (tools/logo_mono.py) -> dist/img/p/, s opticky vyrovnanou velikostí.
    Seznam, názvy, kategorie a pořadí jsou v _data/partneri.json (administrace); nové logo z administrace
    (img/uploads/…) se převede na siluetu stejným postupem jako ostatní."""
    idx = json.loads((A / "partners" / "index.json").read_text())
    lst = json.loads((ROOT / "_data" / "partneri.json").read_text())
    (DIST / "img" / "p").mkdir(parents=True, exist_ok=True)
    out = {}
    for x in lst:
        if x.get("skryt") or not x.get("name"):
            continue
        slug, logo = x["slug"], x.get("logo") or ""
        if logo and UPLOAD.match(logo) and (ROOT / logo).exists():
            raw = (ROOT / logo).read_bytes()
            c = CACHE / "partners" / f"{h(raw)}.png"; cj = c.with_suffix(".json")
            if not c.exists() or not cj.exists():
                import sys; sys.path.insert(0, str(ROOT / "tools"))
                import logo_mono
                c.parent.mkdir(parents=True, exist_ok=True)
                logo_mono.OUT = c.parent
                try:
                    meta = logo_mono.process(ROOT / logo, c.stem)
                except Exception as e:  # prázdné/nečitelné logo nesmí shodit celý web
                    print("logo přeskočeno:", x.get("name"), e)
                    continue
                cj.write_text(json.dumps(meta))
            m = json.loads(cj.read_text())
            f = c
        else:
            m = idx.get(slug)
            f = A / "partners" / f"{slug}.png"
            if not m or not f.exists():
                continue
        dst = DIST / "img" / "p" / f"{slug}.png"
        shutil.copy(f, dst)
        r = m["w"] / m["h"]
        area = 13.0 * min(1.6, max(.7, (.3 / max(m["ink"], .05)) ** .35))  # hustá loga menší, řídká větší
        w = min(10.5, (area * r) ** .5)
        hh = w / r
        if hh > 4.2:
            hh = 4.2; w = hh * r
        out.setdefault(x["cat"], []).append({"slug": slug, "name": x["name"], "w": m["w"], "h": m["h"], "cw": round(w, 2), "v": h(f.read_bytes())})
    return out


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


def acc(text: str) -> Markup:
    """*x* -> <em>x</em> (jemné zvýraznění barvou), jinak čistý text"""
    t = str(text)
    parts = re.split(r"\*(.+?)\*", t)
    return Markup("".join(str(escape(p)) if i % 2 == 0 else f"<em>{escape(p)}</em>" for i, p in enumerate(parts)))


def nbsp(html: str) -> str:
    """nezlomitelná mezera po jednopísmenných předložkách a spojkách (jen text mimo tagy)"""
    return re.sub(r"(>[^<]*)", lambda m: re.sub(r"(?<=[\s(])([kKsSvVzZoOuUaAiI]) (?=\S)", "\\1\u00a0", m.group(1)), html)


def main():
    COMMON, CZ, EN = load_data()
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
    PARTNERS = build_partners()
    VLOGO = {k: venture_svg(A / f"{k}.svg") for k in ("asd", "dtp", "gryfix", "haso")}
    files = {}
    for f in ("style.css", "app.js"):
        b = (ROOT / f).read_bytes(); (DIST / f).write_bytes(b); files[f] = h(b)
    for f in ("favicon.svg", "og.jpg"):
        if (A / f).exists():
            shutil.copy(A / f, DIST / (f if f.endswith("svg") else "img/" + f)); files[f] = h((A / f).read_bytes())

    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=True, trim_blocks=True, lstrip_blocks=True, extensions=["jinja2.ext.do"])
    env.filters["acc"] = acc
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
                       alt_url=f"{BASE}{alt_pre}{path + '/' if path else ''}", SERVICE_MEDIA=SERVICE_MEDIA, SERVICE_COLLAGE=SERVICE_COLLAGE, SERVICE_IMG=SERVICE_IMG, PARTNERS=PARTNERS)
            ctx.update(kw)
            html = env.get_template(tpl).render(**ctx)
            if t["lang"] == "cs":
                html = nbsp(html)
            out.write_text(html); count += 1
        page("home.html", "")
        if os.environ.get("JEN_HOME"):
            continue
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
    # administrace (cache busting jako na webu) + knihovna fotek pro výběr + verze pro hlídání zveřejnění
    adm = ROOT / "admin"
    if adm.exists():
        shutil.copytree(adm, DIST / "admin")
        (DIST / "admin" / "logo.svg").write_text(LOGO.replace('fill="currentColor"', 'fill="#6B0F1A"'))
        ix = DIST / "admin" / "index.html"
        ix.write_text(ix.read_text().replace("__V_ACSS__", h((adm / "admin.css").read_bytes())).replace("__V_AJS__", h((adm / "admin.js").read_bytes())))
        lib = [{"k": k, "src": f"img/{k}-{v['w'][0]}.webp?v={v['v']}"} for k, v in IMG.items()
               if not k.startswith(("r-", "aero-poster", "p-", "cover-", "u-")) and k not in ("asd-web",)]
        lib = [{"k": k, "src": f"img/{k}-{v['w'][0]}.webp?v={v['v']}"} for k, v in IMG.items() if k.startswith("u-")] + lib
        (DIST / "admin" / "images.json").write_text(json.dumps(lib, ensure_ascii=False))
    up = ROOT / "img" / "uploads"
    if up.exists():
        shutil.copytree(up, DIST / "img" / "uploads")
    (DIST / "version.json").write_text(json.dumps({"sha": os.environ.get("GITHUB_SHA", "local")}))
    (DIST / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    (DIST / ".nojekyll").write_text("")
    (DIST / "404.html").write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={BASE}"><title>Bite Marks Media</title>')
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"hotovo: {count} stránek, {size/1e6:.1f} MB")


if __name__ == "__main__":
    main()
