/**
 * Instalar.gs — crea el Sheets con sus tres pestañas y encabezados.
 * Se puede correr varias veces: no borra ni pisa nada que ya exista.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SINAV')
      .addItem('Instalar / reparar hojas', 'instalar')
      .addItem('Cargar 3 filas de prueba', 'cargarPrueba')
      .addItem('Activar revisión de respuestas y avisos', 'instalarDisparadores')
      .addToUi();
  } catch (e) { /* script sin libro asociado */ }
}

function instalar() {
  const props = PropertiesService.getScriptProperties();
  let libroActual = null;
  const id = props.getProperty('libro_id');
  if (id) {
    libroActual = SpreadsheetApp.openById(id);
  } else {
    libroActual = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('SINAV - Obligaciones de impuestos');
    props.setProperty('libro_id', libroActual.getId());
  }

  const h1 = obtenerOCrear(libroActual, 'OBLIGACIONES');
  const h2 = obtenerOCrear(libroActual, 'EVENTOS');
  const h3 = obtenerOCrear(libroActual, 'CONFIG');
  const h4 = obtenerOCrear(libroActual, 'DIRECTORIO');
  const h5 = obtenerOCrear(libroActual, 'RESPONSABLES');

  // OBLIGACIONES
  encabezados(h1, COLUMNAS);
  const filasFormato = 3000;
  ['cod_oficina', 'periodo', 'nit_municipio', 'sticker', 'periodicidad', 'egreso'].forEach(function (c) {
    h1.getRange(2, COLUMNAS.indexOf(c) + 1, filasFormato, 1).setNumberFormat('@'); // texto: conserva ceros
  });
  h1.getRange(2, COLUMNAS.indexOf('vence') + 1, filasFormato, 1).setNumberFormat('dd/MM/yyyy');
  h1.getRange(2, COLUMNAS.indexOf('valor') + 1, filasFormato, 1).setNumberFormat('#,##0');
  ['fecha_envio', 'fecha_respuesta'].forEach(function (c) {
    h1.getRange(2, COLUMNAS.indexOf(c) + 1, filasFormato, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  });
  h1.getRange(2, COLUMNAS.indexOf('estado') + 1, filasFormato, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build());
  // Las columnas del programa avisan si alguien las edita a mano (sin duplicar protecciones al re-ejecutar).
  h1.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (p.getDescription() === 'Las llena el programa') p.remove();
  });
  const prot = h1.getRange(1, PRIMERA_DEL_PROGRAMA, h1.getMaxRows(), COLUMNAS.length - PRIMERA_DEL_PROGRAMA + 1)
    .protect().setDescription('Las llena el programa');
  prot.setWarningOnly(true);
  // Color distinto en el encabezado de las columnas que llena el programa.
  h1.getRange(1, PRIMERA_DEL_PROGRAMA, 1, COLUMNAS.length - PRIMERA_DEL_PROGRAMA + 1).setBackground('#7A756B');

  // EVENTOS
  encabezados(h2, COLUMNAS_EVENTOS);
  h2.getRange(2, 1, 5000, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  // CONFIG (solo agrega lo que falte)
  if (h3.getLastRow() < 1) h3.getRange(1, 1, 1, 2).setValues([['parametro', 'valor']]);
  encabezados(h3, ['parametro', 'valor']);
  const existentes = h3.getLastRow() >= 2 ? h3.getRange(2, 1, h3.getLastRow() - 1, 1).getValues().map(function (f) { return String(f[0]).trim(); }) : [];
  const faltan = CONFIG_INICIAL.filter(function (p) { return existentes.indexOf(p[0]) === -1; });
  if (faltan.length) h3.getRange(h3.getLastRow() + 1, 1, faltan.length, 2).setValues(faltan);
  h3.getRange(2, 2, 40, 1).setNumberFormat('@');
  h3.setColumnWidth(1, 190); h3.setColumnWidth(2, 420);

  // DIRECTORIO: a quién va la declaración de cada oficina (varios correos separados por coma).
  encabezados(h4, COLUMNAS_DIRECTORIO);
  h4.getRange(2, 1, 3000, 1).setNumberFormat('@');
  h4.getRange(2, 3, 3000, 1).setWrap(true);
  h4.setColumnWidth(3, 420);
  // RESPONSABLES: correo para los avisos y datos de la firma.
  encabezados(h5, COLUMNAS_RESPONSABLES);
  h5.getRange(2, 4, 500, 1).setNumberFormat('@');
  h5.setColumnWidth(2, 260); h5.setColumnWidth(3, 260);

  // Quita la hoja vacía por defecto si quedó sola.
  const sobrante = libroActual.getSheetByName('Hoja 1') || libroActual.getSheetByName('Sheet1');
  if (sobrante && libroActual.getSheets().length > 5 && sobrante.getLastRow() === 0) libroActual.deleteSheet(sobrante);

  Logger.log('Listo. Libro: ' + libroActual.getUrl());
  return libroActual.getUrl();
}

