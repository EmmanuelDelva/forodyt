# -*- coding: utf-8 -*-
"""Constancias de PARTICIPACIÓN (ponente y moderación) por mesa, a partir de _tools/programa.json.

Usa la misma plantilla que las de asistencia (apps-script/Constancia-bloque.html) con los tipos
'ponente' y 'moderador', y añade al membrete el logo del Foro y el de la Universidad de las
Hespérides (petición del director, 2026-09-18).

Estas NO las emite el backend: el Apps Script solo manda 'bloque' y 'valor'. Aquí se generan a mano
para entregarlas al terminar cada mesa.

    python3 _tools/constancias_mesa.py v1              # ponentes de la Mesa V1
    python3 _tools/constancias_mesa.py v1 v2 v3 v4     # varias mesas
    python3 _tools/constancias_mesa.py --moderadores   # todas las mesas que tienen moderación
    python3 _tools/constancias_mesa.py --todas         # ponentes + moderación de todo el programa
    python3 _tools/constancias_mesa.py --organizacion  # comité organizador y coorganización de la JV

La firma va en FIRMA_PNG (fuera del repo: la firma NO se versiona). Salida en _tools/out/constancias/
+ un render.sh con los Chromium --print-to-pdf.
"""
import base64, io, json, os, re, sys, unicodedata
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '_tools', 'out', 'constancias', 'mesas')
TPL = io.open(os.path.join(ROOT, 'apps-script', 'Constancia-bloque.html'), encoding='utf-8').read()
DATA = json.load(io.open(os.path.join(ROOT, '_tools', 'programa.json'), encoding='utf-8'))

FIRMA_PNG = os.environ.get('FIRMA_PNG', '')
CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'


# ---------------------------------------------------------------- utilidades
def data_uri(path, mime='image/png', alto_max=0):
    """`alto_max` remuestrea antes de incrustar: el lockup del Foro son 941 px para 15 mm impresos
    (402 KB en cada PDF) y con 400 px ya sobra a 600 dpi."""
    if not path or not os.path.exists(path):
        return ''
    crudo = open(path, 'rb').read()
    if alto_max:
        try:
            from PIL import Image
            im = Image.open(io.BytesIO(crudo))
            if im.height > alto_max:
                im = im.resize((round(im.width * alto_max / im.height), alto_max), Image.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, 'PNG', optimize=True)
                crudo = buf.getvalue()
        except ImportError:
            pass
    return 'data:%s;base64,%s' % (mime, base64.b64encode(crudo).decode())


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


TRATAMIENTO = r'^(Dr[a]?\.|Mtr[oa]\.|Lic\.|Ing\.|Mag\.|Juez)\s+'


def sin_tratamiento(nombre):
    """«Dra. María Luisa García Torres» → «María Luisa García Torres».

    El archivo se llama como la persona (decisión del director, 2026-09-18). NO se recapitaliza:
    los nombres ya vienen bien escritos en programa.json y un .title() rompería «María del Pilar»
    o «Niza Inés Sepúlveda». Solo se quita el tratamiento."""
    return re.sub(TRATAMIENTO, '', nombre).strip()


# -------------------------------------------- intérprete mínimo de scriptlets
# Solo lo que usa la plantilla: <?= expr ?>, <?!= imgSrc_(expr) ?>, <? if (c) { ?>…<? } else { ?>…<? } ?>
def _eval(expr, ctx):
    expr = expr.strip()
    m = re.match(r'^imgSrc_\((.+)\)$', expr)
    if m:
        expr = m.group(1).strip()
    if expr.startswith('__it__.'):
        return (ctx.get('__it__') or {}).get(expr[7:], '')
    if '.' in expr:
        a, b = expr.split('.', 1)
        v = ctx.get(a) or {}
        return v.get(b, '') if isinstance(v, dict) else ''
    return ctx.get(expr, '') or ''


def _cond(expr, ctx):
    expr = expr.strip()
    m = re.match(r"^(\w+) === '(\w+)'$", expr)
    if m:
        return ctx.get(m.group(1)) == m.group(2)
    if expr.startswith('logos && ('):
        return any((ctx.get('logos') or {}).values())
    return bool(_eval(expr, ctx))


def render(tpl, ctx):
    # El bucle de firmantes (solo tipo 'valor') va PRIMERO: si no se consume, su `<? } ?>` cierra por
    # error el `if` de las firmas y el pie sale con scriptlets crudos.
    def _for(m):
        salida = ''
        for it in (ctx.get('firmantes') or []):
            salida += render(m.group(1).replace('firmantes[i]', '__it__'), dict(ctx, __it__=it))
        return salida
    tpl = re.sub(r'<\? for \(var i = 0; i < firmantes\.length; i\+\+\) \{ \?>(.*?)<\? \} \?>(?=\s*</tr>)',
                 _for, tpl, flags=re.S)
    tpl = _ifs(tpl, ctx)
    tpl = re.sub(r'<\?!= (.*?) \?>', lambda m: str(_eval(m.group(1), ctx)), tpl)
    return re.sub(r'<\?= (.*?) \?>', lambda m: str(_eval(m.group(1), ctx)), tpl)


