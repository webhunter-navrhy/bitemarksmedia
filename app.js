/* Bite Marks Media – interakce (vanilla, nativní scroll) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desk = matchMedia("(min-width: 900px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  
  document.documentElement.classList.add("js");

  /* header: pevný po odjetí, světlý nad lesklým maroon a patičkou */
  const hdr = $("#hdr"), mnav = $("#mnav"), burger = $(".burger");
  const dark = $$(".built, .ftr, .phero-maroon");
  let tick = false;
  const onScroll = () => {
    tick = false;
    hdr.classList.toggle("is-solid", scrollY > 30);
    const mid = hdr.offsetHeight / 2;
    hdr.classList.toggle("is-dark", mnav.hidden && dark.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; }));
  };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* jemné odhalení při scrollu */
  if (!reduce && "IntersectionObserver" in window) {
    const els = $$(".shead, .intro-big, .intro-side, .logos-wrap, .svc, .case, .wtile, .bigq:not(.qslide), .qcar, .pwall-head, .pgroup, .office-head, .of, .of-map, .oi, .built-head, .vrows li, .phil-img, .phil-copy, .person, .post, .row, .items li, .block, .vtile, .member, .qlist figure, .story-photo, .story-copy, .phero-img, .gal figure, .set, .mag, .areas li, .more li");
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * .92) return;
      const sib = el.parentElement ? [...el.parentElement.children].filter(c => els.includes(c)) : [];
      el.style.setProperty("--d", `${Math.min(sib.indexOf(el), 3) * 90}ms`);
      el.classList.add("rv"); io.observe(el);
    });
  }

  /* karusel citací: šipky, tečky, swipe, autoplay (pauza při najetí/fokusu, mimo obrazovku a při reduced-motion) */
  $$("[data-qcar]").forEach(car => {
    const slides = $$(".qslide", car), dots = $$(".qcar-dot", car);
    if (slides.length < 2) return;
    let i = 0, timer = 0, hold = false, seen = false;
    const go = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle("is-on", k === i); s.setAttribute("aria-hidden", String(k !== i)); });
      dots.forEach((d, k) => { d.classList.toggle("is-on", k === i); d.setAttribute("aria-current", String(k === i)); });
    };
    const stop = () => { clearInterval(timer); timer = 0; };
    const play = () => { stop(); if (!reduce && !hold && seen) timer = setInterval(() => go(i + 1), 7000); };
    $$(".qcar-btn", car).forEach(b => b.addEventListener("click", () => { go(i + +b.dataset.dir); play(); }));
    dots.forEach(d => d.addEventListener("click", () => { go(+d.dataset.i); play(); }));
    car.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { hold = true; stop(); } });
    car.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hold = false; play(); } });
    car.addEventListener("focusin", () => { hold = true; stop(); });
    car.addEventListener("focusout", () => { hold = false; play(); });
    let sx = 0, sy = 0;
    car.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    car.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { go(i + (dx < 0 ? 1 : -1)); play(); }
    }, { passive: true });
    car.addEventListener("keydown", e => { if (e.key === "ArrowRight") { go(i + 1); play(); } if (e.key === "ArrowLeft") { go(i - 1); play(); } });
    if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(e => { seen = e.isIntersecting; seen ? play() : stop(); })).observe(car);
    go(0);
  });

  /* Built by: náhled fotky za kurzorem */
  const peek = $(".vpeek");
  if (peek) {
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const follow = () => { cx += (x - cx) * .16; cy += (y - cy) * .16; peek.style.left = cx + "px"; peek.style.top = cy + "px"; raf = Math.abs(x - cx) + Math.abs(y - cy) > .5 ? requestAnimationFrame(follow) : 0; };
    $$(".vrow").forEach(r => {
      r.addEventListener("pointerenter", e => { if (!fine.matches || !r.dataset.img) return; peek.src = r.dataset.img; x = cx = e.clientX + 170; y = cy = e.clientY; peek.classList.add("on"); });
      r.addEventListener("pointermove", e => { x = e.clientX + 170; y = e.clientY; if (!raf) raf = requestAnimationFrame(follow); });
      r.addEventListener("pointerleave", () => peek.classList.remove("on"));
    });
  }

  const setMenu = open => {
    burger.setAttribute("aria-expanded", String(open));
    mnav.hidden = !open;
    document.documentElement.style.overflow = open ? "hidden" : "";
    onScroll();
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", mnav).forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape") { if (!mnav.hidden) setMenu(false); document.activeElement?.blur?.(); } });

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

  /* kontaktní formulář → backend webhunter-admin (uloží do administrace + e-mail); při výpadku e-mail s předvyplněnou zprávou */
  const form = $("#cform");
  if (form) {
    const t0 = Date.now(), en = form.dataset.lang === "en";
    const msg = $(".cform-msg", form), btn = $("button[type=submit]", form);
    const say = (text, err) => { msg.textContent = text; msg.hidden = false; msg.classList.toggle("is-err", !!err); };
    const mailto = d => {
      const interest = d.getAll("interest").join(", ");
      const body = [d.get("msg"), "", `— ${d.get("name")}${d.get("company") ? ", " + d.get("company") : ""}`, d.get("email"), d.get("phone") || "", interest ? `\n(${interest})` : ""].join("\n");
      return `mailto:${form.dataset.mail}?subject=${encodeURIComponent(form.dataset.subject + (d.get("company") ? " – " + d.get("company") : ""))}&body=${encodeURIComponent(body)}`;
    };
    form.addEventListener("submit", async e => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach(f => { const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value)); f.closest(".fld").classList.toggle("err", bad); if (bad && ok) { f.focus(); ok = false; } });
      if (!ok) return;
      const d = new FormData(form);
      const fields = { "Jméno": d.get("name"), "Firma": d.get("company"), "E-mail": d.get("email"), "Telefon": d.get("phone"), "Zájem": d.getAll("interest").join(", "), "Zpráva": d.get("msg") };
      btn.disabled = true; msg.hidden = true;
      try {
        const r = await fetch(form.dataset.api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "dopyt", fields, page: location.href.split("#")[0], hp: d.get("website") || "", ms: Date.now() - t0, lang: en ? "en" : "cs" }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { const er = new Error(j.error || ""); er.user = r.status >= 400 && r.status < 500 && r.status !== 404; throw er; }
        form.reset();
        say(en ? "Thank you, your message has been sent. We will get back to you soon." : "Děkujeme, zpráva odešla. Brzy se vám ozveme.");
      } catch (er) {
        if (er.user && er.message && !en) say(er.message, true);
        else {
          say(en ? "The message could not be sent. We are opening your email app instead – just press send." : "Zprávu se nepodařilo odeslat. Otevíráme proto váš e-mail s předvyplněnou zprávou – stačí ji odeslat.", true);
          setTimeout(() => { location.href = mailto(d); }, 900);
        }
      } finally { btn.disabled = false; }
    });
  }
})();
