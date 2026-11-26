/**
 * SINAV · cargaMes.js — traer el mes del calendario a la hoja de cada uno.
 *
 * ---------------------------------------------------------------------------
 * COMO LEE EL CALENDARIO
 *
 * CALENDARIO tiene una columna por mes. El ENCABEZADO es el periodo que se
 * declara y la CELDA es la fecha de vencimiento:
 *
 *   municipio | impuesto | periodicidad | responsable | OCT-2026  | NOV-2026
 *   Nilo      | ICA      | MENSUAL      | yas@…       | 18/11/26  | 15/12/26
 *
 * Celda vacia = ese municipio no declara ese periodo. Para un bimestral solo
 * hay fecha cada dos meses, y es asi como se sabe.
 *
 * ---------------------------------------------------------------------------
 * QUE SE CORRE
 *
 *   prepararElMes()        el mes en curso, para los tres
 *   prepararElMes(2026, 11) un mes concreto
 *   cargarYasneidy()       solo lo de ella
 *
 * Se puede correr las veces que haga falta: cada obligacion se crea una sola
 * vez, identificada por su id, y lo que ya esta escrito no se pisa.
 */

var NOMBRES_MES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
                          'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/* ===========================================================================
   LEER EL CALENDARIO
   =========================================================================== */

/**
 * De que mes y año es una columna. Entiende OCT-2026, NOV 2026, 2026-11 y
 * una fecha de verdad en el encabezado.
 */
function mesDeColumna(encabezado) {
  if (encabezado instanceof Date && !isNaN(encabezado.getTime())) {
    return { anio: encabezado.getFullYear(), mes: encabezado.getMonth() + 1 };
  }
  var s = limpiar(encabezado);
  if (!s) return null;

  var m = s.match(/^(\d{4})[-\/](\d{1,2})$/);          // 2026-11
  if (m) return { anio: +m[1], mes: +m[2] };

  m = s.match(/([A-Z]{3,})[^\d]*(\d{4})/);             // OCT-2026, OCTUBRE 2026
  if (m) {
    var corto = m[1].slice(0, 3);
    var i = NOMBRES_MES_CORTOS.indexOf(corto);
    if (i >= 0) return { anio: +m[2], mes: i + 1 };
  }
  return null;
}

/** El periodo que le toca a un mes segun la periodicidad. */
function periodoDe(anio, mes, periodicidad) {
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'SEMESTRAL') return anio + '-S' + Math.ceil(mes / 6);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/** El id de una obligacion. Sale de sus datos, no de un contador. */
function idObligacion(codDane, impuesto, periodo) {
  return [normCodigo(codDane, 5), impuesto, periodo].join('|');
}

/* ===========================================================================
   LOS ADHESIVOS

   ADHESIVOS tiene una columna por mes igual que el calendario. Se cruza por
   municipio e impuesto: la columna de codigo de esa hoja trae el codigo de
   OFICINA, no el DANE, asi que no sirve para cruzar contra el calendario.
   =========================================================================== */

var _cacheAdhesivos = null;

function adhesivosDelMes(anio, mes) {
  var clave = anio + '-' + mes;
  if (_cacheAdhesivos && _cacheAdhesivos.clave === clave) return _cacheAdhesivos.mapa;

  var mapa = {};
  var h = libro().getSheetByName(HOJA.ADHESIVOS);
  if (h && h.getLastRow() > 1) {
    var todo = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
    var cab = todo[0].map(function (c) { return String(c).trim(); });

    var cMun = -1, cImp = -1, cMes = -1;
    cab.forEach(function (c, i) {
      var k = limpiar(c);
      if (cMun < 0 && k.indexOf('MUNICIPIO') >= 0) cMun = i;
      if (cImp < 0 && (k === 'OBLIGACION' || k === 'IMPUESTO')) cImp = i;
      if (cMes < 0) {
        var m = mesDeColumna(c);
        if (m && m.mes === mes) cMes = i;
        else if (!m && k.indexOf(NOMBRES_MES_CORTOS[mes - 1]) >= 0) cMes = i;
      }
    });

    if (cMun >= 0 && cMes >= 0) {
      for (var f = 1; f < todo.length; f++) {
        var mun = limpiar(todo[f][cMun]);
        if (!mun) continue;
        var adh = normAdhesivo(todo[f][cMes]);
        if (!adh) continue;
        var imp = cImp >= 0 ? (normImpuesto(todo[f][cImp]) || 'TODAS') : 'TODAS';
        mapa[mun + '|' + imp] = adh;
      }
    }
  }

  _cacheAdhesivos = { clave: clave, mapa: mapa };
  return mapa;
}

function adhesivoDe(municipio, impuesto, anio, mes) {
  var mapa = adhesivosDelMes(anio, mes);
  var mun = limpiar(municipio);
  return mapa[mun + '|' + impuesto] || mapa[mun + '|TODAS'] || '';
}

