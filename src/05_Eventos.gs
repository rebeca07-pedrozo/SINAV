/** SINAV · el log. Append-only: nadie borra ni edita EVENTOS, solo agrega. */

/** Registra un evento. Devuelve la fila que escribio. */
function registrar(idObligacion, quePaso, detalle) {
  if (!EVENTO[quePaso]) throw new Error('Evento desconocido: ' + quePaso);
  var fila = [new Date(), String(idObligacion || ''), yo().correo || 'sistema',
              quePaso, String(detalle || '')];
  agregarFilas(HOJA.EVENTOS, [fila]);
  return fila;
}

/** Varios eventos de un golpe: una sola escritura. */
function registrarVarios(lista) {
  if (!lista.length) return;
  var actor = yo().correo || 'sistema';
  var ahora = new Date();
  agregarFilas(HOJA.EVENTOS, lista.map(function (e) {
    if (!EVENTO[e.quePaso]) throw new Error('Evento desconocido: ' + e.quePaso);
    return [ahora, String(e.id || ''), actor, e.quePaso, String(e.detalle || '')];
  }));
}

/** El ultimo evento de cada obligacion. El estado lo determina el ultimo, no el primero. */
function ultimoEventoPorObligacion() {
  var ix = indices(HOJA.EVENTOS);
  var mapa = {};
  filas(HOJA.EVENTOS).forEach(function (f) {
    var id = String(f[ix.id_obligacion]);
    var fecha = f[ix.fecha];
    if (!id) return;
    if (!mapa[id] || fecha >= mapa[id].fecha) {
      mapa[id] = { fecha: fecha, quePaso: f[ix.que_paso], actor: f[ix.actor],
                   detalle: f[ix.detalle] };
    }
  });
  return mapa;
}

/** Los eventos de una obligacion, del mas viejo al mas nuevo. */
function eventosDe(id) {
  var ix = indices(HOJA.EVENTOS);
  return filas(HOJA.EVENTOS)
    .filter(function (f) { return String(f[ix.id_obligacion]) === String(id); })
    .map(function (f) {
      return { fecha: f[ix.fecha], actor: f[ix.actor], quePaso: f[ix.que_paso],
               detalle: f[ix.detalle] };
    });
}
