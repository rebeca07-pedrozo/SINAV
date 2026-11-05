/**
 * SINAV · instalar().
 * Crea todo: hojas, encabezados, formatos, carpetas de Drive, el ADMIN y tres
 * filas de prueba. Es idempotente: correrlo dos veces no duplica nada.
 */

function instalar() {
  return conCerrojo(function () {
    var hecho = [];

    hecho.push(asegurarHojas());
    hecho.push(asegurarCarpetas());
    hecho.push(asegurarConfig());
    hecho.push(asegurarAdmin());
    hecho.push(asegurarEtiqueta());
    hecho.push(asegurarPruebas());

    _cacheConfig = null;
    _yo = null;

    var resumen = hecho.filter(String).join('\n');
    Logger.log(resumen);
    return resumen;
  });
}

/** El menu del Sheets, para no tener que abrir el editor cada vez. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SINAV')
    .addItem('Instalar / verificar', 'instalar')
    .addItem('Correr pruebas', 'pruebas')
    .addToUi();
}

function asegurarHojas() {
  var l = libro();
  var notas = [];

  Object.keys(HOJA).forEach(function (k) {
    var nombre = HOJA[k];
    var cols = COLS[k];
    var h = l.getSheetByName(nombre);

    if (!h) {
      h = l.insertSheet(nombre);
      notas.push('hoja ' + nombre + ': creada');
    }

    // encabezados: se escriben solo si no coinciden
    var anchoActual = Math.max(h.getLastColumn(), cols.length);
    var cab = h.getRange(1, 1, 1, anchoActual).getValues()[0]
               .slice(0, cols.length).map(function (v) { return String(v).trim(); });
    if (cab.join('|') !== cols.join('|')) {
      h.getRange(1, 1, 1, cols.length).setValues([cols]);
      notas.push('hoja ' + nombre + ': encabezados puestos al dia');
    }

    h.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    if (h.getFrozenRows() < 1) h.setFrozenRows(1);

    // los codigos son texto: asi "0851" no se vuelve 851
    (COLS_TEXTO[k] || []).forEach(function (c) {
      var i = cols.indexOf(c);
      if (i >= 0) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('@');
    });

    if (k === 'OBLIGACIONES') {
      ['vencimiento', 'revision_fecha', 'presentacion_fecha'].forEach(function (c) {
        var i = cols.indexOf(c);
        if (i >= 0) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');
      });
      ['fecha_envio', 'fecha_respuesta'].forEach(function (c) {
        var i = cols.indexOf(c);
        if (i >= 0) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
      });
    }
    if (k === 'EVENTOS') {
      h.getRange(2, 1, h.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
  });

  // la hoja que trae el libro nuevo, si quedo vacia
  var sobra = l.getSheetByName('Hoja 1') || l.getSheetByName('Sheet1') ||
              l.getSheetByName('Hoja1');
  if (sobra && l.getSheets().length > 1 && sobra.getLastRow() === 0) {
    l.deleteSheet(sobra);
    notas.push('se borró la hoja vacía que trae el libro nuevo');
  }

  return notas.join('\n');
}

/** Carpetas de Drive. Se buscan por nombre antes de crearlas. */
function asegurarCarpetas() {
  var raiz = carpetaPorNombre(DriveApp.getRootFolder(), CARPETA_RAIZ);
  var soportes = carpetaPorNombre(raiz, 'Soportes');
  var sellados = carpetaPorNombre(raiz, 'Sellados');

  var notas = [];
  [['carpeta_soportes', soportes], ['carpeta_sellados', sellados]].forEach(function (par) {
    var actual = config(par[0]);
    var viva = false;
    if (actual) {
      try { DriveApp.getFolderById(actual); viva = true; } catch (e) { viva = false; }
    }
    if (!viva) {
      ponerConfigSiHace(par[0], par[1].getId(), true);
      notas.push('CONFIG.' + par[0] + ': ' + par[1].getId());
    }
  });
  return notas.join('\n');
}

function carpetaPorNombre(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

/** Escribe un parametro sin pasar por el permiso de ADMIN (solo lo usa instalar). */
function ponerConfigSiHace(clave, valor, forzar) {
  var h = hoja(HOJA.CONFIG);
  var f = filas(HOJA.CONFIG);
  for (var i = 0; i < f.length; i++) {
    if (String(f[i][0]).trim() === clave) {
      if (forzar || String(f[i][1]).trim() === '') h.getRange(i + 2, 2).setValue(valor);
      _cacheConfig = null;
      return false;
    }
  }
  agregarFilas(HOJA.CONFIG, [[clave, valor]]);
  _cacheConfig = null;
  return true;
}

/** Los parametros base. modo = PRUEBA se escribe una vez y no se vuelve a tocar. */
function asegurarConfig() {
  var nuevos = [];
  CONFIG_BASE.forEach(function (par) {
    if (ponerConfigSiHace(par[0], par[1], false)) nuevos.push(par[0]);
  });
  return nuevos.length ? 'CONFIG: se agrego ' + nuevos.join(', ') : '';
}

/** Me inscribe como ADMIN. Si ya estoy, no hace nada. */
function asegurarAdmin() {
  var correo = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!correo) return 'USUARIOS: no se pudo leer el correo del usuario';

  var ix = indices(HOJA.USUARIOS);
  var f = filas(HOJA.USUARIOS);
  for (var i = 0; i < f.length; i++) {
    if (String(f[i][ix.correo]).trim().toLowerCase() === correo) {
      return '';
    }
  }
  agregarFilas(HOJA.USUARIOS, [[correo, correo.split('@')[0], ROL.ADMIN, 'SI']]);
  return 'USUARIOS: ' + correo + ' inscrito como ADMIN';
}

