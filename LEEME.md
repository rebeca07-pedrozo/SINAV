# SINAV — Obligaciones de impuestos

Tres pestañas, una sola hoja: **ENVIAR** (pendientes), **RESPUESTAS** (lo enviado y su sellado) y **ALERTAS** (tablero).

## Puesta en marcha
1. Google Sheets vacío → **Extensiones → Apps Script**.
2. Crea un archivo por cada uno de `src/`: `Config.gs`, `Datos.gs`, `Instalar.gs`, `Enviar.gs`, `Respuestas.gs`, `Avisos.gs`, `Web.gs` y los HTML `Index`, `Respuestas`, `Alertas` (Archivo → Nuevo → HTML; el nombre sin `.html`). En Configuración del proyecto activa "Mostrar appsscript.json" y pega `src/appsscript.json`.
3. Ejecuta `instalar` (acepta permisos). Si ya la habías corrido antes, vuelve a ejecutarla: renombra encabezados y agrega las 2 columnas nuevas sin tocar tus datos.
4. **Configuración del proyecto → Propiedades del script**: `carpeta_soportes`, `carpeta_sellados` (ids de dos carpetas de Drive) y `logo_id` (id del logo en Drive).
5. Ejecuta `instalarDisparadores` (o menú SINAV): revisa el buzón cada 10 min y manda el aviso diario a las 7am.
6. `cargarPrueba` mete 3 filas (normal, sin soporte, vencida).
7. **Implementar → Aplicación web**: ejecutar como *yo*, acceso *tu dominio*. Después de cambiar código: Implementar → Administrar implementaciones → editar → Nueva versión.

## Qué pegar en cada hoja
- **OBLIGACIONES**: solo las 11 primeras columnas (municipio … valor), desde la fila 2, con *pegado especial → solo valores*. Desde `estado` en adelante las llena el programa. `soporte_link` y `sellado_link` guardan el enlace completo de Drive (si hay ids viejos, siguen funcionando).
- **EVENTOS**: no pegues nada, es el log (ENVIADO, ERROR, RESPONDIO, AVISO, SOPORTE).
- **CONFIG**: `modo` queda en PRUEBA hasta que tú lo cambies a PRODUCCION. Para los avisos diarios agrega una fila por responsable: `correo_Jesús Jaimes` | `jesus@davivienda.com` (el nombre igual al de la columna responsable). `dias_respuesta` (3) y `avisar_equipo` (SI) también se editan desde "Equipo y avisos".

## Cómo funciona el correo (y lo que no se puede)
- La oficina ve **Departamento de Impuestos** y, al responder, escribe a `impuestosdavivienda@…` (Reply-To). La lista del equipo va en **copia oculta**: nadie ve las direcciones de los demás.
- El correo sale desde **tu cuenta** (la de quien implementa la app). Gmail no permite ocultar esa dirección en el encabezado sin un alias "Enviar como" autorizado. En la mayoría de clientes solo se ve el nombre.
- Se guarda en `enviado_por` quién hizo clic. Cuando llega el sellado, el programa le **reenvía el aviso con el PDF adjunto a esa persona** y, si está activado, al equipo en copia oculta. Así "le llega a quien envió" sin que la oficina conozca su correo.
- Importante: `impuestosdavivienda@…` debe entregar en tu buzón (grupo, alias o delegación), si no `revisarRespuestas` no verá lo que respondan. En modo PRUEBA lo compruebas: el correo llega ahí; responde ese correo (desde la misma cuenta sirve en PRUEBA) y pulsa **Revisar ahora** en RESPUESTAS.
- Si respondieron sin adjunto, queda como "Respondió sin sellado" y sigue esperando. Si el correo rebota, queda en ERROR para corregir y reenviar.

## Lo que asumí
- Respuesta esperada = fecha de envío + `dias_respuesta` días hábiles (lunes a viernes, sin festivos).
- El aviso diario incluye las que vencen en `dias_aviso` y las vencidas de los últimos 30 días sin sellado. Sin fila `correo_<responsable>`, va a `correo_remitente`.
- Gráficos con Chart.js desde cdn.jsdelivr.net (como pide la skill). Si la red del banco lo bloquea, KPIs y tabla igual funcionan.
- Logo: Apps Script no sirve `assets/logo-davivienda.png`; se lee de Drive (`logo_id`). Ya no va dentro de una caja blanca.
- No vi la interfaz de Oniderm (no tengo acceso a ella). El diseño está hecho con la marca Davivienda; si me pasas una captura la acerco más.
