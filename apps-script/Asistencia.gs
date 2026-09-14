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
 *   4. Pestaña Platicas: dar de alta los 5 bloques del programa definitivo con estos id (deben coincidir con staff-scanner.html y programa-data.json):
 *        1 CUCEA · lun 21 · 09:00–14:10  |  2 CUGDL · lun 21 · 16:05–18:50  |  3 Cineteca FICG · mar 22 · 10:05–13:30
 *        4 Ciudad Judicial · mar 22 · 16:00–18:45  |  5 Jornada Virtual · vie 18 · 07:00–11:00 (hora GDL)
 *   5. En en-vivo.html poner MODO_PRUEBA = false.
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
function buscarUsuarioPorFolio_(folio) {
  const sheet = SS.getSheetByName(SHEETS.usuarios);
  const data = sheet.getDataRange().getValues();
  const h = data[0]; const iF = h.indexOf('folio'), iC = h.indexOf('correo'), iN = h.indexOf('nombre_completo');
  for (let i = 1; i < data.length; i++) if (String(data[i][iF]).toUpperCase() === folio) return { folio: data[i][iF], correo: String(data[i][iC]).toLowerCase(), nombre: data[i][iN] };
  return null;
}

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
 * Acredita con >= umbral_stream_porcentaje (default 75) y, si hubo códigos en la plática, >= 1 correcto.
 */
function consolidarStream() {
  const config = leerConfig_();
  const umbral = (Number(config.umbral_stream_porcentaje) || Number(config.umbral_zoom_porcentaje) || 75) / 100;
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
    const okCodigo = !platicasConCodigo[id] || codigoOk[k];
    if (pct >= umbral && okCodigo) { registrarCheckinFila_(folio, id, 'web@forodyt.com', true, '', 'web_stream'); validos++; }
    else { registrarCheckinFila_(folio, id, 'web@forodyt.com', false, pct < umbral ? 'porcentaje_insuficiente' : 'sin_codigo_presencia', 'web_stream'); rechazados++; }
  });
  log_('consolidarStream', 'todas', `validos=${validos} rechazados=${rechazados}`, null);
  return { validos, rechazados };
}