_ABRE = re.compile(r'<\? if \((.*?)\) \{ \?>', re.S)
_TOKEN = re.compile(r'<\? if \(.*?\) \{ \?>|<\? \} else \{ \?>|<\? \} \?>', re.S)


def _ifs(tpl, ctx):
    """Resuelve los `if` contando profundidad.

    Un `(.*?)` no codicioso NO sirve: con un `if` dentro de otro corta en el `<? } ?>` del interno y
    se traga el resto del bloque. Así se perdió la firma del rector de Hespérides (2026-09-18): de las
    tres firmas solo salían dos, y el PDF parecía correcto."""
    m = _ABRE.search(tpl)
    if not m:
        return tpl
    prof, pos, corte_else, fin = 1, m.end(), None, None
    while prof:
        t = _TOKEN.search(tpl, pos)
        if not t:
            raise ValueError('scriptlet `if` sin cerrar: %s' % m.group(1))
        if t.group(0).startswith('<? if'):
            prof += 1
        elif t.group(0) == '<? } else { ?>':
            if prof == 1:
                corte_else = (t.start(), t.end())
        else:
            prof -= 1
            if prof == 0:
                fin = (t.start(), t.end())
        pos = t.end()
    si = tpl[m.end():corte_else[0]] if corte_else else tpl[m.end():fin[0]]
    no = tpl[corte_else[1]:fin[0]] if corte_else else ''
    return _ifs(tpl[:m.start()] + (si if _cond(m.group(1), ctx) else no) + tpl[fin[1]:], ctx)


# ------------------------------------------------------------ datos del Foro
# Artículo incluido: la plantilla escribe «celebrada en <recinto>».
RECINTO = {
    'virtual': 'la transmisión en línea del Foro (Jornada Virtual Internacional)',
    'cucea': 'el Auditorio Lic. Raúl Padilla López (CUCEA)',
    'cugdl': 'el Auditorio Salvador Allende (CUGDL)',
    'cineteca': 'la Sala Guillermo del Toro del Centro Cultural Universitario (Cineteca FICG)',
    'ciudad-judicial': 'el Auditorio de Ciudad Judicial del Poder Judicial del Estado de Jalisco',
}
SEDE = {
    'virtual': 'Jornada Virtual Internacional',
    'cucea': 'CUCEA',
    'cugdl': 'CUGDL',
    'cineteca': 'Cineteca FICG',
    'ciudad-judicial': 'Ciudad Judicial',
}


def fecha_larga(dia):
    return '%s %s de %s de 2026' % (dia['dow'].lower(), dia['num'], dia['mes'])


def indice():
    """{sesion_id: (dia, bloque, sesion)} para todas las mesas del programa."""
    ix = {}
    for dia in DATA['dias']:
        for b in dia['bloques']:
            for s in b['sesiones']:
                ix[s['id']] = (dia, b, s)
    return ix


def etiqueta(s):
    """(«Mesa V1 · «título»», «Mesa V1»)."""
    corta = 'Mesa %s' % s['num'] if s.get('num') else (s.get('kicker') or s['id'])
    larga = '%s · «%s»' % (corta, s['titulo']) if s.get('titulo') else corta
    return larga, corta


# ------------------------------------------------------------------ contexto
LOGOS = {
    'udg': data_uri(os.path.join(ROOT, 'img', 'aliados', 'udg.png')),
    'ca': data_uri(os.path.join(ROOT, 'img', 'aliados', 'ca-derecho-tecnologia-lockup.png')),
    'foro': data_uri(os.path.join(ROOT, 'img', 'marca', 'foro-logo-master.png'), alto_max=400),
    'hesperides': data_uri(os.path.join(ROOT, 'img', 'aliados', 'hesperides.png')),
}
AGUA = data_uri(os.path.join(ROOT, 'img', 'marca', 'foro-mapa-conexiones-dorado.png'))

# El Observatorio Mundial de la Abogacía coorganiza la Jornada Virtual: su logo va en TODAS las
# constancias de participación (director, 2026-09-18; antes estaba solo en dos personas).
LOGOS['oma'] = data_uri(os.path.join(ROOT, 'img', 'aliados', 'oma.png'), alto_max=400)

