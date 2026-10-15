/**
 * 20_generador.gs — crea las filas de OBLIGACIONES desde CALENDARIO.
 * Los valores se copian y quedan congelados: una fila que ya existe NUNCA se sobrescribe.
 * id = cod_dane | tipo_obligacion | regimen | periodo
 *   - regimen sale del Comentario del calendario ("GENERAL" si viene vacío). La oficina NO va
 *     en la llave: es consecuencia (quién tramita), no identidad, y puede cambiar.
 *   - Nada de secuencias: no son estables si la fuente se reordena.
 */

const REGIMEN_GENERAL = 'GENERAL';

// --- funciones puras (se prueban solas) -------------------------------------------------

/** 05001 y 5001 son el mismo municipio; el DANE llega como número en una hoja y como texto en otra. */
function normalizarDane(v) {
  const t = String(v === null || v === undefined ? '' : v).trim();
  return /^\d+$/.test(t) ? String(Number(t)) : t;
}

function normalizarRegimen(comentario) {
  const t = normalizarTexto(comentario).replace(/\|/g, ' ');
  return t === '' ? REGIMEN_GENERAL : t;
}

function construirId(dane, tipo, regimen, periodo) {
  return [dane, tipo, regimen, periodo].join('|');
}

/** Código del centro de costo con ceros a la izquierda a 4 dígitos ("0489"). Vacío si no hay. */
function codOficina(cc) {
  const t = String(cc === null || cc === undefined ? '' : cc).trim().replace(/\.0+$/, '');
  if (t === '') return '';
  return t.length < 4 ? ('0000' + t).slice(-4) : t;
}

/** Correos que alguien pegó en la columna Presentacion. '' si no hay. */
function extraerCorreos(texto) {
  const m = String(texto === null || texto === undefined ? '' : texto)
    .match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g);
  return m ? m.join(', ') : '';
}

/** Columna Pago → enum. '' si la celda está vacía; OTRO si trae algo que no reconocemos. */
function formaPagoDe(texto) {
  const t = normalizarTexto(texto);
  if (t === '') return '';
  const mapa = {
    'OFICINA': 'OFICINA', 'OFICINA - RECIBO': 'OFICINA_RECIBO', 'MIXTA': 'MIXTA',
    'PSE': 'PSE', 'TRANSFERENCIA': 'TRANSFERENCIA'
  };
  return mapa[t] || 'OTRO';
}

/** Siembra de requiere_envio_oficina. El equipo puede editarlo después en la hoja. */
function requiereEnvioDe(formaPago) {
  if (formaPago === 'OFICINA' || formaPago === 'OFICINA_RECIBO') return 'SI';
  if (formaPago === 'PSE' || formaPago === 'TRANSFERENCIA') return 'NO';
  return 'REVISAR';
}

function soloAlfanumerico(texto) { return normalizarTexto(texto).replace(/[^A-Z0-9]/g, ''); }

/**
 * Busca la fila de la hoja de oficinas para un municipio y periodicidad.
 * Si hay varias, desempata por nombre de municipio; si siguen siendo distintas, AMBIGUO.
 */
function buscarOficina(grupos, dane, periodicidad, municipio) {
  let c = grupos[dane + '|' + periodicidad] || [];
  if (c.length > 1) {
    const mismos = c.filter(function (x) { return soloAlfanumerico(x.municipio) === soloAlfanumerico(municipio); });
    if (mismos.length) c = mismos;
  }
  if (!c.length) return { estado: 'SIN_MATCH' };
  const base = c[0];
  const iguales = c.every(function (x) {
    return codOficina(x.cc) === codOficina(base.cc) && normalizarTexto(x.pago) === normalizarTexto(base.pago) &&
      normalizarTexto(x.responsable) === normalizarTexto(base.responsable);
  });
  return iguales ? { estado: 'OK', fila: base } : { estado: 'AMBIGUO' };
}

// --- lectura de las fuentes --------------------------------------------------------------

