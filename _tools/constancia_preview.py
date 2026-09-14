# -*- coding: utf-8 -*-
"""Vista previa local de apps-script/Constancia-bloque.html (la plantilla HtmlService de las constancias).

Sustituye los scriptlets <?= ?> / <? if ?> por valores de muestra con un mini-intérprete (solo las
construcciones que usa la plantilla) y escribe HTML listos para imprimir en _tools/out/constancias/.
Luego: chromium --headless --print-to-pdf sobre cada HTML (ver _tools/out/constancias/render.sh).

Uso: python3 _tools/constancia_preview.py [ruta/firma.png]
"""
import base64, io, os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '_tools', 'out', 'constancias'); os.makedirs(OUT, exist_ok=True)
TPL = io.open(os.path.join(ROOT, 'apps-script', 'Constancia-bloque.html'), encoding='utf-8').read()

def data_uri(path, mime='image/png'):
    if not path or not os.path.exists(path): return ''
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path, 'rb').read()).decode())

FIRMA = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-user-forodyt/c3f8bfc7-8b90-5a15-92b4-edd8e7d60d42/scratchpad/constancias/firma-digital-apellido-delva-black-CANON.png'
LOGOS = {k: data_uri(os.path.join(ROOT, 'img', 'aliados', f + '.png')) for k, f in (('udg', 'udg'), ('ca', 'ca-derecho-tecnologia'))}

HORAS_TXT = {1: 'una hora', 2: 'dos horas', 3: 'tres horas', 4: 'cuatro horas', 5: 'cinco horas', 6: 'seis horas', 7: 'siete horas', 8: 'ocho horas', 9: 'nueve horas', 10: 'diez horas', 11: 'once horas', 12: 'doce horas'}

def render(tpl, ctx):
    """intérprete mínimo: <?= expr ?>, <? if (cond) { ?> … <? } else { ?> … <? } ?>, <? for (var i…) { ?> … <? } ?>."""
    # bucles for sobre firmantes (única lista de la plantilla)
    def do_for(m):
        body = m.group(1); out = ''
        for i, it in enumerate(ctx.get('firmantes', [])):
            c = dict(ctx); c['firmantes[i]'] = it
            out += render_flat(body.replace('firmantes[i]', '__it__'), dict(c, __it__=it))
        return out
    tpl = re.sub(r'<\? for \(var i = 0; i < firmantes\.length; i\+\+\) \{ \?>(.*?)<\? \} \?>(?=\s*</tr>)', do_for, tpl, flags=re.S)
    return render_flat(tpl, ctx)

def evalx(expr, ctx):
    expr = expr.strip()
    if expr.startswith('__it__.'): return (ctx.get('__it__') or {}).get(expr[7:], '')
    if '.' in expr:
        a, b = expr.split('.', 1); v = ctx.get(a) or {}
        return v.get(b, '') if isinstance(v, dict) else ''
    return ctx.get(expr, '')

def cond(expr, ctx):
    expr = expr.strip()
    m = re.match(r"^(\w+) === '(\w+)'$", expr)
    if m: return ctx.get(m.group(1)) == m.group(2)
    if expr.startswith('logos && ('): return any(LOGOS.values())
    return bool(evalx(expr, ctx))

def render_flat(tpl, ctx):
    # if / else / endif (sin anidar más de un nivel de else)
    pat = re.compile(r'<\? if \((.*?)\) \{ \?>(.*?)(?:<\? \} else \{ \?>(.*?))?<\? \} \?>', re.S)
    while True:
        m = pat.search(tpl)
        if not m: break
        c, a, b = m.group(1), m.group(2), m.group(3) or ''
        tpl = tpl[:m.start()] + (a if cond(c, ctx) else b) + tpl[m.end():]
    return re.sub(r'<\?= (.*?) \?>', lambda m: str(evalx(m.group(1), ctx)), tpl)

base = dict(firma_src=data_uri(FIRMA), logos=LOGOS, fecha_emision='21 de septiembre de 2026', institucion='')
muestras = {
    'bloque-cucea': dict(base, tipo='bloque', nombre='Nombre Apellido Apellido', institucion='Universidad de Guadalajara',
                         sede='CUCEA', recinto='Auditorio Lic. Raúl Padilla López (CUCEA)', fecha_larga='lunes 21 de septiembre de 2026',
                         horario='9:00 a 14:10 horas', horas=5, horas_txt=HORAS_TXT[5],
                         sesiones='Inauguración · Conferencia inaugural · Mesas 1 a 4 · Jóvenes investigadores del Call for Papers · Presentación editorial',
                         folio='IV-FIDDT-BLQ/UDG/2026-1-0001'),
    'bloque-jornada-virtual': dict(base, tipo='bloque', nombre='Nombre Apellido Apellido', institucion='Universidad de Sevilla · España',
                         sede='Jornada Virtual Internacional', recinto='transmisión en línea del Foro (Jornada Virtual Internacional)', fecha_larga='viernes 18 de septiembre de 2026',
                         horario='15:00 a 19:00 horas de España (7:00 a 11:00 de Guadalajara)', horas=4, horas_txt=HORAS_TXT[4],
                         sesiones='Apertura · Mesas V1 a V4 · Cierre', folio='IV-FIDDT-BLQ/UDG/2026-5-0001', fecha_emision='18 de septiembre de 2026'),
    'valor-curricular-10h': dict(base, tipo='valor', nombre='Nombre Apellido Apellido', institucion='Universidad de Guadalajara',
                         sede='CUCEA · CUGDL · Cineteca FICG · Ciudad Judicial', fecha_larga='18, 21 y 22 de septiembre de 2026', horario='Bloques acreditados: 5',
                         horas=10, horas_txt=HORAS_TXT[10], sesiones='', folio='IV-FIDDT-VC/UDG/2026-0001', fecha_emision='22 de septiembre de 2026',
                         firmantes=[{'nombre': 'Nombre por confirmar', 'cargo': 'Rectoría · CUCEA', 'firma_src': ''},
                                    {'nombre': 'Nombre por confirmar', 'cargo': 'Rectoría · CUGDL', 'firma_src': ''},
                                    {'nombre': 'Nombre por confirmar', 'cargo': 'Rectoría · Centro Universitario por confirmar', 'firma_src': ''}]),
}
sh = ['#!/bin/sh', 'cd "$(dirname "$0")"']
for k, ctx in muestras.items():
    html = render(TPL, ctx)
    p = os.path.join(OUT, f'constancia-{k}.html'); io.open(p, 'w', encoding='utf-8').write(html)
    sh.append(f'/opt/pw-browsers/chromium --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf=constancia-{k}.pdf constancia-{k}.html 2>/dev/null')
    print('escrito', p)
io.open(os.path.join(OUT, 'render.sh'), 'w').write('\n'.join(sh) + '\n')
print('para PDF: sh _tools/out/constancias/render.sh')
