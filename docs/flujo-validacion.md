# Flujo de validación de asistencia — presencial + virtual

## Modalidades de asistencia

| Modalidad | Cómo se valida asistencia | Cómo suma horas |
|---|---|---|
| **Presencial** | QR escaneado por staff al ingreso de cada mesa, en sede física | Suma `horas_valor` de la plática completa si está en ventana de tolerancia |
| **Virtual** | Reporte de asistencia de Zoom Webinar (descarga CSV al cierre de cada sesión) | Suma `horas_valor` completo si presencia ≥ 75% de duración de la sesión |
| **Mixta** | Combinación de las dos sin doble conteo | El sistema cuenta presencial primero; virtual solo cuenta si NO hubo check-in presencial en esa plática |

## Detalle técnico — modo virtual con Zoom Webinar

### Por qué Zoom Webinar y no Meeting

- **Webinar** registra cada participante con correo + duración total + bloques de conexión/desconexión.
- **Meeting** solo registra duración promedio sin granularidad por participante con confiabilidad.
- Webinar permite hasta 500 asistentes en plan estándar; suficiente para el Foro.

### Configuración por sesión virtual

1. Cada plática del programa con componente virtual tiene un Zoom Webinar dedicado (no se reusa la misma sala para varias mesas — esto facilita el reporte CSV).
2. Pre-registro obligatorio: los asistentes inscritos como "virtual" o "mixta" reciben links únicos por correo (uno por sesión) generados desde Zoom con su correo pre-registrado.
3. Al final de cada sesión, el coordinador descarga el CSV de "Attendee Report".

### Procesamiento del CSV en Apps Script

Función `procesarCSVZoom(idPlatica, csvBlob)` (a implementar):

1. Parsea el CSV (formato Zoom estándar: Email, Duration in minutes, etc.).
2. Para cada fila:
   - Busca el correo en `Usuarios`.
   - Calcula porcentaje: `duracion_minutos / duracion_total_sesion_minutos`.
   - Si ≥ 75%: registra check-in válido en `CheckIns` con `fuente = 'zoom_csv'`.
   - Si < 75%: registra check-in con `valido = false` y `motivo = 'porcentaje_insuficiente'`.
3. La idempotencia se mantiene: si ya hay check-in presencial para ese folio en esa plática, no se duplica.

### Trigger automatizado (opcional)

- Carpeta de Drive compartida con el coordinador virtual: cuando suba un CSV nombrado `zoom-platicaXX.csv`, un trigger lee el archivo y procesa.
- Más simple: ejecutar manualmente la función al cierre del evento, una sola vez con todos los CSVs.

## Plan B sin Zoom Webinar (más simple)

Si CUCEA no tiene licencia Webinar y comprar una sola para el evento es costoso:

| Capa | Implementación |
|---|---|
| Streaming | YouTube Live público en canal del Foro |
| Identificación | Formulario "Soy [nombre], folio [XXX]" en chat al inicio de cada plática |
| Validación humana | Un becario del staff hace screenshot del chat cada plática como evidencia |
| Tracking | Manual en Sheets (folio + plática), ~5 min por sesión |

Esta opción sacrifica precisión pero baja costo a cero. Es viable si los virtuales son < 50 personas.

## Decisión recomendada

- **Presupuesto disponible**: Zoom Webinar plan Pro mensual (~$200 USD para uso intensivo el mes del evento). Cancelable después.
- **Sin presupuesto**: YouTube Live + chat + screenshots manuales.

Tu decisión, Emmanuel. Si optas por Zoom Webinar, el SS implementa la función `procesarCSVZoom`. Si optas por YouTube Live, el SS implementa la función `registrarManualZoom(folio, idPlatica, evidencia_url)` que el becario llama desde un formulario simple.

## Flujo general del día del evento (resumen)

```
8:00 — Mesa de control abre en CUCEA
       [Staff: 2 personas con app de validación]

8:30 — Primer asistente llega
       → Presenta QR + INE
       → Staff valida y coloca brazalete
       → Marca "identidad_validada" en Sheets

9:00 — Inicio Mesa I (CUCEA)
       → Staff escanea QR de cada asistente al entrar
       → Cierre de ventana 9:05 + 10 min cortesía = 9:15

9:00 — Mismo Mesa I se transmite vía Zoom Webinar
       → Asistentes virtuales se conectan con su link único

11:00 — Cambio de sede a Ciudad Judicial (Mesa II)
        → Asistentes presenciales se trasladan
        → Si Mesa II inicia 12:00, ventana abre 11:55–12:10

22:00 — Cierre día 1
        → Staff descarga CSV de Zoom de las sesiones del día
        → Sube a Drive compartido

Día 2 — Mismo flujo, sin re-validación de identidad
        → Solo verificación visual de brazalete

22:00 día 2 — Cierre del evento
              → Coordinador ejecuta procesarConstancias()
              → Apps Script suma horas + asigna nivel + envía PDFs

3 días después — Director revisa muestra aleatoria de constancias
                 → Aprueba envío masivo (si no aprobó automático)
```
