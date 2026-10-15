/** Pruebas del armado de correo. Corre pruebasCorreo(). Usa igual() de calendario.test.gs. */

function pruebasCorreo() {
  const zona = Session.getScriptTimeZone();
  const manana = new Date(2026, 9, 15, 9, 0);
  const tarde = new Date(2026, 9, 15, 15, 0);
  const cfg = { responsable_soporte: 'Jesús Jaimes', codigo_dependencia: '9413', remitente: 'Impuestos Davivienda' };
  const plantilla = { asunto: PLANTILLA_INICIAL.asunto, cuerpo_html: PLANTILLA_INICIAL.cuerpo_html };
  const fonseca = function (cambios) {
    const o = { cod_oficina: '2335', municipio: 'Fonseca', tipo_obligacion: 'RETEICA', periodicidad: 'BIMESTRAL',
      periodo: '2026-B4', nit_municipio: '825000442', sticker: '123456', consecutivo_egreso: 'JJ26-08-184',
      valor: 722000, vencimiento: new Date(2026, 8, 22), adjunto_salida_id: 'https://drive.google.com/file/d/ABC123/view' };
    Object.keys(cambios || {}).forEach(function (k) { o[k] = cambios[k]; });
    return o;
  };
  const armar = function (cambios, ahora) { return armarCorreoCon(fonseca(cambios), plantilla, cfg, zona, ahora || manana); };

  igual(formatoPesos(722000), '$722.000', 'pesos');
  igual(formatoPesos(1234567), '$1.234.567', 'pesos con millones');
  igual(fechaLarga(new Date(2026, 8, 22), zona), '22 de septiembre de 2026', 'fecha larga');
  igual(fechaLarga(new Date(2026, 0, 5), zona), '5 de enero de 2026', 'fecha larga, día sin cero');

  // El caso real de Fonseca
  const c = armar();
  igual(c.ok, true, 'fonseca se arma');
  igual(c.asunto, '2335 -Declaración Retención de ICA - FONSECA - BIMESTRAL - $722.000 - Consecutivo Egreso 25 No- JJ26-08-184', 'asunto');
  igual(c.adjuntoId, 'ABC123', 'adjunto: id sacado del link');
  igual(c.texto.indexOf('sticker No 123456') !== -1, true, 'cuerpo: sticker');
  igual(c.texto.indexOf('BIMESTRAL de 2026, del Municipio de FONSECA, por el valor de $722.000 con el NIT 825000442 a la dependencia 2335') !== -1, true, 'cuerpo: frase principal');
  igual(c.texto.indexOf('Fecha de vencimiento el 22 de septiembre de 2026.') !== -1, true, 'cuerpo: vencimiento');
  igual(c.texto.indexOf('código 9413 a nombre de Jesús Jaimes') !== -1, true, 'cuerpo: responsable desde CONFIG');
  igual(c.texto.indexOf('Responda sobre este mismo correo') !== -1, true, 'cuerpo: pide responder en el mismo hilo');
  igual(/\{[a-z_]+\}/.test(c.asunto + c.html + c.texto), false, 'sin marcadores sueltos');
  igual(c.texto.indexOf('<') === -1, true, 'texto plano sin etiquetas');
  igual(c.texto.indexOf('Buenos días,') === 0, true, 'saludo de la mañana');
  igual(armar({}, tarde).texto.indexOf('Buenas tardes,') === 0, true, 'saludo de la tarde');

  // Año del texto sale del periodo (febrero cae en el B6 del año anterior)
  igual(armar({ periodo: '2025-B6' }).texto.indexOf('BIMESTRAL de 2025') !== -1, true, 'año desde el periodo');

  // Nunca sale con un dato en blanco: se dice qué falta
  const faltan = function (cambios) { const r = armar(cambios); return r.ok ? 'OK' : r.faltan.join(','); };
  igual(faltan({ sticker: '' }), 'sticker', 'sin sticker');
  igual(faltan({ consecutivo_egreso: '' }), 'consecutivo_egreso', 'sin consecutivo');
  igual(faltan({ valor: '' }), 'valor', 'sin valor');
  igual(faltan({ valor: 0 }), 'valor', 'valor cero no se acepta');
  igual(faltan({ vencimiento: '' }), 'vencimiento', 'sin vencimiento');
  igual(faltan({ adjunto_salida_id: '' }), 'adjunto_salida_id', 'sin adjunto');
  igual(faltan({ tipo_obligacion: 'PREDIAL' }), 'nombre del impuesto para PREDIAL', 'impuesto sin nombre definido');
  igual(armarCorreoCon(fonseca(), plantilla, { responsable_soporte: '', codigo_dependencia: '9413', remitente: 'X' }, zona, manana).faltan.join(','),
    'CONFIG responsable_soporte', 'sin responsable en CONFIG');

  // Marcador que la plantilla usa pero el sistema no conoce
  const rara = armarCorreoCon(fonseca(), { asunto: 'x {inventado}', cuerpo_html: '<p>ok</p>' }, cfg, zona, manana);
  igual(rara.ok, false, 'marcador desconocido no sale');

  // Un dato con & o < no rompe el HTML
  const raro = armar({ municipio: 'A&B <C>' });
  igual(raro.html.indexOf('A&amp;B &lt;C&gt;') !== -1, true, 'html escapado');
  igual(raro.texto.indexOf('A&B <C>') !== -1, true, 'texto plano recupera los caracteres');

  Logger.log('pruebasCorreo: OK');
}
