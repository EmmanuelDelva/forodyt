/**
 * IV Foro Internacional de Derecho y Tecnología — Backend Apps Script
 *
 * Despliegue:
 *   1. Vincular este script al Google Sheets "IV-Foro-Inscripciones-2026".
 *   2. En Project Settings > Script Properties, agregar:
 *      - HMAC_SECRET: string aleatorio de 32+ chars (generar UNA vez, NO compartir)
 *      - FOLIO_PREFIX: "IV-FORO-"
 *      - SENDER_NAME: "IV Foro Internacional de Derecho y Tecnología"
 *      - SENDER_EMAIL: "emmanueldelva@cucea.udg.mx" (cuenta que ejecuta el script)
 *      - REMITENTE: "contacto@forodyt.com" (opcional; es el default). Es la dirección de respuesta (Reply-To) de
 *        todos los correos a participantes.
 *      - MODO_ENVIO: "mailapp" (default) o "alias". Con "mailapp" los correos salen de la cuenta del script
 *        (MailApp, cuota de Google Workspace) y responden a REMITENTE. Con "alias" salen DESDE REMITENTE por el
 *        «Enviar mensaje como» de Gmail, que en la CUCEA pasa por smtp2go. OJO (2026-09-23): cuando se agota la
 *        cuota mensual de smtp2go, Gmail acepta el correo y el rechazo («552 Your monthly email allowance is
 *        exhausted») llega DESPUÉS como rebote al buzón: el script lo da por enviado y la persona no lo recibe.
 *        Por eso el default es "mailapp"; volver a "alias" solo con cuota de smtp2go comprobada.
 *      - LOGO_URL: URL pública del logo del Foro (opcional)
 *      - DIRECTOR_EMAIL: correo a notificar en alertas críticas (default: SENDER_EMAIL)
 *      - CONSTANCIA_TEMPLATE_ID: Doc ID del template de constancia
 *           (si no está, se autogenera uno default en el Drive del despliegue)
 *      - BASE_V_SHEET_ID: id del Google Sheet «ForoDyT 2027 — Base de asistentes y avisos», que vive en el Drive
 *           PERSONAL del director (emmanueldelva@gmail.com, carpeta «2027 — V ForoDyT») y está compartido como
 *           editor con la cuenta que ejecuta este script. El id va en RUNBOOK-evento.md §8; NO se escribe aquí.
 *           Sin esta propiedad la base de la V queda apagada y nada más cambia.
 *      - BASE_V_HOJA: (opcional) nombre de la pestaña de la base. Sin ella se usa la primera pestaña.
 *      - BASE_V_EXCLUIR: (opcional) folios o correos de prueba separados por coma que sembrarBaseV() no copia.
 *           También respeta CIERRE_EXCLUIR (Cierre.gs).
 *      - BASE_V_INCLUIR_HISTORICO: (opcional, APAGADA por defecto) "TRUE" hace que sembrarBaseV() copie también a
 *           los inscritos de la IV que NO dieron consentimiento. Ver PRIVACIDAD abajo antes de activarla.
 *   3. Deploy > New deployment > Type: Web app
 *      - Execute as: Me (emmanueldelva@cucea.udg.mx)
 *      - Who has access: Anyone
 *   4. Copiar la URL del Web App al frontend (inscripcion.html, const ENDPOINT).
 *
 * Cuotas relevantes (cuenta Workspace UDG):
 *   - MailApp: 1500 correos/día
 *   - UrlFetchApp: 100,000/día
 *   - Triggers: 6/script
 *
 * Funciones administrativas (correr manualmente desde el editor):
 *   - _testInscripcion()       → prueba end-to-end con tu correo
 *   - _checkQuota()            → muestra cuota MailApp restante hoy
 *   - reintentarCorreosQR()    → reenvía QRs a usuarios con correo_qr_enviado=false
 *   - _reporteCorreos()        → cuenta inscritos / correos enviados / pendientes + cuota (NO envía nada)
 *   - _reenviarPendientes()    → reenvía SOLO a quienes tienen correo_qr_enviado=false
 *   - _reenviarATodos()        → recordatorio con QR a TODOS los inscritos (víspera del Foro)
 *   - reenviarQR('correo|folio') → reenvía el QR a una persona concreta
 *   - procesarCSVZoom(id, csv) → procesa attendee report de Zoom Webinar
 *   - auditoriaPostEvento()    → reporte de fraude detectado
 *   - procesarConstancias()    → cómputo final + emisión de PDFs en lotes
 *   - cerrarPlatica(id)        → cierra ventana de check-in de una plática
 *   - enviarNewsletterMasivo(asunto, htmlBody) → envía correo a toda la lista del newsletter (lista histórica de la IV)
 *   - _testNewsletter()        → envía correo de prueba SOLO al Director
 *
 * Base de asistentes de la V (2027) en el Drive personal del director:
 *   - sembrarBaseV()           → copia a la base los inscritos de la IV CON consentimiento (acepto_news) y la lista
 *                                Newsletter. Idempotente: volver a correrla no duplica y no pisa los datos corregidos
 *                                a mano. OJO: una baja hecha a mano SIN la marca [BAJA] en notas (solo desmarcando
 *                                acepta_comunicaciones) sí la revierte la siguiente siembra: usar bajaBaseV.
 *   - _reporteBaseV()          → conteos (total, con consentimiento, bajas, por origen). NO envía nada.
 *   - bajaBaseV('correo')      → baja explícita: acepta_comunicaciones = FALSE y deja la marca [BAJA fecha].
 *   - _testAvisoBaseV()        → aviso de prueba SOLO al Director, con el formato de la V.
 *   - enviarAvisoBaseV(asunto, htmlBody) → aviso a la base de la V, SOLO a acepta_comunicaciones = TRUE.
 *   Cada suscripción de «Avísame» (action 'newsletter', p. ej. index.html#aviso) entra sola a la base.
 *
 * PRIVACIDAD — base de la V (LFPDPPP y LGPDPPSO: la UdeG es sujeto obligado):
 *   Lo que dice el Aviso de privacidad de la inscripción de la IV (inscripcion.html, «Aviso de privacidad
 *   simplificado»):
 *     · Responsable: la Universidad de Guadalajara, a través del CUCEA. No es el Cuerpo Académico ni el director.
 *     · Finalidades secundarias, con consentimiento expreso por casilla: información sobre futuras ediciones del
 *       Foro y actividades del CA UDG-CA-1236. Esa casilla es acepto_news («Quiero recibir comunicaciones sobre
 *       futuras ediciones del Foro y actividades del Cuerpo Académico UDG-CA-1236»).
 *     · Conservación: hasta dos años tras el cierre, EXCLUSIVAMENTE para auditoría académica y emisión de
 *       duplicados de constancia.
 *     · Transferencias: ninguna a terceros distintos del comité organizador.
 *   Por eso:
 *     · sembrarBaseV() copia SOLO a quien tiene consentimiento: marcó acepto_news, o se suscribió (lista
 *       Newsletter o «Avísame»). Todos ellos quedan con acepta_comunicaciones = TRUE.
 *     · A quien NO marcó la casilla no se le copia. Una base de avisos en un Drive personal no es auditoría ni
 *       duplicado de constancia, así que sus datos se quedan solo en el Sheet institucional.
 *     · BASE_V_INCLUIR_HISTORICO = TRUE copia también a esas personas, con FALSE y sin avisos, como registro
 *       histórico. Activarla SOLO después de consultarlo con la Unidad de Transparencia de la UdeG.
 *     · Los anuncios se envían SOLO a quien tenga acepta_comunicaciones = TRUE.
 *   Nunca se degrada de TRUE a FALSE salvo baja explícita (bajaBaseV, o [BAJA] escrito a mano en notas). Una baja
 *   no se revierte sola: ni la siembra ni un formulario público (que cualquiera puede llenar con un correo ajeno)
 *   la reactivan. El formulario solo deja la nota [PIDE RE-ALTA …] para que el director decida y ponga TRUE a mano.
 *   La fila de una baja se conserva con el correo y la marca para que nada vuelva a darla de alta.
 */

// ============ CONFIG ============
const PROPS = PropertiesService.getScriptProperties();
const SS = SpreadsheetApp.getActiveSpreadsheet();
const TZ = 'America/Mexico_City';

const SHEETS = {
  usuarios: 'Usuarios',
  platicas: 'Platicas',
  checkins: 'CheckIns',
  config: '_config',
  logs: '_logs',
  newsletter: 'Newsletter'
};

const TIPOS_VALIDOS = ['estudiante', 'academico', 'juridico', 'publico', 'privado', 'otro', 'ponente'];
const MODALIDADES_VALIDAS = ['presencial', 'virtual', 'mixta'];

// ============ ENTRY POINTS ============
/**
 * Endpoint POST — inscripción, check-in, newsletter y asistencia por transmisión (stream_*).
 * Body: JSON con { action, ...payload }.
 * Si no hay action, asume inscripción (compatibilidad con form básico).
 */
function doPost(e) {
  const ctx = readRequestContext_(e);
  try {
    const payload = JSON.parse(e.postData.contents);

    // Pausa global del endpoint público
    const config = leerConfig_();
    if (config.endpoint_publico_activo === false || config.endpoint_publico_activo === 'FALSE') {
      log_('doPost', payload.action || 'inscripcion', 'endpoint_pausado', ctx);
      return jsonResponse_({ ok: false, error: 'Inscripciones temporalmente pausadas. Vuelve a intentarlo más tarde.' });
    }

    let result;
    switch (payload.action) {
      case 'inscripcion':
        result = crearInscripcion(payload);
        break;
      case 'checkin':
        // El check-in es operación de staff: exige la clave compartida.
        result = staffKeyValida_(payload.staff_key)
          ? registrarCheckin(payload)
          : { ok: false, error: 'staff_key_invalida' };
        break;
      case 'newsletter':
        result = suscribirNewsletter(payload);
        break;
      // Asistencia por transmisión (en-vivo.html). Las funciones viven en Asistencia.gs.
      case 'reenviar':
        // Autoservicio: reenvía el QR al correo con el que se inscribió (limitado por CacheService).
        result = reenviarQRPublico(payload);
        break;
      case 'stream_login':         result = streamLogin(payload); break;
      case 'stream_latido':        result = streamLatido(payload); break;
      case 'stream_reto':          result = streamReto(payload); break;
      case 'stream_reto_pantalla': result = streamRetoPantalla(payload); break;
      default:
        // Sin `action` explícito es una inscripción del formulario clásico.
        // Con un `action` que este proyecto no conoce hay que FALLAR, no inscribir:
        // si no, cualquier petición nueva de en-vivo.html (un latido por minuto y por
        // espectador) caería aquí y llenaría la hoja de inscripciones basura.
        result = payload.action
          ? { ok: false, error: 'accion_desconocida: ' + payload.action }
          : crearInscripcion(payload);
    }
    // Un latido aceptado no se anota en _logs: llega uno por minuto y por espectador y ya
    // queda en StreamLatidos. Los rechazados sí se anotan (sirven para diagnosticar).
    if (!(payload.action === 'stream_latido' && result.ok)) {
      log_('doPost', payload.action || 'inscripcion', result.ok ? 'ok' : (result.error || 'fail'), ctx);
    }
    return jsonResponse_(result);
  } catch (err) {
    log_('doPost', 'parse_error', err.message, ctx);
    return jsonResponse_({ ok: false, error: 'Solicitud inválida' });
  }
}

/**
 * Endpoint GET — validar QR (lectura del staff scanner), código de presencia
 * de la transmisión (stream_codigo_nuevo) + healthcheck.
 */
function doGet(e) {
  const ctx = readRequestContext_(e);
  if (e.parameter && e.parameter.action === 'validar') {
    // validar expone datos del inscrito: exige la clave de staff.
    if (!staffKeyValida_(e.parameter.key)) {
      log_('doGet', 'validar', 'staff_key_invalida', ctx);
      return jsonResponse_({ ok: false, error: 'staff_key_invalida' });
    }
    const result = validarQR(e.parameter.folio, e.parameter.hmac);
    log_('doGet', 'validar', result.ok ? 'ok' : (result.error || 'fail'), ctx);
    return jsonResponse_(result);
  }
  if (e.parameter && e.parameter.action === 'stream_codigo_nuevo') {
    // Código de presencia para la transmisión (registroscomite.html): operación de staff.
    if (!staffKeyValida_(e.parameter.key)) {
      log_('doGet', 'stream_codigo_nuevo', 'staff_key_invalida', ctx);
      return jsonResponse_({ ok: false, error: 'staff_key_invalida' });
    }
    const result = streamCodigoNuevo(e.parameter.id_platica, e.parameter.minutos);
    log_('doGet', 'stream_codigo_nuevo', result.ok ? 'ok' : (result.error || 'fail'), ctx);
    return jsonResponse_(result);
  }
  if (e.parameter && e.parameter.action === 'buscar') {
    // Mesa de registro: localizar a un inscrito sin QR (por nombre, correo o folio). Exige clave de staff.
    if (!staffKeyValida_(e.parameter.key)) {
      log_('doGet', 'buscar', 'staff_key_invalida', ctx);
      return jsonResponse_({ ok: false, error: 'staff_key_invalida' });
    }
    const result = buscarAsistentes_(e.parameter.q);
    log_('doGet', 'buscar', result.ok ? ('ok:' + result.resultados.length) : (result.error || 'fail'), ctx);
    return jsonResponse_(result);
  }
  if (e.parameter && e.parameter.action === 'platicas') {
    // El escáner lee los bloques desde la pestaña Platicas (una sola fuente de verdad).
    if (!staffKeyValida_(e.parameter.key)) {
      return jsonResponse_({ ok: false, error: 'staff_key_invalida' });
    }
    return jsonResponse_(listarPlaticas_());
  }
  return jsonResponse_({ ok: true, msg: 'IV Foro endpoint activo' });
}

