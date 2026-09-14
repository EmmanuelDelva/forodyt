# -*- coding: utf-8 -*-
"""Sección «Ponentes» de index.html en TRES grupos (decisión del director, 2026-09-14):

  1. Voces de la discusión — quienes participan los días presenciales 21 y 22 (parrilla principal,
     en el orden que calcula _tools/parrilla.py).
  2. Jóvenes investigadores del Call for Papers (sesión especial del lunes 21 en CUCEA).
  3. Jornada Virtual Internacional del 18 de septiembre (autoras y autores, en el orden del programa).

Fuente única de las personas: _tools/programa.json (+ programa.i18n.json para EN/FR y
semblanzas_programa.json para las semblanzas nuevas). Las tarjetas escritas a mano en index.html
se conservan tal cual; las generadas llevan data-gen="1" y se regeneran en cada corrida.

Reescribe en index.html: la parrilla principal (orden + --st/data-d), los dos grupos entre los
marcadores PONENTES-GRUPOS:INICIO/FIN, el array performer del JSON-LD, SEMBLANZAS, la cifra de
ponentes y las claves F18N nuevas; y en i18n.js las claves idx_ponente_<slug>_* EN/FR de las
tarjetas generadas.

Uso:  python3 _tools/index_grupos.py          (regenera)
      python3 _tools/index_grupos.py --check  (solo informa)
"""
import ast, io, json, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, '_tools')
sys.path.insert(0, TOOLS)
import parrilla  # noqa: E402  (orden de la parrilla principal)

IDX = os.path.join(ROOT, 'index.html')
I18NJS = os.path.join(ROOT, 'i18n.js')
DATA = json.load(io.open(os.path.join(TOOLS, 'programa.json'), encoding='utf-8'))
I18N = json.load(io.open(os.path.join(TOOLS, 'programa.i18n.json'), encoding='utf-8'))
SEMS = json.load(io.open(os.path.join(TOOLS, 'semblanzas_programa.json'), encoding='utf-8'))
_py = io.open(os.path.join(TOOLS, 'programa.py'), encoding='utf-8').read()
FOTOS = ast.literal_eval(re.search(r'^FOTOS = (\{.*?^\})', _py, re.S | re.M).group(1))
EJES_I18N = ast.literal_eval(re.search(r'^EJES_I18N = (\{.*?^\})', _py, re.S | re.M).group(1))

