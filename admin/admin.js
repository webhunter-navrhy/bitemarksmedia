/* =====================================================================
   Administrace Bite Marks Media
   Obsah webu je v repozitáři (_data/cs.json, en.json, spolecne.json, partneri.json). Uložení = jeden commit
   přes backend webhunter-admin (Cloudflare Worker, přihlášení heslem); GitHub Action pak web přegeneruje.
   CZ určuje pořadí projektů a fotky, EN jen překládá texty (párování přes slug, viz build.py).
   Fotky: v datech je buď klíč obrázku z webu (např. „asd-022“), nebo cesta nahrané fotky „img/uploads/…webp“.
   Poptávky z kontaktního formuláře ukládá backend (KV), čtou se přes /forms.
   Vzor: administrace VOYAGE / Restaurant Michal.
   ===================================================================== */
'use strict';
(() => {
const CFG = {
  id: 'bitemarksmedia', site: '../',
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.search.includes('local') ? 'http://localhost:8787' : 'https://webhunter-admin.webhunter.workers.dev',
};
const FILES = { cs: '_data/cs.json', en: '_data/en.json', spolecne: '_data/spolecne.json', partneri: '_data/partneri.json' };
const LABEL = { cs: 'české texty', en: 'anglické texty', spolecne: 'kontakty', partneri: 'partneři' };
const SK = 'bmm_admin';
const S = { sess: null, def: false, D: {}, snap: {}, orig: {}, pending: {}, preview: {}, saving: false, lib: null, libMap: {}, forms: null, lang: 'cs' };
try { if (localStorage.getItem(SK + '_lang') === 'en') S.lang = 'en'; } catch {}

/* ---------------------------------------------------------------- ikony */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  work: I('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>'),
  story: I('<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6M9 18h3"/>'),
  quote: I('<path d="M7 17c-2 0-3-1.5-3-3.5C4 10 6 7 9 6M17 17c-2 0-3-1.5-3-3.5 0-3.5 2-6.5 5-7.5"/>'),
  layers: I('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  spark: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  book: I('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>'),
  users: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.3.3 4 2.2 4.5 5.4"/>'),
  grid: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  phone: I('<path d="M4 6l8 6 8-6"/><rect x="3" y="5" width="18" height="14" rx="2"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  text: I('<path d="M5 6h14M5 11h14M5 16h9"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.8 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.8-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3.3 14a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.8 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 3.3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.8 1.2 2 2 0 1 1 2.8 2.8A1.7 1.7 0 0 0 20.7 10a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.3 1z"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/>'),
  ext: I('<path d="M14 4h6v6M20 4L10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  left: I('<path d="M15 18l-6-6 6-6"/>'),
  right: I('<path d="M9 18l6-6-6-6"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  chev: I('<path d="M6 9l6 6 6-6"/>'),
  eye: I('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  upload: I('<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  inbox: I('<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
  refresh: I('<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>'),
};
const LOGO = '<img src="logo.svg" alt="Bite Marks Media">';

/* ---------------------------------------------------------------- utils */
const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 8);
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\*/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const UPL = /^img\/uploads\//;
const imgSrc = (k) => !k ? '' : S.preview[k] || (/^(https?:|blob:|data:)/.test(k) ? k : /^img\//.test(k) ? CFG.site + k : S.libMap[k] ? CFG.site + S.libMap[k] : '');
const plural = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);
const clone = (o) => JSON.parse(JSON.stringify(o));
const T = () => S.D[S.lang];
const EN = () => S.lang === 'en';

function h(sel, props = {}, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
function toast(title, sub = '', type = '') {
  const el = h('div.toast' + (type ? '.' + type : ''), {}, h('b', {}, title), sub ? h('small', {}, sub) : null);
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, type === 'err' ? 7000 : 4000);
}
function modal({ title, body, actions = [] }) {
  return new Promise((resolve) => {
    const close = (v) => { bg.remove(); resolve(v); };
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('h2', {}, title));
    if (typeof body === 'string') box.append(h('div', { html: body })); else if (body) box.append(body);
    box.append(h('div.modal-actions', {}, actions.map((a) => h('button.btn' + (a.cls ? '.' + a.cls : ''), { type: 'button', onclick: () => close(typeof a.value === 'function' ? a.value(box) : a.value) }, a.label))));
    const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg) close(null); } }, box);
    $('#modal-root').append(bg);
    const f = box.querySelector('input,textarea,select,button.btn-primary'); if (f) setTimeout(() => f.focus(), 50);
  });
}
const confirmDlg = (title, text, ok = 'Smazat', cls = 'btn-dark') => modal({ title, body: `<p>${esc(text)}</p>`, actions: [{ label: 'Zrušit', value: false }, { label: ok, cls, value: true }] }).then((v) => v === true);

/* ---------------------------------------------------------------- API */
const b64e = (bytes) => { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const utf8b64 = (str) => b64e(new TextEncoder().encode(str));
function saveSess() { localStorage.setItem(SK, JSON.stringify({ t: S.sess, def: S.def, exp: Date.now() + 11.5 * 3600e3 })); }
async function api(path, opt = {}, retried = false) {
  const headers = { ...(typeof opt.body === 'string' ? { 'Content-Type': 'application/json' } : {}) };
  if (S.sess) headers.Authorization = 'Bearer ' + S.sess;
  let r;
  try { r = await fetch(`${CFG.api}/api/${CFG.id}${path}`, { ...opt, headers, cache: 'no-store' }); }
  catch { throw new Error('Nelze se spojit se serverem. Zkontrolujte připojení k internetu.'); }
  if (r.status === 401 && path !== '/login' && !retried && S.D.cs) { if (await reauth()) return api(path, opt, true); }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error || m; } catch {} const e = new Error(m); e.status = r.status; throw e; }
  return opt.raw ? r.text() : r.json();
}
const readFile = (p) => api('/file?path=' + encodeURIComponent(p) + '&t=' + Date.now(), { raw: true });
async function commit(files, message) {
  const out = []; const queue = [...files];
  const worker = async () => { while (queue.length) { const f = queue.shift(); const { sha } = await api('/blob', { method: 'POST', body: JSON.stringify({ content: f.b64 ?? utf8b64(f.content), encoding: 'base64' }) }); out.push({ path: f.path, sha }); } };
  await Promise.all([worker(), worker(), worker()]);
  return (await api('/commit', { method: 'POST', body: JSON.stringify({ files: out, message }) })).sha;
}
async function reauth() {
  const inp = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Heslo' });
  const pw = await modal({ title: 'Přihlášení vypršelo', body: h('div', {}, h('p', {}, 'Zadejte prosím heslo znovu — rozdělaná práce zůstane zachovaná.'), inp), actions: [{ label: 'Zrušit', value: null }, { label: 'Přihlásit', cls: 'btn-primary', value: () => inp.value }] });
  if (!pw) return false;
  try { const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); S.sess = r.token; S.def = r.def; saveSess(); return true; }
  catch (e) { toast('Přihlášení se nepovedlo', e.message, 'err'); return false; }
}

/* ---------------------------------------------------------------- data */
async function loadAll() {
  const keys = Object.keys(FILES);
  const [res] = await Promise.all([Promise.all(keys.map((k) => readFile(FILES[k]).then(JSON.parse))), library()]);
  keys.forEach((k, i) => { S.D[k] = res[i]; S.orig[k] = JSON.stringify(res[i]); });
  snapshot();
}
/* prázdné texty a seznamy se při porovnání ignorují – samotné otevření formuláře není změna */
const norm = (o) => JSON.stringify(o, (k, v) => (k && (v === '' || (Array.isArray(v) && !v.length)) ? undefined : v));
function snapshot(keys = Object.keys(FILES)) { keys.forEach((k) => { S.snap[k] = norm(S.D[k]); }); }
const dirtyKeys = () => Object.keys(FILES).filter((k) => S.D[k] && norm(S.D[k]) !== S.snap[k]);
const changed = debounce(() => updateSavebar(), 100);
window.addEventListener('beforeunload', (e) => { if (dirtyKeys().length) { e.preventDefault(); e.returnValue = ''; } });

