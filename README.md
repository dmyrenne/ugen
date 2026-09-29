# µgen

Studio für generative Plotter-Kunst, gebaut mit [p5.js](https://p5js.org). Die Generatoren erzeugen reine
Linienzeichnungen und exportieren sie als SVG in Millimetern, bereit für
[µplot](https://github.com/dmyrenne/uplot) oder jedes andere Plotter-Werkzeug (z. B. vpype).

## Installation mit Docker

Fertiges Image für amd64 und arm64 (z. B. Raspberry Pi):

    docker run -d --name ugen -p 127.0.0.1:5056:8080 --restart unless-stopped ghcr.io/dmyrenne/ugen:latest

Oder mit Compose aus dem Projektordner:

    docker compose up -d                 # http://127.0.0.1:5056

| Aufgabe | Befehl |
| --- | --- |
| Stoppen | `docker compose down` |
| Aktualisieren | `docker compose pull && docker compose up -d` |
| Selbst bauen | `docker compose up -d --build` |

Das Image ist ein schlanker nginx ohne Root-Rechte, der die statischen Dateien ausliefert (Port 8080 im
Container). Einstellungen speichert der Browser, der Container hat keine Daten. Für andere Geräte im Netz in
`compose.yaml` `"127.0.0.1:5056:8080"` durch `"5056:8080"` ersetzen.

### Image-Builds

GitHub Actions (`.github/workflows/docker.yml`) baut bei jedem Push auf `main` das Image für amd64 und arm64
und veröffentlicht es als `ghcr.io/dmyrenne/ugen:latest` und `:sha-<commit>`. Ein Tag `v1.2.3` erzeugt
zusätzlich `:1.2.3` und `:1.2`:

    git tag v1.1.0 && git push --tags

## Starten ohne Docker

    ./start.sh              # öffnet http://127.0.0.1:5056

`./start.sh 8080` wählt einen anderen Port. Es braucht nur Python 3, weder Build noch Internet: p5.js und die
Schriften liegen im Projekt.

`index.html` direkt zu öffnen klappt nur in Browsern ohne Sandbox. Browser als Flatpak oder Snap (z. B. Chrome
von Flathub) bekommen beim Öffnen per Datei nur `index.html` freigegeben, nicht die Skripte daneben; µgen zeigt
dann einen Hinweis.

## Generatoren

| Generator | Idee |
| --- | --- |
| **Mesh-Blob** | Unterteiltes Ikosaeder, Radius per Perlin-Rauschen verbeult. Gezeichnet werden die Kanten der Dreiecke, die zum Betrachter zeigen; am Rand rücken sie von selbst dicht zusammen. Kanten werden zu langen Linienzügen verkettet, damit der Stift selten absetzt. |
| **Flow Field** | Linien folgen einem Rauschfeld und halten einen Mindestabstand zueinander (vereinfacht nach Jobard & Lefer). Wahlweise auf der ganzen Fläche oder in einem Kreis. |
| **Wellenlinien** | Gestapelte Linien, in der Mitte von Rauschen aufgeworfen. Verdeckte Teile werden über einen Horizont je Spalte entfernt, von vorn nach hinten. |
| **Harmonograph** | Zwei gedämpfte Pendel je Achse, überlagert zu einer einzigen Linie. Optional dreht sich das Papier mit. |

## Bedienung

- **Parameter** über die Regler; „Überrasch mich“ würfelt alle Parameter und den Zufallswert.
- **Zufallswert**: gleicher Wert und gleiche Parameter ergeben immer dasselbe Bild. `R` würfelt neu.
- **Papier**: Formate A5, A4, A3, 200 × 200 mm, die Plotfläche des MK3S+ aus µplot (203 × 170 mm) oder
  eigene Maße; dazu ein Rand. Linien außerhalb des Rands werden abgeschnitten.
- **Stift**: Farbe und Strichbreite für Vorschau und SVG.
- **Plot abspielen** (`Leertaste`) zeigt, in welcher Reihenfolge die Linien entstehen.
- **SVG exportieren** (`S`). Die Datei enthält in `<desc>` Generator, Zufallswert, Parameter und Papier,
  damit sich jedes Bild wieder erzeugen lässt.
- Mausrad zoomt, Ziehen verschiebt, Doppelklick setzt die Ansicht zurück.
- Sprache Deutsch/Englisch oben rechts. Alle Einstellungen merkt sich der Browser.

In µplot die SVG laden und „An Plotfläche anpassen“ ausschalten, wenn sie schon im Format der
Plotfläche erzeugt wurde; sonst passt µplot sie ein.

## Eigenen Generator hinzufügen

Neue Datei in `generators/`, in `index.html` per `<script>` einbinden:

```js
UGEN.register({
  id: 'kreise',
  name: { de: 'Kreise', en: 'Circles' },
  about: { de: 'Konzentrische Kreise.', en: 'Concentric circles.' },
  params: [
    // Regler: min/max/step/value, optional unit und surprise: [von, bis] für „Überrasch mich“
    { key: 'count', label: { de: 'Anzahl', en: 'Count' }, min: 1, max: 100, step: 1, value: 20 },
    // außerdem type: 'bool' (value: true/false) und type: 'select' (options: [{ value, label }])
  ],
  thumb: { count: 8 },   // optionale Werte für das kleine Vorschaubild
  // w, h: Zeichenfläche in mm (Papier minus Rand), Ursprung oben links, y nach unten.
  // noise(x, y, z) und random(a, b) kommen aus p5 und hängen vom Zufallswert ab.
  // Rückgabe: Liste von Linienzügen, jeder eine Liste von [x, y] in mm.
  generate({ params, w, h, noise, random, p }) {
    const r0 = Math.min(w, h) / 2;
    return Array.from({ length: params.count }, (_, i) => {
      const r = r0 * (i + 1) / params.count;
      return Array.from({ length: 121 }, (_, k) => [w / 2 + r * Math.cos(k * Math.PI / 60), h / 2 + r * Math.sin(k * Math.PI / 60)]);
    });
  },
});
```

`p` ist die p5-Instanz, falls weitere p5-Funktionen gebraucht werden.

## Credits

µgen by Daniel Myrenne.

- [p5.js](https://p5js.org) 2.3.4, LGPL-2.1 (`lib/p5-LICENSE.txt`)
- Schriften [Space Grotesk](https://github.com/floriankarsten/space-grotesk) und
  [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), SIL Open Font License (`fonts/OFL-*.txt`)
