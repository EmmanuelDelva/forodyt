/* @vercel/blob simulado: origen + caché CDN con vida (cacheControlMaxAge) y propagación
   diferida al sobrescribir (Vercel documenta hasta 60 s). Cuenta operaciones como el plan:
   simples = lecturas que NO salen de la caché (MISS o useCache:false); avanzadas = put(). */
const crypto = require('crypto');

const E = {
  origen: null,          // { cuerpo, etag, maxAge }
  cache: null,           // { cuerpo, etag, expira }
  purgaEn: 0,            // momento en que la caché se entera de la última sobrescritura
  retardoPropagacion: 45000,
  formatoPut: 'comillas', // 'comillas' | 'sin' (put devuelve la ETag sin comillas)
  simples: 0, avanzadas: 0,
  reloj: 0,
  ahora() { return this.reloj; },
  reiniciar() { this.origen = null; this.cache = null; this.purgaEn = 0; this.simples = 0; this.avanzadas = 0; this.reloj = 1e12; this.formatoPut = 'comillas'; }
};
E.reiniciar();

function limpia(e) { return String(e || '').replace(/^W\//, '').replace(/"/g, ''); }
function respuesta(x) {
  return { statusCode: 200, stream: new Response(x.cuerpo).body, headers: new Headers(), blob: { etag: x.etag, pathname: 'comite/mesa.json' } };
}

async function get(ruta, opts) {
  if (!opts || (opts.access !== 'private' && opts.access !== 'public')) throw new Error('access requerido');
  const t = E.ahora();
  if (opts.useCache === false) {           // lectura de origen: siempre cuenta
    E.simples++;
    return E.origen ? respuesta(E.origen) : null;
  }
  if (E.cache && E.purgaEn && t >= E.purgaEn) { E.cache = null; E.purgaEn = 0; }   // la sobrescritura ya propagó
  if (E.cache && t < E.cache.expira) return respuesta(E.cache);                    // HIT: no cuenta
  E.simples++;                                                                     // MISS: cuenta
  if (!E.origen) { E.cache = null; return null; }
  E.cache = { cuerpo: E.origen.cuerpo, etag: E.origen.etag, expira: t + E.origen.maxAge * 1000 };
  E.purgaEn = 0;
  return respuesta(E.cache);
}

async function put(ruta, cuerpo, opts) {
  E.avanzadas++;
  if (opts.ifMatch) {
    if (!E.origen || limpia(E.origen.etag) !== limpia(opts.ifMatch)) throw new Error('Vercel Blob: Precondition failed (412): ETag mismatch');
  } else if (opts.allowOverwrite === false && E.origen) {
    throw new Error('Vercel Blob: This blob already exists');
  }
  // latencia real: deja que otras peticiones se intercalen (para la prueba de concurrencia)
  await new Promise(function (r) { setImmediate(r); });
  if (opts.ifMatch && limpia(E.origen.etag) !== limpia(opts.ifMatch)) throw new Error('Vercel Blob: Precondition failed (412): ETag mismatch');
  const etag = '"' + crypto.randomBytes(8).toString('hex') + '"';
  E.origen = { cuerpo: String(cuerpo), etag: etag, maxAge: opts.cacheControlMaxAge || 2592000 };
  if (E.cache) E.purgaEn = E.ahora() + E.retardoPropagacion;
  return { etag: E.formatoPut === 'sin' ? etag.replace(/"/g, '') : etag, pathname: ruta, url: 'https://x.private.blob.vercel-storage.com/' + ruta };
}

module.exports = { get: get, put: put, __estado: E };
