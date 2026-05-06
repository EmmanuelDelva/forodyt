# Despliegue del Apps Script — paso a paso

## 1. Crear el Google Sheets

1. Crea un Google Sheets nuevo, nombre: **IV-Foro-Inscripciones-2026**.
2. Crea las pestañas (en orden): `Usuarios`, `Platicas`, `CheckIns`, `_config`, `_logs`, `Newsletter`.
3. Pega los headers según `docs/esquema-sheets.md`.
4. Pre-puebla `Platicas` con el programa preliminar (15 sesiones aprox.).
5. Pre-puebla `_config` con los valores default:

| Key | Value |
|---|---|
| `meta_horas_valor_curricular` | `20` |
| `meta_horas_asistencia_minima` | `4` |
| `tolerancia_inicio_min` | `5` |
| `tolerancia_fin_min` | `10` |
| `umbral_zoom_porcentaje` | `75` |
| `endpoint_publico_activo` | `TRUE` |

## 2. Vincular Apps Script

1. En el Sheets: menú **Extensions > Apps Script**.
2. Borra el contenido por defecto de `Code.gs`.
3. Copia y pega el contenido completo de `apps-script/Code.gs`.
4. **File > New > HTML file** con nombre `Plantilla-correo`. Pega el contenido de `apps-script/Plantilla-correo.html`.

## 3. Configurar Script Properties

1. En el editor Apps Script: **Project Settings (engranaje) > Script Properties > Add script property**.
2. Agregar las siguientes claves:

| Property | Value |
|---|---|
| `HMAC_SECRET` | string aleatorio de 32+ caracteres. Generar UNA VEZ con: `openssl rand -base64 32` o nodejs `crypto.randomBytes(32).toString('base64')`. **No compartir nunca**. Si se filtra, regenerar y notificar a inscritos. |
| `FOLIO_PREFIX` | `IV-FORO-` |
| `SENDER_NAME` | `IV Foro Internacional de Derecho y Tecnología` |
| `SENDER_EMAIL` | `emmanueldelva@cucea.udg.mx` |
| `LOGO_URL` | URL pública del logo del Foro (Drive público o Vercel). Opcional. |

## 4. Probar localmente desde el editor

1. En el editor, selecciona la función `doGet` y pulsa **Run**.
2. Acepta los permisos: lectura/escritura de Sheets, envío de correos, fetch de URLs externas.
3. Si todo OK, prueba `crearInscripcion` con un payload mock:

```javascript
function _testInscripcion() {
  const r = crearInscripcion({
    correo: 'tu-correo@gmail.com',
    nombre: 'Prueba Test',
    tipo: 'academico',
    institucion: 'UDG',
    modalidad: 'presencial',
    pais: 'MX',
    acepto_aviso: true,
    acepto_codigo: true
  });
  Logger.log(JSON.stringify(r));
}
```

Verifica que llegó el correo con el QR.

## 5. Desplegar como Web App

1. **Deploy > New deployment**.
2. Type: **Web app**.
3. Configuración:
   - Description: `IV Foro 2026 v1`
   - Execute as: **Me (emmanueldelva@cucea.udg.mx)**
   - Who has access: **Anyone**
4. Click **Deploy**. Acepta los permisos adicionales.
5. Copia la **Web app URL**. Tendrá la forma:
   `https://script.google.com/macros/s/AKfycbX.../exec`

## 6. Conectar el frontend

1. Abre `inscripcion.html` en tu repo.
2. Busca la línea con `// === Demo: emular envío al backend ===`.
3. Reemplaza el bloque por la versión real (Claude Code lo hace).
4. Define la constante `ENDPOINT` arriba del script:

```javascript
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbX.../exec';
```

5. Despliega a Vercel y prueba el flujo end-to-end con tu correo personal.

## 7. Verificación de cuotas

Antes del evento, ejecuta una vez:

```javascript
function checkQuota() {
  Logger.log('Mail quota: ' + MailApp.getRemainingDailyQuota());
}
```

Debe reportar `1500` o más (cuenta Workspace UDG). Si reporta `100`, la cuenta está como personal — escalar a CGTI UDG.

## 8. Plan de rollback

Si algo falla en producción:
1. Pausar inscripciones: en `_config` cambiar `endpoint_publico_activo = FALSE`. El frontend debe leer este flag al cargar.
2. Re-desplegar versión anterior: **Deploy > Manage deployments > Editar > Version: previous**.
3. Comunicación pública: post pinneado en LinkedIn + correo a inscritos avisando re-apertura.

## 9. Triggers programados (opcional pero recomendado)

Configurar trigger time-based para `procesarConstancias()`:
- **Día 22 de septiembre 23:30** (después del cierre del Foro).
- Tipo: time-driven, día específico.

Y trigger semanal para enviar reporte automático al Director:
- **Lunes 9:00 a.m.**, función `reporteSemanalAlDirector()` (a implementar).
