# SINAV — Obligaciones de impuestos (Fase 1: pestaña ENVIAR)

## Qué hago ahora
1. Crea un Google Sheets vacío → **Extensiones → Apps Script**.
2. Crea un archivo por cada uno de `src/`: `Config.gs`, `Datos.gs`, `Instalar.gs`, `Enviar.gs`, `Web.gs`, `Index.html` (en Archivo → Nuevo → HTML), y pega el contenido. En **Configuración del proyecto** activa "Mostrar appsscript.json" y pega `src/appsscript.json`.
3. Ejecuta `instalar` (acepta los permisos). Se crean OBLIGACIONES, EVENTOS y CONFIG con sus encabezados.
4. Crea dos carpetas en Drive (soportes y sellados), copia el id de cada una (lo que va después de `/folders/` en la URL) y pégalo en **CONFIG** → `carpeta_soportes` y `carpeta_sellados`.
5. Ejecuta `cargarPrueba` (o menú SINAV → Cargar 3 filas de prueba): trae una normal, una sin soporte y una vencida.
6. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *yo*, acceso *cualquier persona de tu dominio*. Abre el link.
7. En la pestaña ENVIAR sube un PDF a la fila normal y envía. En modo PRUEBA el correo llega a `correo_remitente`.

## Qué pegar en cada hoja
- **OBLIGACIONES**: solo las 11 primeras columnas (municipio … valor), desde la fila 2. Pega con *Pegado especial → solo valores*. Las columnas `cod_oficina`, `periodo`, `nit_municipio` y `sticker` ya son texto (conservan ceros). Las columnas desde `estado` las llena el programa; si las tocas a mano, Sheets te avisa.
- **EVENTOS**: no pegues nada, es el log.
- **CONFIG**: solo `carpeta_soportes`, `carpeta_sellados` y, si quieres, `logo_id`. `modo` queda en PRUEBA hasta que tú lo cambies a PRODUCCION.

## Logo
Apps Script no sirve `assets/logo-davivienda.png` directamente. Sube el archivo oficial a Drive, copia su id a CONFIG → `logo_id`. Mientras tanto se ve un recuadro punteado "logo". Deja una copia en `assets/` del repo.

## Lo que asumí
- **Alias / correo oculto**: sin "Enviar como" autorizado, Gmail muestra tu dirección en "De". No se puede ocultar sin alias. Lo que sí hago: nombre visible "Departamento de Impuestos", `Reply-To` a `impuestosdavivienda@…` y la lista de personas va en **copia oculta (BCC)**, así nadie ve las direcciones de los demás. Se administra en el botón "Destinatarios y envío". Para ocultar también tu dirección hace falta que TI configure ese buzón como grupo o delegación y lo autorice como alias; luego pones `usar_alias = SI`.
- Las respuestas van a `responder_a`: debe ser un buzón que tú recibas, o `revisarRespuestas` (fase 2) no las verá.
- En PRUEBA no se usa la copia oculta. Cualquier valor de `modo` distinto de `PRODUCCION` se trata como PRUEBA.
- Agregué el evento `SOPORTE` (carga de PDF) al log, además de los cuatro que pediste.
- Filas con estado ERROR se pueden reenviar tras subir el PDF. Se identifican por número de fila: no ordenes OBLIGACIONES mientras se envía.
- Envío por lotes de 15 filas desde la interfaz, con corte a los 4,5 min y contador diario (tope 1.500, y el cupo real de Gmail si es menor).
