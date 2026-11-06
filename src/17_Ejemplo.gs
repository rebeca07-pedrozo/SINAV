/**
 * SINAV · sembrar un escenario de ejemplo.
 *
 * Para probar el flujo completo con gente real sin tener que escribir a mano
 * treinta y dos columnas por fila, ni calcular el id, que tiene que quedar
 * exactamente cod_dane|impuesto|regimen|periodo.
 *
 * ESTO ES DATO DE PRUEBA. Borra las filas antes de salir a produccion: se
 * reconocen porque la nota empieza por "EJEMPLO".
 */

var MARCA_EJEMPLO = 'EJEMPLO';

/**
 * Municipios reales con su codigo DANE, para que el escenario se parezca al
 * trabajo de verdad. El codigo de oficina es inventado pero con la forma
 * correcta: cuatro digitos, texto.
 */
/*
 * A proposito NO se usan Bogota, Medellin ni Cali: esas tres ya las crea
 * asegurarPruebas() y el id (cod_dane|impuesto|regimen|periodo) chocaria, asi
 * que la fila se saltaria y el escenario quedaria incompleto.
 * Los codigos DANE son los reales; los de oficina y los NIT son de ejemplo.
 */
var MUNICIPIOS_EJEMPLO = [
  { dane: '08001', municipio: 'Barranquilla', oficina: '0415', nit: '890102018' },
  { dane: '68001', municipio: 'Bucaramanga',  oficina: '0628', nit: '890201222' },
  { dane: '13001', municipio: 'Cartagena',    oficina: '0519', nit: '890480184' },
  { dane: '66001', municipio: 'Pereira',      oficina: '0733', nit: '891480030' },
  { dane: '17001', municipio: 'Manizales',    oficina: '0260', nit: '890801053' },
  { dane: '47001', municipio: 'Santa Marta',  oficina: '0188', nit: '891780009' }
];

/**
 * El escenario: seis obligaciones que cubren los casos que hay que ver.
 * dias es contra hoy, asi que el escenario siempre esta "fresco".
 */
