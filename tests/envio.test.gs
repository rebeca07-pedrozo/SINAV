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

function pruebasCola() {
  const dir = directorioContactos([
    { cod_oficina: '0851', correos: 'A@x.com; b@x.com', activo: 'SI' },
    { cod_oficina: '0900', correos: 'inactivo@x.com', activo: 'NO' },
    { cod_oficina: '1000', correos: 'sinmarcar@x.com', activo: '' }
  ]);
  const ob = function (cambios) {
    const o = { thread_id: '', fecha_envio: '', requiere_envio_oficina: 'SI', adjunto_salida_id: 'https://x/1',
                cod_oficina: '0851', correo_municipio: '' };
    Object.keys(cambios).forEach(function (k) { o[k] = cambios[k]; });
    return o;
  };
  const motivo = function (o) { const c = clasificarParaEnvio(o, dir); return c.entra ? 'ENTRA:' + c.fuente : c.motivo; };

  igual(correosDe('Hola A@X.com, b@x.com; A@x.com').join('|'), 'a@x.com|b@x.com', 'correos: minúsculas, sin repetidos');
  igual(correosDe('presentar en oficina').length, 0, 'correos: texto sin correo');
  igual(directorioContactos([{ cod_oficina: '851', correos: 'a@x.com', activo: true }])['851'].length, 1, 'activo con casilla marcada');
  igual(JSON.stringify(dir['851']), '["a@x.com","b@x.com"]', 'contactos: ceros y varios correos');
  igual(dir['900'], undefined, 'contactos: inactivo no cuenta');
  igual(dir['1000'], undefined, 'contactos: activo vacío no cuenta (no se adivina)');

  igual(motivo(ob({})), 'ENTRA:CONTACTOS', 'oficina en CONTACTOS');
  igual(motivo(ob({ cod_oficina: '0900', correo_municipio: 'm@x.com' })), 'ENTRA:CORREO_MUNICIPIO', 'respaldo correo_municipio');
  igual(motivo(ob({ cod_oficina: '', correo_municipio: 'm@x.com' })), 'ENTRA:CORREO_MUNICIPIO', 'sin oficina, con correo del municipio');
  igual(motivo(ob({ cod_oficina: '0900' })), 'SIN_DESTINATARIO', 'nadie a quien enviar');
  igual(motivo(ob({ adjunto_salida_id: '' })), 'SIN_ADJUNTO', 'sin adjunto no se envía');
  igual(motivo(ob({ requiere_envio_oficina: 'NO' })), 'NO_REQUIERE_ENVIO', 'NO');
  igual(motivo(ob({ requiere_envio_oficina: 'REVISAR' })), 'ENVIO_POR_DEFINIR', 'REVISAR');
  igual(motivo(ob({ requiere_envio_oficina: '' })), 'ENVIO_POR_DEFINIR', 'vacío no se asume SI');
  igual(motivo(ob({ thread_id: 'abc' })), 'YA_ENVIADA', 'ya tiene hilo');
  igual(motivo(ob({ fecha_envio: new Date() })), 'YA_ENVIADA', 'ya tiene fecha de envío');

  Logger.log('pruebasCola: OK');
}
