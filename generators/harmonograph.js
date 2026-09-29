// Harmonograph: zwei gedämpfte Pendel je Achse, überlagert zu einer einzigen langen Linie.
// Der Stift wird dabei nie abgesetzt. Der Zufallswert verstimmt die Frequenzen leicht und wählt die Phasen.
UGEN.register({
  id: 'harmonograph',
  name: { de: 'Harmonograph', en: 'Harmonograph' },
  about: {
    de: 'Zwei gedämpfte Pendel je Achse, gezeichnet als eine durchgehende Linie. Ideal für den Plotter.',
    en: 'Two damped pendulums per axis, drawn as one continuous line. Ideal for a plotter.',
  },
  params: [
    { key: 'f1', label: { de: 'Frequenz X₁', en: 'Frequency X₁' }, min: 1, max: 8, step: 1, value: 2 },
    { key: 'f2', label: { de: 'Frequenz X₂', en: 'Frequency X₂' }, min: 1, max: 8, step: 1, value: 3 },
    { key: 'f3', label: { de: 'Frequenz Y₁', en: 'Frequency Y₁' }, min: 1, max: 8, step: 1, value: 3 },
    { key: 'f4', label: { de: 'Frequenz Y₂', en: 'Frequency Y₂' }, min: 1, max: 8, step: 1, value: 2 },
    { key: 'detune', label: { de: 'Verstimmung', en: 'Detune' }, min: 0, max: 0.05, step: 0.001, value: 0.012, surprise: [0.003, 0.025] },
    { key: 'damp', label: { de: 'Dämpfung', en: 'Damping' }, min: 0, max: 0.02, step: 0.0005, value: 0.004, surprise: [0.001, 0.01] },
    { key: 'turns', label: { de: 'Laufzeit', en: 'Duration' }, min: 10, max: 600, step: 5, value: 260, surprise: [80, 400] },
    { key: 'spin', label: { de: 'Papier drehen', en: 'Rotate paper' }, min: 0, max: 0.05, step: 0.001, value: 0, unit: '', surprise: [0, 0.01] },
    { key: 'size', label: { de: 'Größe', en: 'Size' }, min: 10, max: 100, step: 1, value: 92, unit: '%' },
  ],
  thumb: { turns: 120 },

  generate({ params: q, w, h, random }) {
    const TAU = Math.PI * 2;
    const osc = [q.f1, q.f2, q.f3, q.f4].map((f) => ({
      f: f * (1 + random(-q.detune, q.detune)), p: random(TAU), a: random(.6, 1), d: q.damp * random(.7, 1.3),
    }));
    const dt = 0.01, n = Math.ceil(q.turns / dt), pts = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= n; i++) {
      const s = i * dt;
      const v = osc.map((o) => o.a * Math.sin(o.f * s + o.p) * Math.exp(-o.d * s));
      let x = v[0] + v[1], y = v[2] + v[3];
      if (q.spin) { const a = q.spin * s, c = Math.cos(a), sn = Math.sin(a); [x, y] = [x * c - y * sn, x * sn + y * c]; }
      pts.push([x, y]);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    // einpassen und Punkte ausdünnen, die kaum Abstand haben (kleinere SVG, gleiches Bild)
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * q.size / 100;
    const ox = w / 2 - (x0 + x1) / 2 * k, oy = h / 2 - (y0 + y1) / 2 * k;
    const out = [];
    for (const [x, y] of pts) {
      const X = ox + x * k, Y = oy + y * k, last = out[out.length - 1];
      if (!last || Math.hypot(X - last[0], Y - last[1]) > 0.15) out.push([X, Y]);
    }
    return [out];
  },
});
