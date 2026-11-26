/**
 * SINAV · Reemplazo.gs — cuando alguien sale del equipo.
 *
 * ---------------------------------------------------------------------------
 * NO ES SOLO CAMBIAR EL RESPONSABLE
 *
 * Quien sale deja tres rastros:
 *
 *   1. el responsable en PROGRAMACION, de donde nacen los meses siguientes
 *   2. el responsable en las obligaciones que siguen abiertas
 *   3. SUS INICIALES en el consecutivo de giro: AG-10-74 es de Andrea Galvis
 *
 * El tercero es el que se olvida. Si no se cambia, los giros de quien ya no
 * trabaja siguen saliendo con sus iniciales durante meses.
 *
 * El numero NO se toca: es del municipio, no de la persona. AGUACHICA es el
 * 01 lo declare quien lo declare, y asi lo tienen las dos tablas que mandaron
 * (de 128 municipios comunes, 126 con el mismo numero). Por eso cambiar
 * AG-10-01 por LR-10-01 da exactamente la numeracion que ya usaba Liliana.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SE TOCA
 *
 * Las obligaciones APROBADA. Son historia: tienen que seguir diciendo quien
 * las hizo y con que consecutivo se giraron, o la conciliacion de meses
 * anteriores deja de cuadrar.
 */

/**
 * Pasa a otra persona todo lo de alguien que sale.
 *
 *   reemplazar('andrea@davivienda.com', 'liliana@davivienda.com', 'AG', 'LR')
 *
 * Los dos ultimos son los prefijos del consecutivo. Si se dejan vacios, los
 * consecutivos no se tocan y solo cambia el responsable.
 */
