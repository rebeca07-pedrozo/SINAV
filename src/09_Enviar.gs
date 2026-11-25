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

/* El asunto y el cuerpo del correo viven en 23_Correo.gs: no son mecanica de
   envio, son una instruccion de trabajo para la oficina. */

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
    // la revision se comprueba aqui tambien, en el servidor: que el boton
    // este apagado no basta, una llamada directa a la API tiene que fallar
    var ok = puedeEnviar(o);
    if (ok.ok && !soporteRevisado(o)) {
      ok = { ok: false, motivo: 'falta revisar el soporte' };
    }
    if (!ok.ok) {
      rechazadas.push({ id: id, motivo: ok.motivo });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'envío rechazado: ' + ok.motivo });
      continue;
    }

    var destinos = modo === 'PRUEBA' ? miCorreo : destinatariosDe(o);
    var copias = modo === 'PRUEBA' ? '' : copiasFijas();
    var cuantos = destinos.split(',').length +
                  (copias ? copias.split(',').length : 0);

    if (cuotaUsada() + cuantos > CUOTA_DIARIA) {
      pendientes = ids.slice(i).map(String);
      rechazadas.push({ id: id,
        motivo: 'se agotó tu cuota diaria de ' + CUOTA_DIARIA + ' destinatarios' });
      break;
    }

    // el consecutivo de giro se toma AQUI, no antes: si se asignara al
    // digitalizar, una obligacion que luego no se manda dejaria un hueco en
    // la numeracion
    if (!String(o.consecutivo_giro || '').trim()) {
      try {
        var giro = giroPara(o, yo().nombre);
        if (giro) {
          o.consecutivo_giro = giro;
          escribirCampos(HOJA.OBLIGACIONES, buscarFila(o.id),
                         { consecutivo_giro: giro });
        }
      } catch (e) {
        registrar(id, EVENTO.ERROR, 'no se pudo asignar el consecutivo: ' + e.message);
      }
    }

    try {
      // todos los soportes de la obligacion: la declaracion y sus anexos
      var adjuntos = [], bytes = 0;
      listaSoportes(o.soporte_id).forEach(function (sid) {
        var f = DriveApp.getFileById(sid);
        bytes += f.getSize();
        adjuntos.push(f.getBlob());
      });
      if (!adjuntos.length) throw new Error('no se pudo abrir ningún soporte en Drive');
      if (bytes > MAX_ADJUNTO_MB * 1024 * 1024) {
        throw new Error('los adjuntos pesan ' + Math.round(bytes / 1024 / 1024) +
          ' MB y Gmail corta en 25 MB. Junta los archivos en uno más liviano.');
      }

      var opciones = {
        name: remitente,
        attachments: adjuntos,
        htmlBody: cuerpoHtmlOficina(o, modo)
      };
      if (copias) opciones.cc = copias;
      var logo = blobDelLogo();
      if (logo) opciones.inlineImages = { logo: logo };

      GmailApp.sendEmail(destinos, asuntoOficina(o), cuerpoOficina(o, modo), opciones);
      sumarCuota(cuantos);

      var hilo = hiloDelEnvio(o.id);
      var idFila = o.id;

      conCerrojo(function () {
        escribirCampos(HOJA.OBLIGACIONES, buscarFila(idFila), {
          estado: ESTADO.ENVIADA,
          // el despacho es el dia en que sale el correo: no hay que escribirlo
          fecha_despacho: hoy(),
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

/* ---------------------------------------------------------------------------
   DIAGNOSTICO

   Cuando una fila no se deja enviar, el motivo lo sabe el servidor pero no
   siempre es evidente en la pantalla. Esto lo escribe en claro.
   --------------------------------------------------------------------------- */

/**
 * Lista las obligaciones que YA tienen soporte y dice, una por una, por que
 * no se pueden enviar. Se corre desde el menu SINAV, o desde el editor.
 */
function porQueNoSeEnvia() {
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var conSoporte = 0, listas = 0, motivos = {}, ejemplos = {};

  todas.forEach(function (f) {
    if (!String(f[ix.soporte_id] || '').trim()) return;
    conSoporte++;

    var o = {
      estado: f[ix.estado],
      soporte_id: f[ix.soporte_id],
      soporte_revisado: f[ix.soporte_revisado],
      requiere_envio: f[ix.requiere_envio],
      correo_oficina: f[ix.correo_oficina]
    };
    var e = puedeEnviar(o);
    var clave = e.ok
      ? (soporteRevisado(o) ? 'LISTAS PARA ENVIAR' : 'listas, se revisan al enviar')
      : e.motivo;
    if (e.ok) listas++;

    motivos[clave] = (motivos[clave] || 0) + 1;
    if (!ejemplos[clave]) {
      ejemplos[clave] = String(f[ix.municipio]) + ' · ' + String(f[ix.impuesto]) +
                        ' · ' + String(f[ix.periodo]);
    }
  });

  var lineas = [conSoporte + ' obligaciones tienen soporte cargado.', ''];
  if (!conSoporte) {
    lineas.push('Ninguna tiene soporte todavía, así que no hay nada que enviar.');
  }
  Object.keys(motivos).sort().forEach(function (k) {
    lineas.push(motivos[k] + '  ' + k);
    lineas.push('      p.ej. ' + ejemplos[k]);
  });

  if (motivos['sin correo ni dependencia']) {
    lineas.push('', 'Esas no tienen a quién mandarse. El correo sale de dos sitios: ' +
      'de correo_oficina si está escrito, y si no, de la dependencia ' +
      '(cod_oficina), con la que se arman director<dep>@ y subdirector<dep>@. ' +
      'Sin ninguno de los dos no hay destinatario: escribe el código de ' +
      'dependencia en PROGRAMACION y corre «Refrescar los correos de oficina».');
  }

  var txt = lineas.join('\n');
  Logger.log(txt);
  return txt;
}
