/**
 * 10_calendario.gs — importar y normalizar el calendario tributario externo.
 * El calendario fuente viene "ancho" (una columna por mes). Acá se aplana a una fila por
 * obligación y vencimiento, con periodicidad y periodo ya normalizados.
 * CALENDARIO es un espejo de solo lectura: cada importación lo reemplaza completo.
 */

// Columnas fijas de la fuente (hoja CALENDARIO_TRIBUTARIO). Se valida el encabezado de A..K.
const COLUMNAS_FUENTE = {
  nit: 'A', cod_dane: 'B', departamento: 'C', municipio: 'D', impuesto: 'E',
  descuento_pronto_pago: 'F', estado_fuente: 'G', comentario: 'H', periodicidad: 'I',
  resolucion: 'J', empresa: 'K'
};
const ENCABEZADOS_FUENTE = ['NIT', 'CODIGO DANE', 'DEPARTAMENTO', 'MUNICIPIO', 'IMPUESTO',
  'DESCUENTO PRONTO PAGO', 'ESTADO', 'COMENTARIO', 'PERIODICIDAD',
  'RESOLUCION CALENDARIO TRIBUTARIO', 'EMPRESA'];

// Mes DEL VENCIMIENTO de cada columna, por POSICIÓN (nunca se lee del encabezado: la
// columna T trae texto "1-sep" y X/Y muestran un año equivocado).
// Confirmado con Pamplona (mensual) y Maní (bimestral). REVÍSALO si el calendario cambia.
const COLUMNAS_MES = [
  { col: 'L', anio: 2026, mes: 1 }, { col: 'M', anio: 2026, mes: 2 },
  { col: 'N', anio: 2026, mes: 3 }, { col: 'O', anio: 2026, mes: 4 },
  { col: 'P', anio: 2026, mes: 5 }, { col: 'Q', anio: 2026, mes: 6 },
  { col: 'R', anio: 2026, mes: 7 }, { col: 'S', anio: 2026, mes: 8 },
  { col: 'T', anio: 2026, mes: 9 }, { col: 'U', anio: 2026, mes: 10 },
  { col: 'V', anio: 2026, mes: 11 }, { col: 'W', anio: 2026, mes: 12 },
  { col: 'X', anio: 2027, mes: 1 }, { col: 'Y', anio: 2027, mes: 2 }
];

// Impuesto de la fuente (normalizado) → tipo_obligacion del maestro.
// TODO(USUARIO): confirma "MEDIOS MAGNETICOS" → EXOGENA. Es el único que deduje por descarte
// (los 7 impuestos del brief contra los 7 valores del enum). Revisa también que los nombres
// coincidan con los de tu hoja; los que no estén aquí caen en EXCEPCIONES.
const MAPA_IMPUESTO = {
  'RETENCION ICA': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'INDUSTRIA Y COMERCIO': 'ICA',
  'MEDIOS MAGNETICOS': 'EXOGENA',
  'PREDIAL': 'PREDIAL',
  'ALUMBRADO PUBLICO': 'ALUMBRADO',
  'ACTUALIZACION RIT': 'RIT'
};

function letraAIndice(letra) { return letra.charCodeAt(0) - 65; }

/** MENSUAL, Mensual, "MENSUAL ", "ANUAL - Con la última declaración..." → enum. '' si no se reconoce. */
function normalizarPeriodicidad(texto) {
  const t = normalizarTexto(texto);
  const enums = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
  for (let i = 0; i < enums.length; i++) if (t.indexOf(enums[i]) === 0) return enums[i];
  return '';
}

/**
 * Periodo a partir del vencimiento (el encabezado de la fuente es el mes del vencimiento).
 * MENSUAL: mes anterior. BIMESTRAL: mar=B1 may=B2 jul=B3 sep=B4 nov=B5, ene=B6 del año anterior.
 * Devuelve '' si no hay regla confirmada.
 */
function derivarPeriodo(periodicidad, anio, mes) {
  if (periodicidad === 'MENSUAL') {
    const a = mes === 1 ? anio - 1 : anio;
    const m = mes === 1 ? 12 : mes - 1;
    return a + '-' + (m < 10 ? '0' + m : m);
  }
  if (periodicidad === 'BIMESTRAL') {
    if (mes === 1) return (anio - 1) + '-B6';
    const b = { 3: 1, 5: 2, 7: 3, 9: 4, 11: 5 }[mes];
    return b ? anio + '-B' + b : '';
  }
  // TODO(USUARIO): faltan las reglas de TRIMESTRAL, CUATRIMESTRAL, SEMESTRAL y ANUAL
  // (cómo se deriva el periodo y el formato "2026-T3" / "2026-A"). No las invento.
  return '';
}

