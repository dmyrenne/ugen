// Übersetzungen für die Oberfläche. Texte der Generatoren stehen direkt in generators/*.js.
// Platzhalter in {geschweiften Klammern} werden von t() ersetzt; Schlüssel mit HTML sind mit .html markiert.
const LANGS = { de: 'Deutsch', en: 'English' };

const I18N = {
  de: {
    'lang': 'Sprache',
    'tagline': 'generative Plotter-Kunst',
    'h.generator': 'Generator',
    'h.params': 'Parameter',
    'surprise': 'Überrasch mich',
    'surprise.title': 'Alle Parameter zufällig wählen',
    'resetParams': 'Parameter zurücksetzen',
    'h.seed': 'Zufallswert',
    'dice': 'Würfeln',
    'dice.title': 'Neuer Zufallswert (Taste R)',
    'seed.hint.html': 'Gleicher Zufallswert und gleiche Parameter ergeben immer dasselbe Bild. Beides steht auch in der exportierten SVG.',
    'h.paper': 'Papier',
    'format': 'Format',
    'format.custom': 'Eigenes Format',
    'format.uplot': 'µplot MK3S+ Plotfläche',
    'paper_w': 'Breite (mm)',
    'paper_h': 'Höhe (mm)',
    'margin': 'Rand (mm)',
    'rotatePaper': 'Hoch/Quer',
    'h.pen': 'Stift',
    'pen_color': 'Farbe',
    'pen_width': 'Strichbreite (mm)',
    'pen.hint': 'Farbe und Breite gelten für Vorschau und SVG. µplot zeichnet die Linien mit dem Stift, der eingelegt ist.',
    'play': 'Plot abspielen',
    'stop': 'Stopp',
    'fitView': 'Ansicht zurücksetzen',
    'export': 'SVG exportieren',
    'stat.lines': 'Linienzüge',
    'stat.length': 'Linienlänge',
    'stat.size': 'Zeichnung',
    'busy': 'rechne …',
    'keys.html': '<kbd>R</kbd> würfeln · <kbd>S</kbd> SVG speichern · <kbd>Leertaste</kbd> abspielen · Mausrad zoomt, Ziehen verschiebt',
    'footer.html': 'µgen by Daniel Myrenne · gebaut mit <a href="https://p5js.org" target="_blank" rel="noopener">p5.js</a> · SVG für <a href="https://github.com/dmyrenne/uplot" target="_blank" rel="noopener">µplot</a>',
  },
  en: {
    'lang': 'Language',
    'tagline': 'generative plotter art',
    'h.generator': 'Generator',
    'h.params': 'Parameters',
    'surprise': 'Surprise me',
    'surprise.title': 'Pick random values for all parameters',
    'resetParams': 'Reset parameters',
    'h.seed': 'Seed',
    'dice': 'Roll',
    'dice.title': 'New seed (key R)',
    'seed.hint.html': 'The same seed and parameters always give the same image. Both are also stored in the exported SVG.',
    'h.paper': 'Paper',
    'format': 'Format',
    'format.custom': 'Custom size',
    'format.uplot': 'µplot MK3S+ plot area',
    'paper_w': 'Width (mm)',
    'paper_h': 'Height (mm)',
    'margin': 'Margin (mm)',
    'rotatePaper': 'Portrait/Landscape',
    'h.pen': 'Pen',
    'pen_color': 'Color',
    'pen_width': 'Line width (mm)',
    'pen.hint': 'Color and width apply to the preview and the SVG. µplot draws the lines with whatever pen is loaded.',
    'play': 'Play plot',
    'stop': 'Stop',
    'fitView': 'Reset view',
    'export': 'Export SVG',
    'stat.lines': 'Paths',
    'stat.length': 'Line length',
    'stat.size': 'Drawing',
    'busy': 'computing …',
    'keys.html': '<kbd>R</kbd> roll · <kbd>S</kbd> save SVG · <kbd>Space</kbd> play · wheel zooms, drag pans',
    'footer.html': 'µgen by Daniel Myrenne · built with <a href="https://p5js.org" target="_blank" rel="noopener">p5.js</a> · SVG for <a href="https://github.com/dmyrenne/uplot" target="_blank" rel="noopener">µplot</a>',
  },
};

function pickLang() {
  try { const s = localStorage.getItem('ugen-lang'); if (s && I18N[s]) return s; } catch {}
  for (const l of navigator.languages || [navigator.language]) {
    const code = (l || '').slice(0, 2).toLowerCase();
    if (I18N[code]) return code;
  }
  return 'en';
}
let LANG = pickLang();

function t(key, vars = {}) {
  const s = I18N[LANG][key] ?? I18N.de[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
// Text eines Generators ({de, en} oder einfacher String)
const tr = (v) => (v && typeof v === 'object') ? (v[LANG] ?? v.de) : v;

function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
}
