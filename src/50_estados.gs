/**
 * 50_estados.gs — estado automático de las obligaciones, leyendo lo que el equipo YA registró.
 * Nadie digita nada: la fecha de presentación y el valor salen de la hoja "Retención ICA".
 *
 * Cruce: cod_dane | periodicidad | fecha de vencimiento. La fecha identifica el periodo y el régimen
 * sin depender del encabezado del mes (que en esa hoja es el último mes del periodo, no el del
 * vencimiento). Verificado contra el Excel real: 95% de las fechas de la hoja existen en el calendario.
 */

// Solo estos estados se recalculan solos; PRESENTADA y los manuales no se pisan.
const ESTADOS_REVISABLES = ['PENDIENTE', 'SIN_EVIDENCIA'];

// --- funciones puras ---------------------------------------------------------------------

/** Estado que corresponde por la evidencia. Si el actual no es revisable, se respeta. */
function derivarEstado(estadoActual, fechaPresentacion, vencimiento, hoy) {
  if (ESTADOS_REVISABLES.indexOf(estadoActual) === -1) return estadoActual;
  if (fechaPresentacion instanceof Date) return 'PRESENTADA';
  // Se compara por día: una obligación que vence hoy todavía no está vencida.
  if (fechaIso(vencimiento) < fechaIso(hoy)) return 'SIN_EVIDENCIA';
  return 'PENDIENTE';
}

/**
 * Encuentra los bloques [vencimiento, REVISION, PRESENTACION, VALOR] por el encabezado.
 * El bloque de diciembre trae "2DA FECHA DICIEMBRE" y dos fechas para una sola presentación:
 * no se sabe a cuál pertenece, así que se omite.
 */
function ubicarBloques(enc) {
  const bloques = [];
  for (let p = 2; p < enc.length - 1; p++) {
    if (enc[p] === 'PRESENTACION' && enc[p + 1] === 'VALOR' && enc[p - 1] === 'REVISION' &&
        String(enc[p - 2]).indexOf('2DA FECHA') !== 0) {
      bloques.push({ vence: p - 2, presentacion: p, valor: p + 1 });
    }
  }
  return bloques;
}

// --- lectura del histórico ---------------------------------------------------------------

/** Una entrada por celda con fecha de vencimiento en la hoja "Retención ICA". */
function leerHistoricoReteica() {
  const hoja = SpreadsheetApp.openById(config('calendario_libro_id')).getSheetByName(config('hoja_reteica'));
  if (!hoja) throw new Error('No existe la hoja "' + config('hoja_reteica') + '" en el libro del calendario.');
  const datos = hoja.getDataRange().getValues();
  const enc = datos[0].map(normalizarTexto);
  const iDane = enc.indexOf('CODIGO DANE'), iPer = enc.indexOf('PERIODICIDAD');
  if (iDane < 0 || iPer < 0) throw new Error('La hoja de ReteICA no tiene CODIGO DANE o PERIODICIDAD.');
  const bloques = ubicarBloques(enc);

  const entradas = [];
  for (let i = 1; i < datos.length; i++) {
    const dane = normalizarDane(datos[i][iDane]);
    if (!/^\d+$/.test(dane)) continue;   // vacías y encabezados repetidos dentro de la hoja
    const periodicidad = normalizarPeriodicidad(datos[i][iPer]);
    bloques.forEach(function (b) {
      const vence = datos[i][b.vence];
      if (!(vence instanceof Date)) return;
      const pres = datos[i][b.presentacion], valor = datos[i][b.valor];
      entradas.push({
        dane: dane, periodicidad: periodicidad, vence: vence,
        presentacion: pres instanceof Date ? pres : '',
        valor: typeof valor === 'number' ? valor : '',
        valorNoNumerico: valor !== '' && valor !== null && typeof valor !== 'number'
      });
    });
  }
  return entradas;
}

// --- marcado -----------------------------------------------------------------------------

function marcarEstadosDesdeHistorico() {
  const hoy = new Date();
  const obligaciones = leerFilas(HOJAS.OBLIGACIONES);
  const indice = {}, ambiguas = {};
  obligaciones.forEach(function (o, i) {
    if (!(o.vencimiento instanceof Date)) return;
    const k = [o.cod_dane, o.periodicidad, fechaIso(o.vencimiento)].join('|');
    if (k in indice) ambiguas[k] = true; else indice[k] = i;
  });

  const r = { cruzadas: 0, sinCruce: 0, ambiguas: 0, fechas: 0, valores: 0, valorNoNumerico: 0, cambios: {} };
  leerHistoricoReteica().forEach(function (e) {
    const k = [e.dane, e.periodicidad, fechaIso(e.vence)].join('|');
    if (ambiguas[k]) { r.ambiguas++; return; }
    if (!(k in indice)) { r.sinCruce++; return; }
    r.cruzadas++;
    const o = obligaciones[indice[k]];
    // Los valores congelados no se sobrescriben: solo se llenan las celdas vacías.
    if (o.fecha_presentacion === '' && e.presentacion !== '') { o.fecha_presentacion = e.presentacion; r.fechas++; }
    if (o.valor === '' && e.valor !== '') { o.valor = e.valor; r.valores++; }
    if (e.valorNoNumerico) r.valorNoNumerico++;
  });

  const eventos = [];
  obligaciones.forEach(function (o) {
    const nuevo = derivarEstado(o.estado, o.fecha_presentacion, o.vencimiento, hoy);
    if (nuevo === o.estado) return;
    const clave = o.estado + ' → ' + nuevo;
    r.cambios[clave] = (r.cambios[clave] || 0) + 1;
    eventos.push({
      timestamp: hoy, id_obligacion: o.id, estado_anterior: o.estado, estado_nuevo: nuevo,
      origen: 'SISTEMA', actor: 'historico_reteica',
      detalle: nuevo === 'PRESENTADA'
        ? 'presentación ' + fechaIso(o.fecha_presentacion) + (o.valor === '' ? ', sin valor registrado' : ', valor ' + o.valor)
        : 'vencida el ' + fechaIso(o.vencimiento) + ' sin presentación registrada'
    });
    o.estado = nuevo;
    o.estado_desde = hoy;
  });

  ['estado', 'estado_desde', 'valor', 'fecha_presentacion'].forEach(function (col) {
    escribirColumna(HOJAS.OBLIGACIONES, col, obligaciones.map(function (o) { return o[col]; }));
  });
  agregarFilas(HOJAS.EVENTOS, eventos);

  Logger.log('marcarEstadosDesdeHistorico(): ' + r.cruzadas + ' celdas cruzadas, ' + r.sinCruce + ' sin cruce, ' +
    r.ambiguas + ' ambiguas; fechas nuevas ' + r.fechas + ', valores nuevos ' + r.valores +
    ', valores no numéricos ' + r.valorNoNumerico);
  Object.keys(r.cambios).forEach(function (k) { Logger.log('  ' + k + ': ' + r.cambios[k]); });
}
