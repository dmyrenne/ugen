// µgen: Oberfläche, Rendering (p5.js) und SVG-Export.
// Generatoren melden sich mit UGEN.register({...}) an und liefern Linienzüge in Millimetern,
// siehe generators/*.js und README.md.
const UGEN = (() => {
  const $ = (id) => document.getElementById(id);
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const GENS = [];
  const FORMATS = [
    { id: 'uplot', w: 203, h: 170, label: () => t('format.uplot') + ' · 203 × 170' },
    { id: 'a5', w: 148, h: 210, label: () => 'A5 · 148 × 210' },
    { id: 'a4', w: 210, h: 297, label: () => 'A4 · 210 × 297' },
    { id: 'a3', w: 297, h: 420, label: () => 'A3 · 297 × 420' },
    { id: 'sq', w: 200, h: 200, label: () => '200 × 200' },
    { id: 'custom', label: () => t('format.custom') },
  ];

  // ---------- Zustand (im Browser gespeichert) ----------
  const state = {
    gen: 'meshblob', seed: 1, params: {},
    paper: { format: 'uplot', w: 203, h: 170, margin: 10 },
    pen: { color: '#1d1d1b', width: 0.4 },
  };
  try { Object.assign(state, JSON.parse(localStorage.getItem('ugen-state') || '{}')); } catch {}
  const persist = () => { try { localStorage.setItem('ugen-state', JSON.stringify(state)); } catch {} };
  const gen = () => GENS.find((g) => g.id === state.gen) || GENS[0];
  const defaults = (g) => Object.fromEntries(g.params.map((q) => [q.key, q.value]));
  const paramsOf = (g) => ({ ...defaults(g), ...(state.params[g.id] || {}) });

  // ---------- Generieren ----------
  let P = null;            // p5-Instanz: Zeichenfläche und Quelle für noise()/random()
  let lines = [], stats = null;
  function area() {
    const m = +state.paper.margin || 0;
    return { x: m, y: m, w: Math.max(1, state.paper.w - 2 * m), h: Math.max(1, state.paper.h - 2 * m) };
  }
  function run(g, params, w, h, seed) {
    P.noiseSeed(seed); P.randomSeed(seed); P.noiseDetail(4, 0.5);
    const out = g.generate({ p: P, params, w, h, random: (a, b) => P.random(a, b), noise: (x, y = 0, z = 0) => P.noise(x, y, z) });
    // Alles außerhalb der Zeichenfläche abschneiden, damit der Plotter nie über den Rand fährt
    return out.flatMap((l) => clip(l, 0, 0, w, h)).filter((l) => l.length > 1);
  }
  // Linienzug an einem Rechteck abschneiden (Liang-Barsky je Segment), liefert ggf. mehrere Stücke
  function clip(pts, x0, y0, x1, y1) {
    const out = []; let cur = null;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay;
      let u0 = 0, u1 = 1, ok = true;
      for (const [pp, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
        if (pp === 0) { if (q < 0) { ok = false; break; } continue; }
        const r = q / pp;
        if (pp < 0) { if (r > u1) { ok = false; break; } if (r > u0) u0 = r; }
        else { if (r < u0) { ok = false; break; } if (r < u1) u1 = r; }
      }
      if (!ok) { cur = null; continue; }
      const s = [ax + u0 * dx, ay + u0 * dy], e = [ax + u1 * dx, ay + u1 * dy];
      if (!cur || u0 > 0) { cur = [s]; out.push(cur); }
      cur.push(e);
      if (u1 < 1) cur = null;
    }
    return out;
  }
  let pending = 0;
  function regenerate() {   // entprellt: höchstens eine Berechnung pro Frame, "rechne …" bleibt sichtbar
    if (pending) return;
    $('busy').hidden = false;
    pending = requestAnimationFrame(() => setTimeout(() => {
      pending = 0;
      const a = area(), t0 = performance.now();
      lines = run(gen(), paramsOf(gen()), a.w, a.h, state.seed);
      stats = measure(lines, performance.now() - t0);
      $('busy').hidden = true;
      renderStats(); P.redraw();
    }));
  }
  function measure(ls, ms) {
    let len = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of ls) for (let i = 0; i < l.length; i++) {
      const [x, y] = l[i];
      if (i) len += Math.hypot(x - l[i - 1][0], y - l[i - 1][1]);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return { count: ls.length, len, w: x1 - x0, h: y1 - y0, ms };
  }
  function renderStats() {
    if (!stats) return;
    const len = stats.len >= 1000 ? (stats.len / 1000).toFixed(2) + ' m' : stats.len.toFixed(0) + ' mm';
    const size = stats.count ? `${stats.w.toFixed(0)} × ${stats.h.toFixed(0)} mm` : '–';
    $('stats').innerHTML = [[t('stat.lines'), stats.count.toLocaleString(LANG)], [t('stat.length'), len], [t('stat.size'), size]]
      .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
    $('busy').textContent = t('busy');
  }

  // ---------- Vorschau ----------
  let view = null, anim = null;
  function fitView() {
    const pad = 36, W = P.width, H = P.height;
    const k = Math.min((W - 2 * pad) / state.paper.w, (H - 2 * pad) / state.paper.h);
    view = { k, ox: (W - state.paper.w * k) / 2, oy: (H - state.paper.h * k) / 2 };
  }
  function render() {
    if (!view) fitView();
    const ctx = P.drawingContext, { k, ox, oy } = view, a = area();
    P.clear();
    // Papier mit leichtem Schatten, Rand gestrichelt. Gezeichnet wird direkt über den Canvas-Kontext,
    // p5 liefert Zeichenfläche, Bildschleife (für die Animation) sowie noise() und random().
    ctx.save();
    ctx.shadowColor = 'rgb(0 0 0 / .12)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
    ctx.fillStyle = css('--paper'); ctx.fillRect(ox, oy, state.paper.w * k, state.paper.h * k);
    ctx.restore();
    ctx.save();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--margin'); ctx.lineWidth = 1;
    ctx.strokeRect(ox + a.x * k, oy + a.y * k, a.w * k, a.h * k);
    ctx.restore();

    // Linien in Stiftfarbe und echter Breite; für viele Linien direkt über den Canvas-Kontext
    const budget = anim ? stats.len * Math.min(1, (performance.now() - anim.start) / anim.dur) : Infinity;
    let used = 0, head = null;
    ctx.save();
    ctx.translate(ox + a.x * k, oy + a.y * k);
    ctx.strokeStyle = state.pen.color; ctx.lineWidth = Math.max(0.5, state.pen.width * k);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    outer: for (const l of lines) {
      ctx.moveTo(l[0][0] * k, l[0][1] * k);
      for (let i = 1; i < l.length; i++) {
        const [px, py] = l[i - 1], [x, y] = l[i], d = Math.hypot(x - px, y - py);
        if (used + d > budget) {
          const f = (budget - used) / d, hx = px + (x - px) * f, hy = py + (y - py) * f;
          ctx.lineTo(hx * k, hy * k); head = [hx, hy]; break outer;
        }
        used += d; ctx.lineTo(x * k, y * k);
      }
    }
    ctx.stroke();
    if (head) { ctx.fillStyle = css('--accent'); ctx.beginPath(); ctx.arc(head[0] * k, head[1] * k, 4, 0, 7); ctx.fill(); }
    ctx.restore();
    if (anim && !head) stopAnim();
  }
  function play() {
    if (anim) { stopAnim(); return; }
    if (!stats?.len) return;
    anim = { start: performance.now(), dur: Math.min(12000, 2500 + stats.len / 4) };
    $('play').textContent = t('stop'); P.loop();
  }
  function stopAnim() { anim = null; $('play').textContent = t('play'); P.noLoop(); P.redraw(); }

  // ---------- SVG-Export ----------
  function svg() {
    const a = area(), f = (v) => +v.toFixed(3);
    const d = lines.map((l) => 'M' + l.map(([x, y]) => `${f(x + a.x)} ${f(y + a.y)}`).join(' L')).join(' ');
    const meta = JSON.stringify({ generator: gen().id, seed: state.seed, params: paramsOf(gen()), paper: state.paper })
      .replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${state.paper.w}mm" height="${state.paper.h}mm" viewBox="0 0 ${state.paper.w} ${state.paper.h}">
<desc>µgen ${meta}</desc>
<path d="${d}" fill="none" stroke="${state.pen.color}" stroke-width="${state.pen.width}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
  }
  function exportSvg() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' }));
    a.download = `ugen-${gen().id}-${state.seed}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Seitenleiste ----------
  const decimals = (step) => (String(step).split('.')[1] || '').length;
  function buildGens() {
    $('gens').innerHTML = '';
    for (const g of GENS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gen'; b.dataset.id = g.id;
      b.innerHTML = `<svg viewBox="0 0 120 80" aria-hidden="true"></svg><span></span>`;
      b.onclick = () => { if (state.gen !== g.id) { state.gen = g.id; persist(); buildParams(); markGen(); regenerate(); } };
      $('gens').append(b);
    }
    drawThumbs(); markGen();
  }
  function drawThumbs() {   // kleine Vorschau je Generator mit Standardwerten
    for (const g of GENS) {
      const ls = run(g, { ...defaults(g), ...(g.thumb || {}) }, 112, 72, 7);
      const d = ls.map((l) => 'M' + l.map(([x, y]) => `${(x + 4).toFixed(1)} ${(y + 4).toFixed(1)}`).join('L')).join('');
      document.querySelector(`.gen[data-id="${g.id}"] svg`).innerHTML =
        `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width=".5" stroke-linejoin="round"/>`;
    }
  }
  function markGen() {
    for (const b of document.querySelectorAll('.gen')) {
      const g = GENS.find((x) => x.id === b.dataset.id);
      b.setAttribute('aria-pressed', g.id === gen().id);
      b.querySelector('span').textContent = tr(g.name);
    }
    $('about').textContent = tr(gen().about) || '';
  }
  function buildParams() {
    const g = gen(), vals = paramsOf(g), box = $('params');
    box.innerHTML = '';
    for (const q of g.params) {
      const el = document.createElement('div');
      el.className = 'param';
      const unit = q.unit ? ' ' + q.unit : '';
      if (q.type === 'bool') {
        el.innerHTML = `<label class="check"><input type="checkbox"> <span></span></label>`;
        const inp = el.querySelector('input');
        inp.checked = !!vals[q.key]; el.querySelector('span').textContent = tr(q.label);
        inp.onchange = () => setParam(q.key, inp.checked);
      } else if (q.type === 'select') {
        el.innerHTML = `<label><span></span><select></select></label>`;
        el.querySelector('span').textContent = tr(q.label);
        const sel = el.querySelector('select');
        for (const o of q.options) sel.add(new Option(tr(o.label), o.value));
        sel.value = vals[q.key]; sel.onchange = () => setParam(q.key, sel.value);
      } else {
        el.innerHTML = `<div class="top"><span></span><output></output></div><input type="range">`;
        el.querySelector('span').textContent = tr(q.label);
        const inp = el.querySelector('input'), out = el.querySelector('output');
        Object.assign(inp, { min: q.min, max: q.max, step: q.step ?? 1, value: vals[q.key] });
        inp.setAttribute('aria-label', tr(q.label));
        const show = () => { out.textContent = (+inp.value).toFixed(decimals(q.step ?? 1)) + unit; };
        show();
        inp.oninput = () => { show(); setParam(q.key, +inp.value); };
      }
      box.append(el);
    }
  }
  function setParam(key, v) {
    (state.params[state.gen] ||= {})[key] = v;
    persist(); regenerate();
  }
  function surprise() {   // alle Parameter zufällig, im Bereich "surprise" oder min..max
    const g = gen(), p = {};
    for (const q of g.params) {
      if (q.type === 'bool') p[q.key] = q.fixed ? q.value : Math.random() < .5;
      else if (q.type === 'select') p[q.key] = q.options[Math.floor(Math.random() * q.options.length)].value;
      else {
        const [lo, hi] = q.surprise || [q.min, q.max], st = q.step ?? 1;
        p[q.key] = +(Math.round((lo + Math.random() * (hi - lo)) / st) * st).toFixed(decimals(st));
      }
    }
    state.params[g.id] = p; state.seed = newSeed();
    persist(); buildParams(); writeSide(); regenerate();
  }
  const newSeed = () => Math.floor(Math.random() * 1e6);
  function writeSide() {
    $('seed').value = state.seed;
    $('format').value = state.paper.format;
    $('paper_w').value = state.paper.w; $('paper_h').value = state.paper.h; $('margin').value = state.paper.margin;
    $('pen_color').value = state.pen.color; $('pen_width').value = state.pen.width;
  }
  function buildFormats() {
    const cur = state.paper.format;
    $('format').innerHTML = '';
    for (const f of FORMATS) $('format').add(new Option(f.label(), f.id));
    $('format').value = cur;
  }
  function paperChanged(refit = true) {
    persist(); if (refit) { fitView(); } regenerate();
  }

  function drawMark() {   // Logo: ein kleines Strömungsfeld, bei jedem Laden (und Klick) neu
    let s = Math.random() * 2 ** 32 >>> 0;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const a = rnd() * 6.3, b = rnd() * 6.3, turn = 1 + rnd() * 1.5, f = .13, paths = [];
    for (let i = 0; i < 16; i++) {
      let x = (i % 4 + rnd()) * 8.5, y = (Math.floor(i / 4) + rnd()) * 8.5;
      const pts = [[x, y]];
      for (let j = 0; j < 40; j++) {
        const an = turn * (Math.sin(x * f + a) + Math.cos(y * f * 1.3 + b));
        x += Math.cos(an) * 1.1; y += Math.sin(an) * 1.1;
        if (x < 0 || y < 0 || x > 34 || y > 34) break;
        pts.push([x, y]);
      }
      if (pts.length > 4) paths.push(`<path d="M${pts.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}" fill="none" stroke-linecap="round" stroke="${i ? 'var(--panel)' : 'var(--accent)'}" stroke-width="${i ? .7 : 1.6}" opacity="${i ? .8 : 1}"/>`);
    }
    $('mark').innerHTML = paths.join('');
  }

  // ---------- Start ----------
  function start() {
    for (const [code, name] of Object.entries(LANGS)) $('lang').add(new Option(name, code));
    $('lang').value = LANG;
    $('lang').onchange = () => {
      LANG = $('lang').value; try { localStorage.setItem('ugen-lang', LANG); } catch {}
      applyI18n(); buildFormats(); buildParams(); markGen(); renderStats();
      $('play').textContent = t(anim ? 'stop' : 'play');
    };
    applyI18n(); drawMark(); $('mark').onclick = drawMark;

    new p5((p) => {
      P = p;
      p.setup = () => {
        const r = $('stage').getBoundingClientRect();
        p.createCanvas(r.width, r.height).parent($('stage'));
        p.pixelDensity(devicePixelRatio || 1);
        p.noLoop();
        if (!GENS.some((g) => g.id === state.gen)) state.gen = GENS[0].id;
        buildGens(); buildParams(); buildFormats(); writeSide();
        fitView(); regenerate();
      };
      p.draw = render;
    });
    new ResizeObserver(() => {
      if (!P?.width) return;
      const r = $('stage').getBoundingClientRect();
      P.resizeCanvas(r.width, r.height); fitView(); P.redraw();
    }).observe($('stage'));

    $('seed').oninput = () => { state.seed = Math.max(0, Math.floor(+$('seed').value || 0)); persist(); regenerate(); };
    $('dice').onclick = () => { state.seed = newSeed(); $('seed').value = state.seed; persist(); regenerate(); };
    $('surprise').onclick = surprise;
    $('resetParams').onclick = () => { delete state.params[state.gen]; persist(); buildParams(); regenerate(); };
    $('format').onchange = () => {
      const f = FORMATS.find((x) => x.id === $('format').value);
      state.paper.format = f.id;
      if (f.w) { state.paper.w = f.w; state.paper.h = f.h; }
      writeSide(); paperChanged();
    };
    for (const id of ['paper_w', 'paper_h']) $(id).oninput = () => {
      const v = +$(id).value; if (!(v >= 10)) return;
      state.paper[id === 'paper_w' ? 'w' : 'h'] = v;
      const f = FORMATS.find((x) => x.w === state.paper.w && x.h === state.paper.h);
      state.paper.format = f ? f.id : 'custom'; $('format').value = state.paper.format;
      paperChanged();
    };
    $('margin').oninput = () => { state.paper.margin = Math.max(0, +$('margin').value || 0); paperChanged(false); };
    $('rotatePaper').onclick = () => {
      [state.paper.w, state.paper.h] = [state.paper.h, state.paper.w];
      const f = FORMATS.find((x) => x.w === state.paper.w && x.h === state.paper.h);
      state.paper.format = f ? f.id : 'custom';
      writeSide(); paperChanged();
    };
    $('pen_color').oninput = () => { state.pen.color = $('pen_color').value; persist(); P.redraw(); };
    $('pen_width').oninput = () => { const v = +$('pen_width').value; if (v > 0) { state.pen.width = v; persist(); P.redraw(); } };
    $('play').onclick = play;
    $('fitView').onclick = () => { fitView(); P.redraw(); };
    $('export').onclick = exportSvg;

    // Zoom und Verschieben
    const stage = $('stage');
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * .0015);
      view.ox = mx - (mx - view.ox) * f; view.oy = my - (my - view.oy) * f; view.k *= f; P.redraw();
    }, { passive: false });
    let drag = null;
    stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); stage.style.cursor = 'grabbing'; });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.ox += e.clientX - drag.x; view.oy += e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; P.redraw();
    });
    stage.addEventListener('pointerup', () => { drag = null; stage.style.cursor = ''; });
    stage.addEventListener('dblclick', () => { fitView(); P.redraw(); });

    addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') $('dice').click();
      else if (e.key === 's' || e.key === 'S') { e.preventDefault(); exportSvg(); }
      else if (e.key === ' ') { e.preventDefault(); play(); }
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => P.redraw());
    document.fonts.ready.then(() => P?.redraw());
  }

  return { register: (def) => GENS.push(def), start };
})();
