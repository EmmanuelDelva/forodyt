/*
 * Mesa del comité organizador — servicio de datos de /comiteorganizador
 *
 * Todo lo que el comité escribe (temas, pendientes, ponentes, sedes, acuerdos,
 * enlaces) vive en UN documento JSON privado de Vercel Blob: comite/mesa.json.
 * Las escrituras usan la ETag del documento (ifMatch) y, si otra persona guardó
 * a la vez, se vuelve a leer y a aplicar el cambio: nadie pisa a nadie.
 *
 * Consumo del plan Hobby (10 000 lecturas y 2 000 escrituras al mes; si se rebasan,
 * Vercel bloquea el almacén hasta 30 días). Solo cuentan las lecturas que no salen
 * de la caché de Vercel. Por eso:
 *   - la carga inicial y toda escritura leen «en fresco» (useCache: false), porque
 *     necesitan la ETag vigente;
 *   - los sondeos de la página (GET ?desde=<etag>) miran primero la copia en caché,
 *     que no cuenta; solo si difiere de lo que ya tiene el navegador se lee en fresco.
 *   La copia en caché dura hasta CACHE_SEG; al sobrescribir, Vercel la renueva en
 *   60 s como máximo, así que los cambios de otros se ven en uno o dos minutos.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   COMITE_CLAVE           clave común de acceso (obligatoria)
 *   COMITE_CLAVE_<USUARIO> clave propia de una persona, p. ej. COMITE_CLAVE_JORGE (opcional)
 *   BLOB_READ_WRITE_TOKEN  la pone Vercel al conectar el almacén Blob al proyecto
 *
 * Las claves NO se guardan en el repositorio.
 */
const crypto = require('crypto');

const USUARIOS = {
  emmanuel: { nombre: 'Juan Emmanuel Delva Benavides', corto: 'Emmanuel', tit: 'Dr.', rol: 'Director del Foro', foto: 'img/ponentes/juan-delva-benavides.jpg' },
  jorge:    { nombre: 'Jorge Antonio Leos Navarro', corto: 'Jorge', tit: 'Dr.', rol: 'Secretaría Académica', foto: 'img/ponentes/jorge-leos-navarro.jpg' },
  said:     { nombre: 'Iván Said González López', corto: 'Said', tit: 'Mtro.', rol: 'Tecnología y Logística', foto: 'img/ponentes/ivan-gonzalez-lopez.jpg' },
  cesar:    { nombre: 'César Romero Güemez', corto: 'César', tit: 'Mtro.', rol: 'Secretaría Técnica', foto: 'img/comite/cesar-romero.png' },
  paul:     { nombre: 'Alejandro Paul García Hernández', corto: 'Paul', tit: 'Dr.', rol: 'Coordinación Editorial y Comité Científico', foto: 'img/ponentes/paul-garcia-hernandez.jpg' }
};

const COLECCIONES = ['temas', 'pendientes', 'ponentes', 'sedes', 'acuerdos', 'enlaces'];
const RUTA = 'comite/mesa.json';
const COOKIE = 'fdc';
const DURACION = 30 * 24 * 3600; // 30 días
const MAX_TEXTO = 6000;
const MAX_ACTIVIDAD = 250;
const CACHE_SEG = 3600; // vida de la copia de mesa.json en la caché de Vercel (1 h)

/* ───────── utilidades ───────── */
function sha(s) { return crypto.createHash('sha256').update(String(s)).digest(); }
function b64u(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function llaveFirma() { return sha('forodyt-comite|' + (process.env.COMITE_CLAVE || '') + '|' + (process.env.BLOB_READ_WRITE_TOKEN || '')); }
function firmar(txt) { return b64u(crypto.createHmac('sha256', llaveFirma()).update(txt).digest()); }
function iguales(a, b) { const x = sha(a), y = sha(b); return crypto.timingSafeEqual(x, y); }
function ahora() { return new Date().toISOString(); }
function nuevoId() { return Date.now().toString(36) + crypto.randomBytes(4).toString('hex'); }
function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function leerCookie(req) {
  const h = req.headers.cookie || '';
  const m = h.split(/;\s*/).find(function (p) { return p.indexOf(COOKIE + '=') === 0; });
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : '';
}
function sesion(req) {
  const v = leerCookie(req); if (!v) return null;
  const partes = v.split('.'); if (partes.length !== 3) return null;
  const [u, exp, firma] = partes;
  if (!USUARIOS[u] || !(+exp > Date.now() / 1000)) return null;
  if (!iguales(firma, firmar(u + '.' + exp))) return null;
  return u;
}
function ponerCookie(res, valor, maxAge) {
  res.setHeader('Set-Cookie', COOKIE + '=' + encodeURIComponent(valor) + '; Path=/api/comite; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge);
}
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(obj));
}
async function cuerpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const trozos = []; for await (const t of req) trozos.push(t);
  try { return JSON.parse(Buffer.concat(trozos).toString('utf8') || '{}'); } catch (e) { return {}; }
}

