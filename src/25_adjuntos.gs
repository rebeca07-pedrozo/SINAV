/**
 * 25_adjuntos.gs — busca en Drive el PDF de salida de cada obligación.
 *
 * El nombre que el sistema sugiere (columna nombre_adjunto_esperado) es:
 *   {cod_dane a 5 dígitos}_{TIPO}_{REGIMEN}_{PERIODO}_{MUNICIPIO}.pdf   p. ej. 05001_RETEICA_GENERAL_2026-09_MEDELLIN.pdf
 * Pero el buscador NO exige ese nombre: lee el nombre del archivo como bolsa de palabras y exige que
 * aparezcan el código DANE, el periodo y (si hace falta) el tipo y el régimen, en cualquier orden y con
 * cualquier separador, mayúsculas, tildes o ceros de más. El municipio y cualquier otro texto se ignoran.
 *
 * Regla de oro: ante la duda NO se adivina. Un archivo que podría ser de dos obligaciones, o una
 * obligación con dos archivos, va a EXCEPCIONES. Mandar la declaración equivocada es peor que no mandar.
 */

const MOTIVO_SIN_ADJUNTO = 'SIN_ADJUNTO';
const MOTIVO_ADJUNTO_AMBIGUO = 'ADJUNTO_AMBIGUO';

// --- funciones puras ---------------------------------------------------------------------

/** Quita ceros a la izquierda de los números ("09" → "9", "05001" → "5001"). El resto queda igual. */
function sinCeros(t) { return /^\d+$/.test(t) ? String(Number(t)) : t; }

/** Tipos que reconoce el buscador: los de MAPA_IMPUESTO. */
function tiposConocidos() {
  return Object.keys(MAPA_IMPUESTO).map(function (k) { return MAPA_IMPUESTO[k]; });
}

/** Nombre de archivo → palabras normalizadas separadas por un espacio, con las formas habituales de cada tipo unificadas. */
function textoArchivo(nombre) {
  return normalizarTexto(nombre)
    .replace(/\.PDF$/, '')
    .replace(/[^A-Z0-9]+/g, ' ').trim()
    // Formas habituales de escribir el tipo (lógica del lector, no datos del negocio).
    .replace(/\bAUTO ?R{1,2}ETE ?ICA\b/g, 'AUTORRETEICA')
    .replace(/\bRETE ICA\b|\bRETENCION (DE )?ICA\b/g, 'RETEICA')
    .replace(/\bMEDIOS MAGNETICOS\b/g, 'EXOGENA');
}

/** ¿El periodo (2026-09, 2026-B1...) aparece junto en el nombre? Acepta "2026 9", "9 2026", "202609". */
function coincidePeriodo(tokens, periodo) {
  const m = String(periodo).match(/^(\d{4})-(.+)$/);
  if (!m) return false;
  const anio = m[1], crudo = m[2], sub = sinCeros(crudo);
  const tk = tokens.map(sinCeros);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === anio + crudo || tk[i] === anio + sub) return true;
    if (tokens[i] === anio && (tk[i + 1] === sub || tk[i - 1] === sub)) return true;
  }
  return false;
}

