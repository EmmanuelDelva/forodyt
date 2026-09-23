/**
 * Cierre.gs — IV Foro Internacional de Derecho y Tecnología · correo de cierre + constancia general de asistencia.
 *
 * Envía a CADA persona inscrita (pestaña Usuarios, un envío por correo aunque se haya inscrito dos veces) un correo
 * de agradecimiento con su constancia general de asistencia en PDF, firmada por el Director del Foro y el Secretario
 * Académico. Además trae las herramientas para los correos que rebotaron por la cuota de smtp2go.
 *
 * Va a TODAS las personas inscritas, no solo a las escaneadas: hubo problemas para escanear en las sedes (decisión
 * del director, 2026-09-23). Las horas dependen de la MODALIDAD con que se inscribió (columna «modalidad» de
 * Usuarios): presencial 14 h, sin las horas en línea; virtual y mixta 18 h, el evento completo. Ver
 * CIERRE_MODALIDADES.
 *
 * Requiere en el mismo proyecto: Code.gs y Asistencia.gs (versión del 2026-09-23 o posterior: DEFAULTS_CONSTANCIA_),
 * y los archivos HTML Constancia-bloque y Correo-cierre.
 *
 * Script Properties que usa:
 *   FIRMA_DIGITAL_FILE_ID   firma del Director (ya instalada el 17-sep)
 *   FIRMA_LEOS_FILE_ID      firma del Dr. Jorge Antonio Leos Navarro (PNG con fondo transparente). La crea
 *                           prepararCierre(): copia la original (FIRMA_LEOS_ORIGEN_ID, compartida con esta cuenta)
 *                           a _recursos. Si falta, su columna sale con la línea en blanco: NO enviar sin ella.
 *   LOGO_UDG_FILE_ID · LOGO_CA_FILE_ID · LOGO_FORO_FILE_ID · AGUA_FILE_ID   (instalarRecursosConstancia() los crea)
 *   CIERRE_FECHA            (opcional) «AAAA-MM-DD HH:MM» en hora de Guadalajara, para programarCierre()
 *   CIERRE_EXCLUIR          (opcional) folios o correos separados por coma que NO deben recibirlo (pruebas)
 *   MODO_ENVIO              "mailapp" (default) o "alias" — ver Code.gs. Con smtp2go agotado, dejar "mailapp".
 *
 * Orden de uso (desde el editor, botón Ejecutar):
 *   1. prepararCierre()               → logos (LOGO_FORO_FILE_ID), copia de la firma del Secretario Académico y
 *                                        lectura de prueba de las seis imágenes. Debe terminar con "listo": true.
 *   2. _reporteRebotes()             → cuenta y lista lo que no llegó por smtp2go (pestaña Rebotes). NO envía.
 *   3. _previewCierre()               → te manda a ti el correo y la constancia de muestra. Revisarlos.
 *   4. _reporteCierre()               → cuántas personas lo recibirán, cuota del día, envíos programados.
 *   5a. programarCierre()             → programa el envío a la hora de CIERRE_FECHA, o
 *   5b. enviarCierre()                → envía ya.
 *   El envío va por tandas de ~4 min (límite de 6 min de Apps Script): si queda gente, se reprograma solo a los
 *   2 minutos; si se acaba la cuota diaria, a las 6 horas. Al terminar te llega un resumen. Es idempotente: quien
 *   ya lo recibió (pestaña CierreEnvios, estado «enviado») no lo vuelve a recibir.
 *   cancelarCierre() quita cualquier envío programado.
 *   reenviarConstanciasRebotadas()   → reenvía, desde la cuenta del script, las constancias por bloque que rebotaron.
 */

const CIERRE_SHEET = 'CierreEnvios';
const CIERRE_REBOTES_SHEET = 'Rebotes';
const CIERRE = {
  asunto: 'Gracias por acompañarnos · IV Foro Internacional de Derecho y Tecnología',
  nombreRemitente: 'IV Foro Internacional de Derecho y Tecnología',
  firma2: { nombre: 'Dr. Jorge Antonio Leos Navarro', cargo: 'Secretario Académico', sub: 'IV Foro Internacional de Derecho y Tecnología' },
  prefijoFolio: 'IV-FIDDT-GEN/UDG/2026-',
  minutosPorTanda: 4,
  cuotaMinima: 15
};
/**
 * Firma original del Secretario Académico: Drive de Gmail del director, «05- Firma Digital (Canon) / Terceros»,
 * compartida como lectora con la cuenta CUCEA (2026-09-23). prepararCierre() hace una copia en _recursos para que el
 * envío no dependa de que siga compartida. El id no da acceso por sí solo.
 */
