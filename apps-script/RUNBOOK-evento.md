# Runbook del sistema QR — IV Foro (21 y 22 de septiembre de 2026)

Guía operativa para la víspera y los días del evento. Todo corre en el proyecto Apps Script
**«IV Foro 2026 Backend»** (cuenta `emmanueldelva@cucea.udg.mx`) vinculado al Sheet
**IV-Foro-Inscripciones-2026**. La clave de staff NO está en este repo: vive en Script Properties
(`STAFF_KEY`), en el documento de Claude-Work y en el chat del comité.

## 0 · Estado de partida (producción al 2026-09-20)

- Web App en **versión 5** (17-sep): `Code.gs` + `Asistencia.gs` + `Constancia-bloque.html` + `Plantilla-correo.html`.
- Correos a participantes desde **`contacto@forodyt.com`** (`enviarCorreo_()`, alias verificado).
- Pestaña *Platicas* con los **cinco bloques** (1 CUCEA lun 9:00–14:10 · 2 CUGDL lun 16:05–18:50 · 3 Cineteca FICG mar 10:05–13:30 · 4 Ciudad Judicial mar 16:00–18:45 · 5 Jornada Virtual vie 18). `_config`: ventana ±60 min, meta 10 h.
- `STAFF_KEY` exigida en validar/check-in (probado hoy: sin clave → `staff_key_invalida`; con clave → `HMAC inválido` en folio dummy).

## 1 · Qué trae la versión 6 (este repo)

| Pieza | Cambio |
|---|---|
| Correo con QR | El PNG se pide a `api.qrserver.com` y, si falla, a `quickchart.io`; si ambos fallan el correo **sale de todas formas** con un botón que abre el QR en `forodyt.com/mi-qr.html`. Todo correo trae además el enlace «Ábrelo en tu navegador». |
| `ya_inscrito` | Quien se vuelve a inscribir recibe **automáticamente** un reenvío del QR (máx. 3 por correo cada 6 h). |
| `action: 'reenviar'` (POST público) | Autoservicio: `inscripcion.html#reenviar-qr` reenvía el QR al correo registrado. |
| `action=buscar` (GET, exige `STAFF_KEY`) | El escáner localiza inscritos por nombre/correo/folio y devuelve el `hmac` para registrar la entrada **sin QR**. |
| `action=platicas` (GET, exige `STAFF_KEY`) | El escáner carga los bloques desde la pestaña `Platicas`: si se ajusta un horario en la hoja, el teléfono lo refleja al volver a Configuración. |
| `_config` | Interruptores de emergencia: `antifraude_geo_activo` y `validar_ventana` (poner `FALSE` solo si rechazan entradas legítimas; efecto inmediato, sin código). |
| Admin | `_reporteCorreos()`, `_reenviarPendientes()`, `_reenviarATodos()`, `reenviarQR('correo|folio')`. |

Hasta que se publique la versión 6, el escáner y la inscripción **siguen funcionando** con la 5: la búsqueda sin QR responde «Sin resultados», la lista de bloques se queda con la local (idéntica a la hoja) y «Reenviar mi QR» devuelve un error amable.

## 2 · Publicar la versión 6 (5 min) — SIN cambiar la URL

