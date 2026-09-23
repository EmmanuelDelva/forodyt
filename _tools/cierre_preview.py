#!/usr/bin/env python3
"""Vista previa del correo de cierre y de la constancia general de asistencia (apps-script/Cierre.gs).

Genera en _tools/out/cierre/, una por modalidad de inscripción (presencial · virtual · mixta):
  constancia-<modalidad>.html   la constancia (tipo 'general' de Constancia-bloque.html)
  correo-<modalidad>.html       el correo tal como lo arma Correo-cierre.html
  render.sh                     imprime las constancias a PDF con Chromium

Los textos y las horas de cada modalidad NO se copian aquí: se leen de CIERRE_MODALIDADES en Cierre.gs con
node, y la plantilla se interpreta con el mismo intérprete de constancias_mesa.py. Lo que se ve aquí es lo que
sale del backend. Firmas por variable de entorno (NO se versionan):
  FIRMA_PNG        firma del Director
  FIRMA_LEOS_PNG   firma del Secretario Académico (si falta, su columna sale con la línea en blanco)

  FIRMA_PNG=… FIRMA_LEOS_PNG=… python3 _tools/cierre_preview.py ["Nombre de muestra"] && sh _tools/out/cierre/render.sh
"""
import io
import json
import os
import subprocess
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from constancias_mesa import ROOT, TPL, CHROMIUM, AGUA, data_uri, render  # noqa: E402

OUT = os.path.join(ROOT, '_tools', 'out', 'cierre')
CORREO = io.open(os.path.join(ROOT, 'apps-script', 'Correo-cierre.html'), encoding='utf-8').read()
CIERRE_GS = os.path.join(ROOT, 'apps-script', 'Cierre.gs')

# Evalúa en node las constantes de Cierre.gs que definen modalidades y horas, más horasTexto_ de Asistencia.gs.
NODE = r"""
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8');
const asis = fs.readFileSync(process.argv[2], 'utf8');
const trozo = (s, ini, fin) => { const a = s.indexOf(ini); const b = s.indexOf(fin, a); if (a < 0 || b < 0) throw new Error('no encuentro ' + ini); return s.slice(a, b); };
const codigo = trozo(src, 'const CIERRE = {', '// ───') + trozo(asis, 'function horasTexto_', '/**');
const f = new Function(codigo + `
  const out = {};
  Object.keys(CIERRE_MODALIDADES).forEach(k => {
    const m = CIERRE_MODALIDADES[k], h = horasCompletas_(m.minutos);
    out[k] = Object.assign({}, m, { horas: h, horas_txt: horasTexto_(h) });
  });
  return { modalidades: out, firma2: CIERRE.firma2, prefijo: CIERRE.prefijoFolio,
           horas_evento_txt: horasTexto_(horasCompletas_(CIERRE_MINUTOS_EVENTO)) };`);
process.stdout.write(JSON.stringify(f()));
"""


def datos_gs():
    asis = os.path.join(ROOT, 'apps-script', 'Asistencia.gs')
    return json.loads(subprocess.check_output(['node', '-e', NODE, CIERRE_GS, asis]).decode('utf-8'))


def main(argv):
    nombre = argv[0] if argv else 'María Fernanda López Hernández'
    g = datos_gs()
    os.makedirs(OUT, exist_ok=True)
    base = dict(
        tipo='general', participacion=False, nombre=nombre, institucion='Universidad de Guadalajara',
        folio=g['prefijo'] + '0001', fecha_emision='23 de septiembre de 2026',
        firma2_nombre=g['firma2']['nombre'], firma2_cargo=g['firma2']['cargo'], firma2_sub=g['firma2']['sub'],
        logos={
            'udg': data_uri(os.path.join(ROOT, 'img', 'aliados', 'udg.png')),
            'ca': data_uri(os.path.join(ROOT, 'img', 'aliados', 'ca-derecho-tecnologia-lockup.png')),
            'foro': data_uri(os.path.join(ROOT, 'img', 'marca', 'foro-logo-constancia.png')),
        },
        agua_src=AGUA,
        firma_src=data_uri(os.environ.get('FIRMA_PNG', '')),
        firma2_src=data_uri(os.environ.get('FIRMA_LEOS_PNG', '')),
    )
    if not base['firma_src']:
        print('AVISO: sin FIRMA_PNG, la constancia sale sin la firma del Director.')
    if not base['firma2_src']:
        print('AVISO: sin FIRMA_LEOS_PNG, la firma del Secretario Académico sale en blanco.')
    sh = ['#!/bin/sh', 'cd "$(dirname "$0")"']
    for k, m in g['modalidades'].items():
        ctx = dict(base, asistente_txt=m['asistente'], celebrada_txt=m['celebrada'], fechas_txt=m['fechas'],
                   modalidad_txt=m['etiqueta'], sedes_txt=m['sedes'], horas=m['horas'], horas_txt=m['horas_txt'])
        io.open(os.path.join(OUT, 'constancia-%s.html' % k), 'w', encoding='utf-8').write(render(TPL, ctx))
        correo = dict(nombre=nombre, folio=base['folio'], horas_evento_txt=g['horas_evento_txt'],
                      modalidad_correo=m['correo'], horas_correo='%s (%s\u00a0h)' % (m['horas_txt'], m['horas']))
        io.open(os.path.join(OUT, 'correo-%s.html' % k), 'w', encoding='utf-8').write(render(CORREO, correo))
        sh.append('%s --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer '
                  '--print-to-pdf="constancia-%s.pdf" "file://$PWD/%s" 2>/dev/null'
                  % (CHROMIUM, k, quote('constancia-%s.html' % k)))
        print('  %-10s %2d h · %s' % (k, m['horas'], m['etiqueta']))
    io.open(os.path.join(OUT, 'render.sh'), 'w').write('\n'.join(sh) + '\n')
    print('HTML en %s\nPDF: sh %s/render.sh' % (OUT, OUT))


if __name__ == '__main__':
    main(sys.argv[1:])
