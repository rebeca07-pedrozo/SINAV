/**
 * SINAV · ENTORNO.js — en qué modo está y cómo cambiarlo.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTE ARCHIVO NO DEPENDE DE NINGUN OTRO
 *
 * Esto es el interruptor de emergencia. Si el dia que algo sale mal hubiera
 * que cargar medio programa para poder apagarlo, no serviria de nada. Asi
 * que lee y escribe CONFIG por su cuenta, con cuatro lineas, y funciona
 * aunque el resto del codigo este roto o a medio pegar.
 *
 * ---------------------------------------------------------------------------
 * LOS DOS MODOS
 *
 *   PRUEBA       los correos llegan a la bandeja de quien envia.
 *                Ninguna alcaldia recibe nada. Es el valor por defecto.
 *
 *   PRODUCCION   los correos salen de verdad a las oficinas.
 *                Lo enviado no se puede desenviar.
 *
 * El codigo nunca cambia el modo solo. Se cambia aqui, a proposito, y queda
 * registrado quien lo hizo y cuando.
 */

var HOJA_CONFIG = 'CONFIG';

/* ---------------------------------------------------------------------------
   LO QUE SE USA TODOS LOS DIAS
   --------------------------------------------------------------------------- */

/** En que modo esta ahora. */
function entorno() {
  return (leerParametro('modo') || 'PRUEBA').toUpperCase();
}

function esProduccion() { return entorno() === 'PRODUCCION'; }
function esPrueba() { return !esProduccion(); }

/** Pasa a PRUEBA. Los correos vuelven a la bandeja propia. */
function aPruebas() {
  return cambiarEntorno('PRUEBA');
}

/** Pasa a PRODUCCION. Desde ese momento los correos salen a las oficinas. */
function aProduccion() {
  return cambiarEntorno('PRODUCCION');
}

/**
 * El tablero: en que modo esta, a donde van los correos y que parametros hay.
 * No cambia nada. Es lo primero que conviene mirar cuando algo no cuadra.
 */
function verEntorno() {
  var modo = entorno();
  var l = [
    'SINAV · ' + modo,
    '',
    modo === 'PRODUCCION'
      ? 'Los correos SALEN a las oficinas. Lo enviado no se puede desenviar.'
      : 'Los correos llegan a tu propia bandeja. Ninguna alcaldía recibe nada.',
    '',
    'Para cambiar:  aProduccion()   ·   aPruebas()',
    '',
    'CONFIG:'
  ];

  var todo = leerConfigEntera();
  Object.keys(todo).sort().forEach(function (k) {
    var v = String(todo[k]);
    l.push('   ' + k + ' = ' + (v.length > 70 ? v.slice(0, 70) + '…' : v));
  });

  var faltan = parametrosQueFaltan(todo);
  if (faltan.length) {
    l.push('', 'FALTAN en CONFIG: ' + faltan.join(', '));
  }

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/* ---------------------------------------------------------------------------
   LAS PIEZAS
   --------------------------------------------------------------------------- */

/** Los parametros sin los cuales el programa no sabe que hacer. */
function parametrosQueFaltan(config) {
  var necesarios = ['modo', 'nombre_remitente', 'dominio_oficinas',
                    'carpeta_soportes', 'carpeta_sellados', 'carpeta_declaraciones',
                    'carpeta_exogenas', 'carpeta_sellados_soportes',
                    'copias_fijas', 'egreso', 'dias_aviso'];
  return necesarios.filter(function (k) {
    return !String(config[k] === undefined ? '' : config[k]).trim();
  });
}

/** CONFIG entera, como un objeto. Una sola lectura. */
function leerConfigEntera() {
  var h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  if (!h || h.getLastRow() < 2) return {};
  var datos = h.getRange(2, 1, h.getLastRow() - 1, 2).getValues();
  var out = {};
  datos.forEach(function (f) {
    var k = String(f[0]).trim();
    if (k) out[k] = f[1];
  });
  return out;
}

/** Un parametro de CONFIG. */
function leerParametro(clave) {
  var v = leerConfigEntera()[clave];
  return v === undefined || v === null ? '' : String(v).trim();
}

/** Escribe un parametro. Lo crea si no existe. */
function escribirParametro(clave, valor) {
  var h = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  if (!h) throw new Error('No existe la hoja ' + HOJA_CONFIG + '.');

  var n = h.getLastRow();
  var datos = n > 1 ? h.getRange(2, 1, n - 1, 1).getValues() : [];
  for (var i = 0; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === clave) {
      h.getRange(i + 2, 2).setValue(valor);
      return valor;
    }
  }
  h.appendRow([clave, valor]);
  return valor;
}

/**
 * El cambio de modo. Queda en EVENTOS si esa hoja existe: saber cuando se
 * abrio la llave es lo primero que se pregunta cuando sale un correo que no
 * tenia que salir.
 */
function cambiarEntorno(nuevo) {
  var antes = entorno();
  if (antes === nuevo) return 'Ya estaba en ' + nuevo + '. No se cambió nada.';

  escribirParametro('modo', nuevo);
  anotarCambio(antes, nuevo);

  var l = ['SINAV pasó de ' + antes + ' a ' + nuevo + '.', ''];
  if (nuevo === 'PRODUCCION') {
    l.push('Desde ahora los correos salen a las oficinas, desde el buzón de');
    l.push('cada persona. Recarga la aplicación para que desaparezca el aviso.');
    l.push('');
    l.push('Para volver atrás: aPruebas(). Lo ya enviado no se deshace.');
  } else {
    l.push('Los correos vuelven a la bandeja de quien envía.');
    l.push('Lo que ya se envió no se puede deshacer.');
  }

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/** Deja rastro, sin exigir que EVENTOS exista. */
function anotarCambio(antes, despues) {
  try {
    var h = SpreadsheetApp.getActive().getSheetByName('EVENTOS');
    if (!h) return;
    var quien = '';
    try { quien = Session.getActiveUser().getEmail(); } catch (e) { quien = 'desconocido'; }
    h.appendRow([new Date(), '', quien || 'desconocido', 'AVISO',
                 'modo ' + antes + ' -> ' + despues]);
  } catch (e) {
    // que no se pueda anotar no puede impedir apagar el programa
  }
}
