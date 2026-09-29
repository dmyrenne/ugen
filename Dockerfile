# µgen als statische Seite in nginx (ohne Root-Rechte, Port 8080 im Container)
FROM nginxinc/nginx-unprivileged:1.30-alpine

LABEL org.opencontainers.image.title="µgen" \
      org.opencontainers.image.description="Studio für generative Plotter-Kunst (p5.js), SVG-Export für µplot" \
      org.opencontainers.image.source="https://github.com/dmyrenne/ugen" \
      org.opencontainers.image.licenses="LGPL-2.1-only AND OFL-1.1"

COPY index.html app.js i18n.js /usr/share/nginx/html/
COPY generators /usr/share/nginx/html/generators
COPY lib /usr/share/nginx/html/lib
COPY fonts /usr/share/nginx/html/fonts

EXPOSE 8080
