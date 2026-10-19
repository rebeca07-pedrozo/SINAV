# SINAV — Obligaciones de impuestos

Tres pestañas, una sola hoja: **ENVIAR** (pendientes), **RESPUESTAS** (lo enviado y su sellado) y **ALERTAS** (tablero).

## Puesta en marcha
1. Google Sheets vacío → **Extensiones → Apps Script**.
2. Crea un archivo por cada uno de `src/`: `Config.gs`, `Datos.gs`, `Instalar.gs`, `Enviar.gs`, `Buzon.gs`, `Avisos.gs`, `Plantilla.gs`, `Web.gs` y los HTML `Index`, `Respuestas`, `Alertas` (Archivo → Nuevo → HTML; el nombre sin `.html`). Ojo: Apps Script no deja repetir nombres aunque sean de tipo distinto, por eso el script del buzón se llama `Buzon.gs`. En Configuración del proyecto activa "Mostrar appsscript.json" y pega `src/appsscript.json`.
3. Ejecuta `instalar` (acepta permisos). Si ya la habías corrido antes, vuelve a ejecutarla: renombra encabezados y agrega las 2 columnas nuevas sin tocar tus datos.
4. **Configuración del proyecto → Propiedades del script**: `carpeta_soportes`, `carpeta_sellados` (ids de dos carpetas de Drive) y `logo_id` (id del logo en Drive).
5. Ejecuta `instalarDisparadores` (o menú SINAV): revisa el buzón cada 10 min y manda el aviso diario a las 7am.
6. `cargarPrueba` mete 3 filas (normal, sin soporte, vencida).
7. **Implementar → Aplicación web**: ejecutar como *yo*, acceso *tu dominio*. Después de cambiar código: Implementar → Administrar implementaciones → editar → Nueva versión.

## Qué pegar en cada hoja
- **OBLIGACIONES** (columnas A a M, desde la fila 2, *pegado especial → solo valores*): municipio, cod_oficina, impuesto, periodo, vence, nit_municipio, correo_oficina, responsable, consecutivo, sticker, valor, **periodicidad** (BIMESTRAL, MENSUAL…) y **egreso** (25). Desde `estado` en adelante las llena el programa. `correo_oficina` puede ir vacío si la oficina está en DIRECTORIO.
  - Si ya tenías la hoja armada: clic derecho en la columna L → *Insertar 2 columnas a la izquierda*, y vuelve a correr `instalar` (renombra los encabezados). O borra la hoja OBLIGACIONES y corre `instalar`.
  - Si falta cualquiera de esos datos, la fila queda en ERROR con el motivo en vez de mandar un correo incompleto.
- **DIRECTORIO** (una fila por oficina): `cod_oficina` | `municipio` | `correos_para` (varios separados por coma) | `contacto` (ej. Claudia, Zipaquirá). Es a quien llega la declaración con el PDF.
- **RESPONSABLES** (una fila por persona): `responsable` (igual que en OBLIGACIONES) | `correo` | `cargo` | `celular`. El correo recibe el aviso de vencimientos; cargo y celular salen en la firma del correo.
- **EVENTOS**: no pegues nada, es el log.
- **CONFIG**: `modo` queda en PRUEBA hasta que tú lo cambies. Edita `nombre_remitente` (ahora: Departamento de impuestos - Banco Davivienda), `codigo_depto` (9413), `concepto` (40) y `direccion_firma`. En PRUEBA todo va a `correo_remitente`: ponle el correo donde quieras recibir las pruebas.
- **Propiedades del script** (no la hoja): `carpeta_soportes`, `carpeta_sellados`, `logo_id`.

## Cómo funciona el correo
- Es el mismo texto del correo de hoy. Asunto: `2335 -Declaración Retención de ICA- FONSECA - BIMESTRAL - $722.000 - Consecutivo Egreso 25 No- JJ26-08-184`. La firma sale de la fila del responsable en RESPONSABLES.
- Sale desde la cuenta que implementó la app, con el nombre «Departamento de impuestos - Banco Davivienda» (como hoy sale con tu nombre de Outlook). Las respuestas llegan a esa misma cuenta, que es la que lee el programa. Solo llenas `responder_a` en CONFIG si quieres otro buzón (debe entregarte los correos).
- **Para**: los correos de la fila o, si está vacío, los del DIRECTORIO. **CC visible**: lo que pongas en "Equipo y avisos → Copia visible" (ej. GRP Conceptos Especiales). **Copia oculta**: el equipo; nadie ve esas direcciones.
- Al llegar el sellado, el programa avisa con el PDF adjunto a quien hizo el envío, a ti (si `copia_a_mi` = SI) y al equipo en copia oculta.
- Si respondieron sin adjunto queda "Respondió sin sellado" y sigue esperando. Si rebota, queda en ERROR.
- Probar: en PRUEBA el correo llega a `correo_remitente`. Responde ese correo (sirve desde la misma cuenta) y pulsa **Revisar ahora** en RESPUESTAS.

## Avisos de vencimiento
Cada día a las 7am, un solo correo por responsable (a su correo de RESPONSABLES) con lo que vence en `dias_aviso` (10, 4, 2, 0) y lo vencido de los últimos 30 días sin sellado. Los **lunes** incluye además todo lo que vence esa semana. Asunto: «3 vencen en 4 días». Tú recibes copia oculta.

## Lo que asumí
- Respuesta esperada = fecha de envío + `dias_respuesta` días hábiles (lunes a viernes, sin festivos).
- El aviso diario incluye las que vencen en `dias_aviso` y las vencidas de los últimos 30 días sin sellado. Sin fila `correo_<responsable>`, va a `correo_remitente`.
- Gráficos con Chart.js desde cdn.jsdelivr.net (como pide la skill). Si la red del banco lo bloquea, KPIs y tabla igual funcionan.
- Al cuerpo le agregué una frase: «Responda sobre este mismo correo, no abra uno nuevo.» (regla 5); el resto es tu texto tal cual, con el sticker y el año tomados de los datos (el año sale de `periodo`).
- Logo: Apps Script no sirve `assets/logo-davivienda.png`; se lee de Drive (`logo_id`). Ya no va dentro de una caja blanca.
- No vi la interfaz de Oniderm (no tengo acceso a ella). El diseño está hecho con la marca Davivienda; si me pasas una captura la acerco más.
