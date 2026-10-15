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
// "MEDIOS MAGNETICOS" → EXOGENA confirmado por la usuaria. Los nombres que no estén aquí
// caen en EXCEPCIONES.
const MAPA_IMPUESTO = {
  'RETENCION ICA': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'INDUSTRIA Y COMERCIO': 'ICA',
  'MEDIOS MAGNETICOS': 'EXOGENA',
  'IMPUESTO PREDIAL': 'PREDIAL',
  'IMPUESTO DE ALUMBRADO PUBLICO': 'ALUMBRADO',
  'ACTUALIZACION DE RIT': 'RIT'
};

function letraAIndice(letra) { return letra.charCodeAt(0) - 65; }

/** MENSUAL, Mensual, "MENSUAL ", "ANUAL - Con la última declaración..." → enum. '' si no se reconoce. */
function normalizarPeriodicidad(texto) {
  const t = normalizarTexto(texto);
  const enums = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
  for (let i = 0; i < enums.length; i++) if (t.indexOf(enums[i]) === 0) return enums[i];
  return '';
}

/** Bimestre según el mes de vencimiento: mar=B1 may=B2 jul=B3 sep=B4 nov=B5, ene=B6 del año anterior. '' si no aplica. */
function bimestreDeMes(anio, mes) {
  if (mes === 1) return (anio - 1) + '-B6';
  const b = { 3: 1, 5: 2, 7: 3, 9: 4, 11: 5 }[mes];
  return b ? anio + '-B' + b : '';
}

/**
 * Periodo a partir de la fecha de vencimiento. Devuelve { periodo, porConfirmar }.
 * periodo = '' si no hay regla confirmada (la fila va a EXCEPCIONES).
 *  - MENSUAL: mes del vencimiento menos 1.
 *  - BIMESTRAL: se mapea el mes de la fecha; si es un mes par (sin regla) se resta 7 días y
 *    se mapea de nuevo. Restar siempre rompía las fechas legítimas de los primeros días de
 *    un mes impar (Jericó 04/03 caía en febrero). Verificado contra el Excel real.
 *  - TRIMESTRAL: ene=T4 del año anterior, abr=T1, jul=T2, oct=T3.
 *  - CUATRIMESTRAL: ene=C3 del año anterior, may=C1, sep=C2.
 */
function derivarPeriodo(periodicidad, fecha) {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth() + 1;
  const nada = { periodo: '', porConfirmar: false };

  if (periodicidad === 'MENSUAL') {
    const a = mes === 1 ? anio - 1 : anio;
    const m = mes === 1 ? 12 : mes - 1;
    return { periodo: a + '-' + (m < 10 ? '0' + m : m), porConfirmar: false };
  }
  if (periodicidad === 'BIMESTRAL') {
    // 1) Mes impar: se mapea la fecha tal cual (aunque caiga en los primeros días del mes).
    const directo = bimestreDeMes(anio, mes);
    if (directo) return { periodo: directo, porConfirmar: false };
    // 2) Mes par: es una fecha de fin de mes corrida al mes siguiente; se resta 7 días.
    const aj = new Date(anio, mes - 1, fecha.getDate() - 7);
    const ajustado = bimestreDeMes(aj.getFullYear(), aj.getMonth() + 1);
    if (ajustado) return { periodo: ajustado, porConfirmar: false };
    // TODO(USUARIO): febrero → B6 es PROPUESTA tuya (Yopal, Villavicencio): validarla con el equipo.
    if (aj.getMonth() + 1 === 2) return { periodo: (aj.getFullYear() - 1) + '-B6', porConfirmar: true };
    return nada;
  }
  if (periodicidad === 'TRIMESTRAL') {
    if (mes === 1) return { periodo: (anio - 1) + '-T4', porConfirmar: false };
    const t = { 4: 1, 7: 2, 10: 3 }[mes];
    return t ? { periodo: anio + '-T' + t, porConfirmar: false } : nada;
  }
  if (periodicidad === 'CUATRIMESTRAL') {
    if (mes === 1) return { periodo: (anio - 1) + '-C3', porConfirmar: false };
    const c = { 5: 1, 9: 2 }[mes];
    return c ? { periodo: anio + '-C' + c, porConfirmar: false } : nada;
  }
  // TODO(USUARIO): faltan las reglas de SEMESTRAL y ANUAL (y el formato "2026-A"). No las invento.
  return nada;
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

    const d = base.periodicidad ? derivarPeriodo(base.periodicidad, f) : { periodo: '', porConfirmar: false };
    if (base.periodicidad && !d.periodo) excepciones.push(['PERIODO_NO_DERIVADO', donde + ': ' + base.periodicidad]);

    const o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    o.columna_fuente = c.col;
    o.vencimiento = f;
    o.periodo = d.periodo;
    o.periodo_por_confirmar = d.porConfirmar ? 'SI' : '';
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
      marcarTexto(hoja, HOJAS.CALENDARIO, 2, salida.length);
      const valores = salida.map(function (o) { return enc.map(function (c) { return o[c]; }); });
      hoja.getRange(2, 1, valores.length, enc.length).setValues(valores);
    }
  });

  registrarExcepcionesCalendario(excepciones);
  Logger.log('importarCalendario(): ' + salida.length + ' vencimientos importados, ' +
    excepciones.length + ' excepciones.');
}

