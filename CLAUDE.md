# CLAUDE.md — Memoria del proyecto forodyt

Memoria persistente para Claude Code. Se carga automáticamente en cada sesión dentro de esta carpeta.

## Qué es este proyecto

Sitio web del **IV Foro Internacional de Derecho y Tecnología** (CUCEA — Universidad de Guadalajara).
- Evento: 21 y 22 de septiembre de 2026, modalidad híbrida, Guadalajara.
- Tema IV edición: «Agentes, Algoritmos y Autonomía: el Derecho ante la Inteligencia que Decide».
- Director: Dr. Juan Emmanuel Delva Benavides — `emmanueldelva@cucea.udg.mx`.
- El Foro **surge del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»** (no de CUCEA). El footer debe acreditar al Cuerpo Académico, no a CUCEA.

### Nombre de marca
El nombre oficial es **«Foro Internacional de Derecho y Tecnología»** — NO «Mundial». Confirmado por el director. Mantener "Internacional" en todo el sitio (títulos, schema, og, footer).

## Stack y arquitectura

- Sitio **estático**: HTML + CSS + JS vanilla. **Sin framework, sin build step, sin npm.**
- CSS embebido en `<style>` dentro de cada HTML; tokens en `:root`.
- Repo GitHub: `EmmanuelDelva/forodyt`, rama `main`.
- Deploy automático en **Vercel** → `https://forodyt.vercel.app`. Push a `main` → deploy en ~1-2 min.
- ⚠️ Los **preview deployments de Vercel tienen muro SSO** (login). Para verificar cambios usar siempre la URL de **producción** (`forodyt.vercel.app`), no las URLs de preview.

### Archivos
- 8 páginas públicas: `index.html`, `cfp.html`, `memorias.html`, `memoria-i.html`, `memoria-ii.html`, `memoria-iii.html`, `programa.html`, `inscripcion.html`.
- `staff-scanner.html` — vista interna de staff, no enlazada en el menú público.
- `i18n.js` — sistema de traducción (~2400 líneas).
- `mobile-menu.css` / `mobile-menu.js` — menú móvil editorial.
- `sitemap.xml`, `robots.txt`, `googled59b34f81ee321b0.html` (verificación Google).
- `img/ponentes/*.jpg` (fotos 400x400), `img/aliados/*.png` (logos), `img/og-forodyt.jpg`.

## Sistema i18n (i18n.js)

- IIFE con diccionarios `D = { es:{}, en:{}, fr:{} }`.
- Atributos: `data-i18n` (textContent), `data-i18n-html` (innerHTML), `data-i18n-attr` (atributos).
- ES usa el texto del HTML como fallback cuando la key no está en el diccionario.
- API: `window.foroI18n.setLang(lang)` / `getLang()`.
- Detección de idioma: `?lang=` en URL → localStorage `forodyt_lang` → default `es`.
- `setLang()` refleja el idioma en la URL (`?lang=en`) y sincroniza `canonical`, `og:url`, `og:locale`, `<html lang>`.

### ⚠️ Gotchas de i18n (rompen TODO el archivo si fallan)
1. **Apóstrofos en francés**: cadenas como `l'IA`, `d'autres`, `l'Université` DEBEN escaparse `\'`. Un apóstrofo sin escapar lanza `SyntaxError` y rompe el IIFE completo → ningún idioma funciona. Revisar siempre las cadenas FR nuevas.
2. **Comas**: cada key necesita su coma final. Una coma faltante rompe el parseo de todo el bloque del idioma.
3. **`textContent` borra hijos**: si pones `data-i18n` en un elemento con hijos (ej. `<a>` con un `<span>` dentro), el `textContent=` los destruye. Pon `data-i18n` en un span hoja.

## ⚠️ Gotcha de codificación (mojibake)

Los archivos son **UTF-8**. PowerShell lee archivos con acentos como windows-1252 y produce mojibake (`tecnologÃ­a`, `IvÃ¡n`, `Â·`).
- Para contenido con acentos: usar **bash/perl** (con `open '<:raw'` / `'>:raw'`, byte passthrough) o la **herramienta Edit**.
- NO usar PowerShell para escribir cadenas acentuadas en archivos.

## ⚠️ Gotcha de CSS

`grid-template-columns: repeat(auto-fit, minmax(180px,1fr))` puede **desbordar en móvil** (resuelve a columnas fijas que suman más que el viewport). En media queries móviles usar `grid-template-columns: 1fr`.

## Imágenes

- Todas las imágenes son **archivos externos** en `img/` (ya NO hay base64 inline; `index.html` se redujo de 2.4 MB a ~69 KB).
- Los `<img>` llevan `width`, `height`, `loading="lazy"`, `decoding="async"`.
- No hay herramienta de conversión a WebP instalada (cwebp/ImageMagick/ffmpeg). Si se necesita WebP, hay que instalar `cwebp` primero.
- Optimización de imágenes vía PowerShell `System.Drawing` (resize + JPEG quality). El codificador PNG de .NET es pobre para logos planos → al re-encodear PNG, conservar el menor entre original y optimizado.

## Estado del SEO (ya implementado)

- **Google Search Console**: propiedad `https://forodyt.vercel.app` verificada (doble método: meta tag `google-site-verification` + archivo `googled59b34f81ee321b0.html`).
- `sitemap.xml` enviado a GSC; `robots.txt` válido.
- JSON-LD en `index.html`: schema `Event` + `WebSite` + `Organization`.
- **hreflang** es/en/fr/x-default en las 8 páginas; `sitemap.xml` con anotaciones `xhtml:link`.
- Open Graph + Twitter cards + canonical en todas las páginas; `og:image` = `img/og-forodyt.jpg`.
- `<meta keywords>` con términos de tendencia en las 8 páginas.

### Pendientes de SEO (dependen del usuario)
- **Dominio propio** (forodyt.org / .mx) — mayor impacto; hoy es subdominio de vercel.app.
- **Backlinks** desde UDG/CUCEA, AMCID, universidades de ponentes, directorios de congresos.
- Conversión real a WebP (requiere instalar herramienta).

## Ponentes confirmados IV edición

Alejandro Axel Rivera Martínez · Manuel Raad Berrio · Ernesto Ibarra Sánchez · Rodrigo Alejandro Gómez Torre. Hay 1 placeholder «Próximamente seguiremos confirmando más ponentes».

## Convenciones de trabajo

- El director prefiere diseños **premium, no invasivos y coherentes** con la estética existente.
- Commits directos a `main` cuando se solicita; verificar en producción tras el deploy.
- Numerales romanos de ediciones en **mayúsculas** y formato consistente en todo el sitio.
- Pruebas de navegador con Chrome MCP: `resize_window` no cambia el viewport real — usar técnica de iframe para simular móvil (390px). Las imágenes `loading="lazy"` necesitan un momento tras hacer scroll antes de capturar pantalla.
