# Prompt inicial para Claude Code

Pega esto en la primera interacción con Claude Code después de hacer `cd forodyt/`:

---

Hola Claude. Estoy implementando el sistema de inscripción del **IV Foro Internacional de Derecho y Tecnología** (CUCEA-UDG, 21–22 sep 2026). Soy el Dr. Juan Emmanuel Delva Benavides, Director del Foro.

**Contexto y archivos**: lee primero `README.md`, luego `docs/esquema-sheets.md`, `docs/anti-fraude.md`, `docs/flujo-validacion.md` y `apps-script/README-deploy.md`. Ahí está toda la especificación.

**Lo que ya está hecho**:
- `index.html` — landing del Foro
- `cfp.html` — Call for Papers
- `inscripcion.html` — formulario público (frontend completo, falta conectar al backend)
- `apps-script/Code.gs` — skeleton del backend con funciones `doPost`, `crearInscripcion`, `validarQR`, `registrarCheckin`, `procesarConstancias`
- `apps-script/Plantilla-correo.html` — template del correo de confirmación con QR

**Tareas en orden de prioridad**:

1. **Crear repositorio git** y commit inicial con todo lo que está. Usa rama `main`.

2. **Conectar `inscripcion.html` al backend**. Busca el comentario `// === Demo: emular envío al backend ===` y reemplaza por un `fetch()` real. Necesito una constante `ENDPOINT` configurable arriba del script, y manejo de errores con UI feedback (mostrar error inline si la inscripción falla, no solo console.log). 

3. **Refinar `Code.gs`**:
   - Implementa `haySimultaneoEnOtraSede_()` que está vacía (cruce real con timestamps de sedes distintas).
   - Implementa `procesarConstancias()` para que genere PDFs reales vía Google Docs template y los envíe en lotes de 50 con `Utilities.sleep(2000)`.
   - Implementa `procesarCSVZoom(idPlatica, csvBlob)` para validación virtual.
   - Agrega `auditoriaPostEvento()` que produzca el reporte que menciono en `docs/anti-fraude.md`.

4. **Crear `staff-scanner.html`** — vista oculta, no enlazada desde menú público. Cámara del celular + librería `html5-qrcode`. Cada escaneo:
   - Decodifica payload `FORO|<folio>|<hmac8>`.
   - Llama al endpoint `?action=validar`.
   - Muestra al staff: nombre + tipo de participante + botón "Confirmar entrada".
   - Al confirmar, llama `?action=checkin&folio=...&id_platica=...&staff_email=...`.
   - **Modo offline obligatorio**: si no hay conexión, guarda en `localStorage` y sincroniza al reconectar.

5. **Configurar deploy a Vercel**: archivo `vercel.json` mínimo si se requiere para enrutamiento, y un `.gitignore` apropiado.

6. **Tests manuales**: una vez todo conectado, te paso credenciales y probamos con mi correo personal el flujo end-to-end.

**Decisiones tomadas que no se reabren**:
- Meta de horas para constancia con valor curricular: **20 horas efectivas**.
- Sin gafetes impresos. Brazalete de tela día 1 + INE/credencial UDG.
- Cuenta de despliegue Apps Script: `emmanueldelva@cucea.udg.mx` (Workspace UDG).
- Stack: vanilla HTML+CSS+JS. Sin frameworks. Sin shadcn. Sin React.
- Paleta y tipografías: ya definidas en los HTMLs (Fraunces + Inter + JetBrains Mono).

**Convenciones**:
- Commits con prefijo `feat:` / `fix:` / `docs:`.
- Push a `main` directo (yo soy el único colaborador hasta segunda etapa).
- Nada de centered layouts genéricos, gradientes morados, ni esquinas redondeadas. Estética editorial-jurídica tipo Aranzadi/Vogue.

Empieza por la **Tarea 1** (repo + commit inicial) y dime cuando esté listo para que avancemos a la 2.
