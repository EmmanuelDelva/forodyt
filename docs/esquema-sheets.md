# Esquema de Google Sheets — IV Foro Inscripciones

Spreadsheet name: **IV-Foro-Inscripciones-2026**

## Pestaña 1 — `Usuarios`

Una fila por inscrito. Llave única: `correo` (lowercase, trimmed).

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | `folio` | string | `IV-FORO-XXXXXX` (6 chars base32 random) — único, no editable |
| B | `correo` | string | lowercase + trim — **PK** |
| C | `nombre_completo` | string | tal como saldrá en constancia |
| D | `tipo` | enum | `estudiante` / `academico` / `juridico` / `publico` / `privado` / `otro` / `ponente` |
| E | `grado` | enum/null | `lic` / `maestria` / `doctorado` / `especialidad` / null |
| F | `programa` | string/null | Programa académico si estudiante |
| G | `snii` | enum/null | `C` / `I` / `II` / `III` / `emerito` / null |
| H | `area_investigacion` | string/null | Si académico |
| I | `institucion` | string | obligatorio |
| J | `pais` | string | ISO-2 (`MX`, `ES`, etc.) |
| K | `modalidad` | enum | `presencial` / `virtual` / `mixta` |
| L | `fuente` | string/null | Cómo se enteró |
| M | `acepto_aviso` | bool | obligatorio = true |
| N | `acepto_codigo` | bool | obligatorio = true |
| O | `acepto_news` | bool | opcional |
| P | `qr_payload` | string | `FORO\|<folio>\|<hmac8>` |
| Q | `fecha_registro` | datetime | ISO 8601 |
| R | `correo_qr_enviado` | bool | flag para reintento |
| S | `horas_acumuladas` | float | calculado al cierre del evento |
| T | `nivel_constancia` | enum/null | `valor_curricular` / `asistencia` / `ponente` / null |
| U | `constancia_enviada` | bool | flag de envío |
| V | `notas_staff` | string/null | observaciones manuales |

## Pestaña 2 — `Platicas`

Cada sesión académica del Foro. Pre-poblar con el programa preliminar antes del evento.

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | `id_platica` | int | autoincremental |
| B | `nombre_sesion` | string | "Mesa I — Justicia agéntica" |
| C | `eje` | string | uno de los 9 ejes IV edición |
| D | `sede` | enum | `cucea` / `cugdl` / `cineteca` / `ciudad_judicial` / `virtual` |
| E | `jornada` | enum | `jv_vie_18_sep` / `j1_lun_21_sep` / `j2_mar_22_sep` |
| F | `hora_inicio` | datetime | con timezone -06:00 |
| G | `hora_fin` | datetime | |
| H | `horas_valor` | float | horas efectivas (no incluye coffee break) |
| I | `tipo` | enum | `keynote` / `mesa` / `conferencia` / `taller` |
| J | `formato` | enum | `presencial` / `virtual` / `hibrido` |
| K | `zoom_id` | string/null | si tiene componente virtual |
| L | `cerrada` | bool | flag para finalizar la ventana de check-in |

**Datos definitivos (2026-09-14)**: cinco bloques, uno por sede y jornada, con los mismos `id_platica` que `staff-scanner.html` y `programa-data.json`. Se dan de alta corriendo `instalarPlaticasIV()` (`apps-script/Asistencia.gs`) una vez desde el editor.

## Pestaña 3 — `CheckIns`

Una fila por escaneo válido. Lo escribe Apps Script desde el endpoint `?action=checkin`.

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | `id_checkin` | int | autoincremental |
| B | `folio_asistente` | string | FK → Usuarios.folio |
| C | `id_platica` | int | FK → Platicas.id_platica |
| D | `timestamp` | datetime | servidor |
| E | `staff_user` | string | correo del staff que escaneó |
| F | `fuente` | enum | `qr_presencial` / `zoom_csv` / `manual` |
| G | `valido` | bool | resultado de la validación HMAC + idempotencia |
| H | `motivo_rechazo` | string/null | `duplicado` / `fuera_de_ventana` / `hmac_invalido` / `simultaneo_otra_sede` |

**Reglas de validación (en orden)**:
1. HMAC del QR válido contra secreto.
2. Existe `folio_asistente` en `Usuarios`.
3. Existe `id_platica` en `Platicas` y la plática no está `cerrada`.
4. Timestamp dentro de la ventana de tolerancia: `[hora_inicio - 60 min, hora_fin + 60 min]` (decisión del director, 2026-09-14: el público rota entre mesas; p. ej. CUCEA cierra 14:10 → se escanea hasta 15:10). Los bloques con `sede = virtual` no tienen ventana: no se escanean.
5. No existe ya un check-in del mismo folio en la misma plática (idempotencia).
6. No existe un check-in del mismo folio en otra sede en la misma franja temporal (anti-fraude geográfico).

Si alguna falla → `valido = false`, `motivo_rechazo` se llena, no suma horas.

## Pestaña 4 — `_config` (oculta)

Parámetros editables sin tocar código.

| Key | Default | Descripción |
|-----|---------|-------------|
| `meta_horas_valor_curricular` | 10 | Horas para emitir constancia con valor curricular (director + tres centros universitarios; decisión 2026-09-14) |
| `meta_horas_asistencia_minima` | 4 | Horas mínimas para constancia base |
| `tolerancia_inicio_min` | 60 | Minutos de gracia al inicio de la sede |
| `tolerancia_fin_min` | 60 | Minutos de gracia al cierre de la sede |
| `umbral_zoom_porcentaje` | 75 | % de presencia para contar bloque virtual completo (CSV de Zoom) |
| `umbral_stream_porcentaje` | 75 | % de minutos verificados en `en-vivo.html` para acreditar un bloque presencial seguido a distancia |
| `minutos_minimos_virtual` | 10 | Minutos verificados que bastan para acreditar la Jornada Virtual (bloque `sede = virtual`) |
| `codigo_obligatorio_virtual` | FALSE | Si TRUE, la Jornada Virtual también exige un código de presencia |
| `endpoint_publico_activo` | true | flag global de pausa de inscripciones |

## Pestaña 5 — `_logs` (auditoría)

Toda llamada al endpoint queda registrada. Útil para debug y para auditoría LFPDPPP.

| Col | Campo |
|-----|-------|
| A | `timestamp` |
| B | `action` |
| C | `payload_resumen` |
| D | `resultado` |
| E | `ip_aprox` |
| F | `user_agent` |
