/* Bite Marks Media – interakce (vanilla, nativní scroll) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desk = matchMedia("(min-width: 900px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const setXY = (el, e, x = "--gx", y = "--gy") => { const r = el.getBoundingClientRect(); el.style.setProperty(x, `${e.clientX - r.left}px`); el.style.setProperty(y, `${e.clientY - r.top}px`); };

  /* header: pevný po odjetí, světlý text nad vínovým lakem */
  const hdr = $("#hdr"), mnav = $("#mnav"), burger = $(".burger");
  const dark = $$(".dark");
  const mb = $(".manifest-big");
  let words = [];
  if (mb) { mb.innerHTML = mb.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" "); words = $$(".w", mb); }
  let tick = false;
  const onScroll = () => {
    tick = false;
    hdr.classList.toggle("is-solid", scrollY > 30);
    const mid = hdr.offsetHeight / 2;
    hdr.classList.toggle("is-dark", !mnav.hidden || dark.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));
    if (words.length) {
      const r = mb.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35)));
      const n = reduce ? words.length : Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }
  };
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
  addEventListener("keydown", e => { if (e.key === "Escape") { if (!mnav.hidden) setMenu(false); document.activeElement?.blur?.(); } });

  /* lak: odlesky za kurzorem */
  $$(".btn-lacquer").forEach(b => b.addEventListener("pointermove", e => setXY(b, e, "--mx", "--my")));
  $$(".vcard").forEach(v => v.addEventListener("pointermove", e => setXY(v, e)));

  /* řádky disciplín: plovoucí náhled za kurzorem */
  const pv = $(".preview"), pvImg = pv && $("img", pv);
  if (pv) {
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const follow = () => { cx += (x - cx) * .18; cy += (y - cy) * .18; pv.style.left = cx + "px"; pv.style.top = cy + "px"; raf = Math.abs(x - cx) + Math.abs(y - cy) > .5 ? requestAnimationFrame(follow) : 0; };
    $$(".row[data-preview]").forEach(r => {
      r.addEventListener("pointerenter", e => { if (!fine.matches) return; pvImg.src = r.dataset.preview; x = cx = e.clientX + 140; y = cy = e.clientY; pv.classList.add("on"); });
      r.addEventListener("pointermove", e => { x = e.clientX + 140; y = e.clientY; if (!raf) raf = requestAnimationFrame(follow); });
      r.addEventListener("pointerleave", () => pv.classList.remove("on"));
    });
  }

  /* Co děláme: sloupce (desktop najetí i klik, mobil klik) */
  const cols = $$(".col");
  let hoverT = 0;
  const openCol = col => cols.forEach(c => { const on = c === col; c.classList.toggle("is-on", on); $(".col-btn", c).setAttribute("aria-expanded", String(on)); });
  cols.forEach(c => {
    $(".col-btn", c).addEventListener("click", () => {
      if (!desk.matches && c.classList.contains("is-on")) { c.classList.remove("is-on"); $(".col-btn", c).setAttribute("aria-expanded", "false"); return; }
      openCol(c);
    });
    c.addEventListener("pointerenter", () => { if (!desk.matches || !fine.matches) return; clearTimeout(hoverT); hoverT = setTimeout(() => openCol(c), 140); });
    c.addEventListener("pointerleave", () => clearTimeout(hoverT));
    c.addEventListener("pointermove", e => setXY(c, e));
  });

  /* vizitka */
  const card = $(".card3d");
  if (card) {
    const flip = () => { card.classList.toggle("is-flipped"); card.setAttribute("aria-pressed", String(card.classList.contains("is-flipped"))); };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    card.addEventListener("pointermove", e => {
      if (!fine.matches || reduce) return;
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--ry", `${(x - .5) * 16}deg`); card.style.setProperty("--rx", `${(.5 - y) * 12}deg`);
      card.style.setProperty("--px", `${x * 100}%`); card.style.setProperty("--py", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  }

  /* práce: filtr */
  const chips = $$(".chip"), items = $$(".fi");
  chips.forEach(ch => ch.addEventListener("click", () => {
    const f = ch.dataset.f;
    chips.forEach(c => c.classList.toggle("is-on", c === ch));
    items.forEach(i => i.classList.toggle("is-out", f !== "*" && i.dataset.d !== f));
  }));

  /* Aero video */
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
  const reader = $("#reader");
  if (reader) {
    const ra = $(".reader-a"), rb = $(".reader-b"), rn = $(".reader-n"), rt = $(".reader-title");
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
    $$("[data-mag]").forEach(b => b.addEventListener("click", () => openR(b.dataset.mag, b.dataset.title)));
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
  }

  /* tým: tři stavy na klik / tap / swipe */
  $$(".person").forEach(p => {
    const tabs = $$(".ptab", p), card = $(".person-card", p);
    const set = s => { s = (s + 3) % 3; p.dataset.state = s; tabs.forEach((t, i) => { t.classList.toggle("is-on", i === s); t.setAttribute("aria-selected", String(i === s)); }); };
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
    if (qn) qn.textContent = qi + 1;
  }));

  /* kontaktní formulář → e-mail s předvyplněnou zprávou */
  const form = $("#cform");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    let ok = true;
    $$("[required]", form).forEach(f => { const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value)); f.closest(".fld").classList.toggle("err", bad); if (bad && ok) { f.focus(); ok = false; } });
    if (!ok) return;
    const d = new FormData(form);
    const interest = d.getAll("interest").join(", ");
    const body = [d.get("msg"), "", `— ${d.get("name")}${d.get("company") ? ", " + d.get("company") : ""}`, d.get("email"), d.get("phone") || "", interest ? `\n(${interest})` : ""].join("\n");
    location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent(form.dataset.subject + (d.get("company") ? " – " + d.get("company") : ""))}&body=${encodeURIComponent(body)}`;
  });
})();
