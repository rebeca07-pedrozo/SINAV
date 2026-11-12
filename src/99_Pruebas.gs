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
  pruebasRoles(esIgual);
  pruebasPago(esIgual);
  pruebasCargaMasiva(esIgual);
  pruebasMetricas(esIgual);
  pruebasCarga(esIgual);

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
          validarPaso({ estado: ESTADO.DEVUELTA, soporte_id: '  ' }, ESTADO.LISTA, {},
                      PERFIL.PROFESIONAL_III).ok,
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

  // REVISADA y APROBADA solo PROFESIONAL-III o ADMIN (REQ-012)
  var respondida = { estado: ESTADO.RESPONDIDA, soporte_id: '1Ab' };
  esIgual('el PROFESIONAL no marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.PROFESIONAL).ok, false);
  esIgual('el PROFESIONAL-III si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.PROFESIONAL_III).ok, true);
  esIgual('un PROFESIONAL-I no marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.PROFESIONAL_I).ok, false);
  esIgual('el ADMIN si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.ADMIN).ok, true);
  esIgual('el ADMIN si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.ADMIN).ok, true);
  esIgual('el PROFESIONAL no marca APROBADA',
          validarPaso({ estado: ESTADO.REVISADA, soporte_id: '1Ab' },
                      ESTADO.APROBADA, {}, ROL.PROFESIONAL).ok, false);

  // DEVUELTA exige motivo
  esIgual('DEVUELTA sin motivo no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, {}, PERFIL.PROFESIONAL_III).ok, false);
  esIgual('DEVUELTA con motivo en blanco no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: '   ' },
                      PERFIL.PROFESIONAL_III).ok, false);
  esIgual('DEVUELTA con motivo pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: 'sello ilegible' },
                      PERFIL.PROFESIONAL_III).ok,
          true);

  esIgual('no se repite el mismo estado',
          validarPaso({ estado: ESTADO.LISTA, soporte_id: '1Ab' },
                      ESTADO.LISTA, {}, ROL.ADMIN).ok, false);
}

/**
 * Roles: el rol decide permisos, asi que un valor mal escrito en la hoja no
 * puede convertirse en un rol valido por accidente.
 */
function pruebasRoles(esIgual) {
  esIgual('rol PROFESIONAL', normalizarRol('PROFESIONAL'), 'PROFESIONAL');
  esIgual('rol en minusculas', normalizarRol('profesional'), 'PROFESIONAL');
  // REQ-012: el rol JEFE desaparecio; un libro sin migrar lo lee como
  // PROFESIONAL, y migrar() le pone nivel III para que no pierda permisos.
  esIgual('JEFE viejo se lee como PROFESIONAL', normalizarRol(' Jefe '), 'PROFESIONAL');
  esIgual('JEFA tambien', normalizarRol('JEFA'), 'PROFESIONAL');
  esIgual('JEFE se reconoce como rol viejo', esRolViejoJefe('Jefe'), true);
  esIgual('PROFESIONAL no es rol viejo', esRolViejoJefe('PROFESIONAL'), false);

  esIgual('perfil del supervisor',
          perfilDe({ rol: 'PROFESIONAL', nivel: 'III' }), 'PROFESIONAL-III');
  esIgual('perfil sin nivel cae al I, nunca de mas',
          perfilDe({ rol: 'PROFESIONAL', nivel: '' }), 'PROFESIONAL-I');
  esIgual('el ADMIN no lleva nivel', perfilDe({ rol: 'ADMIN', nivel: 'III' }), 'ADMIN');
  esIgual('sin rol no hay perfil', perfilDe({ rol: '', nivel: 'III' }), '');
  esIgual('ADMINISTRADOR es ADMIN', normalizarRol('Administrador'), 'ADMIN');
  esIgual('rol con acento', normalizarRol('Profesiónal'), 'PROFESIONAL');
  esIgual('rol mal escrito no pasa', normalizarRol('Profecional'), '');
  esIgual('rol vacio no pasa', normalizarRol(''), '');
  esIgual('rol nulo no revienta', normalizarRol(null), '');
  esIgual('un rol inventado no se cuela', normalizarRol('SUPERADMIN'), '');

  esIgual('area MUNICIPALES', normalizarArea('municipales'), 'MUNICIPALES');
  esIgual('area con acento y espacio', normalizarArea(' Municipáles '), 'MUNICIPALES');
  esIgual('area que no existe', normalizarArea('NACIONALES'), '');

  esIgual('nivel I', normalizarNivel('I'), 'I');
  esIgual('nivel en minusculas', normalizarNivel('ii'), 'II');
  esIgual('nivel como numero', normalizarNivel('3'), 'III');
  esIgual('nivel desde "Profesional I"', normalizarNivel('Profesional I'), 'I');
  esIgual('la raya es sin nivel', normalizarNivel('-'), '');
  esIgual('IV no es un nivel', normalizarNivel('IV'), '');

  // activo: solo un NO explicito bloquea
  esIgual('activo SI', esActivo('SI'), true);
  esIgual('activo vacio cuenta como activo', esActivo(''), true);
  esIgual('activo NO bloquea', esActivo('NO'), false);
  esIgual('activo no bloquea en minusculas', esActivo('no'), false);
  esIgual('activo Inactivo bloquea', esActivo('Inactivo'), false);

  esIgual('nombre desde correo', nombreDesdeCorreo('maria.lopez@davivienda.com'),
          'Maria Lopez');
  esIgual('perfil del profesional',
          perfilTexto({ rol: 'PROFESIONAL', nivel: 'I', area: 'MUNICIPALES' }),
          'Profesional-I de municipales');
  esIgual('perfil del jefe sin nivel',
          perfilTexto({ rol: 'PROFESIONAL', nivel: 'III', area: 'MUNICIPALES' }),
          'Profesional-III de municipales');
  esIgual('perfil sin rol', perfilTexto({ rol: '', nivel: '', area: '' }), 'sin rol');
}

/**
 * El pago son dos preguntas distintas: QUIEN paga y COMO se paga.
 * Antes vivian en una sola columna, asi que la migracion tiene que repartir
 * bien los valores viejos sin inventar ninguno.
 */
function pruebasPago(esIgual) {
  esIgual('paga_quien OFICINA', normPagaQuien('OFICINA'), 'OFICINA');
  esIgual('paga_quien PAGADURIA con acento', normPagaQuien('Pagaduría'), 'PAGADURIA');
  esIgual('paga_quien vacio cae a OFICINA', normPagaQuien(''), 'OFICINA');
  esIgual('PSE no es un pagador', normPagaQuien('PSE'), 'OFICINA');

  esIgual('forma_pago PSE', normFormaPago('PSE'), 'PSE');
  esIgual('forma_pago transferencia', normFormaPago('transferencia'), 'TRANSFERENCIA');
  esIgual('forma_pago abreviada', normFormaPago('Transf.'), 'TRANSFERENCIA');
  esIgual('forma_pago EFECTIVO', normFormaPago('efectivo'), 'EFECTIVO');
  esIgual('PAGADURIA no es una forma de pago', normFormaPago('PAGADURIA'), '');
  esIgual('forma_pago vacia se queda vacia', normFormaPago(''), '');

  // una fila vieja con medio_pago = PSE se tiene que repartir en las dos columnas
  var base = {
    cod_dane: '76001', municipio: 'Cali', impuesto: 'ICA', periodo: '2026-B5',
    periodicidad: 'Bimestral', vencimiento: '2026-11-01'
  };
  var con = function (extra) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return normObligacion(o).fila;
  };

  esIgual('medio_pago PSE -> paga_quien OFICINA',
          con({ medio_pago: 'PSE' }).paga_quien, 'OFICINA');
  esIgual('medio_pago PSE -> forma_pago PSE',
          con({ medio_pago: 'PSE' }).forma_pago, 'PSE');
  esIgual('medio_pago PAGADURIA -> paga_quien PAGADURIA',
          con({ medio_pago: 'PAGADURIA' }).paga_quien, 'PAGADURIA');
  esIgual('medio_pago PAGADURIA no inventa forma_pago',
          con({ medio_pago: 'PAGADURIA' }).forma_pago, '');
  esIgual('las columnas nuevas mandan sobre la vieja',
          con({ medio_pago: 'PSE', paga_quien: 'PAGADURIA',
                forma_pago: 'TRANSFERENCIA' }).paga_quien, 'PAGADURIA');
  esIgual('forma_pago explicita gana',
          con({ medio_pago: 'PSE', forma_pago: 'EFECTIVO' }).forma_pago, 'EFECTIVO');

  esIgual('tipo_presentacion VIRTUAL', normTipoPresentacion('virtual'), 'VIRTUAL');
  esIgual('tipo_presentacion por defecto OFICINA', normTipoPresentacion(''), 'OFICINA');

  // el correo va a las oficinas: no puede decir "undefined" ni "Pagaduria"
  esIgual('el correo nombra quien paga y con que',
          textoPago({ paga_quien: 'OFICINA', forma_pago: 'PSE' }), 'Oficina (PSE)');
  esIgual('sin forma de pago no inventa parentesis',
          textoPago({ paga_quien: 'PAGADURIA', forma_pago: '' }), 'Pagaduría');
  esIgual('pagaduria lleva tilde en el correo',
          textoPago({ paga_quien: 'PAGADURIA' }).indexOf('í') > 0, true);
  esIgual('una fila sin pago no escribe undefined',
          textoPago({}), 'sin definir');
  esIgual('un valor que no esta en el enum no se cuela',
          textoPago({ paga_quien: 'BASURA' }), 'sin definir');
}

/**
 * Carga masiva: emparejar un PDF con la obligacion equivocada es el error mas
 * caro de todo SINAV, porque se descubre cuando la oficina recibe la
 * declaracion de otro municipio. Asi que aqui se prueba que cuando hay duda,
 * NO se elige: se devuelve 'varios' o 'ninguno'.
 */
function pruebasCargaMasiva(esIgual) {
  var leer = leerNombreArchivo;

  esIgual('lee oficina e impuesto',
          [leer('0742 RETEICA 2026-11.pdf').cod_oficina,
           leer('0742 RETEICA 2026-11.pdf').impuesto,
           leer('0742 RETEICA 2026-11.pdf').periodo],
          ['0742', 'RETEICA', '2026-11']);
  esIgual('AUTORRET gana sobre RETEICA',
          leer('Declaracion AUTORRETEICA 0742 2026-11.pdf').impuesto, 'AUTORRETEICA');
  esIgual('AUTORRETENCION ICA tambien es AUTORRETEICA',
          leer('MEDELLIN AUTORRETENCION ICA 0742 2026.pdf').impuesto, 'AUTORRETEICA');
  esIgual('RTEICA abreviado', leer('RTEICA_0851_202611.pdf').impuesto, 'RETEICA');
  esIgual('periodo pegado sin guion', leer('RTEICA_0851_202611.pdf').periodo, '2026-11');
  esIgual('ICA sola no se confunde con RETEICA',
          leer('0304-ICA-2026-B5.pdf').impuesto, 'ICA');
  esIgual('periodo bimestral', leer('0304-ICA-2026-B5.pdf').periodo, '2026-B5');
  esIgual('exogena', leer('exogena 1234 2026.pdf').impuesto, 'EXOGENA');
  esIgual('el anio no se confunde con la oficina',
          leer('exogena 1234 2026.pdf').cod_oficina, '1234');
  esIgual('oficina de 3 digitos se rellena a 4',
          leer('oficina 851 reteica.pdf').cod_oficina, '0851');
  esIgual('un nombre sin datos no inventa oficina',
          leer('declaracion firmada.pdf').cod_oficina, '');
  esIgual('un nombre sin datos no inventa impuesto',
          leer('declaracion firmada.pdf').impuesto, '');

  var cand = [
    { id: 'A', cod_oficina: '0742', impuesto: 'RETEICA' },
    { id: 'B', cod_oficina: '0742', impuesto: 'AUTORRETEICA' },
    { id: 'C', cod_oficina: '0851', impuesto: 'RETEICA' }
  ];
  var par = function (nombre) { return emparejarArchivo(leer(nombre), cand); };

  esIgual('oficina + impuesto da uno solo', par('0742 RETEICA x.pdf').estado, 'listo');
  esIgual('y es el correcto', par('0742 RETEICA x.pdf').id, 'A');
  esIgual('solo oficina deja dos: no elige',
          par('0742 declaracion.pdf').estado, 'varios');
  esIgual('cuando hay varios no devuelve id',
          par('0742 declaracion.pdf').id, '');
  esIgual('pero si ofrece las opciones',
          par('0742 declaracion.pdf').opciones, ['A', 'B']);
  esIgual('una oficina que no existe no empareja',
          par('9999 RETEICA.pdf').estado, 'ninguno');
  esIgual('un nombre vacio de datos no empareja a ciegas',
          par('declaracion.pdf').estado, 'varios');
  esIgual('sin candidatas no hay emparejamiento',
          emparejarArchivo(leer('0742 RETEICA.pdf'), []).estado, 'ninguno');
  esIgual('impuesto que no esta entre las candidatas',
          par('0742 EXOGENA.pdf').estado, 'ninguno');
}

/** Metricas: una division por cero en un tablero vacio tumba la pantalla. */
function pruebasMetricas(esIgual) {
  var fila = function (extra) {
    var o = { estado: ESTADO.LISTA, impuesto: 'RETEICA', municipio: 'Medellín',
              responsable: 'a@d.com', periodo: '2026-11', dias: 5, valor: 1000,
              paga_quien: 'OFICINA', forma_pago: 'PSE',
              cadena: { soporte: true, envio: false, respuesta: false, sellado: false } };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  };

  var vacio = agruparMetricas([]);
  esIgual('metricas vacias: total 0', vacio.total, 0);
  esIgual('metricas vacias no dividen por cero', vacio.pct_cadena_completa, 0);
  esIgual('metricas vacias no tienen peor vencida', vacio.peor_vencida, null);
  esIgual('metricas de null no revientan', agruparMetricas(null).total, 0);

  var tres = [
    fila({ dias: -6, estado: ESTADO.APROBADA, valor: 2000,
           cadena: { soporte: true, envio: true, respuesta: true, sellado: true } }),
    fila({ dias: 2, estado: ESTADO.RESPONDIDA }),
    fila({ dias: 12, valor: '', paga_quien: 'PAGADURIA', forma_pago: '',
           cadena: { soporte: false, envio: false, respuesta: false, sellado: false } })
  ];
  var r = agruparMetricas(tres);
  esIgual('cuenta las vencidas', r.vencidas, 1);
  esIgual('cuenta las que vencen en 4 dias o menos', r.por_vencer, 1);
  esIgual('una vencida no cuenta tambien como por vencer',
          r.vencidas + r.por_vencer, 2);
  esIgual('cuenta las que esperan revision', r.esperan_revision, 1);
  esIgual('cuenta la cadena completa', r.cadena_completa, 1);
  esIgual('porcentaje de cadena completa', r.pct_cadena_completa, 33);
  esIgual('cuenta las que no tienen soporte', r.sin_soporte, 1);
  esIgual('cuenta las que no tienen valor', r.sin_valor, 1);
  esIgual('suma el valor saltando los vacios', r.valor_total, 3000);
  esIgual('un valor vacio no se suma como NaN', isNaN(r.valor_total), false);

  esIgual('separa lo que se paga en oficina', r.pago.oficina.cuantas, 2);
  esIgual('separa lo que se paga en pagaduria', r.pago.pagaduria.cuantas, 1);
  esIgual('desglosa la forma de pago de la oficina',
          r.pago.oficina.por_forma, [{ clave: 'PSE', cuantas: 2 }]);
  esIgual('una forma de pago vacia se declara sin dato',
          r.pago.pagaduria.por_forma, [{ clave: '(sin dato)', cuantas: 1 }]);
  esIgual('la peor vencida es la de mas dias',
          r.peor_vencida.dias, -6);

  esIgual('contarPor ordena de mayor a menor',
          contarPor([{ x: 'a' }, { x: 'b' }, { x: 'b' }], 'x'),
          [{ clave: 'b', cuantas: 2 }, { clave: 'a', cuantas: 1 }]);
  esIgual('contarPor nombra lo vacio', contarPor([{ x: '' }], 'x'),
          [{ clave: '(sin dato)', cuantas: 1 }]);
  esIgual('sumarValor de vacio es 0', sumarValor([]), 0);
}

/**
 * Carga del calendario. Un error aqui no se ve: se traduce en una obligacion
 * con el periodo equivocado o asignada a quien no es, y se descubre cuando
 * alguien reclama un vencimiento que nadie trabajo.
 */
function pruebasCarga(esIgual) {
  // el nombre del municipio viene de mil formas en los archivos
  esIgual('quita el sufijo de autorretenedor',
          claveMunicipio('MELGAR - AUTORETENEDOR'), 'MELGAR');
  esIgual('quita la marca de exogena', claveMunicipio('CAICEDONIA -Exogena'), 'CAICEDONIA');
  esIgual('quita la F suelta', claveMunicipio('PALMIRA F'), 'PALMIRA');
  esIgual('quita acentos y puntuacion', claveMunicipio('Medellín (Ant.)'), 'MEDELLIN ANT');
  esIgual('vacio no revienta', claveMunicipio(''), '');

  // el periodo depende de la periodicidad, no del mes a secas
  esIgual('mensual', periodoDe(2026, 3, 'MENSUAL'), '2026-03');
  esIgual('mensual rellena el cero', periodoDe(2026, 9, 'MENSUAL'), '2026-09');
  esIgual('bimestral', periodoDe(2026, 11, 'BIMESTRAL'), '2026-B6');
  esIgual('bimestral primer bimestre', periodoDe(2026, 1, 'BIMESTRAL'), '2026-B1');
  esIgual('trimestral', periodoDe(2026, 7, 'TRIMESTRAL'), '2026-T3');
  esIgual('cuatrimestral', periodoDe(2026, 12, 'CUATRIMESTRAL'), '2026-C3');
  esIgual('anual es solo el ano', periodoDe(2026, 5, 'ANUAL'), '2026');

  // las ultimas columnas del calendario son del ano siguiente: ano vencido
  var cab = ['NIT', 'Municipio', 'Impuesto'];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2].forEach(function (m) {
    cab.push(new Date(2000, m - 1, 1));
  });
  var cols = columnasDePeriodo(cab, '2026');
  esIgual('detecta las 14 columnas de periodo', cols.length, 14);
  esIgual('la primera es enero de la vigencia',
          [cols[0].anio, cols[0].mes], [2026, 1]);
  esIgual('la doce es diciembre de la vigencia',
          [cols[11].anio, cols[11].mes], [2026, 12]);
  esIgual('la trece ya es del ano siguiente',
          [cols[12].anio, cols[12].mes], [2027, 1]);
  esIgual('y la catorce tambien',
          [cols[13].anio, cols[13].mes], [2027, 2]);
  esIgual('sin columnas de fecha no inventa ninguna',
          columnasDePeriodo(['NIT', 'Municipio'], '2026').length, 0);

  // el responsable: el DANE manda, la entidad manda sobre el DANE
  esIgual('resuelve por codigo DANE',
          responsableDe('05001', '', 'Medellín', '') !== '', true);
  esIgual('un DANE que no existe no inventa responsable',
          responsableDe('99999', '', 'Nolandia', ''), '');
  esIgual('la entidad manda sobre el municipio',
          responsableDe('11001', '', 'Bogotá', 'CORPORACION FINANCIERA SA'),
          MATRIZ_ENTIDAD['CORPORACION FINANCIERA SA']);
  esIgual('BANCO DAVIVIENDA no es una entidad aparte',
          responsableDe('99999', '', 'Nolandia', 'BANCO DAVIVIENDA S.A'), '');

  // los impuestos que quedaron fuera del alcance
  esIgual('predial no entra', IMPUESTO_CALENDARIO['IMPUESTO PREDIAL'], undefined);
  esIgual('alumbrado no entra',
          IMPUESTO_CALENDARIO['IMPUESTO DE ALUMBRADO PUBLICO'], undefined);
  esIgual('industria y comercio es ICA',
          IMPUESTO_CALENDARIO['INDUSTRIA Y COMERCIO'], 'ICA');
  esIgual('medios magneticos es exogena',
          IMPUESTO_CALENDARIO['MEDIOS MAGNETICOS'], 'EXOGENA');

  // las filas de descuento no son obligaciones aparte
  esIgual('la fila sin descuento entra', DESCUENTOS_QUE_ENTRAN.indexOf('') >= 0, true);
  esIgual('la de fecha limite entra',
          DESCUENTOS_QUE_ENTRAN.indexOf('FECHA LIMITE') >= 0, true);
  esIgual('la de descuento no entra',
          DESCUENTOS_QUE_ENTRAN.indexOf('DESCUENTO 10%') >= 0, false);
}
