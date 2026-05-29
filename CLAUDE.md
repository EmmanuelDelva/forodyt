# CLAUDE.md — Memoria operativa del proyecto forodyt

Memoria persistente para Claude Code. Se carga sola en cada sesión abierta dentro de esta carpeta.
Su función: que cualquier Claude edite el sitio **sin romperlo** y conserve el **historial entre sesiones**.

> **Regla de mantenimiento:** al terminar un bloque de trabajo, añade una entrada a la §9 (Bitácora). Si descubres una trampa nueva, documéntala en la §6.

---

## 1. Qué es y quién decide

Sitio web del **IV Foro Internacional de Derecho y Tecnología** (CUCEA — Universidad de Guadalajara).

- Evento: 21 y 22 de septiembre de 2026, modalidad híbrida, Guadalajara.
- Tema IV edición: «Agentes, Algoritmos y Autonomía: el Derecho ante la Inteligencia que Decide».
- Director y único decisor: **Dr. Juan Emmanuel Delva Benavides** — `emmanueldelva@cucea.udg.mx`.
- El Foro **surge del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»** (no de CUCEA). El footer acredita al Cuerpo Académico.
- Nombre de marca oficial: **«Foro Internacional de Derecho y Tecnología»** — NUNCA «Mundial». Mantener "Internacional" en títulos, schema, Open Graph y footer.
- El director prefiere diseños premium, no invasivos y coherentes con la estética existente.

---

## 2. Reglas de oro — leer antes de tocar cualquier archivo

1. **Verifica siempre en producción** (`https://forodyt.vercel.app`), nunca en URLs de preview de Vercel: los previews tienen muro SSO y dan falsos negativos.
2. **Todo texto visible nuevo o modificado debe traducirse** en `i18n.js` para `en` y `fr`. Si no, queda sin traducir y el switcher "se rompe" a ojos del usuario.
3. **Contenido con acentos:** editar con la herramienta Edit o con bash/perl (`open '<:raw'`). NUNCA con PowerShell — produce mojibake (`tecnologÃ­a`).
4. **Cadenas en francés con apóstrofo** (`l'IA`, `d'autres`, `l'Université`) van escapadas `\'`. Un apóstrofo suelto lanza `SyntaxError` y rompe TODO `i18n.js`.
5. **Cada key de `i18n.js` lleva coma final.** Una coma faltante rompe el parseo del bloque de idioma completo.
6. **No reintroducir imágenes base64** en el HTML. Las imágenes viven como archivos en `img/`.
7. **Numerales romanos de ediciones en MAYÚSCULAS** y con formato uniforme en todo el sitio.
8. **`git add` por archivo concreto**, nunca `git add -A` (evita subir backups, scripts temporales, basura).
9. **Commits directos a `main`** con mensaje descriptivo + línea `Co-Authored-By`. Push y verificar.

---

## 3. Flujo de trabajo — cómo subir cambios sin romper

1. Leer este `CLAUDE.md` y el archivo objetivo completo antes de editar.
2. Aplicar el cambio (Edit para HTML / `i18n.js`).
3. Si tocaste **texto visible**: añadir o actualizar las keys `en` y `fr` correspondientes en `i18n.js`.
4. Si tocaste **`i18n.js`**: revisar apóstrofos FR escapados, comas finales y comillas balanceadas.
5. `git add` de los archivos concretos.
6. `git commit` con mensaje claro (`feat/fix/perf/docs/chore`) + `Co-Authored-By`.
7. `git push origin main`.
8. Esperar ~1-2 min el deploy de Vercel; verificar en `https://forodyt.vercel.app`.
9. Si tocaste contenido traducible, probar las tres versiones: `/`, `/?lang=en`, `/?lang=fr`.
10. Registrar lo hecho en la §9 (Bitácora).

**Verificación post-deploy útil:** `curl -s https://forodyt.vercel.app/<archivo>` para confirmar que el contenido nuevo está en línea antes de probar en navegador.

---

## 4. Arquitectura y archivos

- Sitio **estático**: HTML + CSS + JS vanilla. **Sin framework, sin build step, sin npm.**
- CSS embebido en `<style>` dentro de cada HTML; tokens de diseño en `:root`.
- Repo GitHub `EmmanuelDelva/forodyt`, rama `main`. Deploy automático en **Vercel** → `forodyt.vercel.app` (~1-2 min por push).