var ESCENARIO_EJEMPLO = [
  // SIN RESPONSABLE: es lo que la jefa ve en Asignación y en Alertas, y lo
  // que reparte. Hasta que alguien sea el dueño, nadie la ve en su pantalla.
  { i: 0, impuesto: 'ICA',          dias: 3,   soporte: false, periodicidad: 'BIMESTRAL',
    sinAsignar: true,
    que: 'SIN RESPONSABLE y vence en 3 días — para que la jefa la asigne' },
  { i: 3, impuesto: 'ICA',          dias: 12,  soporte: false, periodicidad: 'BIMESTRAL',
    sinAsignar: true,
    que: 'SIN RESPONSABLE, con más tiempo' },

  { i: 0, impuesto: 'RETEICA',      dias: 9,   soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte, con tiempo' },
  { i: 1, impuesto: 'AUTORRETEICA', dias: 3,   soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte, vence en 3 dias' },
  { i: 2, impuesto: 'ICA',          dias: 1,   soporte: false, periodicidad: 'BIMESTRAL',
    que: 'sin soporte, vence manana' },
  { i: 3, impuesto: 'RETEICA',      dias: -4,  soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte y YA VENCIDA' },
  { i: 4, impuesto: 'AUTORRETEICA', dias: 15,  soporte: true,  periodicidad: 'MENSUAL',
    que: 'con soporte, lista para enviar' },
  { i: 5, impuesto: 'ICA',          dias: 25,  soporte: true,  periodicidad: 'BIMESTRAL',
    que: 'con soporte, lista para enviar' }
];

/** El periodo que le toca a una periodicidad, contando desde hoy. */
function periodoDeEjemplo(periodicidad) {
  var hoy = new Date();
  var anio = Number(Utilities.formatDate(hoy, TZ, 'yyyy'));
  var mes = Number(Utilities.formatDate(hoy, TZ, 'MM'));
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Siembra el escenario y se lo asigna a un profesional.
 * Desde el menu pide el correo; desde el editor se le pasa como argumento.
 *
 * Es idempotente por id: correrlo dos veces no duplica. Si quieres volver a
 * empezar, corre borrarEjemplo() primero.
 */
function sembrarEjemplo(correoProfesional) {
  var correo = normCorreo(correoProfesional);
  if (!correo) {
    throw new Error('Hace falta el correo del profesional. Ejemplo: ' +
                    'sembrarEjemplo("nombre.apellido@davivienda.com")');
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var existentes = {};
    filas(HOJA.OBLIGACIONES).forEach(function (f) {
      existentes[String(f[ix.id]).trim()] = true;
    });

    var nuevas = [], eventos = [], hechas = [], saltadas = 0;

    ESCENARIO_EJEMPLO.forEach(function (caso) {
      var m = MUNICIPIOS_EJEMPLO[caso.i];
      var vence = new Date();
      vence.setDate(vence.getDate() + caso.dias);

      var n = normObligacion({
        cod_dane: m.dane, cod_oficina: m.oficina, municipio: m.municipio,
        impuesto: caso.impuesto, regimen: 'GENERAL',
        periodo: periodoDeEjemplo(caso.periodicidad),
        periodicidad: caso.periodicidad, vencimiento: vence,
        nit_municipio: m.nit,
        // en modo PRUEBA el correo igual llega a quien envia, no a la oficina
        correo_oficina: 'oficina.' + m.municipio.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z]/g, '') + '@davivienda.com',
        responsable: caso.sinAsignar ? '' : correo,
        tipo_presentacion: 'OFICINA', paga_quien: 'OFICINA', forma_pago: '',
        requiere_envio: 'SI', exogena: '', incluye_retencion: '',
        valor: '',
        nota: MARCA_EJEMPLO + ': ' + caso.que + '. Borrar antes de producción.'
      });

      if (n.problemas.length) {
        throw new Error('El escenario de ejemplo esta mal armado (' +
                        m.municipio + '): ' + n.problemas.join('; '));
      }
      if (existentes[n.fila.id]) { saltadas++; return; }

      var o = n.fila;
      o.soporte_id = caso.soporte ? soportePrueba(o) : '';
      o.estado = o.soporte_id ? ESTADO.LISTA : ESTADO.PENDIENTE;
      o.reprocesos = 0;

      nuevas.push(COLS.OBLIGACIONES.map(function (c) {
        return o[c] === undefined || o[c] === null ? '' : o[c];
      }));
      eventos.push({ id: o.id, quePaso: EVENTO.CREADA,
                     detalle: MARCA_EJEMPLO + ': ' + caso.que });
      if (!caso.sinAsignar) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'asignada a ' + correo });
      }
      if (o.soporte_id) {
        eventos.push({ id: o.id, quePaso: EVENTO.SOPORTE_CARGADO,
                       detalle: 'soporte de ejemplo' });
      }
      hechas.push(m.municipio + ' ' + caso.impuesto + ' ' + o.periodo +
                  ' — ' + caso.que);
    });

    if (nuevas.length) {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      registrarVarios(eventos);
    }

    var conDueno = ESCENARIO_EJEMPLO.filter(function (c) { return !c.sinAsignar; }).length;
    var sinDueno = ESCENARIO_EJEMPLO.length - conDueno;

    var resumen = [
      nuevas.length + ' obligaciones de ejemplo creadas',
      '  ' + conDueno + ' asignadas a ' + correo,
      '  ' + sinDueno + ' SIN responsable, para que el JEFE las reparta ' +
        'desde la pestaña Asignación',
      '',
      saltadas ? saltadas + ' ya existían y no se duplicaron' : ''
    ].concat(hechas.map(function (h) { return '  · ' + h; }))
     .filter(String).join('\n');

    Logger.log(resumen);
    return resumen;
  });
}

/** Borra todo lo que sembró sembrarEjemplo(). No toca nada más. */
function borrarEjemplo() {
  return conCerrojo(function () {
    var h = hoja(HOJA.OBLIGACIONES);
    var ix = indices(HOJA.OBLIGACIONES);
    var f = filas(HOJA.OBLIGACIONES);
    var borradas = 0;

    // de abajo hacia arriba, para que los indices no se corran al borrar
    for (var i = f.length - 1; i >= 0; i--) {
      if (String(f[i][ix.nota] || '').indexOf(MARCA_EJEMPLO) === 0) {
        h.deleteRow(i + 2);
        borradas++;
      }
    }
    var resumen = borradas
      ? borradas + ' filas de ejemplo borradas. Los EVENTOS se quedan: son el log.'
      : 'No había filas de ejemplo.';
    Logger.log(resumen);
    return resumen;
  });
}

