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