const SPECIAL = ['forbes', 'aero', 'socialni-site', 'asd-fest', 'merchandise'];
const RESERVED = new Set([...SPECIAL, 'hasobeh', 'drzime-ti-palce', 'gryfix']);
function ensureSlug(w, list) {
  if (w.slug) return w.slug;
  let s = slugify(w.title || w.client) || 'projekt-' + uid();
  while (RESERVED.has(s) || list.some((x) => x !== w && x.slug === s)) s = s + '-' + uid();
  w.slug = s; return s;
}
const quoteEmpty = (q) => !q || !q.some((x) => String(x || '').trim());
function validate() {
  const cz = S.D.cs, en = S.D.en;
  for (const w of cz.work) {
    if (!String(w.title || '').trim()) return 'Jeden projekt nemá nadpis.';
    ensureSlug(w, cz.work);
    if (!w.skryt && !SPECIAL.includes(w.slug) && !w.img) return `Projekt „${w.title.replace(/\*/g, '')}“ nemá hlavní fotku (nebo ho skryjte).`;
  }
  if (cz.work.filter((w) => !w.skryt).length < 4) return 'Na webu musí zůstat aspoň 4 viditelné projekty – úvodní stránka jich ukazuje čtyři.';
  for (const L of [cz, en]) {
    for (const it of [...L.work, ...L.ventures]) { if (it.quote && quoteEmpty(it.quote)) delete it.quote; if (it.link && !String(it.link[1] || '').trim()) delete it.link; }
    for (const p of L.posts) { if (!String(p[3] || '').trim()) return `Jeden článek v Journalu (${L === cz ? 'česky' : 'anglicky'}) nemá titulek.`; if (!p[0]) return `Článek „${p[3]}“ nemá fotku.`; }
    L.about.quotes = L.about.quotes.filter((q) => !quoteEmpty(q));
    if (!L.posts.length) return `Journal (${L === cz ? 'česky' : 'anglicky'}) musí mít aspoň jeden článek.`;
    if (!L.about.quotes.length) return `Musí zůstat aspoň jedna reference (${L === cz ? 'česky' : 'anglicky'}).`;
  }
  for (const p of S.D.partneri) {
    if (!p.slug) p.slug = 'n-' + (slugify(p.name) || 'logo') + '-' + uid();
    if (!p.skryt && !String(p.name || '').trim()) return 'Jedno logo partnera nemá název.';
    if (!p.skryt && p.slug.startsWith('n-') && !p.logo) return `Partner „${p.name}“ nemá nahrané logo.`;
  }
  const c = S.D.spolecne;
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return 'E-mail v Kontaktech nevypadá správně.';
  c.phone_href = String(c.phone || '').replace(/[^\d+]/g, '');
  return null;
}
async function saveAll() {
  if (!dirtyKeys().length || S.saving) return;
  const err = validate(); if (err) return toast('Nelze uložit', err, 'err');
  S.saving = true; updateSavebar();
  const bar = h('div.progress-line'); document.body.append(bar);
  try {
    const keys2 = dirtyKeys();
    const files = keys2.map((k) => ({ path: FILES[k], content: JSON.stringify(S.D[k], null, 1) + '\n' }));
    const used = JSON.stringify(S.D);
    const imgs = Object.keys(S.pending).filter((p) => used.includes(p));
    imgs.forEach((p) => files.push({ path: p, b64: S.pending[p] }));
    const sha = await commit(files, keys2.map((k) => LABEL[k]).join(', ').replace(/^./, (c) => c.toUpperCase()) + (imgs.length ? ` (+${imgs.length} foto)` : ''));
    imgs.forEach((p) => delete S.pending[p]);
    snapshot(keys2); keys2.forEach((k) => { S.orig[k] = JSON.stringify(S.D[k]); });
    toast('Uloženo', 'Změny se na webu objeví zhruba za 2 minuty.', 'ok');
    watchPublish(sha);
  } catch (e) { toast('Uložení se nepovedlo', e.message, 'err'); }
  finally { S.saving = false; bar.remove(); updateSavebar(); }
}
function discard() { dirtyKeys().forEach((k) => { S.D[k] = JSON.parse(S.orig[k]); }); updateSavebar(); route(); toast('Změny zahozeny'); }

/* publikace — čeká, až version.json na webu obsahuje nový commit */
let pubTimer = null;
function setPub(state, text) { const el = $('.pub'); if (el) { el.className = 'pub ' + state; el.innerHTML = `<i></i><span>${esc(text)}</span>`; } }
function watchPublish(sha) {
  localStorage.setItem(SK + '_pub', JSON.stringify({ sha, t: Date.now() }));
  clearInterval(pubTimer); setPub('busy', 'Zveřejňuji změny…');
  const t0 = Date.now();
  pubTimer = setInterval(async () => {
    try {
      const v = await fetch(CFG.site + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
      if (v.sha === sha) { clearInterval(pubTimer); localStorage.removeItem(SK + '_pub'); setPub('', 'Web je aktuální'); S.lib = null; library(); toast('Změny jsou na webu', 'Web byl právě aktualizován.', 'ok'); return; }
    } catch {}
    if (Date.now() - t0 > 10 * 60000) { clearInterval(pubTimer); setPub('warn', 'Zveřejnění trvá déle'); }
  }, 6000);
}
function initPub() { const p = JSON.parse(localStorage.getItem(SK + '_pub') || 'null'); if (p && Date.now() - p.t < 12 * 60000) watchPublish(p.sha); else setPub('', 'Web je aktuální'); }

/* ---------------------------------------------------------------- fotky */
async function compress(file, max = 2000) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error(`Soubor „${file.name}“ nejde načíst. Použijte fotku JPG, PNG nebo WebP (fotky z iPhonu ve formátu HEIC nejdřív uložte jako JPG).`); }
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
  if (!blob || blob.type !== 'image/webp') throw new Error('Tento prohlížeč neumí fotku převést. Zkuste prosím Chrome, Safari nebo Edge.');
  return { blob, w: c.width, h: c.height };
}
async function upload(file, hint, max) {
  const { blob } = await compress(file, max);
  const d = new Date();
  const name = (slugify(hint) || slugify(file.name.replace(/\.[^.]+$/, '')) || 'foto').slice(0, 40);
  const path = `img/uploads/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}/${name}-${uid()}.webp`;
  S.pending[path] = b64e(await blob.arrayBuffer());
  S.preview[path] = URL.createObjectURL(blob);
  return path;
}
async function library() {
  if (!S.lib) {
    try { S.lib = await fetch(CFG.site + 'admin/images.json?t=' + Date.now()).then((r) => r.json()); } catch { S.lib = []; }
    S.libMap = Object.fromEntries(S.lib.map((x) => [x.k, x.src]));
  }
  return [...Object.keys(S.pending), ...S.lib.map((x) => x.k)];
}
async function pickFromLibrary(title = 'Vybrat fotku z webu') {
  const list = await library();
  return new Promise((resolve) => {
    let done = false;
    const grid = h('div.lib', {}, list.map((p) => h('button', { type: 'button', title: p, onclick: () => { done = true; resolve(p); document.querySelector('.modal-bg')?.remove(); } }, h('img', { src: imgSrc(p), loading: 'lazy', alt: '' }))));
    modal({ title, body: grid, actions: [{ label: 'Zavřít', value: null }] }).then(() => { if (!done) resolve(null); });
  });
}
function filePick(multiple) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: 'image/*', multiple, hidden: true, onchange: () => { resolve([...inp.files]); inp.remove(); } });
    document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 120000);
  });
}

