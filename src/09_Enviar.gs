/**
 * SINAV · el envio.
 * El correo sale de la cuenta de quien envia, con "Impuestos Davivienda" como
 * nombre visible, y la respuesta vuelve a SU bandeja. Por eso la app se despliega
 * ejecutando como el usuario que accede.
 * Lo mas importante de este archivo: se guarda el hilo_id en el momento del envio.
 */

/** Marca unica en el asunto. Es con esto que despues se encuentra el hilo. */
function marcador(id) {
  return 'SINAV-' + String(id).replace(/[^A-Za-z0-9]+/g, '-');
}

function claveCuota() {
  return 'cuota_' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

/** Destinatarios gastados hoy por esta persona. La cuota es por persona. */
function cuotaUsada() {
  var v = PropertiesService.getUserProperties().getProperty(claveCuota());
  return Number(v) || 0;
}

function sumarCuota(n) {
  PropertiesService.getUserProperties().setProperty(claveCuota(), String(cuotaUsada() + n));
}

function etiqueta() {
  return GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
}

function asuntoDe(o) {
  return 'Declaración ' + o.impuesto + ' ' + o.periodo + ' - ' + o.municipio +
         ' - Banco Davivienda S.A. [' + marcador(o.id) + ']';
}

function pesos(v) {
  if (v === '' || v === null || v === undefined) return '-';
  return '$' + Number(v).toLocaleString('es-CO', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function cuerpoDe(o, modo) {
  var lineas = [
    'Buen día,',
    '',
    'Adjuntamos la declaración de ' + o.impuesto + ' del periodo ' + o.periodo +
      ' para que sea presentada y pagada en el municipio de ' + o.municipio + '.',
    '',
    'Municipio: ' + o.municipio + ' (DANE ' + o.cod_dane + ')',
    'Oficina: ' + (o.cod_oficina || '-'),
    'Impuesto: ' + o.impuesto + ' - régimen ' + o.regimen,
    'Periodo: ' + o.periodo + ' (' + o.periodicidad + ')',
    'Vence: ' + fechaTexto(o.vencimiento),
    'NIT del municipio: ' + (o.nit_municipio || '-'),
    'Presentación: ' + o.tipo_presentacion + ' - paga ' + textoPago(o),
    'Valor: ' + pesos(o.valor),
    '',
    'Por favor RESPONDA SOBRE ESTE MISMO CORREO, no abra uno nuevo, y adjunte el',
    'soporte sellado por el municipio. Así queda asociado automáticamente a esta',
    'obligación y no hay que buscarlo después.',
    '',
    'Gracias,',
    config('nombre_remitente')
  ];
  if (modo === 'PRUEBA') {
    lineas.unshift('[MODO PRUEBA] Este correo iba para: ' + (o.correo_oficina || '-'), '');
  }
  return lineas.join('\n');
}

/**
 * Como se lee el pago en el correo. Son dos datos: quien paga y con que.
 * La forma de pago puede estar vacia (todavia no se sabe), y en ese caso no se
 * escribe nada en vez de un "undefined".
 */
var ETIQUETA_PAGO = {
  OFICINA: 'Oficina', PAGADURIA: 'Pagaduría',
  PSE: 'PSE', TRANSFERENCIA: 'Transferencia', EFECTIVO: 'Efectivo', OTRO: 'Otro'
};

function textoPago(o) {
  var quien = ETIQUETA_PAGO[String(o.paga_quien || '').trim()] || '';
  var forma = ETIQUETA_PAGO[String(o.forma_pago || '').trim()] || '';
  if (!quien) return 'sin definir';
  return forma ? quien + ' (' + forma + ')' : quien;
}

function cuerpoHtmlDe(o, modo) {
  var fila = function (k, v) {
    return '<tr><td style="padding:2px 12px 2px 0;color:#5f6368">' + k +
           '</td><td style="padding:2px 0;color:#111">' + v + '</td></tr>';
  };
  var aviso = modo === 'PRUEBA'
    ? '<p style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;' +
      'padding:8px 10px;margin:0 0 16px">MODO PRUEBA. Este correo iba para: ' +
      (o.correo_oficina || '-') + '</p>'
    : '';
  return '<div style="font:14px/1.5 Arial,sans-serif;color:#111;max-width:640px">' +
    aviso +
    '<p>Buen día,</p>' +
    '<p>Adjuntamos la declaración de <b>' + o.impuesto + '</b> del periodo <b>' +
      o.periodo + '</b> para que sea presentada y pagada en el municipio de <b>' +
      o.municipio + '</b>.</p>' +
    '<table style="border-collapse:collapse;font-size:14px;margin:16px 0">' +
      fila('Municipio', o.municipio + ' (DANE ' + o.cod_dane + ')') +
      fila('Oficina', o.cod_oficina || '-') +
      fila('Impuesto', o.impuesto + ' &middot; régimen ' + o.regimen) +
      fila('Periodo', o.periodo + ' (' + o.periodicidad + ')') +
      fila('Vence', fechaTexto(o.vencimiento)) +
      fila('NIT del municipio', o.nit_municipio || '-') +
      fila('Presentación', o.tipo_presentacion + ' &middot; paga ' + textoPago(o)) +
      fila('Valor', pesos(o.valor)) +
    '</table>' +
    '<p style="background:#f2f2f2;padding:10px 12px;margin:16px 0">' +
      '<b>Responda sobre este mismo correo, no abra uno nuevo</b>, y adjunte el ' +
      'soporte sellado por el municipio. Así queda asociado automáticamente a esta ' +
      'obligación y no hay que buscarlo después.</p>' +
    '<p>Gracias,<br>' + config('nombre_remitente') + '</p>' +
    '</div>';
}

/**
 * Busca el hilo que acaba de salir, por la marca del asunto, y lo etiqueta.
 * Query acotada: solo enviados, solo esta marca. Nunca recorre la bandeja.
 */
function hiloDelEnvio(id) {
  var q = 'in:sent subject:"' + marcador(id) + '"';
  for (var intento = 0; intento < 3; intento++) {
    var hilos = GmailApp.search(q, 0, 1);
    if (hilos.length) {
      try { hilos[0].addLabel(etiqueta()); } catch (e) { /* la etiqueta no es critica */ }
      return hilos[0].getId();
    }
    Utilities.sleep(1500);
  }
  return '';
}

/**
 * Envia las obligaciones seleccionadas.
 * Va por lotes con guardia de tiempo: si se acerca el limite de 6 minutos,
 * devuelve lo que falta y el cliente vuelve a llamar.
 */
function apiEnviar(ids) {
  if (!ids || !ids.length) throw new Error('No seleccionaste ninguna obligación.');

  var arranque = Date.now();
  var modo = config('modo').toUpperCase() || 'PRUEBA';
  var remitente = config('nombre_remitente') || 'Impuestos Davivienda';
  var miCorreo = yo().correo;

  var porId = {};
  registros(HOJA.OBLIGACIONES).forEach(function (o) { porId[String(o.id)] = o; });

  var enviadas = [], rechazadas = [], pendientes = [], eventos = [];

  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i]);

    if ((Date.now() - arranque) / 1000 > SEGUNDOS_MAX) {
      pendientes = ids.slice(i).map(String);
      break;
    }

    var o = porId[id];
    if (!o) { rechazadas.push({ id: id, motivo: 'no existe' }); continue; }

    // permiso: las ajenas solo JEFE o ADMIN
    if (!esMia(o.responsable) && !puede('enviarAjenas')) {
      rechazadas.push({ id: id, motivo: 'no es tuya' });
      continue;
    }

    // LA REGLA: sin soporte no hay envio
    var ok = puedeEnviar(o);
    if (!ok.ok) {
      rechazadas.push({ id: id, motivo: ok.motivo });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'envío rechazado: ' + ok.motivo });
      continue;
    }

    var destinos = modo === 'PRUEBA' ? miCorreo : normCorreos(o.correo_oficina);
    var cuantos = destinos.split(',').length;

    if (cuotaUsada() + cuantos > CUOTA_DIARIA) {
      pendientes = ids.slice(i).map(String);
      rechazadas.push({ id: id,
        motivo: 'se agotó tu cuota diaria de ' + CUOTA_DIARIA + ' destinatarios' });
      break;
    }

    try {
      var adjunto = DriveApp.getFileById(String(o.soporte_id).trim()).getBlob();

      GmailApp.sendEmail(destinos, asuntoDe(o), cuerpoDe(o, modo), {
        name: remitente,
        attachments: [adjunto],
        htmlBody: cuerpoHtmlDe(o, modo)
      });
      sumarCuota(cuantos);

      var hilo = hiloDelEnvio(o.id);
      var idFila = o.id;

      conCerrojo(function () {
        escribirCampos(HOJA.OBLIGACIONES, buscarFila(idFila), {
          estado: ESTADO.ENVIADA,
          fecha_envio: new Date(),
          hilo_id: hilo
        });
      });

      eventos.push({
        id: id, quePaso: EVENTO.ENVIADA,
        detalle: (modo === 'PRUEBA' ? '[PRUEBA] ' : '') + 'a ' + destinos +
                 (hilo ? ' | hilo ' + hilo : ' | SIN hilo_id: revisar')
      });
      if (!hilo) {
        eventos.push({ id: id, quePaso: EVENTO.ERROR,
          detalle: 'no se encontró el hilo del envío; la respuesta no se va a detectar sola' });
      }
      enviadas.push({ id: id, hilo_id: hilo, destinos: destinos });

    } catch (e) {
      rechazadas.push({ id: id, motivo: String(e.message || e) });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'falló el envío: ' + e });
    }
  }

  if (eventos.length) registrarVarios(eventos);

  return {
    enviadas: enviadas,
    rechazadas: rechazadas,
    pendientes: pendientes,
    modo: modo,
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA }
  };
}