/** Date, o texto yyyy-mm-dd → Date. Cualquier otra cosa → null (va a EXCEPCIONES). */
function aFecha(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** Aplana una fila de la fuente en 0..14 filas de CALENDARIO. Función pura (se prueba sola). */
function aplanarFila(fila, noFila) {
  const filas = [];
  const excepciones = [];
  const base = {};
  Object.keys(COLUMNAS_FUENTE).forEach(function (k) {
    const v = fila[letraAIndice(COLUMNAS_FUENTE[k])];
    base[k] = (k === 'nit' || k === 'cod_dane') ? String(v).trim() : v;
  });

  base.tipo_obligacion = MAPA_IMPUESTO[normalizarTexto(base.impuesto)] || '';
  base.periodicidad_original = base.periodicidad;
  base.periodicidad = normalizarPeriodicidad(base.periodicidad);

  COLUMNAS_MES.forEach(function (c) {
    const celda = fila[letraAIndice(c.col)];
    if (celda === '' || celda === null) return;   // vacía = no aplica ese mes

    const donde = 'fila ' + noFila + ', columna ' + c.col + ' (' + base.municipio + ' / ' + base.impuesto + ')';
    const f = aFecha(celda);
    if (!f) { excepciones.push(['FECHA_ILEGIBLE', donde + ': "' + celda + '"']); return; }
    if (f.getFullYear() !== c.anio || f.getMonth() + 1 !== c.mes) {
      excepciones.push(['MES_NO_CUADRA', donde + ': la fecha cae en ' + f.getFullYear() + '-' + (f.getMonth() + 1) +
        ' pero la columna es ' + c.anio + '-' + c.mes]);
      return;
    }
    if (!base.tipo_obligacion) excepciones.push(['IMPUESTO_NO_MAPEADO', donde]);
    if (!base.periodicidad) excepciones.push(['PERIODICIDAD_DESCONOCIDA', donde + ': "' + base.periodicidad_original + '"']);

    const periodo = base.periodicidad ? derivarPeriodo(base.periodicidad, c.anio, c.mes) : '';
    if (base.periodicidad && !periodo) excepciones.push(['PERIODO_NO_DERIVADO', donde + ': ' + base.periodicidad]);

    const o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    o.columna_fuente = c.col;
    o.vencimiento = f;
    o.periodo = periodo;
    filas.push(o);
  });
  return { filas: filas, excepciones: excepciones };
}

/** Importa el calendario externo. Reemplaza CALENDARIO completo (es un espejo). */
function importarCalendario() {
  const origen = SpreadsheetApp.openById(config('calendario_libro_id'))
    .getSheetByName(config('calendario_hoja'));
  if (!origen) throw new Error('No existe la hoja "' + config('calendario_hoja') + '" en el libro del calendario.');

  const datos = origen.getDataRange().getValues();
  validarEncabezadosFuente(datos[0]);

  const salida = [];
  const excepciones = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (normalizarTexto(fila[letraAIndice(COLUMNAS_FUENTE.municipio)]) === '' &&
        normalizarTexto(fila[letraAIndice(COLUMNAS_FUENTE.impuesto)]) === '') continue;
    const r = aplanarFila(fila, i + 1);
    r.filas.forEach(function (o) { salida.push(o); });
    r.excepciones.forEach(function (e) { excepciones.push(e); });
  }

  conLock(function () {
    const hoja = hojaDe(HOJAS.CALENDARIO);
    const enc = ENCABEZADOS.CALENDARIO;
    hoja.clearContents();
    hoja.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    if (salida.length) {
      const valores = salida.map(function (o) { return enc.map(function (c) { return o[c]; }); });
      hoja.getRange(2, 1, valores.length, enc.length).setValues(valores);
    }
  });

  registrarExcepcionesCalendario(excepciones);
  Logger.log('importarCalendario(): ' + salida.length + ' vencimientos importados, ' +
    excepciones.length + ' excepciones.');
}

function validarEncabezadosFuente(encabezados) {
  ENCABEZADOS_FUENTE.forEach(function (esperado, i) {
    if (normalizarTexto(encabezados[i]) !== esperado) {
      throw new Error('La fuente cambió: en la columna ' + String.fromCharCode(65 + i) + ' se esperaba "' +
        esperado + '" y hay "' + encabezados[i] + '". Importación cancelada.');
    }
  });
}

/** Escribe en EXCEPCIONES sin repetir las que ya están sin resolver. */
function registrarExcepcionesCalendario(excepciones) {
  const yaHay = {};
  leerFilas(HOJAS.EXCEPCIONES).forEach(function (e) {
    if (e.resuelta === '' || e.resuelta === false) yaHay[e.motivo + '|' + e.detalle] = true;
  });
  const nuevas = excepciones
    .filter(function (e) { return !yaHay[e[0] + '|' + e[1]]; })
    .map(function (e) { return { timestamp: new Date(), id_obligacion: '', motivo: e[0], detalle: e[1], resuelta: false }; });
  agregarFilas(HOJAS.EXCEPCIONES, nuevas);
}
