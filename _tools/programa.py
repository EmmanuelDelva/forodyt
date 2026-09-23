# -*- coding: utf-8 -*-
"""
programa.py — genera programa.html (y el bloque de la jornada virtual para
jornada-virtual.html) a partir de _tools/programa.json + _tools/programa.i18n.json.

Uso:  python3 _tools/programa.py            → escribe programa.html y _tools/out/*
      python3 _tools/programa.py --check    → solo valida datos y traducciones

Reglas de la casa que este script respeta:
  · ES vive en el HTML; EN/FR van en un mini-diccionario F18N embebido (data-f18n),
    puenteado con i18n.js por MutationObserver sobre <html lang> (igual que
    jornada-virtual.html). El nav y el footer siguen usando data-i18n de i18n.js.
  · Los apóstrofos FR se escapan UNA sola vez: el diccionario se serializa con
    json.dumps, así que nunca hay que escapar a mano.
  · Nada de base64. Las fotos salen de img/ponentes/ (misma ruta que index.html).
"""
import json, os, re, sys, html, unicodedata
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, '_tools', 'programa.json'), encoding='utf-8'))
I18N_PATH = os.path.join(ROOT, '_tools', 'programa.i18n.json')
I18N = json.load(open(I18N_PATH, encoding='utf-8')) if os.path.exists(I18N_PATH) else {}
OUT = os.path.join(ROOT, '_tools', 'out')
os.makedirs(OUT, exist_ok=True)

# semblanzas: las publicadas en index.html (fuente única, no se duplican a mano)
# + las nuevas del programa en _tools/semblanzas_programa.json {slug: {es,en,fr}}
_idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
SEM_INDEX = json.loads(re.search(r'var SEMBLANZAS = (\{.*?\});\n', _idx, re.S).group(1))
INDEX_SLUGS = sorted(set(re.findall(r'data-semblanza="([a-z_]+)"', _idx)))
_sp = os.path.join(ROOT, '_tools', 'semblanzas_programa.json')
SEM_EXTRA = json.load(open(_sp, encoding='utf-8')) if os.path.exists(_sp) else {}
SEM = dict(SEM_INDEX); SEM.update(SEM_EXTRA)
SLUGS_USADOS = set()

ROM = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX'}
EJES_I18N = {
    'en': {1: 'Agentic AI and Generative Intellectual Property', 2: 'Emerging Technologies', 3: 'Cybersecurity and Digital Sovereignty', 4: 'Digital Justice and Legal Innovation', 5: 'Digital Human Rights', 6: 'FinTech and Digital Economy', 7: 'Digital Health and Biotechnologies', 8: 'Technology, Sustainability and Digital Ecological Law', 9: 'Technological Conflict Resolution and Online Disputes'},
    'fr': {1: 'IA Agentique et Propriété Intellectuelle Générative', 2: 'Technologies Émergentes', 3: 'Cybersécurité et Souveraineté Numérique', 4: 'Justice Numérique et Innovation Juridique', 5: 'Droits Humains Numériques', 6: 'FinTech et Économie Numérique', 7: 'Santé Numérique et Biotechnologies', 8: 'Technologie, Durabilité et Droit Écologique Numérique', 9: 'Résolution des Conflits Technologiques et Litiges en Ligne'},
}

# fotos: mismo mapa slug → archivo que usa index.html (extraído de las tarjetas)
FOTOS = {
    'said': 'ivan-gonzalez-lopez.jpg',
    'alvarez': 'jose-luis-alvarez-pulido.jpg', 'gaspar': 'miguel-angel-gaspar.jpg', 'gonzalez': 'mayra-gonzalez.jpg',
    'rivera': 'alejandro-rivera-martinez.jpg', 'sossa': 'humberto-sossa.jpg', 'contreras': 'juan-carlos-contreras.jpg',
    'caicedo': 'juliana-caicedo.jpg', 'zepeda': 'zepeda-lecuona.jpg',     'raad': 'manuel-raad-berrio.jpg', 'gustavo_juarez': 'gustavo-juarez.jpg', 'villarreal': 'manuel-villarreal.jpg',
    'gamez': 'velda-gamez.jpg', 'vega_gomez': 'carlos-vega-gomez.jpg', 'reyes': 'luis-fernando-reyes.jpg', 'tinajero': 'gilberto-tinajero.jpg',
    'garcia_barrera': 'myrna-garcia-barrera.jpg', 'marquez': 'christopher-marquez.jpg', 'jimenez': 'fernando-jimenez.jpg',
    'arrazola': 'ivan-arrazola.jpg', 'nava_lopez': 'gretta-nava.jpg', 'garcia_torres': 'maria-luisa-garcia.jpg',
    'vazquez_placencia': 'miguel-vazquez-placencia.jpg', 'juarez_tello': 'miguel-juarez-tello.jpg',
    'rosales': 'silvia-rosales.jpg', 'vega': 'jose-vega-sacasa.jpg', 'doria': 'javier-doria.jpg',
    'viniegra': 'dafne-viniegra.jpg', 'lozano_martinez': 'javier-lozano.jpg', 'gomez': 'rodrigo-gomez-torre.jpg',
    'lozano_valdivia': 'elia-lozano.jpg', 'ibarra': 'ernesto-ibarra-sanchez.jpg',
    'sanchez_aguirre': 'juan-carlos-sanchez-aguirre.jpg', 'rojas_sanchez': 'antonio-rojas.jpg',
    'pinto_garcia': 'johanna-pinto.jpg', 'gomez_avila': 'gabriel-gomez-avila.jpg',
    'romero_gutierrez': 'maria-teresa-romero.jpg', 'hernandez_alcantara': 'sahara-hernandez.jpg',
    'willman': 'ramon-willman.jpg', 'delva': 'juan-delva-benavides.jpg',
    # ponentes del programa sin tarjeta en el index (fotos del Drive, 2026-09-14)
    'ccolque': 'lourdes-ccolque.jpg', 'ayllon': 'hector-ayllon.jpg', 'lamas_meza': 'saul-lamas.jpg', 'rodriguez_zambrano': 'johnatan-rodriguez.jpg',
    'vida_carrion': 'carmen-vida.jpg', 'gil_fons': 'antonio-gil-fons.jpg', 'bravo_vergara': 'jose-bravo-vergara.jpg', 'camarena': 'luz-camarena.jpg',
}
# 2026-09-14 (director): el «Guion de la mesa» sale del sitio; se conserva como documento en Drive (--guiones).
GUION_EN_SITIO = False
TITULOS = re.compile(r'^(Dr\.|Dra\.|Mtro\.|Mtra\.|Ing\.|Lic\.|Abog\.|Mag\.|Juez|M\.Sc\.)\s+')

def esc(s):
    return html.escape(s, quote=True) if s else ''

def strip_titulos(nombre):
    n = nombre
    while True:
        m = TITULOS.match(n)
        if not m: return n
        n = n[m.end():]

def monograma(nombre):
    partes = [p for p in strip_titulos(nombre).replace('-', ' ').split() if p[0].isupper()]
    if not partes: return '·'
    if len(partes) == 1: return partes[0][0]
    # primer nombre + primer apellido (heurística: 2.º token con mayúscula tras el nombre)
    return partes[0][0] + partes[-2 if len(partes) > 2 else -1][0]

def norm(s):
    s = unicodedata.normalize('NFD', s or '')
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()

def tr(key, es, lang):
    """texto para un idioma: ES desde los datos; EN/FR desde el diccionario si existe."""
    if lang == 'es' or not es: return es
    v = I18N.get(key, {}).get(lang)
    return v if v else es

# ─────────────────────────── tiempos ───────────────────────────
GDL = ZoneInfo('America/Mexico_City'); MAD = ZoneInfo('Europe/Madrid'); UTC = ZoneInfo('UTC')
def instante(fecha, hhmm, tz):
    h, m = map(int, hhmm.split(':'))
    return datetime(*map(int, fecha.split('-')), h, m, tzinfo=ZoneInfo(tz))