/** Nombre sugerido para que el equipo guarde el PDF. */
function nombreAdjuntoEsperado(o) {
  const limpio = function (t) { return String(t === null || t === undefined ? '' : t).replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  const dane = ('00000' + o.cod_dane).slice(-5);
  return [dane, o.tipo_obligacion, limpio(o.regimen), o.periodo, limpio(o.municipio)].join('_') + '.pdf';
}

/**
 * ¿A cuál obligación pertenece este archivo?
 * indice: { daneSinCeros: [obligaciones] }. soloTipo: el tipo activo si hay uno solo (el archivo puede no nombrarlo).
 * Devuelve { estado: 'OK', obligacion } | { estado: 'NINGUNA' } | { estado: 'AMBIGUO', detalle }.
 */
function obligacionDeArchivo(nombre, indice, soloTipo) {
  const texto = textoArchivo(nombre);
  const tokens = texto.split(' ');
  const conocidos = tiposConocidos();
  const tiposEnNombre = tokens.filter(function (t) { return conocidos.indexOf(t) !== -1; });

  const vistos = {};
  let candidatas = [];
  tokens.forEach(function (t) {
    if (!/^\d+$/.test(t)) return;
    (indice[sinCeros(t)] || []).forEach(function (o) {
      if (!vistos[o.id]) { vistos[o.id] = true; candidatas.push(o); }
    });
  });

  candidatas = candidatas.filter(function (o) {
    if (!coincidePeriodo(tokens, o.periodo)) return false;
    return tiposEnNombre.length ? tiposEnNombre.indexOf(o.tipo_obligacion) !== -1 : o.tipo_obligacion === soloTipo;
  });
  if (!candidatas.length) return { estado: 'NINGUNA' };
  if (candidatas.length === 1) return { estado: 'OK', obligacion: candidatas[0] };

  // Varias obligaciones del mismo municipio, tipo y periodo (distinto régimen): decide el régimen escrito en el nombre.
  const rodeado = ' ' + texto + ' ';
  const nombrados = candidatas.filter(function (o) {
    return o.regimen !== REGIMEN_GENERAL && rodeado.indexOf(' ' + textoArchivo(o.regimen) + ' ') !== -1;
  });
  if (nombrados.length === 1) return { estado: 'OK', obligacion: nombrados[0] };
  if (nombrados.length === 0) {
    const generales = candidatas.filter(function (o) { return o.regimen === REGIMEN_GENERAL; });
    if (generales.length === 1) return { estado: 'OK', obligacion: generales[0] };
  }
  return { estado: 'AMBIGUO', detalle: 'podría ser de ' + candidatas.length + ' obligaciones: ' +
    candidatas.map(function (o) { return o.id; }).join(' ; ') };
}

/**
 * Cruza archivos y obligaciones. archivos: [{id, nombre}].
 * Devuelve { porObligacion: {id: [archivo]}, sinObligacion: [archivo], ambiguos: [{archivo, detalle}] }.
 */
function buscarAdjuntos(obligaciones, archivos, soloTipo) {
  const indice = {};
  obligaciones.forEach(function (o) { (indice[sinCeros(String(o.cod_dane))] = indice[sinCeros(String(o.cod_dane))] || []).push(o); });
  const r = { porObligacion: {}, sinObligacion: [], ambiguos: [] };
  archivos.forEach(function (a) {
    const x = obligacionDeArchivo(a.nombre, indice, soloTipo);
    if (x.estado === 'OK') (r.porObligacion[x.obligacion.id] = r.porObligacion[x.obligacion.id] || []).push(a);
    else if (x.estado === 'AMBIGUO') r.ambiguos.push({ archivo: a, detalle: x.detalle });
    else r.sinObligacion.push(a);
  });
  return r;
}

// --- Drive -------------------------------------------------------------------------------

/** Todos los PDF dentro de la carpeta de salida y sus subcarpetas (año/periodo, o lo que se invente el equipo). */
function listarArchivosSalida() {
  const resultado = [];
  const recorrer = function (carpeta) {
    const files = carpeta.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      if (f.getMimeType() === MimeType.PDF || /\.pdf$/i.test(f.getName())) resultado.push({ id: f.getId(), nombre: f.getName() });
    }
    const sub = carpeta.getFolders();
    while (sub.hasNext()) recorrer(sub.next());
  };
  recorrer(DriveApp.getFolderById(config('carpeta_salida_id')));
  return resultado;
}

// --- proceso -----------------------------------------------------------------------------

/**
 * Llena nombre_adjunto_esperado y adjunto_salida_id. Las obligaciones que vencen pronto y siguen sin PDF
 * van a EXCEPCIONES como SIN_ADJUNTO (y no se enviarán). Nunca pisa un adjunto ya asignado.
 */
