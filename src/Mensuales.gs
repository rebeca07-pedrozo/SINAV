/**
 * SINAV · Mensuales.gs — cargar el mes, no el año entero.
 *
 * ---------------------------------------------------------------------------
 * POR QUE EXISTE
 *
 * El año entero son 6.320 obligaciones. Aunque las pantallas filtren por mes,
 * el libro igual tiene que leer las 6.320 filas para filtrarlas, y eso se
 * siente en cada pantalla.
 *
 * Asi que OBLIGACIONES no guarda el año: guarda el mes en curso y el
 * siguiente. El 1 de cada mes entra el mes nuevo. Lo de meses anteriores que
 * ya quedo cerrado se puede archivar a mano (archivarCerradas()).
 *
 * Son del orden de 1.000 filas en vez de 6.320.
 *
 * ---------------------------------------------------------------------------
 * COMO SE USA
 *
 *   Una vez:        el menu «SINAV · Carga» -> «Programar la carga mensual»
 *                   (o correr instalarCargaMensual() desde el editor)
 *   El 1 de cada mes a las 5am: el trigger corre cargarMesVigente() solo
 *   A mano cuando sea:  cargarMesVigente()        el mes en curso y el que viene
 *                       generarMes('2026', 11)    un mes concreto
 *
 * Se puede correr las veces que haga falta: lo que ya existe NO se duplica,
 * porque el id de la obligacion sale de sus datos (municipio + impuesto +
 * periodo), no de un contador.
 *
 * ---------------------------------------------------------------------------
 * QUE NECESITA
 *
 *   La hoja CALENDARIO     con las fechas. La que ya tienes.
 *   La hoja PROGRAMACION   con los correos, NIT y responsables.
 *                          La genera cargarProgramacion(), de Carga.gs, una
 *                          sola vez. Si falta, esto avisa y no hace nada.
 */

/** Cuantos meses hacia adelante se cargan, ademas del mes en curso. */
var MESES_ADELANTE = 1;

/* ---------------------------------------------------------------------------
   LA DEL TRIGGER
   --------------------------------------------------------------------------- */

/**
 * Lo que ejecuta el trigger del dia 1. Carga el mes en curso y el siguiente.
 *
 * No pide permisos a proposito: un trigger por tiempo no tiene a nadie
 * sentado delante, corre con la cuenta de quien lo instalo, y para instalarlo
 * ya hay que tener acceso al script. Los eventos quedan firmados como
 * «sistema».
 */
function cargarMesVigente() {
  var hoy = new Date();
  var hecho = [];
  for (var k = 0; k <= MESES_ADELANTE; k++) {
    var d = new Date(hoy.getFullYear(), hoy.getMonth() + k, 1);
    hecho.push(generarMes(d.getFullYear(), d.getMonth() + 1, true));
  }
  var msg = hecho.join('\n');
  Logger.log(msg);
  return msg;
}

/* ---------------------------------------------------------------------------
   LA CARGA
   --------------------------------------------------------------------------- */

/**
 * Crea en OBLIGACIONES lo que VENCE en un mes.
 *
 *   generarMes()            el mes en curso
 *   generarMes('2026', 11)  noviembre de 2026
 *
 * El criterio es la fecha de vencimiento que trae la celda del calendario, no
 * el periodo: lo que hay que trabajar este mes es lo que se vence este mes.
 * Una declaracion de octubre que vence el 18 de noviembre entra en noviembre,
 * que es cuando toca presentarla.
 *
 * @param {number|string} anio
 * @param {number} mes 1-12
 * @param {boolean} delTrigger true para saltar la revision de permisos
 * @return {string} el resumen
 */