/**
 * Clave compartida del staff (scanner / check-in).
 * Se configura en Project Settings > Script Properties como STAFF_KEY.
 * Si STAFF_KEY no está configurada, NO se exige (rollout en 2 fases:
 * primero se actualiza este código sin romper nada; el candado se activa
 * en el momento en que se agrega la propiedad).
 */
function staffKeyValida_(key) {
  const expected = PROPS.getProperty('STAFF_KEY');
  if (!expected) return true;
  return String(key || '').trim().toUpperCase() === expected.trim().toUpperCase();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readRequestContext_(e) {
  // Apps Script no expone IP del cliente. Solo capturamos el user-agent si viene.
  const userAgent = (e && e.parameter && e.parameter.ua) ? e.parameter.ua : '';
  return { ip: '', userAgent: userAgent };
}

// ============ INSCRIPCIÓN ============
function crearInscripcion(payload) {
  // Validaciones
  if (!payload.correo || !payload.nombre || !payload.tipo) {
    return { ok: false, error: 'Campos obligatorios faltantes' };
  }
  if (TIPOS_VALIDOS.indexOf(payload.tipo) === -1) {
    return { ok: false, error: 'Tipo de participante inválido' };
  }
  if (payload.modalidad && MODALIDADES_VALIDAS.indexOf(payload.modalidad) === -1) {
    return { ok: false, error: 'Modalidad inválida' };
  }
  if (!isEmailValid_(payload.correo)) {
    return { ok: false, error: 'Correo inválido' };
  }
  if (!payload.acepto_aviso || !payload.acepto_codigo) {
    return { ok: false, error: 'Debes aceptar el aviso de privacidad y el código de conducta' };
  }
  if (!payload.institucion || !String(payload.institucion).trim()) {
    return { ok: false, error: 'Institución es obligatoria' };
  }

  const correo = String(payload.correo).toLowerCase().trim();
  const sheet = SS.getSheetByName(SHEETS.usuarios);

  // Idempotencia: ya inscrito = no duplica, retorna folio existente
  const existente = buscarUsuario_(correo);
  if (existente) {
    // Quien se vuelve a inscribir casi siempre es porque NO le llegó el QR: se lo reenviamos (con límite).
    let reenviado = false;
    if (puedeReenviar_(correo)) {
      try {
        enviarCorreoQR_(correo, existente.nombre_completo, existente.folio, existente.qr_payload, { reenvio: true });
        marcarCorreoEnviado_(existente.folio);
        reenviado = true;
      } catch (err) {
        log_('reenvioYaInscrito', existente.folio, err.message, null);
      }
    }
    return {
      ok: true,
      ya_inscrito: true,
      reenviado: reenviado,
      folio: existente.folio,
      mensaje: reenviado
        ? 'Ya estabas inscrito. Te acabamos de reenviar tu código QR; revisa también la carpeta de spam.'
        : 'Ya estabas inscrito. Revisa tu correo (y spam) o usa la opción «Reenviar mi QR».'
    };
  }

  // Generar folio + payload de QR
  const folio = generarFolio_();
  const hmac8 = calcularHMAC8_(folio);
  const qrPayload = `FORO|${folio}|${hmac8}`;

  sheet.appendRow([
    folio,
    correo,
    String(payload.nombre).trim(),
    payload.tipo,
    payload.grado || '',
    payload.programa || '',
    payload.snii || '',
    payload.area || '',
    String(payload.institucion).trim(),
    payload.pais || 'MX',
    payload.modalidad || 'presencial',
    payload.fuente || '',
    !!payload.acepto_aviso,
    !!payload.acepto_codigo,
    !!payload.acepto_news,
    qrPayload,
    new Date(),
    false, // correo_qr_enviado
    0,     // horas_acumuladas
    '',    // nivel_constancia
    false, // constancia_enviada
    ''     // notas_staff
  ]);

  // Enviar correo con QR. Si falla, queda flaggeado para reintento.
  try {
    enviarCorreoQR_(correo, payload.nombre, folio, qrPayload);
    sheet.getRange(sheet.getLastRow(), 18).setValue(true);
  } catch (err) {
    log_('enviarCorreoQR', 'error', err.message, null);
  }

  return { ok: true, folio: folio, mensaje: 'Inscripción registrada. Revisa tu correo.' };
}

function isEmailValid_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
}

/**
 * Reintenta envío de correo a usuarios con correo_qr_enviado=false.
 * Útil si hubo caída transitoria del fetch del QR.
 */
function reintentarCorreosQR() {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxFolio = headers.indexOf('folio');
  const idxCorreo = headers.indexOf('correo');
  const idxNombre = headers.indexOf('nombre_completo');
  const idxQrPayload = headers.indexOf('qr_payload');
  const idxFlag = headers.indexOf('correo_qr_enviado');

  let enviados = 0;
  let fallos = 0;
  for (let i = 1; i < data.length; i++) {
    if (esTrue_(data[i][idxFlag])) continue;
    try {
      enviarCorreoQR_(data[i][idxCorreo], data[i][idxNombre], data[i][idxFolio], data[i][idxQrPayload]);
      sheet.getRange(i + 1, idxFlag + 1).setValue(true);
      enviados++;
      Utilities.sleep(500); // pequeño throttle entre correos
    } catch (err) {
      fallos++;
      log_('reintentarCorreosQR', data[i][idxFolio], err.message, null);
    }
  }
  Logger.log(`reintentarCorreosQR: ${enviados} enviados, ${fallos} fallos.`);
  return { enviados: enviados, fallos: fallos };
}

// ============ HMAC + FOLIO ============
function generarFolio_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return (PROPS.getProperty('FOLIO_PREFIX') || 'IV-FORO-') + r;
}

function calcularHMAC8_(folio) {
  const secret = PROPS.getProperty('HMAC_SECRET');
  if (!secret) throw new Error('HMAC_SECRET no configurado en Script Properties');
  const hmacBytes = Utilities.computeHmacSha256Signature(folio, secret);
  let hex = '';
  for (let i = 0; i < hmacBytes.length; i++) {
    let b = hmacBytes[i];
    if (b < 0) b += 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex.substring(0, 8);
}

function validarQR(folio, hmacRecibido) {
  if (!folio || !hmacRecibido) return { ok: false, error: 'Faltan parámetros' };
  let hmacEsperado;
  try {
    hmacEsperado = calcularHMAC8_(folio);
  } catch (err) {
    return { ok: false, error: 'Error de configuración' };
  }
  // Comparación constant-time-ish (Apps Script no expone timingSafeEqual)
  if (hmacRecibido.length !== hmacEsperado.length) return { ok: false, error: 'HMAC inválido' };
  let diff = 0;
  for (let i = 0; i < hmacRecibido.length; i++) {
    diff |= hmacRecibido.charCodeAt(i) ^ hmacEsperado.charCodeAt(i);
  }
  if (diff !== 0) return { ok: false, error: 'HMAC inválido' };

  const usuario = buscarUsuarioPorFolio_(folio);
  if (!usuario) return { ok: false, error: 'Folio no encontrado' };
  return {
    ok: true,
    folio: folio,
    nombre: usuario.nombre_completo,
    tipo: usuario.tipo,
    institucion: usuario.institucion,
    modalidad: usuario.modalidad
  };
}

// ============ CORREO ============
/**
 * enviarCorreo_({to, subject, htmlBody, attachments, inlineImages, name}) — único punto de salida de los correos a
 * participantes. Por defecto (MODO_ENVIO = mailapp) sale con MailApp desde la cuenta del script y Reply-To a
 * REMITENTE. Solo con MODO_ENVIO = alias sale DESDE REMITENTE, y únicamente si es un «Enviar como» verificado.
 * Devuelve 'alias' o 'mailapp'.
 */
let ALIASES_CACHE_ = null;
function remitente_() { return String(PROPS.getProperty('REMITENTE') || 'contacto@forodyt.com').trim(); }
function modoEnvio_() { return String(PROPS.getProperty('MODO_ENVIO') || 'mailapp').trim().toLowerCase(); }
function aliasDisponible_(correo) {
  if (ALIASES_CACHE_ === null) {
    try { ALIASES_CACHE_ = GmailApp.getAliases().map(a => String(a).toLowerCase()); }
    catch (e) { ALIASES_CACHE_ = []; log_('aliasDisponible_', correo, e.message, null); }
  }
  return ALIASES_CACHE_.indexOf(String(correo).toLowerCase()) !== -1;
}
function textoPlano_(html) {
  return String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}
function enviarCorreo_(o) {
  const de = remitente_();
  const opciones = { htmlBody: o.htmlBody, name: o.name || PROPS.getProperty('SENDER_NAME') || 'IV Foro Internacional de Derecho y Tecnología', replyTo: de };
  if (o.attachments) opciones.attachments = o.attachments;
  if (o.inlineImages) opciones.inlineImages = o.inlineImages;
  if (modoEnvio_() === 'alias' && aliasDisponible_(de)) {
    opciones.from = de;
    GmailApp.sendEmail(o.to, o.subject, o.body || textoPlano_(o.htmlBody), opciones);
    return 'alias';
  }
  MailApp.sendEmail(Object.assign({ to: o.to, subject: o.subject, body: o.body || textoPlano_(o.htmlBody) }, opciones));
  return 'mailapp';
}

/**
 * _autorizarCorreo() — correr desde el editor. Con el consentimiento granular de Google, el permiso de Gmail
 * («Leer, redactar, enviar…») puede quedar sin marcar aunque el resto sí: entonces enviarCorreo_() cae a MailApp.
 * Esta función vuelve a pedir ese permiso y muestra las direcciones «Enviar como» que ve el script.
 */
function _autorizarCorreo() {
  if (typeof ScriptApp.requireScopes === 'function') ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://mail.google.com/']);
  const alias = GmailApp.getAliases();
  Logger.log('Direcciones «Enviar como» que ve el script: ' + (alias.join(', ') || '(ninguna)'));
  const hayAlias = alias.map(a => String(a).toLowerCase()).indexOf(remitente_().toLowerCase()) !== -1;
  Logger.log('MODO_ENVIO = ' + modoEnvio_());
  Logger.log(modoEnvio_() === 'alias' && hayAlias
    ? 'Los correos a participantes saldrán DESDE ' + remitente_() + ' (smtp2go: comprobar que le quede cuota)'
    : 'Los correos saldrán de la cuenta del script con respuesta a ' + remitente_() + (hayAlias ? '' : ' (el alias no aparece)'));
}

function enviarCorreoQR_(correo, nombre, folio, qrPayload, opts) {
  opts = opts || {};
  const qrLink = urlMiQR_(qrPayload);
  const qrBlob = obtenerQRBlob_(qrPayload); // null si ningún generador respondió

  const intro = opts.reenvio
    ? 'Te reenviamos tu credencial digital para el IV Foro Internacional de Derecho y Tecnología. Es el mismo folio de tu inscripción original.'
    : 'Tu inscripción al IV Foro Internacional de Derecho y Tecnología fue registrada con éxito. Aquí va tu credencial digital.';

  const qrInline = qrBlob
    ? '<img src="cid:qr" alt="QR" style="width:240px;height:240px;display:block;margin:24px auto;">'
    : '<p style="margin:24px auto;font-size:14px;"><a href="' + qrLink + '" style="display:inline-block;padding:12px 18px;background:#0E1B2C;color:#F5EFE0;text-decoration:none;font-family:\'Courier New\',monospace;letter-spacing:0.08em;">ABRIR MI CÓDIGO QR</a></p>';

  const html = HtmlService
    .createTemplateFromFile('Plantilla-correo')
    .evaluate()
    .getContent()
    .replace(/{{NOMBRE}}/g, escapeHtml_(nombre))
    .replace(/{{FOLIO}}/g, folio)
    .replace(/{{INTRO}}/g, intro)
    .replace(/{{QR_LINK}}/g, qrLink)
    .replace(/{{QR_INLINE}}/g, qrInline);

  const subject = opts.reenvio
    ? `Tu código QR para el IV Foro Internacional de Derecho y Tecnología — Folio ${folio}`
    : `Tu inscripción al IV Foro Internacional de Derecho y Tecnología — Folio ${folio}`;

  const mail = { to: correo, subject: subject, htmlBody: html };
  if (qrBlob) mail.inlineImages = { qr: qrBlob };
  enviarCorreo_(mail);
}

/**
 * Genera el PNG del QR probando varios generadores. Si todos fallan devuelve null:
 * el correo sale de todas formas con el enlace a mi-qr.html (que dibuja el QR en el navegador).
 */
function obtenerQRBlob_(qrPayload) {
  const data = encodeURIComponent(qrPayload);
  const fuentes = [
    'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=' + data,
    'https://quickchart.io/qr?size=400&margin=2&text=' + data
  ];
  for (let i = 0; i < fuentes.length; i++) {
    try {
      const res = UrlFetchApp.fetch(fuentes[i], { muteHttpExceptions: true, followRedirects: true });
      const tipo = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
      if (res.getResponseCode() === 200 && tipo.indexOf('image') !== -1 && res.getContent().length > 200) {
        return res.getBlob().setName('qr.png');
      }
      log_('obtenerQRBlob', 'fuente_' + i, 'HTTP ' + res.getResponseCode() + ' ' + tipo, null);
    } catch (err) {
      log_('obtenerQRBlob', 'fuente_' + i, err.message, null);
    }
  }
  return null;
}

function urlMiQR_(qrPayload) {
  return 'https://forodyt.com/mi-qr.html?d=' + encodeURIComponent(qrPayload);
}

function marcarCorreoEnviado_(folio) {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const idxFolio = data[0].indexOf('folio');
  const idxFlag = data[0].indexOf('correo_qr_enviado');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxFolio]).toUpperCase().trim() === String(folio).toUpperCase().trim()) {
      sheet.getRange(i + 1, idxFlag + 1).setValue(true);
      return true;
    }
  }
  return false;
}