ROM = {1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix'}
TITULOS = re.compile(r'^(Dr\.|Dra\.|Mtro\.|Mtra\.|Ing\.|Lic\.|Abog\.|Mag\.|Juez|M\.Sc\.)\s+')
PARTICULAS = {'de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'van', 'von'}
SEP = ' | '

def esc(s): return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
def js(s):
    """cadena para i18n.js entre comillas simples: normaliza apóstrofos ya escapados y escapa UNA vez."""
    s = re.sub(r"\\+'", "'", s or '')
    return s.replace('\\', '\\\\').replace("'", "\\'")
def strip_titulos(n):
    while True:
        m = TITULOS.match(n)
        if not m: return n
        n = n[m.end():]
def titulo_de(n):
    m = TITULOS.match(n); return (m.group(1) + ' ') if m else ''
def monograma(nombre):
    partes = [p for p in strip_titulos(nombre).replace('-', ' ').split() if p[0].isupper()]
    if not partes: return '·'
    if len(partes) == 1: return partes[0][0]
    return partes[0][0] + partes[-2 if len(partes) > 2 else -1][0]
def nombre_dos_lineas(nombre):
    """«Dr. Federico González Barrera» → («Dr. Federico», «González Barrera»). Dos apellidos con partículas."""
    t = titulo_de(nombre); toks = strip_titulos(nombre).split()
    if len(toks) <= 2: return t + toks[0], ' '.join(toks[1:])
    # apellido 2 = último token; apellido 1 = el token anterior con sus partículas
    i = len(toks) - 1
    while i > 0 and toks[i - 1].lower() in PARTICULAS: i -= 1
    j = i - 1
    while j > 0 and toks[j - 1].lower() in PARTICULAS: j -= 1
    if j <= 0: j = 1
    return t + ' '.join(toks[:j]), ' '.join(toks[j:])
def roman(n):
    out = ''
    for v, s in ((100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'), (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v: out += s; n -= v
    return out
def tr(key, es, lang):
    if lang == 'es': return es
    v = I18N.get(key, {}).get(lang); return v or es

# ───────────── personas por grupo, desde programa.json ─────────────
def personas_de(sesion_filter):
    """[{slug, nombre, afil{es,en,fr}, talk{es,en,fr}, ejes, sesion}] en orden de programa, sin repetir slug."""
    out, vistos = [], set()
    for d in DATA['dias']:
        for b in d['bloques']:
            for s in b['sesiones']:
                if not sesion_filter(d, b, s): continue
                skey = 's.' + s['id']
                filas = [(p, f'{skey}.p{i}', False) for i, p in enumerate(s['ponentes'])]
                if s.get('modera'): filas.append(({'personas': [s['modera']], 'afil': s['modera'].get('afil'), 'talk': None}, skey + '.modera', True))
                for p, key, modera in filas:
                    for per in p['personas']:
                        slug = per.get('slug')
                        if not slug or slug in vistos: continue
                        vistos.add(slug)
                        if modera:
                            talk = {l: tr(skey + '.kicker', s['kicker'], l) for l in ('es', 'en', 'fr')}
                            talk = {'es': f'Modera · {talk["es"]}', 'en': f'Chair · {talk["en"]}', 'fr': f'Modération · {talk["fr"]}'}
                            if s.get('titulo'): talk = {l: talk[l] + ' «' + tr(skey + '.titulo', s['titulo'], l) + '»' for l in talk}
                        elif p.get('talk'):
                            talk = {l: tr(key + '.talk', p['talk'], l) for l in ('es', 'en', 'fr')}
                        elif s.get('titulo'):
                            t = {l: tr(skey + '.titulo', s['titulo'], l) for l in ('es', 'en', 'fr')}
                            talk = {'es': f'«{t["es"]}» · tema conjunto de mesa', 'en': f'«{t["en"]}» · joint panel topic', 'fr': f'« {t["fr"]} » · thème commun de table ronde'}
                        else: talk = None
                        out.append({'slug': slug, 'nombre': per['nombre'],
                                    'afil': {l: tr(key + '.afil', p.get('afil') or '', l) for l in ('es', 'en', 'fr')} if p.get('afil') else None,
                                    'talk': talk, 'ejes': s['ejes'], 'sesion': s['id']})
    return out

COMITE = {'delva', 'leos', 'romero', 'said', 'paul', 'acosta'}   # tienen ficha en la sección Comité, no tarjeta de ponente
MAIN = [p for p in personas_de(lambda d, b, s: d['modo'] == 'presencial' and s['id'] != 'd21-cfp') if p['slug'] not in COMITE]
CFP = personas_de(lambda d, b, s: s['id'] == 'd21-cfp')
JV = personas_de(lambda d, b, s: d['modo'] == 'virtual')
POR_SLUG = {p['slug']: p for p in MAIN + CFP + JV}

# ───────────── index.html ─────────────
src = io.open(IDX, encoding='utf-8').read()
ini = src.index('<div class="ponentes-grid">')
cta = src.index('<div class="ponentes-cta')
M_INI, M_FIN = '<!-- PONENTES-GRUPOS:INICIO -->', '<!-- PONENTES-GRUPOS:FIN -->'
if M_INI in src:
    gi = src.index(M_INI); gf = src.index(M_FIN) + len(M_FIN)
    fin = src.rindex('</div>', ini, gi)
else:
    gi = gf = None
    fin = src.rindex('</div>', ini, cta)
bloque = src[ini:fin]
arts = re.findall(r'      <article class="ponente.*?</article>', bloque, re.S)
if gi is not None:
    arts += re.findall(r'      <article class="ponente.*?</article>', src[gi:gf], re.S)
tarjetas = {}
for a in arts:
    m = re.search(r'data-semblanza="([a-z0-9_]+)"', a)
    if not m: continue
    if 'data-gen="1"' in a: continue          # generada: se vuelve a generar
    tarjetas[m.group(1)] = a

def data_d(st):
    if st == 0: return None
    if st in (1, 2): return str(st)
    v = (st - 3) % 4
    return None if v == 0 else str(v)

def tarjeta(p, grupo, st):
    slug = p['slug']; l1, l2 = nombre_dos_lineas(p['nombre'])
    d = data_d(st); dd = f' data-d="{d}"' if d else ''
    if slug in FOTOS:
        foto = f'<img src="img/ponentes/{FOTOS[slug]}" width="400" height="400" loading="lazy" decoding="async" alt="{esc(p["nombre"])}">'
    else:
        foto = f'<span class="ponente-mono" aria-hidden="true">{esc(monograma(p["nombre"]))}</span>'
    afil = f'\n        <p class="ponente-affil" data-i18n-html="idx_ponente_{slug}_affil_html">{esc(p["afil"]["es"])}</p>' if p['afil'] else ''
    topic = ''
    if p['ejes']:
        topic_es = SEP.join(f'Línea {ROM[n]} · {DATA["ejes"][str(n)]}' for n in p['ejes'])
        topic = f'\n        <span class="ponente-topic" data-i18n-html="idx_ponente_{slug}_topic_html">{esc(topic_es)}</span>'
    talk = f'\n        <span class="ponente-talk-title" data-i18n="idx_ponente_{slug}_talk">{esc(p["talk"]["es"])}</span>' if p['talk'] else ''
    return (f'      <article class="ponente reveal" data-semblanza="{slug}" data-grupo="{grupo}" data-gen="1" role="button" tabindex="0" aria-haspopup="dialog" style="--st:{st}"{dd}>\n'
            f'        <span class="sello" data-f18n="sello">Confirmado</span>\n'
            f'        <div class="ponente-photo">\n          {foto}\n        </div>\n'
            f'        <h3 class="ponente-name">{esc(l1)}<br>{esc(l2)}</h3>{afil}{topic}{talk}\n      </article>')

def reusar(a, st):
    d = data_d(st)
    return re.sub(r'style="--st:\d+"( data-d="\d")?', 'style="--st:%d"%s' % (st, (' data-d="%s"' % d) if d else ''), a, count=1)

# orden de la parrilla principal (parrilla.py) — toda persona del 21-22 debe estar en ella
orden_main = [parrilla.PONENTES[i][0] for i in parrilla.optimiza()[0]]
faltan = [p['slug'] for p in MAIN if p['slug'] not in orden_main]
sobran = [s for s in orden_main if s not in POR_SLUG]
if faltan: print('⚠️  en el programa del 21-22 pero NO en parrilla.py (añadir con género/sector/peso):', faltan)
if sobran: print('⚠️  en parrilla.py pero no en el programa del 21-22:', sobran)
if '--check' in sys.argv:
    print('main', len(orden_main), '· cfp', len(CFP), '· jv', len(JV), '· total', len(orden_main) + len(CFP) + len(JV)); sys.exit(0)

generadas = []   # personas con tarjeta generada (necesitan claves i18n.js)
st = 0; salida = []
for slug in orden_main:
    if slug in tarjetas: salida.append(reusar(tarjetas[slug], st))
    else: salida.append(tarjeta(POR_SLUG[slug], 'main', st)); generadas.append(POR_SLUG[slug])
    st += 1
nuevo_bloque = '<div class="ponentes-grid">\n\n' + '\n\n'.join(salida) + '\n\n    '

def grupo_html(gid, personas, eyebrow, titulo_html, sub):
    global st
    cards = []
    for p in personas:
        if p['slug'] in tarjetas: cards.append(reusar(tarjetas[p['slug']], st))
        else: cards.append(tarjeta(p, gid, st)); generadas.append(p)
        st += 1
    return (f'\n    <div class="ponentes-grupo reveal" id="ponentes-{gid}">\n'
            f'      <div class="grupo-eyebrow" data-f18n="pon_grp_{gid}_eyebrow">{esc(eyebrow)}</div>\n'
            f'      <h3 class="grupo-titulo" data-f18n-html="pon_grp_{gid}">{titulo_html}</h3>\n'
            f'      <p class="grupo-sub" data-f18n="pon_grp_{gid}_sub">{esc(sub)}</p>\n    </div>\n'
            f'    <div class="ponentes-grid ponentes-grid--sec">\n\n' + '\n\n'.join(cards) + '\n\n    </div>\n')

GRUPOS_TXT = {
    'cfp': {'eyebrow': {'es': 'Sesión especial · Lunes 21 · CUCEA', 'en': 'Special session · Monday 21 · CUCEA', 'fr': 'Session spéciale · Lundi 21 · CUCEA'},
            'titulo': {'es': 'Jóvenes investigadores <em>del Call for Papers</em>.', 'en': 'Young researchers <em>from the Call for Papers</em>.', 'fr': 'Jeunes chercheurs <em>du Call for Papers</em>.'},
            'sub': {'es': 'Trabajos seleccionados en la convocatoria, presentados por sus autoras y autores en la jornada inaugural.',
                    'en': 'Papers selected through the call, presented by their authors on the opening day.',
                    'fr': 'Travaux sélectionnés dans l\'appel à contributions, présentés par leurs auteurs lors de la journée inaugurale.'}},
    'jv':  {'eyebrow': {'es': 'Viernes 18 de septiembre · en línea', 'en': 'Friday, September 18 · online', 'fr': 'Vendredi 18 septembre · en ligne'},
            'titulo': {'es': 'Jornada Virtual <em>Internacional</em>.', 'en': 'International <em>Online Session</em>.', 'fr': 'Journée virtuelle <em>internationale</em>.'},
            'sub': {'es': 'Autoras y autores de los trabajos aceptados en la convocatoria, en cuatro mesas virtuales con doce minutos por exposición.',
                    'en': 'Authors of the papers accepted through the call, across four online panels with twelve minutes per presentation.',
                    'fr': 'Auteurs des travaux acceptés dans l\'appel à contributions, répartis en quatre tables virtuelles de douze minutes par exposé.'}},
}
grupos = (M_INI + grupo_html('cfp', CFP, GRUPOS_TXT['cfp']['eyebrow']['es'], GRUPOS_TXT['cfp']['titulo']['es'], GRUPOS_TXT['cfp']['sub']['es'])
          + grupo_html('jv', JV, GRUPOS_TXT['jv']['eyebrow']['es'], GRUPOS_TXT['jv']['titulo']['es'], GRUPOS_TXT['jv']['sub']['es']) + '    ' + M_FIN)
if gi is not None: src = src[:ini] + nuevo_bloque + '</div>\n' + grupos + src[gf:]
else: src = src[:ini] + nuevo_bloque + '</div>\n' + grupos + src[fin + len('</div>'):]

# ── performer del JSON-LD ──
orden_total = orden_main + [p['slug'] for p in CFP] + [p['slug'] for p in JV]
nombres = []
for slug in orden_total:
    p = POR_SLUG.get(slug)
    if p: nombres.append(strip_titulos(p['nombre']))
    else:  # tarjeta a mano sin entrada en el programa: nombre desde el <h3>
        h = re.search(r'<h3 class="ponente-name">(.*?)</h3>', tarjetas[slug], re.S).group(1)
        nombres.append(strip_titulos(re.sub(r'<[^>]+>', ' ', h).replace('\n', ' ').strip()))
m = re.search(r'("performer": \[\n)(.*?)(\n  \])', src, re.S)
src = src[:m.start(2)] + ',\n'.join('    { "@type": "Person", "name": "%s" }' % n for n in nombres) + src[m.end(2):]

# ── SEMBLANZAS: mismo orden, comité al final; añade las de semblanzas_programa.json ──
lineas = src.split('\n')
i = next(k for k, l in enumerate(lineas) if 'var SEMBLANZAS =' in l)
pref = lineas[i][:lineas[i].index('{')]; obj = json.loads(lineas[i][lineas[i].index('{'):].rstrip()[:-1])
comite = [k for k in obj if k not in orden_total]
nuevo = {}
for k in orden_total:
    if k in obj: nuevo[k] = obj[k]
    elif k in SEMS: nuevo[k] = {l: SEMS[k][l] for l in ('es', 'en', 'fr') if SEMS[k].get(l)}
for k in comite: nuevo[k] = obj[k]
lineas[i] = pref + json.dumps(nuevo, ensure_ascii=False) + ';'
src = '\n'.join(lineas)

# ── cifra de ponentes ──
total = len(orden_total)
src = re.sub(r'<span class="cifra-rom" aria-hidden="true">[IVXLC]+</span>\n(\s*)<b data-count="\d+">', f'<span class="cifra-rom" aria-hidden="true">{roman(total)}</span>\n\\1<b data-count="{total}">', src, count=1)
src = src.replace('<em class="cifra-ctx" data-f18n="ctx_ponentes">y la lista sigue creciendo</em>', '<em class="cifra-ctx" data-f18n="ctx_ponentes">en cuatro sedes y una jornada virtual</em>')
src = src.replace("ctx_ponentes: 'and the list keeps growing'", "ctx_ponentes: 'across four venues and one online session'")
src = src.replace("ctx_ponentes: 'et la liste continue de grandir'", "ctx_ponentes: 'sur quatre sites et une journée virtuelle'")

# ── F18N del index: claves de los grupos (EN/FR), insertadas tras pon_lead (todo dentro del bloque del idioma) ──
def f18n_insert(src, lang, pares):
    base = src.index('var F18N = {'); a = src.index(f'    {lang}: {{', base)
    b = re.search(r'^    \}', src[a:], re.M).start() + a          # cierre del bloque del idioma
    blk = src[a:b]
    nuevas = []
    for k, v in pares:
        linea = f"      {k}: '{js(v)}',"
        if re.search(rf"^      {k}: ", blk, re.M): blk = re.sub(rf"^      {k}: .*$", lambda _m: linea, blk, count=1, flags=re.M)
        else: nuevas.append(linea)
    if nuevas:
        m = re.search(r"^      pon_lead: .*$", blk, re.M)
        blk = blk[:m.end()] + '\n' + '\n'.join(nuevas) + blk[m.end():]
    return src[:a] + blk + src[b:]
for lang in ('en', 'fr'):
    pares = []
    for gid in ('cfp', 'jv'):
        pares += [(f'pon_grp_{gid}_eyebrow', GRUPOS_TXT[gid]['eyebrow'][lang]), (f'pon_grp_{gid}', GRUPOS_TXT[gid]['titulo'][lang]), (f'pon_grp_{gid}_sub', GRUPOS_TXT[gid]['sub'][lang])]
    src = f18n_insert(src, lang, pares)

io.open(IDX, 'w', encoding='utf-8', newline='').write(src)

# ───────────── i18n.js: claves EN/FR de las tarjetas generadas ─────────────
js_src = io.open(I18NJS, encoding='utf-8').read()
def bloque_pos(lang):
    a = re.search(rf'^    {lang}: \{{', js_src, re.M).start()
    b = re.search(r'^    \},?\s*$', js_src[a:], re.M).start() + a
    return a, b
for lang in ('en', 'fr'):
    a, b = bloque_pos(lang); blk = js_src[a:b]
    nuevas = []
    for p in generadas:
        slug = p['slug']; claves = []
        if p['afil']: claves.append((f'idx_ponente_{slug}_affil_html', p['afil'][lang]))
        if p['ejes']:
            pref = 'Track' if lang == 'en' else 'Axe'
            claves.append((f'idx_ponente_{slug}_topic_html', SEP.join(f'{pref} {ROM[n]} · {EJES_I18N[lang][n]}' for n in p['ejes'])))
        if p['talk']: claves.append((f'idx_ponente_{slug}_talk', p['talk'][lang]))
        for k, v in claves:
            linea = f"      {k}: '{js(v)}',"
            if re.search(rf'^      {k}: ', blk, re.M): blk = re.sub(rf"^      {k}: .*$", lambda _m: linea, blk, count=1, flags=re.M)
            else: nuevas.append(linea)
    if nuevas:
        # tras la última clave idx_ponente_*_talk del bloque
        last = list(re.finditer(r"^      idx_ponente_\w+_talk: .*$", blk, re.M))[-1]
        blk = blk[:last.end()] + '\n' + '\n'.join(nuevas) + blk[last.end():]
    js_src = js_src[:a] + blk + js_src[b:]
io.open(I18NJS, 'w', encoding='utf-8', newline='').write(js_src)

print(f'index.html: parrilla principal {len(orden_main)} · jóvenes CFP {len(CFP)} · jornada virtual {len(JV)} · total {total} ({roman(total)})')
print('tarjetas generadas:', ', '.join(p['slug'] for p in generadas))
sin_sem = [p['slug'] for p in generadas if p['slug'] not in nuevo]
print('sin semblanza (modal «en preparación»):', ', '.join(sin_sem) or 'ninguna')
