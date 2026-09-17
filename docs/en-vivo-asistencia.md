# Transmisión en vivo y asistencia virtual verificada — diseño (2026-09-14, en producción desde 2026-09-17)

Documento interno (carpeta `docs/`, excluida de Vercel). Acompaña a `en-vivo.html`, `apps-script/Asistencia.gs` y al panel «Código de presencia» de `registroscomite.html`.

## 1. Objetivo

Transmitir las cinco jornadas del IV Foro desde la página propia (`forodyt.com/en-vivo.html`) y expedir constancias a quien las siguió a distancia **con evidencia de presencia real**, no solo con el registro. El modelo se integra sin cambios en el flujo de constancias que ya existe en el backend (`procesarConstancias()`): cada bloque de sede es una fila de la pestaña *Platicas* y se acredita con un check-in, igual que el QR presencial o el CSV de Zoom.

## 2. Dónde se transmite y cómo se incrusta

`en-vivo.html` tiene un objeto `STREAMS` por sede. Opciones probadas de incrustación:

| Plataforma | Cómo | Notas |
|---|---|---|
| **YouTube Live** (recomendada) | `tipo:'youtube', id:'<id del video>'` o `tipo:'youtube_canal', id:'<id del canal>'` (toma el directo activo) | Sin límite de espectadores, chat opcional, queda grabado. Usa `youtube-nocookie.com`. |
| **Facebook Live** | `tipo:'facebook', url:'<url del video>'` | Se incrusta con el plugin de video; requiere que el video sea público. |
| **Vimeo** | `tipo:'vimeo', id:'…'` | Alternativa de pago, sin anuncios. |
| **Zoom** | `tipo:'zoom', url:'<enlace de unión>'` | Zoom **no se incrusta** en una página estática (haría falta el Web SDK con servidor). La página muestra el botón «Abrir en la plataforma». Recomendación: Zoom para los ponentes y retransmitir a YouTube Live (Zoom lo hace nativo: *Live on YouTube*), y en la página incrustar YouTube. |

La página elige sola la pestaña de la sede cuyo bloque está en curso (lee `programa-data.json`, generado por `_tools/programa.py`) y muestra «Ahora en curso / A continuación» con ponentes.

## 3. Cómo se verifica la presencia (tres capas)

1. **Latidos por minuto.** Con sesión iniciada (folio + correo de inscripción), pestaña visible y transmisión configurada para la sede, la página envía `stream_latido` cada minuto con folio, token, `id_platica` y el minuto UTC. Cambiar de pestaña, minimizar o cerrar detiene los latidos (evento `visibilitychange`). El backend deduplica por minuto y descarta los que caen fuera de la ventana del bloque (±10 min).
2. **Comprobaciones de pantalla («¿Sigues ahí?»).** Cada 12–25 minutos (aleatorio) aparece un aviso con 90 s. Si no se responde, los latidos posteriores no cuentan hasta que la persona vuelva a confirmar (`stream_reto_pantalla` con `ok:false` / `ok:true`). Evita la pestaña abierta sin nadie enfrente.
3. **Códigos de presencia.** La moderación genera un código de 4 caracteres desde `registroscomite.html` (clave de staff), lo dice al aire o lo muestra en pantalla; vence a los 10 minutos. Quien lo escribe en la página demuestra que **sigue la transmisión**, no solo que la tiene abierta. Dos o tres códigos por bloque, sin avisar cuándo.

**Regla de acreditación** (`consolidarStream()`, se corre al cierre de cada día): un bloque **presencial seguido a distancia** (1–4) se acredita si minutos verificados ≥ 75 % de la duración del bloque (mismo umbral que Zoom, `umbral_stream_porcentaje` en `_config`) **y**, si se dictaron códigos en ese bloque, al menos uno correcto. La **Jornada Virtual** (bloque 5, `sede = virtual`) sigue una regla laxa por decisión del director (2026-09-14): basta con haber estado conectado, es decir ≥ 10 minutos verificados (`minutos_minimos_virtual`), sin código obligatorio (`codigo_obligatorio_virtual = FALSE`). El check-in se escribe con `fuente = web_stream`; después `procesarConstancias()` suma `horas_valor` por folio y asigna el nivel (asistencia / valor curricular) como siempre. Para el 18, `instalarDisparadorJornadaVirtual()` programa `cerrarJornadaVirtual()` a las 11:45 (GDL): consolida y emite las constancias de la jornada ese mismo día.

## 4. Seguridad y privacidad

- El token de sesión es `HMAC8(folio|correo|fecha)` con el `HMAC_SECRET` del backend: caduca cada día y no se puede fabricar desde el navegador.
- La página guarda en el `localStorage` del propio navegador (`forodyt_vivo*`) el folio, el correo, el nombre, el token del día y contadores locales; el correo se usa solo para renovar el token cuando cambia el día.
- Los códigos solo los genera quien tiene la `STAFF_KEY` (misma del escáner).
- El backend no ve IP (Apps Script no la expone); la trazabilidad viene de folio + token + minuto.