const FIRMA_LEOS_ORIGEN_ID = '1toMWjYmcQFQfXyfMCKtTacXZyTiNJgf-';
/**
 * Minutos del programa definitivo (programa-data.json): CUCEA 310 · CUGDL 165 · Cineteca 205 · Ciudad Judicial 165
 * = 845 presenciales; Jornada Virtual del 18: 252. Las horas se cierran a horas completas (director, 2026-09-23):
 * presencial 845 min = 14.08 h → 14 h; evento completo 1 097 min = 18.28 h → 18 h. La persona inscrita como
 * presencial NO suma las horas en línea; virtual y mixta suman el evento completo, porque las cuatro sedes se
 * transmitieron. Una modalidad vacía o desconocida cuenta como presencial, que es lo que registra Code.gs por defecto.
 */
const CIERRE_MINUTOS_PRESENCIAL = 845;
const CIERRE_MINUTOS_EVENTO = CIERRE_MINUTOS_PRESENCIAL + 252;   // + Jornada Virtual del 18
const CIERRE_MODALIDADES = {
  presencial: {
    minutos: CIERRE_MINUTOS_PRESENCIAL,
    etiqueta: 'Presencial',
    asistente: 'asistente presencial',
    celebrada: 'en las sesiones celebradas los días 21 y 22 de septiembre de 2026 en Guadalajara y Zapopan, Jalisco',
    fechas: '21 y 22 de septiembre de 2026',
    sedes: 'CUCEA · CUGDL · Cineteca FICG · Ciudad Judicial',
    correo: 'presencial'
  },
  virtual: {
    minutos: CIERRE_MINUTOS_EVENTO,
    etiqueta: 'En línea',
    asistente: 'asistente en línea',
    celebrada: 'celebrada los días 18, 21 y 22 de septiembre de 2026, a través de la transmisión oficial del Foro',
    fechas: '18, 21 y 22 de septiembre de 2026',
    sedes: 'Jornada Virtual Internacional y transmisión de las cuatro sedes',
    correo: 'en línea'
  },
  mixta: {
    minutos: CIERRE_MINUTOS_EVENTO,
    etiqueta: 'Mixta',
    asistente: 'asistente en modalidad mixta',
    celebrada: 'celebrada los días 18, 21 y 22 de septiembre de 2026 en Guadalajara y Zapopan, Jalisco, y en línea',
    fechas: '18, 21 y 22 de septiembre de 2026',
    sedes: 'CUCEA · CUGDL · Cineteca FICG · Ciudad Judicial · En línea',
    correo: 'mixta (presencial y en línea)'
  }
};
/** Horas completas: se trunca, nunca se redondea hacia arriba (no se acredita una hora que no se cumplió). */
function horasCompletas_(minutos) { return Math.floor(minutos / 60); }
function modalidadCierre_(valor) {
  const m = String(valor || '').toLowerCase().trim();
  return CIERRE_MODALIDADES[m] ? m : 'presencial';
}

