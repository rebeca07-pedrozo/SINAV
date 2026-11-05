/**
 * SINAV · normalizacion. Funciones puras: no tocan hojas ni servicios.
 * Se normaliza en la ENTRADA, una vez, no en cada consumo.
 */

/** Mayusculas, sin acentos, sin espacios de sobra, espacios internos colapsados. */
function limpiar(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * MENSUAL | BIMESTRAL | TRIMESTRAL | CUATRIMESTRAL | ANUAL.
 * Devuelve '' si no reconoce el valor: el llamador decide si es un ERROR.
 */
function normPeriodicidad(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (!s) return '';
  return PERIODICIDAD_SINONIMOS[s] || '';
}

/**
 * Codigos que son texto, no numeros: conserva los ceros a la izquierda.
 * ancho rellena con ceros cuando el origen ya los perdio (851 -> "0851").
 */
function normCodigo(v, ancho) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (s.indexOf('E+') > 0 || s.indexOf('e+') > 0) s = Number(s).toFixed(0);
  s = s.replace(/\.0+$/, '');
  if (ancho && /^[0-9]+$/.test(s)) while (s.length < ancho) s = '0' + s;
  return s;
}

/** Periodo: 2026-09 | 2026-B4 | 2026-T3 | 2026-C2 | 2026. '' si no encaja. */
function normPeriodo(v) {
  var s = limpiar(v).replace(/[\s_\/.]+/g, '-');
  var m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) {
    var mes = +m[2];
    if (mes < 1 || mes > 12) return '';
    return m[1] + '-' + (mes < 10 ? '0' + mes : String(mes));
  }
  if ((m = s.match(/^(\d{4})-([BTC])(\d{1,2})$/))) {
    var topes = { B: 6, T: 4, C: 3 };
    var n = +m[3];
    if (n < 1 || n > topes[m[2]]) return '';
    return m[1] + '-' + m[2] + n;
  }
  if ((m = s.match(/^(\d{4})$/))) return m[1];
  return '';
}

/** "GENERAL" cuando viene vacio. */
function normRegimen(v) {
  var s = limpiar(v);
  return s || 'GENERAL';
}

function normImpuesto(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (s === 'RETEICA' || s === 'RETENCIONICA') return 'RETEICA';
  if (s === 'AUTORRETEICA' || s === 'AUTORRETENCIONICA') return 'AUTORRETEICA';
  if (s === 'ICA') return 'ICA';
  if (s === 'EXOGENA' || s === 'INFORMACIONEXOGENA') return 'EXOGENA';
  return '';
}

/** SI | NO | REVISAR. '' si no reconoce. */
function normSiNo(v, conRevisar) {
  var s = limpiar(v);
  if (s === 'SI' || s === 'S' || s === 'TRUE' || s === 'X' || s === '1') return 'SI';
  if (s === 'NO' || s === 'N' || s === 'FALSE' || s === '0') return 'NO';
  if (conRevisar && (s === 'REVISAR' || s === 'POR REVISAR')) return 'REVISAR';
  return '';
}

/** Lista de destinatarios: minusculas, sin repetidos, separados por coma. */
function normCorreos(v) {
  if (!v) return '';
  var vistos = {};
  var salida = [];
  String(v).split(/[,;\s]+/).forEach(function (c) {
    var s = c.trim().toLowerCase();
    if (!s || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) || vistos[s]) return;
    vistos[s] = true;
    salida.push(s);
  });
  return salida.join(',');
}

function normCorreo(v) {
  var s = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : '';
}

/** Fecha real a partir de lo que venga: Date, "2026-09-18", "18/09/2026". */
function normFecha(v) {
  if (!v) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v;
  var s = String(v).trim();
  var m;
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) {
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  if ((m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/))) {
    return new Date(+m[3], +m[2] - 1, +m[1]);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : d;
}

/**
 * Un separador es decimal solo si aparece una vez y no deja tres digitos detras.
 * "4.820.350" son miles; "1.50" son decimales; "1.500" son miles (es-CO).
 */
function esDecimal(s, sep) {
  var partes = s.split(sep);
  if (partes.length !== 2) return false;
  return partes[1].length !== 3;
}

/** Numero a partir de "1.234.567,89", "1,234,567.89", "$ 4.820.350" o 1234567.89. */
function normValor(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return isNaN(v) ? '' : v;

  var s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s || !/\d/.test(s)) return '';

  var coma = s.indexOf(','), punto = s.indexOf('.');
  var decimal = '';
  if (coma >= 0 && punto >= 0) decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  else if (coma >= 0) decimal = esDecimal(s, ',') ? ',' : '';
  else if (punto >= 0) decimal = esDecimal(s, '.') ? '.' : '';

  if (decimal === ',') s = s.replace(/\./g, '').replace(',', '.');
  else if (decimal === '.') s = s.replace(/,/g, '');
  else s = s.replace(/[.,]/g, '');

  var n = Number(s);
  return isNaN(n) ? '' : n;
}