## 5. Backend en la cuenta CUCEA — instalado el 2026-09-17

**Estado al 2026-09-17.** Instalado y publicado en el proyecto **«IV Foro 2026 Backend»** (cuenta CUCEA) desde el navegador del director — **implementación versión 4 (17-sep, 10:13), misma URL** — y `MODO_PRUEBA = false` en `en-vivo.html`. Detalle y resultados en la bitácora de `CLAUDE.md` (sesión 2026-09-17).

Cómo quedó (y cómo repetirlo si hay que reinstalar), todo en `script.google.com` → proyecto **«IV Foro 2026 Backend»**:

1. **Archivos del proyecto** = copia exacta del repo: `Code.gs`, `Asistencia.gs`, `Constancia-bloque.html` y `Plantilla-correo.html`. `Code.gs` ya trae los cuatro `case 'stream_*'` de `doPost` y la ruta GET `stream_codigo_nuevo` (con `STAFF_KEY`); ya no hay que editarlo a mano. Para pegar sin que el editor reindente, se sustituye el contenido del modelo de Monaco y se compara el SHA-256 contra el archivo del repo **antes de guardar**; después se recarga la página y se vuelve a comparar.
2. **Script Properties:** `FIRMA_DIGITAL_FILE_ID` = el PNG canon `firma-digital-apellido-delva-black-CANON.png` del Drive del director (compartido como lector con `emmanueldelva@cucea.udg.mx`). `LOGO_UDG_FILE_ID`, `LOGO_CA_FILE_ID`, `AGUA_FILE_ID` y `CONSTANCIAS_FOLDER_ID` los escribe `instalarRecursosConstancia()`.
3. **Funciones, una vez y en este orden:**
   - `instalarPlaticasIV()` → los cinco bloques en *Platicas* (1 CUCEA, 2 CUGDL, 3 Cineteca, 4 Ciudad Judicial, 5 Jornada Virtual; mismos `id` que `staff-scanner.html` y `programa-data.json`) **y** `_config` con `CONFIG_IV`: `meta_horas_valor_curricular = 10`, `tolerancia_inicio_min = 60`, `tolerancia_fin_min = 60`, `minutos_minimos_virtual = 10`, `codigo_obligatorio_virtual = FALSE`, `umbral_stream_porcentaje = 75`. Es idempotente.
   - `instalarRecursosConstancia()` → carpeta «IV Foro 2026 · Constancias por bloque» en el Drive CUCEA con `_recursos/` (logos y marca de agua bajados de forodyt.com) y comprueba que la firma sea legible.
   - `_testConstanciaBloque()` → muestra en PDF al `DIRECTOR_EMAIL` y copia `PRUEBA-constancia-bloque-1.pdf` en la carpeta. **Abrir el PDF y mirar que salgan firma, logos y marca de agua** (ver la trampa de imágenes abajo).
   - `instalarDisparadoresBloques()` → cinco disparadores `cerrarBloque` a fin del bloque + `tolerancia_fin_min` + 5 min (bloque 5, que ahora cierra a las 11:12: viernes 18 a las 12:17 GDL). **Si se cambia `tolerancia_fin_min`, volver a correrla.**
   La primera ejecución pide autorizar dos permisos nuevos (disparadores y correo del usuario activo): lo acepta el director en la ventana emergente de Google.
4. **Publicar:** Implementar → **Administrar implementaciones → ✏️ → Nueva versión**. **Nunca «Nueva implementación»**: cambiaría la URL del endpoint y rompería inscripción, escáner y en-vivo.
5. **Prueba con un inscrito real sin exponer datos:** correr `_testStreamBackend()` desde el editor. Antes del viernes debe decir `stream_login → ok`, `stream_latido … → fuera_de_ventana` (token y bloque correctos) y `token falso → token_invalido`.
6. **Sondas sin datos personales** (desde cualquier terminal; `ENDPOINT` = el de `en-vivo.html`):
   - `GET ?action=stream_codigo_nuevo&key=x&id_platica=5` → `staff_key_invalida` (antes de la versión nueva respondía el healthcheck).
   - `POST {"action":"algo"}` → `accion_desconocida: algo` (no inscribe).
   - `POST {"action":"stream_latido","folio":"IV-FORO-XXXXXX","token":"x","id_platica":5}` → `token_invalido`.
   - `POST {"action":"stream_login","folio":"IV-FORO-XXXXXX","correo":"nadie@example.com"}` → `folio_no_coincide`.
   Un latido real **no puede** aceptarse fuera de la ventana del bloque (±10 min): antes del día responde `fuera_de_ventana`. La prueba positiva completa es el viernes 18 a partir de las 7:00: la hoja *StreamLatidos* debe empezar a llenarse.