| Archivo | Rol |
|---|---|
| `index.html` | Landing del Foro |
| `cfp.html` | Call for Papers / convocatoria |
| `memorias.html` | Índice de ediciones anteriores |
| `memoria-i/ii/iii.html` | Memorias de las ediciones I, II, III |
| `programa.html` | Programa preliminar |
| `inscripcion.html` | Formulario de inscripción |
| `staff-scanner.html` | Vista interna de staff, NO enlazada en el menú público |
| `i18n.js` | Sistema de traducción trilingüe (~2400 líneas) |
| `mobile-menu.css` / `mobile-menu.js` | Menú móvil editorial |
| `sitemap.xml`, `robots.txt` | SEO / indexación |
| `googled59b34f81ee321b0.html` | Archivo de verificación de Google Search Console — NO borrar |
| `img/ponentes/*.jpg` | Fotos de ponentes (400×400) |
| `img/aliados/*.png` | Logos de aliados institucionales |
| `img/og-forodyt.jpg` | Imagen Open Graph (1200×630) |

---

## 5. Sistema i18n (`i18n.js`)

- IIFE con diccionarios `D = { es:{}, en:{}, fr:{} }`.
- Atributos en el HTML: `data-i18n` (textContent), `data-i18n-html` (innerHTML), `data-i18n-attr` (atributos).
- ES usa el texto del propio HTML como fallback cuando la key no está en el diccionario.
- API global: `window.foroI18n.setLang(lang)` / `getLang()`.
- Detección de idioma: `?lang=` en la URL → `localStorage` `forodyt_lang` → default `es`.
- `setLang()` refleja el idioma en la URL (`?lang=en`) y sincroniza `canonical`, `og:url`, `og:locale`, `<html lang>`.

### Las 3 trampas de i18n (rompen el archivo entero)
1. Apóstrofo sin escapar en una cadena FR → `SyntaxError` → ningún idioma funciona.
2. Coma faltante tras una key → se rompe el parseo del bloque de idioma.
3. `data-i18n` en un elemento con hijos (ej. `<a>` con `<span>` dentro): el `textContent=` borra los hijos. Poner `data-i18n` en un span hoja.

**Prueba rápida tras tocar i18n.js:** en consola del navegador, `window.foroI18n` debe existir; si es `undefined`, el IIFE se rompió.

---

## 6. Trampas conocidas

- **Mojibake (codificación):** los archivos son UTF-8. PowerShell los lee como windows-1252 y corrompe acentos. Usar Edit o bash/perl con `:raw`.
- **CSS grid overflow en móvil:** `grid-template-columns: repeat(auto-fit, minmax(180px,1fr))` se resuelve a columnas fijas que desbordan el viewport. En media queries móviles usar `grid-template-columns: 1fr`.
- **Imágenes:** todas externas en `img/`. Sin herramienta WebP local (cwebp/ImageMagick/ffmpeg ausentes). Optimización vía PowerShell `System.Drawing`; el codificador PNG de .NET es pobre para logos planos → conservar el menor entre original y optimizado.
- **Lazy-load en pruebas:** las imágenes `loading="lazy"` cargan al hacer scroll; dar un par de segundos antes de capturar pantalla o se ven cajas vacías (falso negativo).
- **Chrome MCP:** `resize_window` no cambia el viewport real; para simular móvil (390px) usar la técnica de iframe.

---

## 7. Estado del SEO

- **Google Search Console:** propiedad `https://forodyt.vercel.app` verificada por doble método — meta `google-site-verification` (`TfauxMAhbkbtJjZkPMyG8Ncs0T4rYPgz51WvZhDJMkg`) + archivo `googled59b34f81ee321b0.html`.
- `sitemap.xml` enviado a GSC; `robots.txt` válido.
- `index.html` lleva JSON-LD: schema `Event` + `WebSite` + `Organization`.
- **hreflang** `es/en/fr/x-default` en las 8 páginas; `sitemap.xml` con anotaciones `xhtml:link`.
- Open Graph + Twitter cards + `canonical` en todas las páginas; `og:image` = `img/og-forodyt.jpg`.
- `<meta keywords>` con términos de tendencia en las 8 páginas.

**Pendientes de SEO (dependen del director):** dominio propio (forodyt.org/.mx), backlinks desde UDG/CUCEA/AMCID/universidades de ponentes, conversión real a WebP.

---

## 8. Datos del evento

