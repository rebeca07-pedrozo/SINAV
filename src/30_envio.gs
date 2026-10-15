/**
 * 30_envio.gs — motor de envío (Fase 2).
 * Paso 3: solo el remitente. Todavía no manda nada.
 */

const MODOS_REMITENTE = ['CUENTA_QUE_ENVIA', 'ALIAS'];

/**
 * Opciones de GmailApp.sendEmail para un correo a una oficina (necesita respuesta por el hilo).
 * Pura: no lee CONFIG ni Gmail, para poder probarla. Falla en vez de caer a un remitente distinto.
 *  - CUENTA_QUE_ENVIA: sale de quien hace clic; las respuestas le llegan a esa persona.
 *  - ALIAS: sale del alias "enviar como"; solo si la cuenta lo tiene.
 */
function opcionesRemitente(modo, nombre, alias, aliasDisponibleEnCuenta, cuentaActiva) {
  if (!nombre) throw new Error('CONFIG: nombre_remitente está vacío. No se envía sin nombre de remitente.');
  if (modo === 'CUENTA_QUE_ENVIA') {
    if (!cuentaActiva) throw new Error('No se pudo saber la cuenta que envía (Session.getActiveUser). No se envía.');
    return { name: nombre, replyTo: cuentaActiva };
  }
  if (modo === 'ALIAS') {
    if (!alias) throw new Error('CONFIG: alias_envio está vacío y modo_remitente es ALIAS.');
    if (!aliasDisponibleEnCuenta) throw new Error('El alias ' + alias + ' no está en "Enviar como" de esta cuenta. No se envía.');
    return { from: alias, name: nombre, replyTo: alias };
  }
  throw new Error('CONFIG: modo_remitente debe ser ' + MODOS_REMITENTE.join(' | ') + ' (hoy: "' + modo + '").');
}

/** Opciones de remitente para un correo a una oficina, según CONFIG y la cuenta que ejecuta. */
function remitente() {
  const modo = configOpcional('modo_remitente');
  const alias = configOpcional('alias_envio');
  return opcionesRemitente(
    modo,
    configOpcional('nombre_remitente'),
    alias,
    modo === 'ALIAS' && aliasDisponible(),
    Session.getActiveUser().getEmail()
  );
}

/** Opciones para avisos internos que no esperan respuesta (alertas, resúmenes). Solo Workspace. */
function opcionesAviso() {
  return { name: configOpcional('nombre_remitente'), noReply: true };
}

// ---------------------------------------------------------------------------
// Paso 4: cola de envío (solo lectura; no envía ni escribe nada)
// ---------------------------------------------------------------------------

const FUENTE_CONTACTOS = 'CONTACTOS';
const FUENTE_CORREO_MUNICIPIO = 'CORREO_MUNICIPIO';   // respaldo: el envío debe revisarse

/** Todos los correos que haya en un texto (separados por coma, punto y coma, espacio o salto de línea). */
function correosDe(texto) {
  const hallados = String(texto || '').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g) || [];
  return hallados.filter(function (c, i) { return hallados.indexOf(c) === i; });
}

/** Directorio {cod_oficina sin ceros: [correos]} solo con filas activas (activo = SI o casilla marcada). */
function directorioContactos(filas) {
  const dir = {};
  filas.forEach(function (f) {
    const activo = f.activo === true || String(f.activo).trim().toUpperCase() === 'SI';
    const clave = sinCeros(String(f.cod_oficina).trim());
    if (!activo || !clave) return;
    dir[clave] = (dir[clave] || []).concat(correosDe(f.correos));
  });
  return dir;
}

/**
 * Decide si una obligación entra a la cola de envío. Pura.
 * Devuelve {entra, motivo, destinatarios, fuente}. El motivo, si no entra, es uno de:
 * YA_ENVIADA, NO_REQUIERE_ENVIO, ENVIO_POR_DEFINIR, SIN_ADJUNTO, SIN_DESTINATARIO.
 */
function clasificarParaEnvio(o, directorio) {
  const fuera = function (motivo) { return { entra: false, motivo: motivo, destinatarios: [], fuente: '' }; };
  if (o.thread_id !== '' || o.fecha_envio !== '') return fuera('YA_ENVIADA');
  if (o.requiere_envio_oficina === 'NO') return fuera('NO_REQUIERE_ENVIO');
  if (o.requiere_envio_oficina !== 'SI') return fuera('ENVIO_POR_DEFINIR');
  if (String(o.adjunto_salida_id).trim() === '') return fuera('SIN_ADJUNTO');

  const deContactos = directorio[sinCeros(String(o.cod_oficina).trim())] || [];
  if (deContactos.length) return { entra: true, motivo: '', destinatarios: deContactos, fuente: FUENTE_CONTACTOS };
  const deMunicipio = correosDe(o.correo_municipio);
  if (deMunicipio.length) return { entra: true, motivo: '', destinatarios: deMunicipio, fuente: FUENTE_CORREO_MUNICIPIO };
  return fuera('SIN_DESTINATARIO');
}

/** Obligaciones PENDIENTES de los tipos activos (y del periodo, si se indica), clasificadas para el envío. */
function colaEnvio(periodo) {
  const tipos = String(configOpcional('tipos_activos')).split(',').map(function (t) { return t.trim(); }).filter(String);
  const directorio = directorioContactos(leerFilas(HOJAS.CONTACTOS));
  const cola = [], fuera = [];
  leerFilas(HOJAS.OBLIGACIONES).forEach(function (o) {
    if (o.estado !== 'PENDIENTE' || tipos.indexOf(o.tipo_obligacion) === -1) return;
    if (periodo && String(o.periodo) !== periodo) return;
    const c = clasificarParaEnvio(o, directorio);
    (c.entra ? cola : fuera).push({ obligacion: o, clasificacion: c });
  });
  return { cola: cola, fuera: fuera };
}

/** Resumen en el log de qué entraría a la cola. No envía ni escribe nada. Ej.: resumirCola('2026-10'). */
function resumirCola(periodo) {
  const r = colaEnvio(periodo);
  const porMotivo = {}, porFuente = {};
  r.fuera.forEach(function (x) { porMotivo[x.clasificacion.motivo] = (porMotivo[x.clasificacion.motivo] || 0) + 1; });
  r.cola.forEach(function (x) { porFuente[x.clasificacion.fuente] = (porFuente[x.clasificacion.fuente] || 0) + 1; });
  Logger.log('=== Cola de envío' + (periodo ? ' · ' + periodo : ' · todos los periodos') + ' ===');
  Logger.log('Entran a la cola: ' + r.cola.length + '  ' + JSON.stringify(porFuente));
  Logger.log('Quedan fuera: ' + r.fuera.length + '  ' + JSON.stringify(porMotivo));
  Logger.log('Modo actual: ' + configOpcional('modo') + ' (este resumen no envía nada)');
  return r;
}
