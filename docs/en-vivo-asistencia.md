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

**Regla de acreditación** (`consolidarStream()`, se corre al cierre de cada día): un bloque **presencial seguido a distancia** (1–4) se acredita si minutos verificados ≥ 75 % de la duración del bloque (mismo umbral que Zoom, `umbral_stream_porcentaje` en `_config`) **y**, si se dictaron códigos en ese bloque, al menos uno correcto. La **Jornada Virtual** (bloque 5, `sede = virtual`) sigue una regla laxa por decisión del director (2026-09-14): basta con haber estado conectado, es decir ≥ 10 minutos verificados (`minutos_minimos_virtual`), sin código obligatorio (`codigo_obligatorio_virtual = FALSE`). El check-in se escribe con `fuente = web_stream`; después `procesarConstancias()` suma `horas_valor` por folio y asigna el nivel (asistencia / valor curricular) como siempre. Para el 18, `instalarDisparadorJornadaVirtual()` programa `cerrarJornadaVirtual()` a las 11:40 (GDL): consolida y emite las constancias de la jornada ese mismo día.

## 4. Seguridad y privacidad

- El token de sesión es `HMAC8(folio|correo|fecha)` con el `HMAC_SECRET` del backend: caduca cada día y no se puede fabricar desde el navegador.
- La página no guarda más que folio, nombre y contadores locales en `localStorage` del propio navegador (`forodyt_vivo*`).
- Los códigos solo los genera quien tiene la `STAFF_KEY` (misma del escáner).
- El backend no ve IP (Apps Script no la expone); la trazabilidad viene de folio + token + minuto.

## 5. Qué falta — runbook del backend (cuenta CUCEA)

**Estado al 2026-09-16.** La parte del sitio está HECHA y en producción: `en-vivo.html` es pública e indexable, entró al `sitemap.xml`, la tarjeta `.cuenta-vivo` del hero del index ya enlaza a ella, y la Jornada Virtual del 18 tiene su transmisión declarada (`STREAMS.virtual`, YouTube `qa-1p43DoAs`). **Falta solo lo que vive en la cuenta CUCEA.** Mientras no se haga, `MODO_PRUEBA` sigue en `true` y la sección de asistencia se oculta sola, así que la página funciona como reproductor limpio y nadie cree haberse registrado.

> ⚠️ **No pongas `MODO_PRUEBA = false` antes de terminar el paso 3.** Hasta que `doPost` conozca los `case 'stream_*'`, cada latido —uno por minuto **y por espectador**— sería una acción desconocida. La copia nueva de `Code.gs` ya la rechaza, pero la que está publicada hoy todavía cae en `crearInscripcion` y llenaría la hoja de inscripciones basura.

Orden exacto, todo en `script.google.com` → proyecto **«IV Foro 2026 Backend»**:

1. **Archivo nuevo `Asistencia`** (Archivo → Nuevo → Script, nombre `Asistencia`) y pegar íntegro `apps-script/Asistencia.gs`. Guardar.
2. **Sustituir `Code.gs`** por la copia del repo. Trae el guardarraíl del `default` del `doPost` descrito arriba. Guardar.
3. **Añadir los cuatro `case` al `switch` de `doPost` de `Code.gs`**, antes del `default` (van comentados en la cabecera de `Asistencia.gs`):
   ```js
   case 'stream_login':         result = streamLogin(payload); break;
   case 'stream_latido':        result = streamLatido(payload); break;
   case 'stream_reto':          result = streamReto(payload); break;
   case 'stream_reto_pantalla': result = streamRetoPantalla(payload); break;
   ```
   Y en `doGet`, el `stream_codigo_nuevo` que usa el generador de códigos de `registroscomite.html`.
