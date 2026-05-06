# Anti-fraude — decisiones de diseño

## El riesgo concreto

Foro académico gratuito con constancia de valor curricular. El incentivo a falsificar es real: estudiantes que necesitan horas para titulación, profesores que reportan a su universidad, profesionales que acreditan educación continua.

## Vectores de fraude considerados

| Vector | Probabilidad | Mitigación |
|---|---|---|
| **A.** Una persona se inscribe y nunca asiste, pero un cómplice usa su QR | Media | HMAC en QR (lo discutido) + brazalete físico día 1 con validación INE |
| **B.** Un asistente reenvía su QR a varios y se reporta presente en mesas paralelas | Alta sin mitigación | HMAC + cruce de check-ins simultáneos en sedes distintas → bandera automática |
| **C.** Falsificación del QR (generar uno arbitrario) | Baja | HMAC con secreto del lado servidor — sin secreto, no se puede falsificar QR válido |
| **D.** Manipulación del Sheets directamente | Baja | Solo el equipo organizador tiene acceso de edición. Logs en `_logs` muestran cualquier cambio. |
| **E.** Inscripción fake masiva (bots) | Baja | Honeypot field + rate limit en frontend (1 inscripción por correo). En extremo: reCAPTCHA v3 fase 2. |
| **F.** Reutilización de QR ajeno tras pasar mesa de control | Media | Brazalete físico inviolable día 1 — si Juan le presta el QR a Pedro, Pedro no tiene brazalete y se nota. |

## Diseño en capas

```
QR (HMAC) → Identidad validada (brazalete día 1) → Cruce simultáneo (geo-temporal)
```

### Capa 1 — QR con HMAC

Cada QR codifica:
```
FORO|<folio>|<hmac8>
```

`hmac8` es los primeros 8 caracteres hex de `HMAC-SHA256(folio, HMAC_SECRET)`.

Sin conocer `HMAC_SECRET` (guardado en Script Properties del Apps Script), nadie puede generar QRs válidos. Si alguien intenta inscribirse con QR falso, falla la verificación HMAC en el escaneo.

### Capa 2 — Brazalete día 1

Brazalete de tela tipo festival, color granate o teal, estampado "IV FORO DDT 2026". Costo: ~$2 MXN c/u, total ~$800 MXN para 400 brazaletes.

**Procedimiento día 1**:
1. Mesa de control en entrada de CUCEA (8:00–10:30 a.m. y 13:00–15:00 p.m.).
2. Asistente presenta QR + INE/credencial UDG.
3. Staff valida visualmente que el nombre coincida.
4. Coloca brazalete en muñeca.
5. Marca al asistente como "identidad_validada = true" en el Sheets.

**Día 2**: ya no se valida identidad. Solo se verifica brazalete visual al ingresar a sede + QR para registrar mesa.

### Capa 3 — Cruce simultáneo geo-temporal

Función `haySimultaneoEnOtraSede_()` (a implementar completa):

```
Si folio X tiene check-in válido en plática P1 (sede CUCEA, 11:00–13:00)
Y folio X tiene check-in válido en plática P2 (sede CUGDL, 12:00–14:00)
→ Bandera: "fraude_simultaneo"
→ Se invalida el segundo check-in y se notifica al staff
```

Esto cubre el caso del QR compartido entre amigos.

## Lo que NO mitigamos (riesgo aceptado)

- Que un asistente con identidad validada al día 1 pase su brazalete a un cómplice al final del día 1 para que asista al día 2 en su nombre. Para mitigarlo necesitaríamos brazaletes con chip RFID o foto en credencial — costo desproporcionado para evento gratuito.
- Que dos asistentes reales que comparten correo (ej. esposos académicos en misma cuenta institucional) se inscriban una sola vez y rotan presencia. Caso poco probable.

## Auditoría

`_logs` registra:
- Cada llamada al endpoint con timestamp y resultado.
- Cada checkin con `valido = false` y motivo.

Al cierre del evento, ejecutar `auditoriaPostEvento()` (a implementar) que produce:
- Lista de folios con cualquier rechazo.
- Lista de pares (folio, plática) marcados como simultaneo.
- Tasa de fraude detectada vs total de check-ins.

Si la tasa supera 2%, escalar al Director del Foro antes de emitir constancias.

## Reglas explícitas para el staff

Imprimir y dar al staff de mesa de control:

> 1. **No coloques brazalete sin validar INE/credencial UDG.** Cero excepciones.
> 2. **Si el nombre del QR no coincide con el INE**, no permitas el acceso. Llama al coordinador de logística.
> 3. **No escanees el QR si la persona no tiene brazalete** (a partir del momento en que ya se distribuyeron). El brazalete es prueba de identidad validada.
> 4. **Si algo se siente raro**, usa la app del staff para escribir una nota en el campo `notas_staff` del usuario.
