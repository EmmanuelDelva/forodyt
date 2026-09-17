/**
 * IV Foro Internacional de Derecho y Tecnología — Asistencia virtual verificada
 * (complemento de Code.gs para la página en-vivo.html)
 *
 * QUÉ HACE
 *   Convierte la asistencia por transmisión web en check-ins del mismo modelo que
 *   el QR presencial y el CSV de Zoom: un bloque (fila de la pestaña Platicas) se
 *   acredita cuando la persona acumuló >= umbral (75 %) de sus minutos VERIFICADOS
 *   y, si la moderación dictó códigos de presencia en ese bloque, al menos uno correcto.
 *   Después procesarConstancias() (Code.gs) hace el resto sin cambios.
 *
 * CÓMO SE INSTALA (mismo proyecto «IV Foro 2026 Backend»; Manage deployments → Edit → Nueva versión; NUNCA «New deployment»)
 *   1. Añadir este archivo al proyecto (Archivo → Nuevo → Script, pegar).
 *   2. En doPost de Code.gs, agregar los cases:
 *        case 'stream_login':          result = streamLogin(payload); break;
 *        case 'stream_latido':         result = streamLatido(payload); break;
 *        case 'stream_reto':           result = streamReto(payload); break;
 *        case 'stream_reto_pantalla':  result = streamRetoPantalla(payload); break;
 *      y en doGet, antes del healthcheck:
 *        if (e.parameter.action === 'stream_codigo_nuevo') return jsonResponse_(staffKeyValida_(e.parameter.key) ? streamCodigoNuevo(e.parameter.id_platica, e.parameter.minutos) : { ok:false, error:'staff_key_invalida' });
 *   3. Crear en el Sheet las pestañas StreamLatidos, StreamRetos y StreamCodigos (se crean solas en el primer uso si no existen).
 *   4. Pestaña Platicas: correr UNA vez instalarPlaticasIV() desde el editor. Da de alta los 5 bloques del programa
 *      definitivo con estos id (deben coincidir con staff-scanner.html y programa-data.json):
 *        1 CUCEA · lun 21 · 09:00–14:10  |  2 CUGDL · lun 21 · 16:05–18:50  |  3 Cineteca FICG · mar 22 · 10:05–13:30
 *        4 Ciudad Judicial · mar 22 · 16:00–18:45  |  5 Jornada Virtual · vie 18 · 07:00–11:10 (hora GDL)
 *      y poner meta_horas_valor_curricular = 10 en _config (decisión del director; el máximo alcanzable es 18.09 h).
 *   5. Correr UNA vez instalarDisparadorJornadaVirtual(): el 18-sep a las 11:40 (GDL) consolida la asistencia
 *      de la Jornada Virtual y emite las constancias de quienes estuvieron conectados.
 *   6. En en-vivo.html poner MODO_PRUEBA = false.
 *
 * REGLAS DE ACREDITACIÓN (ver consolidarStream)
 *   - Bloques presenciales seguidos a distancia: >= 75 % de minutos verificados + código de presencia si hubo.
 *   - Jornada Virtual (bloque 5): regla laxa; basta con >= 10 minutos verificados (minutos_minimos_virtual en _config).
 *   - Escáner QR (Code.gs): ventana desde 60 min antes del inicio hasta 60 min después del cierre de la sede;
 *     el bloque virtual no tiene ventana (no se escanea).
 *
 * SEGURIDAD
 *   - El token de sesión es HMAC8(folio|correo|YYYY-MM-DD) con HMAC_SECRET: sirve un día y no se puede fabricar sin el secreto.
 *   - Los latidos se deduplican por minuto: aunque el cliente los repita, cuentan una vez.
 *   - Un latido solo cuenta si cae dentro de la ventana de la plática (hora_inicio/hora_fin ± 10 min).
 *   - Tras una comprobación «¿Sigues ahí?» no respondida, los latidos siguientes NO cuentan hasta que llegue una respondida.
 *   - Los códigos de presencia los genera el staff (clave STAFF_KEY) y caducan a los N minutos.
 */

const STREAM_SHEETS = { latidos: 'StreamLatidos', retos: 'StreamRetos', codigos: 'StreamCodigos' };

