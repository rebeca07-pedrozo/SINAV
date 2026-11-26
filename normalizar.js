/* ===========================================================================
   SINAV · normalizar los datos de las hojas.

   Los mismos datos vienen escritos de cinco formas: «Industria y Comercio» y
   «ICA», el DANE como numero 5002 y como texto "05002", «Mensual» y
   «MENSUAL». Cada forma distinta es un cruce que falla en silencio.

   Esto los deja iguales UNA vez, en la hoja, y de paso pone en formato texto
   las columnas de codigos para que Sheets no vuelva a convertirlas en fechas
   ni les coma el cero de adelante.
   =========================================================================== */

/** Sin tildes, sin dobles espacios, en mayusculas. Para comparar. */
function limpiar(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[ÁáÀà]/g, 'A')
    .replace(/[ÉéÈè]/g, 'E')
    .replace(/[ÍíÌì]/g, 'I')
    .replace(/[ÓóÒò]/g, 'O')
    .replace(/[ÚúÙùÜü]/g, 'U')
    .replace(/[Ññ]/g, 'N')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

/** El numero de serie que la hoja guarda detras de una fecha. */
function diasDesdeElOrigen(d) {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
                     Date.UTC(1899, 11, 30)) / 86400000);
}

/**
 * Un codigo, siempre texto y con sus ceros.
 *
 * Acepta el numero 5002, el texto "5002", "5002.0" y hasta una fecha, que es
 * como vuelve el codigo cuando la columna quedo con formato de fecha.
 */
function normCodigo(v, ancho) {
  if (v === null || v === undefined || v === '') return '';
  var s;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    var serie = diasDesdeElOrigen(v);
    if (serie <= 0) return '';
    s = String(serie);
  } else {
    s = String(v).trim();
    if (/e\+/i.test(s)) s = Number(s).toFixed(0);
    s = s.replace(/\.0+$/, '').replace(/[^\dA-Za-z-]/g, '');
  }
  if (!s) return '';
  if (ancho && /^\d+$/.test(s)) while (s.length < ancho) s = '0' + s;
  return s;
}

/** Los cuatro impuestos, se escriban como se escriban. */
var IMPUESTOS = {
  'ICA': 'ICA',
  'INDUSTRIA Y COMERCIO': 'ICA',
  'IMPUESTO DE INDUSTRIA Y COMERCIO': 'ICA',
  'ICA ANUAL': 'ICA',
  'RETEICA': 'RETEICA',
  'RETENCION ICA': 'RETEICA',
  'RETENCION DE ICA': 'RETEICA',
  'RETENCION DE INDUSTRIA Y COMERCIO': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'AUTORRETENCION': 'AUTORRETEICA',
  'AUTORRETENCION ICA': 'AUTORRETEICA',
  'AUTORRETENCION DE ICA': 'AUTORRETEICA',
  'EXOGENA': 'EXOGENA',
  'MEDIOS MAGNETICOS': 'EXOGENA',
  'TODAS': 'TODAS'
};

function normImpuesto(v) {
  return IMPUESTOS[limpiar(v)] || '';
}

/** Las cinco periodicidades. */
var PERIODICIDADES = {
  'MENSUAL': 'MENSUAL', 'MES': 'MENSUAL',
  'BIMESTRAL': 'BIMESTRAL', 'BIMENSUAL': 'BIMESTRAL', 'BIMESTRE': 'BIMESTRAL',
  'TRIMESTRAL': 'TRIMESTRAL', 'TRIMESTRE': 'TRIMESTRAL',
  'CUATRIMESTRAL': 'CUATRIMESTRAL', 'CUATRIMESTRE': 'CUATRIMESTRAL',
  'ANUAL': 'ANUAL', 'ANO': 'ANUAL', 'ANIO': 'ANUAL'
};

function normPeriodicidad(v) {
  return PERIODICIDADES[limpiar(v).replace(/\s+/g, '')] ||
         PERIODICIDADES[limpiar(v)] || '';
}

/** Las tres formas de pago. */
function normFormaPago(v) {
  var s = limpiar(v);
  if (s.indexOf('PSE') >= 0) return 'PSE';
  if (s.indexOf('TRANSFER') >= 0) return 'TRANSFERENCIA';
  if (s.indexOf('OFICINA') >= 0 || s.indexOf('VENTANILLA') >= 0) return 'OFICINA';
  return '';
}

/** Una lista de correos: en minusculas, con coma, sin repetir, sin basura. */
function normCorreos(v) {
  var vistos = {}, salida = [];
  String(v === null || v === undefined ? '' : v).split(/[,;\s]+/).forEach(function (c) {
    var s = c.trim().toLowerCase();
    if (!s || vistos[s]) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return;
    vistos[s] = true;
    salida.push(s);
  });
  return salida.join(',');
}

/** Un solo correo. */
function normCorreo(v) {
  return normCorreos(v).split(',')[0] || '';
}

/** Un numero de adhesivo: solo cifras, y al menos seis. */
function normAdhesivo(v) {
  var s = String(v === null || v === undefined ? '' : v)
    .replace(/\.0+$/, '').replace(/[^\d]/g, '');
  return s.length >= 6 ? s : '';
}

/** Texto de verdad: sin espacios de sobra, pero respetando mayusculas. */
function normTexto(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
}

