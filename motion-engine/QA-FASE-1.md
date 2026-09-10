# QA — Fase 1 Remotion Production Engine

Fecha de cierre: 2026-09-09. Alcance: demo CUCEA del IV ForoDyT 2026, sin producción masiva de las demás sedes.

## Preflight

- TypeScript: PASS.
- Fuentes canónicas: PASS — Fraunces, Fraunces Italic, Inter y JetBrains Mono.
- Datos obligatorios y placeholders: PASS.
- Reglas de motion: PASS — sin CSS `transition`/`animation`.
- Warnings de validación: 0 en la última corrida previa al freeze.

## QA visual

- Current session: título largo, metadata y retrato dentro de safe area.
- Speaker: nombre y filiación legibles sin overflow.
- Next session: metadata desacoplada de la sesión actual; estados de receso sin duplicación innecesaria.
- Stress test: título largo y metadata extensa permanecen dentro del canvas.
- Lower third: jerarquía legible, entrada/salida frame-driven y fondo transparente.

## QA técnico

- Venue Loop: 1920×1080, H.264, 30 fps, ~50 s.
- Session Loop: 1920×1080, H.264, 30 fps, ~50 s.
- Lower third: 1920×1080, VP8 WebM, 30 fps, ~8 s, `alpha_mode=1`.
- Seamless loop: frame 0 y frame 1499 del Venue Loop comparados binariamente sin diferencias.
## Evidencia local

Los frames de QA se regeneran en `out/qa/`; entre los revisados: `venue-0000.png`, `venue-0600.png`, `venue-0900-fixed.png`, `session-0360.png`, `session-0700.png`, `session-0950-fixed.png`, `stress-current.png`, `lowerthird-decoded.png` y `lowerthird-alpha.png`.

La extracción del canal alfa con FFmpeg/libvpx emitió advertencias de compatibilidad del decoder en algunos paquetes VP8, pero `ffprobe` confirmó `alpha_mode=1` y el frame alfa extraído mostró rango 0–255; por tanto, la transparencia está presente. Conviene validar también en el software de playout/edición definitivo antes de producción en vivo.

## Freeze de fase

La base es funcional y reusable. La expansión a CUGDL, Cineteca FICG, Ciudad Judicial y Jornada Virtual queda fuera de esta fase y debe realizarse por datos/asset routing, no duplicando composiciones.

⟦ChatGPT · 2026-09-09⟧