function hoja_(nombre, encabezados) {
  let sh = SS.getSheetByName(nombre);
  if (!sh) { sh = SS.insertSheet(nombre); sh.appendRow(encabezados); }
  return sh;
}
function fechaHoy_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function tokenStream_(folio, correo) { return calcularHMAC8_(String(folio).toUpperCase() + '|' + String(correo).toLowerCase() + '|' + fechaHoy_()); }
function tokenValido_(payload) {
  const u = buscarUsuario_(String(payload.correo || '').toLowerCase());
  const folio = String(payload.folio || '').toUpperCase().trim();
  if (!folio) return null;
  // el latido no trae correo: se busca por folio
  const usuario = u || buscarUsuarioPorFolio_(folio);
  if (!usuario || String(usuario.folio).toUpperCase() !== folio) return null;
  if (String(payload.token || '') !== tokenStream_(folio, usuario.correo)) return null;
  return usuario;
}
// buscarUsuarioPorFolio_() vive en Code.gs (devuelve la fila completa: folio, correo, nombre_completo, institucion…).

/** POST stream_login {folio, correo} → {ok, nombre, token} */
function streamLogin(payload) {
  const folio = String(payload.folio || '').toUpperCase().trim();
  const correo = String(payload.correo || '').toLowerCase().trim();
  if (!folio || !isEmailValid_(correo)) return { ok: false, error: 'datos_invalidos' };
  const u = buscarUsuario_(correo);
  if (!u || String(u.folio).toUpperCase() !== folio) return { ok: false, error: 'folio_no_coincide' };
  return { ok: true, nombre: u.nombre || u.nombre_completo || '', token: tokenStream_(folio, correo) };
}

/** POST stream_latido {folio, token, id_platica, minuto (YYYY-MM-DDTHH:MM en UTC), sesion} → {ok} */
function streamLatido(payload) {
  const u = tokenValido_(payload); if (!u) return { ok: false, error: 'token_invalido' };
  const platica = buscarPlatica_(payload.id_platica); if (!platica) return { ok: false, error: 'platica_desconocida' };
  const minuto = String(payload.minuto || '').slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(minuto)) return { ok: false, error: 'minuto_invalido' };
  const ts = new Date(minuto + ':00Z').getTime();
  const ini = new Date(platica.hora_inicio).getTime() - 10 * 60000, fin = new Date(platica.hora_fin).getTime() + 10 * 60000;
  if (ts < ini || ts > fin) return { ok: false, error: 'fuera_de_ventana' };
  const sh = hoja_(STREAM_SHEETS.latidos, ['folio', 'id_platica', 'minuto_utc', 'sesion', 'recibido']);
  // dedupe por (folio, platica, minuto)
  const clave = u.folio + '|' + payload.id_platica + '|' + minuto;
  const cache = CacheService.getScriptCache();
  if (cache.get('lat:' + clave)) return { ok: true, dup: true };
  cache.put('lat:' + clave, '1', 21600);
  sh.appendRow([u.folio, String(payload.id_platica), minuto, String(payload.sesion || ''), new Date()]);
  return { ok: true };
}

/** POST stream_reto_pantalla {folio, token, bloque, ok} — registra la comprobación «¿Sigues ahí?» */
function streamRetoPantalla(payload) {
  const u = tokenValido_(payload); if (!u) return { ok: false, error: 'token_invalido' };
  const sh = hoja_(STREAM_SHEETS.retos, ['folio', 'bloque', 'tipo', 'resultado', 'codigo', 'recibido']);
  sh.appendRow([u.folio, String(payload.bloque || ''), 'pantalla', payload.ok === true ? 'ok' : 'sin_respuesta', '', new Date()]);
  return { ok: true };
}

/** POST stream_reto {folio, token, id_platica, codigo} → {ok} — código dictado por la moderación */
function streamReto(payload) {
  const u = tokenValido_(payload); if (!u) return { ok: false, error: 'token_invalido' };
  const codigo = String(payload.codigo || '').toUpperCase().trim();
  const sh = hoja_(STREAM_SHEETS.codigos, ['id_platica', 'codigo', 'valido_desde', 'valido_hasta', 'creado_por']);
  const data = sh.getDataRange().getValues(); const ahora = Date.now(); let valido = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id_platica) && String(data[i][1]).toUpperCase() === codigo &&
        ahora >= new Date(data[i][2]).getTime() && ahora <= new Date(data[i][3]).getTime()) { valido = true; break; }
  }
  const shr = hoja_(STREAM_SHEETS.retos, ['folio', 'bloque', 'tipo', 'resultado', 'codigo', 'recibido']);
  shr.appendRow([u.folio, String(payload.id_platica), 'codigo', valido ? 'ok' : 'incorrecto', codigo, new Date()]);
  return { ok: valido };
}