/* ---------------------------------------------------------------- pole formulářů */
const bump = () => changed();
function fText(obj, key, label, o = {}) {
  const inp = o.multi
    ? h('textarea', { rows: o.rows || 4, placeholder: o.ph || '', oninput: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } })
    : h('input', { type: o.type || 'text', placeholder: o.ph || '', inputmode: o.inputmode, autocomplete: 'off', oninput: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } });
  inp.value = obj[key] ?? '';
  return h('label.field', {}, h('span', {}, label), inp, o.hint ? h('small', {}, o.hint) : null);
}
function fSelect(obj, key, label, options, o = {}) {
  if (obj[key] != null && obj[key] !== '' && !options.some(([v]) => String(v) === String(obj[key]))) options = [[obj[key], String(obj[key])], ...options];
  const sel = h('select', { onchange: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } }, options.map(([v, t]) => h('option', { value: v }, t)));
  sel.value = String(obj[key] ?? options[0][0]);
  return h('label.field', {}, h('span', {}, label), sel, o.hint ? h('small', {}, o.hint) : null);
}
function fCheck(obj, key, label, on) {
  return h('label.check', {}, h('input', { type: 'checkbox', checked: obj[key], onchange: (e) => { if (e.target.checked) obj[key] = true; else delete obj[key]; bump(); on?.(); } }), h('span', {}, label));
}
/** jedna fotka: obj[key] = klíč obrázku nebo cesta nahrané fotky */
function fImg(obj, key, label, o = {}) {
  const prev = h('img.prev', { src: imgSrc(obj[key]), alt: '' });
  const set = (k) => { obj[key] = k; prev.src = imgSrc(k); bump(); o.on?.(); };
  return h('div.field', {}, h('span', {}, label),
    h('div.img-field', {}, prev, h('div.acts', {},
      h('button.btn.btn-sm', { type: 'button', html: IC.upload + 'Nahrát novou', onclick: async () => {
        const [f] = await filePick(false); if (!f) return;
        try { set(await upload(f, o.name || label, o.max)); toast('Fotka připravena', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
      } }),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: async () => { const p = await pickFromLibrary(); if (p) set(p); }, html: IC.image + 'Vybrat z webu' }))),
    o.hint ? h('small', {}, o.hint) : null);
}
/** galerie projektu (CZ): it.gallery = klíče/cesty, it.alts = popisky; stejné přesuny se promítnou do popisků EN verze */
function fGallery(it, enIt, o = {}) {
  it.gallery = it.gallery || []; it.alts = it.alts || [];
  const pad = (a) => { while (a.length < it.gallery.length) a.push(''); };
  const arrs = () => [it.gallery, it.alts, ...(enIt ? [enIt.alts = enIt.alts || []] : [])];
  const wrap = h('div');
  const move = (i, j) => { arrs().forEach((a) => { pad(a); a.splice(j, 0, a.splice(i, 1)[0]); }); bump(); render(); };
  const del = (i) => { arrs().forEach((a) => { pad(a); a.splice(i, 1); }); bump(); render(); };
  const add = (k) => { arrs().forEach(pad); it.gallery.push(k); it.alts.push(''); if (enIt) enIt.alts.push(''); };
  const render = () => {
    pad(it.alts);
    const grid = h('div.photos');
    it.gallery.forEach((k, i) => {
      const alt = h('textarea', { rows: 2, placeholder: 'Popis fotky (co je na ní)', 'aria-label': 'Popis fotky', oninput: (e) => { it.alts[i] = e.target.value; bump(); } }); alt.value = it.alts[i] || '';
      grid.append(h('div.photo', {}, h('img', { src: imgSrc(k), alt: '', title: 'Vyměnit fotku', onclick: () => replace(i) }),
        h('div.ph-tools', {},
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dopředu', 'aria-label': 'Posunout dopředu', disabled: i === 0, onclick: () => move(i, i - 1), html: IC.left }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat fotku', 'aria-label': 'Smazat fotku', onclick: async () => { if (await confirmDlg('Smazat fotku?', 'Fotka zmizí z webu (po uložení).')) del(i); }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dozadu', 'aria-label': 'Posunout dozadu', disabled: i === it.gallery.length - 1, onclick: () => move(i, i + 1), html: IC.right })),
        alt));
    });
    grid.append(h('button.photo-add', { type: 'button', html: IC.upload + '<span>Nahrát fotky<br><small>můžete vybrat víc najednou</small></span>', onclick: async () => {
      const fs = await filePick(true); let n = 0;
      for (const f of fs) { try { add(await upload(f, o.name || 'foto')); n++; } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); } }
      if (n) { bump(); render(); toast(n === 1 ? 'Fotka přidána' : `Přidáno ${n} fotek`, 'Doplňte popis a uložte změny.'); }
    } }));
    grid.append(h('button.photo-add', { type: 'button', html: IC.image + '<span>Vybrat z fotek na webu</span>', onclick: async () => { const p = await pickFromLibrary(); if (p) { add(p); bump(); render(); } } }));
    wrap.replaceChildren(grid);
  };
  const replace = async (i) => {
    const r = await modal({ title: 'Vyměnit fotku', body: '<p>Nahrajte novou fotku, nebo vyberte některou z fotek, které už na webu jsou. Popis fotky zůstane.</p>', actions: [{ label: 'Zrušit', value: null }, { label: 'Vybrat z webu', value: 'lib' }, { label: 'Nahrát novou', cls: 'btn-primary', value: 'up' }] });
    if (r === 'lib') { const p = await pickFromLibrary(); if (p) { it.gallery[i] = p; bump(); render(); } }
    if (r === 'up') { const [f] = await filePick(false); if (f) { try { it.gallery[i] = await upload(f, o.name || 'foto'); bump(); render(); toast('Fotka vyměněna', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); } } }
  };
  render();
  return wrap;
}
/** EN: popisky fotek k CZ galerii */
function fAlts(czIt, enIt) {
  enIt.alts = enIt.alts || [];
  return h('div.alts', {}, (czIt.gallery || []).map((k, i) => {
    const t = h('textarea', { rows: 2, placeholder: czIt.alts?.[i] || 'Photo description', oninput: (e) => { enIt.alts[i] = e.target.value; bump(); } });
    t.value = enIt.alts[i] || '';
    return h('div', {}, h('img', { src: imgSrc(k), alt: '' }), t);
  }));
}
/** seznam položek s rozbalováním, řazením a mazáním */
function fList(arr, o) {
  const wrap = h('div');
  const render = (openIdx = -1) => {
    wrap.replaceChildren();
    const items = h('div.items');
    if (!arr.length) items.append(h('p.empty', {}, o.empty || 'Zatím tu nic není.'));
    arr.forEach((it, i) => {
      const title = h('b'), sub = h('small'), thumb = o.thumb ? h('img.thumb', { alt: '' }) : null;
      const refresh = () => { title.textContent = String(o.title(it) || '').replace(/\*/g, '') || '(bez názvu)'; sub.textContent = o.sub ? o.sub(it) || '' : ''; if (thumb) { const u = imgSrc(o.thumb(it)); if (u) thumb.src = u; else thumb.removeAttribute('src'); thumb.style.visibility = u ? '' : 'hidden'; } };
      const body = h('div.item-body');
      let built = false;
      const el = h('div.item');
      const toggle = () => { if (!built) { o.body(it, body, refresh, i); built = true; } el.classList.toggle('open'); };
      const head = h('div.item-head', {},
        thumb, h('div.t', { onclick: toggle }, title, sub),
        h('div.item-tools', {},
          o.noSort ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout nahoru', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
          o.noSort ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dolů', 'aria-label': 'Posunout dolů', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.down }),
          o.noDelete ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat', 'aria-label': 'Smazat', onclick: async () => { if (await confirmDlg('Smazat položku?', `„${String(o.title(it) || 'bez názvu').replace(/\*/g, '')}“ bude odstraněna.`)) { arr.splice(i, 1); o.onDelete?.(it); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost.chev', { type: 'button', 'aria-label': 'Rozbalit', onclick: toggle, html: IC.chev })));
      el.append(head, body); items.append(el); refresh();
      if (i === openIdx) toggle();
    });
    wrap.append(...[items, o.make ? h('button.btn.add', { type: 'button', onclick: () => { arr.push(o.make()); bump(); render(arr.length - 1); }, html: IC.plus + (o.addLabel || 'Přidat') }) : null].filter(Boolean));
  };
  render(o.open ?? -1);
  return wrap;
}
/** seznam textů (odrážky / odstavce) */
function fStrList(arr, label, o = {}) {
  const box = h('div.field', {}, h('span', {}, label));
  const list = h('div');
  const render = () => {
    list.replaceChildren(...arr.map((v, i) => {
      const inp = o.multi ? h('textarea', { rows: o.rows || 3 }) : h('input', { type: 'text', placeholder: o.ph || '' });
      inp.value = v; inp.addEventListener('input', (e) => { arr[i] = e.target.value; bump(); });
      return h('div', { style: 'display:flex;gap:.4rem;align-items:flex-start;margin-bottom:.45rem' }, inp,
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat', onclick: () => { arr.splice(i, 1); bump(); render(); }, html: IC.trash }));
    }), h('button.btn.btn-sm', { type: 'button', onclick: () => { arr.push(''); bump(); render(); }, html: IC.plus + (o.add || 'Přidat') }));
  };
  render(); box.append(...[list, o.hint ? h('small', {}, o.hint) : null].filter(Boolean));
  return box;
}
/** seznam dvojic/trojic [nadpis, text, …] */
function fPairs(arr, label, cols, o = {}) {
  return h('div.field', {}, label ? h('span', {}, label) : null, fList(arr, {
    title: (x) => x[0], sub: (x) => x[1], addLabel: o.add || 'Přidat', make: o.fixed ? null : () => cols.map(() => ''), noSort: o.noSort, noDelete: o.fixed,
    body: (x, b, r) => b.append(...cols.map(([lab, multi, ph], j) => fText(x, j, lab, { multi, rows: multi ? (j === 0 ? 4 : 3) : undefined, ph, on: r }))),
  }), o.hint ? h('small', {}, o.hint) : null);
}
/** volitelná citace [text, jméno, firma/role] */
function fQuote(it, label = 'Citace') {
  const box = h('div');
  const render = () => {
    if (!it.quote) return box.replaceChildren(h('button.btn.btn-sm', { type: 'button', html: IC.plus + 'Přidat citaci', onclick: () => { it.quote = ['', '', '']; bump(); render(); } }));
    box.replaceChildren(h('div.field', {}, h('span', {}, label),
      fText(it.quote, 0, 'Text citace', { multi: true, rows: 3 }), row2(fText(it.quote, 1, 'Jméno'), fText(it.quote, 2, 'Firma nebo role')),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', html: IC.trash + 'Odebrat citaci', onclick: () => { delete it.quote; bump(); render(); } })));
  };
  render(); return box;
}
const card = (title, hint, ...kids) => h('section.card', {}, title ? h('h2', {}, title) : null, hint ? h('p.hint', {}, hint) : null, ...kids);
const row2 = (...kids) => h('div.row2', {}, ...kids);
const subH = (t) => h('h3.sub-h', {}, t);
const note = (html) => h('p.note', { html });
const view = (title, lead, ...kids) => { const m = $('main.view'); m.replaceChildren(h('div.view-head', {}, h('h1', {}, title), lead ? h('p', {}, lead) : null), ...kids.filter((k) => k != null && k !== false)); window.scrollTo(0, 0); };
/** textová pole: defs = [[klíč, popisek, 'm' víceřádkové | 't', nápověda]] */
const fields = (obj, defs) => defs.map(([k, label, type, hint]) => { return fText(obj, k, label, { multi: type === 'm', rows: type === 'm' ? 3 : undefined, hint }); });
const ACC = 'Hvězdičkami *takhle* zvýrazníte slova barvou.';
function langBar() {
  return h('div.langbar', { role: 'group', 'aria-label': 'Jazyk' }, [['cs', 'Česky'], ['en', 'English']].map(([l, t]) =>
    h('button' + (S.lang === l ? '.on' : ''), { type: 'button', 'aria-pressed': String(S.lang === l), onclick: () => { S.lang = l; try { localStorage.setItem(SK + '_lang', l); } catch {} route(); } }, t)));
}
/** EN položka spárovaná s CZ přes slug (null = zatím nepřeložená) */
const enOf = (key, cz) => S.D.en[key].find((x) => x.slug && x.slug === cz.slug) || null;
function enCreateBtn(key, cz, after) {
  return h('div', {}, note('Tato položka zatím nemá anglickou verzi – na anglickém webu se ukáže česky.'),
    h('button.btn.btn-primary.btn-sm', { type: 'button', html: IC.plus + 'Vytvořit anglickou verzi', onclick: () => {
      if (key === 'work') ensureSlug(cz, S.D.cs.work);
      const e = clone(cz); ['gallery', 'img', 'card', 'sets', 'skryt'].forEach((k) => delete e[k]);
      S.D.en[key].push(e); bump(); after();
    } }));
}

/* ---------------------------------------------------------------- pohledy */
const NAV = [
  ['', 'Přehled', 'home'], ['poptavky', 'Poptávky', 'inbox'], ['-'],
  ['uvod', 'Úvodní stránka', 'text', 'cs'], ['prace', 'Projekty', 'work', 'cs'], ['pribehy', 'Příběhy klientů', 'story', 'cs'],
  ['reference', 'Reference', 'quote', 'cs'], ['sluzby', 'Služby', 'layers', 'cs'], ['built', 'Built by', 'spark', 'cs'],
  ['journal', 'Journal', 'book', 'cs'], ['onas', 'O nás a kancelář', 'users', 'cs'], ['partneri', 'Partneři a loga', 'grid', 'partneri'],
  ['kontakty', 'Kontakty', 'phone', 'spolecne'], ['seo', 'Vyhledávače', 'search', 'cs'], ['-'],
  ['napoveda', 'Návod', 'help'], ['nastaveni', 'Heslo a odhlášení', 'gear'],
];

function vDash() {
  const tiles = [['poptavky', 'Poptávky', 'inbox', 'Zprávy z kontaktního formuláře'], ['prace', 'Projekty', 'work', 'Case studies, fotky, pořadí'], ['reference', 'Reference', 'quote', 'Citace klientů'],
    ['built', 'Built by', 'spark', 'ASD Fest, Hasoběh a další'], ['journal', 'Journal', 'book', 'Články na úvodní stránce'], ['partneri', 'Partneři', 'grid', 'Loga a kategorie']]
    .map(([id, label, ic, sub]) => h('a.tile', { href: '#/' + id }, h('span', { html: IC[ic] }), h('b', {}, label), h('small', {}, sub)));
  const newBox = h('div');
  view('Dobrý den 👋', 'Tady upravujete web Bite Marks Media: projekty, texty v češtině i angličtině, fotky, reference, loga partnerů a kontakty. Změny uložíte tlačítkem „Uložit změny“ dole – na webu se objeví zhruba za 2 minuty.',
    newBox, h('div.tiles', {}, tiles),
    card('Jak to funguje', null, h('div.help', { html: '<ol><li>Vlevo (na mobilu v menu ☰) vyberte, co chcete upravit.</li><li>U textů nahoře přepnete <b>Česky / English</b> – každý jazyk má vlastní texty.</li><li>Dole se objeví lišta – klikněte na <b>Uložit změny</b>.</li><li>Nahoře uvidíte „Zveřejňuji změny…“ a za chvíli „Web je aktuální“.</li></ol>' })),
    h('a.btn.btn-dark', { href: CFG.site, target: '_blank', rel: 'noopener', style: 'margin-top:.5rem', html: IC.ext + 'Otevřít web' }));
  loadForms().then((d) => { const n = d.forms.filter((f) => f.s === 'nova').length; if (n) newBox.replaceChildren(h('a.alert', { href: '#/poptavky' }, h('span', { html: IC.inbox }), h('b', {}, `${n} ${plural(n, 'nová poptávka', 'nové poptávky', 'nových poptávek')}`), h('small', {}, 'Zobrazit →'))); }).catch(() => {});
}

/* ---------------------------------------------------------------- poptávky (backend KV) */
async function loadForms(force) { if (!S.forms || force) S.forms = await api('/forms'); return S.forms; }
const fmtD = (iso) => { try { return new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
async function vPoptavky() {
  const list = h('div', {}, h('p.empty', {}, 'Načítám…'));
  const filt = { s: '' };
  view('Poptávky', 'Všechno, co návštěvníci odešlou kontaktním formulářem na webu. Kliknutím otevřete detail, změníte stav nebo si připíšete poznámku.',
    h('div', { style: 'display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center' },
      ...[['', 'Vše'], ['nova', 'Nové'], ['potvrzena', 'Rozpracované'], ['vyrizena', 'Vyřízené'], ['zrusena', 'Zrušené']].map(([v, t]) => h('button.btn.btn-sm' + (v === '' ? '.btn-dark' : '.btn-ghost'), { type: 'button', 'data-f': v, onclick: (e) => { filt.s = v; e.target.parentNode.querySelectorAll('[data-f]').forEach((b) => { b.className = 'btn btn-sm ' + (b === e.target ? 'btn-dark' : 'btn-ghost'); }); render(); } }, t)),
      h('button.btn.btn-sm', { type: 'button', style: 'margin-left:auto', onclick: async () => { await loadForms(true).catch((e) => toast('Nepodařilo se načíst', e.message, 'err')); D = S.forms; render(); }, html: IC.refresh + 'Obnovit' })),
    card(null, null, list));
  let D;
  const STAT_CZ = { nova: 'Nová', potvrzena: 'Rozpracovaná', vyrizena: 'Vyřízená', zrusena: 'Zrušená' };
  const render = () => {
    if (!D) return;
    const rows = D.forms.filter((f) => !filt.s || f.s === filt.s);
    if (!rows.length) return list.replaceChildren(h('p.empty', {}, D.forms.length ? 'Tady nic není.' : 'Zatím žádné poptávky. Jakmile někdo odešle formulář na webu, objeví se tady.'));
    list.replaceChildren(h('div.forms', {}, rows.map((f) => h('button.frow' + (f.s === 'nova' ? '.new' : ''), { type: 'button', onclick: () => detail(f.key) },
      h('span.fst.st-' + f.s, {}, STAT_CZ[f.s] || f.s), h('b', {}, f.n || '(bez jména)'),
      h('span', {}, f.w || 'Zpráva z webu'), h('span', {}, ''), h('small', {}, fmtD(f.d))))));
  };
  const detail = async (key) => {
    let r; try { r = await api('/forms?key=' + encodeURIComponent(key)); } catch (e) { return toast('Nepodařilo se načíst', e.message, 'err'); }
    const st = { status: r.status, note: r.note || '' };
    const body = h('div', {},
      h('table.ftable', {}, h('tbody', {},
        ...r.fields.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, /e-?mail/i.test(k) ? h('a', { href: 'mailto:' + v }, v) : /^Telefon/i.test(k) ? h('a', { href: 'tel:' + v.replace(/\s/g, '') }, v) : v))),
        h('tr', {}, h('th', {}, 'Odesláno'), h('td', {}, fmtD(r.created))))),
      fSelect(st, 'status', 'Stav', Object.entries(STAT_CZ)), fText(st, 'note', 'Poznámka (vidíte jen vy)', { multi: true, rows: 3 }));
    const res = await modal({ title: 'Poptávka z webu', body, actions: [{ label: 'Smazat', value: 'del', cls: 'btn-ghost' }, { label: 'Zavřít', value: null }, { label: 'Uložit', cls: 'btn-primary', value: 'save' }] });
    try {
      if (res === 'save') { await api('/forms', { method: 'POST', body: JSON.stringify({ key, status: st.status, note: st.note }) }); toast('Uloženo', '', 'ok'); }
      if (res === 'del' && await confirmDlg('Smazat poptávku?', 'Poptávka bude z přehledu trvale odstraněna.')) { await api('/forms', { method: 'POST', body: JSON.stringify({ key, delete: true }) }); toast('Smazáno'); }
      if (res) { D = await loadForms(true); render(); }
    } catch (e) { toast('Nepodařilo se uložit', e.message, 'err'); }
  };
  try { D = await loadForms(true); render(); } catch (e) { list.replaceChildren(h('p.empty', {}, 'Poptávky se nepodařilo načíst: ' + e.message)); }
}

/* ---------------------------------------------------------------- úvodní stránka */
function vUvod() {
  const H = T().home;
  view('Úvodní stránka', 'Texty úvodní stránky odshora dolů. Projekty, reference, Built by a články se upravují ve vlastních sekcích vlevo.',
    langBar(),
    card('Úvod (velký nadpis)', null, row2(...fields(H, [['line1', 'Nadpis – 1. řádek'], ['line2', 'Nadpis – slovo v kroužku']])), ...fields(H, [['kicker', 'Řádek nad nadpisem'], ['lead', 'Text pod nadpisem', 'm']])),
    card('Představení', null, ...fields(H, [['intro_big', 'Velká věta', 'm'], ['intro_text', 'Text', 'm'], ['intro_link', 'Odkaz na O nás'], ['trust_kicker', 'Štítek nad logy klientů']])),
    card('Co děláme', 'Šest disciplín – jejich texty upravíte v sekci Služby.', ...fields(H, [['services_kicker', 'Štítek'], ['services_title', 'Nadpis']])),
    card('Vybrané projekty', 'Na úvodní stránce se ukazují první čtyři projekty ze sekce Projekty.', ...fields(H, [['work_kicker', 'Štítek'], ['work_title', 'Nadpis']])),
    card('Built by', null, ...fields(H, [['built_kicker', 'Štítek'], ['built_title', 'Nadpis', 'm'], ['built_text', 'Text', 'm']])),
    card('Filozofie', 'Hodnoty pod nadpisem upravíte v sekci O nás.', ...fields(H, [['phil_kicker', 'Štítek'], ['phil_title', 'Nadpis'], ['phil_text', 'Text', 'm']])),
    card('Journal', 'Na úvodní stránce se ukazují první tři články ze sekce Journal.', ...fields(H, [['journal_kicker', 'Štítek'], ['journal_title', 'Nadpis']])),
    card('Výzva dole na každé stránce', null, ...fields(T().ui, [['cta_text', 'Text nad tlačítkem', 'm']])));
}

/* ---------------------------------------------------------------- projekty */
const DISC = [['Editorials', 'Editorials'], ['Campaigns', 'Campaigns'], ['Media', 'Media'], ['Events', 'Events'], ['Experiences', 'Experiences']];
const PHOTO_HINT = {
  aero: 'První 2 fotky jsou vedle videa, ostatní v mřížce pod textem.',
  'asd-fest': 'První fotka je velká nahoře, druhá vedle ní, ostatní v galerii pod textem.',
  merchandise: 'První fotka je velká nahoře, ostatní v mozaice pod textem.',
};
function workTexts(w, r) {
  return [
    fText(w, 'title', 'Nadpis projektu', { on: r, hint: ACC }),
    row2(fText(w, 'client', 'Klient', { on: r }), fText(w, 'year', 'Rok / délka spolupráce', { ph: '2025–2026' })),
    fCheck(w, 'hide_client', 'Nezobrazovat klienta (např. u souhrnných projektů)'),
    row2(fText(w, 'disc', 'Obor (štítek u projektu)', { ph: 'Campaigns', on: r }), fSelect(w, 'cat', 'Filtr na stránce Práce', [['', 'podle oboru'], ...DISC], { hint: 'Pod kterým tlačítkem filtru se projekt ukáže.' })),
    fText(w, 'lead', 'Perex (úvodní text)', { multi: true, rows: 4 }),
    fStrList(w.role = w.role || [], 'Naše role', { add: 'Přidat roli', ph: 'Koncept' }),
    fPairs(w.blocks = w.blocks || [], 'Příběh projektu (bloky)', [['Nadpis bloku', false, 'Výzva'], ['Text', true]], { add: 'Přidat blok' }),
    fQuote(w, 'Citace klienta (nepovinné)'),
  ];
}
function vPrace() {
  const cz = S.D.cs.work;
  const en = EN();
  view('Projekty', 'Case studies na stránce Práce. Pořadí zde = pořadí na webu; první čtyři viditelné jsou i na úvodní stránce. Nový projekt nejdřív připravte jako skrytý a zveřejněte odškrtnutím „Skrýt na webu“.',
    langBar(),
    en ? note('<b>English:</b> překládáte texty projektů. Pořadí, fotky a skrytí se nastavují v české verzi a platí pro oba jazyky.') : null,
    fList(cz, {
      title: (w) => (en ? enOf('work', w)?.title || w.title : w.title) + (w.skryt ? ' · skrytý' : ''),
      sub: (w) => [w.hide_client ? '' : w.client, w.disc, w.year].filter(Boolean).join(' · '),
      thumb: (w) => (w.slug === 'forbes' ? 'img/cover-k26-480.webp' : w.img || (w.gallery || [])[0]), noSort: en, noDelete: en,
      addLabel: en ? null : 'Přidat projekt',
      make: en ? null : () => ({ slug: '', skryt: true, title: 'Nový projekt', client: '', year: String(new Date().getFullYear()), disc: 'Campaigns', cat: '', role: [], lead: '', img: '', blocks: [['Výzva', ''], ['Přístup', ''], ['Výsledek', '']], gallery: [], alts: [] }),
      onDelete: (w) => { const e = enOf('work', w); if (e) S.D.en.work.splice(S.D.en.work.indexOf(e), 1); },
      body: (w, el, r) => {
        if (en) {
          const build = () => { const e = enOf('work', w); el.replaceChildren(...(e ? [...workTexts(e, r), (w.gallery || []).length ? h('div.field', {}, h('span', {}, 'Popisky fotek (English)'), fAlts(w, e)) : null] : [enCreateBtn('work', w, build)])); };
          return build();
        }
        el.append(fCheck(w, 'skryt', 'Skrýt na webu (projekt zatím nebude vidět)', r), ...workTexts(w, r), subH('Fotky'));
        if (w.slug === 'forbes') el.append(note('Tento projekt ukazuje titulní strany a listovatelné přílohy – ty vám rádi vyměníme, stačí poslat PDF.'));
        else if (w.slug === 'socialni-site') el.append(note('Tento projekt ukazuje karusely ze sociálních sítí – nové vám rádi doplníme, stačí poslat obrázky.'));
        else {
          el.append(fImg(w, 'img', 'Hlavní fotka (na kartě projektu' + (SPECIAL.includes(w.slug) ? ')' : ' a nahoře na stránce)'), { on: r, name: w.slug || w.title }));
          el.append(h('div.field', {}, h('span', {}, 'Fotogalerie'), fGallery(w, enOf('work', w), { name: w.slug || 'projekt' }), h('small', {}, PHOTO_HINT[w.slug] || 'Galerie se ukáže pod textem projektu.')));
        }
        if (!SPECIAL.includes(w.slug)) {
          const lk = { u: w.link?.[1] || '', t: w.link?.[0] || '' };
          const setL = () => { if (lk.u.trim() || lk.t.trim()) w.link = [lk.t, lk.u]; else delete w.link; };
          el.append(row2(fText(lk, 'u', 'Odkaz na web projektu (nepovinné)', { type: 'url', ph: 'https://', on: setL }), fText(lk, 't', 'Text odkazu', { ph: 'asdfest.cz', on: setL })));
        }
        el.append(h('p.hint', {}, w.slug ? `Stránka: ${new URL(CFG.site, location.href).href}prace/${w.slug}/` : 'Adresa stránky se vytvoří z nadpisu při uložení.'));
      },
    }));
}

/* ---------------------------------------------------------------- příběhy klientů */
function vPribehy() {
  const P = T().work_page;
  view('Příběhy klientů', 'Seznam dalších spoluprací pod projekty na stránce Práce.',
    langBar(),
    card('Nadpis sekce', null, ...fields(P, [['more_kicker', 'Štítek'], ['more_title', 'Nadpis']])),
    card('Spolupráce', 'Pořadí zde = pořadí na webu.', fPairs(P.more, null, [['Klient', false, 'Škoda Group'], ['Co jsme dělali', true], ['Štítek vpravo', false, 'Media']], { add: 'Přidat spolupráci' })),
    card('Úvod stránky Práce', null, ...fields(P, [['kicker', 'Štítek'], ['h1', 'Nadpis'], ['lead', 'Text', 'm']])));
}

/* ---------------------------------------------------------------- reference */
function vReference() {
  const A = T().about;
  view('Reference', 'Citace klientů. Ukazují se v karuselu na úvodní stránce a v sekci referencí na stránce O nás. Pořadí zde = pořadí na webu.',
    langBar(),
    fList(A.quotes, { title: (q) => q[1] + (q[2] ? ' · ' + q[2] : ''), sub: (q) => q[0], addLabel: 'Přidat referenci', make: () => ['', '', ''],
      body: (q, b, r) => b.append(fText(q, 0, 'Citace', { multi: true, rows: 4, on: r }), row2(fText(q, 1, 'Jméno', { on: r }), fText(q, 2, 'Firma', { on: r }))) }),
    card('Nadpisy', null, ...fields(A, [['quotes_kicker', 'Štítek (úvodní stránka)']]), ...fields(T().v4, [['quotes_title', 'Nadpis (stránka O nás)', 't', ACC]])));
}

/* ---------------------------------------------------------------- služby */
function vSluzby() {
  const P = T().services_page;
  view('Služby', 'Šest disciplín, každá má vlastní stránku. Upravujete jejich texty; fotky a vizuály disciplín ladíme my.',
    langBar(),
    fList(T().services, { title: (s) => s.name, sub: (s) => s.short, noSort: true, noDelete: true,
      body: (s, b, r) => b.append(fText(s, 'short', 'Krátký popis (na kartě)', { multi: true, rows: 3, on: r }), fText(s, 'h1', 'Nadpis stránky disciplíny'), fText(s, 'lead', 'Úvodní text', { multi: true, rows: 4 }),
        fPairs(s.items, 'Co přesně děláme', [['Nadpis', false], ['Text', true]], { add: 'Přidat bod' })) }),
    card('Obory, kterým rozumíme', 'Číslovaný seznam na stránce Co děláme.', ...fields(P, [['areas_kicker', 'Nadpis']]), fPairs(P.areas, null, [['Obor', false], ['Popis', true]], { add: 'Přidat obor' })),
    card('Úvod stránky Co děláme', null, ...fields(P, [['kicker', 'Štítek'], ['h1', 'Nadpis'], ['lead', 'Text', 'm']])));
}

/* ---------------------------------------------------------------- built by */
function ventureTexts(v, r) {
  return [
    row2(fText(v, 'cat', 'Typ projektu', { on: r, ph: 'Kariérní festival' }), fText(v, 'when', 'Kdy (nepovinné)', { ph: '27. 10. 2026' })),
    fText(v, 'where', 'Kde (nepovinné)'),
    fText(v, 'short', 'Krátký popis (v seznamu na úvodní stránce)', { multi: true, rows: 2, on: r }),
    fText(v, 'lead', 'Úvodní text stránky', { multi: true, rows: 4 }),
    fPairs(v.facts = v.facts || [], 'Fakta (tabulka nahoře)', [['Popisek', false, 'Kdy'], ['Hodnota', false]], { add: 'Přidat údaj' }),
    fPairs(v.blocks = v.blocks || [], 'Bloky textu', [['Nadpis', false], ['Text', true]], { add: 'Přidat blok' }),
    row2(fText(v, 'partners_label', 'Nadpis partnerů (nepovinné)'), fText(v, 'partners', 'Partneři (výčet)', { multi: true, rows: 2 })),
    fQuote(v),
  ];
}
function vBuilt() {
  const en = EN();
  const P = T().built_page;
  view('Built by', 'Vlastní projekty Bite Marks. Pořadí zde = pořadí na webu. Loga projektů ladíme my – nový projekt vám rádi přidáme.',
    langBar(),
    fList(S.D.cs.ventures, { title: (v) => v.name, sub: (v) => (en ? enOf('ventures', v)?.short : v.short) || v.short, noSort: en, noDelete: true, thumb: (v) => v.img || v.peek,
      body: (v, el, r) => {
        if (en) { const e = enOf('ventures', v); if (!e) return el.append(enCreateBtn('ventures', v, () => route())); el.append(...ventureTexts(e, r)); if ((v.gallery || []).length) el.append(h('div.field', {}, h('span', {}, 'Popisky fotek (English)'), fAlts(v, e))); return; }
        el.append(...ventureTexts(v, r), subH('Odkaz a fotky'),
          fText(v, 'url', 'Web projektu', { type: 'url', ph: 'https://' }),
          fImg(v, 'img', 'Velká fotka (pod úvodem stránky)', { name: v.slug, on: r, hint: 'Prázdné = stránka bude bez velké fotky.' }),
          h('div.field', {}, h('span', {}, 'Fotogalerie'), fGallery(v, enOf('ventures', v), { name: v.slug }), h('small', {}, 'Galerie se ukáže pod textem (bez fotky, která je už nahoře).')),
          h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: () => { v.img = ''; bump(); route(); } }, 'Odebrat velkou fotku'));
      } }),
    card('Úvod stránky Built by', null, ...fields(P, [['kicker', 'Štítek'], ['h1', 'Nadpis'], ['lead', 'Text', 'm']])));
}

