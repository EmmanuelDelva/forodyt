# IV Foro Internacional de Derecho y Tecnología — Sistema de Inscripción

> **Handoff para Claude Code**. Este repositorio contiene el sitio público del IV Foro (CUCEA-UDG, 21–22 sep 2026) y el formulario de inscripción listo. Falta conectar el backend.

## Contexto en una página

- **Evento**: IV Foro Internacional de Derecho y Tecnología
- **Sede principal**: CUCEA, Universidad de Guadalajara · sedes itinerantes CUGDL y Ciudad Judicial Jalisco
- **Fechas**: 21 y 22 de septiembre 2026 (lunes y martes)
- **Modalidad**: Presencial + virtual (Zoom Webinar)
- **Volumen esperado**: 300–500 asistentes acumulados, ~15 sesiones académicas
- **Costo de inscripción**: gratuito
- **Director**: Dr. Juan Emmanuel Delva Benavides — `emmanueldelva@cucea.udg.mx`

## Archivos en el repo

```
forodyt/
├── index.html              ← landing principal del Foro (existente)
├── cfp.html                ← Call for Papers (existente)
├── inscripcion.html        ← formulario público (LISTO — falta conectar backend)
├── README.md               ← este archivo
├── apps-script/
│   ├── Code.gs             ← código Apps Script a desplegar como Web App
│   ├── Plantilla-correo.html ← template HTML del correo con QR
│   └── README-deploy.md    ← instrucciones de despliegue
└── docs/
    ├── esquema-sheets.md   ← estructura de la base Google Sheets
    ├── anti-fraude.md      ← decisiones de diseño anti-fraude
    └── flujo-validacion.md ← flujo presencial + virtual
```

## Tareas pendientes (orden recomendado)

### Tarea 1 — Crear el Google Sheets de la base
Sigue `docs/esquema-sheets.md`. Tres pestañas: `Usuarios`, `Platicas`, `CheckIns`. La pestaña `Platicas` ya viene pre-poblada con el programa preliminar (15 sesiones).

### Tarea 2 — Desplegar el Apps Script
Copia `apps-script/Code.gs` al proyecto Apps Script vinculado al Sheets. Crea el script secret `HMAC_SECRET` en Project Properties. Despliega como Web App con acceso "Anyone, even anonymous".

**Cuenta de despliegue**: usar `emmanueldelva@cucea.udg.mx` (cuenta institucional UDG con cuota Gmail más generosa que Gmail personal — verificar cuota exacta vía MailApp.getRemainingDailyQuota()).

### Tarea 3 — Conectar el frontend al endpoint
En `inscripcion.html`, busca el comentario `// === Demo: emular envío al backend ===` y reemplaza el bloque por un `fetch()` real al endpoint del Web App. La URL del endpoint la genera Apps Script al desplegar.

```javascript
const ENDPOINT = 'https://script.google.com/macros/s/__DEPLOY_ID__/exec';

const res = await fetch(ENDPOINT, {
  method: 'POST',
  mode: 'no-cors',           // necesario por CORS de Apps Script
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
});
```

> Nota CORS: Apps Script Web Apps no envían headers CORS estándar. La estrategia recomendada es usar `Content-Type: text/plain` y leer el body como string en `doPost(e)` con `JSON.parse(e.postData.contents)`.

### Tarea 4 — Generar QR real
En `Code.gs`, función `generarQR()`. Usa `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=...`. El payload del QR es:

```
FORO|<folio>|<hmac8>
```

Donde:
- `folio`: `IV-FORO-XXXXXX` (6 chars random base32)
- `hmac8`: primeros 8 chars de `HMAC-SHA256(folio, HMAC_SECRET)` en hex

Esto evita que alguien adivine folios o falsifique QRs sin conocer el secreto.

### Tarea 5 — Correo con QR embebido
Función `enviarCorreoQR()`. Usa `MailApp.sendEmail()` con cuerpo HTML basado en `Plantilla-correo.html`. La imagen del QR se incrusta como inline attachment usando `htmlBody` + `inlineImages`.

**Cuota MailApp con cuenta UDG**: `MailApp.getRemainingDailyQuota()` debe reportar al menos 1500/día (cuenta institucional Workspace). Si reporta 100, es porque la cuenta está en plan personal — escalar a soporte UDG.

### Tarea 6 — App de escaneo para staff
Crear `staff-scanner.html` (vista oculta, no enlazada desde el menú público). Usa la cámara del celular con `navigator.mediaDevices.getUserMedia` + librería `jsQR` o `html5-qrcode`. Cada escaneo:

1. Decodifica el payload `FORO|<folio>|<hmac8>`.
2. Verifica HMAC contra el secreto (vía endpoint `?action=validar&folio=X&hmac=Y`).
3. Si válido: muestra nombre del asistente + foto si existe.
4. Llama al endpoint `?action=checkin&folio=X&platica=Y` para registrar.
5. El staff confirma visualmente la identidad antes de hacer clic en "Confirmar entrada".

**Modo offline**: si no hay wifi, almacena los escaneos en `localStorage` y sincroniza al reconectar (función `flushOffline()`).

### Tarea 7 — Cómputo final y emisión de constancias
Al cierre del evento, ejecutar manualmente la función `procesarConstancias()` desde el editor de Apps Script. Esta función:

1. Recorre `CheckIns` y agrupa por correo.
2. Suma horas efectivas por persona.
3. Determina nivel de constancia:
   - **≥ 20 h** → Constancia con valor curricular
   - **< 20 h y ≥ 4 h** → Constancia de asistencia
   - **< 4 h** → No emite (cortesía: notifica al asistente)
   - **rol = ponente** → Constancia de ponente (independiente de horas)
4. Genera PDFs vía Google Docs template + `DocumentApp`.
5. Envía por correo en lotes de 50 (con `Utilities.sleep(2000)` entre lotes para no saturar).

## Decisiones de diseño tomadas (no abrir a debate)

- ✅ Meta de horas para constancia con valor curricular: **20 horas efectivas**
- ✅ AVI: combinado UDG institucional + finalidades específicas del Foro (texto en `inscripcion.html` modal)
- ✅ Sin gafete impreso; brazalete de tela día 1 + INE/credencial UDG
- ✅ Validación virtual: Zoom Webinar con regla 75% asistencia → bloque completo
- ✅ Escaneo invertido (staff escanea al asistente, no al revés)
- ✅ Anti-fraude: HMAC en QR + cruce de check-ins simultáneos en sedes distintas
- ✅ Cuenta de despliegue Apps Script: `emmanueldelva@cucea.udg.mx`

## Convenciones de código

- Vanilla JS, sin frameworks. El sitio del Foro usa el mismo stack en otros archivos.
- Tipografías: Fraunces (serif) + Inter (sans) + JetBrains Mono (mono) — ya cargadas vía Google Fonts.
- Paleta: variables CSS en `:root` (ink #0E1B2C · dorado #B8923E · teal #2A5C5C · marfil #F5EFE0 · granate #632A3D).
- Sin esquinas redondeadas. Sin gradientes morados. Estética editorial-jurídica tipo Aranzadi/Vogue.

## Contacto y siguientes pasos

Cuando termines cada tarea, deja un commit con prefijo:
- `feat:` para funcionalidad nueva
- `fix:` para correcciones
- `docs:` para documentación

Empuja a la rama `main`. Vercel desplegará automático en `forodyt.vercel.app` (o el subdominio que se configure).

Cualquier duda de criterio editorial o académica → preguntar al Director del Foro antes de improvisar.
