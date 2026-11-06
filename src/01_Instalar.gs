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
    hecho.push(asegurarRoles());
    hecho.push(asegurarAdmin());
    hecho.push(asegurarValidaciones());
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
    .addItem('Migrar columnas', 'migrar')
    .addItem('Correr pruebas', 'pruebas')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Datos de ejemplo')
      .addItem('Sembrar escenario de ejemplo', 'sembrarEjemploDesdeMenu')
      .addItem('Borrar el ejemplo', 'borrarEjemplo'))
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
  agregarFilas(HOJA.USUARIOS, [filaUsuario(correo, nombreDesdeCorreo(correo),
    ROL.ADMIN, AREA.MUNICIPALES, '')]);
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
      tipo_presentacion: 'OFICINA', paga_quien: 'OFICINA',
      forma_pago: 'TRANSFERENCIA', requiere_envio: 'SI',
      exogena: 'SI', incluye_retencion: '', nota: 'Fila de prueba: normal, con soporte.',
      conSoporte: true },

    { cod_dane: '05001', cod_oficina: '0742', municipio: 'Medellín',
      impuesto: 'AUTORRETEICA', regimen: 'GENERAL', periodo: '2026-11',
      periodicidad: 'Mensual', vencimiento: d(3), nit_municipio: '890905211',
      valor: 1230000, correo_oficina: 'oficina.poblado@davivienda.com',
      responsable: yoCorreo, tipo_presentacion: 'OFICINA', paga_quien: 'PAGADURIA',
      forma_pago: '', requiere_envio: 'SI', exogena: '', incluye_retencion: 'SI',
      nota: 'Fila de prueba: SIN soporte a propósito. No se debe poder seleccionar.',
      conSoporte: false },

    { cod_dane: '76001', cod_oficina: '0304', municipio: 'Cali',
      impuesto: 'ICA', regimen: 'GENERAL', periodo: '2026-B5',
      periodicidad: 'Bimestral ', vencimiento: d(-6), nit_municipio: '890399011',
      valor: 7905100, correo_oficina: 'oficina.granada@davivienda.com,tesoreria.cali@davivienda.com',
      responsable: yoCorreo, tipo_presentacion: 'VIRTUAL', paga_quien: 'OFICINA',
      forma_pago: 'PSE', requiere_envio: 'SI', exogena: '', incluye_retencion: '',
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
  var dir = carpetaSoporte(o.municipio, o.impuesto);
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

/* ===========================================================================
   Roles, validaciones y migracion de columnas.
   =========================================================================== */

/** Arma una fila de USUARIOS por nombre de columna, nunca por posicion. */
function filaUsuario(correo, nombre, rol, area, nivel) {
  var v = { correo: correo, nombre: nombre, rol: rol, activo: 'SI',
            area: area || '', nivel: nivel || '' };
  return COLS.USUARIOS.map(function (c) {
    return v[c] === undefined ? '' : v[c];
  });
}

/**
 * La hoja ROLES es referencia para humanos: dice que puede cada rol y quien lo
 * tiene. Se reescribe en cada instalar() porque la fuente de verdad es
 * ROLES_DEFINICION en el codigo, no lo que alguien haya editado en la hoja.
 */
function asegurarRoles() {
  var h = hoja(HOJA.ROLES);
  var ancho = COLS.ROLES.length;
  var sobran = h.getLastRow() - 1 - ROLES_DEFINICION.length;
  if (sobran > 0) h.deleteRows(2 + ROLES_DEFINICION.length, sobran);
  h.getRange(2, 1, ROLES_DEFINICION.length, ancho).setValues(ROLES_DEFINICION);
  h.getRange(2, 1, ROLES_DEFINICION.length, ancho).setVerticalAlignment('top')
   .setWrap(true);
  h.setColumnWidth(1, 120);
  h.setColumnWidth(2, 280);
  h.setColumnWidth(3, 520);
  return 'hoja ROLES: ' + ROLES_DEFINICION.length + ' roles descritos';
}

/**
 * Listas desplegables en las columnas que se llenan a mano. No son seguridad
 * (el servidor vuelve a normalizar todo), son para que nadie escriba
 * "Profecional" en USUARIOS ni "pce" en forma_pago.
 */
function asegurarValidaciones() {
  var notas = [];

  var poner = function (nombreHoja, columna, valores, permitirVacio) {
    var h = hoja(nombreHoja);
    var ix = indices(nombreHoja);          // el encabezado real, no el esperado
    if (!(columna in ix)) return;
    var i = ix[columna];
    var n = h.getMaxRows() - 1;
    if (n < 1) return;
    var regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(valores, true)
      .setAllowInvalid(!!permitirVacio)
      .build();
    h.getRange(2, i + 1, n, 1).setDataValidation(regla);
    notas.push(nombreHoja + '.' + columna);
  };

  poner(HOJA.USUARIOS, 'rol', [ROL.PROFESIONAL, ROL.JEFE, ROL.ADMIN], false);
  poner(HOJA.USUARIOS, 'activo', ['SI', 'NO'], false);
  poner(HOJA.USUARIOS, 'area', AREAS, true);
  poner(HOJA.USUARIOS, 'nivel', NIVELES, true);

  poner(HOJA.OBLIGACIONES, 'tipo_presentacion', TIPOS_PRESENTACION, true);
  poner(HOJA.OBLIGACIONES, 'paga_quien', PAGA_QUIEN, true);
  poner(HOJA.OBLIGACIONES, 'forma_pago', FORMAS_PAGO, true);
  poner(HOJA.OBLIGACIONES, 'requiere_envio', ['SI', 'NO', 'REVISAR'], true);
  poner(HOJA.OBLIGACIONES, 'exogena', ['SI', 'NO'], true);
  poner(HOJA.OBLIGACIONES, 'incluye_retencion', ['SI', 'NO'], true);
  poner(HOJA.OBLIGACIONES, 'periodicidad', PERIODICIDADES, true);

  return notas.length ? 'validaciones: ' + notas.join(', ') : '';
}

/**
 * migrar() · pasa un libro viejo al esquema nuevo. Idempotente.
 *
 * 1. USUARIOS: normaliza el rol y rellena area y nivel vacios con los valores
 *    por defecto de CONFIG. No reactiva a nadie que tenga activo = NO.
 * 2. OBLIGACIONES: la columna que antes se llamaba medio_pago ahora se llama
 *    paga_quien y ocupa el mismo sitio, asi que los valores viejos siguen ahi.
 *    Un "PSE" guardado ahi era una forma de pago: se mueve a forma_pago y
 *    paga_quien queda en OFICINA. forma_pago que ya tenga valor no se toca,
 *    que es lo que hace que correr esto dos veces no borre nada.
 *
 * No mueve archivos de Drive: los soportes que ya esten en la carpeta plana se
 * quedan donde estan y siguen funcionando. Los nuevos van a la carpeta del
 * municipio.
 */
function migrar() {
  return conCerrojo(function () {
    var notas = [];

    // ---- USUARIOS ----
    var hu = hoja(HOJA.USUARIOS);
    var ixu = indices(HOJA.USUARIOS);
    var fu = filas(HOJA.USUARIOS);
    var rolDef = normalizarRol(config('rol_defecto')) || ROL.PROFESIONAL;
    var areaDef = normalizarArea(config('area_defecto'));
    var nivelDef = normalizarNivel(config('nivel_defecto'));
    var tocadas = 0;

    for (var i = 0; i < fu.length; i++) {
      if (!String(fu[i][ixu.correo]).trim()) continue;
      var cambios = {};

      var rol = normalizarRol(fu[i][ixu.rol]);
      if (!rol) { rol = rolDef; cambios.rol = rol; }
      else if (rol !== String(fu[i][ixu.rol]).trim()) cambios.rol = rol;

      if ('area' in ixu && !normalizarArea(fu[i][ixu.area]) && areaDef) {
        cambios.area = areaDef;
      }
      // el JEFE y el ADMIN no llevan nivel: el nivel es de los profesionales
      if ('nivel' in ixu && !normalizarNivel(fu[i][ixu.nivel]) &&
          rol === ROL.PROFESIONAL && nivelDef) {
        cambios.nivel = nivelDef;
      }

      if (Object.keys(cambios).length) {
        escribirCampos(HOJA.USUARIOS, i + 2, cambios);
        tocadas++;
      }
    }
    if (tocadas) notas.push('USUARIOS: ' + tocadas + ' filas completadas');

    // ---- OBLIGACIONES ----
    var ixo = indices(HOJA.OBLIGACIONES);
    if (!('paga_quien' in ixo) || !('forma_pago' in ixo)) {
      notas.push('OBLIGACIONES: faltan las columnas nuevas. Corre instalar() primero.');
      return notas.join('\n');
    }

    var fo = filas(HOJA.OBLIGACIONES);
    var movidas = 0;
    for (var j = 0; j < fo.length; j++) {
      if (!String(fo[j][ixo.id]).trim()) continue;

      var crudo = fo[j][ixo.paga_quien];
      var pagaNuevo = normPagaQuien(crudo);
      var formaActual = normFormaPago(fo[j][ixo.forma_pago]);
      var formaNueva = formaActual || normFormaPago(crudo);

      var c = {};
      if (String(crudo).trim() !== pagaNuevo) c.paga_quien = pagaNuevo;
      if (String(fo[j][ixo.forma_pago]).trim() !== formaNueva) c.forma_pago = formaNueva;

      if (Object.keys(c).length) {
        escribirCampos(HOJA.OBLIGACIONES, j + 2, c);
        movidas++;
      }
    }
    if (movidas) notas.push('OBLIGACIONES: ' + movidas + ' filas con el pago repartido');

    _cacheConfig = null;
    _yo = null;

    var resumen = notas.length ? notas.join('\n') : 'Nada que migrar: ya está al día.';
    Logger.log(resumen);
    return resumen;
  });
}