function esTrue_(v) { return v === true || String(v).trim().toUpperCase() === 'TRUE'; }
function esFalse_(v) { return v === false || String(v).trim().toUpperCase() === 'FALSE'; }

/** Límite de autoservicio: máx. 3 reenvíos por correo cada 6 horas (CacheService, sin tocar el Sheet). */
function puedeReenviar_(correo) {
  const cache = CacheService.getScriptCache();
  const key = 'reenvio:' + String(correo).toLowerCase().trim();
  const n = Number(cache.get(key) || 0);
  if (n >= 3) return false;
  cache.put(key, String(n + 1), 21600);
  return true;
}

/** action 'reenviar' (POST público): { correo } → reenvía el QR al correo registrado. */
function reenviarQRPublico(payload) {
  const correo = String(payload.correo || '').toLowerCase().trim();
  if (!isEmailValid_(correo)) return { ok: false, error: 'Correo inválido' };
  const usuario = buscarUsuario_(correo);
  if (!usuario) return { ok: true, encontrado: false, mensaje: 'Ese correo no aparece en las inscripciones. Verifica cómo lo escribiste o inscríbete.' };
  if (!puedeReenviar_(correo)) return { ok: false, error: 'Ya reenviamos tu QR varias veces hoy. Revisa spam/promociones o acude a la mesa de registro con tu nombre.' };
  try {
    enviarCorreoQR_(correo, usuario.nombre_completo, usuario.folio, usuario.qr_payload, { reenvio: true });
    marcarCorreoEnviado_(usuario.folio);
    return { ok: true, encontrado: true, enviado: true, mensaje: 'Listo: te reenviamos tu código QR. Si no aparece en unos minutos, revisa spam o promociones.' };
  } catch (err) {
    log_('reenviarQRPublico', usuario.folio, err.message, null);
    return { ok: false, error: 'No pudimos enviar el correo en este momento. Intenta más tarde o acude a la mesa de registro.' };
  }
}

/** Admin: reenvía el QR a una persona (por correo o por folio). Correr desde el editor. */
function reenviarQR(correoOFolio) {
  const q = String(correoOFolio || '').trim();
  if (!q) throw new Error('Pasa un correo o un folio: reenviarQR("nombre@dominio.com")');
  const usuario = q.indexOf('@') !== -1 ? buscarUsuario_(q.toLowerCase()) : buscarUsuarioPorFolio_(q.toUpperCase());
  if (!usuario) throw new Error('No encontrado: ' + q);
  enviarCorreoQR_(usuario.correo, usuario.nombre_completo, usuario.folio, usuario.qr_payload, { reenvio: true });
  marcarCorreoEnviado_(usuario.folio);
  Logger.log('Reenviado a ' + usuario.correo + ' (' + usuario.folio + ')');
  return usuario.folio;
}

/** Admin (NO envía nada): inscritos, correos marcados enviados/pendientes y cuota restante. */
function _reporteCorreos() {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const idxFlag = data[0].indexOf('correo_qr_enviado');
  const idxCorreo = data[0].indexOf('correo');
  let total = 0, enviados = 0, pendientes = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][idxCorreo]) continue;
    total++;
    if (esTrue_(data[i][idxFlag])) enviados++; else pendientes.push(data[i][idxCorreo]);
  }
  const cuota = MailApp.getRemainingDailyQuota();
  Logger.log('Inscritos: ' + total + ' · correo enviado: ' + enviados + ' · pendientes: ' + pendientes.length + ' · cuota de correo restante hoy: ' + cuota);
  if (pendientes.length) Logger.log('Pendientes: ' + pendientes.join(', '));
  return { total: total, enviados: enviados, pendientes: pendientes.length, cuota: cuota };
}

/** Admin: reenvía SOLO a quienes tienen correo_qr_enviado=false (alias explícito de reintentarCorreosQR). */
function _reenviarPendientes() {
  return reintentarCorreosQR();
}

/**
 * Admin: recordatorio con QR a TODOS los inscritos (usar la víspera del Foro).
 * Respeta la cuota diaria: se detiene si quedan < 20 correos y deja en _logs dónde se quedó.
 * Si son muchos inscritos y la ejecución llega al límite de 6 min, volver a correrla: los correos
 * ya reenviados no se distinguen en el Sheet, así que conviene anotar la fila en que se detuvo (_logs).
 */
function _reenviarATodos() {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const iF = h.indexOf('folio'), iC = h.indexOf('correo'), iN = h.indexOf('nombre_completo'), iQ = h.indexOf('qr_payload'), iFlag = h.indexOf('correo_qr_enviado');
  const inicio = Date.now();
  let enviados = 0, fallos = 0;
  for (let i = 1; i < data.length; i++) {
    const correo = String(data[i][iC] || '').trim();
    if (!correo || !isEmailValid_(correo)) continue;
    if (MailApp.getRemainingDailyQuota() < 20) {
      log_('_reenviarATodos', 'cuota_agotada', 'detenido en fila ' + (i + 1), null);
      Logger.log('CUOTA CASI AGOTADA: detenido en la fila ' + (i + 1) + '. Reanudar mañana desde ahí.');
      break;
    }
    if (Date.now() - inicio > 5.5 * 60 * 1000) {
      log_('_reenviarATodos', 'tiempo_agotado', 'detenido en fila ' + (i + 1), null);
      Logger.log('LÍMITE DE TIEMPO: detenido en la fila ' + (i + 1) + '. Volver a ejecutar para continuar.');
      break;
    }
    try {
      enviarCorreoQR_(correo, data[i][iN], data[i][iF], data[i][iQ], { reenvio: true });
      sheet.getRange(i + 1, iFlag + 1).setValue(true);
      enviados++;
      Utilities.sleep(300);
    } catch (err) {
      fallos++;
      log_('_reenviarATodos', data[i][iF], err.message, null);
    }
  }
  Logger.log('_reenviarATodos: ' + enviados + ' enviados, ' + fallos + ' fallos. Cuota restante: ' + MailApp.getRemainingDailyQuota());
  return { enviados: enviados, fallos: fallos };
}

// ============ MESA DE REGISTRO (staff) ============
function normalizar_(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** action 'buscar' (GET staff): q = nombre, correo o folio (mín. 3 caracteres). Máx. 8 resultados. */
function buscarAsistentes_(q) {
  const term = normalizar_(q);
  if (term.length < 3) return { ok: false, error: 'Escribe al menos 3 caracteres' };
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const iF = h.indexOf('folio'), iC = h.indexOf('correo'), iN = h.indexOf('nombre_completo'), iT = h.indexOf('tipo'),
        iI = h.indexOf('institucion'), iM = h.indexOf('modalidad'), iFlag = h.indexOf('correo_qr_enviado');
  const resultados = [];
  for (let i = 1; i < data.length && resultados.length < 8; i++) {
    const folio = String(data[i][iF] || '');
    if (!folio) continue;
    const pajar = normalizar_(data[i][iN]) + ' ' + normalizar_(data[i][iC]) + ' ' + normalizar_(folio);
    if (pajar.indexOf(term) === -1) continue;
    let hmac = '';
    try { hmac = calcularHMAC8_(folio); } catch (e) { /* sin secreto no hay check-in posible */ }
    resultados.push({
      folio: folio,
      hmac: hmac,
      nombre: data[i][iN],
      correo: data[i][iC],
      tipo: data[i][iT],
      institucion: data[i][iI],
      modalidad: data[i][iM],
      correo_qr_enviado: esTrue_(data[i][iFlag])
    });
  }
  return { ok: true, resultados: resultados };
}

/** action 'platicas' (GET staff): bloques de asistencia tal como están en la pestaña Platicas. */
function listarPlaticas_() {
  const sheet = SS.getSheetByName(SHEETS.platicas);
  if (!sheet) return { ok: false, error: 'Sin pestaña Platicas' };
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const iId = h.indexOf('id_platica'), iN = h.indexOf('nombre_sesion'), iS = h.indexOf('sede'), iJ = h.indexOf('jornada'),
        iIni = h.indexOf('hora_inicio'), iFin = h.indexOf('hora_fin'), iH = h.indexOf('horas_valor'), iCer = h.indexOf('cerrada'),
        iFor = h.indexOf('formato');
  const fmt = (d, p) => (d instanceof Date && !isNaN(d)) ? Utilities.formatDate(d, TZ, p) : String(d || '');
  const platicas = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][iId] === '' || data[i][iId] == null) continue;
    const ini = data[i][iIni], fin = data[i][iFin];
    const fila = rowToObject_(h, data[i]);
    platicas.push({
      id: data[i][iId],
      nombre: data[i][iN],
      sede: data[i][iS],
      jornada: data[i][iJ],
      fecha: fmt(ini, 'EEE d MMM'),
      inicio: fmt(ini, 'HH:mm'),
      fin: fmt(fin, 'HH:mm'),
      hora_inicio_iso: (ini instanceof Date) ? ini.toISOString() : String(ini || ''),
      hora_fin_iso: (fin instanceof Date) ? fin.toISOString() : String(fin || ''),
      horas_valor: data[i][iH],
      virtual: esPlaticaVirtual_(fila),
      cerrada: esTrue_(data[i][iCer])
    });
  }
  return { ok: true, platicas: platicas };
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============ CHECK-IN ============
function registrarCheckin(payload) {
  const folio = payload.folio;
  const hmac = payload.hmac;
  const id_platica = payload.id_platica;
  const staff_email = payload.staff_email || '';

  const validacion = validarQR(folio, hmac);
  if (!validacion.ok) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, validacion.error || 'hmac_invalido', 'qr_presencial');
    return { ok: false, error: validacion.error };
  }

  const platica = buscarPlatica_(id_platica);
  if (!platica) return { ok: false, error: 'Plática no encontrada' };
  // Interruptores de emergencia en _config (sin tocar código): antifraude_geo_activo / validar_ventana = FALSE
  const cfgCheckin = leerConfig_();
  const geoActivo = !esFalse_(cfgCheckin.antifraude_geo_activo);
  const ventanaActiva = !esFalse_(cfgCheckin.validar_ventana);
  if (platica.cerrada === true || platica.cerrada === 'TRUE') {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'platica_cerrada', 'qr_presencial');
    return { ok: false, error: 'Plática cerrada' };
  }

  if (yaCheckedIn_(folio, id_platica)) {
    return { ok: false, error: 'duplicado', ya_registrado: true };
  }

  if (geoActivo && haySimultaneoEnOtraSede_(folio, platica)) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'simultaneo_otra_sede', 'qr_presencial');
    return { ok: false, error: 'Check-in simultáneo en otra sede detectado' };
  }

  if (ventanaActiva && !estaEnVentana_(platica)) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'fuera_de_ventana', 'qr_presencial');
    return { ok: false, error: 'Fuera de ventana de check-in' };
  }

  registrarCheckinFila_(folio, id_platica, staff_email, true, '', 'qr_presencial');
  return {
    ok: true,
    nombre: validacion.nombre,
    institucion: validacion.institucion,
    horas_sumadas: platica.horas_valor
  };
}

function registrarCheckinFila_(folio, id_platica, staff, valido, motivo, fuente) {
  const sheet = SS.getSheetByName(SHEETS.checkins);
  // ID basado en UUID + timestamp epoch para evitar colisiones bajo concurrencia
  const id = Utilities.getUuid().substring(0, 8) + '-' + Date.now();
  sheet.appendRow([
    id,
    folio,
    id_platica,
    new Date(),
    staff || '',
    fuente || 'qr_presencial',
    !!valido,
    motivo || ''
  ]);
}

/**
 * Ventana de check-in de un bloque (decisión del director, 2026-09-14):
 *   - abre 60 min ANTES de la hora de inicio de la sede (la gente llega y se registra antes)
 *   - cierra 60 min DESPUÉS de la hora de fin de la sede (ej. CUCEA termina 14:10 → se escanea hasta 15:10),
 *     porque el público rota entre mesas y no todos entran al inicio.
 *   Ambos márgenes se ajustan en _config (tolerancia_inicio_min / tolerancia_fin_min) sin tocar código.
 *   - Los bloques VIRTUALES (sede = virtual o formato = virtual) NO tienen ventana: el escáner no se usa ahí
 *     y la asistencia se acredita desde en-vivo.html (Asistencia.gs → consolidarStream()).
 */
function estaEnVentana_(platica) {
  if (esPlaticaVirtual_(platica)) return true;
  const ahora = new Date();
  const config = leerConfig_();
  const inicio = new Date(platica.hora_inicio);
  const fin = new Date(platica.hora_fin);
  inicio.setMinutes(inicio.getMinutes() - (Number(config.tolerancia_inicio_min) || 60));
  fin.setMinutes(fin.getMinutes() + (Number(config.tolerancia_fin_min) || 60));
  return ahora >= inicio && ahora <= fin;
}