/** GET stream_codigo_nuevo&key=STAFF_KEY&id_platica=N[&minutos=10] → {ok, codigo, valido_hasta}
 *  La moderación lo pide desde registroscomite.html, lo muestra o lo dicta en la transmisión. */
function streamCodigoNuevo(idPlatica, minutos) {
  if (!buscarPlatica_(idPlatica)) return { ok: false, error: 'platica_desconocida' };
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  const desde = new Date(), hasta = new Date(desde.getTime() + (Number(minutos) || 10) * 60000);
  hoja_(STREAM_SHEETS.codigos, ['id_platica', 'codigo', 'valido_desde', 'valido_hasta', 'creado_por']).appendRow([String(idPlatica), c, desde, hasta, Session.getActiveUser().getEmail() || 'staff']);
  return { ok: true, codigo: c, valido_hasta: hasta.toISOString() };
}

/**
 * consolidarStream() — correr manualmente al cierre de cada día (o antes de procesarConstancias()).
 * Por cada folio y plática: minutos = latidos distintos dentro de la ventana, descontando los
 * posteriores a una comprobación de pantalla sin respuesta hasta la siguiente respondida.
 *
 * Dos reglas (decisión del director, 2026-09-14):
 *   - Bloques PRESENCIALES seguidos por transmisión (1–4): >= umbral_stream_porcentaje (default 75 %) de los
 *     minutos del bloque y, si la moderación dictó códigos en ese bloque, al menos uno correcto.
 *   - Bloque VIRTUAL (Jornada Virtual del 18, sede = virtual): regla LAXA. Basta con haber estado conectado:
 *     >= minutos_minimos_virtual (default 10) minutos verificados; los códigos no son obligatorios
 *     (codigo_obligatorio_virtual = TRUE en _config si se quiere exigirlos). Quien se conectó recibe su
 *     constancia al término de la jornada (ver cerrarJornadaVirtual()).
 */
function consolidarStream() {
  const config = leerConfig_();
  const umbral = (Number(config.umbral_stream_porcentaje) || Number(config.umbral_zoom_porcentaje) || 75) / 100;
  const minVirtual = Number(config.minutos_minimos_virtual) || 10;
  const codigoVirtual = config.codigo_obligatorio_virtual === true || String(config.codigo_obligatorio_virtual).toUpperCase() === 'TRUE';
  const lat = hoja_(STREAM_SHEETS.latidos, ['folio', 'id_platica', 'minuto_utc', 'sesion', 'recibido']).getDataRange().getValues().slice(1);
  const retos = hoja_(STREAM_SHEETS.retos, ['folio', 'bloque', 'tipo', 'resultado', 'codigo', 'recibido']).getDataRange().getValues().slice(1);
  const codigos = hoja_(STREAM_SHEETS.codigos, ['id_platica', 'codigo', 'valido_desde', 'valido_hasta', 'creado_por']).getDataRange().getValues().slice(1);
  const platicasConCodigo = {}; codigos.forEach(r => { platicasConCodigo[String(r[0])] = true; });
  const platicas = construirMapaPlaticas_();

  // pausas por comprobación sin respuesta: [(folio, desde, hasta)]
  const pausas = {};
  retos.filter(r => r[2] === 'pantalla').sort((a, b) => new Date(a[5]) - new Date(b[5])).forEach(r => {
    const f = String(r[0]); pausas[f] = pausas[f] || [];
    if (r[3] === 'sin_respuesta') pausas[f].push([new Date(r[5]).getTime(), Infinity]);
    else if (pausas[f].length && pausas[f][pausas[f].length - 1][1] === Infinity) pausas[f][pausas[f].length - 1][1] = new Date(r[5]).getTime();
  });
  const enPausa = (f, ts) => (pausas[f] || []).some(p => ts >= p[0] && ts <= p[1]);
  const codigoOk = {}; retos.filter(r => r[2] === 'codigo' && r[3] === 'ok').forEach(r => { codigoOk[String(r[0]) + '|' + String(r[1])] = true; });

  const minutos = {};
  lat.forEach(r => {
    const f = String(r[0]), p = String(r[1]), m = String(r[2]); const ts = new Date(m + ':00Z').getTime();
    if (enPausa(f, new Date(r[4]).getTime())) return;
    minutos[f + '|' + p] = minutos[f + '|' + p] || new Set(); minutos[f + '|' + p].add(m);
  });
  let validos = 0, rechazados = 0;
  Object.keys(minutos).forEach(k => {
    const [folio, id] = k.split('|'); const pl = platicas[id]; if (!pl) return;
    if (yaCheckedIn_(folio, id)) return;
    const total = (new Date(pl.hora_fin) - new Date(pl.hora_inicio)) / 60000;
    const pct = minutos[k].size / total;
    const virtual = esPlaticaVirtual_(pl);
    const okMinutos = virtual ? minutos[k].size >= minVirtual : pct >= umbral;
    const okCodigo = virtual ? (!codigoVirtual || !platicasConCodigo[id] || codigoOk[k]) : (!platicasConCodigo[id] || codigoOk[k]);
    if (okMinutos && okCodigo) { registrarCheckinFila_(folio, id, 'web@forodyt.com', true, '', 'web_stream'); validos++; }
    else { registrarCheckinFila_(folio, id, 'web@forodyt.com', false, !okMinutos ? 'porcentaje_insuficiente' : 'sin_codigo_presencia', 'web_stream'); rechazados++; }
  });
  log_('consolidarStream', 'todas', `validos=${validos} rechazados=${rechazados}`, null);
  return { validos, rechazados };
}