/* ---------------------------------------------------------------- journal */
function vJournal() {
  const P = T().journal_page;
  view('Journal', 'Články z magazínu bitemarks.cz. Na úvodní stránce jsou první tři, na stránce Journal všechny. Pořadí zde = pořadí na webu.',
    langBar(),
    fList(T().posts, { title: (p) => p[3], sub: (p) => [p[2], p[1]].filter(Boolean).join(' · '), thumb: (p) => p[0], addLabel: 'Přidat článek',
      make: () => ['', new Date().toLocaleDateString('cs-CZ').replace(/\s/g, ' '), '', '', ''],
      body: (p, b, r) => b.append(fText(p, 3, 'Titulek článku', { multi: true, rows: 2, on: r }), row2(fText(p, 1, 'Datum', { on: r }), fText(p, 2, 'Rubrika', { on: r, ph: 'Business' })),
        fText(p, 4, 'Odkaz na článek', { type: 'url', ph: 'https://www.bitemarks.cz/…' }), fImg(p, 0, 'Fotka', { on: r, name: 'clanek' })) }),
    card('Úvod stránky Journal', null, ...fields(P, [['kicker', 'Štítek'], ['h1', 'Nadpis'], ['lead', 'Text', 'm'], ['cta', 'Tlačítko na magazín']])));
}