/** Lista los valores distintos de la columna Impuesto de la fuente, con cuántas filas tiene cada uno. */
function listarImpuestos() {
  const datos = SpreadsheetApp.openById(config('calendario_libro_id'))
    .getSheetByName(config('calendario_hoja')).getDataRange().getValues();
  const cuenta = {};
  for (let i = 1; i < datos.length; i++) {
    const crudo = String(datos[i][letraAIndice(COLUMNAS_FUENTE.impuesto)]);
    if (crudo.trim() === '') continue;
    cuenta[crudo] = (cuenta[crudo] || 0) + 1;
  }
  Object.keys(cuenta).forEach(function (k) {
    Logger.log('"' + k + '": ' + cuenta[k] + ' filas → ' + (MAPA_IMPUESTO[normalizarTexto(k)] || 'SIN MAPEAR'));
  });
}

/** Resumen de EXCEPCIONES sin resolver: cuántas por motivo y un ejemplo de cada una. */
function resumirExcepciones() {
  const por = {};
  let deReteica = 0;
  leerFilas(HOJAS.EXCEPCIONES).forEach(function (e) {
    if (e.resuelta === true) return;
    if (normalizarTexto(e.detalle).indexOf('RETENCION ICA') !== -1) {
      deReteica++;
      Logger.log('[ReteICA] ' + e.motivo + ' · ' + e.detalle);
    }
    por[e.motivo] = por[e.motivo] || { n: 0, ejemplos: [] };
    por[e.motivo].n++;
    if (por[e.motivo].ejemplos.length < 3) por[e.motivo].ejemplos.push(e.detalle);
  });
  Object.keys(por).forEach(function (m) {
    Logger.log(m + ': ' + por[m].n + '\n   ' + por[m].ejemplos.join('\n   '));
  });
  Logger.log('Excepciones abiertas que afectan a Retención ICA: ' + deReteica);
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
  const vigentes = {};
  excepciones.forEach(function (e) { vigentes[e[0] + '|' + e[1]] = true; });
  const motivosCalendario = ['FECHA_ILEGIBLE', 'MES_NO_CUADRA', 'IMPUESTO_NO_MAPEADO',
    'PERIODICIDAD_DESCONOCIDA', 'PERIODO_NO_DERIVADO'];

  // Las excepciones del calendario que ya no se repiten se marcan resueltas (no se borran).
  const existentes = leerFilas(HOJAS.EXCEPCIONES);
  const yaHay = {};
  const resuelta = existentes.map(function (e) {
    const llave = e.motivo + '|' + e.detalle;
    const abierta = e.resuelta === '' || e.resuelta === false;
    if (abierta && motivosCalendario.indexOf(e.motivo) !== -1 && !vigentes[llave]) return true;
    if (abierta) yaHay[llave] = true;
    return e.resuelta;
  });
  escribirColumna(HOJAS.EXCEPCIONES, 'resuelta', resuelta);

  const nuevas = excepciones
    .filter(function (e) { return !yaHay[e[0] + '|' + e[1]]; })
    .map(function (e) { return { timestamp: new Date(), id_obligacion: '', motivo: e[0], detalle: e[1], resuelta: false }; });
  agregarFilas(HOJAS.EXCEPCIONES, nuevas);
}