/* limpia lo que manda el navegador: solo textos, números, booleanos y listas de textos */
function limpiar(item) {
  const out = {};
  Object.keys(item || {}).slice(0, 40).forEach(function (k) {
    if (!/^[a-z_]{1,32}$/.test(k)) return;
    if (['id', 'creado', 'creado_por', 'editado', 'editado_por', 'comentarios', 'apoyos'].indexOf(k) >= 0) return;
    const v = item[k];
    if (typeof v === 'string') out[k] = v.slice(0, MAX_TEXTO);
    else if (typeof v === 'number' && isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter(function (x) { return typeof x === 'string'; }).slice(0, 20).map(function (x) { return x.slice(0, 200); });
  });
  return out;
}

/* ───────── almacén ───────── */
function blob() { return require('@vercel/blob'); }
function hayAlmacen() { return !!process.env.BLOB_READ_WRITE_TOKEN; }

/* lectura en fresco (sin caché): la versión vigente, con la ETag que exigen las escrituras */
async function leer() {
  const r = await blob().get(RUTA, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  const txt = await new Response(r.stream).text();
  return { datos: JSON.parse(txt), etag: r.blob.etag };
}
/* ETag de la copia en caché de Vercel: un acierto de caché no cuenta como lectura del plan.
   Solo interesa la ETag, así que el cuerpo no se descarga. */
async function etagEnCache() {
  const r = await blob().get(RUTA, { access: 'private' });
  if (!r || r.statusCode !== 200) return '';
  try { await r.stream.cancel(); } catch (e) { /* sin cuerpo que cancelar */ }
  return r.blob.etag || '';
}
/* la ETag de put() y la de get() pueden diferir solo en comillas o en el prefijo W/ */
function limpiaEtag(e) { return String(e || '').replace(/^W\//, '').replace(/"/g, ''); }
function mismaEtag(a, b) { return !!a && !!b && limpiaEtag(a) === limpiaEtag(b); }
async function escribir(datos, etag) {
  const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: CACHE_SEG };
  if (etag) opts.ifMatch = etag; else opts.allowOverwrite = false;
  const r = await blob().put(RUTA, JSON.stringify(datos), opts);
  return r.etag;
}
async function leerOSembrar() {
  let d = await leer();
  if (d) return d;
  try { await escribir(semilla(), null); } catch (e) { /* otra persona la sembró a la vez */ }
  return await leer();
}
/* aplica un cambio sobre la versión más reciente; reintenta si otra persona guardó entre medio */
async function cambiar(fn) {
  for (let i = 0; i < 6; i++) {
    const d = await leerOSembrar();
    const resultado = fn(d.datos);
    if (resultado && resultado.error) return resultado;
    d.datos.version = (d.datos.version || 0) + 1;
    d.datos.actualizado = ahora();
    try {
      const etag = await escribir(d.datos, d.etag);
      return { ok: true, datos: d.datos, etag: etag, item: resultado && resultado.item };
    } catch (e) {
      const conflicto = /precondition|412|etag|modified/i.test(String(e && (e.message || e)));
      if (!conflicto) throw e;
      await espera(120 + Math.random() * 280);
    }
  }
  return { error: 'conflicto', mensaje: 'Varias personas guardaron a la vez. Intenta de nuevo.' };
}
function actividad(d, quien, que, col, item) {
  d.actividad = d.actividad || [];
  d.actividad.unshift({ quien: quien, que: que, col: col, id: item && item.id, titulo: item && (item.titulo || item.nombre || item.acuerdo || item.sede || ''), fecha: ahora() });
  d.actividad = d.actividad.slice(0, MAX_ACTIVIDAD);
}

/* ───────── manejador ───────── */
module.exports = async function (req, res) {
  try {
    if (!process.env.COMITE_CLAVE) return json(res, 503, { error: 'sin_clave', mensaje: 'Falta configurar COMITE_CLAVE en Vercel.' });

    if (req.method === 'GET') {
      const u = sesion(req);
      if (!u) return json(res, 401, { error: 'sin_sesion' });
      const base = { yo: u, usuarios: USUARIOS, colecciones: COLECCIONES };
      if (!hayAlmacen()) return json(res, 200, Object.assign(base, { almacen: false, datos: semilla(), etag: '' }));
      const desde = String((req.query && req.query.desde) || '');
      if (desde) {
        /* sondeo: si la copia en caché coincide con la del navegador, no hay nada nuevo (y no se gasta una lectura) */
        let enCache = '';
        try { enCache = await etagEnCache(); } catch (e) { /* si la caché falla, se lee en fresco */ }
        if (mismaEtag(enCache, desde)) return json(res, 200, { sinCambios: true, etag: desde });
      }
      const d = await leerOSembrar();
      if (mismaEtag(d.etag, desde)) return json(res, 200, { sinCambios: true, etag: d.etag });
      return json(res, 200, Object.assign(base, { almacen: true, datos: d.datos, etag: d.etag }));
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'metodo' });
    if (req.headers['x-comite'] !== '1') return json(res, 400, { error: 'encabezado' });
    const b = await cuerpo(req);

    if (b.accion === 'entrar') {
      const u = String(b.usuario || '').toLowerCase().trim();
      const clave = String(b.clave || '');
      const esperada = process.env['COMITE_CLAVE_' + u.toUpperCase()] || process.env.COMITE_CLAVE;
      if (!USUARIOS[u] || !iguales(clave, esperada)) { await espera(700); return json(res, 401, { error: 'credenciales', mensaje: 'Usuario o clave incorrectos.' }); }
      const exp = Math.floor(Date.now() / 1000) + DURACION;
      ponerCookie(res, u + '.' + exp + '.' + firmar(u + '.' + exp), DURACION);
      return json(res, 200, { ok: true, yo: u });
    }
    if (b.accion === 'salir') { ponerCookie(res, '', 0); return json(res, 200, { ok: true }); }

    const u = sesion(req);
    if (!u) return json(res, 401, { error: 'sin_sesion' });
    if (!hayAlmacen()) return json(res, 503, { error: 'sin_almacen', mensaje: 'El almacén de la mesa aún no está conectado.' });
    const col = String(b.col || '');
    if (COLECCIONES.indexOf(col) < 0) return json(res, 400, { error: 'coleccion' });

    let r;
    if (b.accion === 'guardar') {
      r = await cambiar(function (d) {
        d[col] = d[col] || [];
        const datos = limpiar(b.item);
        const id = b.item && b.item.id;
        let it = id ? d[col].find(function (x) { return x.id === id; }) : null;
        if (id && !it) return { error: 'no_existe', mensaje: 'Otra persona borró este elemento.' };
        if (it) { Object.assign(it, datos, { editado: ahora(), editado_por: u }); actividad(d, u, 'editó', col, it); }
        else { it = Object.assign({ id: nuevoId(), creado: ahora(), creado_por: u, comentarios: [], apoyos: [] }, datos); d[col].unshift(it); actividad(d, u, 'agregó', col, it); }
        return { item: it };
      });
    } else if (b.accion === 'borrar') {
      r = await cambiar(function (d) {
        const i = (d[col] || []).findIndex(function (x) { return x.id === b.id; });
        if (i < 0) return { error: 'no_existe' };
        const it = d[col].splice(i, 1)[0];
        actividad(d, u, 'borró', col, it);
        return { item: it };
      });
    } else if (b.accion === 'comentar') {
      const texto = String(b.texto || '').trim().slice(0, 2000);
      if (!texto) return json(res, 400, { error: 'vacio' });
      r = await cambiar(function (d) {
        const it = (d[col] || []).find(function (x) { return x.id === b.id; });
        if (!it) return { error: 'no_existe' };
        it.comentarios = it.comentarios || [];
        it.comentarios.push({ id: nuevoId(), autor: u, texto: texto, fecha: ahora() });
        actividad(d, u, 'comentó', col, it);
        return { item: it };
      });
    } else if (b.accion === 'apoyar') {
      r = await cambiar(function (d) {
        const it = (d[col] || []).find(function (x) { return x.id === b.id; });
        if (!it) return { error: 'no_existe' };
        it.apoyos = it.apoyos || [];
        const k = it.apoyos.indexOf(u);
        if (k >= 0) it.apoyos.splice(k, 1); else { it.apoyos.push(u); actividad(d, u, 'apoyó', col, it); }
        return { item: it };
      });
    } else {
      return json(res, 400, { error: 'accion' });
    }
    if (r.error) return json(res, r.error === 'conflicto' ? 409 : 400, r);
    return json(res, 200, { ok: true, datos: r.datos, etag: r.etag, item: r.item });
  } catch (e) {
    console.error('comite', e);
    return json(res, 500, { error: 'interno', mensaje: 'Algo falló al guardar. Intenta de nuevo.' });
  }
};

/* ───────── contenido inicial (solo si el documento no existe) ───────── */
function semilla() {
  const f = '2026-09-25T20:00:00.000Z';
  const base = function (o, quien) { return Object.assign({ id: nuevoId(), creado: f, creado_por: quien || 'emmanuel', comentarios: [], apoyos: [] }, o); };
  return {
    version: 1,
    actualizado: f,
    temas: [
      base({ titulo: 'Ejes temáticos de la V edición', estado: 'discusion', prioridad: 'alta', detalle: 'Propuesta de ocho ejes y dos líneas transversales con enfoque iberoamericano. Documento en el Drive: «V ForoDyT — Propuesta de ejes temáticos 2027». En el sitio siguen «en seco» hasta aprobarlos.', enlace: 'https://docs.google.com/document/d/1BtnPdTQ2kzI-OHyiDFpu5ApksVrANN2uEFCVFIc8HMA/edit' }),
      base({ titulo: 'Lema de la V edición', estado: 'abierto', prioridad: 'alta', detalle: 'Opciones de partida: «Lo sintético y lo humano: el Derecho iberoamericano ante la inteligencia que crea» · «El Derecho ante lo sintético» · «Actuar en nombre de otros: agentes, verdad y soberanía en la era de la IA».' }),
      base({ titulo: 'Sedes y fechas de 2027', estado: 'abierto', prioridad: 'alta', detalle: '¿Qué sedes repiten, cuáles se suman y en qué fechas? Ver la pestaña Sedes.' }),
      base({ titulo: 'Sesión en portugués o con Brasil y Portugal', estado: 'abierto', prioridad: 'media', detalle: 'Para ampliar el alcance iberoamericano de la V.' }),
      base({ titulo: 'Cargos del comité para 2027', estado: 'abierto', prioridad: 'media', detalle: 'Confirmar funciones de cada integrante para la V y fotos reales para el sitio.' }),
      base({ titulo: 'Aviso de privacidad de la inscripción de la V', estado: 'abierto', prioridad: 'media', detalle: 'Debe mencionar la base de asistentes y avisos de la V. Consultar con Transparencia de la UdeG.' })
    ],
    pendientes: [
      base({ titulo: 'Activar la base de asistentes de la V en la cuenta CUCEA', estado: 'por_hacer', responsable: 'emmanuel', prioridad: 'alta', detalle: 'Pegar Code.gs, ejecutar activarBaseV y publicar «Nueva versión» (RUNBOOK §8).' }),
      base({ titulo: 'Fotos reales del comité para el sitio', estado: 'por_hacer', responsable: 'emmanuel', prioridad: 'media', detalle: 'Hoy hay avatares ilustrados en la página del comité.' }),
      base({ titulo: 'Cortar las transmisiones de la IV por ponencia', estado: 'por_hacer', responsable: '', prioridad: 'media', detalle: 'Los capítulos de YouTube por sede ya están listos en el Drive.' }),
      base({ titulo: 'Grabación de Ciudad Judicial', estado: 'por_hacer', responsable: '', prioridad: 'media', detalle: 'Conseguir la grabación para la memoria en video de la IV.' }),
      base({ titulo: 'Correos de ponentes de las ediciones I a III', estado: 'por_hacer', responsable: 'emmanuel', prioridad: 'baja', detalle: 'Faltan 31 correos; la coordinación de esos años está en la cuenta CUCEA.' })
    ],
    ponentes: [],
    sedes: [
      base({ sede: 'CUCEA', institucion: 'Universidad de Guadalajara', espacio: 'Auditorio Lic. Raúl Padilla López', estado: 'explorar', notas: 'Sede inaugural de la IV (2026). ¿Repite en 2027?' }),
      base({ sede: 'CUGDL', institucion: 'Universidad de Guadalajara', espacio: 'Auditorio Salvador Allende', estado: 'explorar', notas: 'Sede de la IV (2026).' }),
      base({ sede: 'Cineteca FICG', institucion: 'Universidad de Guadalajara', espacio: 'Sala Guillermo del Toro', estado: 'explorar', notas: 'Sede de la IV (2026).' }),
      base({ sede: 'Ciudad Judicial', institucion: 'Poder Judicial del Estado de Jalisco', espacio: '', estado: 'explorar', notas: 'Sede de clausura de la IV (2026).' })
    ],
    acuerdos: [
      base({ acuerdo: 'Se publica el sitio de la V edición en forodyt.com.', fecha: '2026-09-25', reunion: 'Decisión del director' }),
      base({ acuerdo: 'Los ejes de la V quedan «en seco» hasta discutirlos con el comité y las sedes.', fecha: '2026-09-25', reunion: 'Decisión del director' }),
      base({ acuerdo: 'En la V los créditos son solo del Cuerpo Académico UDEG-CA-1236 «Derecho y Tecnología» · Universidad de Guadalajara.', fecha: '2026-09-25', reunion: 'Decisión del director' }),
      base({ acuerdo: 'El Foro suma 16 países con participación; Bolivia confirmada (II edición).', fecha: '2026-09-25', reunion: 'Decisión del director' })
    ],
    enlaces: [
      base({ titulo: 'Escáner QR del staff', url: '/staff-scanner.html', grupo: 'Día del evento', detalle: 'Registro de asistencia con el código QR. Pide la clave de staff.' }),
      base({ titulo: 'Guía del comité para el día del evento', url: '/registroscomite', grupo: 'Día del evento', detalle: 'Pasos, fallas comunes y mesa de registro.' }),
      base({ titulo: 'Bitácora del sitio y decisiones del director', url: 'https://docs.google.com/document/d/1waVRiWjGbe6pD7SodTaJihpfM_6zQsggkrlUI2i-0Js/edit', grupo: 'Drive' }),
      base({ titulo: 'Propuesta de ejes temáticos 2027', url: 'https://docs.google.com/document/d/1BtnPdTQ2kzI-OHyiDFpu5ApksVrANN2uEFCVFIc8HMA/edit', grupo: 'Drive' }),
      base({ titulo: 'Base de ponentes 2023–2026', url: 'https://docs.google.com/spreadsheets/d/1JOloCWikba7aaR--cM1q1XzPDLpsKuboAT8nBYf1gzQ/edit', grupo: 'Drive' }),
      base({ titulo: 'Base de asistentes y avisos 2027', url: 'https://docs.google.com/spreadsheets/d/19Kb-cE2sL47v9dlKAG7FIGsWdEhO-AtNh5ZUmsRBpx4/edit', grupo: 'Drive' }),
      base({ titulo: 'Capítulos de YouTube por sede (IV)', url: 'https://docs.google.com/document/d/1GuXwffFIieewUh9n-e_rtG9OJu58peuoJjEOAGiYPZQ/edit', grupo: 'Drive' }),
      base({ titulo: 'Memoria en video de la IV', url: '/en-vivo.html', grupo: 'Sitio' }),
      base({ titulo: 'Programa de la IV', url: '/programa-iv.html', grupo: 'Sitio' })
    ],
    actividad: []
  };
}