function resolverAdjuntos() {
  const hoy = new Date();
  const activos = String(config('tipos_activos')).split(',').map(normalizarTexto).filter(Boolean);
  const dias = Number(configOpcional('dias_aviso_sin_adjunto') || 10);
  const limite = fechaIso(new Date(hoy.getTime() + dias * 86400000));

  const obligaciones = leerFilas(HOJAS.OBLIGACIONES);
  const archivos = listarArchivosSalida();
  const r = buscarAdjuntos(obligaciones.filter(function (o) { return activos.indexOf(o.tipo_obligacion) !== -1; }),
    archivos, activos.length === 1 ? activos[0] : '');

  let asignados = 0, ambiguas = 0;
  const excepciones = [], conAdjunto = {};
  obligaciones.forEach(function (o) {
    if (o.nombre_adjunto_esperado === '') o.nombre_adjunto_esperado = nombreAdjuntoEsperado(o);
    const mios = r.porObligacion[o.id] || [];
    if (o.adjunto_salida_id === '' && mios.length === 1) { o.adjunto_salida_id = mios[0].id; asignados++; }
    if (o.adjunto_salida_id !== '') { conAdjunto[o.id] = true; return; }

    if (mios.length > 1) {
      ambiguas++;
      excepciones.push({ id_obligacion: o.id, motivo: MOTIVO_ADJUNTO_AMBIGUO,
        detalle: 'Hay ' + mios.length + ' PDF que podrían ser este: ' + mios.map(function (a) { return a.nombre; }).join(' | ') });
    } else if (o.requiere_envio_oficina === 'SI' && o.estado === 'PENDIENTE' && o.vencimiento instanceof Date &&
               fechaIso(o.vencimiento) <= limite) {
      excepciones.push({ id_obligacion: o.id, motivo: MOTIVO_SIN_ADJUNTO,
        detalle: 'Vence ' + fechaIso(o.vencimiento) + ' y no hay PDF. Nombre sugerido: ' + o.nombre_adjunto_esperado });
    }
  });

  ['nombre_adjunto_esperado', 'adjunto_salida_id'].forEach(function (col) {
    escribirColumna(HOJAS.OBLIGACIONES, col, obligaciones.map(function (o) { return o[col]; }));
  });
  r.ambiguos.forEach(function (x) {
    excepciones.push({ id_obligacion: '', motivo: MOTIVO_ADJUNTO_AMBIGUO, detalle: 'El archivo "' + x.archivo.nombre + '" ' + x.detalle });
  });
  registrarExcepcionesGenerador(excepciones);
  const cerradas = cerrarSinAdjunto(conAdjunto);

  Logger.log('resolverAdjuntos(): ' + archivos.length + ' PDF en Drive · ' + asignados + ' asignados ahora · ' +
    Object.keys(conAdjunto).length + ' obligaciones con adjunto · ' + ambiguas + ' obligaciones con más de un PDF · ' +
    r.ambiguos.length + ' PDF ambiguos · ' + r.sinObligacion.length + ' PDF que no corresponden a ninguna obligación · ' +
    excepciones.filter(function (e) { return e.motivo === MOTIVO_SIN_ADJUNTO; }).length + ' SIN_ADJUNTO (vencen en ≤ ' + dias + ' días) · ' +
    cerradas + ' excepciones SIN_ADJUNTO cerradas');
  r.sinObligacion.slice(0, 10).forEach(function (a) { Logger.log('  sin obligación: ' + a.nombre); });
}

/** Cierra las excepciones SIN_ADJUNTO de obligaciones que ya tienen PDF. Devuelve cuántas cerró. */
function cerrarSinAdjunto(conAdjunto) {
  const filas = leerFilas(HOJAS.EXCEPCIONES);
  let n = 0;
  const resuelta = filas.map(function (e) {
    if (e.motivo === MOTIVO_SIN_ADJUNTO && (e.resuelta === '' || e.resuelta === false) && conAdjunto[e.id_obligacion]) { n++; return true; }
    return e.resuelta;
  });
  if (n) escribirColumna(HOJAS.EXCEPCIONES, 'resuelta', resuelta);
  return n;
}
