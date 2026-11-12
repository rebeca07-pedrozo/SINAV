/**
 * SINAV · respuestas de las oficinas.
 *
 * Cuando se envia, se guarda el hilo_id de Gmail. Esto lee ESE hilo y nada
 * mas: si la oficina responde sobre el mismo correo, se recoge lo que haya
 * contestado y el adjunto que traiga.
 *
 * Por que el hilo y no una busqueda en la bandeja: porque el hilo YA dice a
 * que obligacion pertenece la respuesta. Buscar por asunto o por remitente
 * seria adivinar, y una declaracion sellada archivada en el municipio
 * equivocado es un error que se descubre meses despues.
 *
 * El correo esta en la bandeja de quien envio, asi que cada quien revisa lo
 * suyo: la aplicacion corre como el usuario que accede.
 */

/**
 * Los estados en los que todavia tiene sentido mirar el hilo.
 * Funcion y no `var`: un `var` aqui se evaluaria al cargar el archivo, y si
 * este carga antes que 00_Constantes, ESTADO no existe todavia.
 */
function estadosEsperanRespuesta() {
  return [ESTADO.ENVIADA, ESTADO.RESPONDIDA, ESTADO.SIN_EVIDENCIA];
}

/** Mi propio correo, para no confundir mis mensajes con los de la oficina. */
function esMiMensaje(mensaje, miCorreo) {
  var de = String(mensaje.getFrom() || '').toLowerCase();
  return de.indexOf(miCorreo) >= 0;
}

/**
 * Revisa el hilo de una obligacion y recoge lo que haya llegado.
 * Devuelve lo que encontro, sin escribir en la hoja: quien escribe es
 * revisarRespuestas(), que agrupa.
 */
function leerHilo(o, miCorreo) {
  var hilo;
  try {
    hilo = GmailApp.getThreadById(String(o.hilo_id).trim());
  } catch (e) {
    return { error: 'no se pudo abrir el hilo (' + e.message + ')' };
  }
  if (!hilo) return { error: 'el hilo ya no existe' };

  var mensajes = hilo.getMessages();
  var visto = String(o.ultimo_mensaje || '').trim();

  // solo lo que llego DESPUES de lo ultimo que ya procesamos
  var desde = 0;
  if (visto) {
    for (var i = 0; i < mensajes.length; i++) {
      if (mensajes[i].getId() === visto) { desde = i + 1; break; }
    }
  }

  var nuevos = [], adjuntos = [], ultimo = visto, fecha = null, de = '';
  for (var j = desde; j < mensajes.length; j++) {
    var m = mensajes[j];
    ultimo = m.getId();
    if (esMiMensaje(m, miCorreo)) continue;      // es mio, no es respuesta

    nuevos.push(m);
    fecha = m.getDate();
    de = String(m.getFrom() || '');
    m.getAttachments().forEach(function (a) {
      // las firmas y los logos incrustados no son el sellado
      if (a.getSize() < 2048) return;
      adjuntos.push(a);
    });
  }

  return { respuestas: nuevos.length, adjuntos: adjuntos, ultimo: ultimo,
           fecha: fecha, de: de, permalink: hilo.getPermalink() };
}

/**
 * Revisa los hilos y guarda lo que llegue. Por lotes, con guardia de tiempo:
 * cada llamada a Gmail es lenta y Apps Script corta a los 6 minutos. Si se
 * queda a medias, se vuelve a correr y sigue: lo ya procesado no se repite,
 * que para eso esta ultimo_mensaje.
 */
