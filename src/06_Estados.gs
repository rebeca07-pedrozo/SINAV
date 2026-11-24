/** SINAV · maquina de estados. Las reglas son puras: se pueden probar sin hojas. */

/** Transicion permitida por el grafo, sin mirar datos. */
function puedePasar(de, a) {
  var salidas = TRANSICIONES[String(de || '').trim().toUpperCase()];
  if (!salidas) return false;
  return salidas.indexOf(String(a || '').trim().toUpperCase()) >= 0;
}

/**
 * LA REGLA: sin soporte no hay envio, sin excepcion.
 * Pura. La usan el servidor antes de enviar y el cliente para apagar la casilla.
 * fila: {estado, soporte_id, requiere_envio, correo_oficina}
 */
function puedeEnviar(fila) {
  var f = fila || {};
  if (String(f.requiere_envio || '').toUpperCase() !== 'SI') {
    return { ok: false, motivo: 'requiere_envio no es SI' };
  }
  if (!String(f.soporte_id || '').trim()) {
    return { ok: false, motivo: 'sin soporte' };
  }

  if (String(f.estado || '').toUpperCase() !== ESTADO.LISTA) {
    return { ok: false, motivo: 'el estado es ' + (f.estado || 'vacio') + ', no LISTA' };
  }
  if (!normCorreos(f.correo_oficina)) {
    return { ok: false, motivo: 'sin correo de oficina' };
  }
  return { ok: true, motivo: '' };
}

/**
 * Los soportes de una obligacion, en orden. El primero es la declaracion; los
 * demas son anexos (el comprobante de pago, el formulario, lo que haga falta).
 *
 * Van todos en la MISMA celda separados por coma, no en columnas nuevas: el
 * numero de anexos no se sabe de antemano, y una columna por anexo seria
 * adivinar cuantos caben.
 */
function listaSoportes(v) {
  return listaIds(v && typeof v === 'object' ? v.soporte_id : v);
}

/** Varios ids de Drive en una celda, separados por coma. Sin repetidos. */
function listaIds(v) {
  var salida = [], vistos = {};
  String(v || '').split(/[,;\s]+/).forEach(function (x) {
    var s = x.trim();
    if (!s || vistos[s]) return;
    vistos[s] = true;
    salida.push(s);
  });
  return salida;
}

/**
 * El soporte esta revisado: alguien lo MIRO y es el mismo archivo que se vio.
 *
 * Esto NO entra en puedeEnviar() a proposito. puedeEnviar() responde "¿se
 * puede seleccionar esta fila?", y si exigiera la revision no se podria
 * seleccionar nada para llegar a revisarlo: un circulo cerrado. La revision es
 * la ultima puerta, justo antes de que salga el correo.
 */
function soporteRevisado(fila) {
  var f = fila || {};
  var tiene = listaSoportes(f.soporte_id);
  if (!tiene.length) return false;

  var vistos = {};
  listaSoportes(f.soporte_revisado).forEach(function (x) { vistos[x] = true; });

  // TODOS los archivos que se van a adjuntar tienen que estar revisados: si se
  // anade un anexo despues del visto bueno, ese anexo tambien hay que verlo
  for (var i = 0; i < tiene.length; i++) {
    if (!vistos[tiene[i]]) return false;
  }
  return true;
}

/**
 * Valida un cambio de estado contra el grafo y contra los datos de la fila.
 * Pura: recibe el perfil y la fila, no los busca. opts: {motivo}
 */
