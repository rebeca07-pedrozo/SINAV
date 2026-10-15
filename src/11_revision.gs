/**
 * 11_revision.gs — hoja auxiliar para copiar y pegar en un correo.
 * Lista los vencimientos de Retención ICA que quedaron sin periodo, con su fecha exacta.
 * Es solo una vista de consulta: se recrea cada vez y no alimenta el maestro.
 */

const HOJA_REVISION = 'REVISION_PERIODOS';
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

function tablaPeriodosPendientes() {
  const pendientes = leerFilas(HOJAS.CALENDARIO).filter(function (f) {
    return f.tipo_obligacion === 'RETEICA' && f.periodo === '' && f.vencimiento instanceof Date;
  });
  pendientes.sort(function (a, b) {
    return a.periodicidad.localeCompare(b.periodicidad) ||
      String(a.municipio).localeCompare(String(b.municipio)) || a.vencimiento - b.vencimiento;
  });

  const filas = pendientes.map(function (f) {
    return [
      f.municipio,
      f.periodicidad.charAt(0) + f.periodicidad.slice(1).toLowerCase(),
      Utilities.formatDate(f.vencimiento, 'America/Bogota', 'dd/MM/yyyy'),
      MESES_ES[f.vencimiento.getMonth()] + ' ' + f.vencimiento.getFullYear(),
      '' // Periodo que corresponde (lo llena quien responde)
    ];
  });

  const libro = abrirLibro();
  const hoja = libro.getSheetByName(HOJA_REVISION) || libro.insertSheet(HOJA_REVISION);
  hoja.clear();
  const enc = ['Municipio', 'Periodicidad', 'Fecha de vencimiento', 'Mes de vencimiento', 'Periodo que corresponde'];
  hoja.getRange(1, 1, 1, enc.length).setValues([enc])
    .setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#FFFFFF');
  if (filas.length) {
    hoja.getRange(2, 1, filas.length, enc.length).setValues(filas);
    hoja.getRange(1, 1, filas.length + 1, enc.length)
      .setBorder(true, true, true, true, true, true, '#999999', SpreadsheetApp.BorderStyle.SOLID);
  }
  hoja.autoResizeColumns(1, enc.length);
  Logger.log('tablaPeriodosPendientes(): ' + filas.length + ' filas en la hoja ' + HOJA_REVISION + '.');
}