1. Abrir [script.google.com](https://script.google.com) con la cuenta CUCEA → proyecto **IV Foro 2026 Backend**.
2. `Code.gs`: sustituir todo por `apps-script/Code.gs` de este repo (pegar sin que el editor reindente: `docs/en-vivo-asistencia.md` §5 explica el truco de Monaco + SHA-256). Verificar que aparezcan `reenviarQRPublico`, `buscarAsistentes_`, `listarPlaticas_` y que los acentos estén intactos. `Asistencia.gs` y `Constancia-bloque` no cambian.
3. Archivo `Plantilla-correo`: sustituir por `apps-script/Plantilla-correo.html`.
4. Guardar. **Implementar → Administrar implementaciones → ✏️ Editar → Versión: «Nueva versión» → Implementar.**
   ⚠️ Nunca «Nueva implementación»: cambiaría la URL y rompería escáner, inscripción, correos y en-vivo.
5. Sondas (sustituir la clave):
   - `…/exec?action=platicas&key=CLAVE` → `{"ok":true,"platicas":[…5 bloques…]}` (si sale `staff_key_invalida`, la clave está mal escrita; si sale el healthcheck, la versión nueva no está publicada).
   - `…/exec?action=buscar&q=delva&key=CLAVE` → `{"ok":true,"resultados":[…]}`.

## 3 · Correos que no llegaron (hacer HOY, en este orden)

En el editor, elegir la función en el desplegable y pulsar **Ejecutar**; el resultado sale en «Registro de ejecución».

1. **`_reporteCorreos`** → no envía nada. Muestra inscritos, correos marcados como enviados, la lista de **pendientes** (`correo_qr_enviado = false`) y la **cuota restante** (debe rondar 1500; si dice 100 la cuenta está limitada: priorizar pendientes).
2. **`_reenviarPendientes`** → reenvía SOLO a los pendientes (los que el sistema sabe que fallaron).
3. **`_reenviarATodos`** → recordatorio con QR a **todos** los inscritos (asunto «Tu código QR para el IV Foro…», remitente `contacto@forodyt.com`). Es la forma segura de cubrir a quien lo recibió en spam, lo borró o recibió la plantilla rota antes del 17-sep. Se detiene sola si la cuota baja de 20 o al acercarse a los 6 min de ejecución, y anota en `_logs` la fila en que quedó: si se detuvo por tiempo, volver a ejecutarla (se reenvía a todos otra vez desde el inicio; con pocos cientos de inscritos no llega al límite).
4. Casos sueltos: `reenviarQR('persona@dominio.com')` o `reenviarQR('IV-FORO-ABC123')`.
5. Si algún envío falla con error de Gmail/alias, correr `_autorizarCorreo()` (ya existe en Code.gs) y repetir.

Por qué fallaron: el correo se marcaba `false` cuando `UrlFetchApp` no conseguía el PNG del QR (servicio externo) o el envío era rechazado; además caen en spam/promociones y, hasta el 17-sep, la plantilla en producción estaba pegada como texto plano. Por eso ahora el correo lleva enlace al QR, el escáner puede registrar sin QR y la página de inscripción tiene «Reenviar mi QR».

## 4 · Prueba de 2 minutos

1. Abrir `https://forodyt.com/staff-scanner.html` en el teléfono → correo + clave → debe decir «Bloques sincronizados con la hoja (5)».
2. «Iniciar escaneo» → pestaña **Buscar sin QR** → escribir tu apellido → debe aparecer tu ficha con folio.
3. «Registrar entrada» hoy dará «Fuera de ventana de check-in»: es correcto (el bloque es mañana). Para un check-in completo de prueba: `_config` → `validar_ventana = FALSE`, registrar, borrar la fila en `CheckIns`, volver a `TRUE`.
4. «Reenviar QR» sobre tu ficha → llega el correo desde `contacto@forodyt.com` con QR y el enlace «Ábrelo en tu navegador» (abre `mi-qr.html` con el mismo código).
5. Escanear ese QR con la cámara → «QR válido · confirmar entrada».

## 5 · Durante el Foro

- Escáner: `forodyt.com/registroscomite` → «Abrir escáner». Ventana: 60 min antes del inicio y 60 min después del cierre de cada sede (CUCEA 8:00–15:10 · CUGDL 15:05–19:50 · Cineteca 9:05–14:30 · Ciudad Judicial 15:00–19:45).
- Asistente sin QR: modo «Buscar sin QR» (tarjeta correspondiente en el hub). Si no aparece, que se inscriba en `inscripcion.html` y se le busca de nuevo.
- Si el escáner rechaza entradas legítimas en masa: `_config` → `validar_ventana = FALSE` (horario descuadrado) o `antifraude_geo_activo = FALSE` (traslapes entre sedes). Volver a `TRUE` al terminar.
- Códigos de presencia para la transmisión: panel «Código de presencia» del hub (no dictar códigos «de prueba» en los bloques 1–4: pasan a ser obligatorios).

## 6 · Mensaje para el staff

Está en el documento de la clave (Claude-Work) y en el chat: URL `forodyt.com/registroscomite`, correo institucional, clave de staff, bloque. La clave no se publica en ninguna página del sitio.

## 7 · Después del Foro: rebote 552 y correo de cierre (2026-09-23)

**Qué pasó.** Los correos «desde» `contacto@forodyt.com` salían por el «Enviar como» de Gmail, que entrega a través de **smtp2go**. Al agotarse su cuota mensual, smtp2go rechaza con `552 Your monthly email allowance is exhausted`; Gmail acepta el envío y el rechazo llega después como rebote, así que el script lo apuntaba como enviado. Desde esta versión el envío va por **MailApp** (la cuenta del script, ~1500 destinatarios/día) con **Responder a: contacto@forodyt.com**. Para volver al alias cuando smtp2go tenga cuota: Script Property `MODO_ENVIO = alias`.

**1 · Pegar en el proyecto «IV Foro 2026 Backend»** (cuenta CUCEA): `Code.gs`, `Asistencia.gs`, `Constancia-bloque.html` (sustituir) y los nuevos `Cierre.gs` (Secuencia de comandos) y `Correo-cierre` (HTML). Guardar. **Implementar → Administrar implementaciones → ✏️ → Nueva versión** (nunca «Nueva implementación»).

**2 · Propiedades del script:**
- `MODO_ENVIO` = `mailapp` (o no definirla).
- `FIRMA_LEOS_FILE_ID`: **no hace falta capturarla**. La crea `prepararCierre` (paso 3.1) copiando a `_recursos` la firma original del Dr. Jorge Antonio Leos Navarro, que vive en el Drive de Gmail del director en `04- Recursos y Multimedia / 05- Firma Digital (Canon) / Terceros / firma-digital-leos-navarro-black.png` (id `1toMWjYmcQFQfXyfMCKtTacXZyTiNJgf-`, 640 × 160) y ya está **compartida como lectora con `emmanueldelva@cucea.udg.mx`** (23-sep). Con la copia propia, el envío ya no depende de que el archivo siga compartido.
- Opcional: `CIERRE_EXCLUIR` = folios o correos de prueba separados por coma (p. ej. `IV-FORO-UVDVQW`).
- Opcional: `CIERRE_FECHA` = `2026-09-24 09:00` (hora de Guadalajara).

**3 · Ejecutar, en este orden:**
1. **`prepararCierre`** → instala `LOGO_FORO_FILE_ID` (descarga `forodyt.com/img/marca/foro-logo-constancia.png`), copia la firma del Secretario Académico a `_recursos` y **lee de verdad** las seis imágenes (dos firmas, tres logos, marca de agua). Tiene que terminar con `"listo": true`; si una sale `FALTA o SIN ACCESO`, no seguir. No toca lo ya instalado.
2. `_reporteRebotes` → no envía nada. Llena la pestaña **Rebotes** con cada correo que no llegó (constancias por bloque, QR u otros) y el motivo.
3. `reenviarConstanciasRebotadas` → reenvía por MailApp las constancias por bloque que rebotaron (las toma de Drive, columna `pdf_id` de *ConstanciasBloque*). Si se detiene por tiempo o cuota, volver a ejecutarla: no repite a quien ya quedó marcado.
4. `_previewCierre` → te manda **a ti** el correo de cierre con las **tres** constancias de muestra (presencial, en línea y mixta) y un recuadro «PRUEBA» que dice cuántas personas hay de cada modalidad y si falta alguna firma o logo. Revisarlo.
5. `_reporteCierre` → destinatarios únicos y cuántos por modalidad, pendientes, cuota del día.
6. **`programarCierre`** (usa `CIERRE_FECHA`) o **`enviarCierre`** (envía ya). Va por tandas de 4 min y se reprograma sola; si se acaba la cuota del día, sigue a las 6 h. Al terminar llega un resumen al correo del director. `cancelarCierre` quita lo programado.

**Horas por modalidad** (decisión del director, 23-sep: la constancia sigue la modalidad con que se inscribió y a la presencial no se le computan las horas en línea; horas cerradas a horas completas). Minutos del programa definitivo: CUCEA 310 · CUGDL 165 · Cineteca 205 · Ciudad Judicial 165 = 845 presenciales; Jornada Virtual 252; evento completo 1 097.

| Modalidad de inscripción | Horas | Qué cubre |
|---|---|---|
| Presencial (o vacía) | **14 h** | Las cuatro sedes del 21 y 22 (845 min = 14.08 h) |
| Virtual | **15 h** | Lo que sí se transmitió: Jornada Virtual + CUCEA + CUGDL + Cineteca (932 min = 15.53 h). Ciudad Judicial no, porque su transmisión falló |
| Mixta | **18 h** | Evento completo (pudo estar en Ciudad Judicial en persona) |

Se envía a **todas las personas inscritas**, no solo a las escaneadas: hubo problemas para escanear en las sedes.

Cada persona inscrita recibe **un** correo (se deduplica por correo) con su constancia general `IV-FIDDT-GEN/UDG/2026-NNNN`, que se guarda también en Drive, en «Constancias de cierre (asistencia general)». La pestaña **CierreEnvios** registra cada envío; volver a correr `enviarCierre` solo alcanza a quien no lo recibió.

Vista previa local (sin tocar el backend): `FIRMA_PNG=… FIRMA_LEOS_PNG=… python3 _tools/cierre_preview.py && sh _tools/out/cierre/render.sh`.

## 8 · Base de asistentes de la V (Drive personal)

**Qué es.** Un Google Sheet en el Drive **personal** del director, aparte del Sheet institucional. Ahí quedan los asistentes de la IV que aceptaron recibir comunicaciones y todo el que se registre para recibir avisos de la V edición.

- Nombre: **ForoDyT 2027 — Base de asistentes y avisos**, carpeta «2027 — V ForoDyT» de `emmanueldelva@gmail.com`.
- id: `19Kb-cE2sL47v9dlKAG7FIGsWdEhO-AtNh5ZUmsRBpx4`
- Enlace: <https://docs.google.com/spreadsheets/d/19Kb-cE2sL47v9dlKAG7FIGsWdEhO-AtNh5ZUmsRBpx4/edit>
- Compartido como **editor** con `emmanueldelva@cucea.udg.mx` (25-sep-2026), que es la cuenta que ejecuta el script. Nadie más tiene acceso: **no compartirlo ni publicarlo**, porque tiene datos personales.
- Columnas: `correo · nombre · institucion · pais · tipo · grado · modalidad_iv · folio_iv · acepta_comunicaciones · origen · fecha_alta · fecha_actualizacion · notas`. Hay **una fila por correo**. Se pueden reordenar columnas o añadir otras propias: el script las busca por nombre y solo escribe las celdas que cambia. Lo que no se puede hacer es **renombrar** los encabezados.

**Cómo se llena.**
1. **Una vez**, con `sembrarBaseV()`. Copia a los inscritos de la IV (pestaña *Usuarios*) **que marcaron la casilla de comunicaciones** (`acepto_news`), con origen «IV-2026 inscripción», su nombre, institución, país, tipo, grado, modalidad y folio. También copia a todos los correos de la pestaña *Newsletter*, cada uno con su origen; si esa persona además se inscribió, su fila lleva los datos de la IV. Deja fuera los folios o correos de prueba de `CIERRE_EXCLUIR` (y de `BASE_V_EXCLUIR`, si se define).
   - Los inscritos que **no** marcaron la casilla **no se copian**; sus datos se quedan solo en el Sheet institucional. El motivo está en *Privacidad*, abajo. `sembrarBaseV()` dice cuántos fueron en `sin_consentimiento_omitidos`.
2. **Sola, desde entonces.** Cada «Avísame» del sitio entra a la base al momento con `acepta_comunicaciones = TRUE`. Todos esos formularios mandan `action: 'newsletter'`: `index.html#aviso` con origen `web_v2027`, `cfp.html` con `web_v2027_cfp`, `programa.html` con `web_v2027_programa`, `ponentes.html` con `web_v2027_ponentes` e `inscripcion.html#newsletter`. Si alguien ya estaba en la base, no se duplica: se le suma el origen nuevo y se actualiza `fecha_actualizacion`.

**Privacidad. Leer antes de sembrar y antes del primer aviso.** Esto dice el *Aviso de privacidad simplificado* que aceptaron los inscritos de la IV (`inscripcion.html`):
- **Responsable:** la **Universidad de Guadalajara, a través del CUCEA**. No es el Cuerpo Académico ni el director. La UdeG es sujeto obligado, así que aplica también la LGPDPPSO.
- **Finalidades secundarias** (con consentimiento expreso por casilla): información sobre futuras ediciones del Foro y actividades del Cuerpo Académico UDEG-CA-1236. La casilla es `acepto_news`: «Quiero recibir comunicaciones sobre futuras ediciones del Foro y actividades del Cuerpo Académico UDEG-CA-1236 “Derecho y Tecnología”».
- **Conservación:** hasta dos años tras el cierre, **exclusivamente** para auditoría académica y emisión de duplicados de constancia.
- **Transferencias:** ninguna a terceros distintos del comité organizador.
- **ARCO:** las solicitudes llegan a `emmanueldelva@cucea.udg.mx` con el asunto «ARCO · IV Foro».

Por eso la base funciona así:
- Solo entran quienes tienen consentimiento para recibir avisos: los que marcaron la casilla, los de la lista *Newsletter* y los de «Avísame». Todos quedan con `acepta_comunicaciones = TRUE`.
- A quien no marcó la casilla **no se le copia**. Una base de avisos en un Drive personal no es auditoría ni duplicado de constancia.
- La propiedad `BASE_V_INCLUIR_HISTORICO = TRUE` los copiaría también, con `FALSE` y sin avisos, como registro histórico. **No activarla sin consultar antes a la Unidad de Transparencia de la UdeG.**
- Los avisos se mandan **solo** a `acepta_comunicaciones = TRUE`.
- Un `TRUE` solo pasa a `FALSE` con una baja explícita: `bajaBaseV('correo')`, o `[BAJA]` escrito en `notas`. **Desmarcar la casilla a mano no basta:** sin la marca, la siguiente siembra la vuelve a poner en `TRUE`.
- Una baja no se deshace sola. Si después alguien llena el formulario con ese correo, la fila sigue en `FALSE` y en `notas` aparece `[PIDE RE-ALTA fecha]`, porque cualquiera puede escribir un correo ajeno. Solo se reactiva si la persona lo confirma: entonces se pone `TRUE` a mano y se escribe `[RE-ALTA fecha]` en `notas`.
- La fila de una baja se queda en la base con el correo y la marca, para que nada vuelva a darla de alta. A una fila de baja el script no le añade datos. Si la persona pide **cancelar** sus datos (ARCO), borrar a mano el resto de las celdas de su fila y dejar solo el correo y la marca.

### Pasos (una sola vez, cuenta CUCEA, unos 10 min) — después todo es automático

1. Abrir [script.google.com](https://script.google.com) con `emmanueldelva@cucea.udg.mx` → proyecto **IV Foro 2026 Backend**. En `Code.gs`, sustituir **todo** el contenido por `apps-script/Code.gs` de este repo, sin que el editor lo reindente (truco de Monaco + SHA-256 en `docs/en-vivo-asistencia.md` §5). Comprobar que aparecen `activarBaseV`, `sincronizarBaseV` y `anunciarV` y que los acentos están bien. **Guardar.**
2. **Bajas pendientes de la IV** (solo si las hay): quien respondió «Baja newsletter»/«Baja» o pidió cancelación ARCO. En el editor: `function bajasIV() { ['persona1@dominio.com'].forEach(bajaBaseV); }` — se puede correr después del paso 3; la baja manda sobre la siembra.
3. En el desplegable de funciones elegir **`activarBaseV`** (esperar a que el desplegable se cierre) → **Ejecutar** → **Autorizar**. Google pide dos permisos nuevos: **ver tus archivos de Drive** (para encontrar la hoja por su nombre) y **hojas de cálculo**; en la pantalla por casillas, **las dos tienen que quedar marcadas**. La función:
   - busca la hoja «ForoDyT 2027 — Base de asistentes y avisos» y guarda su id en `BASE_V_SHEET_ID` (no hay que capturarlo a mano);
   - siembra a los inscritos de la IV con consentimiento y la lista *Newsletter*;
   - instala el disparador **`sincronizarBaseV` cada hora**, que recoge cualquier alta que no entró en tiempo real;
   - deja en el registro el conteo (`total`, `con_consentimiento`, `bajas`, `duplicados` debe salir vacío).
   Si hubiera tandas de `enviarCierre` pendientes en *Activadores*, la sincronización horaria espera sola a que terminen.
4. **Publicar: Implementar → Administrar implementaciones → ✏️ Editar → Versión: «Nueva versión» → Implementar.** ⚠️ **Nunca «Nueva implementación»** (cambia la URL y rompe los formularios del sitio).
5. **Prueba:** desde una terminal (o el «Avísame» de la portada en incógnito):
   ```
   curl -sL -H 'Content-Type: text/plain;charset=utf-8' \
     -d '{"action":"newsletter","correo":"emmanueldelva+prueba-v@gmail.com","origen":"prueba_runbook"}' \
     'https://script.google.com/macros/s/AKfycbz5aIcuEuYDT7dhtrOmV55-JzzgzlXOZ0_lWOe1gpHPp0OJB0q2fn4l2B4NTHxBUq6CVA/exec'
   ```
   Debe responder `{"ok":true}` y en segundos aparece la fila en la base. Si no, `_logs` (acción `baseV`) dice por qué. Borrar después la fila de prueba de la base y de *Newsletter*.

**Qué queda automático desde ese momento:** cada «Avísame» del sitio (portada, convocatoria, programa, ponentes) entra al instante; cada inscripción nueva entra al instante (cuando abra la inscripción de la V, poner la propiedad `EDICION_INSCRIPCION = V-2027` para que se registre como asistente de la V con `folio_v` y `modalidad_v`); y cada hora `sincronizarBaseV` repasa todo. Para apagarlo: `desactivarBaseV()`.

> **Aviso de privacidad de la V:** cuando abra la inscripción de la V, su aviso debe decir que los datos se integran a la base de asistentes y avisos del Foro. Las inscripciones de la V entran todas; las de la IV, solo con la casilla de comunicaciones.

### Día a día

- **Aviso en un clic (fecha y sede de la V):** en *Propiedades del script* poner `V_FECHA_INICIO` (`2027-09-20`), `V_FECHA_FIN` (opcional), `V_SEDE` y, si ya existe, `V_LEMA`. Ejecutar **`_previewAnuncioV`** (te llega solo a ti, con el archivo `.ics` para el calendario) y, si está bien, **`anunciarV`**: sale a toda la base con consentimiento. Si se detiene por tiempo o cuota, volver a ejecutar `anunciarV`; solo alcanza a quien falta. En el sitio, el mismo día, llenar `V_EDICION` en `index.html` (fecha y sede quedan entintadas).

- **Mandar un aviso de la V:**
  - Primero **`_testAvisoBaseV`**: te llega solo a ti, con el formato de la V (tinta y cobre) y el número de personas que lo recibirían.
  - Luego, en el editor, escribir una función propia y ejecutarla:
    ```js
    function avisoV() { enviarAvisoBaseV('Asunto del aviso', '<p>Texto del aviso…</p>'); }
    ```
  - Solo alcanza a `acepta_comunicaciones = TRUE`. Sale con «Responder a: contacto@forodyt.com» y cada envío queda en la pestaña **Avisos** de la base.
  - Si se detiene por tiempo o por la cuota del día (~1500), volver a ejecutarla con **el mismo asunto**: solo se manda a quien falta.
  - Mientras manda, los «Avísame» del sitio siguen entrando a la base: el envío no retiene el candado. Si se ejecuta dos veces a la vez, la segunda se niega («Ya hay un aviso de la V enviándose»). La marca dura como mucho 7 min: si una ejecución se cae a medias, a los 7 min se puede volver a lanzar.
  - `enviarNewsletterMasivo()` sigue existiendo, pero lee la lista vieja de la IV y no conoce las bajas. **Para la V, usar siempre `enviarAvisoBaseV`.**
- **Baja** (alguien responde «Baja», escribe a contacto@forodyt.com o manda una solicitud ARCO): usar `function bajaX() { bajaBaseV('persona@dominio.com'); }`. Otra opción es hacerlo a mano en la base: `acepta_comunicaciones = FALSE` **y** `[BAJA fecha]` (o `[BAJA]`) en `notas`. Sin esa marca, la siguiente siembra le vuelve a poner `TRUE`.
- **Altas que no llegaron:** revisar de vez en cuando la pestaña `_logs` del Sheet institucional y buscar filas `baseV` con `base_v_ocupada` o con un error. Aparecen si alguien se suscribió mientras corría una siembra o una tanda de `enviarCierre` (retienen el candado del script). El correo sí quedó en la pestaña *Newsletter*: volver a ejecutar `sembrarBaseV()` y entran.
- **Revisar de vez en cuando `_reporteBaseV`:** si `piden_re_alta` es mayor que cero, hay personas dadas de baja que llenaron el formulario. Confirmar con ellas antes de reactivarlas.
- No ordenar, filtrar ni añadir filas en la hoja **mientras** corre `sembrarBaseV` (toma unos segundos). Si pasa, la siembra se detiene sola antes de escribir en una fila equivocada, y basta con volver a ejecutarla.
