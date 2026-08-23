# -*- coding: utf-8 -*-
"""Calcula la mejor colocacion de las mujeres en la parrilla de ponentes.

⚠️ MODELO DE FILAS — leer antes de tocar:
La primera tarjeta (Alvarez Pulido) lleva `.ponente.destacado`, que en CSS es
`grid-column: span 2`. Ocupa DOS celdas. Por tanto la tarjeta n (1-indexada)
cae en la celda n para todo n>=2, y la fila es floor(celda/cols).
Una version anterior de este script ignoraba ese detalle y modelaba filas de
4 tarjetas planas; acerto de casualidad. No repetir el error.

Penaliza:
  - filas sin ninguna mujer (lo que produce el muro de hombres al final)
  - concentracion en una sola columna (lo que produce un ciclo 2H-1M puro)
  - rachas largas de hombres seguidos
Restriccion dura: la posicion 1 es hombre y es la destacada.
"""
import itertools

N = 23          # ponentes en la parrilla
NM = 7          # cuantas son mujeres
COLS = (4, 3, 2)
DESTACADA_SPAN = 2


def celdas(n_tarjetas):
    """Celda que ocupa cada tarjeta 1-indexada, contando el span de la destacada."""
    return [0] + [k + DESTACADA_SPAN - 1 for k in range(1, n_tarjetas)]


CELDA = celdas(N)


def filas(pos_m, cols):
    """Mujeres por fila, con el modelo de celdas correcto."""
    por_fila = {}
    for k in range(1, N + 1):
        f = CELDA[k - 1] // cols
        por_fila.setdefault(f, 0)
        if k in pos_m:
            por_fila[f] += 1
    return [por_fila[f] for f in sorted(por_fila)]


def racha_max(pos_m):
    s, peor, act = set(pos_m), 0, 0
    for i in range(1, N + 1):
        act = 0 if i in s else act + 1
        peor = max(peor, act)
    return peor


def puntua(pos_m):
    total, detalle = 0, {}
    for c in COLS:
        f = filas(pos_m, c)
        sin = sum(1 for x in f if x == 0)
        cols_m = [CELDA[p - 1] % c for p in pos_m]
        conc = max(cols_m.count(k) for k in range(c))
        detalle[c] = (sin, conc, len(f))
        peso = 3 if c == 4 else (2 if c == 3 else 1)
        total += peso * sin * 10
        total += peso * max(0, conc - (NM // c + 1)) * 6
    total += max(0, racha_max(pos_m) - 3) * 8
    return total, detalle


if __name__ == '__main__':
    ACTUAL = (2, 4, 8, 11, 15, 18, 21)   # colocacion vigente desde 2026-08-22

    mejor = None
    for combo in itertools.combinations(range(2, N + 1), NM):
        s, d = puntua(combo)
        if mejor is None or s < mejor[0]:
            mejor = (s, combo, d)

    for etq, pos in (('VIGENTE', ACTUAL), ('OPTIMO ', mejor[1])):
        s, d = puntua(pos)
        seq = ''.join('M' if i in pos else 'H' for i in range(1, N + 1))
        print('%s  puntuacion %-3d  mujeres en %s' % (etq, s, list(pos)))
        for c in COLS:
            sin, conc, nf = d[c]
            print('    %d col: %d filas · %d sin mujer · max %d por columna' % (c, nf, sin, conc))
        print('    racha maxima de hombres:', racha_max(pos))
        print('    secuencia:', seq)
        print()
