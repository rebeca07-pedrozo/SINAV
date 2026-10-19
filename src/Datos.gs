/**
 * Datos.gs — lectura/escritura en bloque de OBLIGACIONES y EVENTOS.
 * Nada aquí toma el lock: lo toma quien llama.
 */

function parsearFecha(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function textoFecha(d, formato) {
  return d ? Utilities.formatDate(d, 'America/Bogota', formato || 'dd/MM/yyyy') : '';
}

/** Días desde hoy hasta la fecha (negativo = ya venció). Compara solo día calendario. */
function diasPara(fecha) {
  if (!fecha) return null;
  const hoy = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd').split('-');
  const a = Date.UTC(Number(hoy[0]), Number(hoy[1]) - 1, Number(hoy[2]));
  const b = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((b - a) / 86400000);
}

/** Todas las obligaciones como objetos, con el número de fila de la hoja en "fila". */
function leerObligaciones() {
  const h = hoja('OBLIGACIONES');
  const ultima = h.getLastRow();
  if (ultima < 2) return [];
  const valores = h.getRange(2, 1, ultima - 1, COLUMNAS.length).getValues();
  const lista = [];
  valores.forEach(function (fila, i) {
    const o = { fila: i + 2 };
    COLUMNAS.forEach(function (c, j) { o[c] = fila[j]; });
    if (o.municipio === '' && o.consecutivo === '') return; // fila vacía
    ['cod_oficina', 'nit_municipio', 'sticker', 'periodo'].forEach(function (c) {
      o[c] = o[c] instanceof Date ? Utilities.formatDate(o[c], 'America/Bogota', 'yyyy-MM') : String(o[c]);
    });
    o.vence = parsearFecha(o.vence);
    o.estado = String(o.estado || 'PENDIENTE').toUpperCase();
    lista.push(o);
  });
  return lista;
}

/** Escribe solo las columnas del programa (estado → respondio_por) de una fila. */
function guardarBloquePrograma(o) {
  const bloque = COLUMNAS.slice(PRIMERA_DEL_PROGRAMA - 1).map(function (c) { return o[c] === undefined ? '' : o[c]; });
  hoja('OBLIGACIONES').getRange(o.fila, PRIMERA_DEL_PROGRAMA, 1, bloque.length).setValues([bloque]);
}

function etiqueta(o) {
  return o.municipio + ' ' + o.impuesto + ' ' + o.periodo + ' (' + o.consecutivo + ')';
}

/** Agrega varias líneas al log de una sola vez. eventos = [[obligacion, que_paso, detalle], ...] */
function registrarEventos(eventos) {
  if (!eventos.length) return;
  const h = hoja('EVENTOS');
  const ahora = new Date();
  const filas = eventos.map(function (e) { return [ahora, e[0], e[1], e[2]]; });
  h.getRange(h.getLastRow() + 1, 1, filas.length, 4).setValues(filas);
}

// ---------- Enlaces de Drive ----------
// En la hoja se guarda el enlace completo. Si hay un id suelto (filas viejas) también se entiende.

function idDeLink(v) {
  const t = String(v || '').trim();
  if (!t) return '';
  const m = t.match(/\/d\/([A-Za-z0-9_-]+)/) || t.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : t;
}

function linkDeDrive(v) {
  const id = idDeLink(v);
  return id ? 'https://drive.google.com/file/d/' + id + '/view' : '';
}

function limpiarNombre(t) {
  return String(t).replace(/[\\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}

function nombreSoporte(o) {
  return limpiarNombre(o.cod_oficina + '-' + o.municipio + '-' + o.periodo) + '.pdf';
}

/** Suma días hábiles (lunes a viernes). No considera festivos. */
function diasHabilesMas(fecha, n) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  let faltan = Number(n) || 0;
  while (faltan > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) faltan--;
  }
  return d;
}

function quienSoy() {
  let c = '';
  try { c = Session.getActiveUser().getEmail(); } catch (e) { /* sin permiso */ }
  return c || Session.getEffectiveUser().getEmail();
}
