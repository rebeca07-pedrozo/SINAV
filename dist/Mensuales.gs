// AUTOGENERADO por build.js a partir de src/Mensuales.gs.
// No editar a mano: edita src/ y corre `npm run build`.

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
    .addItem('Refrescar los correos de oficina', 'refrescarCorreosDesdeMenu')
    .addItem('Arreglar EXOGENA (REVISAR → SI)', 'arreglarExogenaDesdeMenu')
    .addItem('Repartir los adhesivos del mes', 'repartirAdhesivosDesdeMenu')
    .addSeparator()
    .addItem('Programar la carga mensual (día 1)', 'instalarCargaMensualDesdeMenu')
    .addItem('¿Está programada?', 'estadoCargaMensualDesdeMenu')
    .addItem('Quitar la programación', 'quitarCargaMensualDesdeMenu')
    .addSeparator()
    .addItem('Archivar los meses cerrados', 'archivarCerradasDesdeMenu')
    .addToUi();
}

function cargarMesDesdeMenu() { avisoMensual(cargarMesVigente()); }
function refrescarCorreosDesdeMenu() { avisoMensual(refrescarCorreos()); }
function arreglarExogenaDesdeMenu() { avisoMensual(arreglarExogena()); }
function repartirAdhesivosDesdeMenu() { avisoMensual(repartirAdhesivos()); }
function instalarCargaMensualDesdeMenu() { avisoMensual(instalarCargaMensual()); }
function estadoCargaMensualDesdeMenu() { avisoMensual(estadoCargaMensual()); }
function quitarCargaMensualDesdeMenu() { avisoMensual(quitarCargaMensual()); }
function archivarCerradasDesdeMenu() { avisoMensual(archivarCerradas()); }

