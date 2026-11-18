/* Alternativní úvody „leave a mark“ – A růžek, B razítko, C slepotisk + podpis */
(() => {
  const sec = document.querySelector(".hv");
  if (!sec) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // jemné zrno papíru (sdílené všemi variantami)
  const grain = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), d = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 90 + Math.random() * 165 | 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 16 + Math.random() * 22 | 0; }
    x.putImageData(d, 0, 0); return c.toDataURL("image/png");
  })();
  document.documentElement.style.setProperty("--grain", `url(${grain})`);
  sec.querySelectorAll(".hv-grain-img").forEach(i => i.setAttribute("href", grain));

  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const textRect = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  // posun od vstupní animace (rise) odečíst, ať měříme konečnou polohu
  const dy = el => { let y = 0; for (let n = el; n && n !== sec; n = n.parentElement) { const t = getComputedStyle(n).transform; if (t && t !== "none") y += new DOMMatrix(t).m42; } return y; };
  const relEl = (el, o, range) => { const r = range ? textRect(el) : el.getBoundingClientRect(), d = dy(el); return { l: r.left - o.left, t: r.top - o.top - d, r: r.right - o.left, b: r.bottom - o.top - d }; };
  const rel = (r, o) => ({ l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top });
  const fontsReady = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1800))]);
  const onResize = fn => { let w = innerWidth, t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (innerWidth !== w || !matchMedia("(max-width: 699px)").matches) { w = innerWidth; fn(); } }, 140); }); };
  const pathD = pts => "M" + pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const rectIn = (poly, r, pad = 0) => { for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { if (inPoly(poly, r.l - pad + (r.r - r.l + 2 * pad) * i / 4, r.t - pad + (r.b - r.t + 2 * pad) * j / 4)) return true; } return false; };
  const rectAllIn = (poly, r) => [[r.l, r.t], [r.r, r.t], [r.l, r.b], [r.r, r.b], [(r.l + r.r) / 2, r.t], [r.l, (r.t + r.b) / 2]].every(([x, y]) => inPoly(poly, x, y));

  /* ---------------------------------------------------------------- A · odtrhnutý růžek */
  function A() {
    const sheet = sec.querySelector(".hva-sheet"), piece = sec.querySelector(".hva-piece"), logo = sec.querySelector(".hva-logo"), disc = sec.querySelector(".hva-disc");
    const grad = sec.querySelector("#hva-pg");
    const R = rng(1977), N = 170;
    const ph = [R() * 6.28, R() * 6.28, R() * 6.28, R() * 6.28];
    const jit = Array.from({ length: N + 1 }, () => R() * 2 - 1);
    const rimW = Array.from({ length: N + 1 }, () => R());
    let torn = false;

    function draw() {
      const mob = innerWidth < 700;
      sec.style.minHeight = "";
      const o = sec.getBoundingClientRect();
      const texts = [
        ...[".hero-k", ".hero-l1", ".hero-lead"].map(s => relEl(sec.querySelector(s), o, true)),
        ...[".hero-l2 .ring", ".hero-l2 .ring-svg", ".hero-cta"].map(s => relEl(sec.querySelector(s), o))
      ];
      const hdr = document.querySelector(".hdr"), hdrB = hdr ? hdr.offsetHeight : 88;
      const footB = Math.max(...texts.map(r => r.b));
      if (mob) sec.style.minHeight = Math.max(innerHeight * .92, footB + 400) + "px";
      const W = sec.clientWidth, H = sec.offsetHeight;
      const ctaR = Math.max(...texts.slice(2).map(r => r.r).concat(texts[4].r));
      let sx = mob ? W * .14 : Math.max(W * .5, Math.min(W * .62, ctaR + 110));
      let ey = mob ? Math.max(footB + 26, H - 380) : Math.max(hdrB + 80, H * .2);

      const curve = (sx, ey) => {
        const S = [sx, H], E = [W, ey], dx = E[0] - S[0], dy = E[1] - S[1], L = Math.hypot(dx, dy);
        const nx = dy / L, ny = -dx / L; // normála ven z růžku (nahoru doleva)
        const C = [(S[0] + E[0]) / 2 + nx * L * .13, (S[1] + E[1]) / 2 + ny * L * .13];
        const pts = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N, u = 1 - t;
          let x = u * u * S[0] + 2 * u * t * C[0] + t * t * E[0], y = u * u * S[1] + 2 * u * t * C[1] + t * t * E[1];
          const env = Math.sin(Math.PI * t);
          const w = L * (.02 * Math.sin(6.283 * 1.15 * t + ph[0]) + .011 * Math.sin(6.283 * 2.9 * t + ph[1]) + .006 * Math.sin(6.283 * 6.3 * t + ph[2])) * env
            + (3.2 * jit[i] + 1.6 * Math.sin(i * 1.7 + ph[3])) * Math.min(1, env * 4);
          x += nx * w; y += ny * w;
          pts.push([x, y]);
        }
        pts[0] = [sx, H]; pts[N] = [W, ey];
        return { pts, nx, ny };
      };

      let c;
      for (let k = 0; k < 60; k++) {
        c = curve(sx, ey);
        const region = [...c.pts, [W + 40, H + 40]];
        if (!texts.some(r => rectIn(region, r, 18))) break;
        sx += W * .015; ey += H * .012;
      }
      const { pts, nx, ny } = c;
      const region = [...pts, [W, H]];

      // okraj: bílá vlákna papíru – měnící se šířka, vyhlazená
      const sm = a => a.map((v, i) => (a[Math.max(0, i - 2)] + a[Math.max(0, i - 1)] + v + a[Math.min(N, i + 1)] + a[Math.min(N, i + 2)]) / 5);
      const rw = sm(rimW).map((v, i) => (3 + v * 9) * Math.min(1, Math.sin(Math.PI * i / N) * 6 + .3));
      const rimPts = pts.map((p, i) => [p[0] - nx * rw[i], p[1] - ny * rw[i]]);
      const rim2Pts = pts.map((p, i) => [p[0] + nx * rw[i] * .45, p[1] + ny * rw[i] * .45]);

      const sheetPoly = (edge) => [[-30, -30], [W + 30, -30], [W + 30, ey], ...edge.slice().reverse(), [edge[0][0], H + 30], [-30, H + 30]];
      const piecePoly = (edge) => [...edge, [W + 30, ey], [W + 30, H + 30], [edge[0][0], H + 30]];
      [sheet, piece].forEach(s => s.setAttribute("viewBox", `0 0 ${W} ${H}`));
      grad.setAttribute("y2", H);
      sheet.querySelector(".hva-rim").setAttribute("d", pathD(sheetPoly(rimPts)));
      sheet.querySelectorAll(".hva-paper").forEach(p => p.setAttribute("d", pathD(sheetPoly(pts))));
      piece.querySelector(".hva-rim2").setAttribute("d", pathD(piecePoly(rim2Pts)));
      piece.querySelectorAll(".hva-paper2").forEach(p => p.setAttribute("d", pathD(piecePoly(pts))));
      piece.style.transformOrigin = `${W}px ${ey}px`;

      // logo do růžku: co největší, nad seznamem služeb
      const dr = rel(disc.getBoundingClientRect(), o);
      sec.classList.remove("no-logo");
      let placed = false;
      for (let s = mob ? 150 : 260; s >= 84 && !placed; s -= 8) {
        const cands = mob
          ? [[dr.l - 26 - s, dr.b - s], [dr.r - s, dr.t - 22 - s]]
          : [[dr.r - s, dr.t - 34 - s], [dr.l - 40 - s, dr.b - s], [(dr.r + Math.max(sx, dr.l - 400)) / 2 - s / 2, dr.t - 34 - s]];
        for (const [lx, ly] of cands) {
          if (rectAllIn(region, { l: lx - 10, t: ly - 10, r: lx + s + 10, b: ly + s + 10 })) {
            Object.assign(logo.style, { left: lx + "px", top: ly + "px", width: s + "px", height: s + "px" }); placed = true; break;
          }
        }
      }
      if (!placed) sec.classList.add("no-logo");
      sec.classList.add("is-ready");
    }

    function tear() {
      if (torn) return; torn = true;
      if (reduce || !piece.animate) { piece.style.display = "none"; sec.classList.add("is-torn"); return; }
      const W = sec.clientWidth, H = sec.offsetHeight;
      const lift = piece.animate([
        { transform: "none", filter: "drop-shadow(0 0 0 rgba(28,2,5,0))" },
        { transform: "translate(7px,-9px) rotate(-2.2deg)", filter: "drop-shadow(10px 18px 16px rgba(28,2,5,.45))", offset: .28, easing: "cubic-bezier(.55,0,.75,.4)" },
        { transform: `translate(${W * .14}px,${H * 1.1}px) rotate(26deg)`, filter: "drop-shadow(18px 30px 26px rgba(28,2,5,.35))" }
      ], { duration: 1500, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
      setTimeout(() => sec.classList.add("is-torn"), 420);
      lift.onfinish = () => { piece.style.display = "none"; };
    }

    fontsReady().then(() => {
      draw();
      setTimeout(tear, reduce ? 0 : 900);
      onResize(draw);
    });

    // lesk laku pod papírem sleduje kurzor
    if (fine && !reduce) {
      let raf = 0, mx = 78, my = 74;
      sec.addEventListener("pointermove", e => {
        const o = sec.getBoundingClientRect();
        mx = (e.clientX - o.left) / o.width * 100; my = (e.clientY - o.top) / o.height * 100;
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; sec.style.setProperty("--mx", mx.toFixed(1) + "%"); sec.style.setProperty("--my", my.toFixed(1) + "%"); });
      });
    }
  }

  /* ---------------------------------------------------------------- B · razítko */
  function B() {
    const stage = sec.querySelector(".hvb-stage"), layer = sec.querySelector(".hvb-stamps"), tpl = sec.querySelector("#hvb-tpl"), ghost = sec.querySelector(".hvb-ghost");
    const hintT = sec.querySelector(".hvb-hint-t");
    if (!fine && hintT) hintT.textContent = "Ťukněte · leave a mark";
    const R = rng(2026); let n = 0;
    const stamps = [];

    function stamp(px, py, rot, first) {
      const svg = tpl.content.firstElementChild.cloneNode(true);
      svg.querySelector(".hvb-ink").setAttribute("filter", `url(#ink${n++ % 3})`);
      svg.style.left = px + "%"; svg.style.top = py + "%";
      svg.style.setProperty("--r", rot + "deg");
      layer.appendChild(svg); stamps.push(svg);
      if (stamps.length > 7) { const old = stamps.shift(); old.classList.add("is-out"); setTimeout(() => old.remove(), 1300); }
      if (!reduce && svg.animate) {
        svg.animate([
          { transform: `translate(-50%,-50%) rotate(${rot - 4}deg) scale(1.55)`, opacity: 0 },
          { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(.97)`, opacity: .95, offset: .62 },
          { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: .94 }
        ], { duration: first ? 520 : 380, easing: "cubic-bezier(.5,0,.75,0)" });
        setTimeout(() => { stage.classList.remove("is-thud"); void stage.offsetWidth; stage.classList.add("is-thud"); }, first ? 320 : 235);
      }
    }

    setTimeout(() => stamp(25, 74, -12, true), reduce ? 0 : 1500);

    stage.addEventListener("click", e => {
      const o = stage.getBoundingClientRect();
      stamp((e.clientX - o.left) / o.width * 100, (e.clientY - o.top) / o.height * 100, -16 + R() * 28);
    });
    if (fine) stage.addEventListener("pointermove", e => {
      const o = stage.getBoundingClientRect();
      ghost.style.left = (e.clientX - o.left) + "px"; ghost.style.top = (e.clientY - o.top) + "px";
    });
  }

  /* ---------------------------------------------------------------- C · slepotisk + podpis */
  function C() {
    const trail = sec.querySelector(".hvc-trail"), path = sec.querySelector(".hvc-path"), mpath = sec.querySelector(".hvc-mpath");
    const foil = sec.querySelector(".hvc-foil"), card = sec.querySelector(".hvc-card"), cardIn = sec.querySelector(".hvc-card-in");
    let drawn = false;

    // Catmull-Rom → kubické Béziery
    const cr = pts => {
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    };

    function draw() {
      const mob = innerWidth < 700;
      const o = sec.getBoundingClientRect(), W = sec.clientWidth, H = sec.offsetHeight;
      const mk = relEl(foil, o), cd = relEl(card, o);
      const cx = (mk.l + mk.r) / 2 - (mk.r - mk.l) * .02, cy = (mk.t + mk.b) / 2 + (mk.b - mk.t) * .05;
      const rx = (mk.r - mk.l) * .58, ry = (mk.b - mk.t) * .56, tilt = -4 * Math.PI / 180;
      const ell = (th, g) => { const x = Math.cos(th) * rx * g, y = Math.sin(th) * ry * g; return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]; };
      // smyčka kolem „mark.“: start vpravo, proti směru hodinových ručiček, 1,15 otáčky, mírně se rozevírá
      const loop = [];
      const th0 = -.55, turns = 1.12;
      for (let i = 0; i <= 44; i++) { const t = i / 44; loop.push(ell(th0 - t * turns * 6.283, 1 + .1 * t)); }
      const tailA = loop[loop.length - 1], tailB = loop[loop.length - 2];
      const tail = [tailA[0] + (tailA[0] - tailB[0]) * 2.4, tailA[1] + (tailA[1] - tailB[1]) * 2.4 + 6];
      let lead;
      if (mob) {
        const s = [cd.l + (cd.r - cd.l) * .3, cd.t + 30];
        lead = [s, [Math.min(W - 24, cx + rx * 1.25), (s[1] + cy) / 2 + 10], [cx + rx * 1.05, cy + ry * .55]];
      } else {
        const s = [cd.l + (cd.r - cd.l) * .32, cd.t + (cd.b - cd.t) * .45];
        const es = loop[0];
        lead = [s, [s[0] - W * .035, s[1] - H * .1], [Math.max(es[0] + W * .09, (s[0] + es[0]) / 2), Math.min(s[1] - H * .16, es[1] - ry * .55)], [es[0] + W * .025, es[1] - ry * .2]];
      }
      const d = cr([...lead, ...loop, tail]);
      trail.setAttribute("viewBox", `0 0 ${W} ${H}`);
      path.setAttribute("d", d); mpath.setAttribute("d", d);
      const L = mpath.getTotalLength();
      mpath.style.strokeDasharray = `${L} ${L}`;
      if (!drawn) {
        drawn = true;
        if (reduce || !mpath.animate) { mpath.style.strokeDashoffset = 0; return; }
        mpath.style.strokeDashoffset = L;
        mpath.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 2600, delay: 900, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" })
          .onfinish = () => { mpath.style.strokeDashoffset = 0; };
      } else mpath.style.strokeDashoffset = 0;
    }
    fontsReady().then(() => { draw(); onResize(draw); });

    // světlo = kurzor: slepotisk i fólie reagují
    if (fine && !reduce) {
      let raf = 0, ev;
      sec.addEventListener("pointermove", e => {
        ev = e;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const o = sec.getBoundingClientRect(), h1 = sec.querySelector(".hero-h1").getBoundingClientRect();
          const dx = (h1.left + h1.width / 2) - ev.clientX, dy = (h1.top + h1.height / 2) - ev.clientY, l = Math.hypot(dx, dy) || 1;
          sec.style.setProperty("--sx", (dx / l * 1.5).toFixed(2));
          sec.style.setProperty("--sy", (dy / l * 1.5).toFixed(2));
          sec.style.setProperty("--gx", ((ev.clientX - o.left) / o.width * 100 * .9 + 5).toFixed(1) + "%");
          const c = card.getBoundingClientRect();
          const px = (ev.clientX - (c.left + c.width / 2)) / innerWidth, py = (ev.clientY - (c.top + c.height / 2)) / innerHeight;
          cardIn.style.setProperty("--ty", (px * 16).toFixed(2) + "deg");
          cardIn.style.setProperty("--tx", (-py * 14).toFixed(2) + "deg");
          cardIn.style.setProperty("--cg", (50 + px * 120).toFixed(1) + "%");
        });
      });
    }
  }

  ({ a: A, b: B, c: C })[sec.dataset.hv]?.();
})();