**Lo que cambió respecto del borrador del 16 (y por qué):**
- `tokenValido_()` buscaba al usuario por correo aunque el latido no trae correo: con cualquier fila de *Usuarios* con el correo en blanco, **todos** los latidos se habrían rechazado. Ahora busca por folio.
- El token vale el día (GDL) en que se emite y la página no lo renovaba: quien se identificara antes del 18 habría acumulado 0 minutos sin enterarse. `en-vivo.html` ahora lo renueva sola con el folio y el correo guardados y reintenta.
- Al abrir la página durante un bloque en curso se muestra esa sede aunque haya otra pestaña guardada, y los minutos solo cuentan en la pestaña del bloque en curso.
- Los latidos aceptados ya no se anotan en `_logs` (uno por minuto y por espectador); los rechazados sí.
- **Las constancias salían sin firma, sin logos y sin marca de agua**: la plantilla imprimía los data URI con `<?= … ?>`, cuyo escape contextual los anula dentro de `src` (en la vista previa local con WeasyPrint no se nota). Ahora van con impresión forzada filtrada por `imgSrc_()`. Comprobado en el PDF real que genera Apps Script.
- Producción tenía *Platicas* con el programa viejo de tres bloques (el escáner ya mandaba los `id` 1–5), `_config` con meta de 20 h y ventana −5/+10 min, y `Plantilla-correo.html` pegada como **texto plano** (sin HTML, con brazalete y 20 h). Todo quedó al día.

**Operación durante el Foro:**
- Códigos de presencia: `/registroscomite` → «Código de presencia», con la `STAFF_KEY`. En el bloque virtual no son obligatorios; en los presenciales, **si se dicta un código en un bloque, pasa a ser obligatorio para todos los de ese bloque**: no generar códigos «de prueba» en los bloques 1–4.
- Cierre: `cerrarBloque` corre solo; a mano, `consolidarStream()` y `emitirConstanciasBloque(<id>)`.

Pendiente aparte: rellenar `STREAMS` de las cuatro sedes presenciales (21 y 22). Hoy están en `tipo: ''` y muestran el marcador «esta sede abre su transmisión a la hora de su primera sesión», que es el comportamiento correcto mientras no haya enlace; sin transmisión configurada **no** se registran minutos en esa sede.

## 5b. Constancias por bloque (decisión del director, 2026-09-14)

- **Qué se emite.** Al cerrar cada bloque (hora de fin + 60 min), cada persona con check-in válido en ese bloque recibe por correo una **constancia de asistencia del bloque** por sus horas **enteras** (CUCEA 5 h · CUGDL 2 h · Cineteca 3 h · Ciudad Judicial 2 h · Jornada Virtual 4 h), con la **firma digital del director** («Delva», el puro apellido: `firma-digital-apellido-delva-black-CANON.png`, canon v1.3). Folio `IV-FIDDT-BLQ/UDG/2026-<bloque>-NNNN`; registro en la pestaña *ConstanciasBloque* (no se duplica).
- **Constancia con valor curricular (10 h).** `meta_horas_valor_curricular = 10`. La misma plantilla con `tipo = 'valor'` lleva cuatro firmas: el director y los tres centros universitarios (nombres y firmas pendientes de que el director las entregue). Se emite al cierre del Foro con `procesarConstancias()`.
- **Plantilla.** `apps-script/Constancia-bloque.html` (HtmlService; solo tablas y posicionamiento absoluto porque el conversor HTML→PDF de Apps Script no soporta flex/grid; las fuentes Fraunces/Inter solo se ven en la vista previa local, Apps Script cae a Georgia/Arial). Vista previa: `python3 _tools/constancia_preview.py` + `sh _tools/out/constancias/render.sh` → tres PDF de muestra.
- **Instalación (cuenta CUCEA).** Archivo → Nuevo → HTML con el nombre exacto `Constancia-bloque` y pegar la plantilla. Script Properties: `FIRMA_DIGITAL_FILE_ID` (id en Drive del PNG de la firma, compartido con la cuenta del script), opcionales `LOGO_UDG_FILE_ID` y `LOGO_CA_FILE_ID` (los PNG `img/aliados/udg.png` y `img/aliados/ca-derecho-tecnologia-lockup.png`, el lockup completo «Derecho y Tecnología · Cuerpo Académico · UDEG-CA-1236» del paquete FROZEN v3.0; sin logo de CUCEA por decisión del director), `AGUA_FILE_ID` (`img/marca/foro-mapa-conexiones-dorado.png`, la marca de agua con el mapamundi del logo maestro del Foro) y `CONSTANCIAS_FOLDER_ID` (carpeta donde guardar copia). Probar con `_testConstanciaBloque()` (manda una muestra al director). Correr una vez `instalarDisparadoresBloques()`: crea cinco disparadores `cerrarBloque` (fin + 60 min, hora GDL). `cerrarJornadaVirtual()` queda como alias del cierre del bloque 5.

## 6. Ideas para después (no implementadas)

- Chat de YouTube incrustado junto al reproductor.
- Encuesta de un clic al final de cada bloque (dato para la memoria).
- Descarga de la constancia desde la misma página (el motor de constancias ya existe en Drive: `09-CERTIFICATE-ENGINE`).