function revisarRespuestas() {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var arranque = new Date().getTime();
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = registros(HOJA.OBLIGACIONES).filter(function (o) {
    if (!String(o.id || '').trim()) return false;
    if (!String(o.hilo_id || '').trim()) return false;
    if (estadosEsperanRespuesta().indexOf(String(o.estado).toUpperCase()) < 0) return false;
    // cada quien revisa su propia bandeja
    return String(o.responsable || '').trim().toLowerCase() === q.correo;
  });

  var conRespuesta = 0, conSellado = 0, errores = [], pendientes = 0;

  for (var i = 0; i < todas.length; i++) {
    if ((new Date().getTime() - arranque) / 1000 > SEGUNDOS_MAX) {
      pendientes = todas.length - i;
      break;
    }
    var o = todas[i];
    var r = leerHilo(o, q.correo);

    if (r.error) {
      registrar(o.id, EVENTO.ERROR, 'revisión del hilo: ' + r.error);
      errores.push(o.municipio + ' ' + o.impuesto + ': ' + r.error);
      continue;
    }
    if (!r.respuestas && r.ultimo === String(o.ultimo_mensaje || '').trim()) continue;

    var campos = { ultimo_mensaje: r.ultimo };

    // el adjunto va a Sellados, en la carpeta del municipio y el impuesto
    var guardado = null;
    if (r.adjuntos.length) {
      try {
        var dir = carpetaSellado(o.vigencia, o.municipio, o.impuesto);
        var a = r.adjuntos[r.adjuntos.length - 1];   // el ultimo que mandaron
        var ext = a.getName().indexOf('.') > 0
          ? a.getName().slice(a.getName().lastIndexOf('.')) : '';
        var nombre = (o.municipio + ' ' + o.impuesto + ' ' + o.periodo + ' sellado')
          .replace(/[\\/:*?"<>|]/g, '-') + ext;
        guardado = dir.createFile(a.copyBlob().setName(nombre));
        campos.sellado_id = guardado.getId();
        conSellado++;
      } catch (e) {
        registrar(o.id, EVENTO.ERROR, 'no se pudo guardar el sellado: ' + e.message);
        errores.push(o.municipio + ' ' + o.impuesto + ': ' + e.message);
      }
    }

    if (r.respuestas) {
      conRespuesta++;
      if (!o.fecha_respuesta && r.fecha) campos.fecha_respuesta = r.fecha;
      escribirCampos(HOJA.OBLIGACIONES, o._fila, campos);
      registrar(o.id, EVENTO.RESPONDIDA,
        r.respuestas + ' mensaje(s) de ' + r.de +
        (guardado ? ' · sellado guardado: ' + guardado.getName()
                  : ' · sin adjunto'));

      // ENVIADA pasa a RESPONDIDA; lo que ya estaba RESPONDIDA se queda,
      // porque una respuesta mas no cambia el estado, solo suma evidencia
      if (String(o.estado).toUpperCase() === ESTADO.ENVIADA) {
        try {
          aplicar(o.id, ESTADO.RESPONDIDA, { detalle: 'respuesta de ' + r.de });
        } catch (e) { /* el estado no es critico: la evidencia ya quedo */ }
      }
    } else {
      escribirCampos(HOJA.OBLIGACIONES, o._fila, campos);
    }
  }

  return {
    revisadas: todas.length - pendientes,
    con_respuesta: conRespuesta,
    con_sellado: conSellado,
    pendientes: pendientes,
    errores: errores
  };
}

/** El enlace para abrir el sellado desde la interfaz. */
function apiEnlaceSellado(id) {
  var o = registros(HOJA.OBLIGACIONES).filter(function (r) {
    return String(r.id) === String(id);
  })[0];
  if (!o || !String(o.sellado_id || '').trim()) {
    throw new Error('Esa obligación todavía no tiene sellado.');
  }
  exigeMia(o.responsable, 'editarAjenas');
  return 'https://drive.google.com/file/d/' + String(o.sellado_id).trim() + '/view';
}

/** El enlace al hilo de Gmail, para leer la conversación entera. */
function apiEnlaceHilo(id) {
  var o = registros(HOJA.OBLIGACIONES).filter(function (r) {
    return String(r.id) === String(id);
  })[0];
  if (!o || !String(o.hilo_id || '').trim()) {
    throw new Error('Esa obligación no tiene hilo guardado.');
  }
  exigeMia(o.responsable, 'editarAjenas');
  try {
    return GmailApp.getThreadById(String(o.hilo_id).trim()).getPermalink();
  } catch (e) {
    throw new Error('El hilo ya no está en tu bandeja.');
  }
}

/** La pantalla de respuestas. */
function apiRespuestas() {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var mias = puede('editarAjenas') ? listarTodas('abiertas')
           : listarTodas('abiertas').filter(function (o) { return o.mia; });

  var enviadas = mias.filter(function (o) {
    return o.cadena.envio || estadosEsperanRespuesta().indexOf(o.estado) >= 0;
  });

  var tramos = [
    { id: 'sellado', et: 'Con sellado guardado',
      detalle: 'La oficina respondió y el documento ya está en Drive.',
      nivel: 'aldia',
      filas: enviadas.filter(function (o) { return o.cadena.sellado; }) },
    { id: 'responde_sin_sellado', et: 'Respondieron, pero sin adjunto',
      detalle: 'Hay respuesta en el hilo y no venía ningún documento.',
      nivel: 'porvencer',
      filas: enviadas.filter(function (o) {
        return !o.cadena.sellado && o.cadena.respuesta; }) },
    { id: 'sin_respuesta', et: 'Enviadas, sin respuesta todavía',
      detalle: 'El correo salió y la oficina no ha contestado.',
      nivel: '',
      filas: enviadas.filter(function (o) {
        return !o.cadena.sellado && !o.cadena.respuesta; }) }
  ];

  return {
    tramos: tramos.filter(function (t) { return t.filas.length; }),
    total: enviadas.length,
    con_sellado: tramos[0].filas.length,
    sin_respuesta: tramos[2].filas.length,
    generado: fechaHoraTexto(new Date())
  };
}

/** El boton "Revisar respuestas ahora". */
function apiRevisarRespuestas() {
  var r = revisarRespuestas();
  r.lista = apiRespuestas();
  return r;
}