function obtenerOCrear(libroActual, nombre) {
  return libroActual.getSheetByName(nombre) || libroActual.insertSheet(nombre);
}

function encabezados(h, nombres) {
  const r = h.getRange(1, 1, 1, nombres.length);
  r.setValues([nombres]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#E30518');
  h.setFrozenRows(1);
  h.autoResizeColumns(1, nombres.length);
}

/** Tres filas para probar: una normal, una sin soporte (para ver el bloqueo) y una vencida. */
function cargarPrueba() {
  conLock(function () {
    const h = hoja('OBLIGACIONES');
    const hoy = new Date();
    const suma = function (dias) { return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias); };
    const base = function (extra) {
      const f = { estado: 'PENDIENTE' };
      Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
      return COLUMNAS.map(function (c) { return f[c] === undefined ? '' : f[c]; });
    };
    const filas = [
      // Con el correo escrito en la fila.
      base({ municipio: 'FONSECA', cod_oficina: '2335', impuesto: 'Retención de ICA', periodo: '2025-06', vence: suma(20),
        nit_municipio: '825000442', correo_oficina: 'director2335@davivienda.com, subdirector2335@davivienda.com', responsable: 'Jesús Jaimes',
        consecutivo: 'JJ26-08-184', sticker: '55331449', valor: 722000, periodicidad: 'BIMESTRAL', egreso: '25' }),
      // Sin correo en la fila: lo toma del DIRECTORIO. Sin soporte a propósito.
      base({ municipio: 'SALAMINA', cod_oficina: '0623', impuesto: 'Retención de ICA', periodo: '2025-06', vence: suma(4),
        nit_municipio: '890801130', responsable: 'Jesús Jaimes',
        consecutivo: 'JJ26-08-185', sticker: '55331450', valor: 1250000, periodicidad: 'BIMESTRAL', egreso: '25' }),
      // Ya vencida.
      base({ municipio: 'PACORA', cod_oficina: '0417', impuesto: 'Retención de ICA', periodo: '2025-05', vence: suma(-5),
        nit_municipio: '890801133', correo_oficina: 'director0417@davivienda.com', responsable: 'Jesús Jaimes',
        consecutivo: 'JJ26-08-170', sticker: '55331301', valor: 760000, periodicidad: 'BIMESTRAL', egreso: '25' })
    ];
    h.getRange(h.getLastRow() + 1, 1, filas.length, COLUMNAS.length).setValues(filas);

    // Ejemplos en las listas, solo si están vacías.
    const dir = hoja('DIRECTORIO');
    if (dir.getLastRow() < 2) dir.getRange(2, 1, 1, 4).setValues([['0623', 'SALAMINA', 'director0623@davivienda.com, claudia.ejemplo@davivienda.com', 'Claudia (ejemplo)']]);
    const res = hoja('RESPONSABLES');
    if (res.getLastRow() < 2) res.getRange(2, 1, 1, 4).setValues([['Jesús Jaimes', 'jesus.jaimes@davivienda.com', 'Profesional I Dpto. Impuestos', '313 461 2504']]);

    registrarEventos(filas.map(function (f) { return [f[8], 'AVISO', 'Fila de prueba cargada']; }));
  });
}