// ============ INSTALACIÓN: BLOQUES DEL PROGRAMA DEFINITIVO ============
/**
 * Los cinco bloques de asistencia del programa definitivo (v10.09.2026). Mismos id que
 * staff-scanner.html (PLATICAS) y programa-data.json (en-vivo.html). Horas en Guadalajara (UTC-6,
 * México ya no aplica horario de verano). horas_valor = duración real del bloque en horas.
 */
const PLATICAS_IV = [
  { id_platica: 1, nombre_sesion: 'CUCEA · Lunes 21 · inauguración, conferencia inaugural y Mesas 1–4', eje: 'varios', sede: 'cucea',           jornada: 'j1_lun_21_sep', hora_inicio: '2026-09-21T09:00:00-06:00', hora_fin: '2026-09-21T14:10:00-06:00', horas_valor: 5.17, tipo: 'mesa', formato: 'hibrido' },
  { id_platica: 2, nombre_sesion: 'CUGDL · Lunes 21 · Mesas 5–7',                                        eje: 'varios', sede: 'cugdl',           jornada: 'j1_lun_21_sep', hora_inicio: '2026-09-21T16:05:00-06:00', hora_fin: '2026-09-21T18:50:00-06:00', horas_valor: 2.75, tipo: 'mesa', formato: 'hibrido' },
  { id_platica: 3, nombre_sesion: 'Cineteca FICG · Martes 22 · Mesas 8–10 y jóvenes investigadores',    eje: 'varios', sede: 'cineteca',        jornada: 'j2_mar_22_sep', hora_inicio: '2026-09-22T10:05:00-06:00', hora_fin: '2026-09-22T13:30:00-06:00', horas_valor: 3.42, tipo: 'mesa', formato: 'hibrido' },
  { id_platica: 4, nombre_sesion: 'Ciudad Judicial · Martes 22 · ponencia inaugural, presentación editorial, Mesa 11 y clausura', eje: 'varios', sede: 'ciudad_judicial', jornada: 'j2_mar_22_sep', hora_inicio: '2026-09-22T16:00:00-06:00', hora_fin: '2026-09-22T18:45:00-06:00', horas_valor: 2.75, tipo: 'mesa', formato: 'hibrido' },
  { id_platica: 5, nombre_sesion: 'Jornada Virtual Internacional · Viernes 18 · Mesas V1–V4',            eje: 'varios', sede: 'virtual',         jornada: 'jv_vie_18_sep', hora_inicio: '2026-09-18T07:00:00-06:00', hora_fin: '2026-09-18T11:10:00-06:00', horas_valor: 4.17,  tipo: 'mesa', formato: 'virtual' }
];

