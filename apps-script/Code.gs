/**
 * IV Foro Internacional de Derecho y Tecnología — Backend Apps Script
 * 
 * Despliegue:
 *   1. Vincular este script al Google Sheets "IV-Foro-Inscripciones-2026".
 *   2. En Project Settings > Script Properties, agregar:
 *      - HMAC_SECRET: string aleatorio de 32+ chars (generar una vez, NO compartir)
 *      - FOLIO_PREFIX: "IV-FORO-"
 *      - SENDER_NAME: "IV Foro Internacional de Derecho y Tecnología"
 *      - SENDER_EMAIL: "emmanueldelva@cucea.udg.mx"
 *      - LOGO_URL: URL pública del logo del Foro (Drive público o CDN)
 *   3. Deploy > New deployment > Type: Web app
 *      - Execute as: Me (emmanueldelva@cucea.udg.mx)
 *      - Who has access: Anyone
 *   4. Copiar la URL del Web App al frontend (inscripcion.html)
 *
 * Cuotas relevantes (cuenta Workspace UDG):
 *   - MailApp: 1500 correos/día
 *   - UrlFetchApp: 100,000/día
 *   - Triggers: 6/script
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
  logs: '_logs'
};

// ============ ENTRY POINT ============
/**
 * Endpoint público — inscripción y check-in.
 * Recibe POST con JSON. Responde JSON.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    log_('doPost', payload.action || 'inscripcion', null);
    
    switch (payload.action) {
      case 'inscripcion':
        return jsonResponse_(crearInscripcion(payload));
      case 'checkin':
        return jsonResponse_(registrarCheckin(payload));
      case 'newsletter':
        return jsonResponse_(suscribirNewsletter(payload));
      default:
        // Si no hay action, asumir inscripción (compat con form básico)
        return jsonResponse_(crearInscripcion(payload));
    }
  } catch (err) {
    log_('doPost', 'error', err.message);
    return jsonResponse_({ ok: false, error: err.message });
  }
}

function doGet(e) {
  // Endpoint GET para validar QR desde el scanner del staff
  if (e.parameter.action === 'validar') {
    return jsonResponse_(validarQR(e.parameter.folio, e.parameter.hmac));
  }
  return jsonResponse_({ ok: true, msg: 'IV Foro endpoint activo' });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ INSCRIPCIÓN ============
function crearInscripcion(payload) {
  // Validación básica
  if (!payload.correo || !payload.nombre || !payload.tipo) {
    return { ok: false, error: 'Campos obligatorios faltantes' };
  }
  
  const correo = String(payload.correo).toLowerCase().trim();
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  
  // Verificar si ya existe (PK = correo)
  const existente = buscarUsuario_(correo);
  if (existente) {
    return { 
      ok: true, 
      ya_inscrito: true, 
      folio: existente.folio,
      mensaje: 'Ya estabas inscrito. Revisa tu correo o contáctanos para reenvío.'
    };
  }
  
  // Generar folio + QR
  const folio = generarFolio_();
  const hmac8 = calcularHMAC8_(folio);
  const qrPayload = `FORO|${folio}|${hmac8}`;
  
  // Insertar fila
  sheet.appendRow([
    folio,
    correo,
    payload.nombre,
    payload.tipo,
    payload.grado || '',
    payload.programa || '',
    payload.snii || '',
    payload.area || '',
    payload.institucion,
    payload.pais || 'MX',
    payload.modalidad,
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
  
  // Enviar correo de confirmación con QR
  try {
    enviarCorreoQR_(correo, payload.nombre, folio, qrPayload);
    sheet.getRange(sheet.getLastRow(), 18).setValue(true); // correo_qr_enviado
  } catch (err) {
    log_('enviarCorreo', 'error', err.message);
    // No fallar la inscripción si el correo falla; queda flaggeado para reintento
  }
  
  return { ok: true, folio, mensaje: 'Inscripción registrada. Revisa tu correo.' };
}

// ============ HMAC + FOLIO ============
function generarFolio_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1 para evitar confusión
  let r = '';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return PROPS.getProperty('FOLIO_PREFIX') + r;
}

function calcularHMAC8_(folio) {
  const secret = PROPS.getProperty('HMAC_SECRET');
  if (!secret) throw new Error('HMAC_SECRET no configurado');
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
  const hmacEsperado = calcularHMAC8_(folio);
  if (hmacRecibido !== hmacEsperado) return { ok: false, error: 'HMAC inválido' };
  const usuario = buscarUsuarioPorFolio_(folio);
  if (!usuario) return { ok: false, error: 'Folio no encontrado' };
  return { 
    ok: true, 
    folio, 
    nombre: usuario.nombre_completo,
    tipo: usuario.tipo,
    institucion: usuario.institucion
  };
}

// ============ CORREO ============
function enviarCorreoQR_(correo, nombre, folio, qrPayload) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrPayload)}`;
  
  // Descargar QR como blob para incrustar inline (más confiable que linkear)
  const qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName('qr.png');
  
  const html = HtmlService
    .createTemplateFromFile('Plantilla-correo')
    .evaluate()
    .getContent()
    .replace('{{NOMBRE}}', nombre)
    .replace('{{FOLIO}}', folio);
  
  MailApp.sendEmail({
    to: correo,
    subject: `Tu inscripción al IV Foro Internacional de Derecho y Tecnología — Folio ${folio}`,
    htmlBody: html.replace('{{QR_INLINE}}', '<img src="cid:qr" alt="QR" style="width:240px;height:240px;display:block;margin:24px auto;">'),
    inlineImages: { qr: qrBlob },
    name: PROPS.getProperty('SENDER_NAME') || 'IV Foro DDT'
  });
}

// ============ CHECK-IN ============
function registrarCheckin(payload) {
  // payload: { folio, hmac, id_platica, staff_email }
  const { folio, hmac, id_platica, staff_email } = payload;
  
  const validacion = validarQR(folio, hmac);
  if (!validacion.ok) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, validacion.error);
    return { ok: false, error: validacion.error };
  }
  
  const platica = buscarPlatica_(id_platica);
  if (!platica) return { ok: false, error: 'Plática no encontrada' };
  if (platica.cerrada) return { ok: false, error: 'Plática cerrada' };
  
  // Idempotencia
  if (yaCheckedIn_(folio, id_platica)) {
    return { ok: false, error: 'duplicado', ya_registrado: true };
  }
  
  // Anti-fraude: ¿está en otra sede a la misma hora?
  if (haySimultaneoEnOtraSede_(folio, platica)) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'simultaneo_otra_sede');
    return { ok: false, error: 'Check-in simultáneo en otra sede detectado' };
  }
  
  // Ventana de tolerancia
  if (!estaEnVentana_(platica)) {
    registrarCheckinFila_(folio, id_platica, staff_email, false, 'fuera_de_ventana');
    return { ok: false, error: 'Fuera de ventana de check-in' };
  }
  
  // Registrar OK
  registrarCheckinFila_(folio, id_platica, staff_email, true, '');
  return { 
    ok: true, 
    nombre: validacion.nombre,
    institucion: validacion.institucion,
    horas_sumadas: platica.horas_valor
  };
}

function registrarCheckinFila_(folio, id_platica, staff, valido, motivo) {
  const sheet = SS.getSheetByName(SHEETS.checkins);
  const id = sheet.getLastRow(); // simple autoincremental
  sheet.appendRow([
    id,
    folio,
    id_platica,
    new Date(),
    staff || '',
    'qr_presencial',
    valido,
    motivo || ''
  ]);
}

// ============ HELPERS ============
function buscarUsuario_(correo) {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxCorreo = headers.indexOf('correo');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxCorreo]).toLowerCase() === correo) {
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
    if (data[i][0] == id) return rowToObject_(headers, data[i]);
  }
  return null;
}

function yaCheckedIn_(folio, id_platica) {
  const sheet = SS.getSheetByName(SHEETS.checkins);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === folio && data[i][2] == id_platica && data[i][6] === true) return true;
  }
  return false;
}

function haySimultaneoEnOtraSede_(folio, platica) {
  // Busca check-ins válidos del mismo folio en pláticas que se solapan en tiempo
  // pero están en sede distinta. Implementación simplificada: retorna false por ahora.
  // TODO: implementar con cruce real de timestamps cuando haya datos de prueba.
  return false;
}

function estaEnVentana_(platica) {
  const ahora = new Date();
  const config = leerConfig_();
  const inicio = new Date(platica.hora_inicio);
  const fin = new Date(platica.hora_fin);
  inicio.setMinutes(inicio.getMinutes() - (config.tolerancia_inicio_min || 5));
  fin.setMinutes(fin.getMinutes() + (config.tolerancia_fin_min || 10));
  return ahora >= inicio && ahora <= fin;
}

function leerConfig_() {
  const sheet = SS.getSheetByName(SHEETS.config);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const cfg = {};
  for (let i = 1; i < data.length; i++) {
    cfg[data[i][0]] = data[i][1];
  }
  return cfg;
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function log_(action, detail, error) {
  try {
    const sheet = SS.getSheetByName(SHEETS.logs);
    if (!sheet) return;
    sheet.appendRow([new Date(), action, detail || '', error || 'ok', '', '']);
  } catch (e) { /* swallow */ }
}