function avisoMensual(texto) {
  SpreadsheetApp.getUi().alert('SINAV · Carga mensual', String(texto),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------------------------------------------------------------------------
   REFRESCAR LOS CORREOS DE OFICINA

   De 315 municipios solo 98 tenian correo. El equipo los va llenando en
   PROGRAMACION, que es la hoja que manda. Pero las obligaciones que YA se
   crearon se quedaron con el correo vacio: nacieron antes.

   Esto baja el correo de PROGRAMACION a las obligaciones que siguen abiertas,
   para que nadie tenga que escribirlo dos veces.
   --------------------------------------------------------------------------- */

/** Las obligaciones ya cerradas no se tocan: su correo es historia. */
var ESTADOS_CERRADOS_REFRESCO = ['APROBADA'];

/**
 * Copia correo_oficina (y el NIT, si falta) de PROGRAMACION a las
 * obligaciones abiertas que lo tengan vacio.
 *
 * NO pisa un correo ya escrito: si alguien lo puso a mano en la obligacion,
 * ese gana, y si no coincide con PROGRAMACION se reporta para que alguien
 * decida. Se puede correr las veces que haga falta.
 */
function refrescarCorreos() {
  exige('configurar');

  var prog = leerProgramacion();
  var ix = indices(HOJA.OBLIGACIONES);
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var puestos = 0, siguenSin = [], distintos = [], correos = [], nits = [];

  todas.forEach(function (f, i) {
    var estado = String(f[ix.estado] || '').trim().toUpperCase();
    if (ESTADOS_CERRADOS_REFRESCO.indexOf(estado) >= 0) return;

    var quien = String(f[ix.municipio]) + ' · ' + String(f[ix.impuesto]) +
                ' · ' + String(f[ix.periodo]);
    var clave = [String(f[ix.cod_dane] || '').trim(),
                 String(f[ix.impuesto] || '').trim(),
                 String(f[ix.periodicidad] || '').trim(),
                 String(f[ix.entidad] || '').trim()].join('|');
    var regla = prog.mapa[clave];
    var deProg = regla ? normCorreos(regla.correo_oficina) : '';
    var actual = normCorreos(f[ix.correo_oficina]);

    if (!actual && deProg) {
      correos.push({ fila: i + 2, valor: deProg });
      if (!String(f[ix.nit_municipio] || '').trim() && regla.nit_municipio) {
        nits.push({ fila: i + 2, valor: String(regla.nit_municipio) });
      }
      puestos++;
    } else if (!actual && !deProg) {
      siguenSin.push(quien);
    } else if (actual && deProg && actual !== deProg) {
      distintos.push(quien + ': la obligación dice ' + actual +
                     ' y PROGRAMACION dice ' + deProg);
    }
  });

  if (correos.length) {
    conCerrojo(function () {
      correos.forEach(function (c) {
        h.getRange(c.fila, ix.correo_oficina + 1).setValue(c.valor);
      });
      nits.forEach(function (c) {
        h.getRange(c.fila, ix.nit_municipio + 1).setValue(c.valor);
      });
    });
    registrar('', EVENTO.AVISO, 'correos de oficina refrescados: ' + puestos);
  }

  var l = [puestos + ' obligaciones recibieron el correo de su oficina.'];
  if (nits.length) l.push(nits.length + ' recibieron además el NIT que les faltaba.');

  if (siguenSin.length) {
    l.push('', siguenSin.length + ' siguen sin correo porque PROGRAMACION tampoco');
    l.push('lo tiene. Esas son las que hay que averiguar y escribir allí:');
    var vistos = {};
    siguenSin.forEach(function (x) {
      var mun = x.split(' · ')[0];
      if (!vistos[mun]) { vistos[mun] = true; }
    });
    Object.keys(vistos).sort().slice(0, 30).forEach(function (m) { l.push('   ' + m); });
    var n = Object.keys(vistos).length;
    if (n > 30) l.push('   … y ' + (n - 30) + ' municipios más');
  }

  if (distintos.length) {
    l.push('', 'No se tocaron estas, porque ya tenían un correo distinto escrito');
    l.push('a mano. Decide cuál vale:');
    distintos.slice(0, 10).forEach(function (x) { l.push('   ' + x); });
    if (distintos.length > 10) l.push('   … y ' + (distintos.length - 10) + ' más');
  }

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/**
 * EXOGENA (medios magnéticos) nacio marcada como REVISAR, por si no se
 * mandaba por correo. Se manda igual que las demas, asi que esto lo corrige
 * en PROGRAMACION y en las obligaciones que siguen abiertas.
 *
 * Si algun municipio concreto NO la recibe por correo, se le pone NO a mano
 * en su fila de PROGRAMACION: eso si se respeta y no se toca.
 */
function arreglarExogena() {
  exige('configurar');

  var cambios = [];

  // PROGRAMACION
  var hp = libro().getSheetByName(HOJA_PROGRAMACION);
  if (hp && hp.getLastRow() > 1) {
    var cab = hp.getRange(1, 1, 1, hp.getLastColumn()).getValues()[0];
    var col = -1;
    for (var i = 0; i < cab.length; i++) {
      if (String(cab[i]).trim() === 'requiere_envio') col = i;
    }
    if (col >= 0) {
      var vals = hp.getRange(2, col + 1, hp.getLastRow() - 1, 1).getValues();
      var n = 0;
      for (var r = 0; r < vals.length; r++) {
        if (String(vals[r][0]).trim().toUpperCase() === 'REVISAR') {
          vals[r][0] = 'SI';
          n++;
        }
      }
      if (n) hp.getRange(2, col + 1, vals.length, 1).setValues(vals);
      cambios.push(n + ' reglas de PROGRAMACION pasaron de REVISAR a SI');
    }
  }

  // OBLIGACIONES abiertas
  var ix = indices(HOJA.OBLIGACIONES);
  var ho = libro().getSheetByName(HOJA.OBLIGACIONES);
  var abiertas = 0;
  filas(HOJA.OBLIGACIONES).forEach(function (f, i) {
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;
    if (String(f[ix.requiere_envio] || '').trim().toUpperCase() !== 'REVISAR') return;
    ho.getRange(i + 2, ix.requiere_envio + 1).setValue('SI');
    abiertas++;
  });
  cambios.push(abiertas + ' obligaciones abiertas pasaron de REVISAR a SI');

  registrar('', EVENTO.AVISO, 'EXOGENA: REVISAR -> SI');
  var txt = cambios.join('\n') + '\n\nLas que tengan NO escrito a mano se quedan como están.';
  Logger.log(txt);
  return txt;
}

/* ---------------------------------------------------------------------------
   LOS ADHESIVOS DE CORRESPONDENCIA

   El archivo de correspondencia trae, por municipio e impuesto, una columna
   por mes con el numero del adhesivo con el que viaja el sobre:

     MUNICIPIO | PERIODICIDAD | DEPENDENCIA | CONCEPTO | ADHESIVO Ene | ...
     AMAGA     | BIMESTRAL    | 3974        | AUTORRE. | 55285088     | ...

   Se pega esa hoja en una pestana llamada ADHESIVOS y esto reparte la columna
   del mes que toque entre las obligaciones de ese mes.
   --------------------------------------------------------------------------- */

var HOJA_ADHESIVOS = 'ADHESIVOS';

/** Como se llama cada impuesto en la hoja de correspondencia. */
var CONCEPTO_IMPUESTO = {
  'RETEICA': 'RETEICA',
  'RETENCION ICA': 'RETEICA',
  'AUTORRETENCION ICA': 'AUTORRETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'ICA': 'ICA',
  'ICA ANUAL': 'ICA',
  'MEDIOS MAGNETICOS': 'EXOGENA',
  'EXOGENA': 'EXOGENA'
};

/** 'ADHESIVO Sept' -> 9. Devuelve 0 si el encabezado no nombra un mes. */
function mesDeEncabezado(texto) {
  var t = limpiar(texto);
  if (t.indexOf('ADHESIVO') < 0 && t.indexOf('LABEL') < 0) return 0;
  var meses = [
    ['ENE', 1], ['FEB', 2], ['MAR', 3], ['ABR', 4], ['MAY', 5], ['JUN', 6],
    ['JUL', 7], ['AGO', 8], ['SEP', 9], ['OCT', 10], ['NOV', 11], ['DIC', 12]
  ];
  for (var i = 0; i < meses.length; i++) {
    if (t.indexOf(meses[i][0]) >= 0) return meses[i][1];
  }
  return 0;
}

/** Un adhesivo de verdad es un numero largo, no 'REGISTRADO EN CARTERO'. */
function adhesivoValido(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return '';
  if (s.indexOf('#N/A') >= 0) return '';
  var soloDigitos = s.replace(/\.0+$/, '').replace(/[^\d]/g, '');
  if (soloDigitos.length < 6) return '';
  return soloDigitos;
}

/**
 * Reparte los adhesivos de un mes entre las obligaciones de ese mes.
 *
 *   repartirAdhesivos()        el mes en curso
 *   repartirAdhesivos(2026, 11) uno concreto
 *
 * Cruza por municipio + impuesto. No pisa un adhesivo ya escrito: si alguien
 * lo corrigio a mano, ese gana.
 */
function repartirAdhesivos(anio, mes) {
  exige('configurar');

  var hoy = new Date();
  var a = Number(anio) || hoy.getFullYear();
  var m = Number(mes) || (hoy.getMonth() + 1);

  var h = libro().getSheetByName(HOJA_ADHESIVOS);
  if (!h || h.getLastRow() < 2) {
    throw new Error('Falta la hoja ' + HOJA_ADHESIVOS + ' o está vacía. Pega ahí ' +
      'la hoja del archivo de correspondencia, con sus encabezados en la fila 1 ' +
      '(MUNICIPIO, CONCEPTO y una columna ADHESIVO por mes).');
  }

  var todo = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var cab = todo[0];

  var colMun = -1, colConcepto = -1, colMes = -1;
  for (var i = 0; i < cab.length; i++) {
    var k = limpiar(cab[i]);
    if (colMun < 0 && k.indexOf('MUNICIPIO') >= 0) colMun = i;
    if (colConcepto < 0 && (k === 'CONCEPTO' || k === 'IMPUESTO')) colConcepto = i;
    if (colMes < 0 && mesDeEncabezado(cab[i]) === m) colMes = i;
  }
  if (colMun < 0) throw new Error('No encontré la columna del municipio en ' + HOJA_ADHESIVOS + '.');
  if (colMes < 0) {
    throw new Error('No hay una columna de adhesivos para ' + NOMBRE_MES[m - 1] +
      ' en ' + HOJA_ADHESIVOS + '. Los encabezados tienen que decir, por ejemplo, ' +
      '«ADHESIVO ' + NOMBRE_MES[m - 1].slice(0, 3) + '».');
  }

  // municipio|impuesto -> adhesivo
  var mapa = {}, sinConcepto = 0;
  for (var r = 1; r < todo.length; r++) {
    var mun = limpiar(todo[r][colMun]);
    if (!mun) continue;
    var adh = adhesivoValido(todo[r][colMes]);
    if (!adh) continue;
    var imp = colConcepto >= 0
      ? (CONCEPTO_IMPUESTO[limpiar(todo[r][colConcepto])] || '') : '';
    if (!imp) sinConcepto++;
    mapa[mun + '|' + imp] = adh;
  }

  // repartir entre las obligaciones que vencen en ese mes
  var ix = indices(HOJA.OBLIGACIONES);
  var ho = libro().getSheetByName(HOJA.OBLIGACIONES);
  var puestos = 0, yaTenian = 0, sinPareja = {};

  filas(HOJA.OBLIGACIONES).forEach(function (f, k) {
    var vence = f[ix.vencimiento];
    if (!venceEnElMes(vence instanceof Date ? vence : normFecha(vence), a, m)) return;
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;
    if (String(f[ix.adhesivo] || '').trim()) { yaTenian++; return; }

    var mun = limpiar(f[ix.municipio]);
    var imp = String(f[ix.impuesto] || '').trim();
    var adh = mapa[mun + '|' + imp] || mapa[mun + '|'];
    if (!adh) { sinPareja[mun + ' · ' + imp] = true; return; }

    ho.getRange(k + 2, ix.adhesivo + 1).setValue(adh);
    puestos++;
  });

  if (puestos) registrar('', EVENTO.AVISO, 'adhesivos repartidos: ' + puestos);

  var l = [NOMBRE_MES[m - 1] + ' de ' + a + ': ' + puestos + ' adhesivos escritos.'];
  if (yaTenian) l.push(yaTenian + ' ya tenían uno y no se tocaron.');
  if (sinConcepto) {
    l.push(sinConcepto + ' filas de ' + HOJA_ADHESIVOS + ' no dicen de qué impuesto ' +
           'son; valen para cualquiera de ese municipio.');
  }
  var faltan = Object.keys(sinPareja);
  if (faltan.length) {
    l.push('', faltan.length + ' obligaciones del mes se quedaron sin adhesivo:');
    faltan.sort().slice(0, 25).forEach(function (x) { l.push('   ' + x); });
    if (faltan.length > 25) l.push('   … y ' + (faltan.length - 25) + ' más');
  }
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}
