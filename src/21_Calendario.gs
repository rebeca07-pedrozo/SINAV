/**
 * SINAV · el calendario tributario: leerlo y entenderlo.
 *
 * Esto lo usan las DOS cargas, asi que vive en el nucleo y no en Carga.gs:
 *
 *   Carga.gs      una vez por vigencia: CALENDARIO -> PROGRAMACION
 *   Mensuales.gs  el 1 de cada mes: CALENDARIO + PROGRAMACION -> OBLIGACIONES
 *
 * Carga.gs se puede borrar del editor cuando ya no haga falta; la carga
 * mensual sigue funcionando porque lo que necesita esta aqui.
 */

var HOJA_CALENDARIO = 'CALENDARIO';
var HOJA_PROGRAMACION = 'PROGRAMACION';

var COLS_PROGRAMACION = [
  'cod_dane', 'cod_oficina', 'departamento', 'municipio', 'entidad',
  'impuesto', 'regimen', 'periodicidad', 'nit_municipio', 'correo_oficina',
  'responsable', 'requiere_envio', 'nota'
];

/**
 * Los impuestos que SINAV gestiona, y como se llaman en el calendario.
 * Lo que no este aqui se ignora a proposito: predial, alumbrado publico y
 * actualizacion de RIT quedaron fuera del alcance.
 */
var IMPUESTO_CALENDARIO = {
  'INDUSTRIA Y COMERCIO': 'ICA',
  'RETENCION ICA': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'MEDIOS MAGNETICOS': 'EXOGENA'
};

/**
 * Las filas de "descuento pronto pago" no son obligaciones distintas: son la
 * misma con una fecha anterior si se paga pronto. Solo se toma la fila base.
 * Comprobado que ninguna obligacion existe SOLO como fila de descuento, asi
 * que no se pierde ninguna.
 */
var DESCUENTOS_QUE_ENTRAN = ['', 'FECHA LIMITE'];

/** Lee la hoja CALENDARIO y devuelve sus filas como objetos, ya filtradas. */
function leerCalendario() {
  var h = libro().getSheetByName(HOJA_CALENDARIO);
  if (!h) {
    throw new Error('Falta la hoja ' + HOJA_CALENDARIO + '. Pega ahí la hoja ' +
      'CALENDARIO_TRIBUTARIO del Excel, con sus encabezados en la fila 1.');
  }
  var n = h.getLastRow() - 1;
  if (n < 1) throw new Error('La hoja ' + HOJA_CALENDARIO + ' está vacía.');

  var todo = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var cab = todo[0];
  var ix = {};
  for (var i = 0; i < cab.length; i++) {
    var k = limpiar(cab[i]);
    if (k && !(k in ix)) ix[k] = i;
  }
  ['CODIGO DANE', 'MUNICIPIO', 'IMPUESTO', 'PERIODICIDAD'].forEach(function (c) {
    if (!(c in ix)) {
      throw new Error('A la hoja ' + HOJA_CALENDARIO + ' le falta la columna «' + c + '».');
    }
  });

  return { cabecera: cab, indices: ix, filas: todo.slice(1) };
}

/**
 * Las columnas de periodo del calendario, con el periodo que les toca.
 *
 * El encabezado es el PERIODO y la celda es el VENCIMIENTO. Las ultimas
 * columnas pertenecen al ano siguiente (es el ano vencido): se detecta porque
 * el mes deja de crecer.
 */
function columnasDePeriodo(cabecera, vigencia) {
  var salida = [];
  var anio = Number(vigencia);
  var mesAnterior = 0;

  for (var i = 0; i < cabecera.length; i++) {
    var v = cabecera[i];
    var mes = 0;
    if (v instanceof Date) mes = v.getMonth() + 1;
    else {
      var m = String(v).match(/^(\d{1,2})[-\/]?([A-Za-z]{3})/);
      if (m) {
        var meses = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7,
                      AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
                      JAN: 1, APR: 4, AUG: 8, DEC: 12 };
        mes = meses[m[2].toUpperCase()] || 0;
      }
    }
    if (!mes) continue;
    if (mes <= mesAnterior) anio++;          // el mes dejo de crecer: ano siguiente
    mesAnterior = mes;
    salida.push({ col: i, anio: anio, mes: mes });
  }
  return salida;
}

/** El periodo que le corresponde a un mes segun la periodicidad. */
function periodoDe(anio, mes, periodicidad) {
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}