// ============ NEWSLETTER ============
function suscribirNewsletter(payload) {
  // Implementación simple: guardar en pestaña aparte o sumar tag a Usuarios
  const sheet = SS.getSheetByName('Newsletter') || SS.insertSheet('Newsletter');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['correo', 'fecha', 'origen']);
  }
  sheet.appendRow([payload.correo.toLowerCase().trim(), new Date(), 'web_inscripcion']);
  return { ok: true };
}

// ============ PROCESAMIENTO FINAL DE CONSTANCIAS ============
/**
 * Ejecutar manualmente al cierre del evento.
 * Recorre check-ins, suma horas por usuario, asigna nivel de constancia, envía PDFs.
 */
function procesarConstancias() {
  const config = leerConfig_();
  const META_VALOR = config.meta_horas_valor_curricular || 20;
  const META_BASE = config.meta_horas_asistencia_minima || 4;
  
  const usuariosSheet = SS.getSheetByName(SHEETS.usuarios);
  const checkinsSheet = SS.getSheetByName(SHEETS.checkins);
  const platicasSheet = SS.getSheetByName(SHEETS.platicas);
  
  // Mapa platica → horas
  const horasPorPlatica = {};
  const platData = platicasSheet.getDataRange().getValues();
  for (let i = 1; i < platData.length; i++) {
    horasPorPlatica[platData[i][0]] = platData[i][7] || 0;
  }
  
  // Sumar horas por folio
  const horasPorFolio = {};
  const ciData = checkinsSheet.getDataRange().getValues();
  for (let i = 1; i < ciData.length; i++) {
    if (ciData[i][6] === true) { // valido
      const folio = ciData[i][1];
      horasPorFolio[folio] = (horasPorFolio[folio] || 0) + (horasPorPlatica[ciData[i][2]] || 0);
    }
  }
  
  // Actualizar Usuarios y enviar
  const userData = usuariosSheet.getDataRange().getValues();
  const headers = userData[0];
  const idxFolio = headers.indexOf('folio');
  const idxHoras = headers.indexOf('horas_acumuladas');
  const idxNivel = headers.indexOf('nivel_constancia');
  const idxTipo = headers.indexOf('tipo');
  
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
  }
  
  // TODO: generar PDFs vía Google Docs template y enviar por correo en lotes
  Logger.log(`Procesados ${userData.length - 1} usuarios. Listos para emisión.`);
}
