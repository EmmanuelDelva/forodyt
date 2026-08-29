# -*- coding: utf-8 -*-
"""Calcula el orden de la parrilla de ponentes con DOS objetivos a la vez:
paridad de genero y mezcla de sectores (publico · academia · privado).

⚠️ MODELO DE FILAS — leer antes de tocar:
La primera tarjeta (Alvarez Pulido) lleva `.ponente.destacado`, que en CSS es
`grid-column: span 2`. Ocupa DOS celdas. Por tanto la tarjeta n (1-indexada)
cae en la celda n para todo n>=2, y la fila es floor(celda/cols).

Anchos reales de la parrilla: 4 col (>1120px) · 3 col (<=1120px) · 2 col (<=920px).

Objetivo, por fila y en los tres anchos:
  - que NINGUNA fila quede sin mujer
  - que ninguna fila sea de un solo sector (se premia que haya tres)
  - rachas cortas de un mismo genero y de un mismo sector
Restriccion dura: Alvarez Pulido se queda en la posicion 1.

Busqueda: descenso estocastico con reinicios. El espacio es 41! y no admite
enumeracion; con ~40 reinicios converge a un optimo estable en segundos.
"""
import random

COLS = (4, 3, 2)
DESTACADA_SPAN = 2

# (slug, genero, sector) — sector: P=publico · A=academia · R=privado
PONENTES = [
    ('alvarez',             'H', 'P'),   # queda SIEMPRE en la posicion 1
    ('gonzalez',            'M', 'P'),
    ('gaspar',              'H', 'R'),
    ('garcia_torres',       'M', 'A'),
    ('rivera',              'H', 'P'),
    ('zepeda',              'H', 'A'),
    ('raad',                'H', 'P'),
    ('barrios',             'M', 'P'),
    ('ibarra',              'H', 'R'),
    ('gomez',               'H', 'P'),
    ('gamez',               'M', 'A'),
    ('vega',                'H', 'R'),
    ('troncoso',            'H', 'P'),
    ('reyes',               'H', 'A'),
    ('caicedo',             'M', 'R'),
    ('tinajero',            'H', 'P'),
    ('marquez',             'H', 'P'),
    ('rosales',             'M', 'A'),
    ('jimenez',             'H', 'A'),
    ('contreras',           'H', 'P'),
    ('olmos',               'M', 'P'),
    ('villarreal',          'H', 'P'),
    ('gomez_avila',         'H', 'R'),
    ('romero_gutierrez',    'M', 'A'),
    ('willman',             'H', 'A'),
    ('hernandez_alcantara', 'M', 'P'),
    ('rojas_sanchez',       'H', 'P'),
    ('lozano_valdivia',     'M', 'A'),
    ('nava_lopez',          'M', 'P'),
    ('pinto_garcia',        'M', 'A'),
    ('arrazola',            'H', 'A'),
    ('lozano_martinez',     'H', 'A'),
    ('viniegra',            'M', 'R'),
    ('vega_gomez',          'H', 'A'),
    ('sossa',               'H', 'A'),
    ('gustavo_juarez',      'H', 'A'),
    ('doria',               'H', 'A'),
    ('sanchez_aguirre',     'H', 'A'),
    ('garcia_barrera',      'M', 'A'),
    ('juarez_tello',        'H', 'P'),
    ('vazquez_placencia',   'H', 'P'),
]

N = len(PONENTES)
CELDA = [0] + [k + DESTACADA_SPAN - 1 for k in range(1, N)]


def filas(orden, cols):
    """Agrupa los indices del orden por fila, con el modelo de celdas correcto."""
    out = {}
    for pos, idx in enumerate(orden):
        out.setdefault(CELDA[pos] // cols, []).append(idx)
    return [out[f] for f in sorted(out)]


def racha(orden, campo):
    peor = act = 1
    for a, b in zip(orden, orden[1:]):
        act = act + 1 if PONENTES[a][campo] == PONENTES[b][campo] else 1
        peor = max(peor, act)
    return peor


def puntua(orden):
    total = 0
    for c in COLS:
        peso = 3 if c == 4 else (2 if c == 3 else 1)
        for f in filas(orden, c):
            if len(f) < 2:
                continue
            gen = {PONENTES[i][1] for i in f}
            sec = {PONENTES[i][2] for i in f}
            if 'M' not in gen:
                total += 10 * peso              # fila sin ninguna mujer
            if len(sec) == 1:
                total += 8 * peso               # fila de un solo sector
            elif len(sec) == 2 and len(f) >= 4:
                total += 2 * peso               # se premia la fila con tres sectores
    total += max(0, racha(orden, 1) - 3) * 6    # rachas de genero
    total += max(0, racha(orden, 2) - 3) * 5    # rachas de sector
    return total


def optimiza(reinicios=12, pasos=4000, semilla=7):
    """Descenso estocastico con reinicios. Corta en cuanto alcanza 0 o se estanca."""
    rnd = random.Random(semilla)
    mejor, mejor_s = None, None
    for _ in range(reinicios):
        orden = [0] + rnd.sample(range(1, N), N - 1)
        s = puntua(orden)
        sin_mejora = 0
        for _ in range(pasos):
            i, j = rnd.randrange(1, N), rnd.randrange(1, N)
            if i == j:
                continue
            orden[i], orden[j] = orden[j], orden[i]
            s2 = puntua(orden)
            if s2 < s:
                s, sin_mejora = s2, 0
            elif s2 == s:
                sin_mejora += 1
            else:
                orden[i], orden[j] = orden[j], orden[i]
                sin_mejora += 1
            if s == 0 or sin_mejora > 1200:
                break
        if mejor_s is None or s < mejor_s:
            mejor, mejor_s = list(orden), s
        if mejor_s == 0:
            break
    return mejor, mejor_s


if __name__ == '__main__':
    orden, s = optimiza()
    print('puntuacion %d  (0 = ninguna fila sin mujer ni de un solo sector, en los 3 anchos)\n' % s)
    for c in COLS:
        print('  %d columnas:' % c)
        for f in filas(orden, c):
            g = ''.join(PONENTES[i][1] for i in f)
            k = ''.join(PONENTES[i][2] for i in f)
            print('     %-5s %-5s' % (g, k))
        print()
    print('ORDEN (%d):' % N)
    print([PONENTES[i][0] for i in orden])
    print()
    print('mujeres en las posiciones:', [p + 1 for p, i in enumerate(orden) if PONENTES[i][1] == 'M'])
    print('racha max genero:', racha(orden, 1), '· racha max sector:', racha(orden, 2))
