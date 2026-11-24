/**
 * SINAV · el correo que recibe la oficina.
 *
 * El texto no es decorativo: es una instrucción de trabajo. Dice qué egreso
 * elaborar, con qué consecutivo de giro, a qué código devolver el sellado y
 * qué pasa si no lo devuelven (evento SARO). Por eso vive en su propio archivo
 * y no mezclado con la mecánica del envío.
 *
 * Lo que cambia por obligación sale de la fila. Lo que es igual en todos los
 * correos (el egreso, el código del departamento, a nombre de quién se manda,
 * las copias) sale de CONFIG y se cambia una sola vez.
 */

/** Los nombres largos, como los escribe el equipo en el asunto. */
var IMPUESTO_LARGO = {
  ICA: 'Industria y Comercio',
  RETEICA: 'Retención de Industria y Comercio',
  AUTORRETEICA: 'Autorretención de Industria y comercio',
  EXOGENA: 'Medios magnéticos'
};

var IMPUESTO_ASUNTO = {
  ICA: 'Declaración de ICA',
  RETEICA: 'Declaración Retención de ICA',
  AUTORRETEICA: 'Declaración Autorretención de ICA',
  EXOGENA: 'Medios magnéticos'
};

/**
 * La dependencia, sin el cero de relleno.
 *
 * En la hoja el codigo de oficina se guarda con cuatro posiciones ('0851')
 * porque es un codigo y no un numero, pero las direcciones de correo no lo
 * llevan: director851@, no director0851@.
 */
function dependenciaDe(o) {
  var c = String(o.cod_oficina || '').trim().replace(/^0+/, '');
  return c;
}

/**
 * A quien va el correo.
 *
 * Si la obligacion tiene correo_oficina escrito, manda ese: alguien lo puso a
 * proposito. Si no, se arma desde la dependencia, que es el patron del banco:
 * director<dep>@ y subdirector<dep>@.
 *
 * Esto es lo que permite enviar a los municipios que nunca tuvieron correo
 * escrito, que eran la mayoria.
 */
function destinatariosDe(o) {
  var escrito = normCorreos(o.correo_oficina);
  if (escrito) return escrito;

  var dep = dependenciaDe(o);
  if (!dep) return '';
  var dominio = config('dominio_oficinas') || 'davivienda.com';
  return ['director' + dep + '@' + dominio,
          'subdirector' + dep + '@' + dominio].join(',');
}

/** Las copias fijas de CONFIG. Vacio si no hay. */
function copiasFijas() {
  return normCorreos(config('copias_fijas'));
}

/**
 * El asunto, con el formato que usa el equipo:
 *   1689 -Declaración Autorretención de ICA NILO - MENSUAL - $1.773.000 -
 *   EGRESO 25 No - LR-09-74
 *
 * Al final va la marca SINAV-..., que es con la que luego se encuentra el
 * hilo. Sin eso la respuesta de la oficina no se detecta sola.
 */
function asuntoOficina(o) {
  var partes = [
    dependenciaDe(o) + ' -' + (IMPUESTO_ASUNTO[o.impuesto] || o.impuesto) +
      ' ' + String(o.municipio || '').toUpperCase(),
    String(o.periodicidad || '').toUpperCase(),
    pesosCortos(o.valor)
  ];
  var egreso = String(config('egreso') || '').trim();
  var giro = String(o.consecutivo_giro || '').trim();
  if (egreso) partes.push('EGRESO ' + egreso + ' No');
  if (giro) partes.push(giro);
  return partes.join(' - ') + ' [' + marcador(o.id) + ']';
}

