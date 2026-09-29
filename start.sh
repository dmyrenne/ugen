#!/bin/sh
# Startet einen kleinen Webserver für µgen und öffnet den Browser.
# Nötig, weil manche Browser (z. B. als Flatpak/Snap) beim Öffnen per file:// nur index.html sehen,
# nicht die Skripte daneben.
cd "$(dirname "$0")"
PORT="${1:-5056}"
URL="http://127.0.0.1:$PORT"
echo "µgen läuft auf $URL (Beenden mit Strg+C)"
( sleep 1; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1 ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