/** id = cod_dane|impuesto|regimen|periodo. El DANE municipal son cinco digitos. */
function armarId(codDane, impuesto, regimen, periodo) {
  return [normCodigo(codDane, 5), normImpuesto(impuesto), normRegimen(regimen),
          normPeriodo(periodo)].join('|');
}

/** OFICINA | VIRTUAL. Por defecto OFICINA, que es el caso comun. */
function normTipoPresentacion(v) {
  return limpiar(v) === 'VIRTUAL' ? 'VIRTUAL' : 'OFICINA';
}

/**
 * QUIEN paga: OFICINA | PAGADURIA. Por defecto OFICINA.
 * Antes esta columna se llamaba medio_pago y mezclaba quien paga con como se
 * paga: un "PSE" guardado ahi es una forma de pago, no un pagador, asi que
 * cae a OFICINA y el PSE se recupera en normFormaPago.
 */
function normPagaQuien(v) {
  var s = limpiar(v);
  return PAGA_QUIEN.indexOf(s) >= 0 ? s : 'OFICINA';
}

/**
 * COMO se paga: TRANSFERENCIA | PSE | EFECTIVO | OTRO.
 * Vacio es un dato que falta, no un valor por defecto: lo llena el profesional
 * a mano cuando sabe como se pago. '' si no reconoce.
 */
function normFormaPago(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (s === 'PSE') return 'PSE';
  if (s === 'TRANSFERENCIA' || s === 'TRANSF') return 'TRANSFERENCIA';
  if (s === 'EFECTIVO' || s === 'CAJA') return 'EFECTIVO';
  if (s === 'OTRO' || s === 'OTROS') return 'OTRO';
  return '';
}

/**
 * Normaliza una obligacion completa en la entrada.
 * Devuelve {fila: {...}, problemas: [...]}. No escribe nada.
 */
function normObligacion(cruda) {
  var p = [];
  var o = {};

  o.cod_dane = normCodigo(cruda.cod_dane, 5);
  if (!o.cod_dane) p.push('cod_dane vacio');

  o.cod_oficina = normCodigo(cruda.cod_oficina, 4);
  o.municipio = String(cruda.municipio || '').trim();
  if (!o.municipio) p.push('municipio vacio');

  o.impuesto = normImpuesto(cruda.impuesto);
  if (!o.impuesto) p.push('impuesto no reconocido: ' + cruda.impuesto);

  o.regimen = normRegimen(cruda.regimen);

  o.periodo = normPeriodo(cruda.periodo);
  if (!o.periodo) p.push('periodo no reconocido: ' + cruda.periodo);

  o.periodicidad = normPeriodicidad(cruda.periodicidad);
  if (!o.periodicidad) p.push('periodicidad no reconocida: ' + cruda.periodicidad);

  o.vencimiento = normFecha(cruda.vencimiento);
  if (!o.vencimiento) p.push('vencimiento no es una fecha: ' + cruda.vencimiento);

  // OJO: el NIT es del municipio, no del banco.
  o.nit_municipio = normCodigo(cruda.nit_municipio);

  o.correo_oficina = normCorreos(cruda.correo_oficina);
  o.responsable = normCorreo(cruda.responsable);

  o.tipo_presentacion = normTipoPresentacion(cruda.tipo_presentacion);

  // medio_pago es el nombre viejo de la columna: se acepta como respaldo para
  // que un origen que todavia lo use no pierda el dato.
  var pagoCrudo = cruda.paga_quien !== undefined && cruda.paga_quien !== ''
    ? cruda.paga_quien : cruda.medio_pago;
  o.paga_quien = normPagaQuien(pagoCrudo);
  o.forma_pago = normFormaPago(
    cruda.forma_pago !== undefined && cruda.forma_pago !== ''
      ? cruda.forma_pago : cruda.medio_pago);

  o.requiere_envio = normSiNo(cruda.requiere_envio, true) || 'REVISAR';
  o.exogena = o.impuesto === 'RETEICA' ? (normSiNo(cruda.exogena) || 'NO') : 'NO';
  o.incluye_retencion = o.impuesto === 'AUTORRETEICA'
    ? (normSiNo(cruda.incluye_retencion) || 'NO') : 'NO';

  o.valor = normValor(cruda.valor);
  o.nota = String(cruda.nota || '').trim();
  o.id = armarId(o.cod_dane, o.impuesto, o.regimen, o.periodo);

  return { fila: o, problemas: p };
}
