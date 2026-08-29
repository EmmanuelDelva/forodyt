# -*- coding: utf-8 -*-
"""Orden de la parrilla de ponentes del IV Foro.

CRITERIO (fijado por el director el 2026-08-23):
  1. Los perfiles de MAS PESO salen primero. El peso lo da el rol en el programa
     (magistral, inaugural, apertura) y el rango institucional.
  2. Anclas fijas: Alvarez Pulido en la 1 (destacada) y Miguel Angel Gaspar en la 2,
     porque da la conferencia inaugural. Juan Carlos Contreras en la SEGUNDA FILA.
  3. Se respeta la alternancia de genero: ninguna fila sin mujer.
  4. La mezcla de sectores (publico · academia · privado) pasa a criterio secundario.

⚠️ MODELO DE FILAS: la primera tarjeta lleva `.ponente.destacado`, que es
`grid-column: span 2` — ocupa DOS celdas. La tarjeta n cae en la celda n para
todo n>=2, y la fila es floor(celda/cols). Anchos: 4 col (>1120px) · 3 col
(<=1120px) · 2 col (<=920px).
"""
import random

COLS = (4, 3, 2)
DESTACADA_SPAN = 2

# (slug, genero, sector, peso)
#   sector: P=publico · A=academia · R=privado
#   peso 1-10: rol en el programa + rango institucional. Ajustable a mano.
PONENTES = [
    ('alvarez',             'H', 'P', 10),  # Magistrado Presidente STJ · magistral + clausura
    ('gaspar',              'H', 'R',  9),  # conferencia INAUGURAL
    ('contreras',           'H', 'P',  9),  # Director General · Escudo Urbano C5 Jalisco
    ('rivera',              'H', 'P',  9),  # Director General IJCF · ponencia de apertura dia 2
    ('sossa',               'H', 'A',  9),  # Director del CIC-IPN · emerito · Premio Nacional
    ('raad',                'H', 'P',  8),  # Magistrado Auxiliar CSJ · Presidente de ALGDETIC
    ('gonzalez',            'M', 'P',  8),  # Consejo Superior de la Judicatura · Colombia
    ('zepeda',              'H', 'A',  8),  # Director General del IJA
    ('olmos',               'M', 'P',  8),  # Directora General C5i Aguascalientes
    ('villarreal',          'H', 'P',  8),  # Director General C5i Guanajuato
    ('caicedo',             'M', 'R',  8),  # Presidenta del Observatorio Mundial de la Abogacia
    ('troncoso',            'H', 'P',  8),  # Magistrado Auxiliar CSJ Colombia
    ('barrios',             'M', 'P',  7),  # Directora Seccional · Rama Judicial
    ('reyes',               'H', 'A',  7),  # Decano de Derecho · Unilibre Cartagena
    ('tinajero',            'H', 'P',  7),  # Secretario Tecnico SEAJAL
    ('marquez',             'H', 'P',  7),  # Juez de Control · PJ Jalisco
    ('vega_gomez',          'H', 'A',  7),  # Presidente IEEE Seccion Guadalajara
    ('gustavo_juarez',      'H', 'A',  7),  # ex Presidente Seccion Argentina IEEE
    ('gamez',               'M', 'A',  7),  # Tec de Monterrey
    ('ibarra',              'H', 'R',  6),  # AMCID · FIADI
    ('vega',                'H', 'R',  6),  # Presidente APPIF · Panama
    ('garcia_torres',       'M', 'A',  6),  # U. Alfonso X el Sabio · IusConnect
    ('gomez',               'H', 'P',  6),  # capacitador CSJN Argentina
    ('jimenez',             'H', 'A',  6),  # Investigador por Mexico · coordina mesa
    ('rojas_sanchez',       'H', 'P',  6),  # Hospital Civil de Guadalajara
    ('vazquez_placencia',   'H', 'P',  6),  # Director General · Contraloria de Jalisco
    ('juarez_tello',        'H', 'P',  6),  # Director de Tecnologias · SEAJAL
    ('garcia_barrera',      'M', 'A',  6),  # UANL · dirigio volumen en Thomson Reuters
    ('rosales',             'M', 'A',  5),
    ('gomez_avila',         'H', 'R',  5),
    ('viniegra',            'M', 'R',  5),
    ('nava_lopez',          'M', 'P',  5),
    ('doria',               'H', 'A',  5),
    ('hernandez_alcantara', 'M', 'P',  5),
    ('lozano_valdivia',     'M', 'A',  5),
    ('arrazola',            'H', 'A',  5),
    ('lozano_martinez',     'H', 'A',  5),
    ('romero_gutierrez',    'M', 'A',  4),
    ('willman',             'H', 'A',  4),
    ('sanchez_aguirre',     'H', 'A',  4),
    ('pinto_garcia',        'M', 'A',  4),
]