# Las tres firmas de las constancias de participación (director, 2026-09-18). El rector de Hespérides
# se verificó en Wikipedia ES y en la cuenta oficial de la universidad, que lo llama «nuestro rector»;
# su web propia devuelve 403 a las herramientas, así que no se pudo cotejar ahí.
# Solo hay imagen de firma del director: las otras dos van con la línea en blanco, para firma autógrafa.
FIRMANTES = [
    dict(slug='delva',   nombre='Dr. Juan Emmanuel Delva Benavides', cargo='Director del Foro',
         sub='Líder del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', firma_propia=True),
    dict(slug='calzada', nombre='Dr. Gabriel Calzada Álvarez', cargo='Rector',
         sub='Universidad de las Hespérides'),
    dict(slug='caicedo', nombre='Dra. Juliana Caicedo Buitrago', cargo='Presidenta',
         sub='Observatorio Mundial de la Abogacía'),
]


def firmas_ctx(slug_receptor):
    """Nadie firma su propia constancia (director, 2026-09-18): «la mía va por ellos, sin mi firma»."""
    vivos = [f for f in FIRMANTES if f['slug'] != slug_receptor]
    ctx = {'f_ancho': '%d%%' % (100 // len(vivos))}
    for i in range(3):
        n = 'f%d_' % (i + 1)
        f = vivos[i] if i < len(vivos) else None
        ctx[n + 'nombre'] = f['nombre'] if f else ''
        ctx[n + 'cargo'] = f['cargo'] if f else ''
        ctx[n + 'sub'] = f['sub'] if f else ''
        ctx[n + 'firma'] = data_uri(FIRMA_PNG) if (f and f.get('firma_propia')) else ''
    return ctx


def base_ctx(dia, bloque):
    return dict(
        participacion=True, tipo='', horas='', horas_txt='', sesiones='',
        logos=LOGOS, agua_src=AGUA, firma_src=data_uri(FIRMA_PNG),
        recinto=RECINTO[bloque['id']], sede=SEDE[bloque['id']],
        fecha_larga=fecha_larga(dia), fecha_emision='%s de %s de 2026' % (dia['num'], dia['mes']),
        lista_label='', lista='', ponencia='', nexo='en la', sesion_k='Sesión',
        **firmas_ctx(None),
    )


def constancias_de(sid, ix, con_ponentes=True, con_moderacion=True):
    dia, bloque, s = ix[sid]
    larga, corta = etiqueta(s)
    fichas = []

    if con_ponentes:
        n = 0
        for p in s.get('ponentes', []):
            for persona in p['personas']:
                n += 1
                fichas.append(dict(
                    base_ctx(dia, bloque), tipo='ponente', rol='ponente',
                    **firmas_ctx(persona.get('slug')),
                    nombre=persona['nombre'], institucion=p.get('afil') or '',
                    sesion_label=larga, sesion_corta=corta, ponencia=p.get('talk') or '',
                    folio='IV-FIDDT-PON/UDG/2026-%s-%04d' % (corta.replace('Mesa ', ''), n),
                    _archivo=sin_tratamiento(persona['nombre']), _que='ponente %s' % corta,
                ))

    m = s.get('modera')
    if con_moderacion and m:
        nombres = [x['nombre'] for p in s.get('ponentes', []) for x in p['personas']]
        fichas.append(dict(
            base_ctx(dia, bloque), tipo='moderador', rol=m.get('rol') or 'moderador',
            **firmas_ctx(m.get('slug')),
            nombre=m['nombre'], institucion=m.get('afil') or '',
            sesion_label=larga, sesion_corta=corta,
            lista_label='Ponentes' if nombres else '', lista=' · '.join(nombres),
            folio='IV-FIDDT-MOD/UDG/2026-%s-0001' % corta.replace('Mesa ', ''),
            _archivo=sin_tratamiento(m['nombre']), _que='moderación %s' % corta,
        ))
    return fichas


# ------------------------------------------- constancias de ORGANIZACIÓN (JV)
# Director, 2026-09-18: comité organizador completo MENOS Fharide Acosta Malacón, más María Luisa
# García Torres y Juliana Caicedo Buitrago como coorganizadoras, más el rector de Hespérides como
# institución organizadora. Cargos tomados de la sección Comité de index.html.
ORGANIZACION = [
    ('delva',   'Dr. Juan Emmanuel Delva Benavides', 'Líder del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', 'Dirección del Foro', 'org'),
    ('garcia_torres', 'Dra. María Luisa García Torres', 'Universidad Alfonso X el Sabio · IusConnect (España)', 'Organización', 'orga'),
    ('caicedo', 'Dra. Juliana Caicedo Buitrago',     'Presidenta del Observatorio Mundial de la Abogacía (OMA)', 'Organización', 'orga'),
    ('calzada', 'Dr. Gabriel Calzada Álvarez',       'Rector · Universidad de las Hespérides', 'Institución organizadora', 'inst'),
    ('leos',    'Dr. Jorge Antonio Leos Navarro',    'Miembro del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', 'Secretaría Académica', 'comite'),
    ('romero',  'Mtro. César Romero Güemez',         'Departamento de Ciencias Sociales y Jurídicas · CUCEA-UDG', 'Secretaría Técnica', 'comite'),
    ('said',    'Mtro. Iván Said González López',    'Colaborador del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', 'Tecnología y Logística', 'comite'),
    ('paul',    'Dr. Alejandro Paul García Hernández', 'Miembro del Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', 'Coordinación Editorial y Comité Científico', 'comite'),
]

# Corrección del director (2026-09-18): él, Juliana y María Luisa son ORGANIZADORES; el comité
# —salvo Fharide— son MIEMBROS DEL COMITÉ ORGANIZADOR DEL FORO; y el rector, institución organizadora.
ROL = {
    'org':    ('organizador', 'de la'),
    'orga':   ('organizadora', 'de la'),
    'comite': ('miembro del Comité Organizador del Foro', 'en la'),
    'inst':   ('institución organizadora', 'en representación de la Universidad de las Hespérides, en la'),
}


def constancias_organizacion(ix):
    dia, bloque, _ = ix['v1']          # la Jornada Virtual entera: mismo día y mismo bloque
    fichas = []
    for n, (slug, nombre, afil, encargo, clase) in enumerate(ORGANIZACION, 1):
        rol, nexo = ROL[clase]
        fichas.append(dict(
            base_ctx(dia, bloque), tipo='moderador', rol=rol, nexo=nexo,
            **firmas_ctx(slug),
            nombre=nombre, institucion=afil,
            recinto='la transmisión en línea del Foro',
            sesion_label='Jornada Virtual Internacional',
            sesion_k='Encargo', sesion_corta=encargo,
            folio='IV-FIDDT-ORG/UDG/2026-JV-%04d' % n,
            _archivo=sin_tratamiento(nombre),
            _que='organización',
        ))
    return fichas


# ---------------------------------------------------------------------- main
def main(argv):
    ix = indice()
    mesas = [k for k, v in ix.items() if v[2]['tipo'] == 'mesa']
    solo_mod = '--moderadores' in argv
    solo_org = '--organizacion' in argv
    ids = [a for a in argv if not a.startswith('--')]
    if '--todas' in argv or solo_mod:
        ids = mesas
    if not ids and not solo_org:
        sys.exit('uso: constancias_mesa.py <id-de-mesa>… | --moderadores | --todas\nmesas: %s' % ' '.join(mesas))

    desconocidas = [i for i in ids if i not in ix]
    if desconocidas:
        sys.exit('no existen en el programa: %s' % ', '.join(desconocidas))

    os.makedirs(OUT, exist_ok=True)
    if not FIRMA_PNG or not os.path.exists(FIRMA_PNG):
        print('AVISO: sin FIRMA_PNG, las constancias salen SIN firma.')

    todas = []
    if solo_org or '--todas' in argv:
        org = constancias_organizacion(ix)
        print('  org  %d constancia(s) de organización y coorganización' % len(org))
        todas += org
    for sid in ids:
        fichas = constancias_de(sid, ix, con_ponentes=not solo_mod)
        print('  %-4s %s' % (sid, '%d constancia(s)' % len(fichas) if fichas else 'sin constancias que generar'))
        todas += fichas

    # Quien tiene DOS constancias (p. ej. ponente en una mesa y moderación en otra) llevaría el mismo
    # archivo y una pisaría a la otra: solo en ese caso se añade el papel entre paréntesis.
    repetidos = {n for n in [f['_archivo'] for f in todas]
                 if [f['_archivo'] for f in todas].count(n) > 1}

    sh = ['#!/bin/sh', 'cd "$(dirname "$0")"']
    for f in todas:
        nom, que = f.pop('_archivo'), f.pop('_que')
        if nom in repetidos:
            nom = '%s (%s)' % (nom, que)
        io.open(os.path.join(OUT, nom + '.html'), 'w', encoding='utf-8').write(render(TPL, f))
        # La entrada TIENE que ser un file:// con porcentaje-codificación: con el nombre a secas,
        # Chromium toma «María Luisa García Torres.html» por un dominio, no lo resuelve e imprime
        # su página de error — un PDF de una página que parece bueno (visto el 2026-09-18).
        url = 'file://$PWD/' + quote(nom + '.html')
        sh.append('%s --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer '
                  '--print-to-pdf="%s.pdf" "%s" 2>/dev/null' % (CHROMIUM, nom, url))
    total = len(todas)

    io.open(os.path.join(OUT, 'render.sh'), 'w').write('\n'.join(sh) + '\n')
    print('\n%d HTML en %s\nPDF: sh %s/render.sh' % (total, OUT, OUT))


if __name__ == '__main__':
    main(sys.argv[1:])