/** Hoja de oficinas del libro del calendario, agrupada por "dane|periodicidad". */
function cargarFuenteOficinas() {
  const libro = SpreadsheetApp.openById(config('calendario_libro_id'));
  const hoja = libro.getSheetByName(config('hoja_reteica'));
  if (!hoja) throw new Error('No existe la hoja "' + config('hoja_reteica') + '" en el libro del calendario.');
  const datos = hoja.getDataRange().getValues();
  const enc = datos[0].map(normalizarTexto);
  const col = function (nombre) {
    const i = enc.indexOf(nombre);
    if (i < 0) throw new Error('La hoja "' + config('hoja_reteica') + '" no tiene la columna ' + nombre + '.');
    return i;
  };
  const iResp = col('RESPONSABLE'), iCC = col('CC'), iDane = col('CODIGO DANE'), iMuni = col('MUNICIPIO'),
    iPres = col('PRESENTACION'), iPago = col('PAGO'), iPer = col('PERIODICIDAD');

  const grupos = {};
  for (let i = 1; i < datos.length; i++) {
    const f = datos[i];
    const dane = normalizarDane(f[iDane]);
    if (!/^\d+$/.test(dane)) continue;   // vacías y encabezados repetidos dentro de la hoja
    const llave = dane + '|' + normalizarPeriodicidad(f[iPer]);
    (grupos[llave] = grupos[llave] || []).push({
      responsable: f[iResp], cc: f[iCC], municipio: f[iMuni], presentacion: f[iPres], pago: f[iPago]
    });
  }
  return grupos;
}

/** inicial → nombre completo, desde la hoja Responsable. Vacío si no está configurada. */
function cargarResponsables() {
  const nombreHoja = configOpcional('hoja_responsable');
  const mapa = {};
  if (!nombreHoja) return mapa;
  const hoja = SpreadsheetApp.openById(config('calendario_libro_id')).getSheetByName(nombreHoja);
  if (!hoja) return mapa;
  const datos = hoja.getDataRange().getValues();
  const enc = datos[0].map(normalizarTexto);
  const iNombre = enc.indexOf('RESPONSABLE'), iAbrev = enc.indexOf('ABREVIACION');
  if (iNombre < 0 || iAbrev < 0) return mapa;
  for (let i = 1; i < datos.length; i++) {
    const abrev = normalizarTexto(datos[i][iAbrev]);
    if (abrev && datos[i][iNombre] && !mapa[abrev]) mapa[abrev] = String(datos[i][iNombre]).trim();
  }
  return mapa;
}

// --- generador ---------------------------------------------------------------------------

function fechaIso(d) { return Utilities.formatDate(d, 'America/Bogota', 'yyyy-MM-dd'); }