function reemplazar(correoSale, correoEntra, prefijoViejo, prefijoNuevo) {
  exige('configurar');

  var sale = String(correoSale || '').trim().toLowerCase();
  var entra = String(correoEntra || '').trim().toLowerCase();
  if (!sale || !entra) {
    throw new Error('Hacen falta los dos correos.\n' +
      'Corre listarUsuarios() para ver cómo están escritos en USUARIOS.');
  }
  if (sale === entra) throw new Error('Son el mismo correo.');

  var viejo = String(prefijoViejo || '').trim().toUpperCase();
  var nuevo = String(prefijoNuevo || '').trim().toUpperCase();

  var l = ['Reemplazo: ' + sale + '  ->  ' + entra];
  if (viejo && nuevo) l.push('Consecutivos: ' + viejo + '-…  ->  ' + nuevo + '-…');
  l.push('');

  l.push(enProgramacionReemplazo(sale, entra, viejo, nuevo));
  l.push(enObligacionesReemplazo(sale, entra, viejo, nuevo));
  l.push('');
  l.push('Las APROBADAS no se tocaron: siguen diciendo quién las hizo.');
  l.push('Ahora, en la hoja USUARIOS: pon activo = NO a ' + sale + ' y revisa');
  l.push('la columna backup, que puede apuntar a alguien que ya no está.');

  registrar('', EVENTO.AVISO, 'reemplazo ' + sale + ' -> ' + entra);
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/** Cambia el prefijo de un consecutivo y deja el mes y el numero igual. */
function cambiarPrefijo(consecutivo, viejo, nuevo) {
  var s = String(consecutivo || '').trim();
  if (!s || !viejo || !nuevo) return s;
  var partes = s.split('-');
  if (partes.length < 3) return s;
  // el prefijo es todo lo que va antes del mes y del numero
  var pre = partes.slice(0, partes.length - 2).join('-').toUpperCase();
  if (pre !== viejo) return s;
  return nuevo + '-' + partes[partes.length - 2] + '-' + partes[partes.length - 1];
}

/** PROGRAMACION: responsable y plantilla del consecutivo. */
function enProgramacionReemplazo(sale, entra, viejo, nuevo) {
  var h = libro().getSheetByName(HOJA_PROGRAMACION);
  if (!h || h.getLastRow() < 2) return 'PROGRAMACION está vacía: no se tocó.';

  var ancho = h.getLastColumn();
  var cab = h.getRange(1, 1, 1, ancho).getValues()[0]
             .map(function (v) { return String(v).trim(); });
  var cResp = cab.indexOf('responsable');
  var cCons = cab.indexOf('consecutivo');
  var n = h.getLastRow() - 1;
  var datos = h.getRange(2, 1, n, ancho).getValues();

  var resp = 0, cons = 0;
  for (var i = 0; i < n; i++) {
    if (cResp >= 0 && String(datos[i][cResp] || '').trim().toLowerCase() === sale) {
      datos[i][cResp] = entra;
      resp++;
    }
    if (cCons >= 0 && viejo && nuevo) {
      var antes = datos[i][cCons];
      var despues = cambiarPrefijo(antes, viejo, nuevo);
      if (despues !== String(antes || '').trim()) { datos[i][cCons] = despues; cons++; }
    }
  }
  if (resp || cons) h.getRange(2, 1, n, ancho).setValues(datos);

  return 'PROGRAMACION: ' + resp + ' reglas cambiaron de responsable y ' +
         cons + ' consecutivos de prefijo.';
}

/** Las obligaciones abiertas: responsable y consecutivo ya con su mes. */
function enObligacionesReemplazo(sale, entra, viejo, nuevo) {
  var ix = indices(HOJA.OBLIGACIONES);
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var eventos = [], resp = 0, cons = 0, enviadas = 0;

  filas(HOJA.OBLIGACIONES).forEach(function (f, k) {
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;
    var fila = k + 2;

    if (String(f[ix.responsable] || '').trim().toLowerCase() === sale) {
      h.getRange(fila, ix.responsable + 1).setValue(entra);
      if (String(f[ix.titular_original] || '').trim()) {
        // el titular ya no trabaja: no hay a quien devolversela
        h.getRange(fila, ix.titular_original + 1).setValue('');
      }
      eventos.push({ id: String(f[ix.id]), quePaso: EVENTO.ASIGNADA,
                     detalle: 'reemplazo: de ' + sale + ' a ' + entra });
      resp++;
    }

    if (viejo && nuevo) {
      var antes = String(f[ix.consecutivo_giro] || '').trim();
      var despues = cambiarPrefijo(antes, viejo, nuevo);
      if (despues !== antes) {
        // si ya salio el correo, el consecutivo viajo en el asunto: cambiarlo
        // dejaria la hoja diciendo una cosa y el correo otra
        if (String(f[ix.hilo_id] || '').trim()) { enviadas++; return; }
        h.getRange(fila, ix.consecutivo_giro + 1).setValue(despues);
        cons++;
      }
    }
  });

  if (eventos.length) registrarVarios(eventos);

  var r = 'OBLIGACIONES: ' + resp + ' abiertas cambiaron de responsable y ' +
          cons + ' de consecutivo.';
  if (enviadas) {
    r += '\n' + enviadas + ' ya tenían el correo enviado: se dejaron como estaban,';
    r += '\nporque ese consecutivo ya viajó en el asunto.';
  }
  return r;
}

/** Los usuarios tal como estan escritos, para no equivocarse de correo. */
function listarUsuarios() {
  var ix = indices(HOJA.USUARIOS);
  var l = ['USUARIOS:'];
  filas(HOJA.USUARIOS).forEach(function (f) {
    var correo = String(f[ix.correo] || '').trim();
    if (!correo) return;
    l.push('   ' + correo +
           '   ' + String(f[ix.nombre] || '') +
           '   ' + String(f[ix.rol] || '') +
           ('nivel' in ix ? '-' + String(f[ix.nivel] || '') : '') +
           '   activo: ' + String(f[ix.activo] || ''));
  });
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/* ---- menu ---------------------------------------------------------------- */

function menuReemplazo() {
  SpreadsheetApp.getUi().createMenu('SINAV · Reemplazo')
    .addItem('Ver los usuarios y sus correos', 'listarUsuariosDesdeMenu')
    .addItem('Reemplazar a una persona', 'reemplazarDesdeMenu')
    .addToUi();
}

function listarUsuariosDesdeMenu() {
  SpreadsheetApp.getUi().alert('SINAV · usuarios', listarUsuarios(),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Pregunta los datos en vez de obligar a escribir codigo. Se puede dejar en
 * blanco el prefijo si solo hay que cambiar el responsable.
 */
function reemplazarDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var pide = function (que) {
    var r = ui.prompt('SINAV · reemplazo', que, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return null;
    return r.getResponseText().trim();
  };

  var sale = pide('Correo de quien SALE (como está en USUARIOS):');
  if (sale === null) return;
  var entra = pide('Correo de quien ENTRA:');
  if (entra === null) return;
  var viejo = pide('Prefijo viejo del consecutivo (AG). Vacío para no tocarlos:');
  if (viejo === null) return;
  var nuevo = viejo ? pide('Prefijo nuevo (LR):') : '';
  if (nuevo === null) return;

  try {
    ui.alert('SINAV · reemplazo', reemplazar(sale, entra, viejo, nuevo),
             ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('SINAV · no se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}
