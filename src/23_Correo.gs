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
    'Agradecemos dar respuesta SOBRE ESTE MISMO CORREO, sin iniciar uno nuevo,',
    'adjuntando la declaración con el sello de recibido. De esta manera el',
    'soporte queda asociado automáticamente a la obligación y debidamente',
    'archivado.',
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
  var ROJO = '#e30518';
  var TINTA = '#111111';
  var APAGADO = '#5f6368';
  var BORDE = '#e8e8e8';
  var FUENTE = "-apple-system,'Segoe UI',Arial,Helvetica,sans-serif";

  var aviso = modo === 'PRUEBA'
    ? '<tr><td style="padding:0 0 16px">' +
      '<div style="background:#fff6e0;border:1px solid #f0d9a0;color:#8a5500;' +
      'padding:10px 14px;font-size:13px;border-radius:4px">' +
      '<b>MODO PRUEBA.</b> Este correo iba para: ' +
      (destinatariosDe(o) || '-') + '</div></td></tr>'
    : '';

  // cada dato en su celda, para que no se amontonen en el movil
  var dato = function (k, v, ancho) {
    return '<td width="' + (ancho || '50%') + '" valign="top" ' +
      'style="padding:10px 14px;border:1px solid ' + BORDE + '">' +
      '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;' +
      'color:' + APAGADO + ';padding-bottom:3px">' + k + '</div>' +
      '<div style="font-size:15px;color:' + TINTA + ';font-weight:700">' +
      v + '</div></td>';
  };

  var punto = function (n, txt) {
    return '<tr>' +
      '<td valign="top" width="26" style="padding:0 0 12px">' +
      '<div style="width:19px;height:19px;border-radius:10px;background:' + ROJO + ';' +
      'color:#fff;font-size:11px;font-weight:700;text-align:center;' +
      'line-height:19px">' + n + '</div></td>' +
      '<td valign="top" style="padding:0 0 12px;font-size:13px;line-height:1.55;' +
      'color:' + TINTA + '">' + txt + '</td></tr>';
  };

  var puntos = '';
  aspectos(o).forEach(function (a, k) { puntos += punto(k + 1, a); });

  var sticker = String(o.adhesivo || '').trim();
  var giro = String(o.consecutivo_giro || '').trim();

  return '' +
  '<div style="background:#f1f3f4;padding:24px 12px;font-family:' + FUENTE + '">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
    'width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;' +
    'border-radius:8px;overflow:hidden;border:1px solid ' + BORDE + '">' +

    // ---- cabecera con el logo
    '<tr><td style="background:' + ROJO + ';padding:18px 28px">' +
      '<table role="presentation" width="100%"><tr>' +
        '<td valign="middle">' +
          (tieneLogo()
            ? '<img src="cid:logo" alt="Davivienda" height="26" ' +
              'style="height:26px;display:block">'
            : '<div style="color:#fff;font-size:17px;font-weight:700;' +
              'letter-spacing:.02em">Davivienda</div>') +
        '</td>' +
        '<td valign="middle" align="right" style="color:#ffffff;font-size:12px;' +
          'opacity:.92">Departamento de Impuestos</td>' +
      '</tr></table>' +
    '</td></tr>' +

    '<tr><td style="padding:26px 28px 0">' +
      '<table role="presentation" width="100%">' + aviso +

      // ---- de que se trata
      '<tr><td style="padding:0 0 4px;font-size:11px;letter-spacing:.06em;' +
        'text-transform:uppercase;color:' + APAGADO + '">' +
        (IMPUESTO_LARGO[o.impuesto] || o.impuesto) + ' &middot; ' +
        String(o.periodicidad || '').toLowerCase() + '</td></tr>' +
      '<tr><td style="padding:0 0 18px;font-size:23px;line-height:1.25;' +
        'font-weight:700;color:' + TINTA + '">' +
        String(o.municipio || '').toUpperCase() +
        '<span style="color:' + APAGADO + ';font-weight:400"> &middot; ' +
        o.periodo + '</span></td></tr>' +

      // ---- el vencimiento, que es lo que no se puede pasar por alto
      '<tr><td style="padding:0 0 20px">' +
        '<div style="background:#fce9e9;border-left:4px solid ' + ROJO + ';' +
        'padding:12px 16px;border-radius:0 4px 4px 0">' +
          '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;' +
          'color:' + APAGADO + '">Fecha de vencimiento</div>' +
          '<div style="font-size:18px;font-weight:700;color:' + ROJO + ';' +
          'padding-top:2px">' + fechaLarga(o.vencimiento) + '</div>' +
        '</div></td></tr>' +

      '<tr><td style="padding:0 0 18px;font-size:14px;line-height:1.6;color:' +
        TINTA + '">Buenos días,<br><br>' + parrafoEnvio(o) + '</td></tr>' +

      // ---- la ficha
      '<tr><td style="padding:0 0 20px">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
          'width="100%" style="border-collapse:collapse">' +
          '<tr>' + dato('Valor a girar', pesosCortos(o.valor)) +
                   dato('NIT del municipio', o.nit_municipio || '—') + '</tr>' +
          '<tr>' + dato('Dependencia', dependenciaDe(o) || '—') +
                   dato('Sticker de correspondencia', sticker || '—') + '</tr>' +
          '<tr>' + dato('Consecutivo de giro', giro || '—') +
                   dato('Presentación', (o.tipo_presentacion || '—') +
                        ' &middot; paga ' + textoPago(o)) + '</tr>' +
        '</table></td></tr>' +

      '<tr><td style="padding:0 0 22px;font-size:14px;line-height:1.6;color:' +
        TINTA + '">' + parrafoPago(o) + '</td></tr>' +

      // ---- los cuatro aspectos, numerados
      '<tr><td style="padding:0 0 6px;font-size:12px;letter-spacing:.06em;' +
        'text-transform:uppercase;color:' + APAGADO + ';font-weight:700">' +
        'Aspectos a tener en cuenta</td></tr>' +
      '<tr><td style="padding:0 0 10px;border-top:1px solid ' + BORDE + '"></td></tr>' +
      '<tr><td style="padding:0 0 8px">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
        'width="100%">' + puntos + '</table></td></tr>' +

      // ---- la instruccion que hace que todo lo demas funcione
      '<tr><td style="padding:4px 0 22px">' +
        '<div style="background:#f7f5f5;border:1px solid ' + BORDE + ';' +
        'padding:14px 16px;border-radius:4px;font-size:13px;line-height:1.55;' +
        'color:' + TINTA + '">' +
        'Agradecemos dar respuesta <b>sobre este mismo correo</b>, sin iniciar ' +
        'uno nuevo, adjuntando la declaración con el sello de recibido. De esta ' +
        'manera el soporte queda asociado automáticamente a la obligación y ' +
        'debidamente archivado.</div></td></tr>' +

      '<tr><td style="padding:0 0 26px;font-size:14px;color:' + TINTA + '">' +
        'Cordialmente,<br><b>' + config('nombre_remitente') + '</b></td></tr>' +
      '</table>' +
    '</td></tr>' +

    '<tr><td style="background:#f7f5f5;border-top:1px solid ' + BORDE + ';' +
      'padding:14px 28px;font-size:11px;color:' + APAGADO + ';line-height:1.5">' +
      'Comunicación generada por SINAV, sistema de control de obligaciones ' +
      'tributarias territoriales del Departamento de Impuestos.</td></tr>' +

  '</table></div>';
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

