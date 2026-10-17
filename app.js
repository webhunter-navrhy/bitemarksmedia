/* Bite Marks Media – malé vanilla interakce, nativní scroll */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* header: pevný stav po odjetí z hero, tmavá varianta nad vínovou sekcí */
  const hdr = $("#hdr");
  const darkSecs = $$(".built");
  const navLinks = $$(".hdr-nav a");
  const secs = navLinks.map(a => $(a.getAttribute("href"))).filter(Boolean);
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    hdr.classList.toggle("is-solid", y > 40);
    const mid = hdr.offsetHeight / 2;
    const menuOpen = !document.getElementById("mnav").hidden;
    hdr.classList.toggle("is-dark", menuOpen || darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));
    let cur = null;
    for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * .4) cur = s;
    navLinks.forEach(a => a.classList.toggle("is-on", cur && a.getAttribute("href") === "#" + cur.id));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* mobilní menu */
  const burger = $(".burger"), mnav = $("#mnav");
  const setMenu = open => {
    burger.setAttribute("aria-expanded", open);
    mnav.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    hdr.classList.toggle("is-dark", open);
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("#mnav a[href^='#']").forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape" && !mnav.hidden) setMenu(false); });

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: .12 });
  $$(".rv:not(.hero .rv), .touch").forEach(el => io.observe(el));

  /* dashed stopa pod intro: kreslí se scrollem */
  const trail = $(".trail-intro path");
  if (trail && !reduce) {
    const sec = trail.closest("section");
    const draw = () => {
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .9)));
      trail.ownerSVGElement.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`;
    };
    addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true }); draw();
  }

  /* What we do: index + sticky obraz (desktop), akordeon (mobil) */
  const items = $$(".svc-item"), figs = $$(".svc-fig"), count = $(".svc-count");
  const desk = matchMedia("(min-width: 900px)");
  const setSvc = (key, fromHover) => {
    items.forEach((it, i) => {
      const on = it.dataset.key === key;
      if (on && count) count.textContent = String(i + 1).padStart(2, "0");
      if (!fromHover || desk.matches) {
        it.classList.toggle("is-on", on);
        $(".svc-btn", it).setAttribute("aria-expanded", on);
      }
    });
    figs.forEach(f => f.classList.toggle("is-on", f.dataset.key === key));
  };
  items.forEach(it => {
    const btn = $(".svc-btn", it);
    btn.addEventListener("click", () => {
      if (!desk.matches && it.classList.contains("is-on")) { it.classList.remove("is-on"); btn.setAttribute("aria-expanded", "false"); return; }
      setSvc(it.dataset.key);
    });
    it.addEventListener("mouseenter", () => { if (desk.matches && matchMedia("(hover: hover)").matches) setSvc(it.dataset.key, true); });
  });

  /* Aero video: přehrát potichu, když je vidět; tlačítko zvuku */
  const v = $("#aeroVideo");
  if (v) {
    const vio = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        if (!reduce) v.play().catch(() => {});
      } else v.pause();
    }, { threshold: .35 });
    vio.observe(v);
    const sb = $(".sound");
    sb.addEventListener("click", () => {
      if (!v.src) v.src = v.dataset.src;
      v.muted = !v.muted;
      if (!v.muted) { v.currentTime = 0; v.play().catch(() => {}); }
      sb.setAttribute("aria-pressed", String(!v.muted));
    });
  }

  /* časopisy: hover propojení seznam <-> obálka, čtečka stránek */
  $$(".mag-link").forEach(l => {
    const mag = $(`.mag[data-mag="${l.dataset.mag}"]`);
    l.addEventListener("mouseenter", () => mag.classList.add("is-hot"));
    l.addEventListener("mouseleave", () => mag.classList.remove("is-hot"));
  });
  $$(".mag").forEach(m => {
    const l = $(`.mag-link[data-mag="${m.dataset.mag}"]`);
    m.addEventListener("mouseenter", () => l.classList.add("is-hot"));
    m.addEventListener("mouseleave", () => l.classList.remove("is-hot"));
  });
  const reader = $("#reader"), ra = $(".reader-a"), rb = $(".reader-b"), rn = $(".reader-n"), rt = $(".reader-title");
  const prev = $(".reader-prev"), next = $(".reader-next");
  const N = 16;
  let mag = null, page = 1, lastFocus = null;
  const one = () => !desk.matches;
  const src = p => `${BMM.base}img/pages/${mag}-${String(p).padStart(2, "0")}.webp?v=${BMM.pagesV}`;
  const render = () => {
    // titulní strana sama, pak dvojstrany 2-3, 4-5 … (na mobilu po jedné)
    const spread = $(".reader-spread");
    spread.style.animation = "none"; void spread.offsetWidth; spread.style.animation = "";
    ra.src = src(page); ra.alt = `${rt.textContent} – ${BMM.page} ${page}`;
    if (!one() && page > 1 && page < N) { rb.src = src(page + 1); rb.alt = `${rt.textContent} – ${BMM.page} ${page + 1}`; rb.hidden = false; }
    else { rb.removeAttribute("src"); rb.hidden = true; }
    rn.textContent = rb.hidden ? page : `${page}–${page + 1}`;
    prev.disabled = page <= 1;
    next.disabled = one() ? page >= N : (page === 1 ? false : page + 1 >= N);
    // přednačíst další
    [page + 2, page + 3].filter(p => p <= N).forEach(p => { const i = new Image(); i.src = src(p); });
  };
  const go = d => {
    if (one()) page = Math.min(N, Math.max(1, page + d));
    else if (d > 0) page = page === 1 ? 2 : Math.min(N, page + 2);
    else page = page <= 3 ? 1 : page - 2;
    render();
  };
  const openReader = (key, title) => {
    mag = key; page = 1; rt.textContent = title; lastFocus = document.activeElement;
    reader.hidden = false; document.body.style.overflow = "hidden"; render(); $(".reader-x").focus();
  };
  const closeReader = () => { reader.hidden = true; document.body.style.overflow = ""; lastFocus && lastFocus.focus(); };
  $$("[data-mag]").forEach(b => b.addEventListener("click", () => openReader(b.dataset.mag, b.dataset.title)));
  $(".reader-x").addEventListener("click", closeReader);
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  reader.addEventListener("click", e => { if (e.target === reader || e.target.classList.contains("reader-stage")) closeReader(); });
  addEventListener("keydown", e => {
    if (reader.hidden) return;
    if (e.key === "Escape") closeReader();
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });
  let sx = null;
  $(".reader-stage").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  $(".reader-stage").addEventListener("touchend", e => {
    if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  });

  /* People: 3 stavy – hover = mimo kancelář (desktop), klik/tap/swipe = další stav */
  $$(".person").forEach(p => {
    const card = $(".person-card", p), tabs = $$(".ptab", p);
    let state = 0, pinned = false;
    const set = s => {
      state = (s + 3) % 3; p.dataset.state = state;
      tabs.forEach((t, i) => { t.classList.toggle("is-on", i === state); t.setAttribute("aria-selected", i === state); });
      $$(".pst", p).forEach((el, i) => el.setAttribute("aria-hidden", i !== state && !(i === 1 && state === 2)));
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => { pinned = true; set(i); }));
    card.addEventListener("click", e => { if (e.target.closest("a")) return; pinned = true; set(state + 1); });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pinned = true; set(state + 1); } });
    card.addEventListener("mouseenter", () => { if (!pinned && matchMedia("(hover: hover)").matches && state === 0) set(1); });
    card.addEventListener("mouseleave", () => { if (!pinned) set(0); pinned = false; });
    let x0 = null;
    card.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener("touchend", e => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { pinned = true; set(state + (dx < 0 ? 1 : -1)); }
    });
  });

  /* reference: přepínání citací (bez automatické rotace) */
  const qtabs = $$(".qtab"), quotes = $$(".quote");
  qtabs.forEach(t => t.addEventListener("click", () => {
    const q = t.dataset.q;
    qtabs.forEach(x => { const on = x === t; x.classList.toggle("is-on", on); x.setAttribute("aria-selected", on); });
    quotes.forEach(x => { const on = x.dataset.q === q; x.hidden = !on; x.classList.toggle("is-on", on); });
  }));
})();
