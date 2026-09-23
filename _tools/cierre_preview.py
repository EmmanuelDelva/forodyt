#!/usr/bin/env python3
"""Vista previa del correo de cierre y de la constancia general de asistencia (apps-script/Cierre.gs).

Genera en _tools/out/cierre/:
  correo-cierre.html        el correo tal como lo arma Correo-cierre.html
  constancia-general.html   la constancia (tipo 'general' de Constancia-bloque.html)
  render.sh                 imprime la constancia a PDF con Chromium

Usa el mismo intérprete de scriptlets que constancias_mesa.py, así que lo que se ve aquí es lo que sale
del backend. Firmas por variable de entorno (NO se versionan):
  FIRMA_PNG        firma del Director
  FIRMA_LEOS_PNG   firma del Secretario Académico (si falta, su columna sale con la línea en blanco)

  FIRMA_PNG=… python3 _tools/cierre_preview.py ["Nombre de muestra"] && sh _tools/out/cierre/render.sh
"""
import io
import os
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from constancias_mesa import ROOT, TPL, CHROMIUM, AGUA, data_uri, render  # noqa: E402

OUT = os.path.join(ROOT, '_tools', 'out', 'cierre')
CORREO = io.open(os.path.join(ROOT, 'apps-script', 'Correo-cierre.html'), encoding='utf-8').read()

# Mismos valores que CIERRE y datosCierre_() en Cierre.gs
FOLIO = 'IV-FIDDT-GEN/UDG/2026-0001'
CTX = dict(
    tipo='general', participacion=False, institucion='Universidad de Guadalajara', folio=FOLIO,
    fecha_emision='23 de septiembre de 2026',
    fechas_txt='18, 21 y 22 de septiembre de 2026', modalidad_txt='Híbrida',
    sedes_txt='CUCEA · CUGDL · Cineteca FICG · Ciudad Judicial · En línea',
    firma2_nombre='Dr. Jorge Antonio Leos Navarro', firma2_cargo='Secretario Académico',
    firma2_sub='IV Foro Internacional de Derecho y Tecnología',
    logos={
        'udg': data_uri(os.path.join(ROOT, 'img', 'aliados', 'udg.png')),
        'ca': data_uri(os.path.join(ROOT, 'img', 'aliados', 'ca-derecho-tecnologia-lockup.png')),
        'foro': data_uri(os.path.join(ROOT, 'img', 'marca', 'foro-logo-constancia.png')),
    },
    agua_src=AGUA,
    firma_src=data_uri(os.environ.get('FIRMA_PNG', '')),
    firma2_src=data_uri(os.environ.get('FIRMA_LEOS_PNG', '')),
)


def main(argv):
    nombre = argv[0] if argv else 'María Fernanda López Hernández'
    os.makedirs(OUT, exist_ok=True)
    if not CTX['firma_src']:
        print('AVISO: sin FIRMA_PNG, la constancia sale sin la firma del Director.')
    if not CTX['firma2_src']:
        print('AVISO: sin FIRMA_LEOS_PNG, la firma del Secretario Académico sale en blanco.')
    ctx = dict(CTX, nombre=nombre)
    io.open(os.path.join(OUT, 'constancia-general.html'), 'w', encoding='utf-8').write(render(TPL, ctx))
    io.open(os.path.join(OUT, 'correo-cierre.html'), 'w', encoding='utf-8').write(render(CORREO, ctx))
    sh = ['#!/bin/sh', 'cd "$(dirname "$0")"',
          '%s --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer '
          '--print-to-pdf="constancia-general.pdf" "file://$PWD/%s" 2>/dev/null'
          % (CHROMIUM, quote('constancia-general.html'))]
    io.open(os.path.join(OUT, 'render.sh'), 'w').write('\n'.join(sh) + '\n')
    print('HTML en %s\nPDF: sh %s/render.sh' % (OUT, OUT))


if __name__ == '__main__':
    main(sys.argv[1:])
