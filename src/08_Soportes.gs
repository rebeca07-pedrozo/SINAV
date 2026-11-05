/** SINAV · el soporte que se adjunta al correo. Sin soporte no hay envio. */

function carpeta(clave) {
  var id = config(clave);
  if (!id) throw new Error('CONFIG.' + clave + ' está vacío. Corre instalar().');
  return DriveApp.getFolderById(id);
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

  if ([ESTADO.PENDIENTE, ESTADO.LISTA, ESTADO.DEVUELTA, ESTADO.REBOTADO].indexOf(estado) < 0) {
    throw new Error('No se cambia el soporte de una obligación en ' + estado + '.');
  }

  // 2. subir a Drive FUERA del cerrojo: es lo lento de todo esto
  // nombre legible: el id ya trae municipio, impuesto y periodo
  var ext = (nombre || '').indexOf('.') > 0 ? nombre.slice(nombre.lastIndexOf('.')) : '';
  var base = String(val[ix.municipio]) + ' ' + String(val[ix.impuesto]) + ' ' +
             String(val[ix.periodo]);
  var blob = Utilities.newBlob(Utilities.base64Decode(datosBase64),
                               tipo || 'application/octet-stream',
                               nombre || ('soporte-' + id));
  blob.setName(base.replace(/[\\/:*?"<>|]/g, '-') + ext);
  var archivo = carpeta('carpeta_soportes').createFile(blob);

  // 3. el cerrojo solo para escribir la hoja
  return conCerrojo(function () {
    var f = buscarFila(id);
    if (!f) throw new Error('No existe la obligación ' + id);
    var ahora = String(h.getRange(f, ix.estado + 1).getValue()).toUpperCase();

    var campos = { soporte_id: archivo.getId() };
    // el soporte era lo unico que faltaba: pasa a LISTA
    if (ahora === ESTADO.PENDIENTE || ahora === ESTADO.DEVUELTA ||
        ahora === ESTADO.REBOTADO) {
      campos.estado = ESTADO.LISTA;
    }

    escribirCampos(HOJA.OBLIGACIONES, f, campos);
    registrar(id, EVENTO.SOPORTE_CARGADO, archivo.getName() + ' (' + archivo.getId() + ')');

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
