/**
 * SINAV · pruebas.
 * Corren desde el editor (menu SINAV -> Correr pruebas, o la funcion pruebas())
 * y tambien en node con `node tools/pruebas.mjs`.
 * Solo tocan funciones puras: normalizacion y maquina de estados. Son las dos
 * donde un error silencioso se propaga.
 */

function pruebas() {
  var r = { pasa: 0, falla: 0, lineas: [] };

  var esIgual = function (titulo, obtenido, esperado) {
    var a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
    if (a === b) {
      r.pasa++;
      r.lineas.push('PASA  ' + titulo);
    } else {
      r.falla++;
      r.lineas.push('FALLA ' + titulo + '\n        esperaba ' + b + '\n        obtuvo   ' + a);
    }
  };

  pruebasPeriodicidad(esIgual);
  pruebasSinSoporte(esIgual);
  pruebasNormalizacionVaria(esIgual);
  pruebasTransiciones(esIgual);

  var resumen = r.lineas.join('\n') + '\n\n' + r.pasa + ' pasan, ' + r.falla + ' fallan';
  if (typeof Logger !== 'undefined') Logger.log(resumen);
  r.resumen = resumen;
  return r;
}

/** La periodicidad llega sucia del origen: ANUAL, Anual, "MENSUAL " con espacio. */
function pruebasPeriodicidad(esIgual) {
  esIgual('periodicidad MENSUAL', normPeriodicidad('MENSUAL'), 'MENSUAL');
  esIgual('periodicidad con espacio al final', normPeriodicidad('MENSUAL '), 'MENSUAL');
  esIgual('periodicidad con espacio adelante', normPeriodicidad('  MENSUAL'), 'MENSUAL');
  esIgual('periodicidad en minusculas', normPeriodicidad('mensual'), 'MENSUAL');
  esIgual('periodicidad capitalizada', normPeriodicidad('Anual'), 'ANUAL');
  esIgual('periodicidad con acento', normPeriodicidad('Anúal'), 'ANUAL');
  esIgual('periodicidad con tabulador y salto', normPeriodicidad('\tBimestral\n'), 'BIMESTRAL');
  esIgual('periodicidad con espacios internos', normPeriodicidad('CUATRI MESTRAL'), 'CUATRIMESTRAL');
  esIgual('sinonimo BIMENSUAL', normPeriodicidad('Bimensual'), 'BIMESTRAL');
  esIgual('sinonimo ANO', normPeriodicidad('ANO'), 'ANUAL');
  esIgual('sinonimo ANIO con enie', normPeriodicidad('AÑO'), 'ANUAL');
  esIgual('trimestral', normPeriodicidad('trimestre'), 'TRIMESTRAL');
  esIgual('vacio no inventa nada', normPeriodicidad(''), '');
  esIgual('nulo no revienta', normPeriodicidad(null), '');
  esIgual('indefinido no revienta', normPeriodicidad(undefined), '');
  esIgual('SEMESTRAL no esta en el enum', normPeriodicidad('SEMESTRAL'), '');
  esIgual('basura no pasa', normPeriodicidad('x'), '');
  esIgual('normaliza una vez, no cada vez',
          normPeriodicidad(normPeriodicidad('  anual  ')), 'ANUAL');
}

