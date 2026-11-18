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
 * Sube el soporte de una obligacion. Cualquier tipo de archivo.
 * El cliente manda base64 porque google.script.run no pasa File.
 * Un archivo por llamada: google.script.run tiene tope de tamano.
 */
function apiSubirSoporte(id, nombre, tipo, datosBase64) {
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

    // el visto bueno era del archivo anterior: con uno nuevo hay que volver a
    // mirarlo, asi que se borra
    var campos = { soporte_id: archivo.getId(), soporte_revisado: '' };
    // el soporte era lo unico que faltaba: pasa a LISTA
    if (ahora === ESTADO.PENDIENTE || ahora === ESTADO.DEVUELTA ||
        ahora === ESTADO.REBOTADO) {
      campos.estado = ESTADO.LISTA;
    }

    escribirCampos(HOJA.OBLIGACIONES, f, campos);
    registrar(id, EVENTO.SOPORTE_CARGADO,
              archivo.getName() + ' (' + archivo.getId() + ') en ' +
              'vigencia ' + (val[ix.vigencia] || '?') + ' · ' +
              nombreCarpeta(val[ix.municipio]) + '/' + nombreCarpeta(val[ix.impuesto]));

    return { id: id, soporte_id: archivo.getId(), nombre: archivo.getName(),
             estado: campos.estado || ahora };
  });
}

/** Enlace de vista del soporte, para abrirlo desde la interfaz. */
function apiEnlaceSoporte(id) {
  var o = registros(HOJA.OBLIGACIONES).filter(function (r) {
    return String(r.id) === String(id);
  })[0];
  if (!o || !o.soporte_id) throw new Error('Esa obligación no tiene soporte.');
  return 'https://drive.google.com/file/d/' + o.soporte_id + '/view';
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

  var soportes = registros(HOJA.OBLIGACIONES)
    .filter(function (o) { return buscados[String(o.id)]; })
    .map(function (o) {
      var sid = String(o.soporte_id || '').trim();
      var nombre = '', pesoKB = 0;
      if (sid) {
        try {
          var f = DriveApp.getFileById(sid);
          nombre = f.getName();
          pesoKB = Math.round(f.getSize() / 1024);
        } catch (e) { nombre = '(no se pudo abrir el archivo en Drive)'; }
      }
      return {
        id: String(o.id),
        municipio: String(o.municipio),
        cod_dane: String(o.cod_dane),
        impuesto: String(o.impuesto),
        periodo: String(o.periodo),
        vencimiento: fechaTexto(o.vencimiento),
        correo_oficina: String(o.correo_oficina || ''),
        soporte_id: sid,
        nombre: nombre,
        peso_kb: pesoKB,
        // la vista previa de Drive se puede incrustar; el enlace es el respaldo
        vista: sid ? 'https://drive.google.com/file/d/' + sid + '/preview' : '',
        enlace: sid ? 'https://drive.google.com/file/d/' + sid + '/view' : '',
        revisado: String(o.soporte_revisado || '').trim() === sid && !!sid
      };
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
function apiMarcarSoporte(id, correcto, motivo) {
  if (!id) throw new Error('Falta el id de la obligación.');

  return conCerrojo(function () {
    var fila = buscarFila(id);
    if (!fila) throw new Error('No existe la obligación ' + id);

    var ix = indices(HOJA.OBLIGACIONES);
    var h = hoja(HOJA.OBLIGACIONES);
    var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
    exigeMia(val[ix.responsable], 'editarAjenas');

    var sid = String(val[ix.soporte_id] || '').trim();
    if (!sid) throw new Error('Esa obligación no tiene soporte que revisar.');

    if (correcto) {
      escribirCampos(HOJA.OBLIGACIONES, fila, { soporte_revisado: sid });
      registrar(id, EVENTO.AVISO, 'soporte revisado y dado por bueno');
      return { id: id, revisado: true };
    }

    var estado = String(val[ix.estado]).toUpperCase();
    var campos = { soporte_revisado: '', soporte_id: '' };
    if (estado === ESTADO.LISTA) campos.estado = ESTADO.PENDIENTE;

    escribirCampos(HOJA.OBLIGACIONES, fila, campos);
    registrar(id, EVENTO.ERROR, 'soporte marcado como INCORRECTO' +
      (motivo ? ': ' + String(motivo).trim() : '') + '. Hay que subir otro.');

    return { id: id, revisado: false, estado: campos.estado || estado };
  });
}
