/**
 * IV Foro Internacional de Derecho y Tecnología — Backend Apps Script
 *
 * Despliegue:
 *   1. Vincular este script al Google Sheets "IV-Foro-Inscripciones-2026".
 *   2. En Project Settings > Script Properties, agregar:
 *      - HMAC_SECRET: string aleatorio de 32+ chars (generar UNA vez, NO compartir)
 *      - FOLIO_PREFIX: "IV-FORO-"
 *      - SENDER_NAME: "IV Foro Internacional de Derecho y Tecnología"
 *      - SENDER_EMAIL: "emmanueldelva@cucea.udg.mx"
 *      - LOGO_URL: URL pública del logo del Foro (opcional)
 *      - DIRECTOR_EMAIL: correo a notificar en alertas críticas (default: SENDER_EMAIL)
 *      - CONSTANCIA_TEMPLATE_ID: Doc ID del template de constancia
 *           (si no está, se autogenera uno default en el Drive del despliegue)
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
 *   - procesarCSVZoom(id, csv) → procesa attendee report de Zoom Webinar
 *   - auditoriaPostEvento()    → reporte de fraude detectado
 *   - procesarConstancias()    → cómputo final + emisión de PDFs en lotes
 *   - cerrarPlatica(id)        → cierra ventana de check-in de una plática
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
 * Endpoint POST — inscripción, check-in, newsletter.
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
        result = registrarCheckin(payload);
        break;
      case 'newsletter':
        result = suscribirNewsletter(payload);
        break;
      default:
        result = crearInscripcion(payload);
    }
    log_('doPost', payload.action || 'inscripcion', result.ok ? 'ok' : (result.error || 'fail'), ctx);
    return jsonResponse_(result);
  } catch (err) {
    log_('doPost', 'parse_error', err.message, ctx);
    return jsonResponse_({ ok: false, error: 'Solicitud inválida' });
  }
}

/**
 * Endpoint GET — validar QR (lectura del staff scanner) + healthcheck.
 */
function doGet(e) {
  const ctx = readRequestContext_(e);
  if (e.parameter && e.parameter.action === 'validar') {
    const result = validarQR(e.parameter.folio, e.parameter.hmac);
    log_('doGet', 'validar', result.ok ? 'ok' : (result.error || 'fail'), ctx);
    return jsonResponse_(result);
  }
  return jsonResponse_({ ok: true, msg: 'IV Foro endpoint activo' });
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
    return {
      ok: true,
      ya_inscrito: true,
      folio: existente.folio,
      mensaje: 'Ya estabas inscrito. Revisa tu correo o contáctanos para reenvío.'
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
    if (data[i][idxFlag] === true) continue;
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
function enviarCorreoQR_(correo, nombre, folio, qrPayload) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrPayload)}`;
  const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName('qr.png');

  const html = HtmlService
    .createTemplateFromFile('Plantilla-correo')
    .evaluate()
    .getContent()
    .replace(/{{NOMBRE}}/g, escapeHtml_(nombre))
    .replace(/{{FOLIO}}/g, folio)
    .replace(/{{QR_INLINE}}/g, '<img src="cid:qr" alt="QR" style="width:240px;height:240px;display:block;margin:24px auto;">');

  MailApp.sendEmail({
    to: correo,
    subject: `Tu inscripción al IV Foro Internacional de Derecho y Tecnología — Folio ${folio}`,
    htmlBody: html,
    inlineImages: { qr: qrBlob },
    name: PROPS.getProperty('SENDER_NAME') || 'IV Foro Internacional de Derecho y Tecnología'
  });
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
  if (platica.cerrada === true || platica.cerrada === 'TRUE') {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'platica_cerrada', 'qr_presencial');
    return { ok: false, error: 'Plática cerrada' };
  }

  if (yaCheckedIn_(folio, id_platica)) {
    return { ok: false, error: 'duplicado', ya_registrado: true };
  }

  if (haySimultaneoEnOtraSede_(folio, platica)) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'simultaneo_otra_sede', 'qr_presencial');
    return { ok: false, error: 'Check-in simultáneo en otra sede detectado' };
  }

  if (!estaEnVentana_(platica)) {
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

function estaEnVentana_(platica) {
  const ahora = new Date();
  const config = leerConfig_();
  const inicio = new Date(platica.hora_inicio);
  const fin = new Date(platica.hora_fin);
  inicio.setMinutes(inicio.getMinutes() - (Number(config.tolerancia_inicio_min) || 5));
  fin.setMinutes(fin.getMinutes() + (Number(config.tolerancia_fin_min) || 10));
  return ahora >= inicio && ahora <= fin;
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
    if (data[i][idxFolio] === folio) return rowToObject_(headers, data[i]);
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
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === correo) {
      return { ok: true, ya_suscrito: true };
    }
  }
  sheet.appendRow([correo, new Date(), payload.origen || 'web_inscripcion']);
  return { ok: true };
}

// ============ CONSTANCIAS ============
/**
 * Cómputo final + emisión de constancias en PDF, en lotes de 50.
 * Ejecutar manualmente al cierre del evento, o via trigger time-driven.
 */
function procesarConstancias() {
  const config = leerConfig_();
  const META_VALOR = Number(config.meta_horas_valor_curricular) || 20;
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

  MailApp.sendEmail({
    to: item.correo,
    subject: `Constancia · IV Foro Internacional de Derecho y Tecnología — Folio ${item.folio}`,
    htmlBody: `
      <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0E1B2C; line-height: 1.6;">
        <p>Hola, ${escapeHtml_(item.nombre)}.</p>
        <p>Adjuntamos tu <strong>${tituloNivel}</strong> del IV Foro Internacional de Derecho y Tecnología, con un total de <strong>${item.horas} horas efectivas</strong> acumuladas.</p>
        <p>Si encuentras algún error en tu nombre o cómputo de horas, escribe a <a href="mailto:emmanueldelva@cucea.udg.mx">emmanueldelva@cucea.udg.mx</a> con asunto «Constancia · ${item.folio}».</p>
        <p style="margin-top: 24px; font-style: italic; color: rgba(14, 27, 44, 0.6);">Gracias por tu participación.</p>
        <hr style="border: 0; border-top: 1px solid rgba(14, 27, 44, 0.14); margin: 24px 0;">
        <div style="font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(14, 27, 44, 0.5); font-family: 'Courier New', monospace;">
          CUCEA · Universidad de Guadalajara<br>
          Cuerpo Académico UDG-CA-1236 · Derecho y Tecnología
        </div>
      </div>
    `,
    attachments: [pdfBlob],
    name: PROPS.getProperty('SENDER_NAME') || 'IV Foro Internacional de Derecho y Tecnología'
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
