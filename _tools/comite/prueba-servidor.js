/* Pruebas de api/comite.js con un @vercel/blob simulado (origen + caché CDN).
   Uso (Node 18+):  node _tools/comite/prueba-servidor.js
   Cubre: siembra, sondeos desde la caché, propagación de cambios, ETag con y sin comillas,
   caducidad de la caché, 6 escrituras simultáneas, sesiones y el consumo de una jornada. */
const path = require('path');
const Module = require('module');
const mock = require('./mock-blob.js');
const E = mock.__estado;

const cargaOriginal = Module._load;
Module._load = function (peticion) { if (peticion === '@vercel/blob') return mock; return cargaOriginal.apply(this, arguments); };

process.env.COMITE_CLAVE = 'prueba';
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_prueba_123';

const NUEVO = require(path.resolve(__dirname, '../../api/comite.js'));

let fallas = 0, pasadas = 0;
function ok(cond, msg) { if (cond) { pasadas++; console.log('  ✓ ' + msg); } else { fallas++; console.log('  ✗ ' + msg); } }

function llamar(h, o) {
  o = o || {};
  return new Promise(function (resolve, reject) {
    const req = { method: o.method || 'GET', query: o.query || {}, headers: { cookie: o.cookie || '' }, body: o.body || null };
    if (req.method === 'POST') req.headers['x-comite'] = '1';
    const res = {
      statusCode: 200, h: {},
      setHeader(k, v) { this.h[k.toLowerCase()] = v; },
      end(txt) { resolve({ status: this.statusCode, h: this.h, j: JSON.parse(txt || '{}') }); }
    };
    Promise.resolve(h(req, res)).catch(reject);
  });
}
async function entrar(h, u) {
  const r = await llamar(h, { method: 'POST', body: { accion: 'entrar', usuario: u, clave: 'prueba' } });
  if (r.status !== 200) throw new Error('no entra ' + u + ' ' + JSON.stringify(r.j));
  return String(r.h['set-cookie']).split(';')[0];
}
const MIN = 60000;