/** LA REGLA: sin soporte no hay envio, sin excepcion. */
function pruebasSinSoporte(esIgual) {
  var base = {
    estado: ESTADO.LISTA,
    soporte_id: '1AbCdEf',
    requiere_envio: 'SI',
    correo_oficina: 'oficina@davivienda.com'
  };
  var con = function (cambios) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(cambios || {}).forEach(function (k) { o[k] = cambios[k]; });
    return o;
  };

  esIgual('con soporte y LISTA se envia', puedeEnviar(base).ok, true);

  esIgual('soporte vacio no se envia', puedeEnviar(con({ soporte_id: '' })).ok, false);
  esIgual('soporte vacio dice por que',
          puedeEnviar(con({ soporte_id: '' })).motivo, 'sin soporte');
  esIgual('soporte con solo espacios no se envia',
          puedeEnviar(con({ soporte_id: '   ' })).ok, false);
  esIgual('soporte nulo no se envia', puedeEnviar(con({ soporte_id: null })).ok, false);
  esIgual('soporte indefinido no se envia',
          puedeEnviar(con({ soporte_id: undefined })).ok, false);
  esIgual('fila vacia no se envia', puedeEnviar({}).ok, false);
  esIgual('nulo no revienta', puedeEnviar(null).ok, false);

  esIgual('requiere_envio NO no se envia',
          puedeEnviar(con({ requiere_envio: 'NO' })).ok, false);
  esIgual('requiere_envio REVISAR no se envia',
          puedeEnviar(con({ requiere_envio: 'REVISAR' })).ok, false);
  esIgual('sin correo de oficina no se envia',
          puedeEnviar(con({ correo_oficina: '' })).ok, false);
  esIgual('correo invalido no se envia',
          puedeEnviar(con({ correo_oficina: 'no-es-un-correo' })).ok, false);
  esIgual('estado PENDIENTE no se envia',
          puedeEnviar(con({ estado: ESTADO.PENDIENTE })).ok, false);
  esIgual('estado ENVIADA no se reenvia solo',
          puedeEnviar(con({ estado: ESTADO.ENVIADA })).ok, false);

  // la misma regla por el otro lado: no se puede llegar a LISTA sin soporte
  esIgual('PENDIENTE sin soporte no pasa a LISTA',
          validarPaso({ estado: ESTADO.PENDIENTE, soporte_id: '' }, ESTADO.LISTA, {}, ROL.ADMIN).ok,
          false);
  esIgual('PENDIENTE con soporte pasa a LISTA',
          validarPaso({ estado: ESTADO.PENDIENTE, soporte_id: '1Ab' }, ESTADO.LISTA, {}, ROL.ADMIN).ok,
          true);
  esIgual('DEVUELTA sin soporte no vuelve a LISTA',
          validarPaso({ estado: ESTADO.DEVUELTA, soporte_id: '  ' }, ESTADO.LISTA, {}, ROL.JEFE).ok,
          false);
  esIgual('ni un ADMIN puede enviar sin soporte',
          validarPaso(con({ soporte_id: '' }), ESTADO.ENVIADA, {}, ROL.ADMIN).ok, false);
}

function pruebasNormalizacionVaria(esIgual) {
  // los codigos son texto: "0851" no es 851
  esIgual('cod_oficina conserva ceros', normCodigo('0851'), '0851');
  esIgual('cod_oficina numerico recupera el cero', normCodigo(851, 4), '0851');
  esIgual('cod_dane de cinco recupera el cero', normCodigo(5001, 5), '05001');
  esIgual('cod_dane de cinco intacto', normCodigo('11001', 5), '11001');
  esIgual('codigo que vino como decimal', normCodigo('851.0', 4), '0851');
  esIgual('codigo en notacion cientifica', normCodigo('8.99999061E+8'), '899999061');
  esIgual('codigo vacio', normCodigo(''), '');

  esIgual('periodo mensual con un digito', normPeriodo('2026-9'), '2026-09');
  esIgual('periodo mensual con dos', normPeriodo('2026-09'), '2026-09');
  esIgual('periodo con barra', normPeriodo('2026/09'), '2026-09');
  esIgual('periodo bimestral', normPeriodo('2026-b4'), '2026-B4');
  esIgual('periodo trimestral', normPeriodo('2026-T3'), '2026-T3');
  esIgual('periodo anual', normPeriodo('2026'), '2026');
  esIgual('mes 13 no existe', normPeriodo('2026-13'), '');
  esIgual('bimestre 7 no existe', normPeriodo('2026-B7'), '');
  esIgual('periodo basura', normPeriodo('septiembre'), '');

  esIgual('regimen vacio es GENERAL', normRegimen(''), 'GENERAL');
  esIgual('regimen con espacios es GENERAL', normRegimen('   '), 'GENERAL');
  esIgual('regimen propio se respeta', normRegimen('comun'), 'COMUN');

  esIgual('correos sin repetidos y en minuscula',
          normCorreos('A@d.com, b@d.com; A@D.COM'), 'a@d.com,b@d.com');
  esIgual('correo invalido se cae', normCorreos('nada, b@d.com'), 'b@d.com');

  esIgual('valor con puntos de mil', normValor('1.234.567,89'), 1234567.89);
  esIgual('valor con comas de mil', normValor('1,234,567.89'), 1234567.89);
  esIgual('valor con signo de pesos', normValor('$ 4.820.350'), 4820350);
  esIgual('valor vacio no es cero', normValor(''), '');

  esIgual('exogena solo aplica a RETEICA',
          normObligacion({ cod_dane: '11001', municipio: 'Bogota', impuesto: 'ICA',
                           periodo: '2026-09', periodicidad: 'MENSUAL',
                           vencimiento: '2026-10-15', exogena: 'SI' }).fila.exogena, 'NO');
  esIgual('el id se arma con los cuatro campos',
          armarId(5001, 'reteica', '', '2026-9'), '05001|RETEICA|GENERAL|2026-09');
  esIgual('la periodicidad sucia se reporta como problema',
          normObligacion({ cod_dane: '11001', municipio: 'Bogota', impuesto: 'ICA',
                           periodo: '2026-09', periodicidad: 'SEMESTRAL',
                           vencimiento: '2026-10-15' }).problemas.length > 0, true);
}