function esPlaticaVirtual_(platica) {
  return String(platica.sede || '').toLowerCase() === 'virtual' || String(platica.formato || '').toLowerCase() === 'virtual';
}

function yaCheckedIn_(folio, id_platica) {
  const sheet = SS.getSheetByName(SHEETS.checkins);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === folio && String(data[i][2]) === String(id_platica) && data[i][6] === true) return true;
  }
  return false;
}

/**
 * Anti-fraude geo-temporal: ¿este folio tiene un check-in válido en otra sede
 * cuya ventana se solapa con la plática que se intenta registrar ahora?
 */
function haySimultaneoEnOtraSede_(folio, platicaActual) {
  const sheetCi = SS.getSheetByName(SHEETS.checkins);
  const ciData = sheetCi.getDataRange().getValues();
  if (ciData.length < 2) return false;

  const sedeActual = String(platicaActual.sede || '').toLowerCase();
  const inicioA = new Date(platicaActual.hora_inicio).getTime();
  const finA = new Date(platicaActual.hora_fin).getTime();

  // Cargar mapa de plática → {sede, hora_inicio, hora_fin} una sola vez
  const platMap = construirMapaPlaticas_();

  for (let i = 1; i < ciData.length; i++) {
    const ciFolio = ciData[i][1];
    const ciIdPlatica = ciData[i][2];
    const ciValido = ciData[i][6];
    if (ciFolio !== folio || ciValido !== true) continue;

    const otra = platMap[String(ciIdPlatica)];
    if (!otra) continue;

    const sedeOtra = String(otra.sede || '').toLowerCase();
    if (sedeOtra === sedeActual) continue; // misma sede ≠ fraude geo-temporal

    const inicioB = new Date(otra.hora_inicio).getTime();
    const finB = new Date(otra.hora_fin).getTime();
    if (rangosSeSolapan_(inicioA, finA, inicioB, finB)) {
      return true;
    }
  }
  return false;
}

function rangosSeSolapan_(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function construirMapaPlaticas_() {
  const sheet = SS.getSheetByName(SHEETS.platicas);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('id_platica');
  const idxSede = headers.indexOf('sede');
  const idxIni = headers.indexOf('hora_inicio');
  const idxFin = headers.indexOf('hora_fin');
  const idxHoras = headers.indexOf('horas_valor');
  const idxNombre = headers.indexOf('nombre_sesion');
  const map = {};
  for (let i = 1; i < data.length; i++) {
    map[String(data[i][idxId])] = {
      id_platica: data[i][idxId],
      nombre_sesion: data[i][idxNombre],
      sede: data[i][idxSede],
      hora_inicio: data[i][idxIni],
      hora_fin: data[i][idxFin],
      horas_valor: data[i][idxHoras]
    };
  }
  return map;
}

// ============ ZOOM CSV (modo virtual) ============
/**
 * Procesa un Attendee Report CSV de Zoom Webinar para una plática.
 * Aplica regla: si presencia ≥ umbral_zoom_porcentaje (default 75%) → check-in válido.
 *
 * Uso desde el editor:
 *   const blob = DriveApp.getFileById('XXXXX').getBlob();
 *   procesarCSVZoom(7, blob);
 *
 * @param {number|string} idPlatica
 * @param {GoogleAppsScript.Base.Blob} csvBlob
 * @return {{procesados:number, validos:number, rechazados:number, sin_match:number}}
 */
function procesarCSVZoom(idPlatica, csvBlob) {
  const platica = buscarPlatica_(idPlatica);
  if (!platica) throw new Error('Plática no encontrada: ' + idPlatica);

  const config = leerConfig_();
  const umbral = (Number(config.umbral_zoom_porcentaje) || 75) / 100;

  // Duración total de la plática en minutos
  const inicio = new Date(platica.hora_inicio).getTime();
  const fin = new Date(platica.hora_fin).getTime();
  const duracionTotalMin = (fin - inicio) / 60000;
  if (duracionTotalMin <= 0) throw new Error('Duración inválida en plática ' + idPlatica);

  const csvText = csvBlob.getDataAsString();
  const rows = Utilities.parseCsv(csvText);
  if (!rows.length) return { procesados: 0, validos: 0, rechazados: 0, sin_match: 0 };

  // Encontrar columnas Email y Duration en el header (Zoom varía nombres ligeramente)
  const header = rows[0].map(h => String(h).toLowerCase().trim());
  let idxEmail = header.findIndex(h => h.indexOf('email') !== -1 || h.indexOf('correo') !== -1);
  let idxDuracion = header.findIndex(h => h.indexOf('duration') !== -1 || h.indexOf('duración') !== -1 || h.indexOf('tiempo') !== -1);
  if (idxEmail === -1 || idxDuracion === -1) {
    throw new Error('CSV no tiene columnas Email/Duration esperadas. Header recibido: ' + header.join(', '));
  }

  let validos = 0, rechazados = 0, sinMatch = 0;
  for (let i = 1; i < rows.length; i++) {
    const correo = String(rows[i][idxEmail] || '').toLowerCase().trim();
    if (!correo) continue;
    const duracionMin = parseFloat(String(rows[i][idxDuracion]).replace(/[^\d.]/g, '')) || 0;

    const usuario = buscarUsuario_(correo);
    if (!usuario) { sinMatch++; continue; }

    // No duplicar si ya hay check-in presencial válido de este folio en esta plática
    if (yaCheckedIn_(usuario.folio, idPlatica)) {
      continue;
    }

    const porcentaje = duracionMin / duracionTotalMin;
    if (porcentaje >= umbral) {
      registrarCheckinFila_(usuario.folio, idPlatica, 'zoom@cucea.udg.mx', true, '', 'zoom_csv');
      validos++;
    } else {
      registrarCheckinFila_(usuario.folio, idPlatica, 'zoom@cucea.udg.mx', false, 'porcentaje_insuficiente', 'zoom_csv');
      rechazados++;
    }
  }

  log_('procesarCSVZoom', 'platica_' + idPlatica, `validos=${validos} rechazados=${rechazados} sin_match=${sinMatch}`, null);
  return { procesados: rows.length - 1, validos: validos, rechazados: rechazados, sin_match: sinMatch };
}

// ============ HELPERS BÚSQUEDA ============
function buscarUsuario_(correo) {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxCorreo = headers.indexOf('correo');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxCorreo]).toLowerCase().trim() === correo) {
      return rowToObject_(headers, data[i]);
    }
  }
  return null;
}

function buscarUsuarioPorFolio_(folio) {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxFolio = headers.indexOf('folio');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxFolio]).toUpperCase().trim() === String(folio).toUpperCase().trim()) return rowToObject_(headers, data[i]);
  }
  return null;
}

function buscarPlatica_(id) {
  const sheet = SS.getSheetByName(SHEETS.platicas);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return rowToObject_(headers, data[i]);
  }
  return null;
}

function leerConfig_() {
  const sheet = SS.getSheetByName(SHEETS.config);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const cfg = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) cfg[data[i][0]] = data[i][1];
  }
  return cfg;
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

// ============ NEWSLETTER ============
function suscribirNewsletter(payload) {
  if (!payload.correo || !isEmailValid_(payload.correo)) {
    return { ok: false, error: 'Correo inválido' };
  }
  const sheet = SS.getSheetByName(SHEETS.newsletter) || SS.insertSheet(SHEETS.newsletter);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['correo', 'fecha', 'origen']);
  }
  // Idempotencia: no duplicar correos
  const data = sheet.getDataRange().getValues();
  const correo = String(payload.correo).toLowerCase().trim();
  const origen = origenLimpio_(payload.origen) || 'web_inscripcion';
  let resultado = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === correo) {
      resultado = { ok: true, ya_suscrito: true };
      break;
    }
  }
  if (!resultado) {
    sheet.appendRow([celdaSegura_(correo), new Date(), celdaSegura_(origen)]);
    resultado = { ok: true };
  }

  // Base de asistentes de la V (Drive personal del director). También para quien ya estaba suscrito:
  // vuelve a pedirlo expresamente, así que se registra el origen nuevo y la fecha de la confirmación.
  // Un fallo aquí (sin permiso, Sheet movido, lock ocupado) NUNCA rompe la suscripción: queda en _logs y
  // sembrarBaseV() lo recupera después, porque el correo ya está en la pestaña Newsletter.
  // Sin BASE_V_SHEET_ID no se hace nada más (ni siquiera se lee Usuarios).
  if (idBaseV_()) {
    try {
      const r = upsertBaseV_(registroSuscripcionBaseV_(correo, origen));
      if (r && r.error) log_('baseV', correo, r.error, null);
    } catch (err) {
      log_('baseV', correo, 'error: ' + err.message, null);
    }
  }
  return resultado;
}

// ============ CONSTANCIAS ============
/**
 * Cómputo final + emisión de constancias en PDF, en lotes de 50.
 * Ejecutar manualmente al cierre del evento, o via trigger time-driven.
 */
function procesarConstancias() {
  const config = leerConfig_();
  const META_VALOR = Number(config.meta_horas_valor_curricular) || 10;   // 10 h por decisión del director (2026-09-14)
  const META_BASE = Number(config.meta_horas_asistencia_minima) || 4;

  const usuariosSheet = SS.getSheetByName(SHEETS.usuarios);
  const checkinsSheet = SS.getSheetByName(SHEETS.checkins);
  const platicasSheet = SS.getSheetByName(SHEETS.platicas);

  // Mapa platica → horas_valor
  const horasPorPlatica = {};
  const platData = platicasSheet.getDataRange().getValues();
  const platHeaders = platData[0];
  const idxIdPlat = platHeaders.indexOf('id_platica');
  const idxHorasPlat = platHeaders.indexOf('horas_valor');
  for (let i = 1; i < platData.length; i++) {
    horasPorPlatica[String(platData[i][idxIdPlat])] = Number(platData[i][idxHorasPlat]) || 0;
  }

  // Sumar horas válidas por folio
  const horasPorFolio = {};
  const ciData = checkinsSheet.getDataRange().getValues();
  for (let i = 1; i < ciData.length; i++) {
    if (ciData[i][6] === true) {
      const folio = ciData[i][1];
      horasPorFolio[folio] = (horasPorFolio[folio] || 0) + (horasPorPlatica[String(ciData[i][2])] || 0);
    }
  }

  // Asignar nivel + persistir en Usuarios
  const userData = usuariosSheet.getDataRange().getValues();
  const headers = userData[0];
  const idxFolio = headers.indexOf('folio');
  const idxCorreo = headers.indexOf('correo');
  const idxNombre = headers.indexOf('nombre_completo');
  const idxTipo = headers.indexOf('tipo');
  const idxHoras = headers.indexOf('horas_acumuladas');
  const idxNivel = headers.indexOf('nivel_constancia');
  const idxFlagEnv = headers.indexOf('constancia_enviada');

  const lote = [];
  for (let i = 1; i < userData.length; i++) {
    const folio = userData[i][idxFolio];
    const tipo = userData[i][idxTipo];
    const horas = horasPorFolio[folio] || 0;

    let nivel = '';
    if (tipo === 'ponente') nivel = 'ponente';
    else if (horas >= META_VALOR) nivel = 'valor_curricular';
    else if (horas >= META_BASE) nivel = 'asistencia';
    else nivel = 'no_emite';

    usuariosSheet.getRange(i + 1, idxHoras + 1).setValue(horas);
    usuariosSheet.getRange(i + 1, idxNivel + 1).setValue(nivel);

    if (nivel !== 'no_emite' && userData[i][idxFlagEnv] !== true) {
      lote.push({
        rowIndex: i + 1,
        folio: folio,
        correo: userData[i][idxCorreo],
        nombre: userData[i][idxNombre],
        tipo: tipo,
        horas: horas,
        nivel: nivel
      });
    }
  }

  Logger.log(`procesarConstancias: ${lote.length} constancias por emitir.`);
  if (lote.length === 0) return { emitidas: 0 };

  // Emitir en lotes de 50 con sleep entre lotes
  let emitidas = 0;
  let fallidas = 0;
  for (let i = 0; i < lote.length; i += 50) {
    const sublote = lote.slice(i, i + 50);
    sublote.forEach(item => {
      try {
        const pdfBlob = generarPDFConstancia_(item);
        enviarConstancia_(item, pdfBlob);
        usuariosSheet.getRange(item.rowIndex, idxFlagEnv + 1).setValue(true);
        emitidas++;
      } catch (err) {
        fallidas++;
        log_('procesarConstancias', item.folio, err.message, null);
      }
    });
    if (i + 50 < lote.length) Utilities.sleep(2000);
  }
  Logger.log(`procesarConstancias: ${emitidas} emitidas, ${fallidas} fallidas.`);
  return { emitidas: emitidas, fallidas: fallidas };
}

/**
 * Genera el PDF de constancia copiando un Doc template y reemplazando placeholders.
 * Si CONSTANCIA_TEMPLATE_ID no está en Script Properties, autogenera un template default
 * la primera vez y guarda su ID.
 */
