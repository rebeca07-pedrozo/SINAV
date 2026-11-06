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
        responsable: correo,
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
      eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                     detalle: 'asignada a ' + correo });
      if (o.soporte_id) {
        eventos.push({ id: o.id, quePaso: EVENTO.SOPORTE_CARGADO,
                       detalle: 'soporte de ejemplo' });
      }
      hechas.push(m.municipio + ' ' + caso.impuesto + ' ' + o.periodo +
                  ' (' + caso.que + ')');
    });

    if (nuevas.length) {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      registrarVarios(eventos);
    }

    var resumen = [
      nuevas.length + ' obligaciones de ejemplo asignadas a ' + correo,
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