/* ===========================================================================
   EL CONSECUTIVO DE GIRO

   Revisoria busca estos numeros, asi que no se inventan: cada municipio tiene
   el suyo, fijo, y lo unico que cambia de un periodo a otro es el mes.

   Si CODIGOSYCORREOS trae una columna 'consecutivo', esa manda: asi se puede
   corregir un numero sin tocar el codigo.
   =========================================================================== */

/** Cambia el mes de una plantilla y deja prefijo y numero igual. */
function giroConMes(plantilla, mes) {
  var partes = String(plantilla || '').trim().split('-');
  if (partes.length < 3 || !mes) return String(plantilla || '').trim();
  partes[partes.length - 2] = mes < 10 ? '0' + mes : String(mes);
  return partes.join('-');
}

/** El consecutivo de una obligacion, con el mes de SU periodo. */
function consecutivoDe(datos, anio, mes) {
  var plantilla = String((datos || {}).consecutivo || '').trim();
  return plantilla ? giroConMes(plantilla, mes) : '';
}

/* ===========================================================================
   LA CARGA
   =========================================================================== */

/**
 * Trae el mes a las hojas de todos los profesionales declarados.
 *
 *   prepararElMes()          el mes en curso
 *   prepararElMes(2026, 11)  uno concreto
 */