function generarPDFConstancia_(item) {
  let templateId = PROPS.getProperty('CONSTANCIA_TEMPLATE_ID');
  if (!templateId) {
    templateId = crearPlantillaConstancia_();
    PROPS.setProperty('CONSTANCIA_TEMPLATE_ID', templateId);
  }

  const copia = DriveApp.getFileById(templateId).makeCopy('Constancia ' + item.folio);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  const tituloNivel = ({
    valor_curricular: 'Constancia con valor curricular',
    asistencia: 'Constancia de asistencia',
    ponente: 'Constancia de ponente'
  })[item.nivel] || 'Constancia';

  const fechaTexto = Utilities.formatDate(new Date(), TZ, "d 'de' MMMM 'de' yyyy");

  body.replaceText('{{NOMBRE}}', item.nombre || '');
  body.replaceText('{{HORAS}}', String(item.horas || 0));
  body.replaceText('{{NIVEL}}', tituloNivel);
  body.replaceText('{{FOLIO}}', item.folio || '');
  body.replaceText('{{FECHA}}', fechaTexto);

  doc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(copia.getId()).getAs('application/pdf')
    .setName('Constancia-' + item.folio + '.pdf');

  // Borrar la copia Doc; nos quedamos con el PDF en memoria
  DriveApp.getFileById(copia.getId()).setTrashed(true);
  return pdfBlob;
}

function enviarConstancia_(item, pdfBlob) {
  const tituloNivel = ({
    valor_curricular: 'constancia con valor curricular',
    asistencia: 'constancia de asistencia',
    ponente: 'constancia de ponente'
  })[item.nivel] || 'constancia';

  enviarCorreo_({
    to: item.correo,
    subject: `Constancia · IV Foro Internacional de Derecho y Tecnología — Folio ${item.folio}`,
    htmlBody: `
      <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0E1B2C; line-height: 1.6;">
        <p>Hola, ${escapeHtml_(item.nombre)}.</p>
        <p>Adjuntamos tu <strong>${tituloNivel}</strong> del IV Foro Internacional de Derecho y Tecnología, con un total de <strong>${item.horas} horas efectivas</strong> acumuladas.</p>
        <p>Si encuentras algún error en tu nombre o cómputo de horas, escribe a <a href="mailto:contacto@forodyt.com">contacto@forodyt.com</a> con asunto «Constancia · ${item.folio}».</p>
        <p style="margin-top: 24px; font-style: italic; color: rgba(14, 27, 44, 0.6);">Gracias por tu participación.</p>
        <hr style="border: 0; border-top: 1px solid rgba(14, 27, 44, 0.14); margin: 24px 0;">
        <div style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(14, 27, 44, 0.5); font-family: 'Courier New', monospace;">
          CUCEA · Universidad de Guadalajara<br>
          Cuerpo Académico UDG-CA-1236 · Derecho y Tecnología
        </div>
      </div>
    `,
    attachments: [pdfBlob]
  });
}

/**
 * Crea un Google Doc default con el formato editorial del Foro y lo regresa como ID.
 * El doctor puede editarlo después en Drive sin tocar código (placeholders se conservan).
 */
function crearPlantillaConstancia_() {
  const doc = DocumentApp.create('IV-Foro-Constancia-Template');
  const body = doc.getBody();
  body.clear();

  const titulo = body.appendParagraph('IV FORO INTERNACIONAL DE DERECHO Y TECNOLOGÍA');
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  titulo.editAsText().setFontFamily('Times New Roman').setBold(true).setFontSize(14);

  const sub = body.appendParagraph('Cuarta Edición · 21 y 22 de septiembre de 2026');
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.editAsText().setFontFamily('Times New Roman').setItalic(true).setFontSize(11);

  body.appendParagraph('').setSpacingBefore(24);

  body.appendParagraph('La Universidad de Guadalajara, a través del Centro Universitario de Ciencias Económico Administrativas (CUCEA) y el Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología», otorga la presente:')
    .setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  body.appendParagraph('').setSpacingBefore(18);

  const tipoConstancia = body.appendParagraph('{{NIVEL}}');
  tipoConstancia.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  tipoConstancia.editAsText().setFontFamily('Times New Roman').setBold(true).setFontSize(18);

  body.appendParagraph('').setSpacingBefore(18);

  const aFavor = body.appendParagraph('a favor de:');
  aFavor.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  aFavor.editAsText().setFontFamily('Times New Roman').setItalic(true).setFontSize(11);

  body.appendParagraph('').setSpacingBefore(8);

  const nombre = body.appendParagraph('{{NOMBRE}}');
  nombre.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  nombre.editAsText().setFontFamily('Times New Roman').setBold(true).setFontSize(20);

  body.appendParagraph('').setSpacingBefore(24);

  const cuerpo = body.appendParagraph('Por su participación con un total de {{HORAS}} horas efectivas en las jornadas académicas del IV Foro Internacional de Derecho y Tecnología, celebrado en las sedes CUCEA, CUGDL y Ciudad Judicial del Estado de Jalisco.');
  cuerpo.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  cuerpo.editAsText().setFontFamily('Times New Roman').setFontSize(12);

  body.appendParagraph('').setSpacingBefore(48);

  const folioP = body.appendParagraph('Folio: {{FOLIO}}');
  folioP.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  folioP.editAsText().setFontFamily('Courier New').setFontSize(10);

  const fechaP = body.appendParagraph('Zapopan, Jalisco, {{FECHA}}.');
  fechaP.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  fechaP.editAsText().setFontFamily('Times New Roman').setItalic(true).setFontSize(11);

  body.appendParagraph('').setSpacingBefore(72);

  const firma = body.appendParagraph('________________________________________');
  firma.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const firmante = body.appendParagraph('Dr. Juan Emmanuel Delva Benavides');
  firmante.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  firmante.editAsText().setFontFamily('Times New Roman').setBold(true).setFontSize(12);

  const cargo = body.appendParagraph('Director del IV Foro Internacional de Derecho y Tecnología');
  cargo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  cargo.editAsText().setFontFamily('Times New Roman').setItalic(true).setFontSize(10);

  doc.saveAndClose();
  Logger.log('Plantilla de constancia creada. Doc ID: ' + doc.getId());
  Logger.log('Edita el doc en Drive si quieres cambiar formato; los placeholders {{NOMBRE}}, {{HORAS}}, {{NIVEL}}, {{FOLIO}}, {{FECHA}} se conservan.');
  return doc.getId();
}

// ============ AUDITORÍA ============
/**
 * Reporte de auditoría post-evento. Si la tasa de fraude detectada > 2%,
 * notifica al Director antes de emitir constancias.
 */
function auditoriaPostEvento() {
  const config = leerConfig_();
  const directorEmail = PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL');

  const ciSheet = SS.getSheetByName(SHEETS.checkins);
  const data = ciSheet.getDataRange().getValues();

  let total = 0;
  let validos = 0;
  let rechazados = 0;
  const motivos = {};
  const folioRechazos = {};
  const paresSimultaneos = [];

  for (let i = 1; i < data.length; i++) {
    total++;
    const folio = data[i][1];
    const idPlat = data[i][2];
    const valido = data[i][6];
    const motivo = data[i][7] || '';

    if (valido === true) {
      validos++;
    } else {
      rechazados++;
      motivos[motivo] = (motivos[motivo] || 0) + 1;
      folioRechazos[folio] = (folioRechazos[folio] || 0) + 1;
      if (motivo === 'simultaneo_otra_sede') {
        paresSimultaneos.push({ folio: folio, id_platica: idPlat, timestamp: data[i][3] });
      }
    }
  }

  const tasa = total === 0 ? 0 : (rechazados / total);
  const reporte = {
    total_checkins: total,
    validos: validos,
    rechazados: rechazados,
    tasa_rechazo: Math.round(tasa * 10000) / 100, // %
    rechazos_por_motivo: motivos,
    folios_con_rechazo: Object.keys(folioRechazos).length,
    pares_simultaneos: paresSimultaneos
  };

  Logger.log('AUDITORÍA POST-EVENTO:\n' + JSON.stringify(reporte, null, 2));

  if (tasa > 0.02) {
    // Notificar al Director — bloquea emisión hasta revisión humana
    try {
      MailApp.sendEmail({
        to: directorEmail,
        subject: '[IV Foro] ALERTA — Tasa de fraude > 2%, revisar antes de emitir constancias',
        htmlBody: `
          <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0E1B2C; line-height: 1.6;">
            <h3 style="color: #632A3D;">Alerta de auditoría post-evento</h3>
            <p>La auditoría detectó <strong>${reporte.tasa_rechazo}%</strong> de check-ins rechazados (${rechazados} de ${total}). El umbral aceptable es 2%.</p>
            <p><strong>Antes de ejecutar procesarConstancias()</strong>, revisa el detalle:</p>
            <pre style="background: #F5EFE0; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap;">${escapeHtml_(JSON.stringify(reporte, null, 2))}</pre>
          </div>
        `,
        name: 'IV Foro · Auditoría'
      });
    } catch (err) {
      Logger.log('No se pudo enviar correo de auditoría: ' + err.message);
    }
  }

  return reporte;
}

// ============ ADMIN / UTIL ============
/**
 * Cierra una plática para que ya no acepte check-ins.
 * Útil al final de cada sesión.
 */
function cerrarPlatica(idPlatica) {
  const sheet = SS.getSheetByName(SHEETS.platicas);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('id_platica');
  const idxCerrada = headers.indexOf('cerrada');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]) === String(idPlatica)) {
      sheet.getRange(i + 1, idxCerrada + 1).setValue(true);
      Logger.log('Plática ' + idPlatica + ' cerrada.');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Plática no encontrada' };
}

// ============ NEWSLETTER MASIVO ============
/**
 * Envía un correo HTML masivo a todos los suscritos en la pestaña Newsletter.
 *
 * Uso desde el editor de Apps Script:
 *   1. Ejecuta primero `_testNewsletter()` para ver cómo te llega a ti.
 *   2. Si te gusta, ejecuta `enviarNewsletterMasivo("Asunto", "<p>Cuerpo HTML</p>")`
 *      pasando el asunto y el cuerpo directamente.
 *
 *   Para asuntos/cuerpos largos, mejor edita esta función agregando una
 *   variante con tu contenido pre-armado, o usa _enviarNewsletterDemo().
 *
 * Características:
 *   - Lotes de 50 destinatarios con sleep de 2 segundos entre lotes
 *     (evita saturar la cuota de Gmail)
 *   - Aplica el header editorial del Foro automáticamente
 *   - Incluye footer con dirección física y enlace de "darse de baja"
 *     (responder al correo solicitando baja — manualmente)
 *   - Registra en _logs cada lote enviado para auditoría
 *
 * Cuotas relevantes (cuenta Workspace UDG):
 *   - 1500 correos/día → puedes mandar a una lista de hasta 1500 personas
 *     en un solo envío. Si tienes más, el script avisa y se detiene.
 */
function enviarNewsletterMasivo(asunto, htmlBody) {
  if (!asunto || !htmlBody) {
    throw new Error('Faltan parámetros: enviarNewsletterMasivo(asunto, htmlBody)');
  }

  const sheet = SS.getSheetByName(SHEETS.newsletter);
  if (!sheet) {
    throw new Error('No existe la pestaña Newsletter en el Sheet.');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('Newsletter vacío. Nada que enviar.');
    return { enviados: 0, fallos: 0 };
  }

  // Extraer correos (saltando header)
  const correos = [];
  for (let i = 1; i < data.length; i++) {
    const c = String(data[i][0] || '').toLowerCase().trim();
    if (c && isEmailValid_(c)) correos.push(c);
  }

  Logger.log('Newsletter: ' + correos.length + ' destinatarios.');

  // Verificar cuota antes de empezar
  const quota = MailApp.getRemainingDailyQuota();
  if (quota < correos.length + 5) {
    throw new Error('Cuota insuficiente. Necesarios: ' + correos.length + ', disponibles: ' + quota + '. Espera 24h o reduce la lista.');
  }

  const senderName = PROPS.getProperty('SENDER_NAME') || 'IV Foro Internacional de Derecho y Tecnología';
  const senderEmail = PROPS.getProperty('SENDER_EMAIL') || 'emmanueldelva@cucea.udg.mx';

  // Plantilla con header/footer editorial
  const htmlCompleto = construirHtmlNewsletter_(htmlBody);

  let enviados = 0;
  let fallos = 0;
  const tamanoLote = 50;

  for (let i = 0; i < correos.length; i += tamanoLote) {
    const lote = correos.slice(i, i + tamanoLote);
    lote.forEach(correo => {
      try {
        MailApp.sendEmail({
          to: correo,
          subject: asunto,
          htmlBody: htmlCompleto,
          name: senderName,
          replyTo: senderEmail
        });
        enviados++;
      } catch (err) {
        fallos++;
        log_('newsletter', correo, err.message, null);
      }
    });
    log_('newsletterLote', 'lote_' + (i / tamanoLote + 1), 'enviados=' + lote.length, null);
    if (i + tamanoLote < correos.length) Utilities.sleep(2000);
  }

  Logger.log('Newsletter completado: ' + enviados + ' enviados, ' + fallos + ' fallos.');
  return { enviados: enviados, fallos: fallos, total: correos.length };
}

/**
 * Envuelve el HTML del cuerpo en un layout editorial coherente con la marca.
 * Aplica colores, tipografía y estructura del Foro.
 */