// ─────────────────────────────────────────────────────────── destinatarios
function nombreBonito_(s) {
  // Solo se toca un nombre escrito todo en minúsculas o todo en mayúsculas; si la persona lo escribió con
  // mayúsculas y minúsculas, se respeta tal cual (apellidos compuestos, «McGregor», etc.).
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t || (t !== t.toLowerCase() && t !== t.toUpperCase())) return t;
  const menores = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'dos', 'van', 'von'];
  return t.toLowerCase().split(' ').map((w, i) => (i > 0 && menores.indexOf(w) !== -1) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function destinatariosCierre_() {
  const data = SS.getSheetByName(SHEETS.usuarios).getDataRange().getValues();
  const h = data[0];
  const iF = h.indexOf('folio'), iC = h.indexOf('correo'), iN = h.indexOf('nombre_completo'), iI = h.indexOf('institucion'),
        iM = h.indexOf('modalidad');
  const excluir = String(PROPS.getProperty('CIERRE_EXCLUIR') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const vistos = {}, lista = [];
  for (let i = 1; i < data.length; i++) {
    const correo = String(data[i][iC] || '').toLowerCase().trim();
    if (!correo || !isEmailValid_(correo) || vistos[correo]) continue;
    const folio = String(data[i][iF] || '').trim();
    if (excluir.indexOf(correo) !== -1 || excluir.indexOf(folio.toLowerCase()) !== -1) continue;
    vistos[correo] = true;
    lista.push({ correo: correo, folio: folio, nombre: nombreBonito_(data[i][iN]), institucion: String(data[i][iI] || '').trim(),
                 modalidad: modalidadCierre_(iM === -1 ? '' : data[i][iM]) });
  }
  return lista;   // el orden de la hoja es estable: el folio de constancia sale de la posición en esta lista
}
function registroCierre_() {
  return hoja_(CIERRE_SHEET, ['correo', 'folio_inscripcion', 'folio_constancia', 'nombre', 'estado', 'via', 'pdf_id', 'fecha', 'error', 'modalidad', 'horas']);
}
function enviadosCierre_(sh) {
  const m = {};
  sh.getDataRange().getValues().slice(1).forEach(r => { if (String(r[4]) === 'enviado') m[String(r[0]).toLowerCase()] = true; });
  return m;
}

// ─────────────────────────────────────────────────────────── constancia y correo
function recursosCierre_() {
  return {
    firma_src: imagenDataUri_('FIRMA_DIGITAL_FILE_ID'),
    firma2_src: imagenDataUri_('FIRMA_LEOS_FILE_ID'),
    logos: { udg: imagenDataUri_('LOGO_UDG_FILE_ID'), ca: imagenDataUri_('LOGO_CA_FILE_ID'), foro: imagenDataUri_('LOGO_FORO_FILE_ID') },
    agua_src: imagenDataUri_('AGUA_FILE_ID')
  };
}
function faltantesCierre_() {
  return ['FIRMA_DIGITAL_FILE_ID', 'FIRMA_LEOS_FILE_ID', 'LOGO_UDG_FILE_ID', 'LOGO_CA_FILE_ID', 'LOGO_FORO_FILE_ID', 'AGUA_FILE_ID']
    .filter(k => !PROPS.getProperty(k));
}
function datosCierre_(p, folioConst, rec) {
  const m = CIERRE_MODALIDADES[modalidadCierre_(p.modalidad)];
  const horas = horasCompletas_(m.minutos);
  return Object.assign({
    tipo: 'general', nombre: p.nombre, institucion: p.institucion || '', folio: folioConst,
    fecha_emision: fechaLargaEs_(new Date(), false),
    asistente_txt: m.asistente, celebrada_txt: m.celebrada,
    fechas_txt: m.fechas, modalidad_txt: m.etiqueta, sedes_txt: m.sedes,
    horas: horas, horas_txt: horasTexto_(horas),
    firma2_nombre: CIERRE.firma2.nombre, firma2_cargo: CIERRE.firma2.cargo, firma2_sub: CIERRE.firma2.sub
  }, rec);
}
function htmlCorreoCierre_(p, folio) {
  const m = CIERRE_MODALIDADES[modalidadCierre_(p.modalidad)];
  const horas = horasCompletas_(m.minutos);
  const t = HtmlService.createTemplateFromFile('Correo-cierre');
  t.nombre = p.nombre; t.folio = folio;
  t.horas_evento_txt = horasTexto_(horasCompletas_(CIERRE_MINUTOS_EVENTO));
  t.modalidad_correo = m.correo;
  t.horas_correo = horasTexto_(horas) + ' (' + horas + ' h)';
  return t.evaluate().getContent();
}
/** Sale con MailApp (cuenta del script, respuesta a contacto@forodyt.com) salvo MODO_ENVIO = alias. */
function enviarCorreoCierre_(to, asunto, html, adjuntos) {
  const opciones = { htmlBody: html, name: CIERRE.nombreRemitente, replyTo: remitente_(), attachments: adjuntos || [] };
  const texto = textoPlano_(html);
  if (modoEnvio_() === 'alias' && aliasDisponible_(remitente_())) {
    opciones.from = remitente_();
    GmailApp.sendEmail(to, asunto, texto, opciones);
    return 'alias';
  }
  MailApp.sendEmail(Object.assign({ to: to, subject: asunto, body: texto }, opciones));
  return 'mailapp';
}
function carpetaCierre_() {
  const id = PROPS.getProperty('CONSTANCIAS_FOLDER_ID'); if (!id) return null;
  try {
    const base = DriveApp.getFolderById(id); const nombre = 'Constancias de cierre (asistencia general)';
    const it = base.getFoldersByName(nombre); return it.hasNext() ? it.next() : base.createFolder(nombre);
  } catch (e) { log_('carpetaCierre_', id, e.message, null); return null; }
}

// ─────────────────────────────────────────────────────────── administración
/**
 * prepararCierre() — correr UNA vez antes de la vista previa. Deja todo listo en esta cuenta (la CUCEA):
 *   · logos, marca de agua y carpeta de constancias (instalarRecursosConstancia, no toca lo que ya existe);
 *   · FIRMA_LEOS_FILE_ID: copia la firma original del Secretario Académico, compartida con esta cuenta, a la
 *     carpeta _recursos, para que el envío no dependa de que el archivo siga compartido;
 *   · lee de verdad las seis imágenes: un id sin acceso daría constancias sin firma sin avisar.
 * Termina con "listo": true cuando no falta nada.
 */
function prepararCierre() {
  const inst = instalarRecursosConstancia();
  const r = { carpeta: inst.carpeta, recursos: inst.recursos, firma_director: inst.firma };
  let idLeos = PROPS.getProperty('FIRMA_LEOS_FILE_ID');
  if (idLeos) { try { DriveApp.getFileById(idLeos).getName(); } catch (e) { idLeos = ''; } }
  if (idLeos) r.firma_secretario = 'ya estaba';
  else {
    try {
      const carpeta = DriveApp.getFolderById(PROPS.getProperty('CONSTANCIAS_FOLDER_ID'));
      const it = carpeta.getFoldersByName('_recursos');
      const destino = it.hasNext() ? it.next() : carpeta.createFolder('_recursos');
      const copia = DriveApp.getFileById(FIRMA_LEOS_ORIGEN_ID).makeCopy('firma-digital-leos-navarro-black.png', destino);
      PROPS.setProperty('FIRMA_LEOS_FILE_ID', copia.getId());
      r.firma_secretario = 'copiada a _recursos';
    } catch (e) {
      r.firma_secretario = 'SIN ACCESO a la firma original (' + FIRMA_LEOS_ORIGEN_ID + '): compártela con esta cuenta. ' + e.message;
    }
  }
  r.lectura = {};
  ['FIRMA_DIGITAL_FILE_ID', 'FIRMA_LEOS_FILE_ID', 'LOGO_UDG_FILE_ID', 'LOGO_CA_FILE_ID', 'LOGO_FORO_FILE_ID', 'AGUA_FILE_ID']
    .forEach(k => { r.lectura[k] = imagenDataUri_(k) ? 'ok' : 'FALTA o SIN ACCESO'; });
  r.modo_envio = modoEnvio_();
  r.listo = Object.keys(r.lectura).every(k => r.lectura[k] === 'ok');
  log_('prepararCierre', 'Drive', JSON.stringify(r), null);
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}
function _reporteCierre() {
  const lista = destinatariosCierre_(); const ya = enviadosCierre_(registroCierre_());
  const pendientes = lista.filter(p => !ya[p.correo]).length;
  const programados = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'enviarCierre').length;
  const porModalidad = {};
  lista.forEach(p => {
    const k = p.modalidad + ' (' + horasCompletas_(CIERRE_MODALIDADES[p.modalidad].minutos) + ' h)';
    porModalidad[k] = (porModalidad[k] || 0) + 1;
  });
  const r = {
    destinatarios_unicos: lista.length, por_modalidad: porModalidad, ya_enviados: lista.length - pendientes, pendientes: pendientes,
    cuota_mailapp_hoy: MailApp.getRemainingDailyQuota(), envios_programados: programados,
    modo_envio: modoEnvio_(), faltan_propiedades: faltantesCierre_()
  };
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}

function _previewCierre() {
  const destino = String(PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL')).toLowerCase().trim();
  const lista = destinatariosCierre_();
  const yo = lista.filter(p => p.correo === destino)[0] || { correo: destino, folio: '', nombre: 'Juan Emmanuel Delva Benavides', institucion: 'Universidad de Guadalajara', modalidad: 'presencial' };
  const folio = CIERRE.prefijoFolio + '0000';
  // una constancia de muestra por modalidad, las tres a nombre del director
  const rec = recursosCierre_();
  const pdfs = Object.keys(CIERRE_MODALIDADES).map(m =>
    pdfConstancia_(datosCierre_(Object.assign({}, yo, { modalidad: m }), folio, rec)).setName('PRUEBA-constancia-cierre-' + m + '.pdf'));
  const faltan = faltantesCierre_();
  const cuenta = {}; lista.forEach(p => { cuenta[p.modalidad] = (cuenta[p.modalidad] || 0) + 1; });
  const aviso = '<div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;background:#FFF4D6;border:1px solid #B8923E;padding:12px 16px;margin:0 0 12px">'
    + '<b>PRUEBA · no se ha enviado a nadie más.</b> Así lo recibirán <b>' + lista.length + '</b> personas (correos únicos de Usuarios): '
    + Object.keys(CIERRE_MODALIDADES).map(m => (cuenta[m] || 0) + ' ' + m + ' (' + horasCompletas_(CIERRE_MODALIDADES[m].minutos) + ' h)').join(' · ') + '.'
    + '<br>Van adjuntas las tres constancias de muestra; este texto es el de tu modalidad (' + escapeHtml_(yo.modalidad) + ').'
    + (faltan.length ? '<br>Faltan en Script Properties: <b>' + faltan.join(', ') + '</b>' : '<br>Todas las firmas y logos están instalados.')
    + '</div>';
  enviarCorreoCierre_(destino, '[PRUEBA] ' + CIERRE.asunto, aviso + htmlCorreoCierre_(yo, folio), pdfs);
  const carpeta = carpetaCierre_();
  if (carpeta) pdfs.forEach(pdf => Logger.log('Muestra guardada: ' + carpeta.createFile(pdf.copyBlob()).getUrl()));
  Logger.log('Muestra enviada a ' + destino + '. Faltan: ' + (faltan.join(', ') || 'nada'));
  _reporteCierre();
}

/** programarCierre() — programa enviarCierre() a la hora de CIERRE_FECHA («AAAA-MM-DD HH:MM», hora de Guadalajara). */
function programarCierre(fechaHora) {
  const txt = String(fechaHora || PROPS.getProperty('CIERRE_FECHA') || '').trim();
  const m = txt.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) throw new Error('Pon CIERRE_FECHA en Script Properties con el formato «2026-09-24 09:00» (hora de Guadalajara)');
  const cuando = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-06:00`);   // Jalisco: UTC-6 todo el año desde 2022
  if (cuando.getTime() < Date.now() + 60000) throw new Error('Esa hora ya pasó o es inmediata: usa enviarCierre()');
  if (faltantesCierre_().indexOf('FIRMA_LEOS_FILE_ID') !== -1) Logger.log('OJO: falta FIRMA_LEOS_FILE_ID; la firma del Secretario Académico saldría en blanco.');
  cancelarCierre();
  ScriptApp.newTrigger('enviarCierre').timeBased().at(cuando).create();
  Logger.log('Envío programado para ' + Utilities.formatDate(cuando, TZ, "EEEE d 'de' MMMM, HH:mm") + ' (Guadalajara)');
  _reporteCierre();
}
function cancelarCierre() {
  let n = 0;
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'enviarCierre').forEach(t => { ScriptApp.deleteTrigger(t); n++; });
  Logger.log('Envíos programados cancelados: ' + n);
}

/** enviarCierre() — una tanda de envíos. Se reprograma sola hasta terminar. */
function enviarCierre() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) { Logger.log('Ya hay una tanda en curso.'); return; }
  try {
    // los disparadores de un solo uso siguen listados tras dispararse: se limpian para no pasar del límite de 20
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'enviarCierre').forEach(t => ScriptApp.deleteTrigger(t));
    const inicio = Date.now();
    const sh = registroCierre_(); const ya = enviadosCierre_(sh);
    const lista = destinatariosCierre_(); const rec = recursosCierre_(); const carpeta = carpetaCierre_();
    let enviados = 0, errores = 0, pausa = '';
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      if (ya[p.correo]) continue;
      if (Date.now() - inicio > CIERRE.minutosPorTanda * 60000) { pausa = 'tiempo'; break; }
      if (MailApp.getRemainingDailyQuota() < CIERRE.cuotaMinima) { pausa = 'cuota'; break; }
      const folioConst = CIERRE.prefijoFolio + String(i + 1).padStart(4, '0');
      const horas = horasCompletas_(CIERRE_MODALIDADES[p.modalidad].minutos);
      try {
        const pdf = pdfConstancia_(datosCierre_(p, folioConst, rec));
        const archivo = carpeta ? carpeta.createFile(pdf.copyBlob()) : null;
        const via = enviarCorreoCierre_(p.correo, CIERRE.asunto, htmlCorreoCierre_(p, folioConst), [pdf]);
        sh.appendRow([p.correo, p.folio, folioConst, p.nombre, 'enviado', via, archivo ? archivo.getId() : '', new Date(), '', p.modalidad, horas]);
        ya[p.correo] = true; enviados++;
      } catch (e) {
        sh.appendRow([p.correo, p.folio, folioConst, p.nombre, 'error', '', '', new Date(), e.message, p.modalidad, horas]); errores++;
      }
    }
    const pendientes = lista.filter(p => !ya[p.correo]).length;
    if (pendientes && pausa) {
      const espera = pausa === 'tiempo' ? 2 * 60000 : 6 * 3600000;
      ScriptApp.newTrigger('enviarCierre').timeBased().after(espera).create();
    }
    log_('enviarCierre', pausa || 'fin', `enviados=${enviados} errores=${errores} pendientes=${pendientes}`, null);
    Logger.log(`Tanda: ${enviados} enviados, ${errores} con error, ${pendientes} pendientes${pausa ? ' (sigue sola: ' + pausa + ')' : ''}.`);
    if (!pausa) resumenCierre_(lista.length, pendientes);
  } finally { lock.releaseLock(); }
}
function resumenCierre_(total, pendientes) {
  const filas = registroCierre_().getDataRange().getValues().slice(1);
  const ok = {}; filas.forEach(r => { if (String(r[4]) === 'enviado') ok[String(r[0]).toLowerCase()] = true; });
  const errores = filas.filter(r => String(r[4]) === 'error' && !ok[String(r[0]).toLowerCase()]);
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6">
    <p><b>Correo de cierre del IV Foro: envío terminado.</b></p>
    <p>Destinatarios: ${total} · Enviados: ${Object.keys(ok).length} · Sin enviar: ${pendientes}</p>
    ${errores.length ? '<p>No se pudo enviar a:</p><ul>' + errores.map(r => `<li>${escapeHtml_(r[0])} — ${escapeHtml_(r[8])}</li>`).join('') + '</ul><p>Para reintentarlos basta con volver a correr enviarCierre().</p>' : ''}
    <p>Detalle en la pestaña ${CIERRE_SHEET}.</p></div>`;
  MailApp.sendEmail({ to: PROPS.getProperty('DIRECTOR_EMAIL') || PROPS.getProperty('SENDER_EMAIL'), subject: 'Resumen · correo de cierre del IV Foro', htmlBody: html, body: textoPlano_(html) });
}

// ─────────────────────────────────────────────────────────── rebotes de smtp2go
/**
 * _reporteRebotes() — busca en el buzón de esta cuenta los rebotes («Mail Delivery Subsystem») de los últimos
 * 60 días y los apunta en la pestaña Rebotes: a quién no llegó, qué correo era y por qué. NO envía nada.
 * El motivo típico es «552 Your monthly email allowance is exhausted» (cuota mensual de smtp2go agotada).
 */
function _reporteRebotes() {
  const sh = hoja_(CIERRE_REBOTES_SHEET, ['id_mensaje', 'fecha', 'destinatario', 'asunto', 'motivo', 'tipo', 'reenviado']);
  const previos = {}; sh.getDataRange().getValues().slice(1).forEach(r => { previos[String(r[0])] = true; });
  const propios = [String(Session.getEffectiveUser().getEmail() || '').toLowerCase(), remitente_().toLowerCase()];
  const hilos = GmailApp.search('from:mailer-daemon newer_than:60d', 0, 300);
  const cuenta = { constancia_bloque: 0, qr: 0, otro: 0 }; let nuevos = 0, sinDestinatario = 0;
  hilos.forEach(hilo => {
    const asunto = hilo.getFirstMessageSubject();
    hilo.getMessages().forEach(m => {
      if (!/mailer-daemon/i.test(m.getFrom()) || previos[m.getId()]) return;
      const raw = m.getRawContent();
      const candidatos = [];
      [/^X-Failed-Recipients:\s*(.+)$/gmi, /^Final-Recipient:\s*rfc822;\s*(.+)$/gmi, /^To:\s*(.+)$/gmi].forEach(re => {
        let x; while ((x = re.exec(raw))) (x[1].match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).forEach(c => candidatos.push(c.toLowerCase()));
      });
      const dest = candidatos.filter(c => propios.indexOf(c) === -1 && !/mailer-daemon|googlemail\.com$/.test(c))[0] || '';
      if (!dest) sinDestinatario++;
      const motivo = (raw.match(/\b5\d\d[ -][^\r\n]{3,120}/) || ['rebote'])[0].trim();
      const tipo = /constancia de asistencia/i.test(asunto) ? 'constancia_bloque' : (/credencial|qr|inscrip|registro/i.test(asunto) ? 'qr' : 'otro');
      sh.appendRow([m.getId(), m.getDate(), dest, asunto, motivo, tipo, false]);
      previos[m.getId()] = true; cuenta[tipo]++; nuevos++;
    });
  });
  const r = { rebotes_nuevos: nuevos, por_tipo: cuenta, sin_destinatario_identificado: sinDestinatario, pestaña: CIERRE_REBOTES_SHEET };
  log_('_reporteRebotes', 'gmail', JSON.stringify(r), null);
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}

/**
 * reenviarConstanciasRebotadas() — para cada persona con una constancia por bloque rebotada (pestaña Rebotes),
 * reenvía TODAS sus constancias por bloque guardadas en Drive (pestaña ConstanciasBloque, columna pdf_id), por
 * MailApp. Marca «reenviado» para no repetir. Correr después de _reporteRebotes().
 */
function reenviarConstanciasRebotadas() {
  const rb = SS.getSheetByName(CIERRE_REBOTES_SHEET);
  if (!rb) { Logger.log('Corre primero _reporteRebotes().'); return; }
  const filas = rb.getDataRange().getValues();
  const cb = SS.getSheetByName(CONST_BLOQUE_SHEET);
  const bloque = cb ? cb.getDataRange().getValues().slice(1) : [];
  const inicio = Date.now(); const hechos = {}; let personas = 0, pdfs = 0, sinPdf = 0;
  for (let i = 1; i < filas.length; i++) {
    const dest = String(filas[i][2] || '').toLowerCase(); const tipo = filas[i][5];
    if (tipo !== 'constancia_bloque' || esTrue_(filas[i][6]) || !dest) continue;
    if (Date.now() - inicio > 4.5 * 60000 || MailApp.getRemainingDailyQuota() < CIERRE.cuotaMinima) { Logger.log('Pausa (tiempo o cuota): vuelve a correrla.'); break; }
    if (!hechos[dest]) {
      const suyas = bloque.filter(r => String(r[3]).toLowerCase() === dest && r[5] === true && r[6]);
      if (!suyas.length) { sinPdf++; hechos[dest] = 'sin_pdf'; }
      else {
        const adjuntos = suyas.map(r => DriveApp.getFileById(String(r[6])).getBlob());
        const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0E1B2C;line-height:1.6">
          <p>Hola:</p><p>Te reenviamos tu${suyas.length > 1 ? 's constancias' : ' constancia'} de asistencia por bloque del IV Foro Internacional de Derecho y Tecnología. El envío original no llegó por un problema de nuestro servidor de correo; una disculpa.</p>
          <p>Folio${suyas.length > 1 ? 's' : ''}: ${suyas.map(r => escapeHtml_(r[0])).join(', ')}</p>
          <p>Cualquier aclaración: <a href="mailto:contacto@forodyt.com">contacto@forodyt.com</a>.</p></div>`;
        enviarCorreoCierre_(dest, 'Constancia de asistencia (reenvío) · IV Foro Internacional de Derecho y Tecnología', html, adjuntos);
        hechos[dest] = 'ok'; personas++; pdfs += adjuntos.length;
      }
    }
    rb.getRange(i + 1, 7).setValue(hechos[dest] === 'ok' ? true : hechos[dest]);
  }
  const r = { personas: personas, constancias_reenviadas: pdfs, sin_pdf_en_drive: sinPdf };
  log_('reenviarConstanciasRebotadas', 'mailapp', JSON.stringify(r), null);
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}
