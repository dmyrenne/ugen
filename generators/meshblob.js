// Mesh-Blob: eine aus Dreiecken aufgebaute Kugel (unterteiltes Ikosaeder), deren Radius per Perlin-Rauschen
// verbeult wird. Gezeichnet werden die Kanten der Dreiecke, die zum Betrachter zeigen; wo die Oberfläche
// seitlich wegkippt, rücken die Kanten dicht zusammen und bilden den dunklen Rand.
UGEN.register({
  id: 'meshblob',
  name: { de: 'Mesh-Blob', en: 'Mesh blob' },
  about: {
    de: 'Verbeulte Dreiecks-Kugel. Verdeckte Rückseite wird weggelassen, dichte Kanten am Rand entstehen von selbst.',
    en: 'Warped triangle sphere. The hidden back is left out; the dense edges at the rim appear on their own.',
  },
  params: [
    { key: 'detail', label: { de: 'Maschendichte', en: 'Mesh density' }, min: 4, max: 70, step: 1, value: 36, surprise: [18, 50] },
    { key: 'bumps', label: { de: 'Verbeulung', en: 'Bumpiness' }, min: 0, max: 0.8, step: 0.01, value: 0.32, surprise: [0.1, 0.5] },
    { key: 'zoom', label: { de: 'Rauschgröße', en: 'Noise scale' }, min: 0.2, max: 4, step: 0.05, value: 1.1, surprise: [0.5, 2] },
    { key: 'rotX', label: { de: 'Kippen', en: 'Tilt' }, min: -90, max: 90, step: 1, value: 18, unit: '°' },
    { key: 'rotY', label: { de: 'Drehen', en: 'Turn' }, min: -180, max: 180, step: 1, value: 25, unit: '°' },
    { key: 'size', label: { de: 'Größe', en: 'Size' }, min: 10, max: 100, step: 1, value: 88, unit: '%', surprise: [70, 95] },
    { key: 'back', type: 'bool', label: { de: 'Rückseite mitzeichnen', en: 'Draw back side' }, value: false },
  ],
  thumb: { detail: 14 },

  generate({ params: q, w, h, noise }) {
    // --- Ikosaeder, jede Fläche in detail² Dreiecke unterteilt, Punkte auf die Kugel projiziert ---
    const t = (1 + Math.sqrt(5)) / 2;
    const ico = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                 [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6],
                   [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10],
                   [8, 6, 7], [9, 8, 1]];
    const n = q.detail, verts = [], index = new Map(), tris = [];
    const vid = (x, y, z) => {                   // gemeinsame Punkte der Nachbarflächen nur einmal anlegen
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
      let i = index.get(key);
      if (i === undefined) { i = verts.length; verts.push([x, y, z]); index.set(key, i); }
      return i;
    };
    for (const [ia, ib, ic] of faces) {
      const A = ico[ia], B = ico[ib], C = ico[ic], grid = [];
      for (let i = 0; i <= n; i++) {
        grid[i] = [];
        for (let j = 0; j <= n - i; j++) {
          const u = i / n, v = j / n;
          grid[i][j] = vid(A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v,
                           A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v,
                           A[2] + (B[2] - A[2]) * u + (C[2] - A[2]) * v);
        }
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) {
        tris.push([grid[i][j], grid[i + 1][j], grid[i][j + 1]]);
        if (j < n - i - 1) tris.push([grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]);
      }
    }

    // --- verbeulen, drehen, orthografisch projizieren ---
    const ax = q.rotX * Math.PI / 180, ay = q.rotY * Math.PI / 180;
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    const P = verts.map(([x, y, z]) => {
      const r = 1 + q.bumps * (2 * noise(x * q.zoom + 10, y * q.zoom + 10, z * q.zoom + 10) - 1);
      x *= r; y *= r; z *= r;
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;           // um y drehen
      const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;           // um x kippen
      return [x1, -y2, z2];                                          // Bildschirm: y nach unten
    });

    // --- Kanten der sichtbaren Dreiecke sammeln (jede Kante nur einmal) ---
    const edges = new Map();
    for (const [a, b, c] of tris) {
      const [x0, y0] = P[a], [x1, y1] = P[b], [x2, y2] = P[c];
      const facing = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0) < 0;   // Umlaufsinn im Bild = zeigt zum Betrachter
      if (!facing && !q.back) continue;
      for (const [i, j] of [[a, b], [b, c], [c, a]]) edges.set(i < j ? i * 1e6 + j : j * 1e6 + i, [i, j]);
    }

    // --- Kanten zu langen Linienzügen verketten (weniger Stiftheben): immer die geradeste Fortsetzung ---
    const adj = new Map();
    for (const [key, [i, j]] of edges) {
      (adj.get(i) || adj.set(i, []).get(i)).push([key, j]);
      (adj.get(j) || adj.set(j, []).get(j)).push([key, i]);
    }
    const used = new Set(), chains = [];
    const extend = (chain) => {
      for (;;) {
        const cur = chain[chain.length - 1], prev = chain[chain.length - 2];
        const dx = P[cur][0] - P[prev][0], dy = P[cur][1] - P[prev][1], dl = Math.hypot(dx, dy) || 1;
        let best = null, bestCos = 0.85;                               // höchstens ~30° Knick
        for (const [key, nb] of adj.get(cur)) {
          if (used.has(key)) continue;
          const ex = P[nb][0] - P[cur][0], ey = P[nb][1] - P[cur][1];
          const c = (dx * ex + dy * ey) / (dl * (Math.hypot(ex, ey) || 1));
          if (c > bestCos) { bestCos = c; best = [key, nb]; }
        }
        if (!best) return;
        used.add(best[0]); chain.push(best[1]);
      }
    };
    for (const [key, [i, j]] of edges) {
      if (used.has(key)) continue;
      used.add(key);
      const chain = [i, j];
      extend(chain); chain.reverse(); extend(chain);
      chains.push(chain);
    }

    // --- auf die Zeichenfläche einpassen ---
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of chains) for (const v of c) {
      x0 = Math.min(x0, P[v][0]); x1 = Math.max(x1, P[v][0]); y0 = Math.min(y0, P[v][1]); y1 = Math.max(y1, P[v][1]);
    }
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * q.size / 100;
    const ox = w / 2 - (x0 + x1) / 2 * k, oy = h / 2 - (y0 + y1) / 2 * k;
    return chains.map((c) => c.map((v) => [ox + P[v][0] * k, oy + P[v][1] * k]));
  },
});