function generarMes(anio, mes, delTrigger) {
  if (!delTrigger) exige('configurar');

  var hoy = new Date();
  var a = Number(anio) || hoy.getFullYear();
  var m = Number(mes) || (hoy.getMonth() + 1);
  if (m < 1 || m > 12) throw new Error('Mes fuera de rango: ' + mes);

  var etiqueta = NOMBRE_MES[m - 1] + ' de ' + a;

  var arranque = new Date().getTime();
  var vig = vigenciaActual();

  // el calendario
  var cal = leerCalendario();
  var ix = cal.indices;
  var g = function (f, k) { return k in ix && ix[k] < f.length ? f[ix[k]] : ''; };
  var cols = columnasDePeriodo(cal.cabecera, vig);
  if (!cols.length) {
    throw new Error('No se reconoció ninguna columna de periodo en ' + HOJA_CALENDARIO +
      '. Los encabezados de las fechas tienen que ser fechas, no texto.');
  }

  // PROGRAMACION: quien responde, a que correo, con que NIT
  var prog = leerProgramacion();

  // lo que ya existe, para no duplicar
  var ixo = indices(HOJA.OBLIGACIONES);
  var existentes = {};
  filas(HOJA.OBLIGACIONES).forEach(function (f) {
    var id = String(f[ixo.id]).trim();
    if (id) existentes[id] = true;
  });

  var nuevas = [], eventos = [], saltadas = 0, sinRegla = 0, corto = false;

  for (var fila = 0; fila < cal.filas.length; fila++) {
    if ((new Date().getTime() - arranque) / 1000 > SEGUNDOS_MAX) { corto = true; break; }

    var f = cal.filas[fila];
    var impuesto = IMPUESTO_CALENDARIO[limpiar(g(f, 'IMPUESTO'))];
    if (!impuesto) continue;
    if (DESCUENTOS_QUE_ENTRAN.indexOf(limpiar(g(f, 'DESCUENTO PRONTO PAGO'))) < 0) continue;

    var dane = normCodigo(g(f, 'CODIGO DANE'), 5);
    var periodicidad = normPeriodicidad(g(f, 'PERIODICIDAD'));
    if (!dane || !periodicidad) continue;

    // primero mirar si esta fila vence en el mes: es el filtro mas barato y
    // descarta el 90% sin tocar PROGRAMACION
    var delMes = [];
    var periodosHechos = {};
    for (var c = 0; c < cols.length; c++) {
      var celda = cols[c].col < f.length ? f[cols[c].col] : '';
      var vence = normFecha(celda);
      if (!venceEnElMes(vence, a, m)) continue;

      var periodo = periodoDe(cols[c].anio, cols[c].mes, periodicidad);
      if (periodosHechos[periodo]) continue;      // una anual repite periodo
      periodosHechos[periodo] = true;
      delMes.push({ periodo: periodo, vence: vence });
    }
    if (!delMes.length) continue;

    var entidad = normEntidad(g(f, 'EMPRESA'));
    var regla = prog.mapa[[dane, impuesto, periodicidad, entidad].join('|')];
    if (!regla) { sinRegla++; continue; }         // no esta programada

    for (var k = 0; k < delMes.length; k++) {
      var n = normObligacion({
        cod_dane: dane,
        cod_oficina: regla.cod_oficina,
        municipio: regla.municipio,
        impuesto: impuesto,
        regimen: regla.regimen,
        periodo: delMes[k].periodo,
        periodicidad: periodicidad,
        vencimiento: delMes[k].vence,
        vigencia: vig,
        entidad: entidad,
        nit_municipio: regla.nit_municipio,
        correo_oficina: regla.correo_oficina,
        responsable: regla.responsable,
        requiere_envio: regla.requiere_envio,
        tipo_presentacion: '', paga_quien: '', forma_pago: '',
        exogena: '', incluye_retencion: '', valor: '',
        nota: ''
      });
      if (n.problemas.length) continue;
      if (existentes[n.fila.id]) { saltadas++; continue; }
      existentes[n.fila.id] = true;

      var o = n.fila;
      o.estado = ESTADO.PENDIENTE;
      o.reprocesos = 0;
      nuevas.push(COLS.OBLIGACIONES.map(function (key) {
        return o[key] === undefined || o[key] === null ? '' : o[key];
      }));
      if (o.responsable) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'carga mensual, a ' + o.responsable });
      }
    }
  }

  if (nuevas.length) {
    conCerrojo(function () {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      if (eventos.length) registrarVarios(eventos);
    });
  }

  registrar('', EVENTO.AVISO,
            'carga mensual ' + etiqueta + ': ' + nuevas.length + ' obligaciones');

  var r = etiqueta + ': ' + nuevas.length + ' obligaciones nuevas';
  if (saltadas) r += ', ' + saltadas + ' ya estaban';
  if (sinRegla) r += ', ' + sinRegla + ' filas del calendario sin programar';
  if (corto) {
    r += '.\nSe cortó por tiempo: VUELVE A CORRERLO, no duplica nada.';
  }
  return r;
}

