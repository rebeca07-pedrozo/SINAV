/** Pruebas del remitente. Corre pruebasEnvio(). Usa igual() de calendario.test.gs. */

function pruebasEnvio() {
  const falla = function (f, texto, etiqueta) {
    let msg = '';
    try { f(); } catch (e) { msg = e.message; }
    igual(msg.indexOf(texto) !== -1, true, etiqueta + ' (mensaje: "' + msg + '")');
  };

  // Cuenta que envía: sale de quien hace clic, con el nombre configurado
  const a = opcionesRemitente('CUENTA_QUE_ENVIA', 'Impuestos Davivienda', 'alias@x.com', false, 'jesus@x.com');
  igual(a.name, 'Impuestos Davivienda', 'cuenta: nombre');
  igual(a.replyTo, 'jesus@x.com', 'cuenta: replyTo es quien envía');
  igual('from' in a, false, 'cuenta: no fuerza from');
  igual('noReply' in a, false, 'cuenta: nunca noReply');

  // Alias disponible
  const b = opcionesRemitente('ALIAS', 'Impuestos Davivienda', 'alias@x.com', true, 'jesus@x.com');
  igual(b.from, 'alias@x.com', 'alias: from');
  igual(b.replyTo, 'alias@x.com', 'alias: replyTo');

  // Lo que NO debe pasar: caer a otro remitente en silencio
  falla(function () { opcionesRemitente('ALIAS', 'N', 'alias@x.com', false, 'j@x.com'); }, 'no está en', 'alias sin configurar en la cuenta');
  falla(function () { opcionesRemitente('ALIAS', 'N', '', true, 'j@x.com'); }, 'alias_envio está vacío', 'alias vacío');
  falla(function () { opcionesRemitente('CUENTA_QUE_ENVIA', '', '', false, 'j@x.com'); }, 'nombre_remitente', 'sin nombre');
  falla(function () { opcionesRemitente('CUENTA_QUE_ENVIA', 'N', '', false, ''); }, 'cuenta que envía', 'sin cuenta activa');
  falla(function () { opcionesRemitente('', 'N', '', false, 'j@x.com'); }, 'modo_remitente', 'modo vacío');
  falla(function () { opcionesRemitente('NOREPLY', 'N', '', false, 'j@x.com'); }, 'modo_remitente', 'noreply no es modo de oficinas');

  Logger.log('pruebasEnvio: OK');
}