function construirHtmlNewsletter_(cuerpoHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #F5EFE0; margin: 0; padding: 0; color: #0E1B2C; }
  .container { max-width: 580px; margin: 0 auto; background: #FFFEFA; }
  .header { background: #0E1B2C; padding: 28px 36px; border-bottom: 4px solid #B8923E; }
  .header h1 { color: #F5EFE0; font-size: 19px; font-weight: 300; margin: 0 0 4px 0; letter-spacing: -0.01em; }
  .header .meta { color: rgba(245, 239, 224, 0.7); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-family: 'Courier New', monospace; }
  .body { padding: 36px; font-size: 15px; line-height: 1.6; color: rgba(14, 27, 44, 0.85); }
  .body p { margin: 0 0 16px 0; }
  .body h2 { font-family: Georgia, serif; font-size: 24px; color: #0E1B2C; margin: 0 0 16px 0; font-weight: 400; }
  .body h3 { font-family: Georgia, serif; font-size: 18px; color: #0E1B2C; margin: 24px 0 12px 0; font-weight: 500; }
  .body a { color: #B8923E; text-decoration: underline; }
  .body strong { color: #0E1B2C; font-weight: 500; }
  .footer { background: #F1EAD7; padding: 24px 36px; }
  .footer p { font-size: 11px; line-height: 1.5; letter-spacing: 0.06em; color: rgba(14, 27, 44, 0.55); margin: 4px 0; font-family: 'Courier New', monospace; }
  .footer a { color: rgba(14, 27, 44, 0.7); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>IV Foro Internacional de Derecho y Tecnología</h1>
    <div class="meta">21 y 22 sep · 2026 · CUCEA-UDG</div>
  </div>
  <div class="body">
    ${cuerpoHtml}
  </div>
  <div class="footer">
    <p>Recibes este correo porque te suscribiste para recibir actualizaciones del IV Foro Internacional de Derecho y Tecnología.</p>
    <p>CUCEA · Universidad de Guadalajara · Cuerpo Académico UDG-CA-1236</p>
    <p>Para darte de baja, responde a este correo con asunto «Baja newsletter» y removeremos tu correo manualmente en menos de 48 horas.</p>
  </div>
</div>
</body>
</html>
  `;
}

/**
 * Envía un correo de prueba SOLO al Director (DIRECTOR_EMAIL o SENDER_EMAIL).
 * Útil para previsualizar cómo se ve el correo antes de mandarlo a toda la lista.
 *
 * Edita las dos constantes de abajo para tu campaña actual y ejecuta.
 */
function _testNewsletter() {
  const ASUNTO = 'IV Foro · Apertura oficial de inscripciones';

  const HTML_BODY = `
    <h2>Las inscripciones del IV Foro están abiertas.</h2>
    <p>Estimadas y estimados:</p>
    <p>Es un gusto comunicarles que las inscripciones para la cuarta edición del Foro Internacional de Derecho y Tecnología están <strong>oficialmente abiertas</strong>. El evento se desarrollará los días <strong>21 y 22 de septiembre de 2026</strong> en CUCEA, CUGDL y la Ciudad Judicial del Estado de Jalisco.</p>
    <h3>Cómo inscribirse</h3>
    <p>Visita <a href="https://forodyt.vercel.app/inscripcion.html">forodyt.vercel.app/inscripcion.html</a> y completa el formulario en menos de dos minutos. Recibirás un código QR único que servirá como tu credencial digital durante el evento.</p>
    <h3>Constancia con valor curricular</h3>
    <p>Quienes acumulen <strong>20 horas efectivas</strong> de participación recibirán constancia con valor curricular emitida por la Universidad de Guadalajara.</p>
    <p>Cualquier duda, escribe a <a href="mailto:emmanueldelva@cucea.udg.mx">emmanueldelva@cucea.udg.mx</a>.</p>
    <p style="margin-top: 28px;">Te esperamos.</p>
  `;

  const destinatario = PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL');
  const senderName = PROPS.getProperty('SENDER_NAME') || 'IV Foro DDT';
  const html = construirHtmlNewsletter_(HTML_BODY);

  MailApp.sendEmail({
    to: destinatario,
    subject: '[PRUEBA] ' + ASUNTO,
    htmlBody: html,
    name: senderName,
    replyTo: PROPS.getProperty('SENDER_EMAIL')
  });

  Logger.log('Correo de prueba enviado a: ' + destinatario);
  Logger.log('Si se ve bien, ejecuta enviarNewsletterMasivo() con los mismos parámetros.');
  return { ok: true, destinatario: destinatario };
}

// ============ BASE DE ASISTENTES DE LA V (Drive personal) ============
/**
 * Base de asistentes y avisos de la V edición (2027). Vive en el Drive PERSONAL del director, no en el Sheet
 * institucional: se abre por id (Script Property BASE_V_SHEET_ID). Una fila por correo, con estas columnas:
 *
 *   correo · nombre · institucion · pais · tipo · grado · modalidad_iv · folio_iv · acepta_comunicaciones ·
 *   origen · fecha_alta · fecha_actualizacion · notas
 *
 * Reglas de fusión (fusionarBaseV_), iguales para un alta suelta y para la siembra:
 *   - correo (minúsculas, sin espacios) es la llave: nunca se duplica.
 *   - Los datos (nombre, institución, país…) solo rellenan celdas vacías: no pisan lo que el director corrija a mano.
 *     A una fila dada de baja no se le añade ningún dato: se queda con el correo y la marca.
 *   - origen acumula los orígenes distintos separados por « + » (p. ej. «IV-2026 inscripción + web_v2027»).
 *   - fecha_alta no cambia nunca. fecha_actualizacion se pone cuando algo cambia o cuando la persona vuelve a pedir
 *     los avisos, así queda la fecha de su último consentimiento expreso.
 *   - acepta_comunicaciones: ver PRIVACIDAD en la cabecera del archivo. Las marcas [BAJA fecha] y [RE-ALTA fecha]
 *     de la columna notas dicen si la fila está dada de baja (manda la última que aparezca; [BAJA] sin fecha
 *     también vale). Poner FALSE a mano SIN esa marca no es una baja: la siguiente siembra la vuelve a TRUE si la
 *     persona sigue con acepto_news o en la lista Newsletter. Para dar de baja, bajaBaseV('correo').
 *   - Las columnas que el director añada a mano se respetan: el script solo escribe las celdas que cambia.
 */
const BASE_V_COLS = ['correo', 'nombre', 'institucion', 'pais', 'tipo', 'grado', 'modalidad_iv', 'folio_iv',
  'acepta_comunicaciones', 'origen', 'fecha_alta', 'fecha_actualizacion', 'notas'];
const BASE_V_DATOS = ['nombre', 'institucion', 'pais', 'tipo', 'grado', 'modalidad_iv', 'folio_iv'];
const BASE_V_ORIGEN_IV = 'IV-2026 inscripción';
const BASE_V_SEP = ' + ';
const BASE_V_AVISOS = 'Avisos';               // pestaña del Sheet personal donde enviarAvisoBaseV() anota cada envío
const BASE_V_LOTE = 250;                      // filas nuevas por volcado en sembrarBaseV()
const BASE_V_MAX_MS = 4.5 * 60 * 1000;        // margen frente al límite de 6 min por ejecución de Apps Script
const BASE_V_NOMBRE_REMITENTE = 'Foro Internacional de Derecho y Tecnología';
const BASE_V_ESPERA_WEB_MS = 5000;            // cuánto espera un «Avísame» (app web) a que se libere el candado
const BASE_V_ENVIO_PROP = 'BASE_V_AVISO_EN_CURSO';   // bandera de enviarAvisoBaseV() (Script Property temporal)
const BASE_V_ENVIO_TTL_MS = 7 * 60 * 1000;    // una bandera más vieja que esto es de una ejecución que murió

function idBaseV_() { return String(PROPS.getProperty('BASE_V_SHEET_ID') || '').trim(); }

/**
 * Candado de la base: SIEMPRE el de script, el mismo en la app web, en el editor y en los disparadores.
 * (getDocumentLock() no sirve: devuelve null en la app web y otro candado distinto en el editor, así que la
 * siembra y los «Avísame» no se excluirían entre sí.)
 * Se retiene solo segundos: una fusión suelta o una siembra, que trabaja en memoria. enviarAvisoBaseV() NO lo
 * retiene durante el envío (usa una bandera). enviarCierre() (Cierre.gs) sí lo retiene en cada tanda (hasta
 * 4 min): un «Avísame» que llegue entonces queda en la pestaña Newsletter y en _logs (baseV · base_v_ocupada),
 * y la siguiente sembrarBaseV() lo recupera.
 */
function lockBaseV_() { return LockService.getScriptLock(); }

/**
 * Un texto que empieza por = + - @ se guardaría como FÓRMULA. El origen y el correo llegan de un formulario
 * público: con el apóstrofo inicial Sheets lo guarda como texto (y no lo muestra).
 */
function celdaSegura_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }

function origenLimpio_(o) {
  return String(o == null ? '' : o).replace(/[\u0000-\u001f]/g, ' ').replace(/\s*\+\s*/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** ¿La fila está dada de baja? Manda la última marca [BAJA …] / [RE-ALTA …] de notas. ([PIDE RE-ALTA …] no cuenta.) */
function enBajaBaseV_(notas) {
  const marcas = String(notas || '').toUpperCase().match(/\[(BAJA|RE-ALTA)\b/g);
  return !!marcas && marcas[marcas.length - 1] === '[BAJA';
}

/**
 * Abre la base: {ss, sh, i: índice de cada columna (0-based), n: nº de columnas}, o null si no hay BASE_V_SHEET_ID.
 * Si falta algún encabezado de BASE_V_COLS lo añade al final (no reordena ni borra nada).
 */
function baseV_() {
  const id = idBaseV_();
  if (!id) return null;
  const ss = SpreadsheetApp.openById(id);
  const pestana = String(PROPS.getProperty('BASE_V_HOJA') || '').trim();
  const sh = (pestana && ss.getSheetByName(pestana)) || ss.getSheets().filter(s => s.getName() !== BASE_V_AVISOS)[0];
  const ancho = Math.max(sh.getLastColumn(), 1);
  let h = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, ancho).getValues()[0].map(x => String(x).trim()) : [];
  while (h.length && !h[h.length - 1]) h.pop();
  const faltan = BASE_V_COLS.filter(c => h.indexOf(c) === -1);
  if (faltan.length) {
    const hasta = h.length + faltan.length;
    if (sh.getMaxColumns() < hasta) sh.insertColumnsAfter(sh.getMaxColumns(), hasta - sh.getMaxColumns());
    sh.getRange(1, h.length + 1, 1, faltan.length).setValues([faltan]);
    h = h.concat(faltan);
    if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);
  }
  const i = {};
  BASE_V_COLS.forEach(c => { i[c] = h.indexOf(c); });
  return { ss: ss, sh: sh, i: i, n: h.length };
}

function asegurarFilasBaseV_(sh, ultimaFila) {
  if (sh.getMaxRows() < ultimaFila) sh.insertRowsAfter(sh.getMaxRows(), ultimaFila - sh.getMaxRows());
}

/**
 * Normaliza un registro de entrada. Campos: correo (obligatorio), nombre, institucion, pais, tipo, grado,
 * modalidad_iv, folio_iv, acepta (bool), expreso (bool: la persona lo acaba de pedir en un formulario),
 * baja (bool: baja explícita), origen, fecha (fecha original del dato; solo para fecha_alta de filas nuevas).
 */
function registroBaseV_(o) {
  const correo = String((o && o.correo) || '').toLowerCase().trim();
  if (!correo || correo.length > 254 || !isEmailValid_(correo)) return null;
  const r = { correo: correo, acepta: !!o.acepta, expreso: !!o.expreso, baja: !!o.baja, origen: origenLimpio_(o.origen), fecha: o.fecha };
  BASE_V_DATOS.forEach(c => { r[c] = o[c] == null ? '' : String(o[c]).trim().slice(0, 200); });
  return r;
}

/** Datos de una fila de Usuarios (Sheet institucional de la IV) con los nombres de columna de la base. */
function datosUsuarioBaseV_(u) {
  return {
    nombre: u.nombre_completo, institucion: u.institucion, pais: u.pais, tipo: u.tipo,
    grado: u.grado, modalidad_iv: u.modalidad, folio_iv: u.folio
  };
}

/** Registro de una suscripción pública («Avísame»). Si el correo también se inscribió a la IV, trae sus datos. */
function registroSuscripcionBaseV_(correo, origen) {
  const r = { correo: correo, acepta: true, expreso: true, origen: origen };
  try {
    const u = buscarUsuario_(String(correo).toLowerCase().trim());
    if (u) Object.assign(r, datosUsuarioBaseV_(u));
  } catch (err) { /* sin Usuarios no hay datos que añadir: se da de alta solo el correo */ }
  return r;
}

/**
 * Fusiona un registro con la fila actual (array, o null si el correo es nuevo). No escribe nada.
 * Devuelve {fila, cambio, cols: índices de las columnas que cambiaron, nueva, acepta}.
 */
function fusionarBaseV_(actual, r, ahora, I, n) {
  const nueva = !actual;
  const f = nueva ? new Array(n).fill('') : actual.slice();
  const cols = [];
  const poner = (nombre, v) => {
    const c = I[nombre];
    if (c < 0) return;
    f[c] = v;
    if (cols.indexOf(c) === -1) cols.push(c);
  };
  const vacia = v => v == null || String(v).trim() === '';

  if (nueva) {
    poner('correo', r.correo);
    const esFecha = Object.prototype.toString.call(r.fecha) === '[object Date]' && !isNaN(r.fecha.getTime());
    poner('fecha_alta', esFecha ? r.fecha : ahora);
  }
  // A una fila dada de baja no se le añaden datos personales: se queda solo con el correo y la marca.
  const deBaja = r.baja || enBajaBaseV_(f[I.notas]);
  BASE_V_DATOS.forEach(c => {
    const v = r[c] == null ? '' : String(r[c]).trim();
    if (v && !deBaja && vacia(f[I[c]])) poner(c, v);
  });
  if (r.origen) {
    const lista = String(f[I.origen] || '').split('+').map(s => s.trim()).filter(Boolean);
    if (lista.indexOf(r.origen) === -1) { lista.push(r.origen); poner('origen', lista.join(BASE_V_SEP)); }
  }

  // Consentimiento
  const hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd');
  const notas = String(f[I.notas] || '').trim();
  const anotar = t => poner('notas', (String(f[I.notas] || '').trim() ? String(f[I.notas]).trim() + ' ' : '') + t);
  const antes = esTrue_(f[I.acepta_comunicaciones]);
  const enBaja = enBajaBaseV_(notas);
  let acepta = antes;
  if (r.baja) {
    acepta = false;
    if (!enBaja) anotar('[BAJA ' + hoy + ']');
  } else if (r.acepta && !antes) {
    if (!enBaja) {
      acepta = true;
    } else if (r.expreso && notas.toUpperCase().indexOf('[PIDE RE-ALTA ' + hoy) === -1) {
      // Una baja no la revierte un formulario público (cualquiera puede escribir un correo ajeno): solo se anota.
      anotar('[PIDE RE-ALTA ' + hoy + (r.origen ? ' · ' + r.origen : '') + ']');
    }
  }
  if (nueva || acepta !== antes || typeof f[I.acepta_comunicaciones] !== 'boolean') poner('acepta_comunicaciones', acepta);

  if (cols.length || r.expreso) poner('fecha_actualizacion', ahora);
  return { fila: f, cambio: cols.length > 0, cols: cols, nueva: nueva, acepta: acepta };
}

/**
 * Inserta o actualiza UNA persona en la base (por correo). Devuelve {ok, accion: alta|actualizado|sin_cambios}
 * o {ok:false, omitido|error}. Sin BASE_V_SHEET_ID no hace nada.
 */
function upsertBaseV_(registro) {
  const r = registroBaseV_(registro || {});
  if (!r) return { ok: false, error: 'correo_invalido' };
  if (!idBaseV_()) return { ok: false, omitido: 'sin_BASE_V_SHEET_ID' };
  const lock = lockBaseV_();
  if (!lock.tryLock(BASE_V_ESPERA_WEB_MS)) return { ok: false, error: 'base_v_ocupada' };
  try {
    const base = baseV_();
    const sh = base.sh, I = base.i, n = base.n;
    const ult = sh.getLastRow();
    let fila = -1;
    if (ult > 1) {
      const col = sh.getRange(2, I.correo + 1, ult - 1, 1).getValues();
      for (let k = 0; k < col.length; k++) {
        if (String(col[k][0]).toLowerCase().trim() === r.correo) { fila = k + 2; break; }
      }
    }
    const actual = fila > 0 ? sh.getRange(fila, 1, 1, n).getValues()[0] : null;
    const res = fusionarBaseV_(actual, r, new Date(), I, n);
    if (!res.cambio) return { ok: true, accion: 'sin_cambios', acepta: res.acepta };
    if (fila > 0) {
      res.cols.forEach(c => sh.getRange(fila, c + 1).setValue(celdaSegura_(res.fila[c])));
    } else {
      sh.appendRow(res.fila.map(celdaSegura_));
    }
    SpreadsheetApp.flush();
    return { ok: true, accion: fila > 0 ? 'actualizado' : 'alta', acepta: res.acepta };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Todo lo que se siembra desde el Sheet institucional: inscritos de la IV (Usuarios) con consentimiento y la lista
 * Newsletter. Un inscrito SIN acepto_news solo entra si también está en la lista Newsletter (ahí sí pidió los
 * avisos) o si BASE_V_INCLUIR_HISTORICO = TRUE (ver PRIVACIDAD en la cabecera).
 */
function fuentesSiembraBaseV_() {
  const excluir = {};
  [PROPS.getProperty('BASE_V_EXCLUIR'), PROPS.getProperty('CIERRE_EXCLUIR')].forEach(p =>
    String(p || '').split(',').map(s => s.toLowerCase().trim()).filter(Boolean).forEach(s => { excluir[s] = true; }));
  const historico = esTrue_(PROPS.getProperty('BASE_V_INCLUIR_HISTORICO'));
  const registros = [];
  const cuenta = { usuarios: 0, newsletter: 0, excluidos: 0, invalidos: 0, sin_consentimiento_omitidos: 0, incluye_historico: historico };

  // Primero la lista Newsletter: quien está en ella pidió los avisos aunque no marcara la casilla al inscribirse.
  const shN = SS.getSheetByName(SHEETS.newsletter);
  const deNewsletter = [], enNewsletter = {};
  if (shN && shN.getLastRow() > 1) {
    const d = shN.getDataRange().getValues();
    const h = d[0].map(x => String(x).trim().toLowerCase());
    const iC = h.indexOf('correo') !== -1 ? h.indexOf('correo') : 0;
    const iF = h.indexOf('fecha'), iO = h.indexOf('origen');
    for (let k = 1; k < d.length; k++) {
      const correo = String(d[k][iC] || '').toLowerCase().trim();
      if (!correo) continue;
      if (!isEmailValid_(correo)) { cuenta.invalidos++; continue; }
      if (excluir[correo]) { cuenta.excluidos++; continue; }
      enNewsletter[correo] = true;
      deNewsletter.push({
        correo: correo,
        acepta: true,                          // se suscribió ella misma
        origen: (iO !== -1 && String(d[k][iO] || '').trim()) || 'newsletter',
        fecha: iF !== -1 ? d[k][iF] : ''
      });
      cuenta.newsletter++;
    }
  }

  const shU = SS.getSheetByName(SHEETS.usuarios);
  if (shU && shU.getLastRow() > 1) {
    const d = shU.getDataRange().getValues();
    const h = d[0].map(x => String(x).trim());
    if (h.indexOf('correo') === -1 || h.indexOf('acepto_news') === -1) {
      throw new Error('La pestaña Usuarios no tiene las columnas «correo» y «acepto_news»: no se siembra nada.');
    }
    for (let k = 1; k < d.length; k++) {
      const u = rowToObject_(h, d[k]);
      const correo = String(u.correo || '').toLowerCase().trim();
      if (!correo) continue;
      if (!isEmailValid_(correo)) { cuenta.invalidos++; continue; }
      if (excluir[correo] || excluir[String(u.folio || '').toLowerCase().trim()]) { cuenta.excluidos++; continue; }
      const acepta = esTrue_(u.acepto_news);  // la casilla opcional de la IV = consentimiento para futuras ediciones
      if (!acepta && !enNewsletter[correo] && !historico) { cuenta.sin_consentimiento_omitidos++; continue; }
      registros.push(Object.assign(datosUsuarioBaseV_(u), {
        correo: correo,
        acepta: acepta,
        origen: BASE_V_ORIGEN_IV,
        fecha: u.fecha_registro || u.fecha
      }));
      cuenta.usuarios++;
    }
  }
  // Los de Newsletter van después: si la misma persona también se inscribió, su fila ya trae los datos de la IV
  // y la suscripción le suma el origen y el TRUE.
  return { registros: registros.concat(deNewsletter), cuenta: cuenta };
}

/**
 * sembrarBaseV() — correr desde el editor. Copia a la base de la V:
 *   · los inscritos de la IV (Usuarios) que marcaron acepto_news: acepta_comunicaciones = TRUE, origen
 *     «IV-2026 inscripción», nombre, institución, país, tipo, grado, modalidad_iv y folio_iv;
 *   · todos los correos de la lista Newsletter: acepta_comunicaciones = TRUE, origen el suyo;
 *   · a los inscritos SIN consentimiento solo si BASE_V_INCLUIR_HISTORICO = TRUE (con FALSE; ver PRIVACIDAD).
 * Idempotente: una segunda corrida no duplica ni reescribe nada que no haya cambiado. Si se acerca al límite de
 * 6 min, se detiene limpia y basta con volver a ejecutarla. Devuelve los conteos.
 * Retiene el candado de script mientras escribe (unos segundos): no correrla mientras enviarCierre() (Cierre.gs)
 * tenga tandas pendientes, porque una tanda que no consigue el candado en 10 s se descarta sin reprogramarse.
 */
function sembrarBaseV() {
  if (!idBaseV_()) throw new Error('Falta la Script Property BASE_V_SHEET_ID (ver RUNBOOK-evento.md §8).');
  const inicio = Date.now();
  const fuentes = fuentesSiembraBaseV_();        // se lee el Sheet institucional antes de tomar el candado
  const lock = lockBaseV_();
  if (!lock.tryLock(30000)) throw new Error('La base de la V está ocupada (otra siembra, un alta o una tanda de enviarCierre en curso). Vuelve a intentarlo en unos minutos.');
  try {
    const base = baseV_();
    const sh = base.sh, I = base.i, n = base.n;
    const ult = sh.getLastRow();
    const valores = ult > 1 ? sh.getRange(2, 1, ult - 1, n).getValues() : [];
    const inicial = valores.length;
    const pos = {};
    valores.forEach((f, k) => { const c = String(f[I.correo] || '').toLowerCase().trim(); if (c && !(c in pos)) pos[c] = k; });

    const ahora = new Date();
    const tocadas = {};
    let enHoja = inicial;                         // valores[0 .. enHoja-1] ya están escritos en la hoja
    let sinCambios = 0, procesados = 0, completo = true;
    // Con el candado ningún proceso del script escribe en la base, pero el director sí puede editarla a mano
    // mientras corre. Si la hoja ya no termina donde se leyó, se detiene ANTES de escribir en una fila equivocada.
    const comprobarBase = () => {
      if (sh.getLastRow() !== enHoja + 1) {
        throw new Error('La base cambió mientras se sembraba (se añadió o se borró una fila). Lo ya escrito es correcto: vuelve a ejecutar sembrarBaseV().');
      }
    };
    const volcar = () => {                        // escribe de un golpe las filas nuevas pendientes
      if (valores.length === enHoja) return;
      comprobarBase();
      const bloque = valores.slice(enHoja).map(f => f.map(celdaSegura_));
      asegurarFilasBaseV_(sh, enHoja + 1 + bloque.length);
      sh.getRange(enHoja + 2, 1, bloque.length, n).setValues(bloque);
      enHoja = valores.length;
    };

    for (let j = 0; j < fuentes.registros.length; j++) {
      if (valores.length - enHoja >= BASE_V_LOTE) volcar();
      if (Date.now() - inicio > BASE_V_MAX_MS) { completo = false; break; }
      procesados++;
      const r = registroBaseV_(fuentes.registros[j]);
      if (!r) continue;
      const k = pos[r.correo];
      const res = fusionarBaseV_(k === undefined ? null : valores[k], r, ahora, I, n);
      if (!res.cambio) { sinCambios++; continue; }
      if (k === undefined) {
        valores.push(res.fila);
        pos[r.correo] = valores.length - 1;
        continue;
      }
      valores[k] = res.fila;
      if (k < enHoja) {
        comprobarBase();
        res.cols.forEach(c => sh.getRange(k + 2, c + 1).setValue(celdaSegura_(res.fila[c])));
      }
      if (k < inicial) tocadas[k] = true;
    }
    volcar();
    SpreadsheetApp.flush();

    const resultado = {
      completo: completo,
      registros_leidos: fuentes.registros.length,
      procesados: procesados,
      de_usuarios_iv: fuentes.cuenta.usuarios,
      de_newsletter: fuentes.cuenta.newsletter,
      sin_consentimiento_omitidos: fuentes.cuenta.sin_consentimiento_omitidos,
      incluye_historico: fuentes.cuenta.incluye_historico,
      excluidos: fuentes.cuenta.excluidos,
      correos_invalidos: fuentes.cuenta.invalidos,
      altas: valores.length - inicial,
      actualizados: Object.keys(tocadas).length,
      registros_sin_cambios: sinCambios,
      filas_en_base: valores.length,
      segundos: Math.round((Date.now() - inicio) / 1000)
    };
    Logger.log('sembrarBaseV: ' + JSON.stringify(resultado, null, 2));
    if (!completo) Logger.log('Se detuvo por tiempo: vuelve a ejecutar sembrarBaseV(). Lo ya copiado no se repite.');
    if (resultado.sin_consentimiento_omitidos) {
      Logger.log(resultado.sin_consentimiento_omitidos + ' inscritos de la IV no marcaron la casilla de comunicaciones: ' +
        'NO se copiaron (se quedan solo en el Sheet institucional). Ver PRIVACIDAD en la cabecera de Code.gs.');
    }
    log_('sembrarBaseV', completo ? 'completo' : 'parcial', 'altas=' + resultado.altas + ' actualizados=' + resultado.actualizados, null);
    return resultado;
  } finally {
    lock.releaseLock();
  }
}

/** _reporteBaseV() — NO envía nada. Total, con consentimiento, sin él (histórico), bajas y conteos por origen. */
function _reporteBaseV() {
  const base = baseV_();
  if (!base) throw new Error('Falta la Script Property BASE_V_SHEET_ID (ver RUNBOOK-evento.md §8).');
  const I = base.i, ult = base.sh.getLastRow();
  const v = ult > 1 ? base.sh.getRange(2, 1, ult - 1, base.n).getValues() : [];
  const rep = {
    total: 0, con_consentimiento: 0, sin_consentimiento_historico: 0, bajas: 0, piden_re_alta: 0,
    por_origen: {}, con_consentimiento_por_origen: {}, por_modalidad_iv: {}, duplicados: [],
    pestana: base.sh.getName(), url: base.ss.getUrl()
  };
  const vistos = {};
  v.forEach(f => {
    const correo = String(f[I.correo] || '').toLowerCase().trim();
    if (!correo) return;
    rep.total++;
    if (vistos[correo]) rep.duplicados.push(correo);
    vistos[correo] = true;
    const ok = esTrue_(f[I.acepta_comunicaciones]);
    const notas = String(f[I.notas] || '').toUpperCase();
    if (ok) rep.con_consentimiento++;
    else if (enBajaBaseV_(notas)) {
      rep.bajas++;
      if (notas.lastIndexOf('[PIDE RE-ALTA') > notas.lastIndexOf('[BAJA')) rep.piden_re_alta++;
    } else rep.sin_consentimiento_historico++;
    String(f[I.origen] || '').split('+').map(s => s.trim()).filter(Boolean).forEach(o => {
      rep.por_origen[o] = (rep.por_origen[o] || 0) + 1;
      if (ok) rep.con_consentimiento_por_origen[o] = (rep.con_consentimiento_por_origen[o] || 0) + 1;
    });
    const m = String(f[I.modalidad_iv] || '').trim();
    if (m) rep.por_modalidad_iv[m] = (rep.por_modalidad_iv[m] || 0) + 1;
  });
  Logger.log('Base de la V (' + rep.pestana + '): ' + rep.total + ' personas · con consentimiento (reciben avisos): ' +
    rep.con_consentimiento + ' · sin consentimiento (registro histórico): ' + rep.sin_consentimiento_historico +
    ' · bajas: ' + rep.bajas + (rep.piden_re_alta ? ' (' + rep.piden_re_alta + ' piden volver: revisar notas)' : ''));
  Logger.log('Por origen (una persona puede tener varios): ' + JSON.stringify(rep.por_origen));
  Logger.log('Con consentimiento, por origen: ' + JSON.stringify(rep.con_consentimiento_por_origen));
  Logger.log('Modalidad en la IV: ' + JSON.stringify(rep.por_modalidad_iv));
  if (rep.duplicados.length) Logger.log('OJO, correos repetidos en la base (se editó a mano): ' + rep.duplicados.join(', '));
  Logger.log(rep.url);
  return rep;
}

/** bajaBaseV('correo') — baja explícita: deja de recibir avisos de la V. Si el correo no estaba, queda anotado igual. */
function bajaBaseV(correo) {
  if (!correo || typeof correo !== 'string') throw new Error('Pasa el correo: bajaBaseV("persona@dominio.com")');
  if (!idBaseV_()) throw new Error('Falta la Script Property BASE_V_SHEET_ID (ver RUNBOOK-evento.md §8).');
  const r = upsertBaseV_({ correo: correo, baja: true });
  if (!r.ok) throw new Error('No se pudo registrar la baja: ' + (r.error || r.omitido));
  Logger.log('Baja registrada para ' + correo.toLowerCase().trim() + ' (' + r.accion + '). No recibirá avisos de la V.');
  return r;
}

/** Correos únicos con acepta_comunicaciones = TRUE. Si un correo repetido tiene una fila de baja, no se incluye. */
function destinatariosAvisoBaseV_(base) {
  const I = base.i, ult = base.sh.getLastRow();
  const v = ult > 1 ? base.sh.getRange(2, 1, ult - 1, base.n).getValues() : [];
  const baja = {}, vistos = {}, lista = [];
  v.forEach(f => {
    const c = String(f[I.correo] || '').toLowerCase().trim();
    if (c && !esTrue_(f[I.acepta_comunicaciones]) && enBajaBaseV_(f[I.notas])) baja[c] = true;
  });
  v.forEach(f => {
    const c = String(f[I.correo] || '').toLowerCase().trim();
    if (!c || vistos[c] || baja[c] || !isEmailValid_(c) || !esTrue_(f[I.acepta_comunicaciones])) return;
    vistos[c] = true;
    lista.push(c);
  });
  return lista;
}

function hojaAvisosBaseV_(ss) {
  let sh = ss.getSheetByName(BASE_V_AVISOS);
  if (!sh) {
    sh = ss.insertSheet(BASE_V_AVISOS, ss.getNumSheets());
    sh.appendRow(['fecha', 'asunto', 'correo', 'estado', 'via', 'error']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Plantilla de los avisos de la V: tinta, papel y cobre del sitio (estilos en línea para los clientes de correo). */
function construirHtmlAvisoV_(cuerpoHtml) {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:#F5EFE3;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EFE3;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#FBF8F1;border:1px solid #EAE0D0;">' +
    '<tr><td style="background:#1A1810;padding:28px 32px;border-bottom:3px solid #B85C3D;">' +
    '<div style="font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#D9A48C;">Quinta edición · 2027</div>' +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;line-height:1.25;color:#F5EFE3;margin-top:8px;">V Foro Internacional de Derecho y Tecnología</div>' +
    '</td></tr>' +
    '<tr><td style="padding:32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2A2620;">' + cuerpoHtml + '</td></tr>' +
    '<tr><td style="padding:20px 32px 28px;border-top:1px solid #EAE0D0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.55;color:#5A5446;">' +
    '<p style="margin:0 0 8px;">Recibes este correo porque pediste avisos del Foro Internacional de Derecho y Tecnología: al inscribirte en la IV edición marcaste la casilla de comunicaciones sobre futuras ediciones, o te suscribiste en forodyt.com.</p>' +
    '<p style="margin:0 0 10px;">Para darte de baja, responde a este correo con el asunto «Baja» o escribe a <a href="mailto:contacto@forodyt.com?subject=Baja" style="color:#8C3F26;">contacto@forodyt.com</a>.</p>' +
    '<p style="margin:0;font-family:\'Courier New\',monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6B6455;">Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología» · Universidad de Guadalajara · <a href="https://forodyt.com" style="color:#6B6455;">forodyt.com</a></p>' +
    '</td></tr></table></td></tr></table></body></html>';
}

/**
 * enviarAvisoBaseV(asunto, htmlBody) — aviso de la V a la base del Drive personal, SOLO a quien tenga
 * acepta_comunicaciones = TRUE. Variante de enviarNewsletterMasivo() (que lee la lista Newsletter de la IV y no
 * conoce las bajas). Sale por enviarCorreo_() con respuesta a contacto@forodyt.com.
 * Cada envío queda en la pestaña «Avisos» del Sheet personal: si se detiene por tiempo (6 min) o por cuota,
 * volver a ejecutarla con el MISMO asunto y solo alcanza a quien falta. Probar antes con _testAvisoBaseV().
 * Uso (escribir una función propia en el editor y ejecutarla):
 *   function avisoFechaV() { enviarAvisoBaseV('Asunto', '<p>Cuerpo HTML</p>'); }
 */
function enviarAvisoBaseV(asunto, htmlBody) {
  if (!asunto || typeof asunto !== 'string' || !htmlBody) {
    throw new Error('Faltan parámetros: enviarAvisoBaseV("Asunto", "<p>Cuerpo HTML</p>"). Antes, _testAvisoBaseV().');
  }
  const base = baseV_();
  if (!base) throw new Error('Falta la Script Property BASE_V_SHEET_ID (ver RUNBOOK-evento.md §8).');
  marcarEnvioAvisoBaseV_();
  try {
    const hoja = hojaAvisosBaseV_(base.ss);
    const ya = {};
    hoja.getDataRange().getValues().slice(1).forEach(f => {
      if (String(f[1]) === asunto && String(f[3]) === 'enviado') ya[String(f[2]).toLowerCase().trim()] = true;
    });
    const lista = destinatariosAvisoBaseV_(base);
    const pendientes = lista.filter(c => !ya[c]);
    const html = construirHtmlAvisoV_(htmlBody);
    const inicio = Date.now();
    let enviados = 0, fallos = 0, pausa = '';
    for (let k = 0; k < pendientes.length; k++) {
      if (Date.now() - inicio > BASE_V_MAX_MS) { pausa = 'tiempo'; break; }
      if (MailApp.getRemainingDailyQuota() < 20) { pausa = 'cuota'; break; }
      const correo = pendientes[k];
      try {
        const via = enviarCorreo_({ to: correo, subject: asunto, htmlBody: html, name: BASE_V_NOMBRE_REMITENTE });
        hoja.appendRow([new Date(), asunto, correo, 'enviado', via, ''].map(celdaSegura_));
        enviados++;
        Utilities.sleep(200);
      } catch (err) {
        fallos++;
        hoja.appendRow([new Date(), asunto, correo, 'error', '', String(err.message).slice(0, 300)].map(celdaSegura_));
        log_('enviarAvisoBaseV', correo, err.message, null);
      }
    }
    const res = {
      con_consentimiento: lista.length, ya_enviados_antes: lista.length - pendientes.length,
      enviados: enviados, fallos: fallos, faltan: pendientes.length - enviados - fallos, pausa: pausa
    };
    Logger.log('enviarAvisoBaseV: ' + JSON.stringify(res) + (pausa ? ' → se detuvo por ' + pausa + ': volver a ejecutar con el mismo asunto.' : ''));
    return res;
  } finally {
    PROPS.deleteProperty(BASE_V_ENVIO_PROP);
  }
}

/**
 * Bandera de «hay un aviso enviándose», para que dos ejecuciones no manden el mismo aviso a la vez. NO se retiene
 * el candado de script durante el envío (hasta 4.5 min): bloquearía los «Avísame» de la app web. El candado solo
 * se toma unos milisegundos para comprobar y poner la bandera de forma atómica. La bandera es una Script Property
 * con la hora: si la ejecución muere sin borrarla, deja de contar a los BASE_V_ENVIO_TTL_MS.
 */
function marcarEnvioAvisoBaseV_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error('El candado del script está ocupado (quizá una tanda de enviarCierre o una siembra). Vuelve a intentarlo en unos minutos.');
  }
  try {
    const desde = Number(PROPS.getProperty(BASE_V_ENVIO_PROP)) || 0;
    if (desde && Date.now() - desde < BASE_V_ENVIO_TTL_MS) {
      throw new Error('Ya hay un aviso de la V enviándose (empezó ' + Utilities.formatDate(new Date(desde), TZ, 'HH:mm') +
        '). Espera a que termine y, si faltó gente, vuelve a ejecutarla con el mismo asunto.');
    }
    PROPS.setProperty(BASE_V_ENVIO_PROP, String(Date.now()));
  } finally {
    lock.releaseLock();
  }
}

/** _testAvisoBaseV() — manda el formato de los avisos de la V SOLO al director. No toca la lista. */
function _testAvisoBaseV() {
  const destinatario = PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL') || Session.getEffectiveUser().getEmail();
  let conteo = 'La base de la V no está conectada (falta BASE_V_SHEET_ID).';
  try {
    const base = baseV_();
    if (base) conteo = 'Hoy recibirían el aviso ' + destinatariosAvisoBaseV_(base).length + ' personas (acepta_comunicaciones = TRUE).';
  } catch (err) { conteo = 'No se pudo leer la base de la V: ' + err.message; }
  const cuerpo =
    '<p style="margin:0 0 14px;">Este es un correo de prueba con el formato de los avisos de la V edición. Solo te llega a ti.</p>' +
    '<p style="margin:0 0 14px;">La fecha, la sede y el tema de la V edición están por anunciar.</p>' +
    '<p style="margin:0;padding:10px 12px;background:#EAE0D0;font-size:13px;color:#2A2620;">' + escapeHtml_(conteo) + '</p>';
  const via = enviarCorreo_({
    to: destinatario,
    subject: '[PRUEBA] Aviso · V Foro Internacional de Derecho y Tecnología',
    htmlBody: construirHtmlAvisoV_(cuerpo),
    name: BASE_V_NOMBRE_REMITENTE
  });
  Logger.log('Prueba enviada a ' + destinatario + ' (' + via + '). ' + conteo);
  return { ok: true, destinatario: destinatario, via: via };
}

function _testInscripcion() {
  const r = crearInscripcion({
    correo: 'emmanueldelva@gmail.com',
    nombre: 'Juan Emmanuel Delva Benavides',
    tipo: 'academico',
    snii: 'I',
    area: 'Derecho y tecnología',
    institucion: 'CUCEA · Universidad de Guadalajara',
    pais: 'MX',
    modalidad: 'presencial',
    fuente: 'prueba_interna',
    acepto_aviso: true,
    acepto_codigo: true,
    acepto_news: false
  });
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}

function _checkQuota() {
  const q = MailApp.getRemainingDailyQuota();
  Logger.log('MailApp daily quota remaining: ' + q);
  if (q < 1500) {
    Logger.log('AVISO: cuota < 1500. Verificar que la cuenta sea Workspace UDG.');
  }
  return q;
}

// ============ LOGGING ============
function log_(action, detail, resultado, ctx) {
  try {
    const sheet = SS.getSheetByName(SHEETS.logs);
    if (!sheet) return;
    sheet.appendRow([
      new Date(),
      action,
      detail || '',
      resultado || 'ok',
      (ctx && ctx.ip) || '',
      (ctx && ctx.userAgent) || ''
    ]);
  } catch (e) { /* swallow */ }
}