/** Desde el menu: pide el correo y siembra. */
function sembrarEjemploDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt(
    'Sembrar escenario de ejemplo',
    'Correo del PROFESIONAL al que se le asignan las obligaciones:\n' +
    '(tiene que estar en la hoja USUARIOS)',
    ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  try {
    ui.alert('Listo', sembrarEjemplo(r.getResponseText()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('No se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}

/* ===========================================================================
   Generador de volumen.
   El escenario de arriba son 8 filas para seguir un caso a mano. Esto llena la
   hoja con decenas, para ver como se comporta la herramienta con trabajo de
   verdad: filtros, conteos, metricas, carga masiva de un lote entero.
   =========================================================================== */

/**
 * Capitales de departamento con su codigo DANE real.
 * El codigo de oficina y el NIT del municipio son de ejemplo: el calendario
 * real trae los suyos y hay que tomarlos de ahi.
 */
var CATALOGO_MUNICIPIOS = [
  ['11001', 'Bogotá D.C.',     '0851'], ['05001', 'Medellín',        '0742'],
  ['76001', 'Cali',            '0304'], ['08001', 'Barranquilla',    '0415'],
  ['13001', 'Cartagena',       '0519'], ['68001', 'Bucaramanga',     '0628'],
  ['66001', 'Pereira',         '0733'], ['17001', 'Manizales',       '0260'],
  ['47001', 'Santa Marta',     '0188'], ['50001', 'Villavicencio',   '0394'],
  ['73001', 'Ibagué',          '0477'], ['52001', 'Pasto',           '0561'],
  ['54001', 'Cúcuta',          '0203'], ['63001', 'Armenia',         '0318'],
  ['23001', 'Montería',        '0682'], ['70001', 'Sincelejo',       '0795'],
  ['20001', 'Valledupar',      '0837'], ['19001', 'Popayán',         '0146'],
  ['41001', 'Neiva',           '0252'], ['44001', 'Riohacha',        '0909'],
  ['81001', 'Arauca',          '0371'], ['85001', 'Yopal',           '0488'],
  ['18001', 'Florencia',       '0593'], ['27001', 'Quibdó',          '0624'],
  ['15001', 'Tunja',           '0170'], ['86001', 'Mocoa',           '0745'],
  ['91001', 'Leticia',         '0812'], ['88001', 'San Andrés',      '0901'],
  ['94001', 'Inírida',         '0933'], ['95001', 'San José del Guaviare', '0957']
];

/** Cada impuesto con la periodicidad que le corresponde. */
var IMPUESTOS_GEN = [
  { impuesto: 'RETEICA',      periodicidad: 'MENSUAL' },
  { impuesto: 'AUTORRETEICA', periodicidad: 'MENSUAL' },
  { impuesto: 'ICA',          periodicidad: 'BIMESTRAL' },
  { impuesto: 'EXOGENA',      periodicidad: 'ANUAL' }
];

/**
 * Numeros pseudoaleatorios con semilla, para que correrlo dos veces con la
 * misma semilla de el mismo resultado. Con Math.random() no se podria
 * reproducir un caso raro que salga.
 */
function azarConSemilla(semilla) {
  var s = semilla || 20261106;
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** El periodo de una periodicidad, n meses hacia atras desde hoy. */
function periodoAtras(periodicidad, mesesAtras) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (mesesAtras || 0));
  var anio = d.getFullYear(), mes = d.getMonth() + 1;
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Llena OBLIGACIONES con datos de prueba variados.
 *
 *   generarObligaciones()                         60 filas, repartidas entre
 *                                                 los profesionales activos
 *   generarObligaciones(150)                      150 filas
 *   generarObligaciones(40, "ana@davivienda.com") 40, todas para Ana
 *
 * Reparte a proposito: unas vencidas, unas venciendo esta semana, unas con
 * soporte y unas sin responsable, para que los filtros y las metricas tengan
 * algo que mostrar.
 *
 * Es idempotente por id: correrlo dos veces no duplica. Todo queda marcado
 * como EJEMPLO, asi que borrarEjemplo() lo limpia.
 */
function generarObligaciones(cuantas, correoResponsable, semilla) {
  var n = Number(cuantas) || 60;
  if (n < 1 || n > 2000) throw new Error('Pide entre 1 y 2000 filas, no ' + n);

  var azar = azarConSemilla(semilla);
  var deUno = function (lista) { return lista[Math.floor(azar() * lista.length)]; };

  // a quien se le asigna
  var fijo = normCorreo(correoResponsable);
  var equipo = fijo ? [fijo] : asignables()
    .filter(function (u) { return u.rol === ROL.PROFESIONAL; })
    .map(function (u) { return u.correo; });

  if (!fijo && !equipo.length) {
    throw new Error('No hay profesionales activos en USUARIOS. ' +
      'Inscribe al menos uno, o pasa un correo: generarObligaciones(60, "correo@davivienda.com")');
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var existentes = {};
    filas(HOJA.OBLIGACIONES).forEach(function (f) {
      existentes[String(f[ix.id]).trim()] = true;
    });

    var nuevas = [], eventos = [], saltadas = 0;
    var cuenta = { sin_responsable: 0, con_soporte: 0, vencidas: 0, por_vencer: 0 };
    var intentos = 0, tope = n * 12;

    while (nuevas.length < n && intentos < tope) {
      intentos++;

      var mun = deUno(CATALOGO_MUNICIPIOS);
      var imp = deUno(IMPUESTOS_GEN);
      var atras = Math.floor(azar() * 4);               // hasta 3 meses atras
      var periodo = periodoAtras(imp.periodicidad, atras);

      // vencimiento: un 20% ya vencido, un 25% esta semana, el resto adelante
      var r = azar();
      var dias = r < 0.20 ? -(1 + Math.floor(azar() * 25))
               : r < 0.45 ? Math.floor(azar() * 5)
               : 5 + Math.floor(azar() * 40);
      var vence = new Date();
      vence.setDate(vence.getDate() + dias);

      var sinDueno = azar() < 0.18;
      var conSoporte = !sinDueno && azar() < 0.35;

      var norm = normObligacion({
        cod_dane: mun[0], cod_oficina: mun[2], municipio: mun[1],
        impuesto: imp.impuesto, regimen: 'GENERAL',
        periodo: periodo, periodicidad: imp.periodicidad, vencimiento: vence,
        nit_municipio: '89' + mun[0] + '00' + (1 + Math.floor(azar() * 8)),
        correo_oficina: 'oficina.' + mun[1].toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z]/g, '') + '@davivienda.com',
        responsable: sinDueno ? '' : deUno(equipo),
        tipo_presentacion: azar() < 0.25 ? 'VIRTUAL' : 'OFICINA',
        paga_quien: azar() < 0.3 ? 'PAGADURIA' : 'OFICINA',
        forma_pago: azar() < 0.5 ? deUno(FORMAS_PAGO) : '',
        requiere_envio: azar() < 0.08 ? 'NO' : 'SI',
        exogena: azar() < 0.3 ? 'SI' : 'NO',
        incluye_retencion: azar() < 0.3 ? 'SI' : 'NO',
        valor: azar() < 0.65
          ? Math.round((200000 + azar() * 9800000) / 50) * 50 : '',
        nota: MARCA_EJEMPLO + ': generada. Borrar antes de producción.'
      });

      if (norm.problemas.length) continue;          // combinacion invalida
      if (existentes[norm.fila.id]) { saltadas++; continue; }
      existentes[norm.fila.id] = true;

      var o = norm.fila;
      o.soporte_id = conSoporte ? soportePrueba(o) : '';
      o.estado = o.soporte_id ? ESTADO.LISTA : ESTADO.PENDIENTE;
      o.reprocesos = 0;

      nuevas.push(COLS.OBLIGACIONES.map(function (c) {
        return o[c] === undefined || o[c] === null ? '' : o[c];
      }));
      eventos.push({ id: o.id, quePaso: EVENTO.CREADA,
                     detalle: MARCA_EJEMPLO + ': generada' });
      if (o.responsable) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'asignada a ' + o.responsable });
      }

      if (!o.responsable) cuenta.sin_responsable++;
      if (o.soporte_id) cuenta.con_soporte++;
      if (dias < 0) cuenta.vencidas++;
      else if (dias <= 4) cuenta.por_vencer++;
    }

    if (nuevas.length) {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      registrarVarios(eventos);
    }

    var resumen = [
      nuevas.length + ' obligaciones generadas' +
        (fijo ? ' para ' + fijo : ' repartidas entre ' + equipo.length + ' profesionales'),
      '  ' + cuenta.vencidas + ' ya vencidas',
      '  ' + cuenta.por_vencer + ' vencen en 4 días o menos',
      '  ' + cuenta.sin_responsable + ' sin responsable (para la pestaña Asignación)',
      '  ' + cuenta.con_soporte + ' con soporte, listas para enviar',
      saltadas ? '  ' + saltadas + ' combinaciones repetidas que se saltaron' : '',
      '',
      'Todas quedan marcadas como ' + MARCA_EJEMPLO + '. Para quitarlas:',
      'menú SINAV → Datos de ejemplo → Borrar el ejemplo.'
    ].filter(String).join('\n');

    Logger.log(resumen);
    return resumen;
  });
}

/** Desde el menu: pide cuantas y las genera. */
function generarObligacionesDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Llenar OBLIGACIONES con datos de prueba',
    '¿Cuántas filas? (por ejemplo 60)\n\n' +
    'Se reparten entre los PROFESIONALES activos de la hoja USUARIOS.',
    ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  try {
    ui.alert('Listo', generarObligaciones(r.getResponseText()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('No se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}