function prepararElMes(anio, mes) {
  exige('configurar');

  var hoy = new Date();
  var a = Number(anio) || hoy.getFullYear();
  var m = Number(mes) || (hoy.getMonth() + 1);

  var lista = profesionales();
  if (!lista.length) {
    throw new Error('No hay profesionales declarados. Pega yasneidy.js, ' +
                    'jesus.js y helen.js.');
  }

  var l = ['SINAV · ' + NOMBRE_MES[m - 1] + ' de ' + a, ''];
  lista.forEach(function (p) {
    l.push(cargarProfesional(p, a, m));
    l.push('');
  });

  registrar('', EVENTO.AVISO, 'mes preparado: ' + a + '-' + m);
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/**
 * Trae a la hoja de UNA persona lo que le toca del mes.
 *
 * Lee el calendario entero una vez, se queda con sus filas y escribe de un
 * golpe. Con 1.478 filas de calendario eso es una lectura y una escritura,
 * no mil quinientas.
 */
function cargarProfesional(perfil, anio, mes) {
  var hoy = new Date();
  var a = Number(anio) || hoy.getFullYear();
  var m = Number(mes) || (hoy.getMonth() + 1);

  var hc = libro().getSheetByName(HOJA.CALENDARIO);
  if (!hc || hc.getLastRow() < 2) {
    return perfil.hoja + ': CALENDARIO está vacío.';
  }

  var todo = hc.getRange(1, 1, hc.getLastRow(), hc.getLastColumn()).getValues();
  var cab = todo[0].map(function (c) { return String(c).trim(); });
  var ix = {};
  cab.forEach(function (c, i) { if (c && !(c in ix)) ix[c] = i; });

  ['municipio', 'cod_dane', 'impuesto', 'periodicidad', 'responsable']
    .forEach(function (c) {
      if (!(c in ix)) throw new Error('A CALENDARIO le falta la columna «' + c + '».');
    });

  // la columna del mes que toca
  var colMes = -1;
  cab.forEach(function (c, i) {
    if (colMes >= 0) return;
    var p = mesDeColumna(todo[0][i]);
    if (p && p.anio === a && p.mes === m) colMes = i;
  });
  if (colMes < 0) {
    return perfil.hoja + ': CALENDARIO no tiene columna para ' +
           NOMBRE_MES[m - 1] + ' de ' + a + '. Los encabezados dicen: ' +
           cab.slice(5).join(', ');
  }

  // lo que ya existe en su hoja, para no duplicar
  var ixh = indices(perfil.hoja);
  var existentes = {};
  filas(perfil.hoja).forEach(function (f) {
    var id = String(f[ixh.id] || '').trim();
    if (id) existentes[id] = true;
  });

  var correo = String(perfil.correo).toLowerCase();
  var nuevas = [], eventos = [], sinDatos = {}, saltadas = 0;

  for (var f = 1; f < todo.length; f++) {
    var fila = todo[f];
    if (String(fila[ix.responsable] || '').trim().toLowerCase() !== correo) continue;

    var vence = normFecha(fila[colMes]);
    if (!vence) continue;                 // no declara ese periodo

    var impuesto = normImpuesto(fila[ix.impuesto]);
    var periodicidad = normPeriodicidad(fila[ix.periodicidad]);
    var dane = normCodigo(fila[ix.cod_dane], 5);
    if (!impuesto || !periodicidad || !dane) continue;

    var periodo = periodoDe(a, m, periodicidad);
    var id = idObligacion(dane, impuesto, periodo);
    if (existentes[id]) { saltadas++; continue; }
    existentes[id] = true;

    var datos = datosDe(dane, impuesto);
    if (!datos.correos && !datos.cod_oficina) {
      sinDatos[dane + ' ' + String(fila[ix.municipio])] = true;
    }

    var o = {
      id: id,
      cod_dane: dane,
      municipio: String(fila[ix.municipio] || '').trim(),
      impuesto: impuesto,
      periodicidad: periodicidad,
      periodo: periodo,
      vencimiento: vence,
      nit: 'nit' in ix ? normCodigo(fila[ix.nit]) : '',
      cod_oficina: datos.cod_oficina,
      correos: datos.correos,
      forma_pago: datos.forma_pago,
      consecutivo: consecutivoDe(datos, a, m),
      adhesivo: adhesivoDe(fila[ix.municipio], impuesto, a, m),
      valor: '',
      estado: ESTADO.PENDIENTE,
      soporte_id: '', soporte_revisado: '', hilo_id: '', sellado_id: '',
      fecha_envio: '', fecha_respuesta: '', ultimo_mensaje: '', nota: ''
    };

    nuevas.push(COLS_MES.map(function (c) {
      return o[c] === undefined || o[c] === null ? '' : o[c];
    }));
    eventos.push({ id: id, quePaso: EVENTO.CREADA,
                   detalle: o.municipio + ' ' + impuesto + ' ' + periodo });
  }

  if (nuevas.length) {
    conCerrojo(function () {
      agregarFilas(perfil.hoja, nuevas);
      registrarVarios(eventos);
    });
  }

  var r = [perfil.hoja + ': ' + nuevas.length + ' obligaciones nuevas' +
           (saltadas ? ', ' + saltadas + ' ya estaban' : '') + '.'];
  var faltan = Object.keys(sinDatos);
  if (faltan.length) {
    r.push('   ' + faltan.length + ' municipios sin correo ni dependencia en ' +
           'CODIGOSYCORREOS. La pantalla pedirá el correo al enviarlas:');
    faltan.sort().slice(0, 10).forEach(function (x) { r.push('      ' + x); });
    if (faltan.length > 10) r.push('      … y ' + (faltan.length - 10) + ' más');
  }
  return r.join('\n');
}

/* ===========================================================================
   MANTENIMIENTO
   =========================================================================== */

/**
 * Quita de las hojas lo que ya esta cerrado y vencido hace mas de un mes.
 *
 * Lo que sigue abierto NO se toca, por viejo que sea: una obligacion de marzo
 * sin cerrar tiene que seguir a la vista. Y nada se borra sin dejar rastro:
 * cada fila que sale queda anotada en EVENTOS con su id.
 */
function limpiarMesesViejos() {
  exige('configurar');

  var hoy = new Date();
  var corte = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  var l = [];

  profesionales().forEach(function (p) {
    var h = libro().getSheetByName(p.hoja);
    if (!h || h.getLastRow() < 2) { l.push(p.hoja + ': vacía.'); return; }

    var ix = indices(p.hoja);
    var datos = filas(p.hoja);
    var quedan = [], fuera = [];

    datos.forEach(function (f) {
      var v = normFecha(f[ix.vencimiento]);
      var cerrada = String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA;
      if (cerrada && v && v < corte) fuera.push(String(f[ix.id]));
      else quedan.push(f);
    });

    if (!fuera.length) { l.push(p.hoja + ': nada que archivar.'); return; }

    conCerrojo(function () {
      if (h.getLastRow() > 1) {
        h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).clearContent();
      }
      if (quedan.length) {
        h.getRange(2, 1, quedan.length, quedan[0].length).setValues(quedan);
      }
      registrarVarios(fuera.map(function (id) {
        return { id: id, quePaso: EVENTO.AVISO, detalle: 'archivada de ' + p.hoja };
      }));
    });

    l.push(p.hoja + ': ' + fuera.length + ' cerradas archivadas, ' +
           quedan.length + ' siguen.');
  });

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/** Deja el activador del dia 1 puesto. Idempotente. */
function programarCargaMensual() {
  exige('configurar');

  var ya = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'prepararElMes';
  });
  if (ya.length) return 'Ya estaba programada para el día 1. No se creó otra.';

  ScriptApp.newTrigger('prepararElMes')
    .timeBased().onMonthDay(1).atHour(5)
    .inTimezone(libro().getSpreadsheetTimeZone())
    .create();

  registrar('', EVENTO.AVISO, 'carga mensual programada');
  return 'Programada: el día 1 de cada mes, entre 5 y 6 de la mañana.\n' +
         'La corre la cuenta que acaba de instalarla.';
}

/** Para saber si de verdad quedó, sin adivinar. */
function estadoCargaMensual() {
  var ya = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'prepararElMes';
  });
  var txt = ya.length ? 'Programada (' + ya.length + ').'
                      : 'NO está programada. Corre programarCargaMensual().';
  Logger.log(txt);
  return txt;
}
