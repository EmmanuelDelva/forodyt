# ForoDyT Motion Engine

Motor audiovisual data-driven para el IV Foro Internacional de Derecho y Tecnología 2026. La primera fase cubre la plantilla reusable, estados canónicos, Venue Loop, Session Loop, lower third, validación y QA del demo CUCEA.

## Arranque

```powershell
cd C:\Users\emman\forodyt\motion-engine
npm install
npm run validate
npm run studio
```

Studio se ejecuta con `--no-open`. Para renderizar el set demo completo:

```powershell
npm run render:all
```

## Composiciones

- `ForoDyT-VenueLoop`: loop editorial 16:9 de 50 s para pantallas de sede.
- `ForoDyT-SessionLoop`: loop de 50 s contextualizado a una sesión.
- `ForoDyT-LowerThird`: lower third 16:9 de 8 s con transparencia.
- `ForoDyT-State-*`: estados canónicos para inspección y pruebas.

El motor usa datos de `src/data/`, esquemas Zod en `src/schema/`, tokens de marca/layout/motion y escenas reutilizables. Los assets públicos viven en `public/`.
## Salidas demo

- `out/venues/CUCEA-21SEP2026-VenueLoop-DEMO.mp4`
- `out/sessions/CUCEA-Conferencia-Inaugural-SessionLoop-DEMO.mp4`
- `out/lower-thirds/Miguel-Angel-Gaspar-LowerThird-DEMO.webm`

`out/` está deliberadamente ignorado por Git: las salidas se regeneran desde fuente y datos.

## QA obligatorio antes de freeze

`npm run validate` bloquea TypeScript inválido, fuentes canónicas ausentes, datos obligatorios incompletos, placeholders y CSS `transition`/`animation`. También reporta riesgos de longitud.

La fase demo fue verificada en 1920×1080/30 fps para safe area, overflow tipográfico, estados current/speaker/next, estrés tipográfico, continuidad del loop y transparencia del lower third. Los frames 0 y 1499 del Venue Loop deben ser binariamente iguales.

## Criterio de producción

No codificar manualmente una pieza por sede. Para CUGDL, Cineteca FICG, Ciudad Judicial o Jornada Virtual se agregan/actualizan datos y assets, y se reutilizan composiciones y escenas. Antes de generar lotes finales debe ejecutarse preflight y QA visual.

⟦ChatGPT · 2026-09-09⟧