/* ---------------------------------------------------------------- o nás */
function vOnas() {
  const A = T().about;
  const cz = S.D.cs.about;
  A.office_alts = A.office_alts || ['', '', ''];
  view('O nás a kancelář', 'Stránka O nás: úvod, tým, příběh, hodnoty, postup a kancelář s mapou.',
    langBar(),
    card('Úvod', null, ...fields(A, [['kicker', 'Štítek'], ['h1', 'Nadpis', 'm', ACC], ['lead', 'Text', 'm']])),
    card('Tým', 'Fotky týmu jsou vystřižené portréty – nové vám rádi připravíme.', ...fields(A, [['team_kicker', 'Nadpis sekce']]),
      fList(A.team, { title: (p) => p.name, sub: (p) => p.role, noDelete: true,
        body: (p, b, r) => b.append(row2(fText(p, 'name', 'Jméno', { on: r }), fText(p, 'title', 'Titul', { ph: 'Ing.' })), row2(fText(p, 'role', 'Pozice', { on: r }), fText(p, 'line', 'Čím se zabývá')),
          fText(p, 'off_title', 'Po práci – nadpis'), fText(p, 'off', 'Po práci – text', { multi: true, rows: 3 }), row2(fText(p, 'phone', 'Telefon', { type: 'tel' }), fText(p, 'email', 'E-mail', { type: 'email' }))) })),
    card('Příběh', null, ...fields(A, [['story_kicker', 'Štítek'], ['story_title', 'Nadpis', 't', ACC]]), fStrList(A.story, 'Odstavce', { multi: true, rows: 4, add: 'Přidat odstavec', hint: 'První odstavec je i citací na úvodní stránce.' }), ...fields(A, [['story_sign', 'Podpis']])),
    card('Na čem stavíme', 'Hodnoty se ukazují i na úvodní stránce.', ...fields(A, [['values_kicker', 'Štítek']]), fPairs(A.values, null, [['Hodnota', false], ['Popis', true]], { add: 'Přidat hodnotu' })),
    card('Jak pracujeme', null, ...fields(A, [['process_kicker', 'Štítek']]), fPairs(A.process, null, [['Krok', false], ['Popis', true]], { add: 'Přidat krok' })),
    card('Kancelář', 'Sekce s fotkami a mapou je na stránce O nás i Kontakt.',
      ...fields(A, [['office_kicker', 'Štítek'], ['office_title', 'Nadpis', 't', ACC], ['office_lead', 'Text', 'm']]),
      EN() ? note('Fotky kanceláře se mění v české verzi a platí pro oba jazyky.') : null,
      h('div.office-pick', {}, [0, 1, 2].map((i) => h('div', {},
        EN() ? null : fImg(cz.office_imgs, i, ['Velká fotka vlevo', 'Fotka vpravo nahoře', 'Fotka vpravo dole'][i], { name: 'kancelar' }),
        fText(A.office_alts, i, `Popis ${i + 1}. fotky`)))),
      ...fields(A, [['office_note', 'Popisek pod fotkami (autor fotek)'], ['metro', 'Doprava'], ['office_route', 'Text na mapě'], ['post', 'Nadpis: korespondenční adresa'], ['billing', 'Nadpis: fakturační údaje'], ['socials', 'Nadpis: sociální sítě']])));
}

