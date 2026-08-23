# -*- coding: utf-8 -*-
"""Como prep_avatar.py pero permite ACOLCHAR con negro antes de recortar, para
las fotos donde la cabeza toca el borde superior del original y no hay aire que
tomar. El fondo de la parrilla es negro, asi que el relleno es invisible.

Uso:
  python prep_avatar2.py <origen> <destino.jpg> [--pad-top 120] [--cx .5] [--cy .34] [--frac .62]
"""
import argparse
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('--pad-top', type=int, default=0)
    ap.add_argument('--pad-bottom', type=int, default=0)
    ap.add_argument('--pad-side', type=int, default=0)
    ap.add_argument('--cx', type=float, default=0.50)
    ap.add_argument('--cy', type=float, default=0.34)
    ap.add_argument('--frac', type=float, default=0.62)
    ap.add_argument('--q', type=int, default=82)
    a = ap.parse_args()

    im = Image.open(a.src)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        f = Image.new('RGB', im.size, (0, 0, 0))
        f.paste(im, mask=im.split()[-1])
        im = f
    else:
        im = im.convert('RGB')

    if a.pad_top or a.pad_bottom or a.pad_side:
        w, h = im.size
        nw, nh = w + 2 * a.pad_side, h + a.pad_top + a.pad_bottom
        lienzo = Image.new('RGB', (nw, nh), (0, 0, 0))
        lienzo.paste(im, (a.pad_side, a.pad_top))
        im = lienzo

    w, h = im.size
    lado = int(min(w, h) * a.frac)
    cx, cy = int(w * a.cx), int(h * a.cy)
    x0 = max(0, min(w - lado, cx - lado // 2))
    y0 = max(0, min(h - lado, cy - lado // 2))

    im = im.crop((x0, y0, x0 + lado, y0 + lado)).resize((400, 400), Image.LANCZOS)
    im.save(a.dst, 'JPEG', quality=a.q, optimize=True, progressive=True)

    import os
    print('%s  400x400  %dKB  (recorte %dpx desde %d,%d de %dx%d)'
          % (a.dst, os.path.getsize(a.dst) // 1024, lado, x0, y0, w, h))


if __name__ == '__main__':
    main()