/* ===========================================================================
   EL CONSECUTIVO DE GIRO

   LR-09-74 se lee asi:

     LR   las iniciales de QUIEN ENVIA, en el momento de enviar. Si Andrea
          cubre a Yasneidy y es Andrea quien manda, el giro dice AG.
     09   el mes del PERIODO, no el mes en que se manda. Aqui se trabaja mes
          vencido: lo que se presenta en diciembre es de noviembre.
     74   un consecutivo que arranca de nuevo cada mes, por persona.

   Se asigna en el momento del envio, no antes: si se asignara al digitalizar,
   una obligacion que luego no se manda dejaria un hueco en la numeracion.
   =========================================================================== */

/** 'Liliana Ramirez' -> 'LR'. Primer nombre y primer apellido. */
function inicialesDe(nombre) {
  var partes = String(nombre || '')
    .normalize ? String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
               : String(nombre || '');
  var trozos = partes.toUpperCase().split(/[^A-Z]+/).filter(function (x) { return x; });
  if (!trozos.length) return '';
  if (trozos.length === 1) return trozos[0].slice(0, 2);
  return trozos[0].charAt(0) + trozos[1].charAt(0);
}

/**
 * El mes al que corresponde el periodo. Es el ULTIMO mes del periodo, que es
 * el que se declara: el bimestre 5 son septiembre y octubre, y se declara
 * octubre.
 *
 *   2026-09  -> 9      2026-B5 -> 10     2026-T3 -> 9
 *   2026-C2  -> 8      2026    -> 12
 */
function mesDelPeriodo(periodo) {
  var p = String(periodo || '').trim().toUpperCase();
  var m = p.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return Number(m[2]);
  m = p.match(/^(\d{4})-B(\d)$/);
  if (m) return Number(m[2]) * 2;
  m = p.match(/^(\d{4})-T(\d)$/);
  if (m) return Number(m[2]) * 3;
  m = p.match(/^(\d{4})-C(\d)$/);
  if (m) return Number(m[2]) * 4;
  if (/^\d{4}$/.test(p)) return 12;              // anual: se declara el cierre
  return 0;
}

/** LR + mes de dos cifras + consecutivo. */
function formatoGiro(iniciales, mes, n) {
  var mm = mes < 10 ? '0' + mes : String(mes);
  var nn = n < 10 ? '0' + n : String(n);
  return String(iniciales || '').toUpperCase() + '-' + mm + '-' + nn;
}

/** La clave del contador: por persona y por mes del periodo. */
function claveGiro(iniciales, anio, mes) {
  return 'giro:' + String(iniciales).toUpperCase() + ':' + anio + '-' +
         (mes < 10 ? '0' + mes : mes);
}

/**
 * Toma el siguiente numero de la cuenta y lo guarda. Bajo cerrojo, que dos
 * envios a la vez no se lleven el mismo.
 */
function siguienteConsecutivoGiro(iniciales, anio, mes) {
  return conCerrojo(function () {
    var props = PropertiesService.getScriptProperties();
    var clave = claveGiro(iniciales, anio, mes);
    var n = Number(props.getProperty(clave) || 0) + 1;
    props.setProperty(clave, String(n));
    return n;
  });
}

/**
 * El consecutivo de una obligacion. Si ya tiene uno escrito, ese manda: no se
 * renumera nada que ya haya salido.
 */
function giroPara(o, nombreQuienEnvia) {
  var ya = String(o.consecutivo_giro || '').trim();
  if (ya) return ya;

  var ini = inicialesDe(nombreQuienEnvia);
  if (!ini) return '';
  var mes = mesDelPeriodo(o.periodo);
  if (!mes) return '';
  var anio = Number(String(o.periodo || '').slice(0, 4)) ||
             Number(o.vigencia) || new Date().getFullYear();

  return formatoGiro(ini, mes, siguienteConsecutivoGiro(ini, anio, mes));
}
