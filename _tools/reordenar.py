# -*- coding: utf-8 -*-
"""Reescribe la parrilla de ponentes de index.html en un orden dado.

Extrae cada <article> por su data-semblanza, los reemite en el ORDEN indicado y
recalcula --st y data-d. El patron real de data-d de la casa es:
    st 0 -> sin atributo · st 1 -> 1 · st 2 -> 2
    st >= 3 -> (st-3) % 4, y cuando da 0 el atributo se OMITE
Tambien reordena el array performer del JSON-LD y las claves de ponente del
objeto SEMBLANZAS para que sigan el mismo orden que la parrilla.

Aborta si se pierde o duplica cualquier tarjeta.
"""
import io
import json
import re
import sys

P = r'C:\Users\emman\forodyt\index.html'


def data_d(st):
    if st == 0:
        return None
    if st == 1:
        return '1'
    if st == 2:
        return '2'
    v = (st - 3) % 4
    return None if v == 0 else str(v)


def reordenar(orden, nombres_performer):
    src = io.open(P, encoding='utf-8').read()

    ini = src.index('<div class="ponentes-grid">')
    cta = src.index('<div class="ponentes-cta')
    fin = src.rindex('</div>', ini, cta)   # el </div> que cierra la parrilla
    bloque = src[ini:fin]

    arts = re.findall(r'      <article class="ponente.*?</article>', bloque, re.S)
    if not arts:
        raise SystemExit('ABORTA: no encontre articles en la parrilla')

    por_clave = {}
    for a in arts:
        m = re.search(r'data-semblanza="([a-z_]+)"', a)
        clave = m.group(1) if m else 'placeholder'
        if clave in por_clave:
            raise SystemExit('ABORTA: clave duplicada %s' % clave)
        por_clave[clave] = a

    faltan = [k for k in orden if k not in por_clave]
    sobran = [k for k in por_clave if k not in orden]
    if faltan:
        raise SystemExit('ABORTA: en el orden pero no en el HTML: %s' % faltan)
    if sobran:
        raise SystemExit('ABORTA: en el HTML pero no en el orden: %s' % sobran)

    salida = []
    for st, clave in enumerate(orden):
        a = por_clave[clave]
        d = data_d(st)
        # normaliza style y data-d de la etiqueta de apertura
        a = re.sub(r'style="--st:\d+"( data-d="\d")?',
                   'style="--st:%d"%s' % (st, (' data-d="%s"' % d) if d else ''), a, count=1)
        salida.append(a)

    nuevo_bloque = '<div class="ponentes-grid">\n\n' + '\n\n'.join(salida) + '\n\n    '
    src = src[:ini] + nuevo_bloque + src[fin:]

    # ── performer del JSON-LD, en el mismo orden ──
    m = re.search(r'("performer": \[\n)(.*?)(\n  \])', src, re.S)
    if not m:
        raise SystemExit('ABORTA: no encontre el array performer')
    filas = ',\n'.join('    { "@type": "Person", "name": "%s" }' % n for n in nombres_performer)
    src = src[:m.start(2)] + filas + src[m.end(2):]

    # ── SEMBLANZAS: mismo orden de parrilla, el comite al final ──
    lineas = src.split('\n')
    i = next(k for k, l in enumerate(lineas) if 'var SEMBLANZAS =' in l)
    pref = lineas[i][:lineas[i].index('{')]
    cuerpo = lineas[i][lineas[i].index('{'):].rstrip()
    obj = json.loads(cuerpo[:-1])
    comite = [k for k in obj if k not in orden]
    nuevo = {}
    for k in orden:
        if k in obj:
            nuevo[k] = obj[k]
    for k in comite:
        nuevo[k] = obj[k]
    if set(nuevo) != set(obj):
        raise SystemExit('ABORTA: se perdio alguna semblanza')
    lineas[i] = pref + json.dumps(nuevo, ensure_ascii=False) + ';'
    src = '\n'.join(lineas)

    io.open(P, 'w', encoding='utf-8', newline='').write(src)

    print('parrilla reordenada: %d tarjetas' % len(orden))
    for st, clave in enumerate(orden):
        d = data_d(st)
        print('  %2d. --st:%-2d %-16s %s' % (st + 1, st, clave, ('data-d=%s' % d) if d else ''))
    print('performer: %d entradas' % len(nombres_performer))
    print('SEMBLANZAS: %d entradas (%d ponentes + %d comite)'
          % (len(nuevo), len(nuevo) - len(comite), len(comite)))


if __name__ == '__main__':
    cfg = json.load(io.open(sys.argv[1], encoding='utf-8'))
    reordenar(cfg['orden'], cfg['performer'])
