/**
 * SINAV · digitalizacion manual.
 *
 * Los campos que nadie puede deducir de un correo y que alguien tiene que
 * escribir a mano. Las columnas ya existian en el maestro; lo que faltaba era
 * poder escribirlas sin abrir el libro.
 *
 * Lo que NO se edita aqui:
 *  - revision_fecha / revision_por: los pone la maquina de estados cuando el
 *    JEFE marca REVISADA o APROBADA. El "ok de Eli" es un cambio de estado,
 *    no un campo de texto.
 *  - estado, soporte_id, hilo_id, fecha_envio: son evidencia, las escribe el
 *    programa.
 *  - periodo, cod_dane, impuesto, regimen: forman el id. Cambiarlos seria
 *    otra obligacion, no la misma editada.
 */

/**
 * Lo unico que se puede escribir desde la pantalla, y con que se valida.
 *
 * Es una FUNCION y no un `var` por lo mismo que estadosPorEnviar(): un `var`
 * aqui se evaluaria al cargar el archivo, y si este carga antes que
 * 00_Constantes, TIPOS_PRESENTACION y los demas todavia no existen.
 * El resultado se memoriza, que se pide varias veces por ejecucion.
 */
var _camposEditables = null;

function camposEditables() {
  if (_camposEditables) return _camposEditables;
  _camposEditables = {
  tipo_presentacion: { et: 'Tipo de presentación', tipo: 'lista',
                       valores: TIPOS_PRESENTACION, norm: 'normTipoPresentacion' },
  paga_quien:        { et: 'Quién paga', tipo: 'lista',
                       valores: PAGA_QUIEN, norm: 'normPagaQuien' },
  forma_pago:        { et: 'Forma de pago', tipo: 'lista', vacio: true,
                       valores: FORMAS_PAGO, norm: 'normFormaPago' },
  periodicidad:      { et: 'Periodicidad', tipo: 'lista',
                       valores: PERIODICIDADES, norm: 'normPeriodicidad' },
  requiere_envio:    { et: 'Se envía a la oficina', tipo: 'lista',
                       valores: ['SI', 'NO', 'REVISAR'], norm: 'normSiNoRevisar' },
  exogena:           { et: 'Exógena', tipo: 'lista', valores: ['SI', 'NO'],
                       norm: 'normSiNoCampo', solo: 'RETEICA' },
  incluye_retencion: { et: 'Incluye retención', tipo: 'lista', valores: ['SI', 'NO'],
                       norm: 'normSiNoCampo', solo: 'AUTORRETEICA' },
  valor:             { et: 'Valor liquidado', tipo: 'valor', norm: 'normValor' },
  presentacion_fecha:{ et: 'Fecha de presentación', tipo: 'fecha', norm: 'normFecha' },
  // El envio FISICO por correspondencia, con su adhesivo. No es la fecha en
  // que sale el correo: esa la pone SINAV sola.
  fecha_despacho:    { et: 'Fecha de despacho', tipo: 'fecha', vacio: true,
                       norm: 'normFecha' },
  adhesivo:          { et: 'Sticker de correspondencia', tipo: 'texto',
                       norm: 'normTexto' },
  consecutivo_giro:  { et: 'Consecutivo de giro', tipo: 'texto', norm: 'normTexto' },
    nota:              { et: 'Nota', tipo: 'texto', norm: 'normTexto' }
  };
  return _camposEditables;
}

/**
 * Lo que el correo a la oficina necesita SI O SI, en el orden en que se pide.
 *
 * No es una regla de la maquina de estados: una obligacion sin valor existe
 * perfectamente. Es que el correo quedaria diciendo "por el valor de $0", y
 * eso lo lee un director de oficina que tiene que girar esa plata.
 */
function camposDelCorreo() {
  // el adhesivo NO esta aqui a proposito: lo trae repartirAdhesivos() de la
  // hoja ADHESIVOS y ya vive en la columna. Pedirlo a mano seria hacer dos
  // veces un trabajo que ya se hizo.
  // el consecutivo de giro tampoco: lo asigna el envio con las iniciales de
  // quien manda, el mes del periodo y la cuenta de ese mes
  return ['valor', 'paga_quien', 'forma_pago', 'fecha_despacho',
          'tipo_presentacion'];
}

/**
 * Los que no pueden ir vacios.
 *
 * El adhesivo SI esta: el sobre viaja con ese numero y sin el la oficina no
 * sabe que esta recibiendo. En teoria nunca falta, porque lo trae
 * repartirAdhesivos(); cuando falta, la pantalla deja escribirlo a mano, pero
 * el correo no sale sin el.
 */
function camposObligatoriosDelCorreo() {
  return ['valor', 'paga_quien', 'adhesivo'];
}

/**
 * Que le falta a una obligacion para poder mandar el correo.
 * Pura: recibe la fila y devuelve las etiquetas de lo que falta.
 */
function faltaParaElCorreo(fila) {
  var f = fila || {};
  var mapa = camposEditables();
  var falta = [];
  camposObligatoriosDelCorreo().forEach(function (k) {
    var v = f[k];
    var vacio = v === null || v === undefined || String(v).trim() === '' ||
                (k === 'valor' && !Number(v));
    if (vacio) falta.push(mapa[k] ? mapa[k].et : k);
  });
  return falta;
}