/**
 * True si esa fecha de vencimiento cae en ese mes. Puro, para poder probarlo:
 * es el filtro del que depende todo lo demas.
 */
function venceEnElMes(fecha, anio, mes) {
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return false;
  return fecha.getFullYear() === Number(anio) &&
         fecha.getMonth() + 1 === Number(mes);
}

/** PROGRAMACION como un mapa dane|impuesto|periodicidad|entidad -> la regla. */
function leerProgramacion() {
  var hp = libro().getSheetByName(HOJA_PROGRAMACION);
  if (!hp || hp.getLastRow() < 2) {
    throw new Error('La hoja ' + HOJA_PROGRAMACION + ' está vacía. Corre una vez ' +
      'cargarProgramacion() (menú «SINAV · Carga»): de ahí salen los correos de ' +
      'las oficinas, los NIT y los responsables.');
  }
  var todo = hp.getRange(1, 1, hp.getLastRow(), hp.getLastColumn()).getValues();
  var cab = todo[0];
  var ipx = {};
  for (var i = 0; i < cab.length; i++) ipx[String(cab[i]).trim()] = i;
  ['cod_dane', 'impuesto', 'periodicidad'].forEach(function (c) {
    if (!(c in ipx)) {
      throw new Error('A ' + HOJA_PROGRAMACION + ' le falta la columna «' + c +
        '». Vuelve a correr cargarProgramacion().');
    }
  });

  var mapa = {};
  for (var r = 1; r < todo.length; r++) {
    var f = todo[r];
    var reg = {};
    COLS_PROGRAMACION.forEach(function (c) {
      reg[c] = c in ipx ? f[ipx[c]] : '';
    });
    mapa[[reg.cod_dane, reg.impuesto, reg.periodicidad, reg.entidad || ''].join('|')] = reg;
  }
  return { mapa: mapa, cuantas: todo.length - 1 };
}

/* ---------------------------------------------------------------------------
   EL TRIGGER
   --------------------------------------------------------------------------- */

var FUNCION_MENSUAL = 'cargarMesVigente';

/**
 * Deja programada la carga para el dia 1 de cada mes, de madrugada.
 *
 * Idempotente: si ya estaba programada no crea otra. Apps Script no garantiza
 * la hora exacta, sino la franja: «entre 5 y 6 de la mañana».
 */
function instalarCargaMensual() {
  exige('configurar');

  var ya = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === FUNCION_MENSUAL;
  });
  if (ya.length) {
    return 'Ya estaba programada: el día 1 de cada mes. No se creó otra.';
  }

  ScriptApp.newTrigger(FUNCION_MENSUAL)
    .timeBased()
    .onMonthDay(1)
    .atHour(5)
    .inTimezone(libro().getSpreadsheetTimeZone())
    .create();

  registrar('', EVENTO.AVISO, 'carga mensual programada para el día 1');
  return 'Programada: el día 1 de cada mes, entre 5 y 6 de la mañana, se ' +
         'cargan el mes en curso y el siguiente.\n\n' +
         'La corre la cuenta que acaba de instalarla.';
}

/** Quita la programacion. Las obligaciones ya cargadas se quedan. */
function quitarCargaMensual() {
  exige('configurar');
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === FUNCION_MENSUAL) {
      ScriptApp.deleteTrigger(t);
      n++;
    }
  });
  registrar('', EVENTO.AVISO, 'carga mensual desprogramada');
  return n ? 'Quitada. Ya no se carga sola.' : 'No había ninguna programada.';
}