function asegurarEtiqueta() {
  try {
    etiqueta();
    return '';
  } catch (e) {
    return 'Gmail: no se pudo crear la etiqueta ' + ETIQUETA + ' (' + e + ')';
  }
}

/**
 * Tres filas de prueba: una normal, una sin soporte a proposito, y una ya vencida.
 * Se identifican por id, asi que correr instalar() de nuevo no las duplica.
 * La periodicidad va sucia a proposito, como viene del origen, para que se vea
 * que se normaliza en la entrada.
 */
function asegurarPruebas() {
  var yoCorreo = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  var d = function (dias) {
    var x = new Date();
    x.setDate(x.getDate() + dias);
    return x;
  };

  var crudas = [
    { cod_dane: '11001', cod_oficina: '0851', municipio: 'Bogotá D.C.',
      impuesto: 'RETEICA', regimen: '', periodo: '2026-11', periodicidad: 'MENSUAL ',
      vencimiento: d(12), nit_municipio: '899999061', valor: 4820350,
      correo_oficina: 'oficina.chapinero@davivienda.com', responsable: yoCorreo,
      tipo_presentacion: 'OFICINA', medio_pago: 'OFICINA', requiere_envio: 'SI',
      exogena: 'SI', incluye_retencion: '', nota: 'Fila de prueba: normal, con soporte.',
      conSoporte: true },

    { cod_dane: '05001', cod_oficina: '0742', municipio: 'Medellín',
      impuesto: 'AUTORRETEICA', regimen: 'GENERAL', periodo: '2026-11',
      periodicidad: 'Mensual', vencimiento: d(3), nit_municipio: '890905211',
      valor: 1230000, correo_oficina: 'oficina.poblado@davivienda.com',
      responsable: yoCorreo, tipo_presentacion: 'OFICINA', medio_pago: 'PAGADURIA',
      requiere_envio: 'SI', exogena: '', incluye_retencion: 'SI',
      nota: 'Fila de prueba: SIN soporte a propósito. No se debe poder seleccionar.',
      conSoporte: false },

    { cod_dane: '76001', cod_oficina: '0304', municipio: 'Cali',
      impuesto: 'ICA', regimen: 'GENERAL', periodo: '2026-B5',
      periodicidad: 'Bimestral ', vencimiento: d(-6), nit_municipio: '890399011',
      valor: 7905100, correo_oficina: 'oficina.granada@davivienda.com,tesoreria.cali@davivienda.com',
      responsable: yoCorreo, tipo_presentacion: 'OFICINA', medio_pago: 'PSE',
      requiere_envio: 'SI', exogena: '', incluye_retencion: '',
      nota: 'Fila de prueba: ya vencida. El vencimiento no se reinicia nunca.',
      conSoporte: true }
  ];

  var ix = indices(HOJA.OBLIGACIONES);
  var existentes = {};
  filas(HOJA.OBLIGACIONES).forEach(function (f) {
    existentes[String(f[ix.id]).trim()] = true;
  });

  var nuevas = [], eventos = [], notas = [];

  crudas.forEach(function (cruda) {
    var n = normObligacion(cruda);
    if (n.problemas.length) {
      notas.push('fila de prueba ' + cruda.municipio + ': ' + n.problemas.join('; '));
      return;
    }
    if (existentes[n.fila.id]) return;

    var o = n.fila;
    o.soporte_id = cruda.conSoporte ? soportePrueba(o) : '';
    o.estado = o.soporte_id ? ESTADO.LISTA : ESTADO.PENDIENTE;
    o.reprocesos = 0;

    var fila = COLS.OBLIGACIONES.map(function (c) {
      return o[c] === undefined || o[c] === null ? '' : o[c];
    });
    nuevas.push(fila);
    eventos.push({ id: o.id, quePaso: EVENTO.CREADA,
                   detalle: 'fila de prueba (' + o.periodicidad + ' normalizada desde "' +
                            String(cruda.periodicidad) + '")' });
    if (o.soporte_id) {
      eventos.push({ id: o.id, quePaso: EVENTO.SOPORTE_CARGADO, detalle: 'soporte de prueba' });
    }
  });

  if (nuevas.length) {
    agregarFilas(HOJA.OBLIGACIONES, nuevas);
    registrarVarios(eventos);
    notas.push('OBLIGACIONES: ' + nuevas.length + ' filas de prueba creadas');
  }
  return notas.join('\n');
}

/** Un soporte de verdad en Drive, para que el envio de prueba tenga que adjuntar algo. */
function soportePrueba(o) {
  var nombre = o.municipio + ' ' + o.impuesto + ' ' + o.periodo + ' (prueba).txt';
  var dir = carpeta('carpeta_soportes');
  var it = dir.getFilesByName(nombre);
  if (it.hasNext()) return it.next().getId();

  var texto = [
    'SOPORTE DE PRUEBA - SINAV',
    '',
    'Municipio: ' + o.municipio + ' (DANE ' + o.cod_dane + ')',
    'Impuesto: ' + o.impuesto + ' - régimen ' + o.regimen,
    'Periodo: ' + o.periodo + ' (' + o.periodicidad + ')',
    'Vence: ' + fechaTexto(o.vencimiento),
    'NIT del municipio: ' + o.nit_municipio,
    '',
    'Este archivo existe para que el envío de prueba tenga algo que adjuntar.',
    'Reemplázalo por la declaración real antes de salir de modo PRUEBA.'
  ].join('\n');

  return dir.createFile(Utilities.newBlob(texto, 'text/plain', nombre)).getId();
}