/* los normalizadores que solo usa esta pantalla */
function normSiNoRevisar(v) { return normSiNo(v, true) || 'REVISAR'; }
function normSiNoCampo(v) { return normSiNo(v) || 'NO'; }
function normTexto(v) { return String(v === null || v === undefined ? '' : v).trim(); }

/** Las listas que la pantalla necesita para pintar los desplegables. */
function apiCamposOpciones() {
  var out = {};
  var mapa = camposEditables();
  Object.keys(mapa).forEach(function (k) {
    var d = mapa[k];
    out[k] = { et: d.et, tipo: d.tipo, valores: d.valores || null,
               vacio: !!d.vacio, solo: d.solo || '' };
  });
  return out;
}

/**
 * CAMPOS_EDITABLES guarda el normalizador por NOMBRE, no la funcion, porque en
 * Apps Script el orden de carga de los archivos no esta garantizado y una
 * referencia directa podria quedar en undefined al definirse el objeto.
 */
function normalizadorPorNombre(nombre) {
  var m = {
    normTipoPresentacion: normTipoPresentacion,
    normPagaQuien: normPagaQuien,
    normFormaPago: normFormaPago,
    normPeriodicidad: normPeriodicidad,
    normSiNoRevisar: normSiNoRevisar,
    normSiNoCampo: normSiNoCampo,
    normValor: normValor,
    normFecha: normFecha,
    normTexto: normTexto
  };
  if (!m[nombre]) throw new Error('Normalizador desconocido: ' + nombre);
  return m[nombre];
}

/** Aplica el normalizador que le toca a cada campo. */
function normalizarCampo(clave, valor, impuesto) {
  var d = camposEditables()[clave];
  if (!d) throw new Error('Ese campo no se puede editar: ' + clave);

  // exogena solo tiene sentido en RETEICA, incluye_retencion solo en
  // AUTORRETEICA. En los demas impuestos la respuesta es NO, no "vacio".
  if (d.solo && d.solo !== impuesto) return 'NO';

  if (d.vacio && String(valor === null || valor === undefined ? '' : valor).trim() === '') {
    return '';
  }

  return normalizadorPorNombre(d.norm)(valor);
}

/**
 * Guarda los campos manuales de una obligacion.
 * campos es {clave: valor} y solo se aceptan las claves de CAMPOS_EDITABLES.
 */
function apiGuardarCampos(id, campos) {
  if (!id) throw new Error('Falta el id de la obligación.');
  var entrada = campos || {};
  var editables = camposEditables();
  var claves = Object.keys(entrada).filter(function (k) {
    return editables[k];
  });
  if (!claves.length) throw new Error('No llegó ningún campo editable.');

  // las columnas nuevas pueden no existir todavia en un libro creado antes:
  // mejor decirlo que escribir en la columna de al lado
  var ixHoja = indices(HOJA.OBLIGACIONES);
  claves.forEach(function (k) { exigeColumna(ixHoja, k); });

  return conCerrojo(function () {
    var fila = buscarFila(id);
    if (!fila) throw new Error('No existe la obligación ' + id);

    var ix = indices(HOJA.OBLIGACIONES);
    var h = hoja(HOJA.OBLIGACIONES);
    var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];

    exigeMia(val[ix.responsable], 'editarAjenas');

    var estado = String(val[ix.estado]).toUpperCase();
    if (estado === ESTADO.APROBADA) {
      throw new Error('Una obligación APROBADA ya es evidencia cerrada: no se edita.');
    }

    var impuesto = String(val[ix.impuesto]).toUpperCase();
    var aEscribir = {};
    var bitacora = [];

    claves.forEach(function (k) {
      if (!(k in ix)) return;                       // la columna no existe en la hoja
      var nuevo = normalizarCampo(k, entrada[k], impuesto);
      var viejo = val[ix[k]];

      // se comparan como texto para que una fecha y un numero no se declaren
      // distintos solo por el tipo
      var a = viejo instanceof Date ? fechaTexto(viejo) : String(viejo === null || viejo === undefined ? '' : viejo).trim();
      var b = nuevo instanceof Date ? fechaTexto(nuevo) : String(nuevo === null || nuevo === undefined ? '' : nuevo).trim();
      if (a === b) return;

      aEscribir[k] = nuevo;
      bitacora.push(editables[k].et + ': ' + (a || '(vacío)') + ' -> ' + (b || '(vacío)'));
    });

    if (!Object.keys(aEscribir).length) {
      return { id: id, cambios: 0, detalle: 'Nada cambió.' };
    }

    escribirCampos(HOJA.OBLIGACIONES, fila, aEscribir);
    registrar(id, EVENTO.CAMPOS_EDITADOS, bitacora.join(' · '));

    // la fila ya decorada, para que la pantalla no tenga que recargar la
    // lista entera despues de escribir un solo valor
    var fresca = null;
    try {
      fresca = registros(HOJA.OBLIGACIONES).filter(function (r) {
        return String(r.id) === String(id);
      })[0];
      fresca = fresca ? decorar(fresca) : null;
    } catch (e) {
      fresca = null;
    }

    return { id: id, cambios: bitacora.length, detalle: bitacora.join(' · '),
             fila: fresca };
  });
}