/** Para saber si de verdad quedo programada, sin adivinar. */
function estadoCargaMensual() {
  var ya = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === FUNCION_MENSUAL;
  });
  var msg = ya.length
    ? 'Programada (' + ya.length + ' trigger' + (ya.length > 1 ? 's' : '') + ').'
    : 'NO está programada. Corre instalarCargaMensual().';
  Logger.log(msg);
  return msg;
}

/* ---------------------------------------------------------------------------
   ARCHIVAR LO VIEJO

   Esto es lo que mantiene el libro liviano con el paso de los meses. No borra
   nada: mueve a una hoja aparte, y solo lo que ya esta APROBADA.
   --------------------------------------------------------------------------- */

var HOJA_HISTORICO = 'HISTORICO';

/**
 * Mueve a HISTORICO las obligaciones APROBADA que vencieron antes del mes en
 * curso. Lo que sigue abierto NO se toca, por viejo que sea.
 */
function archivarCerradas() {
  exige('configurar');

  var hoy = new Date();
  var corte = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  var ixo = indices(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var mover = [], quedan = [];
  todas.forEach(function (f) {
    var v = f[ixo.vencimiento];
    var cerrada = String(f[ixo.estado]).trim() === ESTADO.APROBADA;
    if (cerrada && v instanceof Date && v < corte) mover.push(f);
    else quedan.push(f);
  });

  if (!mover.length) {
    return 'No hay nada que archivar: ninguna obligación cerrada de meses ' +
           'anteriores.';
  }

  conCerrojo(function () {
    var h = libro().getSheetByName(HOJA_HISTORICO) ||
            libro().insertSheet(HOJA_HISTORICO);
    if (h.getLastRow() < 1) {
      h.getRange(1, 1, 1, COLS.OBLIGACIONES.length)
        .setValues([COLS.OBLIGACIONES]).setFontWeight('bold');
      h.setFrozenRows(1);
    }
    h.getRange(h.getLastRow() + 1, 1, mover.length, COLS.OBLIGACIONES.length)
      .setValues(mover);

    var ho = libro().getSheetByName(HOJA.OBLIGACIONES);
    if (ho.getLastRow() > 1) {
      ho.getRange(2, 1, ho.getLastRow() - 1, COLS.OBLIGACIONES.length).clearContent();
    }
    if (quedan.length) {
      ho.getRange(2, 1, quedan.length, COLS.OBLIGACIONES.length).setValues(quedan);
    }
  });

  registrar('', EVENTO.AVISO, 'archivadas ' + mover.length + ' obligaciones cerradas');
  return mover.length + ' obligaciones cerradas se movieron a ' + HOJA_HISTORICO +
         '.\nQuedan ' + quedan.length + ' en OBLIGACIONES.\n\n' +
         'No se borró ninguna: están todas en ' + HOJA_HISTORICO + '.';
}

/* ---- menu ---------------------------------------------------------------- */

function menuMensuales() {
  SpreadsheetApp.getUi().createMenu('SINAV · Mes')
    .addItem('Cargar el mes en curso y el siguiente', 'cargarMesDesdeMenu')
    .addSeparator()
    .addItem('Programar la carga mensual (día 1)', 'instalarCargaMensualDesdeMenu')
    .addItem('¿Está programada?', 'estadoCargaMensualDesdeMenu')
    .addItem('Quitar la programación', 'quitarCargaMensualDesdeMenu')
    .addSeparator()
    .addItem('Archivar los meses cerrados', 'archivarCerradasDesdeMenu')
    .addToUi();
}

function cargarMesDesdeMenu() { avisoMensual(cargarMesVigente()); }
function instalarCargaMensualDesdeMenu() { avisoMensual(instalarCargaMensual()); }
function estadoCargaMensualDesdeMenu() { avisoMensual(estadoCargaMensual()); }
function quitarCargaMensualDesdeMenu() { avisoMensual(quitarCargaMensual()); }
function archivarCerradasDesdeMenu() { avisoMensual(archivarCerradas()); }

function avisoMensual(texto) {
  SpreadsheetApp.getUi().alert('SINAV · Carga mensual', String(texto),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}
