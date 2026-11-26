/** SINAV · el soporte que se adjunta al correo. Sin soporte no hay envio. */

/** Nombre usable como carpeta de Drive. */
function nombreCarpeta(v) {
  var s = String(v || '').replace(/[\\/]+/g, '-').replace(/\s+/g, ' ').trim();
  return s || 'SIN DATO';
}

/**
 * Donde va el soporte de una obligacion (REQ-009).
 *   Territoriales/<vigencia>/Declaraciones/Soportes/<municipio>/<impuesto>
 * Las exogenas van a su propia carpeta del ano, sin bajar por impuesto.
 */
function carpetaSoporte(vigencia, municipio, impuesto) {
  var clase = String(impuesto || '').toUpperCase() === 'EXOGENA' ? 'exogenas' : 'soportes';
  return carpetaDocumento(clase, vigencia, municipio, impuesto);
}

/** Donde va el sellado que devuelve la oficina. */
function carpetaSellado(vigencia, municipio, impuesto) {
  return carpetaDocumento('sellados', vigencia, municipio, impuesto);
}

/** Nombre legible del archivo. El id ya trae municipio, impuesto y periodo. */
function nombreSoporte(val, ix, nombreOriginal) {
  var ext = (nombreOriginal || '').indexOf('.') > 0
    ? nombreOriginal.slice(nombreOriginal.lastIndexOf('.')) : '';
  var base = String(val[ix.municipio]) + ' ' + String(val[ix.impuesto]) + ' ' +
             String(val[ix.periodo]);
  return base.replace(/[\\/:*?"<>|]/g, '-') + ext;
}

/**
 * Sube un soporte de una obligacion. Cualquier tipo de archivo.
 * El cliente manda base64 porque google.script.run no pasa File.
 * Un archivo por llamada: google.script.run tiene tope de tamano.
 *
 * agregar = true lo ANADE a los que ya hay (un anexo). Sin eso, reemplaza:
 * se quedan solo este. Los dos casos existen de verdad — unas veces el
 * archivo estaba mal y hay que cambiarlo, otras hay que mandar la declaracion
 * y ademas el comprobante de pago.
 */
function apiSubirSoporte(id, nombre, tipo, datosBase64, agregar) {
  if (!id) throw new Error('Falta el id de la obligación.');
  if (!datosBase64) throw new Error('Llegó vacío el archivo ' + nombre);

  // 1. validar contra la fila actual, antes de escribir nada
  var fila = buscarFila(id);
  if (!fila) throw new Error('No existe la obligación ' + id);

  var ix = indices(HOJA.OBLIGACIONES);
  var h = hoja(HOJA.OBLIGACIONES);
  var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
  var estado = String(val[ix.estado]).toUpperCase();

  exigeMia(val[ix.responsable], 'editarAjenas');

  if (ESTADOS_ADMITEN_SOPORTE.indexOf(estado) < 0) {
    throw new Error('No se cambia el soporte de una obligación en ' + estado + '.');
  }

  // 2. subir a Drive FUERA del cerrojo: es lo lento de todo esto
  var blob = Utilities.newBlob(Utilities.base64Decode(datosBase64),
                               tipo || 'application/octet-stream',
                               nombre || ('soporte-' + id));
  blob.setName(nombreSoporte(val, ix, nombre));
  var archivo = carpetaSoporte(val[ix.vigencia], val[ix.municipio],
                               val[ix.impuesto]).createFile(blob);

  // 3. el cerrojo solo para escribir la hoja
  return conCerrojo(function () {
    var f = buscarFila(id);
    if (!f) throw new Error('No existe la obligación ' + id);
    var ahora = String(h.getRange(f, ix.estado + 1).getValue()).toUpperCase();

    var previos = agregar
      ? listaSoportes(String(h.getRange(f, ix.soporte_id + 1).getValue() || ''))
      : [];
    if (previos.length >= MAX_SOPORTES) {
      throw new Error('Ya hay ' + previos.length + ' archivos en esa obligación. ' +
        'Gmail no deja mandar muchos más, y si de verdad hacen falta, mejor ' +
        'júntalos en un solo PDF.');
    }
    var todos = previos.concat([archivo.getId()]);

    // el visto bueno es POR ARCHIVO: los que ya se revisaron siguen revisados,
    // el nuevo nace sin revisar y por eso el envio se vuelve a frenar
    var revisadosAntes = {};
    listaSoportes(String(h.getRange(f, ix.soporte_revisado + 1).getValue() || ''))
      .forEach(function (x) { revisadosAntes[x] = true; });
    var siguenBuenos = previos.filter(function (x) { return revisadosAntes[x]; });

    var campos = {
      soporte_id: todos.join(','),
      soporte_revisado: siguenBuenos.join(',')
    };
    // el soporte era lo unico que faltaba: pasa a LISTA
    if (ahora === ESTADO.PENDIENTE || ahora === ESTADO.DEVUELTA ||
        ahora === ESTADO.REBOTADO) {
      campos.estado = ESTADO.LISTA;
    }

    escribirCampos(HOJA.OBLIGACIONES, f, campos);
    registrar(id, EVENTO.SOPORTE_CARGADO,
              (agregar ? 'anexo ' + todos.length + ': ' : '') +
              archivo.getName() + ' (' + archivo.getId() + ') en ' +
              'vigencia ' + (val[ix.vigencia] || '?') + ' · ' +
              nombreCarpeta(val[ix.municipio]) + '/' + nombreCarpeta(val[ix.impuesto]));

    return { id: id, soporte_id: archivo.getId(), nombre: archivo.getName(),
             soportes: todos.length, estado: campos.estado || ahora };
  });
}

/** Enlace de vista del soporte, para abrirlo desde la interfaz. */
function apiEnlaceSoporte(id) {
  var o = registros(HOJA.OBLIGACIONES).filter(function (r) {
    return String(r.id) === String(id);
  })[0];
  var l = o ? listaSoportes(o.soporte_id) : [];
  if (!l.length) throw new Error('Esa obligación no tiene soporte.');
  return 'https://drive.google.com/file/d/' + l[0] + '/view';
}

/* ===========================================================================
   Revision del soporte antes de enviar.

   Un PDF con el nombre correcto puede tener dentro la declaracion de otro
   municipio: pasa al arrastrar el archivo equivocado o al renombrar mal. Eso
   no se descubre hasta que la oficina lo recibe, y entonces ya se mando la
   declaracion de un municipio a la alcaldia de otro.

   Por eso el visto bueno guarda el soporte_id y no un SI/NO: vale para el
   documento que se vio. Si se reemplaza el archivo, hay que mirarlo otra vez.
   =========================================================================== */

/** Lo que la pantalla necesita para mostrar cada PDF antes de enviar. */
function apiSoportesParaRevisar(ids) {
  var lista = (ids || []).filter(String);
  if (!lista.length) return { soportes: [] };

  var buscados = {};
  lista.forEach(function (id) { buscados[String(id)] = true; });

  var soportes = [];
  registros(HOJA.OBLIGACIONES)
    .filter(function (o) { return buscados[String(o.id)]; })
    .forEach(function (o) {
      var archivos = listaSoportes(o.soporte_id);
      var vistos = {};
      listaSoportes(o.soporte_revisado).forEach(function (x) { vistos[x] = true; });

      // una entrada por ARCHIVO: si la obligacion lleva declaracion y anexo,
      // hay que ver los dos, uno por uno
      archivos.forEach(function (sid, k) {
        var nombre = '', pesoKB = 0;
        try {
          var f = DriveApp.getFileById(sid);
          nombre = f.getName();
          pesoKB = Math.round(f.getSize() / 1024);
        } catch (e) { nombre = '(no se pudo abrir el archivo en Drive)'; }

        var destinos = '';
        try { destinos = destinatariosDe(o); } catch (e) { destinos = ''; }
        var copias = '';
        try { copias = copiasFijas(); } catch (e) { copias = ''; }

        soportes.push({
          id: String(o.id),
          municipio: String(o.municipio),
          cod_dane: String(o.cod_dane),
          cod_oficina: String(o.cod_oficina || ''),
          impuesto: String(o.impuesto),
          periodo: String(o.periodo),
          vencimiento: fechaTexto(o.vencimiento),
          correo_oficina: String(o.correo_oficina || ''),
          // lo que va a leer la oficina, para verlo junto al documento
          nit_municipio: String(o.nit_municipio || ''),
          valor_texto: pesosCortos(o.valor),
          consecutivo_giro: String(o.consecutivo_giro || '') ||
            consecutivoDe(o.municipio, o.impuesto, o.periodo),
          adhesivo: String(o.adhesivo || ''),
          pago_texto: textoPago(o),
          destinatarios: destinos,
          copias: copias,
          copias_cuantas: copias ? copias.split(',').length : 0,
          soporte_id: sid,
          nombre: nombre,
          peso_kb: pesoKB,
          cual: k + 1,
          de: archivos.length,
          // la vista previa de Drive se puede incrustar; el enlace es el respaldo
          vista: 'https://drive.google.com/file/d/' + sid + '/preview',
          enlace: 'https://drive.google.com/file/d/' + sid + '/view',
          revisado: !!vistos[sid]
        });
      });
    });

  return { soportes: soportes };
}

/**
 * Marca el soporte como correcto o incorrecto.
 *
 * CORRECTO guarda el soporte_id revisado, y solo entonces se puede enviar.
 * INCORRECTO borra el visto bueno y, ademas, quita el soporte: si el archivo
 * no es el que debia, dejarlo puesto solo invita a que alguien lo mande sin
 * mirar. La obligacion vuelve a PENDIENTE y pide un archivo nuevo.
 */
function apiMarcarSoporte(id, correcto, motivo, soporteId) {
  if (!id) throw new Error('Falta el id de la obligación.');

  return conCerrojo(function () {
    var fila = buscarFila(id);
    if (!fila) throw new Error('No existe la obligación ' + id);

    var ix = indices(HOJA.OBLIGACIONES);
    var h = hoja(HOJA.OBLIGACIONES);
    var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
    exigeMia(val[ix.responsable], 'editarAjenas');

    var archivos = listaSoportes(val[ix.soporte_id]);
    if (!archivos.length) throw new Error('Esa obligación no tiene soporte que revisar.');

    // sin soporteId se entiende que es el unico que hay; con varios, hay que
    // decir cual, o se marcaria el equivocado
    var cual = String(soporteId || '').trim() || archivos[0];
    if (archivos.indexOf(cual) < 0) {
      throw new Error('Ese archivo ya no está en la obligación. Recarga la pantalla.');
    }
    if (!String(soporteId || '').trim() && archivos.length > 1) {
      throw new Error('Esa obligación tiene ' + archivos.length + ' archivos: ' +
                      'hay que decir cuál se está revisando.');
    }

    var revisados = listaSoportes(val[ix.soporte_revisado]);
    var estado = String(val[ix.estado]).toUpperCase();

    if (correcto) {
      if (revisados.indexOf(cual) < 0) revisados.push(cual);
      // solo los que siguen adjuntos
      revisados = revisados.filter(function (x) { return archivos.indexOf(x) >= 0; });
      escribirCampos(HOJA.OBLIGACIONES, fila, { soporte_revisado: revisados.join(',') });
      registrar(id, EVENTO.AVISO, 'soporte revisado y dado por bueno (' + cual + ')');
      return { id: id, revisado: true, soporte_id: cual, quedan: archivos.length };
    }

    // INCORRECTO quita ESE archivo y su visto bueno. Si era el unico, la
    // obligacion vuelve a PENDIENTE; si quedan otros, sigue en LISTA y solo
    // falta reponer el que se cayo.
    var quedan = archivos.filter(function (x) { return x !== cual; });
    var campos = {
      soporte_id: quedan.join(','),
      soporte_revisado: revisados.filter(function (x) {
        return x !== cual && quedan.indexOf(x) >= 0;
      }).join(',')
    };
    if (!quedan.length && estado === ESTADO.LISTA) campos.estado = ESTADO.PENDIENTE;

    escribirCampos(HOJA.OBLIGACIONES, fila, campos);
    registrar(id, EVENTO.ERROR, 'soporte marcado como INCORRECTO' +
      (motivo ? ': ' + String(motivo).trim() : '') + '. Hay que subir otro. ' +
      'Quedan ' + quedan.length + ' archivos.');

    return { id: id, revisado: false, soporte_id: cual, quedan: quedan.length,
             estado: campos.estado || estado };
  });
}