4. **Script Properties** (Configuración del proyecto → Propiedades del script): `FIRMA_DIGITAL_FILE_ID` y, opcionales, `LOGO_UDG_FILE_ID`, `LOGO_CA_FILE_ID`, `AGUA_FILE_ID`, `CONSTANCIAS_FOLDER_ID`. Ver §5b.
5. **Correr desde el editor, en este orden:** `instalarPlaticasIV()` → `_testConstanciaBloque()` → `instalarDisparadoresBloques()`. El primero da de alta los cinco bloques con sus `id` (1 CUCEA, 2 CUGDL, 3 Cineteca, 4 Ciudad Judicial, 5 Jornada Virtual), `hora_inicio`/`hora_fin` en hora de Guadalajara y `horas_valor`; son los mismos `id` que usa `staff-scanner.html`. En `_config`, `meta_horas_valor_curricular` = 10.
6. **Publicar la versión nueva:** Implementar → **Administrar implementaciones → ✏️ (editar) → Nueva versión**. **Nunca «Nueva implementación»**: cambiaría la URL del endpoint y rompería inscripción y escáner.
7. **Encender el registro:** en `en-vivo.html`, `MODO_PRUEBA = false`. La sección «Tu presencia, verificada» reaparece sola; no hay que tocar el HTML.
8. **Prueba de humo, antes del 18:** iniciar sesión con un folio real, dejar correr 3 latidos, generar un código desde `/registroscomite` y validarlo, y correr `consolidarStream()` para ver el check-in en *CheckIns*.

Pendiente aparte: rellenar `STREAMS` de las cuatro sedes presenciales (21 y 22). Hoy están en `tipo: ''` y muestran el marcador «esta sede abre su transmisión a la hora de su primera sesión», que es el comportamiento correcto mientras no haya enlace.

## 5b. Constancias por bloque (decisión del director, 2026-09-14)

- **Qué se emite.** Al cerrar cada bloque (hora de fin + 60 min), cada persona con check-in válido en ese bloque recibe por correo una **constancia de asistencia del bloque** por sus horas **enteras** (CUCEA 5 h · CUGDL 2 h · Cineteca 3 h · Ciudad Judicial 2 h · Jornada Virtual 4 h), con la **firma digital del director** («Delva», el puro apellido: `firma-digital-apellido-delva-black-CANON.png`, canon v1.3). Folio `IV-FIDDT-BLQ/UDG/2026-<bloque>-NNNN`; registro en la pestaña *ConstanciasBloque* (no se duplica).
- **Constancia con valor curricular (10 h).** `meta_horas_valor_curricular = 10`. La misma plantilla con `tipo = 'valor'` lleva cuatro firmas: el director y los tres centros universitarios (nombres y firmas pendientes de que el director las entregue). Se emite al cierre del Foro con `procesarConstancias()`.
- **Plantilla.** `apps-script/Constancia-bloque.html` (HtmlService; solo tablas y posicionamiento absoluto porque el conversor HTML→PDF de Apps Script no soporta flex/grid; las fuentes Fraunces/Inter solo se ven en la vista previa local, Apps Script cae a Georgia/Arial). Vista previa: `python3 _tools/constancia_preview.py` + `sh _tools/out/constancias/render.sh` → tres PDF de muestra.
- **Instalación (cuenta CUCEA).** Archivo → Nuevo → HTML con el nombre exacto `Constancia-bloque` y pegar la plantilla. Script Properties: `FIRMA_DIGITAL_FILE_ID` (id en Drive del PNG de la firma, compartido con la cuenta del script), opcionales `LOGO_UDG_FILE_ID` y `LOGO_CA_FILE_ID` (los PNG `img/aliados/udg.png` y `img/aliados/ca-derecho-tecnologia-lockup.png`, el lockup completo «Derecho y Tecnología · Cuerpo Académico · UDEG-CA-1236» del paquete FROZEN v3.0; sin logo de CUCEA por decisión del director), `AGUA_FILE_ID` (`img/marca/foro-mapa-conexiones-dorado.png`, la marca de agua con el mapamundi del logo maestro del Foro) y `CONSTANCIAS_FOLDER_ID` (carpeta donde guardar copia). Probar con `_testConstanciaBloque()` (manda una muestra al director). Correr una vez `instalarDisparadoresBloques()`: crea cinco disparadores `cerrarBloque` (fin + 60 min, hora GDL). `cerrarJornadaVirtual()` queda como alias del cierre del bloque 5.

## 6. Ideas para después (no implementadas)

- Chat de YouTube incrustado junto al reproductor.
- Encuesta de un clic al final de cada bloque (dato para la memoria).
- Descarga de la constancia desde la misma página (el motor de constancias ya existe en Drive: `09-CERTIFICATE-ENGINE`).
