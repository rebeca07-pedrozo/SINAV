/**
 * SINAV · el paso a produccion.
 *
 * Pasar a produccion es UNA celda: CONFIG.modo de PRUEBA a PRODUCCION. Pero
 * en el segundo siguiente los correos salen de verdad a las alcaldias, y lo
 * enviado no se puede desenviar.
 *
 * Asi que no se edita a mano: se corre revisarAntesDeProduccion(), que mira
 * lo que esta a punto de salir, y despues pasarAProduccion(), que se niega
 * si encuentra algo de prueba listo para enviarse.
 */

/** Una declaracion de verdad es un PDF. Lo demas es de prueba. */
var EXTENSIONES_REALES = ['.pdf'];

/** Un correo inventado por los datos de ejemplo: oficina.algo@davivienda.com */
function correoInventado(correos) {
  var c = String(correos || '').toLowerCase();
  if (!c) return false;
  return c.indexOf('oficina.') === 0 || c.indexOf(',oficina.') >= 0 ||
         c.indexOf('tesoreria.cali@') >= 0;
}

/** El nombre de un archivo que NO es una declaracion de verdad. */
function soporteNoReal(nombre) {
  var n = String(nombre || '').toLowerCase();
  if (!n) return true;
  if (n.indexOf('(prueba)') >= 0 || n.indexOf('prueba') >= 0) return true;
  for (var i = 0; i < EXTENSIONES_REALES.length; i++) {
    if (n.slice(-EXTENSIONES_REALES[i].length) === EXTENSIONES_REALES[i]) return false;
  }
  return true;                                   // ni PDF: no es una declaracion
}

/**
 * Lo que pasaria si ahora mismo se pasara a produccion. No cambia nada.
 *
 * Mira solo lo que esta en LISTA, que es lo unico que puede salir: una
 * obligacion en PENDIENTE no se envia aunque el modo cambie.
 */
function revisarAntesDeProduccion() {
  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var listas = [], riesgos = [], sinCorreo = 0;

  todas.forEach(function (f) {
    if (String(f[ix.estado] || '').trim().toUpperCase() !== ESTADO.LISTA) return;

    var quien = String(f[ix.municipio]) + ' · ' + String(f[ix.impuesto]) +
                ' · ' + String(f[ix.periodo]);
    var correo = String(f[ix.correo_oficina] || '').trim();
    if (!correo) { sinCorreo++; return; }         // no sale: ya lo frena puedeEnviar

    listas.push(quien + '  →  ' + correo);

    if (correoInventado(correo)) {
      riesgos.push(quien + ': el correo ' + correo + ' es inventado, de los datos de ejemplo');
    }
    listaSoportes(f[ix.soporte_id]).forEach(function (sid) {
      var nombre = '';
      try { nombre = DriveApp.getFileById(sid).getName(); } catch (e) { nombre = ''; }
      if (soporteNoReal(nombre)) {
        riesgos.push(quien + ': el soporte «' + (nombre || 'no se pudo abrir') +
                     '» no parece una declaración real');
      }
    });
  });

  var l = ['Modo actual: ' + modo, ''];

  if (!listas.length) {
    l.push('Ahora mismo no hay ninguna obligación en LISTA, así que al pasar a');
    l.push('PRODUCCION no saldría ningún correo hasta que alguien suba un soporte.');
  } else {
    l.push(listas.length + ' obligaciones están en LISTA. Al pasar a PRODUCCION,');
    l.push('en cuanto alguien le dé a enviar, estos correos salen de verdad:');
    l.push('');
    listas.slice(0, 15).forEach(function (x) { l.push('   ' + x); });
    if (listas.length > 15) l.push('   … y ' + (listas.length - 15) + ' más');
  }

  if (sinCorreo) {
    l.push('', sinCorreo + ' en LISTA no tienen correo de oficina: esas no salen,');
    l.push('se quedan esperando a que alguien escriba el correo.');
  }

  if (riesgos.length) {
    l.push('', 'OJO — esto hay que arreglarlo ANTES:');
    riesgos.forEach(function (x) { l.push('   ' + x); });
    l.push('', 'Borra esas filas de prueba o cámbiales el soporte. pasarAProduccion()');
    l.push('se va a negar mientras sigan en LISTA.');
  } else if (modo === 'PRUEBA') {
    l.push('', 'No hay datos de prueba a punto de salir. Puedes correr pasarAProduccion().');
  }

  var logo = '';
  try {
    logo = PropertiesService.getScriptProperties().getProperty('logo_id') || '';
  } catch (e) { logo = ''; }
  if (!String(logo || config('logo_id') || '').trim()) {
    l.push('', 'Menor: no hay logo. La interfaz muestra el espacio punteado. Se arregla');
    l.push('en Configuración del proyecto → Propiedades del script → logo_id.');
  }

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/**
 * Pasa a PRODUCCION. Desde ese momento los correos salen a las alcaldias.
 *
 * Se niega si hay algo de prueba en LISTA. Queda registrado en EVENTOS con
 * quien lo hizo y cuando.
 */
function pasarAProduccion() {
  exige('configurar');

  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  if (modo === 'PRODUCCION') {
    return 'Ya estaba en PRODUCCION. No se cambió nada.';
  }

  var informe = revisarAntesDeProduccion();
  if (informe.indexOf('OJO — esto hay que arreglarlo ANTES:') >= 0) {
    throw new Error('No se pasó a PRODUCCION: hay datos de prueba a punto de ' +
      'salir a una alcaldía.\n\n' + informe);
  }

  guardarConfig('modo', 'PRODUCCION');
  registrar('', EVENTO.AVISO, 'modo PRUEBA -> PRODUCCION');

  return 'SINAV está en PRODUCCION.\n\n' +
         'Desde ahora los correos salen a las alcaldías, desde el buzón de cada\n' +
         'persona. El aviso de «ambiente de pruebas» desaparece de la interfaz al\n' +
         'recargarla.\n\n' +
         'Para volver atrás: volverAPruebas().';
}

/** El camino de vuelta, por si hay que parar todo. */
function volverAPruebas() {
  exige('configurar');
  guardarConfig('modo', 'PRUEBA');
  registrar('', EVENTO.AVISO, 'modo PRODUCCION -> PRUEBA');
  return 'De vuelta en PRUEBA: los correos vuelven a la bandeja de cada quien.\n' +
         'Lo que ya se envió no se puede deshacer.';
}
