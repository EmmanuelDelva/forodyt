/* Prueba de comiteorganizador.html en Chromium con reloj controlado:
   sondeo cada 60 s, pausa tras 5 min sin actividad, reanudación, pestaña oculta y errores.
   Uso (Node 18+ y playwright):  node _tools/comite/prueba-pagina.js
   Las capturas del indicador «En pausa» quedan en la carpeta temporal del sistema. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), Module = require('module');
const mock = require('./mock-blob.js'); const E = mock.__estado;
const cargaOriginal = Module._load;
Module._load = function (p) { if (p === '@vercel/blob') return mock; return cargaOriginal.apply(this, arguments); };
process.env.COMITE_CLAVE = 'prueba';
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_prueba_123';
const RAIZ = path.resolve(__dirname, '../..');
const handler = require(path.join(RAIZ, 'api/comite.js'));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

E.reiniciar(); E.ahora = function () { return Date.now(); };
const srv = http.createServer(function (req, res) {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/comite') { req.query = Object.fromEntries(u.searchParams); return handler(req, res); }
  let f = u.pathname === '/comiteorganizador' ? '/comiteorganizador.html' : decodeURIComponent(u.pathname);
  const ruta = path.join(RAIZ, f);
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.statusCode = 404; return res.end('no'); }
  res.setHeader('Content-Type', TIPOS[path.extname(ruta)] || 'application/octet-stream');
  fs.createReadStream(ruta).pipe(res);
});

let fallas = 0, pasadas = 0;
function ok(c, m) { if (c) { pasadas++; console.log('  ✓ ' + m); } else { fallas++; console.log('  ✗ ' + m); } }

srv.listen(0, async function () {
  const puerto = srv.address().port, BASE = 'http://localhost:' + puerto;
  const { chromium } = require('playwright');
  const nav = await chromium.launch();
  const errores = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce' });
    await ctx.route(/^https?:\/\/(?!localhost)/, function (r) { r.abort(); });   // sin red externa (fuentes, etc.)
    const p = await ctx.newPage();
    p.on('pageerror', function (e) { errores.push('pageerror: ' + e.message); });
    p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errores.push('console: ' + m.text()); });
    const sondeos = [];
    p.on('request', function (r) { if (/\/api\/comite\?desde=/.test(r.url())) sondeos.push(r.url()); });

    await p.clock.install({ time: new Date('2026-09-26T10:00:00-06:00') });
    await p.goto(BASE + '/comiteorganizador');
    await p.fill('#inUsuario', 'emmanuel'); await p.fill('#inClave', 'prueba');
    await p.click('#btnEntrar');
    await p.waitForSelector('#app:not([hidden]) header.cabeza .sync', { timeout: 15000 });
    const texto = function () { return p.$eval('header.cabeza .sync', function (s) { return s.textContent.trim() + '|' + s.className; }); };
    async function avanzar(ms) { await p.clock.runFor(ms); await p.waitForTimeout(250); }

    console.log('\n1) Intervalo');
    ok(sondeos.length === 0, 'al entrar no hay sondeo inmediato (la carga ya trajo los datos)');
    await avanzar(59000);
    ok(sondeos.length === 0, 'a los 59 s todavía no sondea');
    await avanzar(1500);
    ok(sondeos.length === 1, 'a los 60 s sondea (1)');
    ok((await texto()).startsWith('Sincronizado|'), 'indicador: Sincronizado');

    console.log('\n2) Pausa por inactividad (5 min)');
    await avanzar(3 * 60000);
    ok(sondeos.length === 4, 'sigue sondeando cada minuto mientras no pasen 5 min sin actividad (' + sondeos.length + ')');
    await avanzar(2 * 60000);
    const n1 = sondeos.length;
    ok(n1 === 4 || n1 === 5, 'al cumplirse los 5 min deja de sondear (' + n1 + ' sondeos)');
    ok(/^En pausa\|.*pausa/.test(await texto()), 'indicador: En pausa (' + (await texto()) + ')');
    const titulo = await p.$eval('header.cabeza .sync', function (s) { return s.title; });
    ok(/reanuda sola/.test(titulo), 'el indicador explica la pausa al pasar el ratón');
    await avanzar(20 * 60000);
    ok(sondeos.length === n1, '20 min más en pausa: 0 sondeos');
    await p.screenshot({ path: path.join(os.tmpdir(), 'mesa-pausa-escritorio.png'), clip: { x: 900, y: 0, width: 466, height: 260 } });

    console.log('\n3) Reanudación');
    await p.mouse.move(400, 400); await p.mouse.move(420, 410); await p.waitForTimeout(400);
    ok(sondeos.length === n1 + 1, 'al mover el ratón sondea enseguida');
    ok((await texto()).startsWith('Sincronizado|'), 'indicador vuelve a Sincronizado');
    await avanzar(60000);
    ok(sondeos.length === n1 + 2, 'y sigue cada minuto');

    console.log('\n4) Pestaña oculta');
    await p.evaluate(function () { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return true; } }); document.dispatchEvent(new Event('visibilitychange')); });
    const n2 = sondeos.length;
    await avanzar(10 * 60000);
    ok(sondeos.length === n2, 'con la pestaña oculta no sondea (10 min)');
    await p.evaluate(function () { Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return false; } }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(400);
    ok(sondeos.length === n2 + 1, 'al volver a la pestaña sondea enseguida');

    console.log('\n5) Cambios de otra persona llegan al sondear');
    // otra persona (Jorge) guarda directamente contra el servidor
    const cj = await new Promise(function (resolve) {
      const rq = http.request({ port: puerto, path: '/api/comite', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Comite': '1' } }, function (rs) { resolve(String(rs.headers['set-cookie']).split(';')[0]); rs.resume(); });
      rq.end(JSON.stringify({ accion: 'entrar', usuario: 'jorge', clave: 'prueba' }));
    });
    await new Promise(function (resolve) {
      const rq = http.request({ port: puerto, path: '/api/comite', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Comite': '1', cookie: cj } }, function (rs) { rs.resume(); rs.on('end', resolve); });
      rq.end(JSON.stringify({ accion: 'guardar', col: 'temas', item: { titulo: 'Tema que propone Jorge', estado: 'abierto' } }));
    });
    E.purgaEn = Date.now();   // la caché ya se enteró (en producción, ≤ 60 s)
    await p.mouse.move(300, 300);
    await avanzar(61000);
    const hay = await p.evaluate(function () { return document.body.innerText.indexOf('Tema que propone Jorge') >= 0; });
    ok(hay, 'el tema de Jorge aparece en la mesa de Emmanuel');
    const tostadas = await p.$$eval('.tostada', function (t) { return t.map(function (x) { return x.textContent; }).join(' / '); });
    ok(/Jorge/.test(tostadas), 'y avisa con una tostada: «' + tostadas.slice(0, 60) + '…»');

    console.log('\n6) Móvil (390 px): indicador de la barra');
    const m = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await m.route(/^https?:\/\/(?!localhost)/, function (r) { r.abort(); });
    await m.addCookies(await ctx.cookies());
    const pm = await m.newPage();
    pm.on('pageerror', function (e) { errores.push('pageerror móvil: ' + e.message); });
    await pm.clock.install({ time: new Date('2026-09-26T12:00:00-06:00') });
    await pm.goto(BASE + '/comiteorganizador');
    await pm.waitForSelector('#app:not([hidden])', { timeout: 15000 });
    await pm.clock.runFor(7 * 60000); await pm.waitForTimeout(300);
    const cls = await pm.$eval('#syncMovil', function (s) { return s.className + '|' + s.title.slice(0, 20); });
    ok(/pausa/.test(cls), 'la barra móvil también marca la pausa (' + cls + ')');
    await pm.screenshot({ path: path.join(os.tmpdir(), 'mesa-pausa-movil.png'), clip: { x: 0, y: 0, width: 390, height: 70 } });

    console.log('\n7) Errores');
    ok(errores.length === 0, 'sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  } catch (e) { fallas++; console.error('EXCEPCIÓN', e); }
  await nav.close(); srv.close();
  console.log('\n' + pasadas + ' pasaron, ' + fallas + ' fallaron');
  process.exit(fallas ? 1 : 0);
});