- **Ponentes confirmados IV (7):** Alejandro Axel Rivera Martínez · María Luisa García Torres · Manuel Raad Berrio · Velda Abigail Gámez Bustamante · Ernesto Ibarra Sánchez · Rodrigo Alejandro Gómez Torre · José Vega Sacasa. Hay 1 placeholder «Próximamente seguiremos confirmando más ponentes». El orden busca alternar hombres y mujeres para que la paridad se note (mujeres en pos 2 y 4). El array `performer` del schema Event en index.html debe mantenerse sincronizado con esta lista.
- **Footer:** acredita al «Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»» — no a CUCEA. Incluye Instagram `@forodyt_oficial` y Facebook.
- **Ejes temáticos:** 9 ejes / líneas temáticas unificados en todo el sitio.
- Las cards de edición en `index.html` enlazan a su memoria (I→memoria-i, II→memoria-ii, III→memoria-iii, IV→cfp).

---

## 9. Bitácora — trabajo realizado entre sesiones

### Sesiones previas (hasta 2026-05-20)
- Unificación a 9 ejes/líneas temáticas en todo el sitio.
- Traducción EN/FR funcional sitewide (fix de apóstrofos FR y coma faltante en `i18n.js`).
- Switcher de idiomas y menú móvil editorial; switcher ES/EN/FR visible en el header móvil.
- Reorden del menú: Memorias › Convocatoria › Programa › anclas internas; menú completo en páginas internas.
- Numerales romanos en mayúsculas, formato uniforme.
- Confirmación de ponentes: Ernesto Ibarra Sánchez y Rodrigo Alejandro Gómez Torre.
- Rediseño completo de `memoria-iii.html` (plan de 10 bloques, PR #1 fusionado) + 13 ajustes editoriales.
- Fix de mojibake; rediseño de la sección CTA IV con paleta disruptiva pero coherente.
- Limpieza de la sección de aliados (logos estilo Canva).
- 8 correcciones reportadas por Jorge Leos; reducción de placeholders «Por confirmar» a 1.
- Footer e Instagram/Facebook; cards de edición clicables; menú no invasivo en `cfp.html`.
- Footer corregido a «Cuerpo Académico» en todas las páginas.

### Sesión 2026-05-20 — SEO, rendimiento e indexación
- **Paquete SEO completo:** `sitemap.xml`, `robots.txt`, Open Graph, Twitter cards, JSON-LD `Event`, `canonical`, imagen `og-forodyt.jpg`.
- **Registro en Google Search Console:** propiedad verificada por doble método (meta + archivo HTML); `sitemap.xml` enviado.
- Schema `WebSite` + `Organization` añadido a `index.html` (controla el nombre de sitio en Google).
- **Externalización de 18 imágenes base64:** `index.html` pasó de 2 463 KB a 69 KB; imágenes optimizadas en `img/`, con `width`/`height`/`loading=lazy`/`decoding=async`.
- **hreflang ES/EN/FR** en las 8 páginas; `i18n.js` sincroniza URL/`canonical`/`og`; `sitemap.xml` con `xhtml:link`.
- `<meta keywords>` con términos de tendencia en las 8 páginas.
- Creación de este `CLAUDE.md` como memoria operativa del proyecto.
- Títulos `<title>` de 4 páginas (index, inscripcion, memorias, programa): «CUCEA-UDG» → «Cuerpo Académico «Derecho y Tecnología» · UDG». Las apariciones de CUCEA-UDG en afiliaciones, footer y descripciones de memorias se conservan (es la sede real).
- Imagen de compartir en redes (`og:image`/`twitter:image`): `img/og-forodyt.jpg` reemplazada por una foto del auditorio lleno del II Foro, recortada a 1200×630. Todas las páginas la referencian; no requirió editar HTML.
- Confirmada la **Dra. Velda Abigail Gámez Bustamante** (Tec de Monterrey) como 5ª ponente IV, en posición 2 (tras Rivera Martínez): tarjeta en index.html + keys EN/FR en i18n.js + foto `img/ponentes/velda-gamez.jpg` recortada a 400×400.
- Schema `Event` de index.html: añadidos `performer` (los 5 ponentes confirmados), `price` y `priceCurrency` en `offers`, corrigiendo 3 avisos no críticos de Google Search Console.
- Confirmada la **Dra. María Luisa García Torres** (Universidad Alfonso X el Sabio · IusConnect, España) como 6ª ponente IV, en posición 2; Velda Gámez se desplazó a la posición 4 para mantener la paridad H-M-H-M visible. Tarjeta + traducciones EN/FR + foto recortada a 400×400.
- Confirmado el **Dr. José Vega Sacasa** (APPIF · Fintegrity Group, Panamá) como 7º ponente IV, en posición 7. Tema: trazabilidad y auditoría forense de criptoactivos (líneas vi FinTech + iii Ciberseguridad). Tarjeta + traducciones EN/FR + foto 400×400 + añadido al array `performer` del schema.

### Sesión 2026-05-27 — Migración a dominio canónico forodyt.com + AI opt-out + analytics

- **Dominio propio activo**: `forodyt.com` (registrado en Cloudflare Registrar el 2026-05-25). Vercel ya servía el sitio en `forodyt.com` con TLS auto; faltaba migrar las URLs hardcoded en el repo.
- **Search & replace masivo**: 120 ocurrencias de `forodyt.vercel.app` → `forodyt.com` en 11 archivos (los 8 HTML + sitemap.xml + robots.txt + i18n.js no requirió cambios porque usa `location.origin`). Vía `perl -i -pe`.
- **`<title>` acortados** (4 páginas): index/programa/inscripcion/memorias bajaron de 95-110 chars a ≤75. Mejor CTR en SERP.
- **`robots.txt` con AI opt-out granular**: bloquea GPTBot, CCBot, Google-Extended, Bytespider, anthropic-ai, Omgilibot, FacebookBot, Diffbot, Amazonbot, cohere-ai, AI2Bot, ImagesiftBot. **Permite** ClaudeBot, Claude-Web, PerplexityBot, YouBot, Applebot-Extended (los que sí citan fuente y envían tráfico real).
- **`sitemap.xml`**: 8 URLs migradas + `lastmod=2026-05-27`. Reenviado a GSC bajo la propiedad nueva.
- **JSON-LD `Organization`**: añadidos `email: contacto@forodyt.com` + `founder` (Person Director Dr. Emmanuel Delva con sameAs LinkedIn `dr-emmanuel-delva` + ORCID `0000-0002-2859-378X` + Google Scholar). `sameAs` actualizado: cambia FB share-URL legacy por FB Page propia del Foro (id=61580204966427).
- **Analytics**: snippet de **Cloudflare Web Analytics** + **Vercel Speed Insights** inyectado antes de `</body>` en los 8 HTML. CF token = placeholder `CF_TOKEN_FORODYT` por reemplazar manualmente (el dashboard de CF se atascó en automatización; pasos manuales en §10).
- **Footer Contacto del index**: ahora muestra **ambos** correos en orden: `contacto@forodyt.com` (canónico nuevo, alias vía Cloudflare Email Routing) + `emmanueldelva@cucea.udg.mx` (institucional UDG, sin tocar). El cucea sigue siendo el remitente del Apps Script y de todas las páginas internas (inscripción, ARCO, etc.).
- **GSC**: nueva propiedad de dominio `forodyt.com` verificada vía Cloudflare Domain Connect (TXT 1-click, mismo método que delvayasociados). Sitemap `https://forodyt.com/sitemap.xml` enviado correctamente; estado inicial "No se ha podido obtener" (normal en los primeros minutos; Google rastrea en 24-48 h).
- **FB Page del Foro**: encontrada y editada como admin: `Foro Internacional de Derecho y Tecnología` (id=61580204966427). Cambios: Presentación con bio del IV Foro + forodyt.com; Enlace oficial `https://www.forodyt.com`; Email cambiado de `foro.derechoytecnlogia@gmail.com` (typo) → `contacto@forodyt.com`.
- **IG @forodyt_oficial**: bio actualizada a "IV Foro Internacional de Derecho y Tecnología · Multisede-UDG · 21-22 sept 2026 · Híbrido · forodyt.com" (103/150). El campo "Sitio web" solo es editable desde la app móvil — pendiente cambio manual desde celular para `forodyt.vercel.app` → `forodyt.com`.

**Commit clave de esta sesión**: `ecd0e00 — feat(seo): migra a dominio canonico forodyt.com + AI opt-out + analytics + contacto profesional`.

---

## 10. Pendientes abiertos

- **CF Web Analytics token**: crear site `forodyt.com` en `dash.cloudflare.com/<account>/web-analytics`, copiar el token de 32 chars del snippet generado y reemplazar `CF_TOKEN_FORODYT` en los 8 HTML con `perl -i -pe 's/CF_TOKEN_FORODYT/<TOKEN>/g' *.html`. Commit + push.
- **IG website link**: editar `forodyt.vercel.app` → `forodyt.com` desde la app móvil de Instagram (IG no permite editar links desde desktop).
- Estrategia de backlinks institucionales (UDG, CUCEA, AMCID, ALGDETIC, universidades de ponentes).
- Conversión de imágenes a WebP (requiere instalar `cwebp` o servir vía Vercel Image Optimization).
- Seguir confirmando ponentes de la IV edición.
