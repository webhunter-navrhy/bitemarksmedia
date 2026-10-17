/* Bite Marks Media – interakce (vanilla, nativní scroll) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desk = matchMedia("(min-width: 900px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");

  /* header */
  const hdr = $("#hdr"), mnav = $("#mnav"), burger = $(".burger");
  const dark = $$(".built");
  const links = $$(".hdr-nav a");
  const targets = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
  const words = $$(".manifest-big .w");
  let tick = false;
  const onScroll = () => {
    tick = false;
    hdr.classList.toggle("is-solid", scrollY > 30);
    const mid = hdr.offsetHeight / 2;
    hdr.classList.toggle("is-dark", !mnav.hidden || dark.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));
    let cur = null;
    for (const s of targets) if (s.getBoundingClientRect().top < innerHeight * .45) cur = s;
    links.forEach(a => a.classList.toggle("is-on", !!cur && a.getAttribute("href") === "#" + cur.id));
    // manifest: slova se „propisují“ se scrollem
    if (words.length) {
      const r = words[0].parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      const n = reduce ? words.length : Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }
  };
  // rozdělit manifest na slova
  const mb = $(".manifest-big");
  if (mb) {
    mb.innerHTML = mb.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ");
    words.push(...$$(".w", mb));
  }
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  const setMenu = open => {
    burger.setAttribute("aria-expanded", String(open));
    mnav.hidden = !open;
    document.documentElement.style.overflow = open ? "hidden" : "";
    onScroll();
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", mnav).forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape" && !mnav.hidden) setMenu(false); });

  /* lakové tlačítko: odlesk za kurzorem */
  $$(".btn-lacquer").forEach(b => b.addEventListener("pointermove", e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--mx", `${e.clientX - r.left}px`);
    b.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* What we do: sloupce (desktop: najetí i klik, mobil: jen klik) */
  const cols = $$(".col");
  let hoverT = 0;
  const openCol = col => cols.forEach(c => {
    const on = c === col;
    c.classList.toggle("is-on", on);
    $(".col-btn", c).setAttribute("aria-expanded", String(on));
  });
  cols.forEach(c => {
    $(".col-btn", c).addEventListener("click", () => {
      if (!desk.matches && c.classList.contains("is-on")) { c.classList.remove("is-on"); $(".col-btn", c).setAttribute("aria-expanded", "false"); return; }
      openCol(c);
    });
    c.addEventListener("pointerenter", () => {
      if (!desk.matches || !fine.matches) return;
      clearTimeout(hoverT); hoverT = setTimeout(() => openCol(c), 140);
    });
    c.addEventListener("pointerleave", () => clearTimeout(hoverT));
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--gx", `${e.clientX - r.left}px`);
      c.style.setProperty("--gy", `${e.clientY - r.top}px`);
    });
  });

  /* vizitka: náklon za kurzorem, klik = otočit */
  const card = $(".card3d");
  if (card) {
    const flip = () => { card.classList.toggle("is-flipped"); card.setAttribute("aria-pressed", String(card.classList.contains("is-flipped"))); };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    card.addEventListener("pointermove", e => {
      if (!fine.matches || reduce) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", `${(x - .5) * 16}deg`);
      card.style.setProperty("--rx", `${(.5 - y) * 12}deg`);
      card.style.setProperty("--px", `${x * 100}%`);
      card.style.setProperty("--py", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  }

  /* ventures: odlesk za kurzorem */
  $$(".v-in").forEach(v => v.addEventListener("pointermove", e => {
    const r = v.getBoundingClientRect();
    v.style.setProperty("--gx", `${e.clientX - r.left}px`);
    v.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }));

  /* Aero video: potichu, když je vidět; zvuk na tlačítko */
  const v = $("#aeroVideo");
  if (v) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!reduce) v.play().catch(() => {}); }
      else if (v.src) v.pause();
    }, { threshold: .3 }).observe(v);
    const sb = $(".sound");
    sb.addEventListener("click", () => {
      if (!v.src) v.src = v.dataset.src;
      v.muted = !v.muted;
      if (!v.muted) { v.currentTime = 0; v.play().catch(() => {}); }
      sb.setAttribute("aria-pressed", String(!v.muted));
    });
  }

  /* čtečka příloh */
  const reader = $("#reader"), ra = $(".reader-a"), rb = $(".reader-b"), rn = $(".reader-n"), rt = $(".reader-title");
  const prev = $(".reader-prev"), next = $(".reader-next"), N = 16;
  let mag = null, page = 1, lastFocus = null;
  const single = () => !desk.matches;
  const src = p => `${BMM.base}img/pages/${mag}-${String(p).padStart(2, "0")}.webp?v=${BMM.pagesV}`;
  const render = () => {
    const sp = $(".reader-spread"); sp.style.animation = "none"; void sp.offsetWidth; sp.style.animation = "";
    ra.src = src(page); ra.alt = `${rt.textContent} – ${BMM.page} ${page}`;
    const two = !single() && page > 1 && page < N;
    if (two) { rb.src = src(page + 1); rb.alt = `${rt.textContent} – ${BMM.page} ${page + 1}`; rb.hidden = false; }
    else { rb.removeAttribute("src"); rb.hidden = true; }
    rn.textContent = two ? `${page}–${page + 1}` : page;
    prev.disabled = page <= 1;
    next.disabled = two ? page + 1 >= N : page >= N;
    [page + 2, page + 3].filter(p => p <= N).forEach(p => { new Image().src = src(p); });
  };
  const go = d => {
    if (single()) page = Math.min(N, Math.max(1, page + d));
    else if (d > 0) page = page === 1 ? 2 : Math.min(N - 1, page + 2);
    else page = page <= 3 ? 1 : page - 2;
    render();
  };
  const openR = (key, title) => { mag = key; page = 1; rt.textContent = title; lastFocus = document.activeElement; reader.hidden = false; document.documentElement.style.overflow = "hidden"; render(); $(".reader-x").focus(); };
  const closeR = () => { reader.hidden = true; document.documentElement.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
  $$(".mag").forEach(b => b.addEventListener("click", () => openR(b.dataset.mag, b.dataset.title)));
  $(".reader-x").addEventListener("click", closeR);
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  $(".reader-stage").addEventListener("click", e => { if (e.target.classList.contains("reader-stage")) closeR(); });
  addEventListener("keydown", e => {
    if (reader.hidden) return;
    if (e.key === "Escape") closeR();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
  let sx = null;
  $(".reader-stage").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  $(".reader-stage").addEventListener("touchend", e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });

  /* lidé: tři stavy jen na klik / tap / swipe (žádné samovolné přepínání) */
  $$(".person").forEach(p => {
    const tabs = $$(".ptab", p), card = $(".person-card", p);
    const set = s => {
      s = (s + 3) % 3; p.dataset.state = s;
      tabs.forEach((t, i) => { t.classList.toggle("is-on", i === s); t.setAttribute("aria-selected", String(i === s)); });
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => set(i)));
    let x0 = null;
    card.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) set(+p.dataset.state + (dx < 0 ? 1 : -1)); });
  });

  /* reference */
  const quotes = $$(".quote"), qn = $(".qcount b");
  let qi = 0;
  $$(".qbtn").forEach(b => b.addEventListener("click", () => {
    qi = (qi + +b.dataset.d + quotes.length) % quotes.length;
    quotes.forEach((q, i) => { q.hidden = i !== qi; q.classList.toggle("is-on", i === qi); });
    qn.textContent = qi + 1;
  }));
})();
