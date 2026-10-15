/** Pruebas del generador con casos reales. Corre pruebasGenerador(). Usa igual() de calendario.test.gs. */

function pruebasGenerador() {
  // DANE: número, texto y con cero a la izquierda son el mismo municipio
  igual(normalizarDane(5001), '5001', 'dane número');
  igual(normalizarDane('05001'), '5001', 'dane con cero');
  igual(normalizarDane(' 13430 '), '13430', 'dane con espacios');

  // Régimen = Comentario normalizado; vacío = GENERAL
  igual(normalizarRegimen(''), 'GENERAL', 'regimen vacío');
  igual(normalizarRegimen(null), 'GENERAL', 'regimen null');
  igual(normalizarRegimen('Retenciones tarjetas débito y crédito'), 'RETENCIONES TARJETAS DEBITO Y CREDITO', 'regimen tildes');
  igual(normalizarRegimen('  15 Día   calendario '), '15 DIA CALENDARIO', 'regimen espacios');

  // La llave
  igual(construirId('13430', 'RETEICA', 'GENERAL', '2026-09'), '13430|RETEICA|GENERAL|2026-09', 'id');
  igual(construirId('70221', 'RETEICA', 'GENERAL', '2026-09') === construirId('70221', 'RETEICA', 'GENERAL', '2026-B4'), false, 'mensual vs bimestral');

  // Centro de costo con ceros
  igual(codOficina(2566), '2566', 'cc 4 dígitos');
  igual(codOficina(489), '0489', 'cc con cero');
  igual(codOficina('297'), '0297', 'cc texto');
  igual(codOficina('2566.0'), '2566', 'cc con .0');
  igual(codOficina(''), '', 'cc vacío');

  // Correos pegados en Presentacion
  igual(extraerCorreos('hacienda@samaca-boyaca.gov.co'), 'hacienda@samaca-boyaca.gov.co', 'un correo');
  igual(extraerCorreos('INGRESO DESDE AGOSTO 2025'), '', 'nota sin correo');
  igual(extraerCorreos('a@x.gov.co / b@y.gov.co'), 'a@x.gov.co, b@y.gov.co', 'dos correos');
  igual(extraerCorreos(null), '', 'correo null');

  // Pago → enum → requiere_envio_oficina
  [['OFICINA', 'OFICINA', 'SI'], ['Oficina', 'OFICINA', 'SI'], ['OFICINA - RECIBO', 'OFICINA_RECIBO', 'SI'],
   ['PSE', 'PSE', 'NO'], ['pse', 'PSE', 'NO'], ['TRANSFERENCIA', 'TRANSFERENCIA', 'NO'],
   ['MIXTA', 'MIXTA', 'REVISAR'], ['', '', 'REVISAR'], ['PAGO', 'OTRO', 'REVISAR'],
   ['ENTIDADES INTEGRADAS', 'OTRO', 'REVISAR']].forEach(function (c) {
    igual(formaPagoDe(c[0]), c[1], 'forma ' + c[0]);
    igual(requiereEnvioDe(formaPagoDe(c[0])), c[2], 'requiere ' + c[0]);
  });

  // Cruce con la hoja de oficinas
  const a = { responsable: 'J', cc: 3506, municipio: 'COVEÑAS', pago: 'TRANSFERENCIA' };
  const b = { responsable: 'J', cc: '3506', municipio: 'Coveñas', pago: 'Transferencia' };
  igual(buscarOficina({ '70221|MENSUAL': [a, b] }, '70221', 'MENSUAL', 'Coveñas').estado, 'OK', 'filas equivalentes');
  igual(buscarOficina({}, '99999', 'MENSUAL', 'X').estado, 'SIN_MATCH', 'sin match');
  const bog = { responsable: 'J', cc: 60, municipio: 'BOGOTA', pago: 'PSE' };
  const otra = { responsable: 'V', cc: 61, municipio: 'DATIO', pago: 'OFICINA' };
  igual(buscarOficina({ '11001|BIMESTRAL': [bog, otra] }, '11001', 'BIMESTRAL', 'Bogotá').estado, 'OK', 'desempate por nombre');
  const x1 = { responsable: 'J', cc: 1, municipio: 'ZZZ', pago: 'PSE' };
  const x2 = { responsable: 'V', cc: 2, municipio: 'YYY', pago: 'OFICINA' };
  igual(buscarOficina({ '5|MENSUAL': [x1, x2] }, '5', 'MENSUAL', 'Otro').estado, 'AMBIGUO', 'ambiguo');

  Logger.log('pruebasGenerador(): todo OK');
}
