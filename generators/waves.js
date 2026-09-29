// Wellenlinien (wie das Cover von „Unknown Pleasures“): gestapelte Linien, in der Mitte von Rauschen
// nach oben ausgelenkt. Vordere (untere) Linien verdecken die dahinter; dafür wird von vorn nach hinten
// gezeichnet und je Spalte die höchste bisher gezeichnete Stelle gemerkt (Horizont).
UGEN.register({
  id: 'waves',
  name: { de: 'Wellenlinien', en: 'Ridge lines' },
  about: {
    de: 'Gestapelte Linien, in der Mitte von Rauschen aufgeworfen. Vordere Linien verdecken die hinteren.',
    en: 'Stacked lines pushed up by noise in the middle. Front lines hide the ones behind.',
  },
  params: [
    { key: 'rows', label: { de: 'Linien', en: 'Lines' }, min: 5, max: 200, step: 1, value: 64, surprise: [30, 110] },
    { key: 'amp', label: { de: 'Höhe', en: 'Height' }, min: 0, max: 80, step: 0.5, value: 22, unit: 'mm', surprise: [8, 40] },
    { key: 'zoom', label: { de: 'Rauschgröße', en: 'Noise scale' }, min: 2, max: 120, step: 1, value: 14, unit: 'mm', surprise: [6, 40] },
    { key: 'spread', label: { de: 'Breite der Berge', en: 'Width of peaks' }, min: 5, max: 100, step: 1, value: 34, unit: '%', surprise: [15, 60] },
    { key: 'sharp', label: { de: 'Schärfe', en: 'Sharpness' }, min: 1, max: 4, step: 0.1, value: 2.2, surprise: [1.2, 3.2] },
    { key: 'width', label: { de: 'Linienbreite', en: 'Line width' }, min: 20, max: 100, step: 1, value: 70, unit: '%' },
    { key: 'hidden', type: 'bool', label: { de: 'Verdeckte Teile weglassen', en: 'Remove hidden parts' }, value: true, fixed: true },
  ],
  thumb: { rows: 26, amp: 10, zoom: 8 },

  generate({ params: q, w, h, noise, random }) {
    const res = 0.4;                                 // Abstand der Stützpunkte in mm
    const lw = w * q.width / 100, x0 = (w - lw) / 2, cols = Math.ceil(lw / res) + 1;
    const top = Math.min(q.amp, h * .6), base0 = top, base1 = h;   // Platz für die Berge der hintersten Linie
    const offs = random(1000);
    const horizon = new Float64Array(cols).fill(Infinity);
    const out = [];
    for (let r = q.rows - 1; r >= 0; r--) {          // von vorn (unten) nach hinten
      const y = q.rows > 1 ? base0 + (base1 - base0) * r / (q.rows - 1) : h;
      let run = null;
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * res, u = (x - x0) / lw - .5;
        const env = Math.exp(-Math.pow(Math.abs(u) / (q.spread / 100 / 2), 2));   // Glocke in der Mitte
        const n = Math.pow(noise(x / q.zoom, r * .35 + offs), q.sharp);
        const py = y - q.amp * env * n * 1.8 - noise(x / 3, r * 7.3) * .6;         // feines Zittern am Rand
        const visible = !q.hidden || py <= horizon[c];
        if (visible) {
          horizon[c] = py;
          if (!run) { run = []; out.push(run); }
          run.push([x, py]);
        } else run = null;
      }
    }
    return out;
  },
});