/* ===========================================================================
   LIMPIAR LAS HOJAS

   Lee cada hoja de una sola vez, normaliza todo y la vuelve a escribir de una
   sola vez. Una escritura por hoja, no una por celda: con 38.000 filas la
   diferencia es entre segundos y media hora.
   =========================================================================== */

/** Las columnas de cada hoja y como hay que limpiarlas. */
function reglasDeLimpieza() {
  return {
    CALENDARIO: {
      nit: { como: 'texto' },
      municipio: { como: 'texto' },
      cod_dane: { como: 'codigo', ancho: 5, formatoTexto: true },
      impuesto: { como: 'impuesto' },
      periodicidad: { como: 'periodicidad' },
      responsable: { como: 'correo' }
    },
    CODIGOSYCORREOS: {
      cod_dane: { como: 'codigo', ancho: 5, formatoTexto: true },
      cod_oficina: { como: 'codigo', ancho: 4, formatoTexto: true },
      municipio: { como: 'texto' },
      obligacion: { como: 'impuesto' },
      correos: { como: 'correos' },
      forma_pago: { como: 'forma_pago' }
    },
    ADHESIVOS: {
      obligacion: { como: 'impuesto' },
      PERIODICIDAD: { como: 'periodicidad' },
      MUNICIPIO: { como: 'texto' },
      cod_oficina: { como: 'codigo', ancho: 4, formatoTexto: true },
      cod_dane: { como: 'codigo', ancho: 4, formatoTexto: true }
    },
    USUARIOS: {
      correo: { como: 'correo' },
      nombre: { como: 'texto' },
      rol: { como: 'mayusculas' },
      activo: { como: 'mayusculas' },
      area: { como: 'mayusculas' },
      nivel: { como: 'mayusculas' },
      backup: { como: 'correo' }
    }
  };
}

/** Aplica una regla a un valor. Devuelve el valor nuevo. */
function aplicarRegla(valor, regla) {
  switch (regla.como) {
    case 'codigo':      return normCodigo(valor, regla.ancho);
    case 'impuesto':    return normImpuesto(valor) || normTexto(valor);
    case 'periodicidad':return normPeriodicidad(valor) || normTexto(valor);
    case 'forma_pago':  return normFormaPago(valor) || normTexto(valor);
    case 'correos':     return normCorreos(valor);
    case 'correo':      return normCorreo(valor);
    case 'mayusculas':  return limpiar(valor);
    default:            return normTexto(valor);
  }
}

/**
 * Deja las hojas con los datos escritos de una sola forma.
 *
 * No borra ni mueve filas: solo reescribe celdas. Lo que no sabe traducir
 * —un impuesto raro, una periodicidad que no existe— lo deja como esta y lo
 * reporta al final, para que nadie pierda un dato en silencio.
 */
function normalizarHojas() {
  var libro = SpreadsheetApp.getActive();
  var reglas = reglasDeLimpieza();
  var l = ['Normalización de las hojas', ''];

  Object.keys(reglas).forEach(function (nombre) {
    var h = libro.getSheetByName(nombre);
    if (!h) { l.push(nombre + ': no existe. Se salta.'); return; }

    var filas = h.getLastRow();
    var cols = h.getLastColumn();
    if (filas < 2 || !cols) { l.push(nombre + ': vacía.'); return; }

    var datos = h.getRange(1, 1, filas, cols).getValues();
    var cab = datos[0].map(function (c) { return String(c).trim(); });

    var deColumna = {};
    Object.keys(reglas[nombre]).forEach(function (col) {
      var i = cab.indexOf(col);
      if (i >= 0) deColumna[i] = reglas[nombre][col];
    });
    if (!Object.keys(deColumna).length) {
      l.push(nombre + ': ninguna columna conocida. Encabezados: ' + cab.join(' | '));
      return;
    }

    var cambios = 0, dudosos = {};
    for (var f = 1; f < datos.length; f++) {
      Object.keys(deColumna).forEach(function (i) {
        var regla = deColumna[i];
        var antes = datos[f][i];
        if (antes === '' || antes === null || antes === undefined) return;
        var despues = aplicarRegla(antes, regla);
        // se escribe SIEMPRE, aunque se vea igual: 54518 como numero y
        // "54518" como texto se leen distinto, y es lo segundo lo que hace
        // falta para que no se pierda el cero de adelante
        if (despues !== String(antes)) cambios++;
        datos[f][i] = despues;
        if ((regla.como === 'impuesto' || regla.como === 'periodicidad') &&
            !normImpuestoOPeriodicidad(regla.como, antes)) {
          dudosos[cab[i] + ': ' + String(antes)] = true;
        }
      });
    }

    h.getRange(1, 1, filas, cols).setValues(datos);

    Object.keys(deColumna).forEach(function (i) {
      if (!deColumna[i].formatoTexto) return;
      h.getRange(2, Number(i) + 1, h.getMaxRows() - 1, 1).setNumberFormat('@');
    });

    l.push(nombre + ': ' + cambios + ' celdas normalizadas, ' + (filas - 1) + ' filas.');
    var raros = Object.keys(dudosos);
    if (raros.length) {
      l.push('   No supe traducir esto (se dejó como estaba):');
      raros.sort().slice(0, 12).forEach(function (x) { l.push('      ' + x); });
      if (raros.length > 12) l.push('      … y ' + (raros.length - 12) + ' más');
    }
  });

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

function normImpuestoOPeriodicidad(como, v) {
  return como === 'impuesto' ? normImpuesto(v) : normPeriodicidad(v);
}