/**
 * instalarPlaticasIV() — correr UNA vez desde el editor. Da de alta (o actualiza por id_platica) los cinco
 * bloques en la pestaña Platicas respetando los encabezados existentes. Las columnas que la hoja no tenga se
 * ignoran; zoom_id queda vacío y cerrada = FALSE. Es idempotente: se puede volver a correr sin duplicar filas.
 *
 * Con estos bloques la suma máxima es 18.09 h. Decisión del director (2026-09-14): meta_horas_valor_curricular = 10
 * en _config (constancia con valor curricular firmada por el director y los tres centros universitarios).
 */
function instalarPlaticasIV() {
  const sheet = SS.getSheetByName(SHEETS.platicas);
  if (!sheet) throw new Error('No existe la pestaña ' + SHEETS.platicas);
  let data = sheet.getDataRange().getValues();
  if (!data.length || !data[0].some(Boolean)) {
    sheet.getRange(1, 1, 1, 12).setValues([['id_platica', 'nombre_sesion', 'eje', 'sede', 'jornada', 'hora_inicio', 'hora_fin', 'horas_valor', 'tipo', 'formato', 'zoom_id', 'cerrada']]);
    data = sheet.getDataRange().getValues();
  }
  const headers = data[0].map(h => String(h).trim());
  const idxId = headers.indexOf('id_platica');
  if (idxId === -1) throw new Error('La pestaña Platicas no tiene la columna id_platica');
  const filaDe = {};
  for (let i = 1; i < data.length; i++) filaDe[String(data[i][idxId])] = i + 1;
  let altas = 0, cambios = 0;
  PLATICAS_IV.forEach(p => {
    const valores = { ...p, hora_inicio: new Date(p.hora_inicio), hora_fin: new Date(p.hora_fin), zoom_id: '', cerrada: false };
    const fila = headers.map(h => (h in valores ? valores[h] : ''));
    const row = filaDe[String(p.id_platica)];
    if (row) {
      // conserva lo que ya hubiera en columnas que no gestionamos (p. ej. zoom_id capturado a mano)
      const actual = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
      headers.forEach((h, j) => { if (!(h in valores)) fila[j] = actual[j]; if (h === 'zoom_id' && actual[j]) fila[j] = actual[j]; });
      sheet.getRange(row, 1, 1, headers.length).setValues([fila]); cambios++;
    } else { sheet.appendRow(fila); altas++; }
  });
  const cols = ['hora_inicio', 'hora_fin'].map(h => headers.indexOf(h) + 1).filter(Boolean);
  cols.forEach(c => sheet.getRange(2, c, Math.max(sheet.getLastRow() - 1, 1), 1).setNumberFormat('yyyy-mm-dd hh:mm'));
  log_('instalarPlaticasIV', 'Platicas', `altas=${altas} actualizadas=${cambios}`, null);
  Logger.log(`instalarPlaticasIV: ${altas} altas, ${cambios} actualizadas. Revisa meta_horas_valor_curricular = 10 en _config (máximo alcanzable: 18.09 h).`);
  return { altas, actualizadas: cambios };
}

// ============ CONSTANCIAS POR BLOQUE (decisión del director, 2026-09-14) ============
/**
 * Al cerrar cada bloque (una hora después de su hora de fin) se emite a cada persona con check-in válido
 * en ese bloque una CONSTANCIA DE ASISTENCIA del bloque por sus horas ENTERAS (5.17 h → 5 h), con la firma
 * digital del director («Delva», el puro apellido). Plantilla: archivo HTML «Constancia-bloque» del proyecto
 * (copiar apps-script/Constancia-bloque.html con Archivo → Nuevo → HTML, nombre exacto «Constancia-bloque»).
 *
 * Script Properties necesarias:
 *   FIRMA_DIGITAL_FILE_ID   id en Drive de firma-digital-apellido-delva-black-CANON.png (compartir con la cuenta que ejecuta el script)
  *   LOGO_UDG_FILE_ID · LOGO_CA_FILE_ID   (opcionales) ids en Drive de img/aliados/udg.png y de
  *                                         img/aliados/ca-derecho-tecnologia-lockup.png (lockup completo del CA; no CUCEA)
 *   CONSTANCIAS_FOLDER_ID   (opcional) carpeta de Drive donde guardar copia de cada PDF
 *   AGUA_FILE_ID            (opcional) id en Drive de img/marca/foro-mapa-conexiones-dorado.png (marca de agua con el mapamundi del Foro)
 *
 * Pasos: instalarDisparadoresBloques() una vez → crea cinco disparadores «cerrarBloque» (fin del bloque + 60 min,
 * hora GDL). También se puede correr a mano emitirConstanciasBloque(1).
 * La constancia CON VALOR CURRICULAR (10 h, director + tres centros universitarios) usa la misma plantilla con
 * tipo = 'valor' y se emite con procesarConstancias() al cierre del Foro cuando estén las firmas de los centros.
 */