/* ---------------------------------------------------------------- partneři */
const PCATS = ['Klienti', 'Soukromý sektor', 'Státní sektor', 'S podporou', 'Univerzity', 'Mediální partneři'];
function vPartneri() {
  const L = S.D.partneri;
  const A = T().about;
  const listBox = h('div');
  let cat = PCATS[0];
  const logoSrc = (p) => p.logo ? imgSrc(p.logo) : CFG.site + 'img/p/' + p.slug + '.png';
  const render = () => {
    const idx = L.map((p, i) => [p, i]).filter(([p]) => p.cat === cat);
    const swap = (a, b) => { [L[a], L[b]] = [L[b], L[a]]; bump(); render(); };
    listBox.replaceChildren(
      h('div.pcat', {}, PCATS.map((c) => h('button.btn.btn-sm' + (c === cat ? '.btn-dark' : '.btn-ghost'), { type: 'button', onclick: () => { cat = c; render(); } }, `${c} (${L.filter((p) => p.cat === c && !p.skryt).length})`))),
      h('div.items', {}, idx.length ? idx.map(([p, gi], j) => {
        const img = h('img.plogo', { src: logoSrc(p), alt: '' });
        return h('div.item', {}, h('div.item-head', {}, img,
          h('div.t', { style: 'display:grid;gap:.35rem' },
            h('input', { type: 'text', value: p.name, 'aria-label': 'Název', oninput: (e) => { p.name = e.target.value; bump(); } }),
            h('div', { style: 'display:flex;gap:.6rem;flex-wrap:wrap;align-items:center' },
              h('select', { 'aria-label': 'Kategorie', style: 'max-width:14rem;min-height:36px;padding:.2rem .6rem', onchange: (e) => { p.cat = e.target.value; bump(); render(); } }, PCATS.map((c) => h('option', { value: c, selected: c === p.cat }, c))),
              h('label.check', { style: 'margin:0' }, h('input', { type: 'checkbox', checked: !!p.skryt, onchange: (e) => { if (e.target.checked) p.skryt = true; else delete p.skryt; bump(); } }), h('span', {}, 'Skrýt')),
              h('button.btn.btn-sm.btn-ghost', { type: 'button', html: IC.upload + 'Vyměnit logo', onclick: async () => { const [f] = await filePick(false); if (!f) return; try { p.logo = await upload(f, 'logo-' + (p.name || 'partner'), 900); img.src = imgSrc(p.logo); bump(); toast('Logo připraveno', 'Na web se nahraje po uložení.'); } catch (er) { toast('Logo se nepodařilo načíst', er.message, 'err'); } } }))),
          h('div.item-tools', {},
            h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Posunout nahoru', disabled: j === 0, onclick: () => swap(gi, idx[j - 1][1]), html: IC.up }),
            h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Posunout dolů', disabled: j === idx.length - 1, onclick: () => swap(gi, idx[j + 1][1]), html: IC.down }),
            h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat', onclick: async () => { if (await confirmDlg('Smazat logo?', `„${p.name}“ zmizí z webu (po uložení).`)) { L.splice(gi, 1); bump(); render(); } }, html: IC.trash }))));
      }) : h('p.empty', {}, 'V této kategorii zatím nic není.')),
      h('button.btn.add', { type: 'button', html: IC.plus + 'Přidat logo do kategorie „' + cat + '“', onclick: async () => {
        const [f] = await filePick(false); if (!f) return;
        try { const path = await upload(f, 'logo', 900); L.push({ slug: '', name: f.name.replace(/\.[^.]+$/, ''), cat, logo: path }); bump(); render(); toast('Logo přidáno', 'Zkontrolujte název a uložte změny.'); } catch (er) { toast('Logo se nepodařilo načíst', er.message, 'err'); }
      } }));
  };
  render();
  view('Partneři a loga', 'Stěna log na stránce O nás. Loga se na webu samy převedou na jednotnou tmavou siluetu a velikostně vyrovnají – nahrajte ideálně PNG nebo SVG převedené do PNG, s průhledným nebo bílým pozadím.',
    card('Loga', 'Pořadí v kategorii = pořadí na webu.', listBox),
    card('Texty sekce', null, langBar(), ...fields(A, [['partners_kicker', 'Štítek'], ['partners_title', 'Nadpis', 't', ACC], ['partners_lead', 'Text', 'm']]),
      h('div.field', {}, h('span', {}, 'Nadpisy skupin'), ...A.partner_groups.map((g) => fText(g, 0, 'Skupina: ' + g[1].join(' + '))))));
}

/* ---------------------------------------------------------------- kontakty */
function vKontakty() {
  const c = S.D.spolecne;
  const P = T().contact;
  view('Kontakty', 'Kontakty v patičce, na stránce Kontakt a v sekci kancelář. Kam chodí poptávky z formuláře, nastavujeme my – stačí napsat.',
    card('Kontakt', null, row2(fText(c, 'email', 'E-mail', { type: 'email' }), fText(c, 'phone', 'Telefon', { type: 'tel' })), fText(T().ui, 'hours', 'Pracovní doba (' + (EN() ? 'English' : 'česky') + ')')),
    card('Sociální sítě', null, fText(c, 'linkedin', 'LinkedIn', { type: 'url' }), fText(c, 'instagram', 'Instagram', { type: 'url' }), fText(c, 'facebook', 'Facebook', { type: 'url' }), fText(c, 'journal', 'Magazín (bitemarks.cz)', { type: 'url' })),
    card('Fakturační údaje', null, fText(c, 'company', 'Firma'), row2(fText(c, 'ico', 'IČO'), fText(c, 'dic', 'DIČ')), fText(c, 'street', 'Ulice'), row2(fText(c, 'zip', 'PSČ'), fText(c, 'city', 'Město'))),
    card('Stránka Kontakt', null, langBar(), ...fields(P, [['kicker', 'Štítek'], ['h1', 'Nadpis', 'm', ACC], ['lead', 'Text', 'm'], ['direct', 'Nadpis přímého kontaktu'], ['form_title', 'Nadpis formuláře'], ['f_interest', 'Formulář: otázka nad zaškrtávátky'], ['f_send', 'Formulář: tlačítko'], ['f_note', 'Formulář: poznámka pod tlačítkem', 'm']])));
}

/* ---------------------------------------------------------------- vyhledávače */
function vSeo() {
  const L = T();
  const pages = [['home', 'Úvodní stránka'], ['services_page', 'Co děláme'], ['work_page', 'Práce'], ['built_page', 'Built by'], ['journal_page', 'Journal'], ['about', 'O nás'], ['contact', 'Kontakt']];
  view('Vyhledávače', 'Titulek a popis, které Google ukazuje ve výsledcích hledání a sítě při sdílení odkazu. Titulek ideálně do 60 znaků, popis 120–160 znaků. Podstránky projektů a služeb berou titulek z nadpisu a popis z úvodního textu.',
    langBar(),
    ...pages.map(([k, t]) => { const cnt = h('small'); const P = L[k]; const upd = () => { cnt.textContent = `Titulek ${String(P.title || '').length} znaků · popis ${String(P.description || '').length} znaků`; }; upd();
      return card(t, null, fText(P, 'title', 'Titulek', { on: upd }), fText(P, 'description', 'Popis', { multi: true, rows: 3, on: upd }), cnt); }));
}

function vNapoveda() {
  view('Návod', null,
    card('Nový projekt', null, h('div.help', { html: '<ol><li>Otevřete <b>Projekty</b> a dole klikněte na <b>Přidat projekt</b>.</li><li>Vyplňte nadpis, klienta, perex a bloky příběhu. Nahrajte hlavní fotku a galerii (můžete vybrat víc fotek najednou).</li><li>Až bude hotový, odškrtněte <b>Skrýt na webu</b> a dole klikněte na <b>Uložit změny</b>.</li><li>Přepněte nahoře na <b>English</b>, rozklikněte projekt a klikněte na <b>Vytvořit anglickou verzi</b> – pak přeložte texty.</li></ol>' })),
    card('Pořadí projektů', null, h('div.help', { html: '<ol><li>V <b>Projektech</b> měníte pořadí šipkami nahoru a dolů.</li><li>První čtyři viditelné projekty jsou i na úvodní stránce – první dva velké, další dva jako dlaždice.</li></ol>' })),
    card('Zvýraznění v nadpisech', null, h('div.help', { html: '<p>Slova mezi hvězdičkami se na webu zvýrazní barvou. Například <code>Obsah, u kterého se *přestane scrollovat.*</code></p>' })),
    card('Fotky', null, h('div.help', { html: '<ol><li>Fotky se při nahrání samy zmenší, web z nich připraví několik velikostí pro mobil i velké obrazovky.</li><li><b>Vybrat z webu</b> nabídne fotky, které už na webu jsou.</li><li>Ke každé fotce napište krátký popis – pomáhá vyhledávačům i nevidomým.</li></ol>' })),
    card('Poptávky', null, h('div.help', { html: '<ol><li>Zprávy z kontaktního formuláře najdete v sekci <b>Poptávky</b> (posílání i e-mailem vám rádi zapneme).</li><li>Kliknutím otevřete detail, nastavíte stav a připíšete si poznámku.</li></ol>' })),
    card('Něco nejde?', null, h('p', {}, 'Napište nám na info.webhunter@email.cz – rádi pomůžeme.')));
}
function vSettings() {
  const f = { old: '', pw: '', pw2: '' };
  const msg = h('p', { style: 'color:var(--err);font-size:.9rem;min-height:1.2rem' });
  const pwInput = (key, label, ac) => h('label.field', {}, h('span', {}, label), h('input', { type: 'password', autocomplete: ac, oninput: (e) => { f[key] = e.target.value; } }));
  view('Heslo a odhlášení', null,
    card('Změnit heslo', 'Po změně hesla se odhlásí všechna ostatní zařízení. Heslo musí mít alespoň 8 znaků.',
      pwInput('old', 'Současné heslo', 'current-password'), pwInput('pw', 'Nové heslo', 'new-password'), pwInput('pw2', 'Nové heslo znovu', 'new-password'), msg,
      h('button.btn.btn-primary', { type: 'button', onclick: async (e) => {
        msg.textContent = '';
        if (f.pw.length < 8) return (msg.textContent = 'Nové heslo musí mít alespoň 8 znaků.');
        if (f.pw !== f.pw2) return (msg.textContent = 'Nová hesla se neshodují.');
        e.target.disabled = true;
        try { const r = await api('/password', { method: 'POST', body: JSON.stringify({ old: f.old, password: f.pw }) }); S.sess = r.token; S.def = false; saveSess(); toast('Heslo změněno', 'Příště se přihlaste novým heslem.', 'ok'); route(); }
        catch (er) { msg.textContent = er.message; } finally { e.target.disabled = false; }
      } }, 'Uložit nové heslo')),
    card('Odhlásit se', null, h('button.btn', { type: 'button', onclick: logout, html: IC.logout + 'Odhlásit' })));
}

/* ---------------------------------------------------------------- shell */
function renderShell() {
  const nav = h('nav.nav', { id: 'nav', 'aria-label': 'Sekce administrace' },
    h('button.btn.btn-icon.btn-ghost.nav-close', { type: 'button', 'aria-label': 'Zavřít menu', onclick: () => nav.classList.remove('open'), html: IC.x }),
    NAV.map(([id, label, ic, key]) => id === '-' ? h('hr') : h('a', { href: '#/' + id, 'data-id': id, 'data-key': key || '', onclick: () => nav.classList.remove('open'), html: IC[ic] + `<span>${esc(label)}</span>` })),
    h('hr'), h('a', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.ext + '<span>Zobrazit web</span>' }));
  const bar = h('div.savebar', { id: 'savebar' }, h('span', {}, ''),
    h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: async () => { if (await confirmDlg('Zahodit změny?', 'Neuložené úpravy se ztratí.', 'Zahodit')) discard(); } }, 'Zahodit'),
    h('button.btn.btn-primary', { type: 'button', onclick: saveAll }, 'Uložit změny'));
  $('#app').replaceChildren(h('div.shell', {},
    h('header.top', {},
      h('button.btn.btn-icon.btn-ghost.menu-btn', { type: 'button', 'aria-label': 'Menu', onclick: () => nav.classList.add('open'), html: IC.menu }),
      h('a.top-logo.brand', { href: '#/', html: LOGO + '<span>Administrace</span>' }),
      h('div.pub'), h('a.btn.btn-sm', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.eye + '<span>Web</span>' })),
    h('div.layout', {}, nav, h('main.view'))), bar);
  initPub();
}
function updateSavebar() {
  const keys = dirtyKeys(); const bar = $('#savebar'); if (!bar) return;
  bar.classList.toggle('on', keys.length > 0 || S.saving);
  bar.querySelector('span').textContent = S.saving ? 'Ukládám…' : `Neuložené změny: ${keys.map((k) => LABEL[k]).join(', ')}`;
  bar.querySelectorAll('button').forEach((b) => { b.disabled = S.saving; });
}
const VIEWS = { '': vDash, poptavky: vPoptavky, uvod: vUvod, prace: vPrace, pribehy: vPribehy, reference: vReference, sluzby: vSluzby, built: vBuilt, journal: vJournal, onas: vOnas, partneri: vPartneri, kontakty: vKontakty, seo: vSeo, napoveda: vNapoveda, nastaveni: vSettings };
function route() {
  const [id, arg] = location.hash.replace(/^#\/?/, '').split('/');
  (VIEWS[id] || vDash)(arg);
  document.querySelectorAll('.nav a[data-id]').forEach((a) => a.classList.toggle('on', a.dataset.id === (VIEWS[id] ? id : '')));
  updateSavebar();
}
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------- přihlášení */
function renderLogin(msg = '') {
  const inp = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', placeholder: 'Heslo', required: true });
  const err = h('p.login-err', {}, msg);
  const btn = h('button.btn.btn-primary', { type: 'submit' }, 'Přihlásit se');
  const form = h('form.login-card', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Přihlašuji…';
    try {
      const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: inp.value }) });
      S.sess = r.token; S.def = r.def; saveSess(); await start();
    } catch (er) { err.textContent = er.message; btn.disabled = false; btn.textContent = 'Přihlásit se'; inp.select(); }
  } },
  h('div.brand', { html: LOGO }), h('h1', {}, 'Administrace webu'), h('p', {}, 'Přihlaste se heslem k administraci.'),
  h('label.field', {}, h('span', {}, 'Heslo'), h('div.pw-wrap', {}, inp, h('button.pw-eye', { type: 'button', 'aria-label': 'Zobrazit heslo', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; }, html: IC.eye }))),
  btn, err);
  $('#app').replaceChildren(h('div.login', {}, form));
  setTimeout(() => inp.focus(), 50);
}
function logout() {
  if (dirtyKeys().length && !confirm('Máte neuložené změny. Opravdu se odhlásit?')) return;
  localStorage.removeItem(SK); S.sess = null; S.D = {}; renderLogin();
}
async function start() {
  $('#app').innerHTML = `<div class="boot"><div class="brand">${LOGO}</div><span class="spin"></span></div>`;
  try { await loadAll(); } catch (e) {
    if (e.status === 401) { localStorage.removeItem(SK); S.sess = null; return renderLogin('Přihlášení vypršelo, přihlaste se prosím znovu.'); }
    return renderLogin('Obsah webu se nepodařilo načíst: ' + e.message);
  }
  renderShell(); route();
}
function boot() {
  const s = JSON.parse(localStorage.getItem(SK) || 'null');
  if (s && s.exp > Date.now()) { S.sess = s.t; S.def = s.def; start(); } else renderLogin();
}
boot();
})();