function pruebasTransiciones(esIgual) {
  esIgual('PENDIENTE a LISTA', puedePasar('PENDIENTE', 'LISTA'), true);
  esIgual('LISTA a ENVIADA', puedePasar('LISTA', 'ENVIADA'), true);
  esIgual('ENVIADA a RESPONDIDA', puedePasar('ENVIADA', 'RESPONDIDA'), true);
  esIgual('RESPONDIDA a REVISADA', puedePasar('RESPONDIDA', 'REVISADA'), true);
  esIgual('REVISADA a APROBADA', puedePasar('REVISADA', 'APROBADA'), true);
  esIgual('DEVUELTA vuelve a LISTA', puedePasar('DEVUELTA', 'LISTA'), true);
  esIgual('REBOTADO vuelve a LISTA', puedePasar('REBOTADO', 'LISTA'), true);

  esIgual('PENDIENTE no salta a ENVIADA', puedePasar('PENDIENTE', 'ENVIADA'), false);
  esIgual('RESPONDIDA no salta a APROBADA', puedePasar('RESPONDIDA', 'APROBADA'), false);
  esIgual('APROBADA no va a ningun lado', puedePasar('APROBADA', 'DEVUELTA'), false);
  esIgual('estado inventado', puedePasar('LO_QUE_SEA', 'LISTA'), false);
  esIgual('estado con espacios se tolera', puedePasar(' lista ', 'ENVIADA'), true);

  // REVISADA y APROBADA solo JEFE o ADMIN
  var respondida = { estado: ESTADO.RESPONDIDA, soporte_id: '1Ab' };
  esIgual('el PROFESIONAL no marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.PROFESIONAL).ok, false);
  esIgual('el JEFE si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.JEFE).ok, true);
  esIgual('el ADMIN si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.ADMIN).ok, true);
  esIgual('el PROFESIONAL no marca APROBADA',
          validarPaso({ estado: ESTADO.REVISADA, soporte_id: '1Ab' },
                      ESTADO.APROBADA, {}, ROL.PROFESIONAL).ok, false);

  // DEVUELTA exige motivo
  esIgual('DEVUELTA sin motivo no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, {}, ROL.JEFE).ok, false);
  esIgual('DEVUELTA con motivo en blanco no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: '   ' }, ROL.JEFE).ok, false);
  esIgual('DEVUELTA con motivo pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: 'sello ilegible' }, ROL.JEFE).ok,
          true);

  esIgual('no se repite el mismo estado',
          validarPaso({ estado: ESTADO.LISTA, soporte_id: '1Ab' },
                      ESTADO.LISTA, {}, ROL.ADMIN).ok, false);
}