const CONST_BLOQUE_SHEET = 'ConstanciasBloque';
const BLOQUE_INFO = {
  '1': { sede: 'CUCEA', recinto: 'el Auditorio Lic. Raúl Padilla López (CUCEA)', sesiones: 'Inauguración · Conferencia inaugural · Mesas 1 a 4 · Jóvenes investigadores del Call for Papers · Presentación editorial' },
  '2': { sede: 'CUGDL', recinto: 'el Auditorio Salvador Allende (Centro Universitario de Guadalajara)', sesiones: 'Bienvenida · Mesas 5 a 7' },
  '3': { sede: 'Cineteca FICG', recinto: 'la Sala Guillermo del Toro (Cineteca FICG · Centro Cultural Universitario)', sesiones: 'Bienvenida · Mesas 8 a 10' },
  '4': { sede: 'Ciudad Judicial', recinto: 'el Auditorio de Ciudad Judicial del Estado de Jalisco', sesiones: 'Ponencia inaugural · Presentación editorial · Mesa 11 · Clausura' },
  '5': { sede: 'Jornada Virtual Internacional', recinto: 'la transmisión en línea del Foro (Jornada Virtual Internacional)', sesiones: 'Apertura · Mesas V1 a V4 · Cierre' }
};
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLargaEs_(d, conDia) {
  const dia = Number(Utilities.formatDate(d, TZ, 'u')) % 7, n = Number(Utilities.formatDate(d, TZ, 'd')), m = Number(Utilities.formatDate(d, TZ, 'M')) - 1, y = Utilities.formatDate(d, TZ, 'yyyy');
  return (conDia ? DIAS_ES[dia] + ' ' : '') + `${n} de ${MESES_ES[m]} de ${y}`;
}
function horaCorta_(d) { return Utilities.formatDate(d, TZ, 'H:mm'); }
function horasTexto_(n) {
  const t = ['cero horas', 'una hora', 'dos horas', 'tres horas', 'cuatro horas', 'cinco horas', 'seis horas', 'siete horas', 'ocho horas', 'nueve horas', 'diez horas', 'once horas', 'doce horas'];
  return t[n] || `${n} horas`;
}
function imagenDataUri_(prop) {
  const id = PROPS.getProperty(prop); if (!id) return '';
  try { const b = DriveApp.getFileById(id).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); }
  catch (e) { log_('imagenDataUri_', prop, e.message, null); return ''; }
}
function pdfConstancia_(datos) {
  const t = HtmlService.createTemplateFromFile('Constancia-bloque');
  Object.keys(datos).forEach(k => { t[k] = datos[k]; });
  if (!('firmantes' in datos)) t.firmantes = [];
  if (!('institucion' in datos)) t.institucion = '';
  const html = t.evaluate().getContent();
  return Utilities.newBlob(html, 'text/html', 'constancia.html').getAs('application/pdf').setName('Constancia-' + datos.folio.replace(/\//g, '-') + '.pdf');
}
function datosBloque_(platica, usuario, folioConst) {
  const ini = new Date(platica.hora_inicio), fin = new Date(platica.hora_fin);
  const horas = Math.floor((fin - ini) / 3600000);
  const info = BLOQUE_INFO[String(platica.id_platica)] || { sede: platica.sede, recinto: 'la sede ' + platica.sede, sesiones: '' };
  const virtual = esPlaticaVirtual_(platica);
  return {
    tipo: 'bloque', nombre: usuario.nombre, institucion: usuario.institucion || '',
    sede: info.sede, recinto: info.recinto, fecha_larga: fechaLargaEs_(ini, true),
    horario: virtual ? `${horaCorta_(ini)} a ${horaCorta_(fin)} horas de Guadalajara` : `${horaCorta_(ini)} a ${horaCorta_(fin)} horas`,
    horas: horas, horas_txt: horasTexto_(horas), sesiones: info.sesiones, folio: folioConst,
    fecha_emision: fechaLargaEs_(new Date(), false),
    firma_src: imagenDataUri_('FIRMA_DIGITAL_FILE_ID'),
    logos: { udg: imagenDataUri_('LOGO_UDG_FILE_ID'), ca: imagenDataUri_('LOGO_CA_FILE_ID') },  // sin CUCEA (decisión del director)
    agua_src: imagenDataUri_('AGUA_FILE_ID')   // mapa de conexiones del Foro (img/marca/foro-mapa-conexiones-dorado.png); si falta, la plantilla usa el numeral IV
  };
}
/** emitirConstanciasBloque(idPlatica) — una constancia por cada check-in válido del bloque que aún no la tenga. */
function emitirConstanciasBloque(idPlatica) {
  const platica = buscarPlatica_(idPlatica); if (!platica) throw new Error('Plática no encontrada: ' + idPlatica);
  const sh = hoja_(CONST_BLOQUE_SHEET, ['folio_constancia', 'folio_asistente', 'id_platica', 'correo', 'horas', 'emitida', 'pdf_id', 'error']);
  const previas = sh.getDataRange().getValues().slice(1);
  const ya = {}; previas.forEach(r => { if (r[5] === true) ya[String(r[1]) + '|' + String(r[2])] = true; });
  let consecutivo = previas.filter(r => String(r[2]) === String(idPlatica)).length;
  const ci = SS.getSheetByName(SHEETS.checkins).getDataRange().getValues().slice(1);
  const folios = []; const vistos = {};
  ci.forEach(r => { if (String(r[2]) === String(idPlatica) && r[6] === true && !vistos[r[1]]) { vistos[r[1]] = true; folios.push(String(r[1])); } });
  const carpeta = PROPS.getProperty('CONSTANCIAS_FOLDER_ID') ? DriveApp.getFolderById(PROPS.getProperty('CONSTANCIAS_FOLDER_ID')) : null;
  let emitidas = 0, fallidas = 0;
  folios.forEach((folio, i) => {
    if (ya[folio + '|' + String(idPlatica)]) return;
    const u = buscarUsuarioPorFolio_(folio); if (!u) return;
    u.correo = String(u.correo || '').toLowerCase().trim(); if (!u.correo) return;
    const usuario = u;
    consecutivo++;
    const folioConst = `IV-FIDDT-BLQ/UDG/2026-${idPlatica}-${String(consecutivo).padStart(4, '0')}`;
    try {
      const datos = datosBloque_(platica, { nombre: usuario.nombre_completo || usuario.nombre || '', institucion: usuario.institucion || '' }, folioConst);
      const pdf = pdfConstancia_(datos);
      const archivo = carpeta ? carpeta.createFile(pdf) : null;
      MailApp.sendEmail({
        to: u.correo,
        subject: `Constancia de asistencia · ${datos.sede} · IV Foro Internacional de Derecho y Tecnología`,
        htmlBody: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0E1B2C;line-height:1.6">
          <p>Hola, ${escapeHtml_(datos.nombre)}.</p>
          <p>Gracias por acompañarnos en el bloque <strong>${escapeHtml_(datos.sede)} · ${escapeHtml_(datos.fecha_larga)}</strong>. Adjuntamos tu constancia de asistencia por <strong>${datos.horas} horas</strong>, firmada por el Director del Foro.</p>
          <p>Al cierre del Foro, quienes acumulen al menos 10 horas verificadas recibirán además la constancia con valor curricular.</p>
          <p>Cualquier aclaración: <a href="mailto:contacto@forodyt.com">contacto@forodyt.com</a>, indicando el folio ${escapeHtml_(folioConst)}.</p>
          <hr style="border:0;border-top:1px solid rgba(14,27,44,.14);margin:24px 0">
          <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(14,27,44,.5);font-family:'Courier New',monospace">Cuerpo Académico UDG-CA-1236 · Derecho y Tecnología · Universidad de Guadalajara</div></div>`,
        attachments: [pdf], name: PROPS.getProperty('SENDER_NAME') || 'IV Foro Internacional de Derecho y Tecnología'
      });
      sh.appendRow([folioConst, folio, String(idPlatica), u.correo, datos.horas, true, archivo ? archivo.getId() : '', '']); emitidas++;
    } catch (e) { sh.appendRow([folioConst, folio, String(idPlatica), u.correo, '', false, '', e.message]); fallidas++; }
    if ((i + 1) % 40 === 0) Utilities.sleep(1500);
  });
  log_('emitirConstanciasBloque', String(idPlatica), `emitidas=${emitidas} fallidas=${fallidas}`, null);
  return { emitidas, fallidas };
}
/** cerrarBloque() — manejador de los disparadores: cierra todo bloque cuya hora de fin + 60 min ya pasó y aún no se emitió. */
function cerrarBloque() {
  const ahora = Date.now(); const cfg = leerConfig_(); const margen = (Number(cfg.tolerancia_fin_min) || 60) * 60000;
  const cerrados = String(PROPS.getProperty('BLOQUES_CERRADOS') || '').split(',').filter(Boolean);
  Object.keys(BLOQUE_INFO).forEach(id => {
    if (cerrados.indexOf(id) !== -1) return;
    const pl = buscarPlatica_(id); if (!pl) return;
    if (new Date(pl.hora_fin).getTime() + margen > ahora) return;
    consolidarStream();                       // asistencia por transmisión (incluye la regla laxa del bloque 5)
    const r = emitirConstanciasBloque(id);
    cerrados.push(id); PROPS.setProperty('BLOQUES_CERRADOS', cerrados.join(','));
    log_('cerrarBloque', id, JSON.stringify(r), null);
  });
}
function instalarDisparadoresBloques() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'cerrarBloque').forEach(t => ScriptApp.deleteTrigger(t));
  PLATICAS_IV.forEach(p => {
    const fin = new Date(new Date(p.hora_fin).getTime() + 60 * 60000);
    ScriptApp.newTrigger('cerrarBloque').timeBased().at(fin).create();
    Logger.log(`Disparador cerrarBloque para el bloque ${p.id_platica} a las ${fin.toISOString()}`);
  });
}
/** _testConstanciaBloque() — manda al DIRECTOR_EMAIL una constancia de muestra del bloque 1 sin tocar las hojas. */
function _testConstanciaBloque() {
  const pl = buscarPlatica_(1) || { id_platica: 1, sede: 'cucea', nombre_sesion: 'CUCEA', hora_inicio: '2026-09-21T09:00:00-06:00', hora_fin: '2026-09-21T14:10:00-06:00' };
  const datos = datosBloque_(pl, { nombre: 'Nombre Apellido Apellido', institucion: 'Universidad de Guadalajara' }, 'IV-FIDDT-BLQ/UDG/2026-1-0000');
  const pdf = pdfConstancia_(datos);
  MailApp.sendEmail({ to: PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL'), subject: 'PRUEBA · constancia por bloque', body: 'Muestra generada por _testConstanciaBloque().', attachments: [pdf] });
}

// ============ CIERRE AUTOMÁTICO DE LA JORNADA VIRTUAL ============
/**
 * cerrarJornadaVirtual() — consolida la asistencia por transmisión y emite las constancias de quienes
 * ya alcanzan un nivel (para la Jornada Virtual: 4 h = meta_horas_asistencia_minima → constancia de asistencia).
 * procesarConstancias() es idempotente por folio (constancia_enviada = TRUE), así que correrla el 18 no duplica
 * nada el 22: quien además asista a las sedes presenciales NO recibe una segunda constancia salvo que se
 * limpie su flag a mano (decisión del director; alternativa: dejar constancia_enviada y solo actualizar nivel).
 *
 * instalarDisparadorJornadaVirtual() la programa para el viernes 18 de septiembre de 2026 a las 11:40 (hora GDL),
 * media hora después del cierre del bloque 5. Correr UNA vez desde el editor; acepta los permisos de triggers.
 */
function cerrarJornadaVirtual() {
  // 2026-09-14: la Jornada Virtual se cierra como cualquier bloque (constancia del bloque 5 por 4 h);
  // la constancia con valor curricular (10 h) se emite con procesarConstancias() al cierre del Foro.
  const r = consolidarStream();
  const c = emitirConstanciasBloque(5);
  log_('cerrarJornadaVirtual', '5', `stream=${JSON.stringify(r)} constancias=${JSON.stringify(c)}`, null);
  return { stream: r, constancias: c };
}
function instalarDisparadorJornadaVirtual() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'cerrarJornadaVirtual').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cerrarJornadaVirtual').timeBased().at(new Date('2026-09-18T11:40:00-06:00')).create();
  Logger.log('Disparador creado: cerrarJornadaVirtual el 2026-09-18 11:40 (GDL).');
}
