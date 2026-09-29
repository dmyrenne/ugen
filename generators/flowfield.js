// Flow Field: Linien folgen einem Winkelfeld aus Perlin-Rauschen. Neue Linien halten Abstand zu den
// vorhandenen (vereinfacht nach Jobard & Lefer), damit die Fläche gleichmäßig gefüllt wird und der Stift
// nicht zuschmiert.
UGEN.register({
  id: 'flowfield',
  name: { de: 'Flow Field', en: 'Flow field' },
  about: {
    de: 'Linien strömen durch ein Rauschfeld und halten dabei Abstand zueinander.',
    en: 'Lines flow through a noise field while keeping their distance from each other.',
  },
  params: [
    { key: 'spacing', label: { de: 'Linienabstand', en: 'Line spacing' }, min: 0.8, max: 12, step: 0.1, value: 2.4, unit: 'mm', surprise: [1.5, 5] },
    { key: 'zoom', label: { de: 'Rauschgröße', en: 'Noise scale' }, min: 10, max: 400, step: 1, value: 90, unit: 'mm', surprise: [40, 200] },
    { key: 'turn', label: { de: 'Verwirbelung', en: 'Turbulence' }, min: 0.5, max: 8, step: 0.1, value: 2.2, surprise: [1, 4] },
    { key: 'maxLen', label: { de: 'Max. Linienlänge', en: 'Max. line length' }, min: 5, max: 600, step: 5, value: 180, unit: 'mm', surprise: [30, 300] },
    { key: 'minLen', label: { de: 'Min. Linienlänge', en: 'Min. line length' }, min: 0, max: 60, step: 1, value: 6, unit: 'mm', surprise: [2, 20] },
    { key: 'gap', label: { de: 'Lücke zum Nachbarn', en: 'Gap to neighbours' }, min: 0.2, max: 1, step: 0.05, value: 0.55, surprise: [0.4, 0.9] },
    { key: 'shape', type: 'select', label: { de: 'Form', en: 'Shape' }, value: 'rect', options: [
      { value: 'rect', label: { de: 'ganze Fläche', en: 'whole area' } },
      { value: 'circle', label: { de: 'Kreis', en: 'circle' } },
    ] },
  ],
  thumb: { spacing: 3, maxLen: 60, zoom: 60 },

  generate({ params: q, w, h, noise, random }) {
    const step = Math.min(0.5, q.spacing / 3), dtest = q.spacing * q.gap;
    const r0 = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
    const inside = (x, y) => q.shape === 'circle' ? Math.hypot(x - cx, y - cy) <= r0 : x >= 0 && y >= 0 && x <= w && y <= h;
    const angle = (x, y) => (noise(x / q.zoom, y / q.zoom) - 0.5) * 2 * Math.PI * q.turn;

    // Raster für die Abstandsprüfung: Zelle = Testabstand, gespeichert werden Punkt und Linien-Nummer
    const cell = dtest, cols = Math.ceil(w / cell) + 1, grid = new Map();
    const put = (x, y, id, n) => {
      const k = Math.floor(x / cell) + Math.floor(y / cell) * cols;
      (grid.get(k) || grid.set(k, []).get(k)).push(x, y, id, n);
    };
    // frei, wenn kein fremder Punkt (und kein eigener, der schon lange zurückliegt) näher als d liegt
    const free = (x, y, d, id, n) => {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell), dd = d * d, back = Math.ceil(q.spacing * 2 / step);
      for (let j = gy - 1; j <= gy + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) {
        const b = grid.get(i + j * cols); if (!b) continue;
        for (let m = 0; m < b.length; m += 4) {
          if (b[m + 2] === id && Math.abs(b[m + 3] - n) < back) continue;
          const dx = b[m] - x, dy = b[m + 1] - y;
          if (dx * dx + dy * dy < dd) return false;
        }
      }
      return true;
    };

    // Startpunkte auf einem verwackelten Raster, zufällig gemischt
    const seeds = [];
    for (let y = q.spacing / 2; y < h; y += q.spacing) for (let x = q.spacing / 2; x < w; x += q.spacing)
      seeds.push([x + random(-.4, .4) * q.spacing, y + random(-.4, .4) * q.spacing, random()]);
    seeds.sort((a, b) => a[2] - b[2]);

    const out = [], maxSteps = Math.ceil(q.maxLen / step / 2);
    let id = 0;
    for (const [sx, sy] of seeds) {
      if (!inside(sx, sy) || !free(sx, sy, q.spacing, -1, 0)) continue;
      id++;
      const touched = new Set();
      const add = (x, y, n) => { put(x, y, id, n); touched.add(Math.floor(x / cell) + Math.floor(y / cell) * cols); };
      const trace = (dir) => {           // von der Startstelle aus in eine Richtung wachsen
        const pts = []; let x = sx, y = sy;
        for (let s = 1; s <= maxSteps; s++) {
          const a = angle(x, y);
          x += Math.cos(a) * step * dir; y += Math.sin(a) * step * dir;
          if (!inside(x, y) || !free(x, y, dtest, id, dir * s)) break;   // prüft auch die eigene Linie (Wirbel)
          pts.push([x, y]); add(x, y, dir * s);
        }
        return pts;
      };
      add(sx, sy, 0);
      const fwd = trace(1), bwd = trace(-1);
      const line = [...bwd.reverse(), [sx, sy], ...fwd];
      if ((line.length - 1) * step < q.minLen) {   // zu kurz: wieder aus dem Raster nehmen
        for (const k of touched) {
          const b = grid.get(k), keep = [];
          for (let m = 0; m < b.length; m += 4) if (b[m + 2] !== id) keep.push(b[m], b[m + 1], b[m + 2], b[m + 3]);
          grid.set(k, keep);
        }
        continue;
      }
      out.push(line);
    }
    return out;
  },
});