IDX = {p[0]: i for i, p in enumerate(PONENTES)}
N = len(PONENTES)
CELDA = [0] + [k + DESTACADA_SPAN - 1 for k in range(1, N)]

FIJOS = {0: IDX['alvarez'], 1: IDX['gaspar']}          # posiciones 1 y 2
FILA2 = IDX['contreras']                                # debe caer en la fila 2 (4 col)


def filas(orden, cols):
    out = {}
    for pos, i in enumerate(orden):
        out.setdefault(CELDA[pos] // cols, []).append(i)
    return [out[f] for f in sorted(out)]


def puntua(orden):
    total = 0
    # 1 · los pesados primero: a mayor peso, mas caro caer tarde
    for pos, i in enumerate(orden):
        total += pos * PONENTES[i][3] * 2
    # 2 · Contreras en la fila 2 (celdas 4-7 con 4 columnas)
    pos_c = orden.index(FILA2)
    if not (4 <= CELDA[pos_c] <= 7):
        total += 900
    # 3 · ninguna fila sin mujer · 4 · mezcla de sectores (secundaria)
    for c in COLS:
        peso = 4 if c == 4 else (2 if c == 3 else 1)
        for f in filas(orden, c):
            if len(f) < 2:
                continue
            if 'M' not in {PONENTES[i][1] for i in f}:
                total += 260 * peso
            if len({PONENTES[i][2] for i in f}) == 1:
                total += 40 * peso
    return total


def optimiza(reinicios=10, pasos=6000, semilla=11):
    rnd = random.Random(semilla)
    libres = [i for i in range(N) if i not in FIJOS.values()]
    mejor = mejor_s = None
    for _ in range(reinicios):
        resto = libres[:]
        rnd.shuffle(resto)
        orden = [FIJOS[0], FIJOS[1]] + resto
        s = puntua(orden)
        quieto = 0
        for _ in range(pasos):
            i, j = rnd.randrange(2, N), rnd.randrange(2, N)
            if i == j:
                continue
            orden[i], orden[j] = orden[j], orden[i]
            s2 = puntua(orden)
            if s2 < s:
                s, quieto = s2, 0
            else:
                orden[i], orden[j] = orden[j], orden[i]
                quieto += 1
            if quieto > 1500:
                break
        if mejor_s is None or s < mejor_s:
            mejor, mejor_s = list(orden), s
    return mejor, mejor_s


if __name__ == '__main__':
    orden, s = optimiza()
    print('puntuacion %d\n' % s)
    print('FILAS EN 4 COLUMNAS (la vista de escritorio)')
    for nf, f in enumerate(filas(orden, 4), 1):
        det = '  '.join('%-19s %s%s%d' % (PONENTES[i][0], PONENTES[i][1], PONENTES[i][2], PONENTES[i][3]) for i in f)
        print('  fila %-2d  %s' % (nf, det))
    print()
    sinM = [n for n, f in enumerate(filas(orden, 4), 1) if 'M' not in {PONENTES[i][1] for i in f}]
    print('filas sin mujer (4 col):', sinM or 'ninguna')
    sinM3 = [n for n, f in enumerate(filas(orden, 3), 1) if len(f) > 1 and 'M' not in {PONENTES[i][1] for i in f}]
    print('filas sin mujer (3 col):', sinM3 or 'ninguna')
    print('peso medio por fila (4 col):',
          [round(sum(PONENTES[i][3] for i in f) / len(f), 1) for f in filas(orden, 4)])
    print()
    print('ORDEN:')
    print([PONENTES[i][0] for i in orden])
