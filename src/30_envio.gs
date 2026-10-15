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
