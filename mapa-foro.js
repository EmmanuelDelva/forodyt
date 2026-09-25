/* ════════════════════════════════════════════════════════════════
   MAPA DE PUNTOS DEL FORO — módulo compartido
   El mapa punteado es un motivo estable de la serie. Este archivo
   reúne sus datos y su dibujo para que todas las páginas usen la
   misma fuente:

     window.ForoMapa = { MAPA, PAISES, ED_COLOR, ROMANOS, GDL, PUNTOS,
                         Mapa, contar, lista, ediciones }

   Datos
   · MAPA   — rejilla de 2° (filas alternas desplazadas medio paso).
              '.' = tierra; una letra = tierra de un país con voz en el
              Foro (la letra es su clave en PAISES).
   · PAISES — clave → { es, en, fr, ed: [ediciones] }.
              Para sumar un país: añadir su entrada aquí y regenerar las
              filas de MAPA con su letra. Mientras sus filas no lleven la
              letra, el país cuenta en cifras y listas pero no enciende
              puntos en el mapa.
   · ED_COLOR — color de cada edición (0 = todas).

   Dibujo
   · new Mapa(canvas, { modo, onda, tenue, etiqueta, recorte, primera })
       modo     0 = todas las ediciones · 1…4 = una edición
       onda     la tinta se extiende desde Guadalajara al animar
       tenue    opacidad de los puntos sin país (0–1)
       etiqueta rótulo «GUADALAJARA» junto al punto de la sede
       recorte  [lonMin, lonMax] o null para el mundo entero
       primera  (opcional) en modo 0, cada país toma el color de la
                edición en que se sumó, en lugar del cobre común
       atenuarGrandes (opcional, por omisión true) los países de más
                de 300 puntos (Rusia) se encienden más tenues
   · métodos: ajustar() · recortar(rc) · animar() · dibujar(prog)
              xy(p) · cerca(x, y) · estado(p)
   Es el mismo API que usaba la portada (index.html), para que pueda
   pasarse a este archivo sin cambios.
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var MAPA = {"step":2.0,"lat0":76.0,"lon0":-170.0,"cols":180,"rows":["                         ....  ..   .  .               .....................                                        sss             s ssssssss            s s","                       ....          ..                  .................                                      ss               ssssssssss                s","                       .. ..... .  ..    . .....          ................                                     ss       ss   s sssssssssssssssssssssss     sss s","    ........ .     . .    .........  ..    . ......       . ..............                    . ....              s   sss sssssssssssssssssssssssssssssssssssssssssss     s","ss................................................................................................ss      ss s            s                                                      sss","s.................................................................................................ss  sss                                                                      s","     .................................... ...    ....       .....         ...             ...... ....sss ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss","  ....................................        ...           ....                        ......  ....sssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss","  ....... .    .......................         ...             .                        .......      ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss   s","      .          ......................       ........                           kk        ..    ..ssssssssssssssssssssssssssssssssssssssssssssssssssssssss         ss","     .              ......................     ........                            k      ...   ....ssssssssssssssssssssssssssssssssssssssssssssssssssssss         ssss","                  . ........................ ...........                        ..  k    ............sssssssssssssss......sssssssssssssssssssssssssssssss s        ss","                     ........................ ............                      .. kkk  ...............sssssssssssss.........sssssssssssssssssssss...ssssssss       s","                     . .............................    .                             ..................sssss..................sss...s.....sss.ss....ssssss s","                       uuuuuuuuuuuuuuuuuuu..........    ...                        ......................ssss..........................................s.ss","                       uuuuuuuuuuuuuuuuuuuu.......u.. .                             ......ii........    sssss   ........................................ss","                       uuuuuuuuuuuuuuuuuuuuu...uuuu .                                ....i i .......     ssss  ........................................ss   ..","                       uuuuuuuuuuuuuuuuuuuu.uuuuuu                               eeeeee  . i   ....   .   ..s  .......................................","                       uuuuuuuuuuuuuuuuuuuuuuuuu                                 .eeee e     i ..  ...........  ................................. ...      .","                        uuuuuuuuuuuuuuuuuuuuuuu                                  eeee      ii   .  ..........   ................................    .","                         uuuuuuuuuuuuuuuuuuuuuu                                       .....            ...........................................   .    ..","                          uuuuuuuuuuuuuuuuuuuu                                    ........             ..........................................      .","                           mmuuuuuuuuuuuuuuuu                                    ............  ...     ...........................................","                           m mmmmuuuuuuu  uu                                    ............................. ....................................","                            m mmmmmmu       u                                  ............................... ...................................","                              mmmmmm        u                                 ........................ .......    ...............................","                              m mmmmm                                         .........................  ...... ..     .........................","                                mmmm         q                               ..........................  ..........     .......... ..........","                                 mmmm   mm     q                             ...........................  ........        .......   .......","                                  mmmmmmm     .    .                         ...........................  .......         .....     ......       .","                                     m m.                                    ............................  .....          ....        ......     .","                                       ....           .                      ............................. ..             ...         ......     ..","                                          ..     c.                          ..............................                ..            ...       .","                                          o    cc.....                        ................................             ..         .           .","                                              ncc.......                       ...............................               .         .           ..","                                              ccccc.....                        ...... ......................                          .       . . .","                                               ccccc........                              ...................                         . .     ..","                                              ccccc.........                              ..................                          ...    ...","                                             xxxcc...........                             .................                            ..   .... .","                                             xxrcc.............                           ...............                              ..   ...  .     .  .   .","                                             xrrrrc...............                         ..............                                .       ..      .....","                                            rrrr...................                        .............                                                  ....... .","                                              rrr...................                        .............                                    ..           ... .","                                              rrrr.................                         .............                                                      ..","                                               rrrr................                         ..............                                              .   .","                                               rrrr..............                          ..............    .                                      . ...   .","                                                rrr...............                         ...............  ..                                      ......  ..","                                                  ...............                          ............    ...                                    ............","                                                  l....p.........                           ...........     ..                                   ...............","                                                  l..app.........                           ...........    ..                                 ..................","                                                  llaaappp....                               ..........    ..                                 ...................","                                                  laaaaapp...                               .........                                         ....................","                                                  laaaaaaa...                                .........                                         ...................","                                                 laaaaaa....                                  ......                                          ....................","                                                  aaaaaa....                                   .....                                           .......  ..........","                                                 laaaaaa..                                    ...                                             ...         .......","                                                 laaaaaaa                                                                                                  ......           .","                                                laaaaaaa                                                                                                   .. .             ..","                                                 laaaa                                                                                                       . .             .","                                                 aaa                                                                                                          .            .","                                                 laaa                                                                                                                     .","                                               llaa                                                                                                                     ..","                                                 aaaa","                                                aaa","                                                 la","                                                  l",""]};

  var PAISES = {
    m: { es: 'México', en: 'Mexico', fr: 'Mexique', ed: [1, 2, 3, 4] },
    u: { es: 'Estados Unidos', en: 'United States', fr: 'États-Unis', ed: [1, 2] },
    e: { es: 'España', en: 'Spain', fr: 'Espagne', ed: [1, 2, 3, 4] },
    k: { es: 'Reino Unido', en: 'United Kingdom', fr: 'Royaume-Uni', ed: [1, 2] },
    a: { es: 'Argentina', en: 'Argentina', fr: 'Argentine', ed: [1, 2, 3, 4] },
    c: { es: 'Colombia', en: 'Colombia', fr: 'Colombie', ed: [1, 2, 3, 4] },
    p: { es: 'Paraguay', en: 'Paraguay', fr: 'Paraguay', ed: [1, 2, 3, 4] },
    q: { es: 'Cuba', en: 'Cuba', fr: 'Cuba', ed: [2, 3] },
    s: { es: 'Rusia', en: 'Russia', fr: 'Russie', ed: [2] },
    r: { es: 'Perú', en: 'Peru', fr: 'Pérou', ed: [3, 4] },
    o: { es: 'Costa Rica', en: 'Costa Rica', fr: 'Costa Rica', ed: [3, 4] },
    x: { es: 'Ecuador', en: 'Ecuador', fr: 'Équateur', ed: [4] },
    l: { es: 'Chile', en: 'Chile', fr: 'Chili', ed: [4] },
    n: { es: 'Panamá', en: 'Panama', fr: 'Panama', ed: [4] },
    i: { es: 'Italia', en: 'Italy', fr: 'Italie', ed: [4] }
  };

  var ED_COLOR = { 0: '#B85C3D', 1: '#2974C9', 2: '#8B3A4B', 3: '#3A8E89', 4: '#9C7A2E' };
  var ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V'];
  var GDL = { lon: -103.35, lat: 20.67 };

  /* ───── puntos de la rejilla ───── */
  var PUNTOS = [];
  var TAMANO = {};            // puntos por país
  var UMBRAL_GRANDE = 300;    // un país con más puntos que esto se dibuja más tenue
  (function construir() {
    if (!MAPA) return;
    var S = MAPA.step;
    MAPA.rows.forEach(function (fila, ri) {
      var off = (ri % 2) ? S / 2 : 0;
      for (var ci = 0; ci < fila.length; ci++) {
        var ch = fila.charAt(ci);
        if (ch === ' ') continue;
        var lon = MAPA.lon0 + ci * S + off, lat = MAPA.lat0 - ri * S;
        var dl = lon - GDL.lon, dL = lat - GDL.lat;
        var k = (ch === '.' || !PAISES[ch]) ? null : ch;
        if (k) TAMANO[k] = (TAMANO[k] || 0) + 1;
        PUNTOS.push({ c: ci + (ri % 2 ? 0.5 : 0), r: ri, lon: lon, lat: lat, k: k, d: Math.sqrt(dl * dl + dL * dL) });
      }
    });
  })();
  var COLS = MAPA ? MAPA.cols : 1, ROWS = MAPA ? MAPA.rows.length : 1;
  var GDL_CR = MAPA ? { c: (GDL.lon - MAPA.lon0) / MAPA.step, r: (MAPA.lat0 - GDL.lat) / MAPA.step } : null;

  /* ───── utilidades de datos (sin mapa) ───── */
  function claves(m) {
    var out = [];
    for (var k in PAISES) if (Object.prototype.hasOwnProperty.call(PAISES, k)) {
      if (!m || PAISES[k].ed.indexOf(m) >= 0) out.push(k);
    }
    return out;
  }
  // número de países con voz en la edición m (0 = en cualquier edición)
  function contar(m) { return claves(m).length; }
  // [{ k, nombre, ed }] ordenados alfabéticamente en el idioma pedido
  function lista(m, lang) {
    lang = lang || 'es';
    return claves(m).map(function (k) {
      return { k: k, nombre: PAISES[k][lang] || PAISES[k].es, ed: PAISES[k].ed.slice() };
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, lang); });
  }
  // ediciones registradas en PAISES (p. ej. [1, 2, 3, 4])
  function ediciones() {
    var s = {};
    for (var k in PAISES) PAISES[k].ed.forEach(function (e) { s[e] = 1; });
    return Object.keys(s).map(Number).sort(function (a, b) { return a - b; });
  }

  /* ───── el dibujo ───── */
  function Mapa(canvas, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.o = opts || {};
    if (this.o.tenue == null) this.o.tenue = 0.25;
    this.modo = this.o.modo || 0; this.t0 = 0; this.anim = 0; this.hover = null;
    this.prev = {};
    this.recortar(this.o.recorte || null);
    this.ajustar();
  }
  Mapa.prototype.recortar = function (rc) {
    this.o.recorte = rc;
    this.pts = rc ? PUNTOS.filter(function (p) { return p.lon >= rc[0] && p.lon <= rc[1]; }) : PUNTOS;
    this.c0 = (rc && MAPA) ? (rc[0] - MAPA.lon0) / MAPA.step : 0;
    this.cols = (rc && MAPA) ? (rc[1] - rc[0]) / MAPA.step + 1 : COLS;
  };
  Mapa.prototype.ajustar = function () {
    var r = this.cv.getBoundingClientRect(), dpr = Math.min(global.devicePixelRatio || 1, 2);
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paso = Math.min(this.w / (this.cols + 1), this.h / (ROWS + 1));
    this.ox = (this.w - this.paso * this.cols) / 2 - this.c0 * this.paso;
    this.oy = (this.h - this.paso * ROWS) / 2 + this.paso / 2;
    this.dibujar(1);
  };
  Mapa.prototype.xy = function (p) { return [this.ox + p.c * this.paso + this.paso / 2, this.oy + p.r * this.paso]; };
  // devuelve [color, radioRelativo, alpha]
  // Los países muy extensos (p. ej. Rusia) se encienden más tenues y con
  // puntos algo menores, para que su superficie no domine el mapa.
  Mapa.prototype.estado = function (p) {
    if (!p.k) return [null, 0.22, 1];
    var ed = PAISES[p.k].ed, m = this.modo;
    var g = (this.o.atenuarGrandes !== false && TAMANO[p.k] > UMBRAL_GRANDE);
    var al = g ? 0.5 : 1, rf = g ? 0.84 : 1;
    if (m === 0) return [this.o.primera ? ED_COLOR[Math.min.apply(null, ed)] : ED_COLOR[0], 0.36 * rf, al];
    if (ed.indexOf(m) >= 0) return [ED_COLOR[m], 0.38 * rf, al];
    var antes = ed.some(function (e) { return e < m; });
    return [null, antes ? 0.3 : 0.22, 1];
  };
  Mapa.prototype.dibujar = function (prog) {
    if (!this.w) return;
    var ctx = this.ctx, s = this.paso, self = this;
    ctx.clearRect(0, 0, this.w, this.h);
    var maxD = 130, onda = this.o.onda && prog < 1;
    var tinta = this.o.tinta || '#1A1810';
    self.pts.forEach(function (p) {
      var st = self.estado(p), a = 1, xy = self.xy(p);
      if (onda) { var f = (prog * 1.25 * maxD - p.d) / 18; a = Math.max(0, Math.min(1, f)); if (a <= 0) return; }
      ctx.globalAlpha = a * (st[0] ? st[2] : self.o.tenue);
      ctx.fillStyle = st[0] || tinta;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], s * st[1] * (onda ? (0.6 + 0.4 * a) : 1), 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (GDL_CR && (!this.o.recorte || (GDL.lon >= this.o.recorte[0] && GDL.lon <= this.o.recorte[1]))) {
      var gx = this.ox + GDL_CR.c * s + s / 2, gy = this.oy + GDL_CR.r * s;
      ctx.strokeStyle = tinta; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(gx, gy, s * 1.25, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = tinta; ctx.beginPath(); ctx.arc(gx, gy, s * 0.42, 0, 6.2832); ctx.fill();
      if (this.o.etiqueta && s > 3.2) {
        ctx.font = '500 ' + Math.max(9, Math.round(s * 1.9)) + 'px "JetBrains Mono", monospace';
        ctx.fillStyle = this.o.rotulo || '#5A5446'; ctx.textBaseline = 'middle';
        ctx.fillText('GUADALAJARA', gx - s * 3, gy + s * 3.4);
      }
    }
  };
  Mapa.prototype.animar = function () {
    var self = this;
    if (REDUCED || !this.o.onda) { this.dibujar(1); return; }
    var dur = this.o.duracion || 1900, t0 = performance.now();
    cancelAnimationFrame(this.anim);
    (function paso(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      self.dibujar(e);
      if (p < 1) self.anim = requestAnimationFrame(paso);
    })(t0);
  };
  Mapa.prototype.cerca = function (x, y) {
    var best = null, bd = Infinity, self = this;
    this.pts.forEach(function (p) {
      if (!p.k) return;
      var xy = self.xy(p), d = (xy[0] - x) * (xy[0] - x) + (xy[1] - y) * (xy[1] - y);
      if (d < bd) { bd = d; best = p; }
    });
    return (best && bd < Math.pow(this.paso * 2.4, 2)) ? best : null;
  };

  global.ForoMapa = {
    MAPA: MAPA, PAISES: PAISES, ED_COLOR: ED_COLOR, ROMANOS: ROMANOS, GDL: GDL,
    PUNTOS: PUNTOS, COLS: COLS, ROWS: ROWS, REDUCED: REDUCED, TAMANO: TAMANO,
    Mapa: Mapa, contar: contar, lista: lista, ediciones: ediciones
  };
})(window);