function validarPaso(fila, a, opts, perfil) {
  var o = opts || {};
  var de = String(fila.estado || '').toUpperCase();
  a = String(a || '').toUpperCase();

  if (de === a) return { ok: false, motivo: 'ya esta en ' + a };
  if (!puedePasar(de, a)) return { ok: false, motivo: 'no se puede pasar de ' + de + ' a ' + a };

  if (a === ESTADO.LISTA && !String(fila.soporte_id || '').trim()) {
    return { ok: false, motivo: 'LISTA exige soporte: sin soporte no hay envío' };
  }
  // REQ-012: el visto bueno es del cargo de supervision (PROFESIONAL-III),
  // no de una persona concreta. Se recibe el PERFIL ya resuelto, para que esta
  // funcion siga siendo pura y se pueda probar sin hojas.
  if ((a === ESTADO.REVISADA || a === ESTADO.APROBADA) &&
      SUPERVISORES.indexOf(perfil) < 0) {
    return { ok: false, motivo: a + ' solo la pone PROFESIONAL-III o ADMIN' };
  }
  if (a === ESTADO.DEVUELTA && !String(o.motivo || '').trim()) {
    return { ok: false, motivo: 'DEVUELTA exige motivo' };
  }
  if (a === ESTADO.ENVIADA) {
    var e = puedeEnviar(fila);
    if (!e.ok) return { ok: false, motivo: e.motivo };
    // la ultima puerta: el soporte hay que haberlo visto
    if (!soporteRevisado(fila)) {
      return { ok: false, motivo: 'falta revisar el soporte' };
    }
  }
  return { ok: true, motivo: '' };
}

/** El evento que corresponde a cada estado de llegada. */
function eventoDe(estado) {
  var mapa = {};
  mapa[ESTADO.LISTA] = EVENTO.SOPORTE_CARGADO;
  mapa[ESTADO.ENVIADA] = EVENTO.ENVIADA;
  mapa[ESTADO.RESPONDIDA] = EVENTO.RESPONDIDA;
  mapa[ESTADO.REVISADA] = EVENTO.REVISADA;
  mapa[ESTADO.APROBADA] = EVENTO.APROBADA;
  mapa[ESTADO.DEVUELTA] = EVENTO.DEVUELTA;
  mapa[ESTADO.SIN_EVIDENCIA] = EVENTO.AVISO;
  mapa[ESTADO.REBOTADO] = EVENTO.ERROR;
  return mapa[estado] || EVENTO.AVISO;
}

/**
 * Aplica el cambio de estado: valida, escribe la fila y registra el evento.
 * El vencimiento NUNCA se reinicia, ni al devolver.
 */
function aplicar(id, a, opts) {
  var o = opts || {};
  return conCerrojo(function () {
    var fila = buscarFila(id);
    if (!fila) throw new Error('No existe la obligación ' + id);

    var ix = indices(HOJA.OBLIGACIONES);
    var h = hoja(HOJA.OBLIGACIONES);
    var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
    var actual = {};
    COLS.OBLIGACIONES.forEach(function (c) { if (c in ix) actual[c] = val[ix[c]]; });

    exigeMia(actual.responsable, 'editarAjenas');

    var v = validarPaso(actual, a, o, perfilDe(yo()));
    if (!v.ok) {
      registrar(id, EVENTO.ERROR, 'paso rechazado: ' + v.motivo);
      throw new Error(v.motivo);
    }

    var campos = { estado: a };

    if (a === ESTADO.DEVUELTA) {
      campos.motivo_devuelta = String(o.motivo).trim();
      campos.estado_previo = actual.estado;
      campos.reprocesos = (Number(actual.reprocesos) || 0) + 1;
    }
    if (a === ESTADO.REVISADA || a === ESTADO.APROBADA) {
      campos.revision_fecha = new Date();
      campos.revision_por = yo().correo;
    }
    if (o.campos) Object.keys(o.campos).forEach(function (k) { campos[k] = o.campos[k]; });

    escribirCampos(HOJA.OBLIGACIONES, fila, campos);
    registrar(id, eventoDe(a), o.detalle || (actual.estado + ' -> ' + a +
      (campos.motivo_devuelta ? ': ' + campos.motivo_devuelta : '')));

    return { id: id, estado: a };
  });
}

/** Marcar REVISADA / APROBADA / DEVUELTA desde la interfaz. */
function apiCambiarEstado(id, a, motivo) {
  if (a === ESTADO.REVISADA || a === ESTADO.APROBADA) exige('revisar');
  return aplicar(id, a, { motivo: motivo });
}
