/** SINAV · acceso a las hojas. Todo en bloque, nunca celda por celda. */

var _libro = null;
var _cacheConfig = null;

function libro() {
  if (!_libro) _libro = SpreadsheetApp.getActive();
  return _libro;
}

function hoja(nombre) {
  var h = libro().getSheetByName(nombre);
  if (!h) throw new Error('Falta la hoja ' + nombre + '. Corre instalar().');
  return h;
}

/** Indices de columna por nombre, 0-based, segun el encabezado real de la hoja. */
function indices(nombre) {
  var h = hoja(nombre);
  var cab = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var ix = {};
  for (var i = 0; i < cab.length; i++) {
    var k = String(cab[i]).trim();
    if (k) ix[k] = i;
  }
  return ix;
}

/** Todas las filas de datos como matriz. Una sola llamada a la hoja. */
function filas(nombre) {
  var h = hoja(nombre);
  var n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, h.getLastColumn()).getValues();
}

/** Las filas como objetos {columna: valor}. */
function registros(nombre) {
  var ix = indices(nombre);
  var claves = Object.keys(ix);
  return filas(nombre).map(function (f, i) {
    var o = { _fila: i + 2 };
    for (var j = 0; j < claves.length; j++) o[claves[j]] = f[ix[claves[j]]];
    return o;
  });
}

/** Busca la fila de una obligacion por id. Devuelve el numero de fila o 0. */
function buscarFila(id) {
  var h = hoja(HOJA.OBLIGACIONES);
  var n = h.getLastRow() - 1;
  if (n < 1) return 0;
  var ix = indices(HOJA.OBLIGACIONES);
  var col = h.getRange(2, ix.id + 1, n, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/** Escribe varios campos de una fila en una sola llamada por tramo contiguo. */
function escribirCampos(nombre, fila, campos) {
  var h = hoja(nombre);
  var ix = indices(nombre);
  var cols = Object.keys(campos).map(function (k) {
    if (!(k in ix)) throw new Error('No existe la columna ' + k + ' en ' + nombre);
    return ix[k];
  }).sort(function (a, b) { return a - b; });
  if (!cols.length) return;

  var min = cols[0], max = cols[cols.length - 1];
  var rango = h.getRange(fila, min + 1, 1, max - min + 1);
  var val = rango.getValues()[0];
  Object.keys(campos).forEach(function (k) { val[ix[k] - min] = campos[k]; });
  rango.setValues([val]);
}

/** Agrega filas al final en una sola llamada. */
function agregarFilas(nombre, matriz) {
  if (!matriz.length) return;
  var h = hoja(nombre);
  h.getRange(h.getLastRow() + 1, 1, matriz.length, matriz[0].length).setValues(matriz);
}

/** Corre fn con el libro bloqueado. Todo lo que escriba pasa por aqui. */
function conCerrojo(fn) {
  var cerrojo = LockService.getScriptLock();
  if (!cerrojo.tryLock(20000)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    cerrojo.releaseLock();
  }
}

/** Lee un parametro de CONFIG. Se cachea por ejecucion. */
function config(clave) {
  if (!_cacheConfig) {
    _cacheConfig = {};
    filas(HOJA.CONFIG).forEach(function (f) {
      var k = String(f[0]).trim();
      if (k) _cacheConfig[k] = f[1];
    });
  }
  var v = _cacheConfig[clave];
  return v === undefined || v === null ? '' : String(v).trim();
}

function configTodo() {
  config('modo');
  var copia = {};
  Object.keys(_cacheConfig).forEach(function (k) { copia[k] = _cacheConfig[k]; });
  return copia;
}

/** Escribe un parametro de CONFIG. Solo ADMIN. */
function guardarConfig(clave, valor) {
  exige('configurar');
  return conCerrojo(function () {
    var h = hoja(HOJA.CONFIG);
    var f = filas(HOJA.CONFIG);
    for (var i = 0; i < f.length; i++) {
      if (String(f[i][0]).trim() === clave) {
        h.getRange(i + 2, 2).setValue(valor);
        _cacheConfig = null;
        return true;
      }
    }
    agregarFilas(HOJA.CONFIG, [[clave, valor]]);
    _cacheConfig = null;
    return true;
  });
}

function hoy() {
  return new Date();
}

function fechaTexto(d) {
  if (!d) return '';
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), TZ, 'yyyy-MM-dd');
}

function fechaHoraTexto(d) {
  if (!d) return '';
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), TZ, 'yyyy-MM-dd HH:mm');
}

/** Dias calendario entre hoy y una fecha, en zona Bogota. Negativo = ya vencio. */
function diasHasta(fecha) {
  if (!fecha) return null;
  var d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return null;
  var a = Utilities.formatDate(d, TZ, 'yyyy/MM/dd').split('/');
  var b = Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd').split('/');
  var ms = Date.UTC(+a[0], +a[1] - 1, +a[2]) - Date.UTC(+b[0], +b[1] - 1, +b[2]);
  return Math.round(ms / 86400000);
}
