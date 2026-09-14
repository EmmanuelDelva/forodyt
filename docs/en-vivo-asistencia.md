# Transmisión en vivo y asistencia virtual verificada — diseño (borrador 2026-09-14)

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

**Regla de acreditación** (`consolidarStream()`, se corre al cierre de cada día): un bloque **presencial seguido a distancia** (1–4) se acredita si minutos verificados ≥ 75 % de la duración del bloque (mismo umbral que Zoom, `umbral_stream_porcentaje` en `_config`) **y**, si se dictaron códigos en ese bloque, al menos uno correcto. La **Jornada Virtual** (bloque 5, `sede = virtual`) sigue una regla laxa por decisión del director (2026-09-14): basta con haber estado conectado, es decir ≥ 10 minutos verificados (`minutos_minimos_virtual`), sin código obligatorio (`codigo_obligatorio_virtual = FALSE`). El check-in se escribe con `fuente = web_stream`; después `procesarConstancias()` suma `horas_valor` por folio y asigna el nivel (asistencia / valor curricular) como siempre. Para el 18, `instalarDisparadorJornadaVirtual()` programa `cerrarJornadaVirtual()` a las 11:30 (GDL): consolida y emite las constancias de la jornada ese mismo día.

## 4. Seguridad y privacidad

- El token de sesión es `HMAC8(folio|correo|fecha)` con el `HMAC_SECRET` del backend: caduca cada día y no se puede fabricar desde el navegador.
- La página no guarda más que folio, nombre y contadores locales en `localStorage` del propio navegador (`forodyt_vivo*`).
- Los códigos solo los genera quien tiene la `STAFF_KEY` (misma del escáner).
- El backend no ve IP (Apps Script no la expone); la trazabilidad viene de folio + token + minuto.

## 5. Qué falta para publicar

1. Backend: pegar `apps-script/Asistencia.gs` en el proyecto, añadir los `case` en `doPost`/`doGet` (instrucciones en la cabecera del archivo), **Manage deployments → Edit → Nueva versión** (nunca «New deployment»).
2. Sheet: correr `instalarPlaticasIV()` desde el editor. Da de alta los cinco bloques con sus `id` (1 CUCEA, 2 CUGDL, 3 Cineteca, 4 Ciudad Judicial, 5 Jornada Virtual), `hora_inicio`/`hora_fin` en hora de Guadalajara y `horas_valor` (duración real; suma máxima 18.09 h; `meta_horas_valor_curricular` = 10 por decisión del director). `staff-scanner.html` ya usa esos mismos id. Después correr `instalarDisparadorJornadaVirtual()`.
3. `en-vivo.html`: rellenar `STREAMS` con los ids/enlaces reales y poner `MODO_PRUEBA = false`.
4. Publicar: quitar `<meta name="robots" content="noindex, nofollow">` y la franja «Borrador» de `en-vivo.html`, quitar `hidden` a la tarjeta `.cuenta-vivo` del hero de `index.html`, y añadir la página al `sitemap.xml`.
5. Prueba de humo el día antes: sesión con un folio real, 3 latidos, un código generado desde el hub, y correr `consolidarStream()` para ver el check-in en *CheckIns*.
6. Constancias por bloque: ver §5b (plantilla HTML en el proyecto, `FIRMA_DIGITAL_FILE_ID`, `_testConstanciaBloque()`, `instalarDisparadoresBloques()`).

## 5b. Constancias por bloque (decisión del director, 2026-09-14)

- **Qué se emite.** Al cerrar cada bloque (hora de fin + 60 min), cada persona con check-in válido en ese bloque recibe por correo una **constancia de asistencia del bloque** por sus horas **enteras** (CUCEA 5 h · CUGDL 2 h · Cineteca 3 h · Ciudad Judicial 2 h · Jornada Virtual 4 h), con la **firma digital del director** («Delva», el puro apellido: `firma-digital-apellido-delva-black-CANON.png`, canon v1.3). Folio `IV-FIDDT-BLQ/UDG/2026-<bloque>-NNNN`; registro en la pestaña *ConstanciasBloque* (no se duplica).
- **Constancia con valor curricular (10 h).** `meta_horas_valor_curricular = 10`. La misma plantilla con `tipo = 'valor'` lleva cuatro firmas: el director y los tres centros universitarios (nombres y firmas pendientes de que el director las entregue). Se emite al cierre del Foro con `procesarConstancias()`.
- **Plantilla.** `apps-script/Constancia-bloque.html` (HtmlService; solo tablas y posicionamiento absoluto porque el conversor HTML→PDF de Apps Script no soporta flex/grid; las fuentes Fraunces/Inter solo se ven en la vista previa local, Apps Script cae a Georgia/Arial). Vista previa: `python3 _tools/constancia_preview.py` + `sh _tools/out/constancias/render.sh` → tres PDF de muestra.
- **Instalación (cuenta CUCEA).** Archivo → Nuevo → HTML con el nombre exacto `Constancia-bloque` y pegar la plantilla. Script Properties: `FIRMA_DIGITAL_FILE_ID` (id en Drive del PNG de la firma, compartido con la cuenta del script), opcionales `LOGO_UDG_FILE_ID`, `LOGO_CA_FILE_ID`, `LOGO_CUCEA_FILE_ID` (PNG de `img/aliados/`) y `CONSTANCIAS_FOLDER_ID` (carpeta donde guardar copia). Probar con `_testConstanciaBloque()` (manda una muestra al director). Correr una vez `instalarDisparadoresBloques()`: crea cinco disparadores `cerrarBloque` (fin + 60 min, hora GDL). `cerrarJornadaVirtual()` queda como alias del cierre del bloque 5.

## 6. Ideas para después (no implementadas)

- Chat de YouTube incrustado junto al reproductor.
- Encuesta de un clic al final de cada bloque (dato para la memoria).
- Descarga de la constancia desde la misma página (el motor de constancias ya existe en Drive: `09-CERTIFICATE-ENGINE`).