def iso_utc(dt): return dt.astimezone(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')
def hhmm(dt, tz): return dt.astimezone(tz).strftime('%-H:%M')

# ─────────────────────────── recuento ──────────────────────────
F18N = {'en': {}, 'fr': {}}
def f(key, es, attr='data-f18n'):
    """registra la clave en el diccionario EN/FR y devuelve el atributo para el HTML."""
    for lang in ('en', 'fr'):
        v = tr(key, es, lang)
        if v and v != es: F18N[lang][key] = v
    return f'{attr}="{key}"'

UI = DATA['ui']
# Orden de presentación (decisión del director, 2026-09-14): primero los días presenciales (21 · 22) y al final la
# Jornada Virtual (18). Los cálculos, el JSON-LD y programa-data.json siguen el orden cronológico de DATA['dias'].
DIAS_VISTA = [d for d in DATA['dias'] if d['modo'] != 'virtual'] + [d for d in DATA['dias'] if d['modo'] == 'virtual']
def ui(k): return UI[k]
def ui_attr(k, html_=False): return f('ui.' + k, UI[k], 'data-f18n-html' if html_ else 'data-f18n')

sesiones_total = 0; mesas_pres = 0; mesas_virt = 0; voces = set(); ejes_usados = set(); sedes = 0
for d in DATA['dias']:
    for b in d['bloques']:
        if d['modo'] == 'presencial': sedes += 1
        for s in b['sesiones']:
            sesiones_total += 1
            if s['tipo'] == 'mesa':
                if d['modo'] == 'virtual': mesas_virt += 1
                else: mesas_pres += 1
            ejes_usados.update(s['ejes'])
            for p in s['ponentes']:
                for per in p['personas']: voces.add(strip_titulos(per['nombre']))
            if s.get('modera'): voces.add(strip_titulos(s['modera']['nombre']))
CIFRAS = {'dias': len(DATA['dias']), 'sedes': sedes, 'mesas': mesas_pres + mesas_virt, 'voces': len(voces), 'ejes': len(ejes_usados)}

# ─────────────────────────── piezas HTML ───────────────────────
def chips_ejes(ejes, cls='eje-chip'):
    out = []
    for n in ejes:
        titulo = DATA['ejes'][str(n)]
        for lang in ('en', 'fr'): I18N.setdefault('eje.' + str(n), {})[lang] = EJES_I18N[lang][n]
        out.append(f'<a class="{cls}" href="ejes-foro.html#eje-{n}" title="{esc(titulo)}" data-eje="{n}"><b>{ROM[n]}</b><span {f("eje."+str(n), titulo)}>{esc(titulo)}</span></a>')
    return ''.join(out)

def foto_html(nombre, slug):
    if slug and slug in FOTOS:
        return f'<span class="pon-foto"><img src="img/ponentes/{FOTOS[slug]}" width="88" height="88" loading="lazy" decoding="async" alt=""></span>'
    return f'<span class="pon-foto pon-mono" aria-hidden="true">{esc(monograma(nombre))}</span>'

def persona_html(per, key_base):
    nombre = per['nombre']; slug = per.get('slug') or ''
    if slug: SLUGS_USADOS.add(slug)
    return (f'<button type="button" class="pon-nombre" data-sem="{slug}" data-idx="{1 if slug in INDEX_SLUGS else 0}" '
            f'aria-haspopup="dialog">{esc(nombre)}<i class="pon-ir" aria-hidden="true">↗</i></button>')

def ponente_html(p, skey, i):
    personas = p['personas']
    fotos = ''.join(foto_html(per['nombre'], per.get('slug')) for per in personas)
    nombres = '<span class="pon-sep" aria-hidden="true"> · </span>'.join(persona_html(per, f'{skey}.p{i}') for per in personas)
    afil = f'<span class="pon-afil" {f(f"{skey}.p{i}.afil", p["afil"])}>{esc(p["afil"])}</span>' if p.get('afil') else ''
    talk = f'<span class="pon-talk" {f(f"{skey}.p{i}.talk", p["talk"])}>{esc(p["talk"])}</span>' if p.get('talk') else ''
    multi = ' pon--multi' if len(personas) > 1 else ''
    return f'<li class="pon{multi}"><span class="pon-fotos">{fotos}</span><span class="pon-info"><span class="pon-nombres">{nombres}</span>{afil}{talk}</span></li>'

def busqueda(s):
    partes = [s['kicker'], s.get('titulo') or '', s.get('desc') or '']
    for p in s['ponentes']:
        partes += [per['nombre'] for per in p['personas']] + [p.get('afil') or '', p.get('talk') or '']
    if s.get('modera'): partes += [s['modera']['nombre'], s['modera'].get('afil') or '']
    partes += [DATA['ejes'][str(n)] for n in s['ejes']]
    return norm(' '.join(partes))

def sesion_html(dia, bloque, s, pagina='programa'):
    skey = 's.' + s['id']
    ini = instante(dia['fecha'], s['ini'], bloque['tz']); fin = instante(dia['fecha'], s['fin'], bloque['tz'])
    virtual = dia['modo'] == 'virtual'
    if virtual:
        hora = (f'<span class="h-par"><b>{s["ini"]}</b><i>ESP</i></span>'
                f'<span class="h-par"><b>{hhmm(ini, GDL)}</b><i>GDL</i></span>')
        rango = f'<span class="h-fin">– {s["fin"]} · {hhmm(fin, GDL)}</span>'
    else:
        hora = f'<span class="h-par"><b>{s["ini"].lstrip("0")}</b></span>'
        rango = f'<span class="h-fin">– {s["fin"]}</span>'
    ejes_attr = ' '.join(str(n) for n in s['ejes'])
    tipo_cls = f' sesion--{s["tipo"]}'
    kicker = f'<span class="s-kicker" {f(skey+".kicker", s["kicker"])}>{esc(s["kicker"])}</span>'
    chips = f'<span class="s-ejes">{chips_ejes(s["ejes"])}</span>' if s['ejes'] else ''
    titulo = f'<h3 class="s-titulo" {f(skey+".titulo", s["titulo"])}>{esc(s["titulo"])}</h3>' if s.get('titulo') else ''
    desc = f'<p class="s-desc" {f(skey+".desc", s["desc"])}>{esc(s["desc"])}</p>' if s.get('desc') else ''
    modera = ''
    if s.get('modera'):
        m = s['modera']
        # El «·» va FUERA del span traducible: dentro, el cambio de idioma reescribe el
        # textContent y se lo lleva por delante (se veía «Sánchez↗ Division Head» en inglés).
        afil = f' · <span class="mod-afil" {f(skey+".modera.afil", m["afil"])}>{esc(m["afil"])}</span>' if m.get('afil') else ''
        modera = (f'<div class="s-modera">{foto_html(m["nombre"], m.get("slug"))}<span><em {ui_attr("modera")}>{esc(ui("modera"))}</em> '
                  f'{persona_html(m, skey+".modera")}{afil}</span></div>')
    ponentes = ''
    if s['ponentes']:
        ponentes = '<ul class="s-ponentes">' + ''.join(ponente_html(p, skey, i) for i, p in enumerate(s['ponentes'])) + '</ul>'
        if GUION_EN_SITIO:
            ponentes += f'<button type="button" class="s-guion" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 12h6M10 16h6"/></svg><span {ui_attr("guion_btn")}>{esc(ui("guion_btn"))}</span></button>'
    # título para el .ics y la ficha «ahora»: kicker · título (o la primera ponencia)
    resumen = s.get('titulo') or (s['ponentes'][0]['talk'] if s['ponentes'] and s['ponentes'][0].get('talk') else '') or s.get('desc') or ''
    acciones = (f'<div class="s-acciones">'
                f'<button type="button" class="s-star" data-star="{s["id"]}" aria-pressed="false" aria-label="{esc(ui("agenda_add"))}" data-label-add="{esc(ui("agenda_add"))}" data-label-del="{esc(ui("agenda_del"))}">'
                f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.6l-6 3.3 1.3-6.6L2.4 9.7l6.7-.8z"/></svg></button>'
                f'<button type="button" class="s-ics" data-ics="{s["id"]}" aria-label="{esc(ui("ics_sesion"))}" title="{esc(ui("ics_sesion"))}">'
                f'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13v5M9.5 15.5h5"/></svg></button>'
                f'</div>') if pagina == 'programa' else ''
    return (f'<article class="sesion{tipo_cls}" id="s-{s["id"]}" data-sid="{s["id"]}" data-dia="{dia["id"]}" data-bloque="{bloque["id"]}" '
            f'data-ejes="{ejes_attr}" data-tipo="{s["tipo"]}" data-ini="{iso_utc(ini)}" data-fin="{iso_utc(fin)}" '
            f'data-sede="{esc(bloque["sede"])}" data-resumen="{esc(resumen)}" data-buscar="{esc(busqueda(s))}">'
            f'<div class="s-hora"><span class="h-ini">{hora}</span>{rango}<span class="h-local" hidden></span></div>'
            f'<div class="s-cuerpo"><div class="s-cab">{kicker}{chips}</div>{titulo}{desc}{modera}{ponentes}</div>{acciones}</article>')

def lugar_html(bloque):
    """Auditorio y domicilio de la sede (para el público presencial). Solo si los datos existen en programa.json."""
    if not bloque.get('auditorio') and not bloque.get('domicilio'): return ''
    bkey = 'bloque.' + bloque['id']
    aud = f'<b>{esc(bloque["auditorio"])}</b>' if bloque.get('auditorio') else ''   # nombre propio: no se traduce
    dom = f'<span class="sede-dom">{esc(bloque["domicilio"])}</span>' if bloque.get('domicilio') else ''
    mapa = (f' <a class="sede-mapa" href="{esc(bloque["mapa"])}" target="_blank" rel="noopener"><span {ui_attr("como_llegar")}>{esc(ui("como_llegar"))}</span> ↗</a>'
            if bloque.get('mapa') else '')
    sep = ' · ' if aud and dom else ''
    return (f'<p class="sede-lugar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.6"/></svg>'
            f'<span><span class="sede-label" {ui_attr("lugar_label")}>{esc(ui("lugar_label"))}</span> {aud}{sep}{dom}{mapa}</span></p>')

def bloque_html(dia, bloque, pagina='programa'):
    bkey = 'bloque.' + bloque['id']
    sesiones = ''.join(sesion_html(dia, bloque, s, pagina) for s in bloque['sesiones'])
    virtual_nota = ''
    if dia['modo'] == 'virtual' and pagina == 'programa':
        virtual_nota = (f'<p class="sede-nota"><span {ui_attr("virtual_min")}>{esc(ui("virtual_min"))}</span> · '
                        f'<span {ui_attr("virtual_registro")}>{esc(ui("virtual_registro"))}</span> '
                        f'<a href="inscripcion.html" {ui_attr("virtual_cta")}>{esc(ui("virtual_cta"))}</a></p>')
    cls_b = 'bloque' if pagina == 'programa' else 'pbloque'   # jornada-virtual.html ya usa .bloque para otra cosa
    return (f'<section class="{cls_b} {cls_b}--{bloque["id"]}" id="{bloque["id"]}" data-bloque="{bloque["id"]}" aria-labelledby="h-{bloque["id"]}">'
            f'<header class="sede">'
            f'<div class="sede-txt"><span class="sede-label" {ui_attr("sede_label")}>{esc(ui("sede_label"))}</span>'
            f'<h2 class="sede-nombre" id="h-{bloque["id"]}" {f(bkey+".sede", bloque["sede"])}>{esc(bloque["sede"])}</h2>'
            f'<p class="sede-sub" {f(bkey+".sede_sub", bloque["sede_sub"])}>{esc(bloque["sede_sub"])}</p></div>'
            f'<div class="sede-hora"><span class="sede-label" {ui_attr("horario_label")}>{esc(ui("horario_label"))}</span><b {f(bkey+".horario", bloque["horario"])}>{esc(bloque["horario"])}</b></div>'
            f'<p class="sede-temas"><span {ui_attr("temas_label")}>{esc(ui("temas_label"))}</span> · <span {f(bkey+".temas", bloque["temas"])}>{esc(bloque["temas"])}</span></p>'
            f'{lugar_html(bloque)}'
            f'</header>{virtual_nota}<div class="sesiones">{sesiones}</div>'
            f'<p class="sin-resultados" hidden {ui_attr("filtro_sin_resultados")}>{esc(ui("filtro_sin_resultados"))}</p>'
            f'</section>')

def continua_html(sig_bloque, dia):
    s0 = sig_bloque['sesiones'][0]
    txt = ui('continua').replace('{sede}', sig_bloque['sede']).replace('{h}', s0['ini'].lstrip('0'))
    return (f'<div class="continua" aria-hidden="true"><span class="continua-linea"></span>'
            f'<span class="continua-txt" data-continua="{esc(sig_bloque["sede"])}|{s0["ini"].lstrip("0")}" {ui_attr("continua")}>{esc(txt)}</span>'
            f'<span class="continua-linea"></span></div>')

def dia_html(dia):
    dkey = 'dia.' + dia['id']
    bloques = []
    for i, b in enumerate(dia['bloques']):
        if i: bloques.append(continua_html(b, dia))
        bloques.append(bloque_html(dia, b))
    fecha_larga = f'{dia["dow"]} {dia["num"]} de {dia["mes"]} de 2026'
    return (f'<section class="dia dia--{dia["modo"]}" id="{dia["anchor"]}" data-dia="{dia["id"]}">'
            f'<header class="dia-cab reveal">'
            f'<span class="dia-num" aria-hidden="true">{dia["num"]}</span>'
            f'<div class="dia-txt">'
            f'<span class="dia-eyebrow"><span {f(dkey+".etiqueta", dia["etiqueta"])}>{esc(dia["etiqueta"])}</span></span>'
            f'<h2 class="dia-titulo"><span {f(dkey+".dow", dia["dow"])}>{esc(dia["dow"])}</span> {dia["num"]} <span {f(dkey+".mes", "de "+dia["mes"])}>de {dia["mes"]}</span></h2>'
            f'<p class="dia-sub" {f(dkey+".sub", dia["sub"])}>{esc(dia["sub"])}</p>'
            f'</div></header>' + ''.join(bloques) + '</section>')

# ─────────────────────────── JSON-LD ───────────────────────────
ORGANIZADOR_LD = {'@type': 'Organization', 'name': 'Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»', 'url': 'https://forodyt.com/'}
OFERTA_LD = {'@type': 'Offer', 'name': 'Inscripción al IV Foro', 'url': 'https://forodyt.com/inscripcion.html', 'price': '0', 'priceCurrency': 'MXN',
             'availability': 'https://schema.org/InStock', 'validFrom': '2026-05-01', 'validThrough': '2026-09-22'}

def desc_bloque(d, b):
    """Descripción de un subEvent: sede, día y los títulos de sus mesas, conferencias y actos, en orden."""
    titulos = [s['titulo'] for s in b['sesiones'] if s.get('titulo') and s.get('tipo') not in ('receso', 'pausa')]
    cab = f'{b["sede"]} ({b["sede_sub"]}), {d["dow"]} {d["num"]} de {d["mes"]} de 2026. IV Foro Internacional de Derecho y Tecnología.'
    txt = cab + (' ' + ' · '.join(titulos) + '.' if titulos else '')
    return txt if len(txt) <= 480 else txt[:477].rsplit(' · ', 1)[0] + '…'

def jsonld():
    # Cada subEvent lleva también image, description, organizer y offers: Google los evalúa como Event
    # por separado y, sin ellos, Search Console avisa «Falta el campo…» (aviso del 2026-09-23).
    sub = []
    for d in DATA['dias']:
        for b in d['bloques']:
            ini = instante(d['fecha'], b['sesiones'][0]['ini'], b['tz']); fin = instante(d['fecha'], b['sesiones'][-1]['fin'], b['tz'])
            performers = []
            vistos = set()
            for s in b['sesiones']:
                for p in s['ponentes']:
                    for per in p['personas']:
                        n = strip_titulos(per['nombre'])
                        if n not in vistos: vistos.add(n); performers.append({'@type': 'Person', 'name': n})
            loc = ({'@type': 'VirtualLocation', 'url': 'https://forodyt.com/jornada-virtual.html'} if d['modo'] == 'virtual'
                   else {'@type': 'Place', 'name': (b['auditorio'] + ' · ' if b.get('auditorio') else '') + f'{b["sede"]} · {b["sede_sub"]}',
                         'address': {'@type': 'PostalAddress', **({'streetAddress': b['domicilio']} if b.get('domicilio') else {}),
                                     'addressLocality': b.get('municipio') or ('Zapopan' if 'Zapopan' in b['sede_sub'] else 'Guadalajara'), 'addressRegion': 'Jalisco', 'addressCountry': 'MX'},
                         **({'hasMap': b['mapa']} if b.get('mapa') else {})})
            sub.append({'@type': 'Event', 'name': f'{b["sede"]} · {d["dow"]} {d["num"]} de {d["mes"]} de 2026 · IV Foro Internacional de Derecho y Tecnología',
                        'startDate': ini.isoformat(), 'endDate': fin.isoformat(),
                        'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode' if d['modo'] == 'virtual' else 'https://schema.org/MixedEventAttendanceMode',
                        'eventStatus': 'https://schema.org/EventScheduled', 'location': loc, 'performer': performers,
                        'description': desc_bloque(d, b),
                        'image': 'https://forodyt.com/og/og-jornada.png' if d['modo'] == 'virtual' else 'https://forodyt.com/og/og-programa.png',
                        'organizer': ORGANIZADOR_LD, 'offers': OFERTA_LD,
                        'url': f'https://forodyt.com/programa.html#{b["id"]}'})
    ev = {'@context': 'https://schema.org', '@type': 'Event', 'name': 'IV Foro Internacional de Derecho y Tecnología',
          'description': UI['meta_desc'], 'startDate': '2026-09-18', 'endDate': '2026-09-22',
          'eventAttendanceMode': 'https://schema.org/MixedEventAttendanceMode', 'eventStatus': 'https://schema.org/EventScheduled',
          'image': 'https://forodyt.com/og/og-programa.png', 'url': 'https://forodyt.com/programa.html', 'inLanguage': ['es', 'en', 'fr'],
          'organizer': ORGANIZADOR_LD, 'offers': OFERTA_LD,
          # location es obligatorio en Event: las cuatro sedes presenciales + la transmisión, tomadas de los subEvent
          'location': [x['location'] for x in sub if x['location']['@type'] == 'Place'] + [{'@type': 'VirtualLocation', 'url': 'https://forodyt.com/en-vivo.html'}],
          'subEvent': sub}
    return json.dumps(ev, ensure_ascii=False, indent=1).replace('</', '<\\/')

# ─────────────────────────── CSS ───────────────────────────────
CSS_MODAL = r"""
/* ── semblanzas: el expediente del ponente y el guion de la mesa ── */
.pon-nombre { font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer; text-align:left; text-decoration:none; border-bottom:1px solid rgba(150,116,45,.35); transition:border-color .3s, color .3s; }
.pon-nombre:hover { color:var(--teal-deep); border-bottom-color:var(--teal); }
.s-guion { margin-top:14px; display:inline-flex; align-items:center; gap:8px; font:inherit; font-family:var(--mono); font-size:9.5px; letter-spacing:.22em; text-transform:uppercase; color:var(--dorado-deep); background:none; border:1px solid rgba(150,116,45,.35); padding:6px 11px 5px; cursor:pointer; transition:border-color .3s, background .3s, color .3s; }
.s-guion svg { width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round; }
.s-guion:hover { border-color:var(--dorado-deep); background:rgba(184,146,62,.1); color:var(--ink); }
.sem-overlay { position:fixed; inset:0; z-index:2000; background:rgba(10,20,34,.72); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .35s var(--ease); }
.sem-overlay.abierta { opacity:1; pointer-events:auto; }
.sem-panel { position:relative; width:min(860px, 100%); max-height:min(88vh, 900px); overflow:auto; background:var(--marfil); color:var(--ink); padding:clamp(26px,4vw,48px); box-shadow:0 30px 80px rgba(10,20,34,.45); transform:translateY(16px); transition:transform .4s var(--ease); }
.sem-overlay.abierta .sem-panel { transform:none; }
.sem-panel::before, .sem-panel::after { content:""; position:absolute; width:28px; height:28px; border:1.5px solid var(--dorado); pointer-events:none; }
.sem-panel::before { top:12px; left:12px; border-right:0; border-bottom:0; }
.sem-panel::after { bottom:12px; right:12px; border-left:0; border-top:0; }
.sem-cerrar { position:absolute; top:18px; right:18px; font-family:var(--mono); font-size:10px; letter-spacing:.24em; text-transform:uppercase; color:var(--ink-soft); border:1px solid var(--ink-rule); padding:8px 12px; background:var(--papel, rgba(251,247,236,.7)); cursor:pointer; transition:border-color .3s, color .3s; z-index:2; }
.sem-cerrar:hover { border-color:var(--dorado); color:var(--ink); }
.sem-cab { display:grid; grid-template-columns:132px 1fr; gap:24px; align-items:start; padding-right:80px; }
.sem-foto { width:132px; height:132px; background:var(--noche); border:1px solid rgba(184,146,62,.35); overflow:hidden; display:flex; align-items:center; justify-content:center; }
.sem-foto img { width:100%; height:100%; object-fit:cover; display:block; }
.sem-foto .pon-mono { font-size:34px; }
.sem-eyebrow { font-family:var(--mono); font-size:9.5px; letter-spacing:.28em; text-transform:uppercase; color:var(--dorado-deep); }
.sem-nombre { margin-top:8px; font-family:var(--serif); font-weight:580; font-size:clamp(22px,2.6vw,32px); line-height:1.12; letter-spacing:-.01em; font-variation-settings:"opsz" 100,"SOFT" 30; }
.sem-afil { margin-top:8px; font-size:13.5px; color:var(--ink-soft); line-height:1.55; }
.sem-sesion { margin-top:10px; font-family:var(--mono); font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--teal); }
.sem-texto { margin-top:24px; padding-top:22px; border-top:1px solid var(--ink-rule); font-family:var(--serif); font-size:16px; line-height:1.72; font-variation-settings:"opsz" 40; }
.sem-texto p + p { margin-top:12px; }
.sem-pend { margin-top:24px; padding:14px 18px; border:1px dashed rgba(150,116,45,.5); font-family:var(--serif); font-style:italic; font-size:14px; color:var(--ink-soft); }
.sem-talk { margin-top:22px; padding:18px 22px; background:rgba(251,247,236,.8); border-left:2px solid var(--dorado); }
.sem-talk-l { font-family:var(--mono); font-size:9px; letter-spacing:.26em; text-transform:uppercase; color:var(--dorado-deep); }
.sem-talk-t { margin-top:6px; font-family:var(--serif); font-style:italic; font-size:16px; line-height:1.45; }
.sem-ficha { display:inline-block; margin-top:20px; font-family:var(--mono); font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--teal); text-decoration:none; border-bottom:1px solid rgba(42,92,92,.4); }
.sem-ficha:hover { border-bottom-color:var(--teal); }
.sem-ficha[hidden] { display:none; }
/* guion de la mesa */
.guion-cab { padding-right:80px; }
.guion-sesion { margin-top:8px; font-family:var(--serif); font-weight:580; font-size:clamp(20px,2.4vw,28px); line-height:1.15; }
.guion-intro { margin-top:8px; font-size:13.5px; color:var(--ink-soft); }
.guion-acciones { margin-top:16px; display:flex; gap:10px; flex-wrap:wrap; }
.guion-print { display:inline-flex; align-items:center; gap:8px; font:inherit; font-family:var(--mono); font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--marfil); background:var(--ink); border:0; padding:10px 16px; cursor:pointer; transition:background .3s; }
.guion-print:hover { background:var(--teal-deep); }
.guion-lista { list-style:none; margin-top:22px; counter-reset:g; }
.guion-item { display:grid; grid-template-columns:72px 1fr; gap:18px; padding:22px 0; border-top:1px solid var(--ink-rule); counter-increment:g; }
.guion-item .sem-foto { width:72px; height:72px; }
.guion-item .sem-foto .pon-mono { font-size:20px; }
.guion-rol { font-family:var(--mono); font-size:9px; letter-spacing:.26em; text-transform:uppercase; color:var(--dorado-deep); }
.guion-rol::before { content:counter(g, upper-roman) " · "; color:var(--ink-faint); }
.guion-nombre { margin-top:4px; font-family:var(--serif); font-weight:580; font-size:19px; line-height:1.2; }
.guion-afil { margin-top:4px; font-size:12.5px; color:var(--ink-soft); }
.guion-talk { margin-top:8px; font-family:var(--serif); font-style:italic; font-size:14.5px; line-height:1.45; }
.guion-texto { margin-top:10px; font-family:var(--serif); font-size:14.5px; line-height:1.65; }
.guion-texto.pend { font-style:italic; color:var(--ink-soft); }
body.sem-lock { overflow:hidden; }
@media (max-width:640px) { .sem-cab { grid-template-columns:1fr; padding-right:0; padding-top:36px; } .sem-foto { width:96px; height:96px; } .guion-item { grid-template-columns:56px 1fr; gap:12px; } .guion-item .sem-foto { width:56px; height:56px; } .guion-cab { padding-right:0; padding-top:36px; } }
@media print {
  body.print-guion > *:not(.sem-overlay) { display:none !important; }
  body.print-guion .sem-overlay { position:static; display:block; background:none; padding:0; opacity:1; backdrop-filter:none; }
  body.print-guion .sem-panel { max-height:none; overflow:visible; box-shadow:none; padding:0; width:auto; transform:none; }
  body.print-guion .sem-panel::before, body.print-guion .sem-panel::after, body.print-guion .sem-cerrar, body.print-guion .guion-acciones, body.print-guion .sem-ficha { display:none !important; }
  body.print-guion .guion-item { break-inside:avoid; }
  body.print-guion .sem-foto { display:none; }
  body.print-guion .guion-item { grid-template-columns:1fr; }
}
"""

CSS_BASE = r"""
:root {
  --ink:#0E1B2C; --ink-soft:rgba(14,27,44,.72); --ink-faint:rgba(14,27,44,.5); --ink-rule:rgba(14,27,44,.14);
  --teal:#2A5C5C; --teal-deep:#1F4747; --dorado:#B8923E; --dorado-soft:#C8A858; --dorado-deep:#96742D;
  --marfil:#F5EFE0; --marfil-2:#EFE8D6; --papel:rgba(251,247,236,.7); --lacre:#7E2A22; --noche:#0A1422;
  --ease:cubic-bezier(.22,1,.36,1);
  --mono:'JetBrains Mono','Courier New',monospace; --serif:'Fraunces',Georgia,serif; --sans:'Inter',-apple-system,sans-serif;
  --gutter:clamp(20px,4vw,48px); --max:1380px; --nav-h:74px;
}
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior:auto; } *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
body { font-family:var(--sans); font-weight:300; background:var(--marfil); color:var(--ink); line-height:1.6; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
::selection { background:var(--dorado); color:var(--marfil); }
body::after { content:""; position:fixed; inset:0; z-index:9997; pointer-events:none; opacity:.032;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E"); }
a { color:inherit; }
button { font:inherit; color:inherit; background:none; border:0; cursor:pointer; }
:focus-visible { outline:2px solid var(--dorado); outline-offset:3px; }
[hidden] { display:none !important; }

/* ── nav (idéntico al resto del sitio) ── */
.nav { position:fixed; top:0; left:0; right:0; z-index:1000; background:rgba(245,239,224,.88); backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px); border-bottom:1px solid var(--ink-rule); }
.nav-inner { max-width:var(--max); margin:0 auto; padding:0 var(--gutter); height:var(--nav-h); display:flex; align-items:center; justify-content:space-between; gap:24px; }
.brand { display:flex; align-items:center; gap:14px; text-decoration:none; color:var(--ink); }
.brand-mark { font-family:var(--serif); font-size:21px; font-weight:600; font-style:italic; font-variation-settings:"opsz" 40,"SOFT" 60; white-space:nowrap; }
.brand-rule { width:30px; height:1px; background:var(--dorado); }
.brand-sub { font-family:var(--mono); font-size:9.5px; letter-spacing:.24em; text-transform:uppercase; color:var(--ink-faint); white-space:nowrap; }
.nav-links { display:flex; list-style:none; gap:clamp(14px,2vw,30px); }
.nav-links a { font-size:13.5px; font-weight:400; color:var(--ink-soft); text-decoration:none; letter-spacing:.01em; transition:color .3s; }
.nav-links a:hover, .nav-links a[aria-current] { color:var(--ink); }
.nav-cta { display:flex; align-items:center; gap:18px; }
.lang { font-family:var(--mono); font-size:10.5px; letter-spacing:.12em; color:var(--ink-faint); user-select:none; }
.lang span { cursor:pointer; padding:3px 4px; transition:color .3s; }
.lang span.active { color:var(--dorado-deep); font-weight:500; }
.btn-primary { display:inline-block; background:var(--ink); color:var(--marfil); font-size:13.5px; font-weight:500; padding:11px 22px; text-decoration:none; letter-spacing:.02em; transition:background .3s, transform .3s; }
.btn-primary:hover { background:var(--teal-deep); transform:translateY(-1px); }
.btn-ghost { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--ink-rule); color:var(--ink); font-size:13px; font-weight:400; padding:10px 18px; text-decoration:none; transition:border-color .3s, background .3s; }
.btn-ghost:hover { border-color:var(--dorado); background:rgba(184,146,62,.08); }
.btn-ghost svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
@media (max-width:1320px) { .brand-sub { display:none; } }
@media (max-width:1024px) { .nav-links { display:none; } }

/* ── hero ── */
.hero-p { max-width:var(--max); margin:0 auto; padding:clamp(120px,16vh,180px) var(--gutter) clamp(30px,4vw,54px); position:relative; }
.hero-p .fantasma { position:absolute; right:clamp(-30px,2vw,60px); top:96px; z-index:0; font-family:var(--serif); font-weight:620; font-style:italic; font-size:clamp(150px,22vw,360px); line-height:1; color:transparent; -webkit-text-stroke:1.5px rgba(150,116,45,.18); font-variation-settings:"opsz" 144,"SOFT" 40; pointer-events:none; user-select:none; }
.eyebrow { display:flex; align-items:center; flex-wrap:wrap; gap:14px; font-family:var(--mono); font-size:11px; font-weight:500; letter-spacing:.3em; text-transform:uppercase; color:var(--dorado-deep); position:relative; z-index:1; }
.eyebrow::before { content:""; width:44px; height:1.5px; background:var(--dorado); }
.eyebrow .version { color:var(--ink-faint); letter-spacing:.18em; font-weight:400; }
.hero-p h1 { margin-top:26px; font-family:var(--serif); font-weight:560; font-size:clamp(40px,6.2vw,84px); line-height:1.04; letter-spacing:-.015em; font-variation-settings:"opsz" 144,"SOFT" 25; max-width:900px; position:relative; z-index:1; }
.hero-p h1 em { font-style:italic; color:var(--teal); font-variation-settings:"opsz" 144,"SOFT" 78; }
.hero-p .lead { margin-top:24px; max-width:680px; font-size:16.5px; color:var(--ink-soft); position:relative; z-index:1; }
.hero-p .lead b { font-weight:500; color:var(--ink); }

/* los tres actos: 21 · 22 · 18 (presenciales primero, jornada virtual al final) */
.actos { margin-top:40px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1px; background:var(--ink-rule); border:1px solid var(--ink-rule); position:relative; z-index:1; max-width:980px; }
.acto { display:flex; gap:18px; align-items:flex-start; padding:22px 24px 20px; background:var(--papel); text-decoration:none; color:inherit; transition:background .4s var(--ease); position:relative; }
.acto:hover { background:#FBF7EC; }
.acto-num { font-family:var(--serif); font-weight:620; font-size:54px; line-height:.9; letter-spacing:-.02em; color:var(--ink); font-variation-settings:"opsz" 144,"SOFT" 30; font-variant-numeric:tabular-nums; }
.acto--virtual .acto-num { color:var(--teal); }
.acto-txt { display:flex; flex-direction:column; gap:4px; padding-top:4px; }
.acto-dow { font-family:var(--mono); font-size:9.5px; letter-spacing:.26em; text-transform:uppercase; color:var(--dorado-deep); }
.acto-sedes { font-family:var(--serif); font-size:15px; font-weight:500; line-height:1.3; }
.acto-modo { font-size:11.5px; color:var(--ink-faint); }
.acto::after { content:"↓"; position:absolute; right:16px; bottom:12px; font-family:var(--mono); font-size:12px; color:var(--dorado-deep); opacity:0; transform:translateY(-4px); transition:opacity .35s, transform .35s; }
.acto:hover::after { opacity:1; transform:none; }
@media (max-width:760px) { .actos { grid-template-columns:1fr; } .acto { padding:16px 18px; } .acto-num { font-size:42px; } .hero-p .fantasma { top:64px; right:0; font-size:150px; opacity:.55; } }

/* ahora: el reloj vivo de la edición */
.ahora { margin-top:22px; max-width:980px; position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,1.35fr) minmax(0,1fr); gap:1px; background:rgba(200,168,88,.25); border:1px solid rgba(200,168,88,.35); }
.ahora > div { background:var(--noche); color:var(--marfil); padding:22px 26px 20px; display:flex; flex-direction:column; gap:8px; min-width:0; }
.ahora-label { font-family:var(--mono); font-size:9.5px; letter-spacing:.26em; text-transform:uppercase; color:var(--dorado-soft); display:flex; align-items:center; gap:8px; }
.ahora-label .punto { width:7px; height:7px; border-radius:50%; background:var(--dorado-soft); opacity:.5; }
.ahora--vivo .ahora-label .punto { background:#E0473B; opacity:1; animation:latido 1.6s ease-in-out infinite; }
@keyframes latido { 0%,100% { opacity:.35; transform:scale(.8); } 50% { opacity:1; transform:scale(1.05); } }
.ahora-cuenta { display:flex; align-items:baseline; gap:12px; }
.ahora-cuenta b { font-family:var(--serif); font-size:46px; font-weight:620; line-height:.95; color:var(--dorado); font-variant-numeric:tabular-nums; }
.ahora-cuenta i { font-family:var(--mono); font-style:normal; font-size:10px; letter-spacing:.24em; text-transform:uppercase; color:rgba(245,239,224,.55); }
.ahora-titulo { font-family:var(--serif); font-size:clamp(17px,1.6vw,21px); font-weight:520; line-height:1.25; color:var(--marfil); }
.ahora-titulo a { text-decoration:none; color:inherit; border-bottom:1px solid rgba(200,168,88,.4); transition:border-color .3s; }
.ahora-titulo a:hover { border-bottom-color:var(--dorado-soft); }
.ahora-meta { font-family:var(--mono); font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:rgba(245,239,224,.55); }
.ahora-meta b { color:var(--dorado-soft); font-weight:500; }
.ahora-sig { background:#10203A!important; }
@media (max-width:700px) { .ahora { grid-template-columns:1fr; } .ahora-cuenta b { font-size:38px; } }

/* cifras y acciones */
.cifras { margin-top:26px; display:flex; flex-wrap:wrap; gap:0; border-top:1px solid var(--ink-rule); border-bottom:1px solid var(--ink-rule); max-width:980px; position:relative; z-index:1; }
.cifra { flex:1 1 150px; padding:16px 22px 14px 0; display:flex; flex-direction:column; }
.cifra + .cifra { padding-left:22px; border-left:1px solid var(--ink-rule); }
.cifra b { font-family:var(--serif); font-size:30px; font-weight:600; line-height:1; color:var(--ink); font-variant-numeric:tabular-nums; }
.cifra span { margin-top:5px; font-family:var(--mono); font-size:9.5px; letter-spacing:.22em; text-transform:uppercase; color:var(--dorado-deep); }
.cifra em { margin-top:3px; font-family:var(--serif); font-style:italic; font-size:12.5px; color:var(--ink-faint); }
@media (max-width:640px) { .cifra { flex-basis:45%; padding:14px 12px 12px 0; } .cifra + .cifra { padding-left:14px; } .cifra:nth-child(3) { border-left:0; padding-left:0; } }
.acciones { margin-top:24px; display:flex; flex-wrap:wrap; gap:10px; position:relative; z-index:1; }

/* ── riel pegajoso: días · sedes · filtros ── */
.riel { position:sticky; top:var(--nav-h); z-index:900; background:rgba(245,239,224,.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-top:1px solid var(--ink-rule); border-bottom:1px solid var(--ink-rule); }
.riel-inner { max-width:var(--max); margin:0 auto; padding:10px var(--gutter); display:flex; flex-direction:column; gap:8px; }
.riel-fila { display:flex; align-items:center; gap:8px; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; }
.riel-fila::-webkit-scrollbar { display:none; }
.riel-label { flex:none; font-family:var(--mono); font-size:9.5px; letter-spacing:.24em; text-transform:uppercase; color:var(--ink-faint); margin-right:4px; }
.chip { flex:none; display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border:1px solid var(--ink-rule); background:var(--papel); font-family:var(--mono); font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); text-decoration:none; white-space:nowrap; transition:border-color .3s, color .3s, background .3s; }
.chip:hover { border-color:var(--dorado); color:var(--ink); }
.chip.activo, .chip[aria-pressed="true"], .chip[aria-current] { border-color:var(--ink); background:var(--ink); color:var(--marfil); }
.chip b { font-family:var(--serif); font-style:italic; font-weight:600; font-size:13px; letter-spacing:0; text-transform:none; }
.chip--virtual b { color:var(--teal); } .chip.activo b, .chip[aria-current] b { color:var(--dorado-soft); }
.chip--eje { padding:6px 10px; }
.chip--eje b { font-style:normal; font-size:11px; }
.riel-buscar { flex:1 1 220px; min-width:180px; display:flex; align-items:center; gap:8px; border:1px solid var(--ink-rule); background:var(--papel); padding:0 12px; height:32px; }
.riel-buscar svg { width:14px; height:14px; fill:none; stroke:var(--ink-faint); stroke-width:1.8; stroke-linecap:round; flex:none; }
.riel-buscar input { flex:1; min-width:0; border:0; background:transparent; font:inherit; font-size:13px; color:var(--ink); outline:none; }
.riel-buscar input::placeholder { color:var(--ink-faint); }
.riel-n { flex:none; font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--ink-faint); white-space:nowrap; }
.riel-limpiar { flex:none; font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--lacre); border-bottom:1px dotted rgba(126,42,34,.5); padding-bottom:1px; }
.riel-limpiar[hidden] { display:none; }
.tz { flex:none; display:inline-flex; border:1px solid var(--ink-rule); background:var(--papel); }
.tz button { padding:6px 11px; font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); transition:background .3s, color .3s; white-space:nowrap; }
.tz button[aria-pressed="true"] { background:var(--teal); color:var(--marfil); }
.tz button + button { border-left:1px solid var(--ink-rule); }
.tz-nota { font-size:11.5px; color:var(--ink-faint); }
@media (max-width:820px) {
  .riel-inner { padding:8px var(--gutter); gap:6px; }
  .riel-fila--filtros { flex-wrap:wrap; overflow:visible; }
  .riel-fila--filtros .riel-label { display:none; }
  .riel-buscar { flex-basis:100%; order:-1; height:34px; }
  .riel-n { display:none; }
  .chip { padding:6px 10px; font-size:10px; }
}

/* ── días y sedes ── */
main { position:relative; z-index:1; }
.dia { max-width:var(--max); margin:0 auto; padding:clamp(36px,5vw,64px) var(--gutter) 0; scroll-margin-top:calc(var(--nav-h) + 96px); }
.dia + .dia { border-top:1px solid var(--ink-rule); }
.dia-cab { display:flex; align-items:flex-end; gap:clamp(16px,3vw,36px); padding-bottom:22px; border-bottom:1.5px solid var(--ink); margin-bottom:clamp(24px,3vw,40px); }
.dia-num { font-family:var(--serif); font-weight:620; font-size:clamp(84px,12vw,150px); line-height:.82; letter-spacing:-.03em; color:var(--ink); font-variation-settings:"opsz" 144,"SOFT" 30; font-variant-numeric:tabular-nums; }
.dia--virtual .dia-num { color:var(--teal); }
.dia-eyebrow { display:flex; align-items:center; gap:12px; font-family:var(--mono); font-size:10px; font-weight:500; letter-spacing:.3em; text-transform:uppercase; color:var(--dorado-deep); }
.dia-titulo { margin-top:8px; font-family:var(--serif); font-weight:560; font-size:clamp(26px,3.6vw,44px); line-height:1.05; letter-spacing:-.01em; font-variation-settings:"opsz" 144,"SOFT" 30; }
.dia-sub { margin-top:8px; font-size:14px; color:var(--ink-soft); }

.bloque { scroll-margin-top:calc(var(--nav-h) + 96px); margin-bottom:clamp(26px,3vw,40px); }
.bloque:last-child { margin-bottom:clamp(30px,4vw,56px); }
.sede { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px 24px; align-items:end; padding:22px 26px 18px; color:var(--marfil); background:var(--noche); position:relative; overflow:hidden; }
.sede::after { content:attr(data-num); }
.bloque--cugdl .sede, .bloque--cineteca .sede, .bloque--virtual .sede { background:var(--teal-deep); }
.sede-label { display:block; font-family:var(--mono); font-size:9px; letter-spacing:.28em; text-transform:uppercase; color:rgba(245,239,224,.5); margin-bottom:6px; }
.sede-nombre { font-family:var(--serif); font-weight:600; font-size:clamp(26px,3vw,38px); line-height:1; letter-spacing:-.01em; font-variation-settings:"opsz" 144,"SOFT" 30; }
.sede-sub { margin-top:6px; font-size:12.5px; color:rgba(245,239,224,.72); }
.sede-hora { text-align:right; }
.sede-hora b { display:inline-block; font-family:var(--mono); font-weight:500; font-size:13px; letter-spacing:.12em; padding:8px 14px; background:var(--dorado); color:var(--noche); }
.sede-temas { grid-column:1 / -1; padding-top:12px; border-top:1px solid rgba(245,239,224,.14); font-family:var(--mono); font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--dorado-soft); }
.sede-temas > span:first-child { color:rgba(245,239,224,.5); }
.sede-lugar { grid-column:1 / -1; display:flex; gap:10px; align-items:flex-start; padding-top:10px; font-size:13px; line-height:1.55; color:rgba(245,239,224,.8); }
.sede-lugar svg { flex:0 0 auto; width:15px; height:15px; margin-top:3px; fill:none; stroke:var(--dorado-soft); stroke-width:1.6; stroke-linejoin:round; }
.sede-lugar .sede-label { display:inline; margin:0 6px 0 0; }
.sede-lugar b { font-weight:500; color:var(--marfil); }
.sede-dom { color:rgba(245,239,224,.72); }
.sede-mapa { color:var(--dorado-soft); text-decoration:none; border-bottom:1px solid rgba(200,168,88,.4); white-space:nowrap; margin-left:6px; }
.sede-mapa:hover { color:var(--marfil); border-bottom-color:var(--marfil); }
.sede-nota { margin:14px 2px 0; font-size:13px; color:var(--ink-soft); }
.sede-nota a { color:var(--teal); font-weight:500; text-decoration:none; border-bottom:1px solid rgba(42,92,92,.4); }
.sede-nota a:hover { border-bottom-color:var(--teal); }
@media (max-width:640px) { .sede { grid-template-columns:1fr; padding:18px 18px 16px; } .sede-hora { text-align:left; } }

/* ── sesiones: el hilo ── */
.sesiones { position:relative; margin-top:6px; }
.sesiones::before { content:""; position:absolute; left:138px; top:14px; bottom:14px; width:1px; background:linear-gradient(var(--ink-rule), rgba(150,116,45,.55), var(--ink-rule)); }
.sesion { position:relative; display:grid; grid-template-columns:118px 1fr auto; gap:0 clamp(18px,3vw,40px); padding:24px 0 26px; border-bottom:1px solid var(--ink-rule); transition:opacity .4s var(--ease); }
.sesion::before { content:""; position:absolute; left:134px; top:32px; width:9px; height:9px; border-radius:50%; background:var(--marfil); border:1.5px solid var(--dorado-deep); z-index:1; transition:background .3s, transform .3s; }
.sesion--ceremonia::before { border-color:var(--ink-faint); }
.sesion:hover::before { background:var(--dorado); transform:scale(1.15); }
.sesion[hidden] { display:none; }
.sesion { scroll-margin-top:calc(var(--nav-h) + 112px); }
.sesion.pasada { opacity:.5; }
.sesion.pasada:hover { opacity:1; }
.sesion.en-curso { background:linear-gradient(90deg, rgba(184,146,62,.09), transparent 60%); margin:0 -14px; padding-left:14px; padding-right:14px; }
.sesion.en-curso::before { left:148px; background:#E0473B; border-color:#E0473B; animation:latido 1.6s ease-in-out infinite; }
.sesion.en-curso .sesiones::before { left:152px; }
.sesion.en-curso .s-cab::after { content:attr(data-vivo); font-family:var(--mono); font-size:9px; letter-spacing:.24em; text-transform:uppercase; color:#E0473B; border:1px solid #E0473B; padding:3px 7px; margin-left:auto; }
.s-hora { font-family:var(--mono); color:var(--ink); padding-top:2px; display:flex; flex-direction:column; gap:3px; }
.h-ini { display:flex; flex-direction:column; gap:2px; }
.h-par { display:flex; align-items:baseline; gap:6px; }
.h-par b { font-weight:500; font-size:15px; letter-spacing:.02em; font-variant-numeric:tabular-nums; }
.h-par i { font-style:normal; font-size:8.5px; letter-spacing:.22em; color:var(--ink-faint); }
.h-par + .h-par b { font-size:12.5px; color:var(--ink-soft); }
.h-fin { font-size:10.5px; color:var(--ink-faint); letter-spacing:.06em; }
.h-local { font-size:10.5px; color:var(--teal); letter-spacing:.06em; margin-top:2px; border-top:1px dotted rgba(42,92,92,.4); padding-top:4px; }
.h-local b { font-weight:500; font-size:13px; }
.s-cab { display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; }
.s-kicker { font-family:var(--mono); font-size:10px; font-weight:500; letter-spacing:.24em; text-transform:uppercase; color:var(--dorado-deep); }
.sesion--ceremonia .s-kicker { color:var(--ink-faint); }
.sesion--conferencia .s-kicker, .sesion--especial .s-kicker { color:var(--lacre); }
.s-ejes { display:inline-flex; flex-wrap:wrap; gap:6px; }
.eje-chip { display:inline-flex; align-items:center; gap:6px; text-decoration:none; font-family:var(--mono); font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); border:1px solid rgba(150,116,45,.35); padding:3px 8px 2px; transition:border-color .3s, color .3s, background .3s; }
.eje-chip b { font-family:var(--serif); font-weight:600; font-size:11px; letter-spacing:0; color:var(--dorado-deep); }
.eje-chip span { max-width:0; overflow:hidden; white-space:nowrap; opacity:0; transition:max-width .5s var(--ease), opacity .4s; }
.eje-chip:hover span, .eje-chip:focus-visible span { max-width:340px; opacity:1; }
.eje-chip:hover { border-color:var(--dorado-deep); color:var(--ink); background:rgba(184,146,62,.08); }
.s-titulo { margin-top:8px; font-family:var(--serif); font-weight:580; font-size:clamp(19px,2vw,25px); line-height:1.2; letter-spacing:-.01em; font-variation-settings:"opsz" 100,"SOFT" 30; max-width:820px; }
.s-desc { margin-top:8px; font-size:14px; color:var(--ink-soft); max-width:640px; }
.sesion--mesa .s-desc { font-family:var(--serif); font-style:italic; font-size:15px; }
.s-modera { margin-top:14px; display:flex; align-items:center; gap:10px; font-size:13px; color:var(--ink-soft); }
.s-modera em { font-style:normal; font-family:var(--mono); font-size:9px; letter-spacing:.22em; text-transform:uppercase; color:var(--teal); margin-right:4px; }
.s-modera .pon-foto { width:30px; height:30px; }
.s-modera .pon-nombre { font-weight:500; color:var(--ink); }
.s-ponentes { list-style:none; margin-top:16px; display:flex; flex-direction:column; gap:14px; }
.pon { display:flex; gap:14px; align-items:flex-start; }
.pon-fotos { display:flex; flex:none; }
.pon-fotos .pon-foto + .pon-foto { margin-left:-10px; }
.pon-foto { flex:none; width:46px; height:46px; background:var(--noche); border:1px solid rgba(184,146,62,.35); overflow:hidden; display:inline-flex; align-items:center; justify-content:center; border-radius:2px; }
.pon-foto img { width:100%; height:100%; object-fit:cover; display:block; filter:grayscale(.92) sepia(.14) contrast(1.02); transition:filter .6s var(--ease), transform .6s var(--ease); }
.pon:hover .pon-foto img, .s-modera:hover .pon-foto img { filter:none; transform:scale(1.06); }
.pon-mono { font-family:var(--serif); font-style:italic; font-weight:600; font-size:15px; color:var(--dorado-soft); letter-spacing:.02em; }
.pon-info { display:flex; flex-direction:column; gap:2px; min-width:0; }
.pon-nombres { font-family:var(--serif); font-size:15.5px; font-weight:560; line-height:1.3; color:var(--ink); }
.pon-nombre { text-decoration:none; }
a.pon-nombre { border-bottom:1px solid rgba(150,116,45,.35); transition:border-color .3s, color .3s; }
a.pon-nombre:hover { color:var(--teal-deep); border-bottom-color:var(--teal); }
.pon-ir { font-style:normal; font-size:10px; margin-left:4px; color:var(--dorado-deep); }
.pon-afil { font-size:12.5px; color:var(--ink-soft); line-height:1.5; }
.pon-talk { margin-top:4px; font-family:var(--serif); font-style:italic; font-size:14.5px; line-height:1.45; color:var(--ink); max-width:760px; }
.s-acciones { display:flex; flex-direction:column; gap:6px; align-items:center; padding-top:2px; }
.s-star, .s-ics { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--ink-rule); background:var(--papel); color:var(--ink-faint); transition:border-color .3s, color .3s, background .3s, transform .3s; }
.s-star svg, .s-ics svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round; }
.s-star:hover, .s-ics:hover { border-color:var(--dorado); color:var(--dorado-deep); transform:translateY(-1px); }
.s-star[aria-pressed="true"] { border-color:var(--dorado); color:var(--dorado-deep); background:rgba(184,146,62,.12); }
.s-star[aria-pressed="true"] svg { fill:var(--dorado); }
.sin-resultados { padding:22px 0; font-family:var(--serif); font-style:italic; color:var(--ink-faint); }
.sin-resultados[hidden] { display:none; }
.continua { display:flex; align-items:center; gap:16px; margin:0 0 clamp(30px,4vw,54px); }
.continua-linea { flex:1; height:1px; background:var(--ink-rule); }
.continua-txt { font-family:var(--mono); font-size:10px; letter-spacing:.24em; text-transform:uppercase; color:var(--dorado-deep); text-align:center; }
@media (max-width:820px) {
  .sesiones::before { display:none; }
  .sesion { grid-template-columns:1fr; gap:10px; padding:20px 0 22px; }
  .sesion::before { display:none; }
  .sesion.en-curso { margin:0; padding-left:0; padding-right:0; background:none; border-left:3px solid #E0473B; padding-left:14px; }
  .s-hora { flex-direction:row; align-items:baseline; gap:10px; flex-wrap:wrap; }
  .h-ini { flex-direction:row; gap:10px; }
  .h-local { border-top:0; padding-top:0; margin-top:0; }
  .s-acciones { flex-direction:row; justify-content:flex-start; }
  .s-titulo { font-size:20px; }
  .pon-foto { width:40px; height:40px; }
}

/* ── mi agenda (píldora flotante) ── */
.agenda-pill { position:fixed; right:18px; bottom:18px; z-index:950; display:flex; align-items:center; gap:14px; padding:12px 16px 12px 18px; background:var(--noche); color:var(--marfil); border:1px solid rgba(200,168,88,.45); box-shadow:0 12px 32px rgba(10,20,34,.28); transform:translateY(20px); opacity:0; pointer-events:none; transition:opacity .4s var(--ease), transform .4s var(--ease); max-width:calc(100vw - 36px); }
.agenda-pill.visible { opacity:1; transform:none; pointer-events:auto; }
.agenda-pill .ap-txt { display:flex; flex-direction:column; gap:2px; }
.agenda-pill .ap-t { font-family:var(--mono); font-size:9.5px; letter-spacing:.26em; text-transform:uppercase; color:var(--dorado-soft); }
.agenda-pill .ap-n { font-family:var(--serif); font-size:15px; font-weight:520; }
.agenda-pill button { font-family:var(--mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; padding:8px 12px; border:1px solid rgba(200,168,88,.5); color:var(--dorado-soft); white-space:nowrap; transition:background .3s, color .3s; }
.agenda-pill button:hover { background:var(--dorado); color:var(--noche); }

/* ── banda final ── */
.banda { background:var(--noche); color:var(--marfil); margin-top:clamp(30px,4vw,60px); }
.banda-inner { max-width:var(--max); margin:0 auto; padding:clamp(54px,7vw,96px) var(--gutter); display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr); gap:clamp(30px,5vw,80px); align-items:center; }
.banda h2 { font-family:var(--serif); font-weight:540; font-size:clamp(28px,4vw,50px); line-height:1.1; letter-spacing:-.01em; font-variation-settings:"opsz" 144,"SOFT" 30; }
.banda h2 em { font-style:italic; color:var(--dorado-soft); }
.banda p { margin-top:16px; font-size:15px; color:rgba(245,239,224,.72); max-width:560px; }
.banda-cta { display:flex; flex-direction:column; gap:12px; align-items:flex-start; }
.banda .btn-primary { background:var(--dorado); color:var(--noche); font-weight:600; padding:15px 30px; }
.banda .btn-primary:hover { background:var(--dorado-soft); }
.banda-link { font-size:13.5px; color:rgba(245,239,224,.72); text-decoration:none; border-bottom:1px solid rgba(245,239,224,.3); transition:color .3s, border-color .3s; }
.banda-link:hover { color:var(--marfil); border-color:var(--marfil); }
.banda-pie { font-family:var(--mono); font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:rgba(245,239,224,.45); }
/* ALIADOS-CSS:INICIO — «El Foro no camina solo» (copia del index; generado por programa.py) */
.aliados { background:#C5B9A5; padding:clamp(56px,7vw,96px) var(--gutter); }
.aliados-inner { max-width:1180px; margin:0 auto; }
.aliados h2 { font-family:var(--serif); font-weight:500; font-size:clamp(30px,4vw,52px); line-height:1.05; letter-spacing:-.02em; text-align:center; color:var(--ink); margin:0 0 clamp(40px,5vw,70px); font-variation-settings:"opsz" 144,"SOFT" 30; }
.aliados h2 em { font-style:italic; color:var(--teal-deep); }
.aliados-list { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(28px,4vw,56px) clamp(24px,3vw,48px); align-items:center; }
.aliado-cell { display:flex; align-items:center; justify-content:center; height:92px; flex:0 0 calc((100% - 4 * clamp(24px,3vw,48px)) / 5); }
.aliado-logo { max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; transition:transform .5s var(--ease); }
.aliado-cell:hover .aliado-logo { transform:scale(1.05); }
.aliado-link { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
.aliado-link:focus-visible { outline:2px solid var(--dorado-deep); outline-offset:4px; }
@media (max-width:920px) { .aliado-cell { flex-basis:calc((100% - 2 * clamp(24px,3vw,48px)) / 3); height:76px; } }
@media (max-width:560px) { .aliado-cell { flex-basis:calc((100% - clamp(24px,3vw,48px)) / 2); height:64px; } }
/* ALIADOS-CSS:FIN */
@media (max-width:860px) { .banda-inner { grid-template-columns:1fr; } }

footer { background:var(--noche); color:rgba(245,239,224,.6); padding:26px var(--gutter) 34px; border-top:1px solid rgba(245,239,224,.1); }
.footer-inner { max-width:var(--max); margin:0 auto; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px 24px; font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; }
.footer-inner a { color:var(--dorado-soft); text-decoration:none; }
.footer-inner a:hover { color:var(--marfil); }

/* ── revelado ── */
html.js .reveal { opacity:0; transform:translateY(22px); transition:opacity .8s var(--ease), transform .8s var(--ease); }
html.js .reveal.in-view { opacity:1; transform:none; }
"""+CSS_MODAL+r"""

/* ── impresión: el programa limpio, sin cromo ── */
@media print {
  @page { margin:14mm; }
  body { background:#fff; color:#000; font-size:11px; }
  body::after, .nav, .riel, .acciones, .ahora, .s-acciones, .agenda-pill, .banda, .hero-p .fantasma, .eje-chip span, .pon-ir { display:none!important; }
  .hero-p { padding:0 0 12px; }
  .hero-p h1 { font-size:28px; }
  .actos, .cifras { display:none; }
  .dia { padding:18px 0 0; page-break-before:auto; }
  .dia-cab { break-after:avoid; }
  .sede { background:#111!important; color:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:12px 14px; }
  .sesion { grid-template-columns:90px 1fr; padding:10px 0; break-inside:avoid; opacity:1!important; }
  .sesiones::before, .sesion::before { display:none; }
  .sesion[hidden] { display:grid!important; }
  .sin-resultados { display:none!important; }
  .pon-foto { display:none; }
  .s-titulo { font-size:15px; }
  .pon-talk { font-size:11.5px; }
  .h-local { display:none; }
  a { text-decoration:none; color:inherit; }
}
"""

def modal_html():
    return (f'<div class="sem-overlay" id="semOverlay" role="dialog" aria-modal="true" aria-labelledby="semNombre">'
            f'<div class="sem-panel">'
            f'<button type="button" class="sem-cerrar" id="semCerrar" {ui_attr("sem_cerrar")}>{esc(ui("sem_cerrar"))}</button>'
            f'<div id="semUno">'
            f'<div class="sem-cab"><div class="sem-foto" id="semFoto"></div><div>'
            f'<div class="sem-eyebrow"><span id="semEyeP" {ui_attr("sem_eyebrow")}>{esc(ui("sem_eyebrow"))}</span><span id="semEyeM" hidden {ui_attr("sem_modera_eyebrow")}>{esc(ui("sem_modera_eyebrow"))}</span></div>'
            f'<h2 class="sem-nombre" id="semNombre"></h2><p class="sem-afil" id="semAfil"></p><p class="sem-sesion" id="semSesion"></p>'
            f'</div></div>'
            f'<div class="sem-texto" id="semTexto"></div>'
            f'<p class="sem-pend" id="semPend" hidden {ui_attr("sem_pend")}>{esc(ui("sem_pend"))}</p>'
            f'<div class="sem-talk" id="semTalkBox" hidden><div class="sem-talk-l" {ui_attr("sem_presenta")}>{esc(ui("sem_presenta"))}</div><div class="sem-talk-t" id="semTalk"></div></div>'
            f'<a class="sem-ficha" id="semFicha" href="#" hidden><span {ui_attr("sem_ficha")}>{esc(ui("sem_ficha"))}</span> ↗</a>'
            f'</div>'
            + ((f'<div id="semGuion" hidden>'
                f'<div class="guion-cab"><div class="sem-eyebrow" {ui_attr("guion_t")}>{esc(ui("guion_t"))}</div><h2 class="guion-sesion" id="guionSesion"></h2>'
                f'<p class="guion-intro" {ui_attr("guion_intro")}>{esc(ui("guion_intro"))}</p>'
                f'<div class="guion-acciones"><button type="button" class="guion-print" id="guionPrint"><span {ui_attr("guion_print")}>{esc(ui("guion_print"))}</span></button></div></div>'
                f'<ol class="guion-lista" id="guionLista"></ol>'
                f'</div>') if GUION_EN_SITIO else '')
            + '</div></div>')

MODAL_JS = r"""
(function () {
  'use strict';
  var SEM = __SEM__;
  var ov = document.getElementById('semOverlay'); if (!ov) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lastFocus = null, estado = null;
  function lang() { return document.documentElement.lang || 'es'; }
  function texto(slug) { var d = slug && SEM[slug]; if (!d) return null; return d[lang()] || d.es || null; }
  function parrafos(t) { return t.split(/\n\s*\n/).map(function (p) { return '<p>' + p.replace(/</g, '&lt;') + '</p>'; }).join(''); }
  function fotoDe(pon) { var f = pon.querySelector('.pon-foto'); return f ? f.innerHTML : ''; }
  function sesionDe(el) { return el.closest('.sesion'); }
  function rotulo(ses) { var k = $('.s-kicker', ses), t = $('.s-titulo', ses); return (k ? k.textContent.trim() : '') + (t ? ' · ' + t.textContent.trim() : ''); }
  function abrirUno(btn) {
    var slug = btn.getAttribute('data-sem') || '';
    var pon = btn.closest('.pon') || btn.closest('.s-modera');
    var ses = sesionDe(btn);
    var esModera = !!btn.closest('.s-modera');
    estado = { tipo: 'uno', btn: btn };
    $('#semUno').hidden = false; if ($('#semGuion')) $('#semGuion').hidden = true;
    $('#semFoto').innerHTML = pon ? fotoDe(pon) : '';
    $('#semNombre').textContent = btn.textContent.replace(/↗/g, '').trim();
    var afil = pon ? pon.querySelector('.pon-afil, .mod-afil') : null;
    $('#semAfil').textContent = afil ? afil.textContent.replace(/^·\s*/, '').trim() : '';
    var sede = ses ? ses.getAttribute('data-sede') : '';
    var sedeEl = ses ? document.querySelector('#' + ses.getAttribute('data-bloque') + ' .sede-nombre') : null;
    $('#semSesion').textContent = ses ? rotulo(ses) + ' · ' + (sedeEl ? sedeEl.textContent.trim() : sede) : '';
    $('#semEyeP').hidden = esModera; $('#semEyeM').hidden = !esModera;
    var tx = texto(slug);
    $('#semTexto').innerHTML = tx ? parrafos(tx) : ''; $('#semTexto').hidden = !tx; $('#semPend').hidden = !!tx;
    var talk = pon ? pon.querySelector('.pon-talk') : null;
    $('#semTalkBox').hidden = !talk; if (talk) $('#semTalk').textContent = talk.textContent.trim();
    var ficha = $('#semFicha'); var enIndex = btn.getAttribute('data-idx') === '1';
    ficha.hidden = !enIndex; if (enIndex) ficha.href = 'index.html#semblanza-' + slug;
    mostrar(btn);
  }
  function abrirGuion(btn) {
    var ses = sesionDe(btn); if (!ses || !$('#semGuion')) return;
    estado = { tipo: 'guion', btn: btn, ses: ses };
    $('#semUno').hidden = true; $('#semGuion').hidden = false;
    $('#guionSesion').textContent = rotulo(ses);
    var items = [];
    var mod = $('.s-modera', ses);
    if (mod) items.push({ el: mod, rol: ($('em', mod) || {}).textContent || 'Modera', btn: $('.pon-nombre', mod), afil: $('.mod-afil', mod), talk: null });
    $$('.pon', ses).forEach(function (p) {
      $$('.pon-nombre', p).forEach(function (b) { items.push({ el: p, rol: ($('#semEyeP') || {}).textContent || 'Ponente', btn: b, afil: $('.pon-afil', p), talk: $('.pon-talk', p) }); });
    });
    $('#guionLista').innerHTML = items.map(function (it) {
      var slug = it.btn.getAttribute('data-sem') || ''; var tx = texto(slug);
      var foto = it.el.classList.contains('s-modera') ? fotoDe(it.el) : (function () {  // foto n ↔ nombre n
        // en filas con varias personas, la foto n corresponde al nombre n
        var fotos = $$('.pon-foto', it.el), idx = $$('.pon-nombre', it.el).indexOf(it.btn); return fotos[idx] ? fotos[idx].innerHTML : '';
      })();
      return '<li class="guion-item"><div class="sem-foto">' + foto + '</div><div>' +
        '<div class="guion-rol">' + it.rol.replace(/</g, '&lt;') + '</div>' +
        '<div class="guion-nombre">' + it.btn.textContent.replace(/↗/g, '').trim().replace(/</g, '&lt;') + '</div>' +
        (it.afil ? '<div class="guion-afil">' + it.afil.textContent.replace(/^·\s*/, '').trim().replace(/</g, '&lt;') + '</div>' : '') +
        (it.talk ? '<div class="guion-talk">' + it.talk.textContent.trim().replace(/</g, '&lt;') + '</div>' : '') +
        (tx ? '<div class="guion-texto">' + parrafos(tx) + '</div>' : '<div class="guion-texto pend">' + $('#semPend').textContent + '</div>') +
        '</div></li>';
    }).join('');
    mostrar(btn);
  }
  function mostrar(btn) { lastFocus = btn; ov.classList.add('abierta'); document.body.classList.add('sem-lock'); $('.sem-panel', ov).scrollTop = 0; $('#semCerrar').focus(); }
  function cerrar() { ov.classList.remove('abierta'); document.body.classList.remove('sem-lock'); estado = null; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.pon-nombre'); if (b) { e.preventDefault(); abrirUno(b); return; }
    var g = e.target.closest('.s-guion'); if (g) { abrirGuion(g); return; }
    if (e.target === ov) cerrar();
  });
  $('#semCerrar').addEventListener('click', cerrar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('abierta')) cerrar(); });
  if ($('#guionPrint')) $('#guionPrint').addEventListener('click', function () {
    document.body.classList.add('print-guion');
    var limpiar = function () { document.body.classList.remove('print-guion'); window.removeEventListener('afterprint', limpiar); };
    window.addEventListener('afterprint', limpiar); window.print(); setTimeout(limpiar, 1500);
  });
  if ('MutationObserver' in window) {
    new MutationObserver(function () { if (!estado) return; if (estado.tipo === 'uno') abrirUno(estado.btn); else abrirGuion(estado.btn); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
})();
"""

def modal_js(slugs):
    sem = {k: SEM[k] for k in sorted(slugs) if k in SEM}
    return MODAL_JS.replace('__SEM__', json.dumps(sem, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))

# ─────────────────────────── JS ────────────────────────────────
def js_pagina():
    # el diccionario EN/FR va incrustado; json.dumps escapa lo necesario una sola vez.
    # ES lleva solo los rótulos que el JS compone en vivo (no están en el DOM al cargar).
    es_js = {('ui.' + k): v for k, v in UI.items() if k.startswith(('now_', 'filtro_', 'agenda_', 'ics_', 'tz_', 'continua', 'meta_title'))}
    for k in UI:
        for lang in ('en', 'fr'):
            v = I18N.get('ui.' + k, {}).get(lang)
            if v: F18N[lang]['ui.' + k] = v
    dict_json = json.dumps({'es': es_js, 'en': F18N['en'], 'fr': F18N['fr']}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return r"""
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── f18n: mini-diccionario propio de la página (ES vive en el HTML) ── */
  var F18N = __F18N__;
  var F18N_ES = {};
  function f18nCapture() {
    $$('[data-f18n]').forEach(function (el) { var k = el.getAttribute('data-f18n'); if (!(k in F18N_ES)) F18N_ES[k] = el.textContent; });
    $$('[data-f18n-html]').forEach(function (el) { var k = el.getAttribute('data-f18n-html'); if (!(k in F18N_ES)) F18N_ES[k] = el.innerHTML; });
  }
  function t(k, lang) { lang = lang || LANG; var d = F18N[lang]; if (d && d[k]) return d[k]; if (F18N.es[k]) return F18N.es[k]; return F18N_ES[k] !== undefined ? F18N_ES[k] : k; }
  function f18nApply(lang) {
    var dict = F18N[lang];
    $$('[data-f18n]').forEach(function (el) { var k = el.getAttribute('data-f18n'); var v = (dict && dict[k]) ? dict[k] : F18N_ES[k]; if (v !== undefined) el.textContent = v; });
    $$('[data-f18n-html]').forEach(function (el) { var k = el.getAttribute('data-f18n-html'); var v = (dict && dict[k]) ? dict[k] : F18N_ES[k]; if (v !== undefined) el.innerHTML = v; });
    // botones con etiqueta por atributo
    $$('.s-star').forEach(function (b) {
      b.setAttribute('data-label-add', t('ui.agenda_add', lang)); b.setAttribute('data-label-del', t('ui.agenda_del', lang));
      b.setAttribute('aria-label', b.getAttribute('aria-pressed') === 'true' ? t('ui.agenda_del', lang) : t('ui.agenda_add', lang));
    });
    $$('.s-ics').forEach(function (b) { b.setAttribute('aria-label', t('ui.ics_sesion', lang)); b.setAttribute('title', t('ui.ics_sesion', lang)); });
    $$('.continua-txt').forEach(function (el) { var p = (el.getAttribute('data-continua') || '|').split('|'); el.textContent = t('ui.continua', lang).replace('{sede}', p[0]).replace('{h}', p[1]); });
    $$('.sesion .s-cab').forEach(function (el) { el.setAttribute('data-vivo', t('ui.now_en_curso', lang)); });
    var inp = $('#buscar'); if (inp) inp.setAttribute('placeholder', t('ui.filtro_buscar', lang));
    var tzn = $('#tzNota'); if (tzn) tzn.textContent = t('ui.tz_detectada', lang).replace('{tz}', TZ_LOCAL);
    if (F18N[lang] && F18N[lang]['ui.meta_title']) document.title = F18N[lang]['ui.meta_title']; else document.title = F18N.es['ui.meta_title'];
  }
  function currentLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang'); if (q && /^(es|en|fr)$/.test(q)) return q;
      var s = localStorage.getItem('forodyt_lang'); if (s && /^(es|en|fr)$/.test(s)) return s;
    } catch (e) {}
    return 'es';
  }
  var LANG = currentLang();
  var TZ_LOCAL = 'UTC';
  try { TZ_LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}

  /* ── datos de las sesiones, leídos del DOM (una sola fuente: el HTML) ── */
  var SESIONES = $$('.sesion').map(function (el) {
    return { el: el, id: el.getAttribute('data-sid'), ini: new Date(el.getAttribute('data-ini')), fin: new Date(el.getAttribute('data-fin')),
      dia: el.getAttribute('data-dia'), bloque: el.getAttribute('data-bloque'), sede: el.getAttribute('data-sede'),
      ejes: (el.getAttribute('data-ejes') || '').split(' ').filter(Boolean), tipo: el.getAttribute('data-tipo'), buscar: el.getAttribute('data-buscar') || '' };
  });
  function kickerDe(s) { var k = $('.s-kicker', s.el); return k ? k.textContent.trim() : ''; }
  function tituloDe(s) {
    var h = $('.s-titulo', s.el); if (h) return h.textContent.trim();
    var talk = $('.pon-talk', s.el); if (talk) return talk.textContent.trim();
    var d = $('.s-desc', s.el); return d ? d.textContent.trim() : kickerDe(s);
  }
  function fmt(d, tz, conFecha) {
    try {
      var o = { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: tz };
      if (conFecha) { o.weekday = 'short'; o.day = 'numeric'; }
      return new Intl.DateTimeFormat(LANG === 'es' ? 'es-MX' : (LANG === 'fr' ? 'fr-FR' : 'en-GB'), o).format(d).replace(/(^|\s)0(\d:)/, '$1$2');
    } catch (e) { return ''; }
  }
  var GDL = 'America/Mexico_City';

  /* ── hora local ── */
  var tzModo = 'gdl';
  function pintarHoras() {
    var local = tzModo === 'local' && TZ_LOCAL !== GDL;
    SESIONES.forEach(function (s) {
      var h = $('.h-local', s.el);
      if (!h) return;
      if (!local) { h.hidden = true; return; }
      var mismaFecha = fmt(s.ini, TZ_LOCAL, true);
      h.innerHTML = '<b>' + fmt(s.ini, TZ_LOCAL) + '</b> – ' + fmt(s.fin, TZ_LOCAL) + ' · ' + mismaFecha.replace(/\d+:\d+/, '').replace(/,\s*$/, '').trim();
      h.hidden = false;
    });
    $$('.tz button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tz') === tzModo ? 'true' : 'false'); });
  }
  $$('.tz button').forEach(function (b) { b.addEventListener('click', function () { tzModo = b.getAttribute('data-tz'); try { localStorage.setItem('forodyt_tz', tzModo); } catch (e) {} pintarHoras(); }); });
  try { var tzGuardado = localStorage.getItem('forodyt_tz'); if (tzGuardado === 'local') tzModo = 'local'; } catch (e) {}
  if (TZ_LOCAL === GDL) { var tzBox = $('.tz'); if (tzBox) tzBox.hidden = true; var tzN = $('#tzNota'); if (tzN) tzN.hidden = true; }

  /* ── mi agenda (localStorage) ── */
  var AGENDA = [];
  try { AGENDA = JSON.parse(localStorage.getItem('forodyt_agenda') || '[]'); if (!Array.isArray(AGENDA)) AGENDA = []; } catch (e) { AGENDA = []; }
  function guardarAgenda() { try { localStorage.setItem('forodyt_agenda', JSON.stringify(AGENDA)); } catch (e) {} }
  function pintarAgenda() {
    $$('.s-star').forEach(function (b) {
      var on = AGENDA.indexOf(b.getAttribute('data-star')) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? b.getAttribute('data-label-del') : b.getAttribute('data-label-add'));
    });
    var pill = $('#agendaPill'); if (!pill) return;
    var n = AGENDA.length;
    $('#agendaN').textContent = t('ui.agenda_n').replace('{n}', n);
    pill.classList.toggle('visible', n > 0);
    var chip = $('#chipAgenda'); if (chip) chip.querySelector('b').textContent = n;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.s-star'); if (!b) return;
    var id = b.getAttribute('data-star'); var i = AGENDA.indexOf(id);
    if (i >= 0) AGENDA.splice(i, 1); else AGENDA.push(id);
    guardarAgenda(); pintarAgenda(); filtrar();
  });

  /* ── .ics ── */
  function icsFecha(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsTxt(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsDe(lista) {
    var out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//forodyt.com//IV Foro Internacional de Derecho y Tecnologia//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:IV Foro Internacional de Derecho y Tecnologia'];
    var stamp = icsFecha(new Date());
    lista.forEach(function (s) {
      var pon = $$('.pon', s.el).map(function (p) { var n = $('.pon-nombres', p).textContent.trim(); var tk = $('.pon-talk', p); return n + (tk ? ' — ' + tk.textContent.trim() : ''); });
      var mod = $('.s-modera', s.el); if (mod) pon.unshift(mod.textContent.replace(/\s+/g, ' ').trim());
      var desc = pon.join('\n') + '\n\nhttps://forodyt.com/programa.html#s-' + s.id;
      out.push('BEGIN:VEVENT', 'UID:' + s.id + '-2026@forodyt.com', 'DTSTAMP:' + stamp, 'DTSTART:' + icsFecha(s.ini), 'DTEND:' + icsFecha(s.fin),
        'SUMMARY:' + icsTxt(kickerDe(s) + ' · ' + tituloDe(s)), 'DESCRIPTION:' + icsTxt(desc), 'LOCATION:' + icsTxt(s.sede + ' · IV Foro Internacional de Derecho y Tecnologia'),
        'URL:https://forodyt.com/programa.html#s-' + s.id, 'END:VEVENT');
    });
    out.push('END:VCALENDAR');
    return out.join('\r\n');
  }
  function descargar(nombre, texto) {
    var blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ics]'); if (!b) return;
    var q = b.getAttribute('data-ics');
    if (q === 'todo') return descargar('forodyt-2026-programa.ics', icsDe(SESIONES));
    if (q === 'agenda') return descargar('forodyt-2026-mi-agenda.ics', icsDe(SESIONES.filter(function (s) { return AGENDA.indexOf(s.id) >= 0; })));
    var s = SESIONES.filter(function (x) { return x.id === q; })[0]; if (s) descargar('forodyt-2026-' + q + '.ics', icsDe([s]));
  });

  /* ── filtros: eje · texto · mi agenda ── */
  var ejeActivo = null, texto = '', soloAgenda = false;
  function normalizar(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function filtrar() {
    var q = normalizar(texto).trim(); var visibles = 0;
    SESIONES.forEach(function (s) {
      var ok = true;
      if (ejeActivo && s.ejes.indexOf(ejeActivo) < 0) ok = false;
      if (ok && q && s.buscar.indexOf(q) < 0) ok = false;
      if (ok && soloAgenda && AGENDA.indexOf(s.id) < 0) ok = false;
      s.el.hidden = !ok; if (ok) visibles++;
    });
    $$('.bloque').forEach(function (b) {
      var alguna = $$('.sesion', b).some(function (el) { return !el.hidden; });
      var sr = $('.sin-resultados', b); if (sr) sr.hidden = alguna;
    });
    $$('.continua').forEach(function (c) { c.hidden = !!(ejeActivo || q || soloAgenda); });
    var n = $('#rielN'); if (n) n.textContent = t('ui.filtro_n').replace('{n}', visibles);
    var lim = $('#limpiar'); if (lim) lim.hidden = !(ejeActivo || q || soloAgenda);
    $$('.chip--eje').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-eje') === ejeActivo ? 'true' : 'false'); });
    var ct = $('#chipTodos'); if (ct) ct.setAttribute('aria-pressed', ejeActivo ? 'false' : 'true');
    var ca = $('#chipAgenda'); if (ca) ca.setAttribute('aria-pressed', soloAgenda ? 'true' : 'false');
  }
  $$('.chip--eje').forEach(function (c) { c.addEventListener('click', function () { var e = c.getAttribute('data-eje'); ejeActivo = (ejeActivo === e) ? null : e; filtrar(); }); });
  var chipTodos = $('#chipTodos'); if (chipTodos) chipTodos.addEventListener('click', function () { ejeActivo = null; filtrar(); });
  var chipAgenda = $('#chipAgenda'); if (chipAgenda) chipAgenda.addEventListener('click', function () { soloAgenda = !soloAgenda; filtrar(); });
  var buscar = $('#buscar'); if (buscar) buscar.addEventListener('input', function () { texto = buscar.value; filtrar(); });
  var limpiar = $('#limpiar'); if (limpiar) limpiar.addEventListener('click', function () { ejeActivo = null; texto = ''; soloAgenda = false; if (buscar) buscar.value = ''; filtrar(); });

  /* ── scrollspy del riel ── */
  var chipsBloque = $$('.chip--bloque');
  if ('IntersectionObserver' in window && chipsBloque.length) {
    var activoBloque = null;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) activoBloque = en.target.id; });
      chipsBloque.forEach(function (c) { if (c.getAttribute('data-bloque') === activoBloque) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    $$('.bloque').forEach(function (b) { spy.observe(b); });
  }

  /* ── ahora: el reloj vivo ── */
  var ahora = $('#ahora');
  function diasHasta(fechaISO) { var d = new Date(fechaISO); return Math.ceil((d - new Date()) / 86400000); }
  function pintarAhora() {
    if (!ahora) return;
    var now = new Date();
    var enCurso = null, siguiente = null;
    SESIONES.forEach(function (s) {
      s.el.classList.remove('en-curso');
      if (s.ini <= now && now < s.fin && !enCurso) enCurso = s;
      if (s.ini > now && (!siguiente || s.ini < siguiente.ini)) siguiente = s;
    });
    var enEvento = now >= new Date('2026-09-18T00:00:00-06:00') && now <= new Date('2026-09-23T00:00:00-06:00');
    SESIONES.forEach(function (s) { s.el.classList.toggle('pasada', enEvento && s.fin <= now); });
    var L = $('#ahoraLabel'), T = $('#ahoraTitulo'), M = $('#ahoraMeta'), SL = $('#sigLabel'), ST = $('#sigTitulo'), SM = $('#sigMeta'), C = $('#ahoraCuenta');
    function tarjeta(s) { return '<a href="#s-' + s.id + '">' + kickerDe(s) + ' · ' + tituloDe(s) + '</a>'; }
    function meta(s, pref) {
      var tzv = s.dia === 'd18' ? 'Europe/Madrid' : GDL;
      var h = fmt(pref === 'desde' ? s.ini : s.fin, tzv) + (s.dia === 'd18' ? ' ESP · ' + fmt(pref === 'desde' ? s.ini : s.fin, GDL) + ' GDL' : '');
      var sedeEl = document.querySelector('#' + s.bloque + ' .sede-nombre');
      return '<b>' + (sedeEl ? sedeEl.textContent.trim() : s.sede) + '</b> · ' + t(pref === 'desde' ? 'ui.now_desde' : 'ui.now_hasta').replace('{h}', h);
    }
    ahora.classList.toggle('ahora--vivo', !!enCurso);
    C.hidden = true; T.hidden = false;
    if (enCurso) {
      L.textContent = t('ui.now_en_curso'); T.innerHTML = tarjeta(enCurso); M.innerHTML = meta(enCurso, 'hasta');
      enCurso.el.classList.add('en-curso');
    } else if (siguiente) {
      var dv = diasHasta('2026-09-18T00:00:00-06:00'), dp = diasHasta('2026-09-21T00:00:00-06:00');
      if (now < new Date('2026-09-18T00:00:00-06:00')) {
        C.hidden = false; T.hidden = true;
        $('#ahoraCuentaN').textContent = String(dv).padStart(2, '0');
        L.textContent = dv === 1 ? t('ui.now_manana') : t('ui.now_faltan_virtual').replace('{n}', dv);
        M.innerHTML = t('ui.now_faltan_presencial').replace('{n}', dp);
      } else if (enEvento && siguiente.ini - now > 12 * 3600000 && !(siguiente.ini.getUTCDate() === now.getUTCDate())) {
        L.textContent = t('ui.now_hoy_termino'); T.innerHTML = tarjeta(siguiente); M.innerHTML = meta(siguiente, 'desde');
      } else {
        L.textContent = t('ui.now_siguiente'); T.innerHTML = tarjeta(siguiente); M.innerHTML = meta(siguiente, 'desde');
      }
    } else {
      L.textContent = t('ui.now_concluyo'); T.innerHTML = '<a href="memorias.html">' + t('ui.now_concluyo_sub') + '</a>'; M.innerHTML = '';
    }
    // segunda tarjeta: lo que sigue
    var sig2 = enCurso ? siguiente : (siguiente ? SESIONES.filter(function (s) { return s.ini > siguiente.ini; }).sort(function (a, b) { return a.ini - b.ini; })[0] : null);
    var box = $('#ahoraSig');
    if (sig2 && (enCurso || (siguiente && now >= new Date('2026-09-18T00:00:00-06:00')))) { box.hidden = false; SL.textContent = t('ui.now_siguiente'); ST.innerHTML = tarjeta(sig2); SM.innerHTML = meta(sig2, 'desde'); }
    else if (siguiente && now < new Date('2026-09-18T00:00:00-06:00')) { box.hidden = false; SL.textContent = t('ui.now_siguiente'); ST.innerHTML = tarjeta(siguiente); SM.innerHTML = meta(siguiente, 'desde'); }
    else box.hidden = true;
  }

  /* ── revelado ── */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } }); }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in-view'); }); }

  /* ── anclas suaves con margen del riel ── */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var tgt = document.querySelector(a.getAttribute('href')); if (!tgt) return;
    e.preventDefault(); history.replaceState(null, '', a.getAttribute('href'));
    tgt.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  });

  /* ── arranque ── */
  function init() {
    f18nCapture(); f18nApply(LANG);
    var lastLang = document.documentElement.lang || 'es';
    if ('MutationObserver' in window) {
      new MutationObserver(function () {
        var lang = document.documentElement.lang || 'es';
        if (lang === lastLang) return; lastLang = lang; LANG = lang;
        f18nApply(lang); pintarAhora(); pintarHoras(); pintarAgenda(); filtrar();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    pintarAgenda(); filtrar(); pintarHoras(); pintarAhora();
    setInterval(pintarAhora, 30000);
    if (location.hash) { var tg = document.querySelector(location.hash); if (tg) setTimeout(function () { tg.scrollIntoView({ block: 'start' }); }, 60); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
""".replace('__F18N__', dict_json)

# ─────────────────────────── página ────────────────────────────
NAV = '''<nav class="nav">
  <div class="nav-inner">
    <a href="index.html" class="brand">
      <span class="brand-mark">IV Foro</span>
      <span class="brand-rule"></span>
      <span class="brand-sub" data-i18n="nav_brand_sub">Derecho · Tecnología · 2026</span>
    </a>
    <ul class="nav-links">
      <li><a href="memorias.html" data-i18n="nav_link_memorias">Memorias</a></li>
      <li><a href="cfp.html" data-i18n="nav_link_convocatoria">Convocatoria</a></li>
      <li><a href="programa.html" aria-current="page" data-i18n="nav_link_programa">Programa</a></li>
      <li><a href="index.html#trayectoria" data-i18n="nav_link_trayectoria">Trayectoria</a></li>
      <li><a href="ejes-foro.html" data-i18n="nav_link_ejes">Ejes</a></li>
      <li><a href="index.html#ponentes" data-i18n="nav_link_ponentes">Ponentes</a></li>
      <li><a href="index.html#comite" data-i18n="nav_link_comite">Comité</a></li>
    </ul>
    <div class="nav-cta">
      <div class="lang">
        <span data-lang="es" class="active">ES</span>·<span data-lang="en">EN</span>·<span data-lang="fr">FR</span>
      </div>
      <a href="inscripcion.html" class="btn-primary"><span data-i18n="nav_cta_inscripcion">Inscripción</span></a>
    </div>
  </div>
</nav>'''

def actos_html():
    out = []
    for d in DIAS_VISTA:
        sedes = ' · '.join(b['sede'] for b in d['bloques'])
        for lang in ('en', 'fr'):
            I18N.setdefault('dia.' + d['id'] + '.sedes', {})[lang] = ' · '.join(tr('bloque.' + b['id'] + '.sede', b['sede'], lang) for b in d['bloques'])
        modo = ui('rail_d18').split('·')[1].strip() if d['modo'] == 'virtual' else ''
        cls = ' acto--virtual' if d['modo'] == 'virtual' else ''
        out.append(f'<a class="acto{cls}" href="#{d["anchor"]}">'
                   f'<span class="acto-num" aria-hidden="true">{d["num"]}</span>'
                   f'<span class="acto-txt"><span class="acto-dow"><span {f("dia."+d["id"]+".dow", d["dow"])}>{esc(d["dow"])}</span> {d["num"]} · sep</span>'
                   f'<span class="acto-sedes" {f("dia."+d["id"]+".sedes", sedes)}>{esc(sedes)}</span>'
                   f'<span class="acto-modo" {f("dia."+d["id"]+".etiqueta", d["etiqueta"])}>{esc(d["etiqueta"])}</span></span></a>')
    return '<nav class="actos" aria-label="Días del Foro">' + ''.join(out) + '</nav>'

def riel_html():
    chips = []
    for d in DIAS_VISTA:
        for b in d['bloques']:
            key = {'virtual': 'rail_d18', 'cucea': 'rail_cucea', 'cugdl': 'rail_cugdl', 'cineteca': 'rail_cineteca', 'ciudad-judicial': 'rail_cj'}[b['id']]
            txt = ui(key); num, resto = txt.split(' ', 1)[0], txt.split(' ', 1)[1]
            cls = ' chip--virtual' if d['modo'] == 'virtual' else ''
            chips.append(f'<a class="chip chip--bloque{cls}" href="#{b["id"]}" data-bloque="{b["id"]}"><b>{esc(d["num"])}</b><span {ui_attr(key)}>{esc(txt)}</span></a>')
    ejes = ''.join(f'<button type="button" class="chip chip--eje" data-eje="{n}" aria-pressed="false" title="{esc(DATA["ejes"][str(n)])}"><b>{ROM[n]}</b></button>' for n in range(1, 10))
    return (f'<div class="riel" id="riel"><div class="riel-inner">'
            f'<div class="riel-fila"><span class="riel-label" {ui_attr("rail_label")}>{esc(ui("rail_label"))}</span>{"".join(chips)}'
            f'<div class="tz" role="group" aria-label="Zona horaria"><button type="button" data-tz="gdl" aria-pressed="true" {ui_attr("tz_gdl")}>{esc(ui("tz_gdl"))}</button><button type="button" data-tz="local" aria-pressed="false" {ui_attr("tz_local")}>{esc(ui("tz_local"))}</button></div>'
            f'</div>'
            f'<div class="riel-fila riel-fila--filtros"><span class="riel-label" {ui_attr("filtro_label")}>{esc(ui("filtro_label"))}</span>'
            f'<button type="button" class="chip" id="chipTodos" aria-pressed="true" {ui_attr("filtro_todos")}>{esc(ui("filtro_todos"))}</button>{ejes}'
            f'<button type="button" class="chip" id="chipAgenda" aria-pressed="false"><b>0</b><span {ui_attr("filtro_agenda")}>{esc(ui("filtro_agenda"))}</span></button>'
            f'<label class="riel-buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" id="buscar" placeholder="{esc(ui("filtro_buscar"))}" aria-label="{esc(ui("filtro_buscar"))}" autocomplete="off"></label>'
            f'<span class="riel-n" id="rielN"></span><button type="button" class="riel-limpiar" id="limpiar" hidden {ui_attr("filtro_limpiar")}>{esc(ui("filtro_limpiar"))}</button>'
            f'</div></div></div>')

def hero_html():
    cif = (f'<div class="cifras" role="region" aria-label="Cifras del programa">'
           f'<div class="cifra"><b>{CIFRAS["dias"]}</b><span {ui_attr("cif_dias")}>{esc(ui("cif_dias"))}</span><em {ui_attr("cif_dias_ctx")}>{esc(ui("cif_dias_ctx"))}</em></div>'
           f'<div class="cifra"><b>{CIFRAS["sedes"]}</b><span {ui_attr("cif_sedes")}>{esc(ui("cif_sedes"))}</span><em {ui_attr("cif_sedes_ctx")}>{esc(ui("cif_sedes_ctx"))}</em></div>'
           f'<div class="cifra"><b>{CIFRAS["mesas"]}</b><span {ui_attr("cif_mesas")}>{esc(ui("cif_mesas"))}</span><em {ui_attr("cif_mesas_ctx")}>{esc(ui("cif_mesas_ctx"))}</em></div>'
           f'<div class="cifra"><b>{CIFRAS["voces"]}</b><span {ui_attr("cif_voces")}>{esc(ui("cif_voces"))}</span><em {ui_attr("cif_voces_ctx")}>{esc(ui("cif_voces_ctx"))}</em></div>'
           f'<div class="cifra"><b>{CIFRAS["ejes"]}</b><span {ui_attr("cif_ejes")}>{esc(ui("cif_ejes"))}</span><em {ui_attr("cif_ejes_ctx")}>{esc(ui("cif_ejes_ctx"))}</em></div>'
           f'</div>')
    ico_pdf = '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'
    ico_cal = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
    ico_print = '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>'
    acc = (f'<div class="acciones">'
           f'<a class="btn-ghost" href="pdf/ForoDyT-IV-2026-Programa-General.pdf" download>{ico_pdf}<span {ui_attr("pdf_general")}>{esc(ui("pdf_general"))}</span></a>'
           f'<a class="btn-ghost" href="pdf/ForoDyT-IV-2026-Programa-Jornada-Virtual.pdf" download>{ico_pdf}<span {ui_attr("pdf_jornada")}>{esc(ui("pdf_jornada"))}</span></a>'
           f'<button type="button" class="btn-ghost" data-ics="todo">{ico_cal}<span {ui_attr("ics_todo")}>{esc(ui("ics_todo"))}</span></button>'
           f'<button type="button" class="btn-ghost" onclick="window.print()">{ico_print}<span {ui_attr("imprimir")}>{esc(ui("imprimir"))}</span></button>'
           f'</div>')
    ahora = (f'<div class="ahora" id="ahora" aria-live="polite">'
             f'<div><span class="ahora-label"><span class="punto" aria-hidden="true"></span><span id="ahoraLabel"></span></span>'
             f'<span class="ahora-cuenta" id="ahoraCuenta" hidden><b id="ahoraCuentaN">00</b><i {ui_attr("cif_dias")}>{esc(ui("cif_dias"))}</i></span>'
             f'<span class="ahora-titulo" id="ahoraTitulo"></span><span class="ahora-meta" id="ahoraMeta"></span></div>'
             f'<div class="ahora-sig" id="ahoraSig" hidden><span class="ahora-label"><span class="punto" aria-hidden="true"></span><span id="sigLabel"></span></span>'
             f'<span class="ahora-titulo" id="sigTitulo"></span><span class="ahora-meta" id="sigMeta"></span></div>'
             f'</div>')
    return (f'<header class="hero-p">'
            f'<div class="fantasma" aria-hidden="true">IV</div>'
            f'<div class="eyebrow"><span {ui_attr("eyebrow")}>{esc(ui("eyebrow"))}</span><span class="version" {ui_attr("version_label")}>{esc(ui("version_label"))}</span></div>'
            f'<h1 {ui_attr("h1_html", True)}>{ui("h1_html")}</h1>'
            f'<p class="lead" {ui_attr("lead_html", True)}>{ui("lead_html")}</p>'
            f'{actos_html()}{ahora}{cif}{acc}'
            f'</header>')

def aliados_html():
    """sección «El Foro no camina solo» (decisión del director, 2026-09-14): los mismos logos del index, leídos de
    index.html en tiempo de generación para que haya una sola fuente. Sin reveal/data-d (esas páginas no los animan)."""
    m = re.search(r'<div class="aliados-list">(.*?)\n    </div>\n  </div>\n</section>', _idx, re.S)
    if not m: raise SystemExit('index.html: no encuentro .aliados-list')
    lista = re.sub(r' reveal(?=")', '', m.group(1)); lista = re.sub(r' data-d="\d"', '', lista)
    lista = '\n'.join(l.strip() for l in lista.strip('\n').split('\n'))
    return ('<!-- ALIADOS:INICIO — generado por _tools/programa.py desde index.html; no editar a mano -->\n'
            '<section class="aliados" id="aliados"><div class="aliados-inner">'
            '<h2 data-i18n-html="idx_aliados_title_html">El Foro <em>no camina</em> solo.</h2>'
            '<div class="aliados-list">\n' + lista + '\n</div></div></section>\n<!-- ALIADOS:FIN -->')

def css_aliados():
    m = re.search(r'/\* ALIADOS-CSS:INICIO.*?/\* ALIADOS-CSS:FIN \*/', CSS_BASE, re.S)
    return m.group(0)

def splice_aliados(archivo):
    """inserta/actualiza la sección de aliados y su CSS en otra página (en-vivo.html) entre marcadores."""
    p = os.path.join(ROOT, archivo)
    if not os.path.exists(p): return
    s = open(p, encoding='utf-8').read()
    def rep(s, a, b, nuevo):
        i = s.find(a); j = s.find(b, i)
        if i < 0 or j < 0: print(f'  [{archivo}] marcador ausente:', a[:24]); return s
        return s[:i] + nuevo.strip('\n') + s[j + len(b):]
    s = rep(s, '<!-- ALIADOS:INICIO', '<!-- ALIADOS:FIN -->', aliados_html())
    s = rep(s, '/* ALIADOS-CSS:INICIO', '/* ALIADOS-CSS:FIN */', css_aliados())
    open(p, 'w', encoding='utf-8').write(s)
    print(f'{archivo}: sección de aliados actualizada')

def pagina_html():
    dias = ''.join(dia_html(d) for d in DIAS_VISTA)
    banda = (f'<section class="banda"><div class="banda-inner"><div class="reveal">'
             f'<h2 {ui_attr("banda_t_html", True)}>{ui("banda_t_html")}</h2>'
             f'<p {ui_attr("pie_hibrido")}>{esc(ui("pie_hibrido"))}</p></div>'
             f'<div class="banda-cta reveal"><a href="inscripcion.html" class="btn-primary"><span {ui_attr("cta_inscripcion")}>{esc(ui("cta_inscripcion"))}</span></a>'
             f'<a class="banda-link" href="jornada-virtual.html" {ui_attr("cta_jornada")}>{esc(ui("cta_jornada"))}</a>'
             f'<a class="banda-link" href="ejes-foro.html" {ui_attr("cta_ejes")}>{esc(ui("cta_ejes"))}</a>'
             f'<span class="banda-pie" {ui_attr("pie_organiza")}>{esc(ui("pie_organiza"))}</span></div></div></section>')
    pill = (f'<div class="agenda-pill" id="agendaPill" role="status"><div class="ap-txt"><span class="ap-t" {ui_attr("agenda_titulo")}>{esc(ui("agenda_titulo"))}</span><span class="ap-n" id="agendaN"></span></div>'
            f'<button type="button" data-ics="agenda" {ui_attr("ics_agenda")}>{esc(ui("ics_agenda"))}</button></div>')
    head = f'''<!DOCTYPE html>
<html lang="es" class="no-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>{esc(ui("meta_title"))}</title>
<meta name="description" content="{esc(ui("meta_desc"))}">
<meta name="keywords" content="programa IV Foro de Derecho y Tecnología 2026, programa definitivo, agenda, horarios, mesas, ponencias, jornada virtual internacional, inteligencia artificial y derecho, justicia digital, CUCEA, CUGDL, Cineteca FICG, Ciudad Judicial, Guadalajara, UDG">
<link rel="canonical" href="https://forodyt.com/programa.html">
<link rel="alternate" hreflang="es" href="https://forodyt.com/programa.html">
<link rel="alternate" hreflang="en" href="https://forodyt.com/programa.html?lang=en">
<link rel="alternate" hreflang="fr" href="https://forodyt.com/programa.html?lang=fr">
<link rel="alternate" hreflang="x-default" href="https://forodyt.com/programa.html">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Foro Internacional de Derecho y Tecnología">
<meta property="og:title" content="{esc(ui("og_title"))}">
<meta property="og:description" content="{esc(ui("og_desc"))}">
<meta property="og:url" content="https://forodyt.com/programa.html">
<meta property="og:image" content="https://forodyt.com/og/og-programa.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(ui("og_title"))}">
<meta property="og:locale" content="es_MX">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(ui("og_title"))}">
<meta name="twitter:description" content="{esc(ui("og_desc"))}">
<meta name="twitter:image" content="https://forodyt.com/og/og-programa.png">
<script type="application/ld+json">
{jsonld()}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="mobile-menu.css">
<style>{CSS_BASE}</style>
</head>
<body>
<!-- ═══════════════════════════════════════════════════════════════
     programa.html — GENERADO por _tools/programa.py a partir de
     _tools/programa.json (+ programa.i18n.json). No editar a mano:
     corregir los datos y volver a correr el generador.
     ═══════════════════════════════════════════════════════════════ -->
'''
    body = (NAV + hero_html() + riel_html() + '<main id="programa">' + dias + '</main>' + banda + aliados_html() +
            f'<footer><div class="footer-inner"><span data-i18n="foot_copy">© 2026 · IV Foro Internacional de Derecho y Tecnología</span>'
            f'<span data-i18n="foot_inst">Cuerpo Académico UDG-CA-1236 «Derecho y Tecnología»</span>'
            f'<a href="mailto:contacto@forodyt.com">contacto@forodyt.com</a></div></footer>' + pill + modal_html())
    tail = ('\n<script src="i18n.js" defer></script>\n<script src="mobile-menu.js" defer></script>\n<script>' + js_pagina() + '</script>\n<script>' + modal_js(SLUGS_USADOS) + '</script>\n'
            '<!-- ============ Analytics (Cloudflare Web Analytics + Vercel Speed Insights) ============ -->\n'
            '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "6aee8fc9e32047d99f110e31c7993afc"}\'></script>\n'
            '<script defer src="/_vercel/speed-insights/script.js"></script>\n</body>\n</html>\n')
    return head + body + tail

# ─────────────────────────── jornada-virtual.html ─────────────
CSS_JV = r"""
/* PROGRAMA-JV-CSS:INICIO — generado por _tools/programa.py */
.jvp { margin-top:clamp(36px,5vw,60px); }
.jvp .tz { display:inline-flex; border:1px solid var(--ink-rule); background:rgba(251,247,236,.6); margin-bottom:18px; }
.jvp .tz button { padding:7px 12px; font:inherit; font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); background:none; border:0; cursor:pointer; transition:background .3s, color .3s; }
.jvp .tz button[aria-pressed="true"] { background:var(--teal); color:var(--marfil); }
.jvp .tz button + button { border-left:1px solid var(--ink-rule); }
.jvp .tz[hidden] { display:none; }
.jvp .sede { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px 24px; align-items:end; padding:22px 26px 18px; color:var(--marfil); background:var(--teal-deep); }
.jvp .sede-label { display:block; font-family:var(--mono); font-size:9px; letter-spacing:.28em; text-transform:uppercase; color:rgba(245,239,224,.5); margin-bottom:6px; }
.jvp .sede-nombre { font-family:var(--serif); font-weight:600; font-size:clamp(24px,3vw,34px); line-height:1; font-variation-settings:"opsz" 144,"SOFT" 30; }
.jvp .sede-sub { margin-top:6px; font-size:12.5px; color:rgba(245,239,224,.72); }
.jvp .sede-hora { text-align:right; }
.jvp .sede-hora b { display:inline-block; font-family:var(--mono); font-weight:500; font-size:12.5px; letter-spacing:.12em; padding:8px 14px; background:var(--dorado); color:var(--noche); }
.jvp .sede-temas { grid-column:1 / -1; padding-top:12px; border-top:1px solid rgba(245,239,224,.14); font-family:var(--mono); font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--dorado-soft); }
.jvp .sede-temas > span:first-child { color:rgba(245,239,224,.5); }
.jvp .sesiones { position:relative; margin-top:6px; }
.jvp .sesiones::before { content:""; position:absolute; left:138px; top:14px; bottom:14px; width:1px; background:linear-gradient(var(--ink-rule), rgba(150,116,45,.55), var(--ink-rule)); }
.jvp .sesion { position:relative; display:grid; grid-template-columns:118px 1fr; gap:0 clamp(18px,3vw,40px); padding:22px 0 24px; border-bottom:1px solid var(--ink-rule); }
.jvp .sesion::before { content:""; position:absolute; left:134px; top:30px; width:9px; height:9px; border-radius:50%; background:var(--marfil); border:1.5px solid var(--dorado-deep); z-index:1; }
.jvp .s-hora { font-family:var(--mono); color:var(--ink); padding-top:2px; display:flex; flex-direction:column; gap:3px; }
.jvp .h-ini { display:flex; flex-direction:column; gap:2px; }
.jvp .h-par { display:flex; align-items:baseline; gap:6px; }
.jvp .h-par b { font-weight:500; font-size:15px; letter-spacing:.02em; font-variant-numeric:tabular-nums; }
.jvp .h-par i { font-style:normal; font-size:8.5px; letter-spacing:.22em; color:var(--ink-faint); }
.jvp .h-par + .h-par b { font-size:12.5px; color:var(--ink-soft); }
.jvp .h-fin { font-size:10.5px; color:var(--ink-faint); letter-spacing:.06em; }
.jvp .h-local { font-size:10.5px; color:var(--teal); letter-spacing:.06em; margin-top:2px; border-top:1px dotted rgba(42,92,92,.4); padding-top:4px; }
.jvp .h-local b { font-weight:500; font-size:13px; }
.jvp .h-local[hidden] { display:none; }
.jvp .s-cab { display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; }
.jvp .s-kicker { font-family:var(--mono); font-size:10px; font-weight:500; letter-spacing:.24em; text-transform:uppercase; color:var(--dorado-deep); }
.jvp .sesion--ceremonia .s-kicker { color:var(--ink-faint); }
.jvp .s-ejes { display:inline-flex; flex-wrap:wrap; gap:6px; }
.jvp .eje-chip { display:inline-flex; align-items:center; gap:6px; text-decoration:none; font-family:var(--mono); font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); border:1px solid rgba(150,116,45,.35); padding:3px 8px 2px; transition:border-color .3s, color .3s; }
.jvp .eje-chip b { font-family:var(--serif); font-weight:600; font-size:11px; letter-spacing:0; color:var(--dorado-deep); }
.jvp .eje-chip span { max-width:0; overflow:hidden; white-space:nowrap; opacity:0; transition:max-width .5s var(--ease), opacity .4s; }
.jvp .eje-chip:hover span, .jvp .eje-chip:focus-visible span { max-width:340px; opacity:1; }
.jvp .eje-chip:hover { border-color:var(--dorado-deep); color:var(--ink); }
.jvp .s-titulo { margin-top:8px; font-family:var(--serif); font-weight:580; font-size:clamp(19px,2vw,24px); line-height:1.2; font-variation-settings:"opsz" 100,"SOFT" 30; max-width:820px; }
.jvp .s-desc { margin-top:8px; font-size:14px; color:var(--ink-soft); max-width:640px; }
.jvp .s-ponentes { list-style:none; margin-top:16px; display:flex; flex-direction:column; gap:14px; }
.jvp .pon { display:flex; gap:14px; align-items:flex-start; }
.jvp .pon-fotos { display:flex; flex:none; }
.jvp .pon-fotos .pon-foto + .pon-foto { margin-left:-10px; }
.jvp .pon-foto { flex:none; width:44px; height:44px; background:var(--noche); border:1px solid rgba(184,146,62,.35); overflow:hidden; display:inline-flex; align-items:center; justify-content:center; border-radius:2px; }
.jvp .pon-foto img { width:100%; height:100%; object-fit:cover; display:block; filter:grayscale(.92) sepia(.14) contrast(1.02); transition:filter .6s var(--ease); }
.jvp .pon:hover .pon-foto img { filter:none; }
.jvp .pon-mono { font-family:var(--serif); font-style:italic; font-weight:600; font-size:15px; color:var(--dorado-soft); }
.jvp .pon-info { display:flex; flex-direction:column; gap:2px; min-width:0; }
.jvp .pon-nombres { font-family:var(--serif); font-size:15.5px; font-weight:560; line-height:1.3; color:var(--ink); }
.jvp .pon-nombre { text-decoration:none; }
.jvp a.pon-nombre { border-bottom:1px solid rgba(150,116,45,.35); }
.jvp a.pon-nombre:hover { color:var(--teal-deep); border-bottom-color:var(--teal); }
.jvp .pon-ir { font-style:normal; font-size:10px; margin-left:4px; color:var(--dorado-deep); }
.jvp .pon-afil { font-size:12.5px; color:var(--ink-soft); line-height:1.5; }
.jvp .pon-talk { margin-top:4px; font-family:var(--serif); font-style:italic; font-size:14.5px; line-height:1.45; color:var(--ink); max-width:760px; }
.jvp .sin-resultados { display:none; }
.jvp-link { display:inline-block; margin-top:22px; font-family:var(--mono); font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--dorado-deep); text-decoration:none; border-bottom:1px solid rgba(150,116,45,.4); }
.jvp-link:hover { border-bottom-color:var(--dorado-deep); }
@media (max-width:820px) {
  .jvp .sesiones::before, .jvp .sesion::before { display:none; }
  .jvp .sesion { grid-template-columns:1fr; gap:10px; }
  .jvp .s-hora { flex-direction:row; align-items:baseline; gap:10px; flex-wrap:wrap; }
  .jvp .h-ini { flex-direction:row; gap:10px; }
  .jvp .h-local { border-top:0; padding-top:0; margin-top:0; }
}
@media (max-width:640px) { .jvp .sede { grid-template-columns:1fr; padding:18px 18px 16px; } .jvp .sede-hora { text-align:left; } }
"""+CSS_MODAL.replace("var(--papel, rgba(251,247,236,.7))","rgba(251,247,236,.7)")+r"""
/* PROGRAMA-JV-CSS:FIN */
"""

JS_JV = r"""
/* PROGRAMA-JV-JS:INICIO — generado por _tools/programa.py */
(function () {
  var GDL = 'America/Mexico_City', TZ = 'UTC', modo = 'gdl';
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
  var box = document.querySelector('.jvp .tz'); if (!box) return;
  if (TZ === GDL) { box.hidden = true; return; }
  function lang() { return document.documentElement.lang || 'es'; }
  function fmt(d) { try { return new Intl.DateTimeFormat(lang() === 'es' ? 'es-MX' : (lang() === 'fr' ? 'fr-FR' : 'en-GB'), { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: TZ }).format(d); } catch (e) { return ''; } }
  function pintar() {
    document.querySelectorAll('.jvp .sesion').forEach(function (el) {
      var h = el.querySelector('.h-local'); if (!h) return;
      if (modo !== 'local') { h.hidden = true; return; }
      h.innerHTML = '<b>' + fmt(new Date(el.getAttribute('data-ini'))) + '</b> – ' + fmt(new Date(el.getAttribute('data-fin'))) + ' · ' + TZ;
      h.hidden = false;
    });
    box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tz') === modo ? 'true' : 'false'); });
  }
  box.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { modo = b.getAttribute('data-tz'); try { localStorage.setItem('forodyt_tz', modo); } catch (e) {} pintar(); }); });
  try { if (localStorage.getItem('forodyt_tz') === 'local') modo = 'local'; } catch (e) {}
  pintar();
})();
"""

def fragmento_jv():
    d = next(x for x in DATA['dias'] if x['modo'] == 'virtual'); b = d['bloques'][0]
    return ('<!-- PROGRAMA-JV:INICIO — generado por _tools/programa.py; no editar a mano -->\n'
            f'<div class="jvp">'
            f'<div class="tz" role="group" aria-label="Zona horaria"><button type="button" data-tz="gdl" aria-pressed="true" {ui_attr("tz_gdl")}>{esc(ui("tz_gdl"))}</button><button type="button" data-tz="local" aria-pressed="false" {ui_attr("tz_local")}>{esc(ui("tz_local"))}</button></div>'
            + bloque_html(d, b, pagina='jornada') +
            f'<a class="jvp-link" href="programa.html#jornada-en-linea" {ui_attr("jv_est_link")}>{esc(ui("jv_est_link"))}</a>'
            f'</div>' + modal_html() + '\n<!-- PROGRAMA-JV:FIN -->')

def datos_publicos():
    """resumen del programa para en-vivo.html: bloques (con id de plática del backend) y sesiones en UTC."""
    out = {'version': DATA['version'], 'bloques': [], 'sesiones': []}
    for d in DATA['dias']:
        for b in d['bloques']:
            ini = instante(d['fecha'], b['sesiones'][0]['ini'], b['tz']); fin = instante(d['fecha'], b['sesiones'][-1]['fin'], b['tz'])
            out['bloques'].append({'id': b['id'], 'platica': b.get('platica'), 'dia': d['id'], 'fecha': d['fecha'], 'modo': d['modo'],
                                   'sede': {'es': b['sede'], 'en': tr('bloque.' + b['id'] + '.sede', b['sede'], 'en'), 'fr': tr('bloque.' + b['id'] + '.sede', b['sede'], 'fr')},
                                   'sub': b['sede_sub'], 'ini': iso_utc(ini), 'fin': iso_utc(fin), 'minutos': int((fin - ini).total_seconds() // 60)})
            for s in b['sesiones']:
                si = instante(d['fecha'], s['ini'], b['tz']); sf = instante(d['fecha'], s['fin'], b['tz'])
                k = 's.' + s['id']
                out['sesiones'].append({'id': s['id'], 'bloque': b['id'], 'ini': iso_utc(si), 'fin': iso_utc(sf), 'tipo': s['tipo'],
                    'kicker': {l: tr(k + '.kicker', s['kicker'], l) for l in ('es', 'en', 'fr')},
                    'titulo': {l: tr(k + '.titulo', s.get('titulo') or '', l) for l in ('es', 'en', 'fr')} if s.get('titulo') else None,
                    'ponentes': [{'nombres': [pp['nombre'] for pp in p['personas']], 'talk': {l: tr(f'{k}.p{i}.talk', p.get('talk') or '', l) for l in ('es', 'en', 'fr')} if p.get('talk') else None} for i, p in enumerate(s['ponentes'])],
                    'modera': s['modera']['nombre'] if s.get('modera') else None})
    return out

# ─────────────────────────── guiones de mesa (documento para Drive) ───────────
def guiones_html(fotos=True):
    """Documento imprimible con el guion de cada sesión (moderación + ponentes con semblanza), en español.
    No se publica en el sitio: se guarda en el Drive del Foro (carpeta de moderación)."""
    def foto(nombre, slug):
        if fotos and slug and slug in FOTOS: return f'<img class="g-foto" src="../../img/ponentes/{FOTOS[slug]}" alt="">'
        return f'<span class="g-foto g-mono">{esc(monograma(nombre))}</span>'
    def parrafos(t): return ''.join(f'<p>{esc(x.strip())}</p>' for x in re.split(r'\n\s*\n', t) if x.strip())
    secciones = []; n = 0
    for d in DIAS_VISTA:
        for b in d['bloques']:
            for s in b['sesiones']:
                if not s['ponentes'] and not s.get('modera'): continue
                n += 1
                if d['modo'] == 'virtual':
                    hora = f'{s["ini"]}–{s["fin"]} España · {hhmm(instante(d["fecha"], s["ini"], b["tz"]), GDL)}–{hhmm(instante(d["fecha"], s["fin"], b["tz"]), GDL)} Guadalajara'
                else:
                    hora = f'{s["ini"]}–{s["fin"]}'
                items = []
                if s.get('modera'):
                    m = s['modera']; tx = SEM.get(m.get('slug') or '', {}).get('es')
                    items.append(('Modera', m['nombre'], m.get('slug'), m.get('afil'), None, tx))
                for p in s['ponentes']:
                    for per in p['personas']:
                        tx = SEM.get(per.get('slug') or '', {}).get('es')
                        items.append(('Ponente', per['nombre'], per.get('slug'), p.get('afil'), p.get('talk'), tx))
                lis = ''
                for i, (rol, nombre, slug, afil, talk, tx) in enumerate(items, 1):
                    lis += (f'<li class="g-item">{foto(nombre, slug)}<div>'
                            f'<div class="g-rol">{ROM.get(i, str(i))} · {rol}</div><div class="g-nombre">{esc(nombre)}</div>'
                            + (f'<div class="g-afil">{esc(afil)}</div>' if afil else '')
                            + (f'<div class="g-talk">{esc(talk)}</div>' if talk else '')
                            + (f'<div class="g-texto">{parrafos(tx)}</div>' if tx else f'<div class="g-texto g-pend">{esc(UI["sem_pend"])}</div>')
                            + '</div></li>')
                titulo = f' · {esc(s["titulo"])}' if s.get('titulo') else ''
                secciones.append(f'<section class="g-sesion"><header class="g-cab"><div class="g-eyebrow">{esc(b["sede"])} · {d["dow"]} {d["num"]} de {d["mes"]} · {hora}</div>'
                                 f'<h2>{esc(s["kicker"])}{titulo}</h2><p class="g-intro">{esc(UI["guion_intro"])}</p></header><ol class="g-lista">{lis}</ol></section>')
    css = """
    @page { size:A4; margin:16mm 16mm 18mm; }
    body { font-family:Georgia,'Times New Roman',serif; color:#0E1B2C; margin:0; font-size:11.5pt; line-height:1.5; }
    .g-portada { height:240mm; display:flex; flex-direction:column; justify-content:center; border:1px solid #B8923E; padding:24mm; box-sizing:border-box; page-break-after:always; }
    .g-portada .k { font-family:'Courier New',monospace; font-size:9pt; letter-spacing:.3em; text-transform:uppercase; color:#96742D; }
    .g-portada h1 { font-size:34pt; line-height:1.05; margin:14pt 0 10pt; font-weight:600; }
    .g-portada p { font-size:12pt; color:#3d4a5c; max-width:60ch; }
    .g-portada .n { margin-top:auto; font-family:'Courier New',monospace; font-size:9pt; letter-spacing:.2em; text-transform:uppercase; color:#96742D; }
    .g-sesion { page-break-before:always; }
    .g-cab { border-bottom:2px solid #0E1B2C; padding-bottom:8pt; margin-bottom:6pt; }
    .g-eyebrow { font-family:'Courier New',monospace; font-size:8.5pt; letter-spacing:.24em; text-transform:uppercase; color:#96742D; }
    .g-cab h2 { font-size:19pt; line-height:1.15; margin:6pt 0 4pt; font-weight:600; }
    .g-intro { font-family:Helvetica,Arial,sans-serif; font-size:9.5pt; color:#5a6474; margin:0; }
    .g-lista { list-style:none; padding:0; margin:0; }
    .g-item { display:grid; grid-template-columns:52pt 1fr; gap:12pt; padding:12pt 0; border-bottom:1px solid #d9d3c3; page-break-inside:avoid; }
    .g-foto { width:52pt; height:52pt; object-fit:cover; display:block; background:#0A1422; }
    .g-mono { display:flex; align-items:center; justify-content:center; color:#C8A858; font-style:italic; font-size:16pt; }
    .g-rol { font-family:'Courier New',monospace; font-size:8pt; letter-spacing:.24em; text-transform:uppercase; color:#96742D; }
    .g-nombre { font-size:14pt; font-weight:600; margin-top:2pt; }
    .g-afil { font-family:Helvetica,Arial,sans-serif; font-size:9.5pt; color:#5a6474; margin-top:2pt; }
    .g-talk { font-style:italic; margin-top:6pt; }
    .g-texto { margin-top:6pt; } .g-texto p { margin:0 0 6pt; } .g-pend { font-style:italic; color:#5a6474; }
    """
    portada = (f'<section class="g-portada"><div class="k">IV Foro Internacional de Derecho y Tecnología · {esc(DATA["version_txt"])}</div>'
               f'<h1>Guiones de mesa para la moderación</h1>'
               f'<p>Un guion por sesión, en el orden del programa: quién modera, quiénes participan, el título de cada ponencia y la semblanza que cada persona envió, lista para leerse al presentarla. Documento interno del Comité Organizador; no se publica en el sitio.</p>'
               f'<div class="n">{n} sesiones · CUCEA · CUGDL · Cineteca FICG · Ciudad Judicial · Jornada Virtual</div></section>')
    return f'<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Guiones de mesa · IV Foro Internacional de Derecho y Tecnología</title><style>{css}</style></head><body>{portada}{"".join(secciones)}</body></html>'

# ─────────────────────────── main ──────────────────────────────
def main():
    check = '--check' in sys.argv
    if '--guiones' in sys.argv:
        p = os.path.join(OUT, 'guiones-mesa.html'); open(p, 'w', encoding='utf-8').write(guiones_html()); print('guiones escritos en', p)
        p2 = os.path.join(OUT, 'guiones-mesa-sin-fotos.html'); open(p2, 'w', encoding='utf-8').write(guiones_html(fotos=False)); print('versión sin fotos en', p2); return
    # 1) página completa (llena F18N con todas las claves)
    F18N['en'].clear(); F18N['fr'].clear()
    page = pagina_html()
    faltan = {'en': [], 'fr': []}
    # claves cuyo texto EN/FR no existe (se quedarían en español)
    for m in re.finditer(r'data-f18n(?:-html)?="([^"]+)"', page):
        k = m.group(1)
        for lang in ('en', 'fr'):
            if k not in I18N and k not in faltan[lang]: faltan[lang].append(k)
    for lang in ('en', 'fr'):
        if faltan[lang]: print(f'[i18n] {lang}: {len(faltan[lang])} claves sin traducción (quedan en ES):', ', '.join(faltan[lang][:12]), '…' if len(faltan[lang]) > 12 else '')
    # 2) fragmento de la jornada virtual (solo sus claves)
    F18N_page = {'en': dict(F18N['en']), 'fr': dict(F18N['fr'])}
    F18N['en'].clear(); F18N['fr'].clear()
    frag = fragmento_jv()
    jv_dict = {'en': dict(F18N['en']), 'fr': dict(F18N['fr'])}
    if check:
        print('OK · sesiones:', sesiones_total, '· cifras:', CIFRAS); return
    open(os.path.join(ROOT, 'programa.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(ROOT, 'programa-data.json'), 'w', encoding='utf-8').write(json.dumps(datos_publicos(), ensure_ascii=False, separators=(',', ':')))
    open(os.path.join(OUT, 'jv-fragment.html'), 'w', encoding='utf-8').write(frag)
    open(os.path.join(OUT, 'jv-css.css'), 'w', encoding='utf-8').write(CSS_JV)
    slugs_jv = set(re.findall(r'data-sem="([a-z_]+)"', frag))
    js_jv = ('/* PROGRAMA-JV-F18N:INICIO — generado por _tools/programa.py */\nwindow.F18N_PROGRAMA = ' +
             json.dumps(jv_dict, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n/* PROGRAMA-JV-F18N:FIN */\n' + JS_JV + modal_js(slugs_jv) + '\n/* PROGRAMA-JV-JS:FIN */\n')
    open(os.path.join(OUT, 'jv-js.js'), 'w', encoding='utf-8').write(js_jv)
    print('programa.html escrito ·', len(page) // 1024, 'KB · sesiones:', sesiones_total, '· cifras:', CIFRAS)
    print('fragmento JV escrito en _tools/out/ (html, css, js)')
    splice_jv(frag, CSS_JV, js_jv)
    splice_aliados('en-vivo.html')

def splice_jv(frag, css, js):
    """reemplaza los tres bloques marcados de jornada-virtual.html (html, css, js) si existen."""
    p = os.path.join(ROOT, 'jornada-virtual.html')
    if not os.path.exists(p): return
    s = open(p, encoding='utf-8').read()
    def rep(s, a, b, nuevo):
        i = s.find(a); j = s.find(b, i)
        if i < 0 or j < 0: print('  [jv] marcador ausente:', a[:28]); return s
        return s[:i] + nuevo.strip('\n') + s[j + len(b):]
    s = rep(s, '<!-- PROGRAMA-JV:INICIO', '<!-- PROGRAMA-JV:FIN -->', frag)
    s = rep(s, '/* PROGRAMA-JV-CSS:INICIO', '/* PROGRAMA-JV-CSS:FIN */', css)
    s = rep(s, '/* PROGRAMA-JV-F18N:INICIO', '/* PROGRAMA-JV-JS:FIN */', js)
    open(p, 'w', encoding='utf-8').write(s)
    print('jornada-virtual.html: bloques del programa actualizados')

if __name__ == '__main__':
    main()