(async function () {
  /* ───────── 1. comportamiento ───────── */
  console.log('\n1) Carga inicial, sondeos y escrituras (versión nueva)');
  E.reiniciar();
  const ca = await entrar(NUEVO, 'emmanuel'), cb = await entrar(NUEVO, 'jorge');
  let r = await llamar(NUEVO, { cookie: ca });
  ok(r.status === 200 && r.j.almacen === true && r.j.datos && r.j.datos.temas.length === 6, 'la carga inicial siembra mesa.json y devuelve el contenido inicial');
  let eA = r.j.etag, s0 = E.simples;
  ok(E.avanzadas === 1, 'la siembra es una sola escritura');

  r = await llamar(NUEVO, { cookie: ca, query: { desde: eA } });
  ok(r.j.sinCambios === true, 'primer sondeo sin cambios → sinCambios');
  ok(E.simples === s0 + 1, 'el primer sondeo llena la caché (1 lectura)');
  s0 = E.simples;
  for (let i = 0; i < 30; i++) { E.reloj += MIN; r = await llamar(NUEVO, { cookie: ca, query: { desde: eA } }); }
  ok(r.j.sinCambios === true && E.simples === s0, '30 sondeos seguidos sin cambios salen de la caché: 0 lecturas');

  // B entra y guarda un tema
  r = await llamar(NUEVO, { cookie: cb }); let eB = r.j.etag;
  s0 = E.simples;
  r = await llamar(NUEVO, { method: 'POST', cookie: cb, body: { accion: 'guardar', col: 'temas', item: { titulo: 'Tema de prueba', estado: 'abierto' } } });
  ok(r.j.ok === true && r.j.datos.temas[0].titulo === 'Tema de prueba', 'Jorge guarda un tema');
  eB = r.j.etag;
  ok(E.simples === s0 + 1, 'guardar hace una sola lectura (en fresco, por la ETag)');

  // Jorge sondea enseguida: la caché aún trae la versión anterior → se lee en fresco y coincide
  E.reloj += 5000; s0 = E.simples;
  r = await llamar(NUEVO, { cookie: cb, query: { desde: eB } });
  ok(r.j.sinCambios === true, 'Jorge, justo después de guardar: sinCambios (no retrocede a la versión vieja)');
  ok(E.simples === s0 + 1, '…a costa de una lectura en fresco');

  // Emmanuel sondea antes de que la caché se entere: no ve el cambio todavía
  r = await llamar(NUEVO, { cookie: ca, query: { desde: eA } });
  ok(r.j.sinCambios === true, 'Emmanuel, antes de la propagación (<60 s): todavía no lo ve');
  // …y después sí
  E.reloj += 60000;
  r = await llamar(NUEVO, { cookie: ca, query: { desde: eA } });
  ok(!r.j.sinCambios && r.j.datos && r.j.datos.temas[0].titulo === 'Tema de prueba', 'Emmanuel, pasada la propagación: recibe el tema nuevo');
  eA = r.j.etag;
  ok(r.j.datos.actividad[0].quien === 'jorge' && r.j.datos.actividad[0].que === 'agregó', 'la actividad registra a Jorge');
  s0 = E.simples;
  for (let i = 0; i < 10; i++) { E.reloj += MIN; await llamar(NUEVO, { cookie: ca, query: { desde: eA } }); await llamar(NUEVO, { cookie: cb, query: { desde: eB } }); }
  ok(E.simples - s0 <= 2, 'con los dos al día, 20 sondeos más cuestan ≤ 2 lecturas (' + (E.simples - s0) + ')');

  console.log('\n2) ETag de put() sin comillas (formato distinto al de get())');
  E.formatoPut = 'sin';
  r = await llamar(NUEVO, { method: 'POST', cookie: cb, body: { accion: 'comentar', col: 'temas', id: r.j.datos ? r.j.datos.temas[0].id : (await llamar(NUEVO, { cookie: cb })).j.datos.temas[0].id, texto: 'Comentario' } });
  ok(r.j.ok === true, 'Jorge comenta');
  eB = r.j.etag;
  E.reloj += 70000;
  await llamar(NUEVO, { cookie: cb, query: { desde: eB } });
  s0 = E.simples;
  for (let i = 0; i < 5; i++) { E.reloj += MIN; r = await llamar(NUEVO, { cookie: cb, query: { desde: eB } }); }
  ok(r.j.sinCambios === true && E.simples === s0, 'las ETag se comparan sin comillas: no hay lecturas de más');
  E.formatoPut = 'comillas';

  console.log('\n3) Caducidad de la caché (1 h)');
  r = await llamar(NUEVO, { cookie: ca }); eA = r.j.etag;
  E.reloj += 2 * MIN; await llamar(NUEVO, { cookie: ca, query: { desde: eA } });
  s0 = E.simples;
  for (let i = 0; i < 120; i++) { E.reloj += MIN; await llamar(NUEVO, { cookie: ca, query: { desde: eA } }); }
  ok(E.simples - s0 === 2, '2 h de sondeo por minuto sin cambios = 2 lecturas (una por hora): ' + (E.simples - s0));

  console.log('\n4) Concurrencia: 6 escrituras simultáneas');
  const cs = await entrar(NUEVO, 'said');
  const antes = (await llamar(NUEVO, { cookie: cs })).j.datos;
  const res6 = await Promise.all([0, 1, 2, 3, 4, 5].map(function (i) {
    return llamar(NUEVO, { method: 'POST', cookie: cs, body: { accion: 'guardar', col: 'acuerdos', item: { acuerdo: 'Acuerdo simultáneo ' + i, fecha: '2026-09-25' } } });
  }));
  const fin = (await llamar(NUEVO, { cookie: cs })).j.datos;
  ok(res6.every(function (x) { return x.j.ok; }), 'las 6 escrituras responden ok');
  ok(fin.acuerdos.length === antes.acuerdos.length + 6 && fin.version === antes.version + 6, 'no se pierde ninguna (acuerdos +6, versión +6)');

  console.log('\n5) Sesiones y errores');
  r = await llamar(NUEVO, { query: { desde: 'x' } });
  ok(r.status === 401, 'sin cookie → 401 (no toca el almacén)');
  const guardado = mock.get;
  mock.get = async function (ruta, o) { if (o.useCache !== false) throw new Error('CDN caído'); return guardado(ruta, o); };
  r = await llamar(NUEVO, { cookie: ca, query: { desde: 'etag-vieja' } });
  ok(r.status === 200 && r.j.datos, 'si la lectura en caché falla, el sondeo cae a la lectura en fresco');
  mock.get = guardado;

  /* ───────── 2. consumo: antes vs después ───────── */
  console.log('\n6) Consumo en una jornada de 8 h con dos personas activas y un cambio cada 30 min');
  async function jornada(h, intervalo) {
    E.reiniciar();
    const k = { a: await entrar(h, 'emmanuel'), b: await entrar(h, 'jorge') }, et = {};
    for (const u of ['a', 'b']) et[u] = (await llamar(h, { cookie: k[u] })).j.etag;
    const s = E.simples, v = E.avanzadas, t0 = E.reloj, eventos = [];
    for (let t = intervalo; t <= 8 * 3600000; t += intervalo) { eventos.push([t, 'a']); eventos.push([t + 7000, 'b']); }
    for (let t = 30 * MIN; t <= 8 * 3600000; t += 30 * MIN) eventos.push([t + 3000, 'w']);
    eventos.sort(function (x, y) { return x[0] - y[0]; });
    let n = 0;
    for (const ev of eventos) {
      E.reloj = t0 + ev[0];
      if (ev[1] === 'w') {
        const r = await llamar(h, { method: 'POST', cookie: k.b, body: { accion: 'guardar', col: 'pendientes', item: { titulo: 'Pendiente ' + (++n), estado: 'por_hacer' } } });
        et.b = r.j.etag;
      } else {
        const r = await llamar(h, { cookie: k[ev[1]], query: { desde: et[ev[1]] } });
        if (!r.j.sinCambios && r.j.etag) et[ev[1]] = r.j.etag;
      }
    }
    return { lecturas: E.simples - s, escrituras: E.avanzadas - v, sondeos: eventos.filter(function (e) { return e[1] !== 'w'; }).length };
  }
  const d = await jornada(NUEVO, 60000);
  const base = 2 * (8 * 3600000 / 15000);   // la versión anterior: sondeo cada 15 s y cada sondeo leía en fresco
  console.log('   versión anterior (cada 15 s, sin caché): ' + base + ' lecturas o más');
  console.log('   ahora (cada 60 s, con caché): ' + d.sondeos + ' sondeos → ' + d.lecturas + ' lecturas, ' + d.escrituras + ' escrituras');
  console.log('   horas de uso de dos personas que caben en 10 000 lecturas: antes ≈ ' + Math.round(10000 / base * 8) + ' h, ahora ≈ ' + Math.round(10000 / d.lecturas * 8) + ' h');
  ok(d.lecturas * 10 < base, 'el consumo baja más de 10 veces');

  console.log('\n' + pasadas + ' pasaron, ' + fallas + ' fallaron');
  process.exit(fallas ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