function generarObligaciones() {
  const activos = String(config('tipos_activos')).split(',').map(normalizarTexto).filter(Boolean);
  const calendario = leerFilas(HOJAS.CALENDARIO).filter(function (f) {
    return activos.indexOf(f.tipo_obligacion) !== -1 && f.periodo !== '';
  });
  calendario.forEach(function (f) {
    if (f.periodo instanceof Date) throw new Error('El periodo quedó como fecha en CALENDARIO. Vuelve a correr importarCalendario().');
  });

  const hayReteica = activos.indexOf('RETEICA') !== -1;
  const oficinas = hayReteica ? cargarFuenteOficinas() : {};
  const responsables = cargarResponsables();

  const existentes = {};      // id → true
  const porFecha = {};        // dane|tipo|periodo|fecha → id (detecta un régimen que cambió de nombre)
  leerFilas(HOJAS.OBLIGACIONES).forEach(function (o) {
    existentes[o.id] = true;
    if (o.vencimiento instanceof Date) porFecha[[o.cod_dane, o.tipo_obligacion, o.periodo, fechaIso(o.vencimiento)].join('|')] = o.id;
  });

  const nuevas = [];
  const excepciones = [];
  const ahora = new Date();
  let yaExistian = 0;

  calendario.forEach(function (f) {
    const dane = normalizarDane(f.cod_dane);
    const regimen = normalizarRegimen(f.comentario);
    const id = construirId(dane, f.tipo_obligacion, regimen, f.periodo);
    if (existentes[id]) { yaExistian++; return; }

    const claveFecha = [dane, f.tipo_obligacion, f.periodo, fechaIso(f.vencimiento)].join('|');
    if (porFecha[claveFecha]) {
      excepciones.push({ id_obligacion: id, motivo: 'REGIMEN_CAMBIO_POSIBLE',
        detalle: 'Ya existe ' + porFecha[claveFecha] + ' con el mismo vencimiento; el Comentario del calendario cambió. No se creó una fila nueva.' });
      return;
    }

    let oficina = { estado: 'SIN_FUENTE' };
    if (f.tipo_obligacion === 'RETEICA') oficina = buscarOficina(oficinas, dane, f.periodicidad, f.municipio);
    if (oficina.estado !== 'OK') {
      excepciones.push({ id_obligacion: id, motivo: 'SIN_OFICINA',
        detalle: f.municipio + ' (' + oficina.estado + '): no se pudo asignar centro de costo, forma de pago ni responsable.' });
    }

    const of = oficina.estado === 'OK' ? oficina.fila : {};
    const forma = formaPagoDe(of.pago);
    // Sin fila de oficina no hay forma de pago confiable: queda REVISAR, no un valor inventado.
    const requiere = oficina.estado === 'OK' ? requiereEnvioDe(forma) : 'REVISAR';
    if (requiere === 'REVISAR' && oficina.estado === 'OK') {
      excepciones.push({ id_obligacion: id, motivo: 'ENVIO_POR_DEFINIR',
        detalle: f.municipio + ': forma de pago "' + (of.pago || '') + '". Define requiere_envio_oficina (SI/NO).' });
    }
    const inicial = normalizarTexto(of.responsable);

    nuevas.push({
      id: id,
      cod_oficina: codOficina(of.cc),
      cod_dane: dane,
      municipio: f.municipio,
      empresa: f.empresa,
      nit_municipio: f.nit,
      tipo_obligacion: f.tipo_obligacion,
      regimen: regimen,
      regimen_texto: f.comentario,
      periodo: f.periodo,
      periodo_por_confirmar: f.periodo_por_confirmar,
      periodicidad: f.periodicidad,
      vencimiento: f.vencimiento,
      presentacion_texto: of.presentacion === undefined || of.presentacion === null ? '' : of.presentacion,
      correo_municipio: extraerCorreos(of.presentacion),
      forma_pago: forma,
      requiere_envio_oficina: requiere,
      // Si la inicial no está en la hoja Responsable queda la inicial tal cual viene de la fuente.
      profesional: responsables[inicial] || (inicial ? String(of.responsable).trim() : ''),
      jefe: '',   // TODO(USUARIO): no está en ninguna hoja de la fuente; se llena cuando sepas de dónde sale.
      reprocesos: 0,
      estado: 'PENDIENTE',
      estado_desde: ahora
    });
    existentes[id] = true;
  });

  agregarFilas(HOJAS.OBLIGACIONES, nuevas);
  registrarExcepcionesGenerador(excepciones);
  Logger.log('generarObligaciones(): ' + nuevas.length + ' filas creadas, ' + yaExistian +
    ' ya existían, ' + excepciones.length + ' excepciones.');
}

/** Escribe en EXCEPCIONES sin repetir las que ya están abiertas. */
function registrarExcepcionesGenerador(lista) {
  const abiertas = {};
  leerFilas(HOJAS.EXCEPCIONES).forEach(function (e) {
    if (e.resuelta === '' || e.resuelta === false) abiertas[e.motivo + '|' + e.id_obligacion + '|' + e.detalle] = true;
  });
  const nuevas = lista
    .filter(function (e) { return !abiertas[e.motivo + '|' + e.id_obligacion + '|' + e.detalle]; })
    .map(function (e) {
      return { timestamp: new Date(), id_obligacion: e.id_obligacion, motivo: e.motivo, detalle: e.detalle, resuelta: false };
    });
  agregarFilas(HOJAS.EXCEPCIONES, nuevas);
}

/** Cuántas filas quedaron por requiere_envio_oficina, para revisar la siembra. */
function resumirObligaciones() {
  const cuenta = {};
  leerFilas(HOJAS.OBLIGACIONES).forEach(function (o) {
    const k = o.tipo_obligacion + ' · envío ' + o.requiere_envio_oficina;
    cuenta[k] = (cuenta[k] || 0) + 1;
  });
  Object.keys(cuenta).sort().forEach(function (k) { Logger.log(k + ': ' + cuenta[k]); });
}