/** $1.773.000 — sin decimales, que es como lo escriben en el asunto. */
function pesosCortos(v) {
  if (v === '' || v === null || v === undefined) return '$0';
  var n = Math.round(Number(v) || 0);
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** El mes y el ano en letras: "24 de noviembre de 2026". */
function fechaLarga(v) {
  var d = v instanceof Date ? v : normFecha(v);
  if (!d) return 'sin fecha';
  return d.getDate() + ' de ' + NOMBRE_MES[d.getMonth()] + ' de ' + d.getFullYear();
}

/**
 * El parrafo de apertura. Es el que lleva los datos del envio fisico: el
 * adhesivo con el que viaja el sobre, el valor, el NIT y la dependencia.
 */
function parrafoEnvio(o) {
  var adhesivo = String(o.adhesivo || '').trim();
  return 'Reciban un cordial saludo, les informo que enviamos por correo interno ' +
    (adhesivo ? 'con el sticker No ' + adhesivo + ' ' : '') +
    'la ' + (IMPUESTO_LARGO[o.impuesto] || o.impuesto) + ' ' +
    String(o.periodicidad || '').toUpperCase() + ' del ' +
    (o.vigencia || new Date().getFullYear()) + ', del Municipio ' +
    String(o.municipio || '').toUpperCase() + ', por el valor de ' +
    pesosCortos(o.valor) + ' con el NIT ' + (o.nit_municipio || '-') +
    ' a la dependencia ' + (dependenciaDe(o) || '-') + '.';
}

/** El parrafo de instrucciones de pago. */
function parrafoPago(o) {
  var egreso = String(config('egreso') || '25').trim();
  var giro = String(o.consecutivo_giro || '').trim();
  return 'Favor realizar el pago por contingencia elaborando egreso ' + egreso +
    (giro ? ', de acuerdo al consecutivo de giro asignado para este pago No ' + giro : '') +
    ', realizar la presentación y el pago una vez reciban el soporte. Si el Banco ' +
    'posee recaudo con el Municipio, timbrar en efectivo con abono a cuenta del ' +
    'Municipio sin olvidar enviar el correo a GRP Conceptos Especiales; si no ' +
    'poseemos recaudo con ellos elaborar el cheque con el mismo egreso ' + egreso +
    ' y concepto 40 para pagar en otra entidad, o en la alcaldía.';
}

/** Los cuatro puntos de «aspectos a tener en cuenta». */
function aspectos(o) {
  var codigo = String(config('codigo_departamento') || '').trim();
  var recibe = String(config('nombre_recibe') || '').trim();
  return [
    'Por favor una vez presentada la declaración (ante la entidad recaudadora y ' +
      'sellada con fecha de recibido), enviar por este medio imagen del pago y ' +
      'enviar la declaración con el sello de recibido a Dpto. de impuestos' +
      (codigo ? ', código ' + codigo : '') +
      (recibe ? ' a nombre de ' + recibe : '') +
      '. Si el departamento de impuestos no es notificado mediante correo ' +
      'electrónico, se reportará como evento SARO.',
    'Si por alguna eventualidad el día anterior a la fecha del vencimiento de la ' +
      'declaración no ha recibido en su oficina el formulario, por favor ' +
      'comunicarse conmigo con carácter urgente. Solicitamos una vez recibido el ' +
      'correo tramitar el pago del mismo, no es necesario esperar a la fecha de ' +
      'vencimiento, para evitar sanciones tributarias; que de generarse, serán ' +
      'cargadas a la oficina responsable del trámite.',
    'Es responsabilidad de la oficina y/o área administrativa llevar a cabo el ' +
      'trámite satisfactorio.',
    'Sugerimos tomar fotocopia del recibido de la declaración y archivar para la ' +
      'oficina. Recuerde que esta documentación es soporte si a futuro se requiere.'
  ];
}

/** El correo en texto plano, para quien lea sin HTML. */
function cuerpoOficina(o, modo) {
  var l = [];
  if (modo === 'PRUEBA') {
    l.push('[MODO PRUEBA] Este correo iba para: ' + (destinatariosDe(o) || '-'), '');
  }
  l.push('Buenos días,', '', parrafoEnvio(o), '', parrafoPago(o), '',
         'Fecha de vencimiento el ' + fechaLarga(o.vencimiento) + '.', '',
         'ASPECTOS A TENER EN CUENTA:');
  aspectos(o).forEach(function (a) { l.push('• ' + a); });
  l.push('',
    'Por favor RESPONDA SOBRE ESTE MISMO CORREO, no abra uno nuevo, y adjunte',
    'la declaración sellada. Así queda archivada sola y no hay que buscarla después.',
    '', 'Cordialmente,', config('nombre_remitente'));
  return l.join('\n');
}

/**
 * El correo en HTML, con el logo del banco arriba.
 *
 * El logo se incrusta como imagen en linea (cid) desde el archivo de Drive que
 * apunta logo_id. Se incrusta y no se enlaza porque Gmail bloquea las imagenes
 * remotas hasta que el que lee da permiso, y entonces el correo llega roto.
 */
function cuerpoHtmlOficina(o, modo) {
  var rojo = '#e30518';
  var p = function (txt) {
    return '<p style="margin:0 0 14px">' + txt + '</p>';
  };
  var aviso = modo === 'PRUEBA'
    ? '<p style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;' +
      'padding:8px 10px;margin:0 0 16px;font-size:13px">MODO PRUEBA. ' +
      'Este correo iba para: ' + (destinatariosDe(o) || '-') + '</p>'
    : '';

  var fila = function (k, v) {
    return '<tr><td style="padding:3px 16px 3px 0;color:#5f6368;' +
           'white-space:nowrap">' + k + '</td>' +
           '<td style="padding:3px 0;color:#111"><b>' + v + '</b></td></tr>';
  };

  var puntos = aspectos(o).map(function (a) {
    return '<li style="margin:0 0 8px">' + a + '</li>';
  }).join('');

  return '<div style="font:14px/1.55 Arial,Helvetica,sans-serif;color:#111;' +
      'max-width:660px">' +
    aviso +
    (tieneLogo() ? '<div style="padding:0 0 12px"><img src="cid:logo" ' +
      'alt="Davivienda" style="height:34px"></div>' : '') +
    '<div style="border-top:3px solid ' + rojo + ';padding-top:16px">' +
    p('Buenos días,') +
    p(parrafoEnvio(o)) +
    '<table style="border-collapse:collapse;font-size:13px;margin:0 0 16px;' +
      'background:#f9f9f9;padding:8px">' +
      fila('Municipio', o.municipio + ' (DANE ' + o.cod_dane + ')') +
      fila('Dependencia', dependenciaDe(o) || '-') +
      fila('Impuesto', (IMPUESTO_LARGO[o.impuesto] || o.impuesto) + ' &middot; ' +
           String(o.periodicidad || '').toLowerCase()) +
      fila('Periodo', o.periodo) +
      fila('Valor', pesosCortos(o.valor)) +
      fila('NIT del municipio', o.nit_municipio || '-') +
      fila('Presentación', (o.tipo_presentacion || '-') + ' &middot; paga ' + textoPago(o)) +
      (String(o.adhesivo || '').trim() ? fila('Sticker', o.adhesivo) : '') +
      (String(o.consecutivo_giro || '').trim()
        ? fila('Consecutivo de giro', o.consecutivo_giro) : '') +
    '</table>' +
    p(parrafoPago(o)) +
    '<p style="margin:0 0 14px;padding:10px 12px;background:#fce9e9;' +
      'border-left:3px solid ' + rojo + '">Fecha de vencimiento el <b>' +
      fechaLarga(o.vencimiento) + '</b>.</p>' +
    '<p style="margin:0 0 6px"><b>ASPECTOS A TENER EN CUENTA:</b></p>' +
    '<ul style="margin:0 0 16px;padding-left:18px">' + puntos + '</ul>' +
    '<p style="background:#f2f2f2;padding:10px 12px;margin:0 0 16px">' +
      '<b>Responda sobre este mismo correo, no abra uno nuevo</b>, y adjunte la ' +
      'declaración sellada. Así queda archivada sola y no hay que buscarla después.</p>' +
    p('Cordialmente,<br>' + config('nombre_remitente')) +
    '</div></div>';
}

/** Hay logo configurado y se puede abrir. */
function tieneLogo() {
  return !!blobDelLogo();
}

/**
 * El logo como blob, para incrustarlo en el correo. Se cachea en memoria
 * durante la ejecucion: en un envio de 50 correos seria abrir Drive 50 veces.
 */
var _blobLogo;
var _blobLogoBuscado = false;

function blobDelLogo() {
  if (_blobLogoBuscado) return _blobLogo;
  _blobLogoBuscado = true;
  _blobLogo = null;
  // idLogo() ya resuelve las propiedades del script, CONFIG y el enlace
  // completo de Drive. No se repite aqui.
  var id = idLogo();
  if (!id) return null;
  try {
    _blobLogo = DriveApp.getFileById(id).getBlob().setName('logo');
  } catch (e) {
    _blobLogo = null;                 // sin logo el correo sale igual, sin imagen
  }
  return _blobLogo;
}
