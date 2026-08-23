# -*- coding: utf-8 -*-
"""Busca la colocacion de 7 mujeres entre 23 ponentes que mejor se ve en los
TRES anchos de la parrilla (4 col >1120px, 3 col <=1120px, 2 col <=920px).

Penaliza:
  - filas sin ninguna mujer (el defecto de 'alternar y colapsar')
  - concentracion en una sola columna (el defecto del ciclo H-H-M puro)
  - rachas largas de hombres seguidos
Restriccion dura: la posicion 1 es hombre (Alvarez Pulido va destacado).
"""
import itertools
import random

N, NM = 23, 7
COLS = (4, 3, 2)


def filas(pos_m, cols):
    """Devuelve, por fila, cuantas mujeres tiene."""
    out = []
    for ini in range(0, N, cols):
        out.append(sum(1 for p in pos_m if ini < p <= min(ini + cols, N)))
    return out


def racha_max(pos_m):
    s = set(pos_m)
    peor = act = 0
    for i in range(1, N + 1):
        act = 0 if i in s else act + 1
        peor = max(peor, act)
    return peor


def puntua(pos_m):
    total = 0
    detalle = {}
    for c in COLS:
        f = filas(pos_m, c)
        sin = sum(1 for x in f if x == 0)
        # concentracion de columna: cuantas mujeres caen en la misma columna
        cols_m = [(p - 1) % c for p in pos_m]
        conc = max(cols_m.count(k) for k in range(c))
        detalle[c] = (sin, conc)
        # las filas sin mujer pesan mas en 4 col (la vista por defecto)
        peso = 3 if c == 4 else (2 if c == 3 else 1)
        total += peso * sin * 10
        total += peso * max(0, conc - (NM // c + 1)) * 6
    total += max(0, racha_max(pos_m) - 3) * 8
    return total, detalle


mejor = None
random.seed(7)
# 22 sobre 7 = 170 544 combinaciones: cabe la busqueda exhaustiva
for combo in itertools.combinations(range(2, N + 1), NM):
    s, d = puntua(combo)
    if mejor is None or s < mejor[0]:
        mejor = (s, combo, d)

s, pos, d = mejor
print('MEJOR COLOCACION  ·  puntuacion %d (0 = perfecta)' % s)
print('mujeres en las posiciones:', list(pos))
print()
seq = ''.join('M' if i in pos else 'H' for i in range(1, N + 1))
for c in COLS:
    trozos = [seq[i:i + c] for i in range(0, N, c)]
    sin, conc = d[c]
    print('  %d col: %s' % (c, ' | '.join(trozos)))
    print('         filas sin mujer: %d/%d · maximo por columna: %d' % (sin, len(trozos), conc))
print()
print('racha maxima de hombres seguidos:', racha_max(pos))
