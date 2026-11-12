// AUTOGENERADO por build.js a partir de src/*.gs.
// No editar a mano: edita src/ y corre `npm run build`.

// ═════ 00_Constantes.gs ═════

/** SINAV · constantes y esquemas. Nada de esto se ejecuta al cargar. */

var TZ = 'America/Bogota';
var ETIQUETA = 'SINAV';
var CUOTA_DIARIA = 1500;      // destinatarios por persona por dia
var CARPETA_RAIZ = 'SINAV';
var SEGUNDOS_MAX = 270;       // 4m30s del limite de 6 minutos

var HOJA = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  ROLES: 'ROLES',
  VIGENCIAS: 'VIGENCIAS',
  OBLIGACIONES: 'OBLIGACIONES',
  EVENTOS: 'EVENTOS'
};

/**
 * OJO con el orden: asegurarHojas() reescribe la fila 1 sin mover los datos.
 * Una columna nueva SIEMPRE se agrega al final; insertarla en la mitad
 * desalinearia todo lo que ya este escrito debajo.
 *   USUARIOS: area y nivel se agregaron al final por eso.
 *   OBLIGACIONES: medio_pago se renombro a paga_quien EN SU MISMO SITIO y
 *   forma_pago se agrego al final. Correr migrar() reparte los valores viejos.
 */
var COLS = {
  CONFIG: ['parametro', 'valor'],
  USUARIOS: ['correo', 'nombre', 'rol', 'activo', 'area', 'nivel'],
  ROLES: ['rol', 'quien_lo_tiene', 'que_puede_hacer'],
  // REQ-009 y REQ-011. Una fila por vigencia fiscal, con los ids REALES de
  // Drive. Los ids se escriben una vez y no se vuelven a tocar: si alguna vez
  // quedan vacios, la vigencia se marca sin carpetas en vez de crear otras.
  VIGENCIAS: ['vigencia', 'carpeta_exogenas', 'carpeta_declaraciones',
              'carpeta_soportes', 'carpeta_sellados', 'carpeta_sellados_soportes',
              'activa'],
  OBLIGACIONES: [
    'id', 'cod_dane', 'cod_oficina', 'municipio', 'impuesto', 'regimen',
    'periodo', 'periodicidad', 'vencimiento', 'nit_municipio', 'correo_oficina',
    'responsable', 'tipo_presentacion', 'paga_quien', 'requiere_envio',
    'exogena', 'incluye_retencion', 'estado', 'revision_fecha', 'revision_por',
    'presentacion_fecha', 'valor', 'soporte_id', 'fecha_envio', 'hilo_id',
    'fecha_respuesta', 'sellado_id', 'nota',
    'motivo_devuelta', 'estado_previo', 'reprocesos', 'forma_pago',
    // REQ-011: la vigencia fiscal manda sobre el ano de presentacion. Una
    // declaracion de la vigencia 2026 presentada en 2027 se guarda en 2026.
    'vigencia',
    // Bogota tiene varias entidades (Banco Davivienda, Corporacion Financiera...).
    // Vacio = Banco Davivienda, que es el caso normal.
    'entidad'
  ],
  EVENTOS: ['fecha', 'id_obligacion', 'actor', 'que_paso', 'detalle']
};

/** Columnas que se formatean como texto para no perder ceros a la izquierda. */
var COLS_TEXTO = {
  OBLIGACIONES: ['id', 'cod_dane', 'cod_oficina', 'periodo', 'nit_municipio',
                 'soporte_id', 'hilo_id', 'sellado_id'],
  EVENTOS: ['id_obligacion']
};

var ESTADO = {
  PENDIENTE: 'PENDIENTE',
  LISTA: 'LISTA',
  ENVIADA: 'ENVIADA',
  RESPONDIDA: 'RESPONDIDA',
  REVISADA: 'REVISADA',
  APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA',
  SIN_EVIDENCIA: 'SIN_EVIDENCIA',
  REBOTADO: 'REBOTADO'
};

/** A donde puede ir cada estado. Lo que no esta aqui, no pasa. */
var TRANSICIONES = {
  PENDIENTE: ['LISTA'],
  LISTA: ['ENVIADA'],
  ENVIADA: ['RESPONDIDA', 'REBOTADO', 'SIN_EVIDENCIA'],
  RESPONDIDA: ['REVISADA', 'DEVUELTA'],
  REVISADA: ['APROBADA', 'DEVUELTA'],
  APROBADA: [],
  DEVUELTA: ['LISTA'],
  SIN_EVIDENCIA: ['RESPONDIDA'],
  REBOTADO: ['LISTA']
};

/**
 * Los estados en los que todavia se puede poner o cambiar el soporte.
 * Vive aqui y no en 08_Soportes porque lo usan tambien la carga masiva y la
 * pantalla de digitalizacion.
 */
var ESTADOS_ADMITEN_SOPORTE = [ESTADO.PENDIENTE, ESTADO.LISTA, ESTADO.DEVUELTA,
                               ESTADO.REBOTADO];

var EVENTO = {
  CREADA: 'CREADA',
  ASIGNADA: 'ASIGNADA',
  SOPORTE_CARGADO: 'SOPORTE_CARGADO',
  ENVIADA: 'ENVIADA',
  RESPONDIDA: 'RESPONDIDA',
  REVISADA: 'REVISADA',
  APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA',
  CAMPOS_EDITADOS: 'CAMPOS_EDITADOS',
  ALTA_AUTOMATICA: 'ALTA_AUTOMATICA',
  ERROR: 'ERROR',
  AVISO: 'AVISO'
};

var ROL = { ADMIN: 'ADMIN', PROFESIONAL: 'PROFESIONAL' };

var AREA = { MUNICIPALES: 'MUNICIPALES' };
var AREAS = ['MUNICIPALES'];
var NIVELES = ['I', 'II', 'III'];

/**
 * El PERFIL es lo que decide los permisos: el rol y, para los profesionales,
 * tambien el nivel. 'PROFESIONAL-III' es el cargo de supervision del equipo
 * (hoy Elizabeth); 'PROFESIONAL-I' es quien trabaja sus obligaciones.
 *
 * Los permisos estan atados al PERFIL, nunca al nombre de una persona: si
 * manana el cargo lo ocupa otra, se cambia su nivel en USUARIOS y ya.
 */
var PERFIL = {
  ADMIN: 'ADMIN',
  PROFESIONAL_I: 'PROFESIONAL-I',
  PROFESIONAL_II: 'PROFESIONAL-II',
  PROFESIONAL_III: 'PROFESIONAL-III'
};

/** Los perfiles que supervisan al equipo. */
var SUPERVISORES = [PERFIL.ADMIN, PERFIL.PROFESIONAL_III];

/** Quien puede hacer que. El servidor es el unico que lo decide. */
var PERMISO = {
  asignar:      SUPERVISORES,
  revisar:      SUPERVISORES,
  editarAjenas: SUPERVISORES,
  enviarAjenas: SUPERVISORES,
  verMetricas:  SUPERVISORES,
  gestionarAusencias: SUPERVISORES,   // REQ-010
  habilitarVigencia:  SUPERVISORES,   // REQ-011
  configurar:   [PERFIL.ADMIN]
};

/** Se vuelca a la hoja ROLES como referencia, para no tener que adivinar. */
var ROLES_DEFINICION = [
  ['PROFESIONAL-I',
   'Por defecto para cualquier correo del dominio que entre y no este ya en USUARIOS.',
   'Trabaja sus propias obligaciones: sube soportes (uno o en lote), digitaliza los campos manuales y envia a las oficinas. Las ajenas las ve, no las toca.'],
  ['PROFESIONAL-II',
   'Mismo trabajo que el I. Se asigna a mano en USUARIOS.',
   'Lo mismo que PROFESIONAL-I. El nivel se guarda y se muestra, pero hoy no cambia permisos.'],
  ['PROFESIONAL-III',
   'El cargo de supervision del equipo. Hoy lo ocupa Elizabeth. Se asigna a mano en USUARIOS.',
   'Todo lo del profesional sobre CUALQUIER obligacion, mas asignar responsables, dar el visto bueno (REVISADA / APROBADA), devolver con motivo, ver las metricas, registrar ausencias y habilitar una vigencia nueva.'],
  ['ADMIN',
   'Quien administra la herramienta. Uno solo. Se asigna a mano en USUARIOS.',
   'Todo lo del PROFESIONAL-III, mas editar CONFIG y USUARIOS desde la aplicacion.']
];

var IMPUESTOS = ['RETEICA', 'AUTORRETEICA', 'ICA', 'EXOGENA'];
var PERIODICIDADES = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'ANUAL'];

var TIPOS_PRESENTACION = ['OFICINA', 'VIRTUAL'];

/** Quien paga la declaracion. Distinto de COMO se paga. */
var PAGA_QUIEN = ['OFICINA', 'PAGADURIA'];
/** Con que se paga. Lo llenan los profesionales a mano. */
var FORMAS_PAGO = ['TRANSFERENCIA', 'PSE', 'EFECTIVO', 'OTRO'];

/** Sinonimos sucios del origen -> valor normalizado. */
var PERIODICIDAD_SINONIMOS = {
  MENSUAL: 'MENSUAL', MES: 'MENSUAL', MENSUALMENTE: 'MENSUAL',
  BIMESTRAL: 'BIMESTRAL', BIMENSUAL: 'BIMESTRAL', BIMESTRE: 'BIMESTRAL',
  TRIMESTRAL: 'TRIMESTRAL', TRIMESTRE: 'TRIMESTRAL',
  CUATRIMESTRAL: 'CUATRIMESTRAL', CUATRIMESTRE: 'CUATRIMESTRAL',
  ANUAL: 'ANUAL', ANIO: 'ANUAL', ANO: 'ANUAL', ANUALMENTE: 'ANUAL'
};

/**
 * REQ-009. La raiz de Drive que ya existe, con su id REAL. No se crea ni se
 * reemplaza: SINAV se cuelga de lo que el equipo ya organizo a mano.
 *
 *   Territoriales / <vigencia> / Exogenas
 *                              / Declaraciones / Soportes / <municipio> / <impuesto>
 *                                              / Sellados / Soportes
 */
var CARPETA_TERRITORIALES = '1A5j3j-zTw90YPl0cUgZ06vAtQ_D31cn9';

/** Los ids que el equipo ya tiene creados para 2026. */
var VIGENCIAS_CONOCIDAS = [
  { vigencia: '2026',
    carpeta_exogenas:          '1g7S9Lz_Brl4TyQdNdtmkpVySMfZlRqw0',
    carpeta_declaraciones:     '1tPuJWPVvWETyWX7PLlZ1Q_M4c14WtM1t',
    carpeta_soportes:          '1B8XXc9cuHu475vUDq0gpqKKU0nw_54iW',
    carpeta_sellados:          '1WZuxykHsrEQf3c65nTE5RkwFpAUvuPgS',
    carpeta_sellados_soportes: '1lmDCfzEPxdDlpYT-A9lOnhMg7nwZ5vBp',
    activa: 'SI' }
];

/** Los nombres de las subcarpetas, para cuando haya que crear una vigencia. */
var SUBCARPETAS_VIGENCIA = {
  exogenas: 'Exógenas',
  declaraciones: 'Declaraciones',
  soportes: 'Soportes',
  sellados: 'Sellados',
  sellados_soportes: 'Soportes'
};

var CONFIG_BASE = [
  ['nombre_remitente', 'Impuestos Davivienda'],
  ['carpeta_territoriales', CARPETA_TERRITORIALES],
  ['vigencia_actual', '2026'],
  ['dias_aviso', '10,4,2,0'],
  ['modo', 'PRUEBA'],
  ['rol_defecto', 'PROFESIONAL'],
  ['area_defecto', 'MUNICIPALES'],
  ['nivel_defecto', 'I']
];


// ═════ 01_Instalar.gs ═════

/**
 * SINAV · instalar().
 * Crea todo: hojas, encabezados, formatos, carpetas de Drive, el ADMIN y tres
 * filas de prueba. Es idempotente: correrlo dos veces no duplica nada.
 */

function instalar() {
  return conCerrojo(function () {
    var hecho = [];

    hecho.push(asegurarHojas());
    hecho.push(asegurarVigencias());
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
      .addItem('Sembrar escenario de ejemplo (8 filas)', 'sembrarEjemploDesdeMenu')
      .addItem('Llenar OBLIGACIONES con datos de prueba', 'generarObligacionesDesdeMenu')
      .addItem('Borrar el ejemplo', 'borrarEjemplo'))
    .addToUi();

  // Carga.gs es opcional: si esta pegado, pone su propio menu. Si no, no pasa
  // nada. Apps Script solo admite un onOpen, por eso se llama desde aqui.
  if (typeof menuCarga === 'function') {
    try { menuCarga(); } catch (e) { /* el menu no es critico */ }
  }
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

/**
 * REQ-009. Siembra la hoja VIGENCIAS con los ids REALES que el equipo ya tiene
 * creados en Drive. No crea ninguna carpeta: las de 2026 ya existen, y crear
 * otras partiria en dos el archivo del equipo sin que nadie se entere.
 *
 * Una vigencia que ya este en la hoja NO se toca, ni para corregirle un id.
 */
function asegurarVigencias() {
  var existentes = {};
  var ix = indices(HOJA.VIGENCIAS);
  filas(HOJA.VIGENCIAS).forEach(function (f) {
    var v = String(f[ix.vigencia] || '').trim();
    if (v) existentes[v] = true;
  });

  var nuevas = VIGENCIAS_CONOCIDAS.filter(function (v) { return !existentes[v.vigencia]; });
  if (!nuevas.length) return '';

  agregarFilas(HOJA.VIGENCIAS, nuevas.map(function (v) {
    return COLS.VIGENCIAS.map(function (c) { return v[c] === undefined ? '' : v[c]; });
  }));
  return 'VIGENCIAS: ' + nuevas.map(function (v) { return v.vigencia; }).join(', ') +
         ' con los ids de Drive que ya existen';
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
  var dir = carpetaSoporte(o.vigencia, o.municipio, o.impuesto);
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

  poner(HOJA.USUARIOS, 'rol', [ROL.PROFESIONAL, ROL.ADMIN], false);
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

      // REQ-012: JEFE desaparece y se convierte en PROFESIONAL nivel III.
      // El nivel se fuerza aunque la celda ya traiga otro valor: quien era
      // JEFE es el cargo de supervision, y si no, pierde permisos sin avisar.
      var eraJefe = esRolViejoJefe(fu[i][ixu.rol]);
      var rol = normalizarRol(fu[i][ixu.rol]);
      if (!rol) { rol = rolDef; cambios.rol = rol; }
      else if (rol !== String(fu[i][ixu.rol]).trim()) cambios.rol = rol;
      if (eraJefe && 'nivel' in ixu) cambios.nivel = 'III';

      if ('area' in ixu && !normalizarArea(fu[i][ixu.area]) && areaDef) {
        cambios.area = areaDef;
      }
      // el ADMIN no lleva nivel; los profesionales sin nivel caen al defecto
      if ('nivel' in ixu && !cambios.nivel && !normalizarNivel(fu[i][ixu.nivel]) &&
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


// ═════ 02_Hojas.gs ═════

/** SINAV · acceso a las hojas. Todo en bloque, nunca celda por celda. */

var _libro = null;
var _cacheConfig = null;

function libro() {
  if (!_libro) _libro = SpreadsheetApp.getActive();
  return _libro;
}

function hoja(nombre) {
  var h = libro().getSheetByName(nombre);
  if (!h) throw new Error('Falta la hoja ' + nombre + '. Corre instalar().');
  return h;
}

/** Indices de columna por nombre, 0-based, segun el encabezado real de la hoja. */
function indices(nombre) {
  var h = hoja(nombre);
  var cab = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var ix = {};
  for (var i = 0; i < cab.length; i++) {
    var k = String(cab[i]).trim();
    if (k) ix[k] = i;
  }
  return ix;
}

/** Todas las filas de datos como matriz. Una sola llamada a la hoja. */
function filas(nombre) {
  var h = hoja(nombre);
  var n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, h.getLastColumn()).getValues();
}

/** Las filas como objetos {columna: valor}. */
function registros(nombre) {
  var ix = indices(nombre);
  var claves = Object.keys(ix);
  return filas(nombre).map(function (f, i) {
    var o = { _fila: i + 2 };
    for (var j = 0; j < claves.length; j++) o[claves[j]] = f[ix[claves[j]]];
    return o;
  });
}

/** Busca la fila de una obligacion por id. Devuelve el numero de fila o 0. */
function buscarFila(id) {
  var h = hoja(HOJA.OBLIGACIONES);
  var n = h.getLastRow() - 1;
  if (n < 1) return 0;
  var ix = indices(HOJA.OBLIGACIONES);
  var col = h.getRange(2, ix.id + 1, n, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/** Escribe varios campos de una fila en una sola llamada por tramo contiguo. */
function escribirCampos(nombre, fila, campos) {
  var h = hoja(nombre);
  var ix = indices(nombre);
  var cols = Object.keys(campos).map(function (k) {
    if (!(k in ix)) throw new Error('No existe la columna ' + k + ' en ' + nombre);
    return ix[k];
  }).sort(function (a, b) { return a - b; });
  if (!cols.length) return;

  var min = cols[0], max = cols[cols.length - 1];
  var rango = h.getRange(fila, min + 1, 1, max - min + 1);
  var val = rango.getValues()[0];
  Object.keys(campos).forEach(function (k) { val[ix[k] - min] = campos[k]; });
  rango.setValues([val]);
}

/** Agrega filas al final en una sola llamada. */
function agregarFilas(nombre, matriz) {
  if (!matriz.length) return;
  var h = hoja(nombre);
  h.getRange(h.getLastRow() + 1, 1, matriz.length, matriz[0].length).setValues(matriz);
}

/** Corre fn con el libro bloqueado. Todo lo que escriba pasa por aqui. */
function conCerrojo(fn) {
  var cerrojo = LockService.getScriptLock();
  if (!cerrojo.tryLock(20000)) {
    throw new Error('El libro está ocupado. Intenta de nuevo en unos segundos.');
  }
  try {
    return fn();
  } finally {
    cerrojo.releaseLock();
  }
}

/** Lee un parametro de CONFIG. Se cachea por ejecucion. */
function config(clave) {
  if (!_cacheConfig) {
    _cacheConfig = {};
    filas(HOJA.CONFIG).forEach(function (f) {
      var k = String(f[0]).trim();
      if (k) _cacheConfig[k] = f[1];
    });
  }
  var v = _cacheConfig[clave];
  return v === undefined || v === null ? '' : String(v).trim();
}

function configTodo() {
  config('modo');
  var copia = {};
  Object.keys(_cacheConfig).forEach(function (k) { copia[k] = _cacheConfig[k]; });
  return copia;
}

/** Escribe un parametro de CONFIG. Solo ADMIN. */
function guardarConfig(clave, valor) {
  exige('configurar');
  return conCerrojo(function () {
    var h = hoja(HOJA.CONFIG);
    var f = filas(HOJA.CONFIG);
    for (var i = 0; i < f.length; i++) {
      if (String(f[i][0]).trim() === clave) {
        h.getRange(i + 2, 2).setValue(valor);
        _cacheConfig = null;
        return true;
      }
    }
    agregarFilas(HOJA.CONFIG, [[clave, valor]]);
    _cacheConfig = null;
    return true;
  });
}

function hoy() {
  return new Date();
}

function fechaTexto(d) {
  if (!d) return '';
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), TZ, 'yyyy-MM-dd');
}

function fechaHoraTexto(d) {
  if (!d) return '';
  return Utilities.formatDate(d instanceof Date ? d : new Date(d), TZ, 'yyyy-MM-dd HH:mm');
}

/** Dias calendario entre hoy y una fecha, en zona Bogota. Negativo = ya vencio. */
function diasHasta(fecha) {
  if (!fecha) return null;
  var d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return null;
  var a = Utilities.formatDate(d, TZ, 'yyyy/MM/dd').split('/');
  var b = Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd').split('/');
  var ms = Date.UTC(+a[0], +a[1] - 1, +a[2]) - Date.UTC(+b[0], +b[1] - 1, +b[2]);
  return Math.round(ms / 86400000);
}


// ═════ 03_Roles.gs ═════

/** SINAV · roles. El rol se resuelve aqui, en el servidor, y en ningun otro lado. */

var _yo = null;

/**
 * PROFESIONAL | ADMIN. '' si no reconoce el valor.
 *
 * JEFE ya no existe (REQ-012): el cargo de supervision es PROFESIONAL-III.
 * Se sigue reconociendo el valor viejo para que un libro sin migrar no deje a
 * nadie fuera; migrar() lo reescribe y le pone nivel III.
 */
function normalizarRol(v) {
  var s = String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (s === 'PROFESIONAL' || s === 'JEFE' || s === 'JEFA') return ROL.PROFESIONAL;
  if (s === 'ADMIN' || s === 'ADMINISTRADOR') return ROL.ADMIN;
  return '';
}

/** True si la fila de USUARIOS todavia trae el rol viejo. */
function esRolViejoJefe(v) {
  var s = String(v || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  return s === 'JEFE' || s === 'JEFA';
}

/**
 * El perfil: lo unico que mira PERMISO. Para un profesional es rol + nivel;
 * para el ADMIN es solo el rol. Sin nivel, un profesional cae al I, que es el
 * de menos permisos: ante la duda, nunca de mas.
 */
function perfilDe(q) {
  if (!q || !q.rol) return '';
  if (q.rol === ROL.ADMIN) return PERFIL.ADMIN;
  return ROL.PROFESIONAL + '-' + (q.nivel || 'I');
}

/** MUNICIPALES. '' si no reconoce el valor. */
function normalizarArea(v) {
  var s = String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toUpperCase().replace(/[\s_-]+/g, '');
  return AREAS.indexOf(s) >= 0 ? s : '';
}

/** I | II | III. Acepta 1, 2, 3 y "Profesional I". '' si no reconoce. */
function normalizarNivel(v) {
  var s = String(v || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (!s || s === '-') return '';
  var m = s.match(/(III|II|I)$/);
  if (m) return m[1];
  if (s === '1') return 'I';
  if (s === '2') return 'II';
  if (s === '3') return 'III';
  return '';
}

/** Solo un "NO" explicito bloquea; vacio cuenta como activo. */
function esActivo(v) {
  var s = String(v || '').trim().toLowerCase();
  return ['no', 'n', 'false', 'inactivo', '0'].indexOf(s) < 0;
}

/** 'maria.lopez@davivienda.com' -> 'Maria Lopez'. */
function nombreDesdeCorreo(correo) {
  return String(correo).split('@')[0].split(/[._\-]+/).filter(String)
    .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
    .join(' ') || String(correo);
}

/**
 * Quien esta usando la app ahora. Nunca se confia en lo que mande el cliente.
 * Solo LEE: el alta automatica vive en asegurarAlta(), que si escribe.
 */
function yo() {
  if (_yo) return _yo;

  var correo = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  _yo = { correo: correo, nombre: correo, rol: '', area: '', nivel: '',
          perfil: '', activo: false, inscrito: false };

  if (!correo) return _yo;

  var ix = indices(HOJA.USUARIOS);
  var f = filas(HOJA.USUARIOS);
  for (var i = 0; i < f.length; i++) {
    if (String(f[i][ix.correo]).trim().toLowerCase() === correo) {
      _yo.inscrito = true;
      _yo.nombre = String(f[i][ix.nombre]).trim() || nombreDesdeCorreo(correo);
      _yo.rol = normalizarRol(f[i][ix.rol]);
      _yo.area = 'area' in ix ? normalizarArea(f[i][ix.area]) : '';
      _yo.nivel = 'nivel' in ix ? normalizarNivel(f[i][ix.nivel]) : '';
      // un libro sin migrar: JEFE equivale a PROFESIONAL-III
      if (!_yo.nivel && esRolViejoJefe(f[i][ix.rol])) _yo.nivel = 'III';
      _yo.perfil = perfilDe(_yo);
      _yo.activo = esActivo(f[i][ix.activo]);
      break;
    }
  }
  return _yo;
}

/**
 * Alta automatica, como en AutoTrib: el correo que entra y no esta en USUARIOS
 * queda inscrito con el rol, area y nivel por defecto de CONFIG (hoy
 * PROFESIONAL / MUNICIPALES / I). El JEFE y el ADMIN se siguen poniendo a mano.
 *
 * Un correo ya inscrito NO se toca, ni para reactivarlo: si alguien tiene
 * activo = NO es porque se lo quitaron a proposito.
 */
function asegurarAlta() {
  var q = yo();
  if (!q.correo || q.inscrito) return q;

  var rol = normalizarRol(config('rol_defecto'));
  if (!rol) return q;            // rol_defecto vacio = solo lista cerrada

  var area = normalizarArea(config('area_defecto'));
  var nivel = normalizarNivel(config('nivel_defecto'));
  var nombre = nombreDesdeCorreo(q.correo);

  conCerrojo(function () {
    // se vuelve a mirar dentro del cerrojo: dos pestanas abiertas a la vez
    var ix = indices(HOJA.USUARIOS);
    var f = filas(HOJA.USUARIOS);
    for (var i = 0; i < f.length; i++) {
      if (String(f[i][ix.correo]).trim().toLowerCase() === q.correo) return;
    }
    var fila = COLS.USUARIOS.map(function (c) {
      if (c === 'correo') return q.correo;
      if (c === 'nombre') return nombre;
      if (c === 'rol') return rol;
      if (c === 'activo') return 'SI';
      if (c === 'area') return area;
      if (c === 'nivel') return nivel;
      return '';
    });
    agregarFilas(HOJA.USUARIOS, [fila]);
    registrar('', EVENTO.ALTA_AUTOMATICA,
              q.correo + ' inscrito como ' + rol +
              (area ? ' / ' + area : '') + (nivel ? '-' + nivel : ''));
  });

  _yo = null;
  return yo();
}

function puede(accion) {
  var q = yo();
  if (!q.activo) return false;
  var perfiles = PERMISO[accion];
  if (!perfiles) throw new Error('Acción desconocida: ' + accion);
  return perfiles.indexOf(perfilDe(q)) >= 0;
}

/** Corta la ejecucion si el usuario no puede. */
function exige(accion) {
  if (!puede(accion)) {
    throw new Error('Tu perfil (' + (perfilDe(yo()) || 'sin perfil') +
                    ') no puede: ' + accion);
  }
  return true;
}

/** True si la obligacion es del usuario, o si su rol alcanza para las ajenas. */
function esMia(responsable) {
  var q = yo();
  return String(responsable || '').trim().toLowerCase() === q.correo;
}

function exigeMia(responsable, accion) {
  if (esMia(responsable)) {
    if (!yo().activo) throw new Error('Tu usuario está inactivo en SINAV.');
    return true;
  }
  return exige(accion);
}

/** Lo que el cliente necesita saber de si mismo para pintar la interfaz. */
function apiYo() {
  var q = yo();
  return {
    correo: q.correo,
    nombre: q.nombre,
    rol: q.rol,
    area: q.area,
    nivel: q.nivel,
    perfil: perfilDe(q),
    perfilTexto: perfilTexto(q),
    activo: q.activo,
    puedeAsignar: q.activo && puede('asignar'),
    puedeRevisar: q.activo && puede('revisar'),
    puedeConfigurar: q.activo && puede('configurar'),
    puedeVerMetricas: q.activo && puede('verMetricas'),
    puedeGestionarAusencias: q.activo && puede('gestionarAusencias'),
    puedeHabilitarVigencia: q.activo && puede('habilitarVigencia')
  };
}

/** 'Profesional-I de municipales', 'Jefe de municipales'. Para mostrar, no para decidir. */
function perfilTexto(q) {
  if (!q.rol) return 'sin rol';
  var r = q.rol.charAt(0) + q.rol.slice(1).toLowerCase();
  if (q.nivel) r += '-' + q.nivel;
  if (q.area) r += ' de ' + q.area.toLowerCase();
  return r;
}


// ═════ 04_Normalizar.gs ═════

/**
 * SINAV · normalizacion. Funciones puras: no tocan hojas ni servicios.
 * Se normaliza en la ENTRADA, una vez, no en cada consumo.
 */

/** Mayusculas, sin acentos, sin espacios de sobra, espacios internos colapsados. */
function limpiar(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * MENSUAL | BIMESTRAL | TRIMESTRAL | CUATRIMESTRAL | ANUAL.
 * Devuelve '' si no reconoce el valor: el llamador decide si es un ERROR.
 */
function normPeriodicidad(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (!s) return '';
  return PERIODICIDAD_SINONIMOS[s] || '';
}

/**
 * Codigos que son texto, no numeros: conserva los ceros a la izquierda.
 * ancho rellena con ceros cuando el origen ya los perdio (851 -> "0851").
 */
function normCodigo(v, ancho) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (s.indexOf('E+') > 0 || s.indexOf('e+') > 0) s = Number(s).toFixed(0);
  s = s.replace(/\.0+$/, '');
  if (ancho && /^[0-9]+$/.test(s)) while (s.length < ancho) s = '0' + s;
  return s;
}

/** Periodo: 2026-09 | 2026-B4 | 2026-T3 | 2026-C2 | 2026. '' si no encaja. */
function normPeriodo(v) {
  var s = limpiar(v).replace(/[\s_\/.]+/g, '-');
  var m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) {
    var mes = +m[2];
    if (mes < 1 || mes > 12) return '';
    return m[1] + '-' + (mes < 10 ? '0' + mes : String(mes));
  }
  if ((m = s.match(/^(\d{4})-([BTC])(\d{1,2})$/))) {
    var topes = { B: 6, T: 4, C: 3 };
    var n = +m[3];
    if (n < 1 || n > topes[m[2]]) return '';
    return m[1] + '-' + m[2] + n;
  }
  if ((m = s.match(/^(\d{4})$/))) return m[1];
  return '';
}

/** "GENERAL" cuando viene vacio. */
function normRegimen(v) {
  var s = limpiar(v);
  return s || 'GENERAL';
}

function normImpuesto(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (s === 'RETEICA' || s === 'RETENCIONICA') return 'RETEICA';
  if (s === 'AUTORRETEICA' || s === 'AUTORRETENCIONICA') return 'AUTORRETEICA';
  if (s === 'ICA') return 'ICA';
  if (s === 'EXOGENA' || s === 'INFORMACIONEXOGENA') return 'EXOGENA';
  return '';
}

/** SI | NO | REVISAR. '' si no reconoce. */
function normSiNo(v, conRevisar) {
  var s = limpiar(v);
  if (s === 'SI' || s === 'S' || s === 'TRUE' || s === 'X' || s === '1') return 'SI';
  if (s === 'NO' || s === 'N' || s === 'FALSE' || s === '0') return 'NO';
  if (conRevisar && (s === 'REVISAR' || s === 'POR REVISAR')) return 'REVISAR';
  return '';
}

/** Lista de destinatarios: minusculas, sin repetidos, separados por coma. */
function normCorreos(v) {
  if (!v) return '';
  var vistos = {};
  var salida = [];
  String(v).split(/[,;\s]+/).forEach(function (c) {
    var s = c.trim().toLowerCase();
    if (!s || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) || vistos[s]) return;
    vistos[s] = true;
    salida.push(s);
  });
  return salida.join(',');
}

function normCorreo(v) {
  var s = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : '';
}

/** Fecha real a partir de lo que venga: Date, "2026-09-18", "18/09/2026". */
function normFecha(v) {
  if (!v) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v;
  var s = String(v).trim();
  var m;
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) {
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  if ((m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/))) {
    return new Date(+m[3], +m[2] - 1, +m[1]);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : d;
}

/**
 * Un separador es decimal solo si aparece una vez y no deja tres digitos detras.
 * "4.820.350" son miles; "1.50" son decimales; "1.500" son miles (es-CO).
 */
function esDecimal(s, sep) {
  var partes = s.split(sep);
  if (partes.length !== 2) return false;
  return partes[1].length !== 3;
}

/** Numero a partir de "1.234.567,89", "1,234,567.89", "$ 4.820.350" o 1234567.89. */
function normValor(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return isNaN(v) ? '' : v;

  var s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s || !/\d/.test(s)) return '';

  var coma = s.indexOf(','), punto = s.indexOf('.');
  var decimal = '';
  if (coma >= 0 && punto >= 0) decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  else if (coma >= 0) decimal = esDecimal(s, ',') ? ',' : '';
  else if (punto >= 0) decimal = esDecimal(s, '.') ? '.' : '';

  if (decimal === ',') s = s.replace(/\./g, '').replace(',', '.');
  else if (decimal === '.') s = s.replace(/,/g, '');
  else s = s.replace(/[.,]/g, '');

  var n = Number(s);
  return isNaN(n) ? '' : n;
}

/** id = cod_dane|impuesto|regimen|periodo. El DANE municipal son cinco digitos. */
function armarId(codDane, impuesto, regimen, periodo) {
  return [normCodigo(codDane, 5), normImpuesto(impuesto), normRegimen(regimen),
          normPeriodo(periodo)].join('|');
}

/** Un ano de cuatro digitos. '' si no encaja. */
function normVigencia(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  var m = s.match(/(20\d{2})/);
  return m ? m[1] : '';
}

/**
 * La entidad dueña de la obligacion. Vacio significa BANCO DAVIVIENDA S.A,
 * que es el caso de casi todas; Bogota tiene ademas otras (por ejemplo la
 * Corporacion Financiera), y por eso hace falta distinguirlas: se declaran por
 * separado y sus soportes no pueden mezclarse.
 */
function normEntidad(v) {
  var s = limpiar(v);
  if (!s) return '';
  if (/^BANCO\s*DAVIVIENDA/.test(s)) return '';
  return String(v).trim();
}

/** OFICINA | VIRTUAL. Por defecto OFICINA, que es el caso comun. */
function normTipoPresentacion(v) {
  return limpiar(v) === 'VIRTUAL' ? 'VIRTUAL' : 'OFICINA';
}

/**
 * QUIEN paga: OFICINA | PAGADURIA. Por defecto OFICINA.
 * Antes esta columna se llamaba medio_pago y mezclaba quien paga con como se
 * paga: un "PSE" guardado ahi es una forma de pago, no un pagador, asi que
 * cae a OFICINA y el PSE se recupera en normFormaPago.
 */
function normPagaQuien(v) {
  var s = limpiar(v);
  return PAGA_QUIEN.indexOf(s) >= 0 ? s : 'OFICINA';
}

/**
 * COMO se paga: TRANSFERENCIA | PSE | EFECTIVO | OTRO.
 * Vacio es un dato que falta, no un valor por defecto: lo llena el profesional
 * a mano cuando sabe como se pago. '' si no reconoce.
 */
function normFormaPago(v) {
  var s = limpiar(v).replace(/[^A-Z]/g, '');
  if (s === 'PSE') return 'PSE';
  if (s === 'TRANSFERENCIA' || s === 'TRANSF') return 'TRANSFERENCIA';
  if (s === 'EFECTIVO' || s === 'CAJA') return 'EFECTIVO';
  if (s === 'OTRO' || s === 'OTROS') return 'OTRO';
  return '';
}

/**
 * Normaliza una obligacion completa en la entrada.
 * Devuelve {fila: {...}, problemas: [...]}. No escribe nada.
 */
function normObligacion(cruda) {
  var p = [];
  var o = {};

  o.cod_dane = normCodigo(cruda.cod_dane, 5);
  if (!o.cod_dane) p.push('cod_dane vacio');

  o.cod_oficina = normCodigo(cruda.cod_oficina, 4);
  o.municipio = String(cruda.municipio || '').trim();
  if (!o.municipio) p.push('municipio vacio');

  o.impuesto = normImpuesto(cruda.impuesto);
  if (!o.impuesto) p.push('impuesto no reconocido: ' + cruda.impuesto);

  o.regimen = normRegimen(cruda.regimen);

  o.periodo = normPeriodo(cruda.periodo);
  if (!o.periodo) p.push('periodo no reconocido: ' + cruda.periodo);

  o.periodicidad = normPeriodicidad(cruda.periodicidad);
  if (!o.periodicidad) p.push('periodicidad no reconocida: ' + cruda.periodicidad);

  o.vencimiento = normFecha(cruda.vencimiento);
  if (!o.vencimiento) p.push('vencimiento no es una fecha: ' + cruda.vencimiento);

  // OJO: el NIT es del municipio, no del banco.
  o.nit_municipio = normCodigo(cruda.nit_municipio);

  o.correo_oficina = normCorreos(cruda.correo_oficina);
  o.responsable = normCorreo(cruda.responsable);

  o.tipo_presentacion = normTipoPresentacion(cruda.tipo_presentacion);

  // medio_pago es el nombre viejo de la columna: se acepta como respaldo para
  // que un origen que todavia lo use no pierda el dato.
  var pagoCrudo = cruda.paga_quien !== undefined && cruda.paga_quien !== ''
    ? cruda.paga_quien : cruda.medio_pago;
  o.paga_quien = normPagaQuien(pagoCrudo);
  o.forma_pago = normFormaPago(
    cruda.forma_pago !== undefined && cruda.forma_pago !== ''
      ? cruda.forma_pago : cruda.medio_pago);

  o.requiere_envio = normSiNo(cruda.requiere_envio, true) || 'REVISAR';
  o.exogena = o.impuesto === 'RETEICA' ? (normSiNo(cruda.exogena) || 'NO') : 'NO';
  o.incluye_retencion = o.impuesto === 'AUTORRETEICA'
    ? (normSiNo(cruda.incluye_retencion) || 'NO') : 'NO';

  // REQ-011. La vigencia fiscal sale del periodo, que es el ano al que
  // PERTENECE la obligacion, no el ano en que se presenta. Si viene explicita,
  // manda la explicita: hay obligaciones de 2026 con periodo de enero 2027.
  o.vigencia = normVigencia(cruda.vigencia) ||
               (o.periodo ? o.periodo.slice(0, 4) : '');

  // Bogota tiene varias entidades ademas del banco. Vacio = Banco Davivienda.
  o.entidad = normEntidad(cruda.entidad);

  o.valor = normValor(cruda.valor);
  o.nota = String(cruda.nota || '').trim();
  o.id = armarId(o.cod_dane, o.impuesto, o.regimen, o.periodo);

  return { fila: o, problemas: p };
}


// ═════ 05_Eventos.gs ═════

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


// ═════ 06_Estados.gs ═════

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


// ═════ 07_Obligaciones.gs ═════

/** SINAV · lectura del maestro. Nunca formulas vivas: lo que ve la interfaz es lo guardado. */

/**
 * Los estados que todavia esperan un envio.
 *
 * Es una FUNCION y no un `var` a proposito: un `var` en el nivel superior se
 * evalua cuando Apps Script carga el archivo, y si este archivo carga antes
 * que 00_Constantes, ESTADO todavia no existe y el proyecto entero revienta
 * con "ReferenceError: ESTADO is not defined". Dentro de una funcion, la
 * constante se lee cuando alguien llama, con todo ya cargado.
 */
function estadosPorEnviar() {
  return [ESTADO.PENDIENTE, ESTADO.LISTA, ESTADO.DEVUELTA, ESTADO.REBOTADO];
}

/** Agrega a una fila cruda lo que la interfaz necesita y no esta en la hoja. */
function decorar(o) {
  var dias = diasHasta(o.vencimiento);
  var env = puedeEnviar(o);

  var nivel = 'neutro';
  if (o.estado === ESTADO.APROBADA || o.estado === ESTADO.REVISADA) nivel = 'aldia';
  else if (dias !== null && dias < 0) nivel = 'vencido';
  else if (dias !== null && dias <= 4) nivel = 'porvencer';
  else if (o.estado === ESTADO.ENVIADA || o.estado === ESTADO.RESPONDIDA) nivel = 'aldia';

  if (o.estado === ESTADO.SIN_EVIDENCIA || o.estado === ESTADO.REBOTADO) nivel = 'vencido';

  return {
    id: String(o.id),
    cod_dane: String(o.cod_dane),
    cod_oficina: String(o.cod_oficina),
    municipio: String(o.municipio),
    impuesto: String(o.impuesto),
    regimen: String(o.regimen),
    periodo: String(o.periodo),
    periodicidad: String(o.periodicidad),
    vencimiento: fechaTexto(o.vencimiento),
    dias: dias,
    nit_municipio: String(o.nit_municipio),
    correo_oficina: String(o.correo_oficina),
    responsable: String(o.responsable),
    tipo_presentacion: String(o.tipo_presentacion),
    paga_quien: String(o.paga_quien || ''),
    forma_pago: String(o.forma_pago || ''),
    requiere_envio: String(o.requiere_envio),
    exogena: String(o.exogena || ''),
    incluye_retencion: String(o.incluye_retencion || ''),
    presentacion_fecha: fechaTexto(o.presentacion_fecha),
    revision_fecha: fechaTexto(o.revision_fecha),
    revision_por: String(o.revision_por || ''),
    estado: String(o.estado),
    valor: o.valor === '' || o.valor === null ? null : Number(o.valor),
    nota: String(o.nota || ''),
    reprocesos: Number(o.reprocesos) || 0,
    motivo_devuelta: String(o.motivo_devuelta || ''),
    fecha_envio: fechaHoraTexto(o.fecha_envio),
    fecha_respuesta: fechaHoraTexto(o.fecha_respuesta),
    // la cadena de evidencia: los cuatro hitos que SINAV existe para cerrar
    cadena: {
      soporte: !!String(o.soporte_id || '').trim(),
      envio: !!String(o.hilo_id || '').trim() || o.estado === ESTADO.ENVIADA,
      respuesta: !!o.fecha_respuesta,
      sellado: !!String(o.sellado_id || '').trim()
    },
    mia: esMia(o.responsable),
    enviable: env.ok,
    motivo_no_enviable: env.motivo,
    nivel: nivel
  };
}

/** Todas las obligaciones que el usuario puede ver: todas, decoradas. */
function listarTodas() {
  return registros(HOJA.OBLIGACIONES)
    .filter(function (o) { return String(o.id || '').trim(); })
    .map(decorar);
}

/**
 * La pestana ENVIAR: solo requiere_envio = SI y estados por enviar.
 * El PROFESIONAL ve las suyas; JEFE y ADMIN ven las de todos.
 * Orden: lo que mas aprieta arriba.
 */
function listarParaEnviar() {
  var todas = puede('asignar') ? listarTodas()
            : listarTodas().filter(function (o) { return o.mia; });

  return todas
    .filter(function (o) {
      return o.requiere_envio === 'SI' && estadosPorEnviar().indexOf(o.estado) >= 0;
    })
    .sort(function (a, b) {
      var da = a.dias === null ? 9999 : a.dias;
      var db = b.dias === null ? 9999 : b.dias;
      if (da !== db) return da - db;
      return a.municipio.localeCompare(b.municipio, 'es');
    });
}

/** Los conteos de las tarjetas que filtran. Se calculan de las filas que se muestran. */
function conteos(lista) {
  var c = { todas: lista.length, sin_soporte: 0, por_vencer: 0, vencidas: 0, listas: 0 };
  lista.forEach(function (o) {
    if (!o.cadena.soporte) c.sin_soporte++;
    if (o.dias !== null && o.dias < 0) c.vencidas++;
    else if (o.dias !== null && o.dias <= 4) c.por_vencer++;
    if (o.enviable) c.listas++;
  });
  return c;
}

/** Una sola llamada al abrir la app: quien soy, la configuracion y las filas. */
function apiInicio() {
  // alta automatica: el correo que entra por primera vez queda inscrito con el
  // rol por defecto. El JEFE y el ADMIN se siguen poniendo a mano en USUARIOS.
  asegurarAlta();

  var q = apiYo();
  if (!q.correo) {
    return { error: 'No se pudo identificar tu cuenta. Entra con tu correo corporativo.' };
  }
  if (!q.activo) {
    return { yo: q, error: 'Tu correo está en la hoja USUARIOS con activo = NO. ' +
      'Alguien lo desactivó a propósito; pídele a un ADMIN que lo revise.' };
  }
  if (!q.rol) {
    return { yo: q, error: 'Tu fila en USUARIOS no tiene un rol que SINAV reconozca. ' +
      'Los valores válidos son PROFESIONAL, JEFE y ADMIN.' };
  }

  var lista = listarParaEnviar();
  return {
    yo: q,
    config: {
      modo: config('modo'),
      nombre_remitente: config('nombre_remitente'),
      dias_aviso: config('dias_aviso')
    },
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    filas: lista,
    conteos: conteos(lista),
    generado: fechaHoraTexto(new Date())
  };
}

/** Refresca solo la lista de ENVIAR. */
function apiListaEnviar() {
  var lista = listarParaEnviar();
  return {
    filas: lista,
    conteos: conteos(lista),
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    generado: fechaHoraTexto(new Date())
  };
}


// ═════ 08_Soportes.gs ═════

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

    var campos = { soporte_id: archivo.getId() };
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


// ═════ 09_Enviar.gs ═════

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

function asuntoDe(o) {
  return 'Declaración ' + o.impuesto + ' ' + o.periodo + ' - ' + o.municipio +
         ' - Banco Davivienda S.A. [' + marcador(o.id) + ']';
}

function pesos(v) {
  if (v === '' || v === null || v === undefined) return '-';
  return '$' + Number(v).toLocaleString('es-CO', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function cuerpoDe(o, modo) {
  var lineas = [
    'Buen día,',
    '',
    'Adjuntamos la declaración de ' + o.impuesto + ' del periodo ' + o.periodo +
      ' para que sea presentada y pagada en el municipio de ' + o.municipio + '.',
    '',
    'Municipio: ' + o.municipio + ' (DANE ' + o.cod_dane + ')',
    'Oficina: ' + (o.cod_oficina || '-'),
    'Impuesto: ' + o.impuesto + ' - régimen ' + o.regimen,
    'Periodo: ' + o.periodo + ' (' + o.periodicidad + ')',
    'Vence: ' + fechaTexto(o.vencimiento),
    'NIT del municipio: ' + (o.nit_municipio || '-'),
    'Presentación: ' + o.tipo_presentacion + ' - paga ' + textoPago(o),
    'Valor: ' + pesos(o.valor),
    '',
    'Por favor RESPONDA SOBRE ESTE MISMO CORREO, no abra uno nuevo, y adjunte el',
    'soporte sellado por el municipio. Así queda asociado automáticamente a esta',
    'obligación y no hay que buscarlo después.',
    '',
    'Gracias,',
    config('nombre_remitente')
  ];
  if (modo === 'PRUEBA') {
    lineas.unshift('[MODO PRUEBA] Este correo iba para: ' + (o.correo_oficina || '-'), '');
  }
  return lineas.join('\n');
}

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

function cuerpoHtmlDe(o, modo) {
  var fila = function (k, v) {
    return '<tr><td style="padding:2px 12px 2px 0;color:#5f6368">' + k +
           '</td><td style="padding:2px 0;color:#111">' + v + '</td></tr>';
  };
  var aviso = modo === 'PRUEBA'
    ? '<p style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;' +
      'padding:8px 10px;margin:0 0 16px">MODO PRUEBA. Este correo iba para: ' +
      (o.correo_oficina || '-') + '</p>'
    : '';
  return '<div style="font:14px/1.5 Arial,sans-serif;color:#111;max-width:640px">' +
    aviso +
    '<p>Buen día,</p>' +
    '<p>Adjuntamos la declaración de <b>' + o.impuesto + '</b> del periodo <b>' +
      o.periodo + '</b> para que sea presentada y pagada en el municipio de <b>' +
      o.municipio + '</b>.</p>' +
    '<table style="border-collapse:collapse;font-size:14px;margin:16px 0">' +
      fila('Municipio', o.municipio + ' (DANE ' + o.cod_dane + ')') +
      fila('Oficina', o.cod_oficina || '-') +
      fila('Impuesto', o.impuesto + ' &middot; régimen ' + o.regimen) +
      fila('Periodo', o.periodo + ' (' + o.periodicidad + ')') +
      fila('Vence', fechaTexto(o.vencimiento)) +
      fila('NIT del municipio', o.nit_municipio || '-') +
      fila('Presentación', o.tipo_presentacion + ' &middot; paga ' + textoPago(o)) +
      fila('Valor', pesos(o.valor)) +
    '</table>' +
    '<p style="background:#f2f2f2;padding:10px 12px;margin:16px 0">' +
      '<b>Responda sobre este mismo correo, no abra uno nuevo</b>, y adjunte el ' +
      'soporte sellado por el municipio. Así queda asociado automáticamente a esta ' +
      'obligación y no hay que buscarlo después.</p>' +
    '<p>Gracias,<br>' + config('nombre_remitente') + '</p>' +
    '</div>';
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
    var ok = puedeEnviar(o);
    if (!ok.ok) {
      rechazadas.push({ id: id, motivo: ok.motivo });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'envío rechazado: ' + ok.motivo });
      continue;
    }

    var destinos = modo === 'PRUEBA' ? miCorreo : normCorreos(o.correo_oficina);
    var cuantos = destinos.split(',').length;

    if (cuotaUsada() + cuantos > CUOTA_DIARIA) {
      pendientes = ids.slice(i).map(String);
      rechazadas.push({ id: id,
        motivo: 'se agotó tu cuota diaria de ' + CUOTA_DIARIA + ' destinatarios' });
      break;
    }

    try {
      var adjunto = DriveApp.getFileById(String(o.soporte_id).trim()).getBlob();

      GmailApp.sendEmail(destinos, asuntoDe(o), cuerpoDe(o, modo), {
        name: remitente,
        attachments: [adjunto],
        htmlBody: cuerpoHtmlDe(o, modo)
      });
      sumarCuota(cuantos);

      var hilo = hiloDelEnvio(o.id);
      var idFila = o.id;

      conCerrojo(function () {
        escribirCampos(HOJA.OBLIGACIONES, buscarFila(idFila), {
          estado: ESTADO.ENVIADA,
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


// ═════ 10_WebApp.gs ═════

/**
 * SINAV · la aplicacion web.
 * Se despliega ejecutando como el usuario que accede, porque el correo tiene que
 * salir de su cuenta y la respuesta tiene que volver a su bandeja.
 */

/**
 * El archivo del HTML se llama 'Index' cuando se pega el paquete de dist/ (un
 * solo archivo) y 'ui/Index' cuando se trabaja con los archivos sueltos de
 * src/. Se prueban los dos para que funcione en cualquiera de las dos formas,
 * sin que el build tenga que reescribir esta linea.
 */
function archivoIndex() {
  try {
    HtmlService.createTemplateFromFile('Index');
    return 'Index';
  } catch (e) {
    return 'ui/Index';
  }
}

function doGet() {
  var t = HtmlService.createTemplateFromFile(archivoIndex());
  return t.evaluate()
    .setTitle('SINAV')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Pega un archivo de ui/ dentro de otro. */
function include(archivo) {
  return HtmlService.createHtmlOutputFromFile(archivo).getContent();
}

/**
 * El logo se sirve desde Drive por id.
 *
 * El id se pone en las propiedades del script (Configuracion del proyecto ->
 * Propiedades del script -> logo_id). Esta ahi y no en la hoja CONFIG porque
 * no es un parametro del negocio que alguien vaya a cambiar desde la
 * aplicacion: es cableado del despliegue, y asi no ocupa una fila de una hoja
 * que los usuarios ven.
 *
 * Se sigue leyendo CONFIG.logo_id como respaldo, para no romper un libro que
 * ya lo tuviera puesto ahi.
 *
 * El id es el texto entre /d/ y /view en el enlace de Drive; tambien se acepta
 * el enlace completo. La cuenta que despliega tiene que poder ver el archivo;
 * los usuarios finales no necesitan permiso.
 *
 * Mientras no haya id, la interfaz deja el espacio reservado punteado.
 */
function idLogo() {
  var v = '';
  try {
    v = PropertiesService.getScriptProperties().getProperty('logo_id') || '';
  } catch (e) {
    v = '';
  }
  if (!v) v = config('logo_id');
  var s = String(v || '').trim();
  var m = /\/d\/([A-Za-z0-9_-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  return m ? m[1] : s;
}

function apiLogo() {
  var id = idLogo();
  if (!id) return '';
  var cache = CacheService.getScriptCache();
  var clave = 'logo:' + id;
  var guardado = cache.get(clave);
  if (guardado) return guardado;
  try {
    var b = DriveApp.getFileById(id).getBlob();
    var uri = 'data:' + b.getContentType() + ';base64,' +
              Utilities.base64Encode(b.getBytes());
    // CacheService admite ~100 KB por clave: si el logo pesa mas, no se cachea
    if (uri.length < 95000) cache.put(clave, uri, 21600);
    return uri;
  } catch (e) {
    return '';
  }
}


// ═════ 12_Alertas.gs ═════

/**
 * SINAV · alertas.
 *
 * La pregunta de esta pantalla: que se me vence y cuando.
 *
 * Los cortes salen de CONFIG.dias_aviso (por defecto 10,4,2,0), que hasta
 * ahora era un parametro que nadie leia. Son dias ANTES del vencimiento: a los
 * 10, a los 4, a los 2 y el mismo dia.
 *
 * Una obligacion ya APROBADA no alerta: su cadena de evidencia esta cerrada.
 * Una vencida alerta siempre, este donde este, porque el vencimiento no se
 * reinicia nunca.
 */

/** Los cortes de CONFIG, de mayor a menor y sin basura. */
function diasDeAviso() {
  var crudo = config('dias_aviso') || '10,4,2,0';
  var ds = String(crudo).split(/[,;\s]+/)
    .map(function (x) { return parseInt(x, 10); })
    .filter(function (n) { return !isNaN(n) && n >= 0; });
  if (!ds.length) ds = [10, 4, 2, 0];
  return ds.sort(function (a, b) { return b - a; });
}

/**
 * Reparte las obligaciones en tramos de urgencia. Puro: recibe las filas ya
 * decoradas y los cortes, no los busca.
 *
 * Los tramos salen en el orden en que hay que mirarlos: lo que ya se vencio
 * primero, lo que falta mas tiempo al final.
 */
function agruparAlertas(filas, cortes) {
  var ds = (cortes && cortes.length ? cortes : [10, 4, 2, 0])
    .slice()
    .filter(function (d) { return d > 0; })     // el 0 es "hoy", que va aparte
    .sort(function (a, b) { return a - b; });   // ascendente: el mas urgente primero

  var vivas = (filas || []).filter(function (o) {
    return o.estado !== ESTADO.APROBADA;
  });

  var tramos = [];
  var puestas = {};

  var meter = function (id, et, detalle, nivel, prueba) {
    var lista = vivas.filter(function (o) {
      return !puestas[o.id] && prueba(o);
    });
    lista.forEach(function (o) { puestas[o.id] = true; });
    tramos.push({ id: id, et: et, detalle: detalle, nivel: nivel,
                  cuantas: lista.length, filas: lista });
  };

  // 1. vencidas: alertan siempre, esten donde esten
  meter('vencidas', 'Ya vencidas',
        'El vencimiento no se reinicia nunca, ni al devolver.', 'vencido',
        function (o) { return o.dias !== null && o.dias < 0; });

  // 2. hoy es su propio tramo, haya o no un 0 en dias_aviso
  meter('hoy', 'Vencen hoy', 'Último día para presentar.', 'vencido',
        function (o) { return o.dias === 0; });

  // 3. un tramo por cada corte, del mas urgente al menos.
  // Como se va marcando lo ya puesto, cada obligacion cae en el tramo mas
  // urgente que le corresponde y no se repite mas abajo.
  ds.forEach(function (d) {
    meter('en' + d, 'Vencen en ' + d + (d === 1 ? ' día' : ' días') + ' o menos',
          'Aviso de los ' + d + ' días.',
          d <= 4 ? 'porvencer' : 'neutro',
          function (o) { return o.dias !== null && o.dias > 0 && o.dias <= d; });
  });

  // 4. lo que todavia no entra en ningun aviso
  meter('despues', 'Más adelante',
        ds.length ? 'Fuera de los avisos configurados (' + ds.join(', ') + ' días).'
                  : 'No hay avisos configurados en CONFIG.dias_aviso.',
        '',
        function (o) { return o.dias !== null && o.dias > 0; });

  // 5. sin fecha: no se puede avisar de algo que no vence nunca
  meter('sinfecha', 'Sin fecha de vencimiento',
        'No se les puede calcular aviso. Hay que revisar el dato.', 'porvencer',
        function (o) { return o.dias === null; });

  var cuantas = function (id) {
    var t = tramos.filter(function (x) { return x.id === id; })[0];
    return t ? t.cuantas : 0;
  };

  return {
    cortes: ds,
    tramos: tramos.filter(function (t) { return t.cuantas > 0; }),
    total: vivas.length,
    vencidas: cuantas('vencidas'),
    hoy: cuantas('hoy'),
    criticas: cuantas('vencidas') + cuantas('hoy'),
    sin_soporte: vivas.filter(function (o) {
      return !(o.cadena && o.cadena.soporte);
    }).length
  };
}

/**
 * La pantalla de alertas.
 * El PROFESIONAL ve lo suyo; JEFE y ADMIN ven lo de todos, que es lo que les
 * permite repartir el trabajo antes de que se venza.
 */
function apiAlertas() {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var mias = puede('asignar') ? listarTodas()
           : listarTodas().filter(function (o) { return o.mia; });

  var r = agruparAlertas(mias, diasDeAviso());
  r.yo = { correo: q.correo, ve_todo: puede('asignar') };
  r.sin_responsable = mias.filter(function (o) {
    return !String(o.responsable || '').trim();
  }).length;
  r.generado = fechaHoraTexto(new Date());
  return r;
}


// ═════ 14_Campos.gs ═════

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
    nota:              { et: 'Nota', tipo: 'texto', norm: 'normTexto' }
  };
  return _camposEditables;
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

    return { id: id, cambios: bitacora.length, detalle: bitacora.join(' · ') };
  });
}

/**
 * La lista de la pantalla de digitalizacion: todo lo que el usuario puede
 * tocar, con los campos manuales por delante y lo incompleto arriba.
 */
function apiListaCampos() {
  var mias = puede('editarAjenas') ? listarTodas()
           : listarTodas().filter(function (o) { return o.mia; });

  var lista = mias
    .filter(function (o) { return o.estado !== ESTADO.APROBADA; })
    .map(function (o) {
      var faltan = [];
      if (!o.valor) faltan.push('valor');
      if (!o.forma_pago) faltan.push('forma de pago');
      if (o.requiere_envio === 'REVISAR') faltan.push('si se envía');
      if (!o.periodicidad) faltan.push('periodicidad');
      o.faltan = faltan;
      return o;
    })
    .sort(function (a, b) {
      if (a.faltan.length !== b.faltan.length) return b.faltan.length - a.faltan.length;
      var da = a.dias === null ? 9999 : a.dias;
      var db = b.dias === null ? 9999 : b.dias;
      return da - db;
    });

  return {
    filas: lista,
    opciones: apiCamposOpciones(),
    resumen: {
      todas: lista.length,
      incompletas: lista.filter(function (o) { return o.faltan.length; }).length,
      sin_valor: lista.filter(function (o) { return !o.valor; }).length,
      por_revisar: lista.filter(function (o) { return o.requiere_envio === 'REVISAR'; }).length
    },
    generado: fechaHoraTexto(new Date())
  };
}


// ═════ 15_Carga.gs ═════

/**
 * SINAV · carga masiva de soportes.
 *
 * El profesional suelta los PDF de un periodo y la herramienta propone a que
 * obligacion va cada uno, leyendo del nombre del archivo el codigo de oficina
 * y el tipo de impuesto (es lo que pidieron en los requerimientos).
 *
 * Por que el periodo se pide aparte y no se adivina: cod_oficina + impuesto NO
 * identifica una obligacion. El id real es cod_dane|impuesto|regimen|periodo,
 * asi que la misma oficina y el mismo impuesto aparecen una vez por periodo.
 * Si el nombre del archivo trae el periodo se usa para avisar de un descuadre,
 * pero el que manda es el que se eligio en la pantalla.
 *
 * Nada se sube en el plan: primero se ve el emparejamiento, se corrige lo que
 * haga falta y despues se confirma. Subir es apiSubirSoporte, uno por llamada.
 */

/* ---------- lectura del nombre del archivo (puro) ------------------------- */

/**
 * Saca del nombre del archivo lo que se pueda: codigo de oficina, impuesto y
 * periodo. Lo que no encuentre queda en ''. No adivina: es mejor que el
 * profesional corrija cuatro de cuarenta que descubrir un soporte en la
 * obligacion equivocada.
 */
function leerNombreArchivo(nombre) {
  var s = String(nombre || '');
  var sinExt = s.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  var limpio = limpiar(sinExt);

  // impuesto: de lo mas especifico a lo mas general, porque "AUTORRETEICA"
  // contiene "RETEICA" y "RETEICA" contiene "ICA".
  var impuesto = '';
  var sinEspacios = limpio.replace(/[^A-Z]/g, '');
  if (/AUTORRET/.test(sinEspacios)) impuesto = 'AUTORRETEICA';
  else if (/RETEICA|RETENCIONICA|RTEICA/.test(sinEspacios)) impuesto = 'RETEICA';
  else if (/EXOGENA/.test(sinEspacios)) impuesto = 'EXOGENA';
  else if (/\bICA\b/.test(limpio) || /(^|[^A-Z])ICA([^A-Z]|$)/.test(limpio)) impuesto = 'ICA';

  // periodo: 2026-11, 2026_11, 202611, 2026-B5
  var periodo = '';
  var mp = limpio.match(/(20\d{2})[-_ ]?(0[1-9]|1[0-2])(?![0-9])/);
  if (mp) periodo = normPeriodo(mp[1] + '-' + mp[2]);
  if (!periodo) {
    var mb = limpio.match(/(20\d{2})[-_ ]?([BTC])\s?([1-9])(?![0-9])/);
    if (mb) periodo = normPeriodo(mb[1] + '-' + mb[2] + mb[3]);
  }

  // codigo de oficina: un grupo de 3 o 4 digitos que no sea un anio ni el
  // periodo que acabamos de leer.
  var oficina = '';
  var grupos = limpio.match(/\d{3,4}/g) || [];
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    if (/^(19|20)\d{2}$/.test(g)) continue;              // es un anio
    if (periodo && periodo.indexOf(g) === 0) continue;    // es el periodo
    oficina = normCodigo(g, 4);
    break;
  }

  return { cod_oficina: oficina, impuesto: impuesto, periodo: periodo,
           nombre: s };
}

/**
 * Empareja un archivo contra las obligaciones candidatas (ya filtradas por
 * periodo y por lo que el usuario puede tocar). Puro.
 *
 * Devuelve {estado, id, motivo, opciones}:
 *   'listo'   un solo candidato encaja
 *   'varios'  encajan varios: lo elige la persona
 *   'ninguno' no encaja ninguno
 */
function emparejarArchivo(leido, candidatas) {
  var cs = candidatas || [];

  var porOficina = leido.cod_oficina
    ? cs.filter(function (o) { return String(o.cod_oficina) === leido.cod_oficina; })
    : cs;
  var porImpuesto = leido.impuesto
    ? porOficina.filter(function (o) { return String(o.impuesto) === leido.impuesto; })
    : porOficina;

  var ids = porImpuesto.map(function (o) { return o.id; });

  if (ids.length === 1) {
    var faltan = [];
    if (!leido.cod_oficina) faltan.push('el nombre no trae código de oficina');
    if (!leido.impuesto) faltan.push('el nombre no trae el impuesto');
    return { estado: 'listo', id: ids[0], opciones: ids,
             motivo: faltan.length ? 'Único candidato, aunque ' + faltan.join(' y ') + '.' : '' };
  }

  if (ids.length > 1) {
    return { estado: 'varios', id: '', opciones: ids,
             motivo: ids.length + ' obligaciones encajan. Elige cuál.' };
  }

  var porque = [];
  if (leido.cod_oficina && !cs.some(function (o) {
    return String(o.cod_oficina) === leido.cod_oficina;
  })) {
    porque.push('ninguna obligación del periodo tiene la oficina ' + leido.cod_oficina);
  }
  if (leido.impuesto && porOficina.length && !porImpuesto.length) {
    porque.push('ninguna es de ' + leido.impuesto);
  }
  if (!leido.cod_oficina && !leido.impuesto) {
    porque.push('del nombre no se pudo leer ni la oficina ni el impuesto');
  }
  return { estado: 'ninguno', id: '', opciones: [],
           motivo: porque.length ? porque.join('; ') + '.' : 'No encaja con ninguna.' };
}

/* ---------- la api ------------------------------------------------------- */

/** Las obligaciones de un periodo a las que este usuario les puede poner soporte. */
function candidatasDeCarga(periodo) {
  var p = normPeriodo(periodo);
  if (!p) throw new Error('Periodo no reconocido: ' + periodo);

  var mias = puede('editarAjenas') ? listarTodas()
           : listarTodas().filter(function (o) { return o.mia; });

  return mias
    .filter(function (o) { return o.periodo === p; })
    .map(function (o) {
      return {
        id: o.id, cod_dane: o.cod_dane, cod_oficina: o.cod_oficina,
        municipio: o.municipio, impuesto: o.impuesto, regimen: o.regimen,
        periodo: o.periodo, estado: o.estado, vencimiento: o.vencimiento,
        dias: o.dias, tiene_soporte: o.cadena.soporte,
        admite: ESTADOS_ADMITEN_SOPORTE.indexOf(o.estado) >= 0,
        responsable: o.responsable, mia: o.mia
      };
    })
    .sort(function (a, b) {
      if (a.cod_oficina !== b.cod_oficina) {
        return String(a.cod_oficina).localeCompare(String(b.cod_oficina));
      }
      return String(a.impuesto).localeCompare(String(b.impuesto));
    });
}

/** Los periodos que tienen obligaciones que este usuario puede trabajar. */
function apiPeriodosCarga() {
  var mias = puede('editarAjenas') ? listarTodas()
           : listarTodas().filter(function (o) { return o.mia; });
  var vistos = {};
  mias.forEach(function (o) {
    if (o.periodo) vistos[o.periodo] = (vistos[o.periodo] || 0) + 1;
  });
  return Object.keys(vistos).sort().reverse().map(function (p) {
    return { periodo: p, cuantas: vistos[p] };
  });
}

/**
 * El plan de carga: que archivo va a que obligacion. NO sube nada.
 * nombres es solo la lista de nombres de archivo del navegador.
 */
function apiCargaPlan(periodo, nombres) {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var candidatas = candidatasDeCarga(periodo);
  var admitidas = candidatas.filter(function (o) { return o.admite; });

  var usados = {};
  var plan = (nombres || []).map(function (n) {
    var leido = leerNombreArchivo(n);
    var m = emparejarArchivo(leido, admitidas);

    // dos archivos no pueden ir a la misma obligacion sin que alguien lo vea
    if (m.estado === 'listo' && usados[m.id]) {
      m = { estado: 'varios', id: '', opciones: m.opciones,
            motivo: 'Otro archivo del lote ya apunta a esta obligación.' };
    }
    if (m.estado === 'listo') usados[m.id] = true;

    var aviso = '';
    if (leido.periodo && leido.periodo !== normPeriodo(periodo)) {
      aviso = 'El nombre dice ' + leido.periodo + ' y estás cargando ' +
              normPeriodo(periodo) + '.';
    }

    return {
      archivo: n,
      leido: leido,
      estado: m.estado,
      id: m.id,
      opciones: m.opciones,
      motivo: m.motivo,
      aviso: aviso
    };
  });

  return {
    periodo: normPeriodo(periodo),
    plan: plan,
    candidatas: candidatas,
    resumen: {
      archivos: plan.length,
      listos: plan.filter(function (x) { return x.estado === 'listo'; }).length,
      varios: plan.filter(function (x) { return x.estado === 'varios'; }).length,
      ninguno: plan.filter(function (x) { return x.estado === 'ninguno'; }).length,
      sin_soporte: admitidas.filter(function (o) { return !o.tiene_soporte; }).length,
      candidatas: candidatas.length
    }
  };
}


// ═════ 16_Metricas.gs ═════

/**
 * SINAV · metricas del JEFE.
 *
 * La pregunta de esta pantalla: donde esta parado el mes y que espera por mi.
 * Elizabeth asigna el trabajo y da el visto bueno, asi que lo que necesita ver
 * es carga por persona y cola de revision, no un tablero bonito.
 *
 * El requerimiento pedia ademas "determinar que declaraciones son las que se
 * pagan en las oficinas" y ver el desglose (transferencia tantos, PSE tantos).
 * Eso es el cruce paga_quien x forma_pago que esta mas abajo.
 */

/** Cuenta cuantas veces aparece cada valor de una clave. Puro. */
function contarPor(filas, clave) {
  var mapa = {};
  (filas || []).forEach(function (o) {
    var k = String(o[clave] === null || o[clave] === undefined || o[clave] === ''
      ? '(sin dato)' : o[clave]);
    mapa[k] = (mapa[k] || 0) + 1;
  });
  return Object.keys(mapa).sort(function (a, b) {
    if (mapa[b] !== mapa[a]) return mapa[b] - mapa[a];
    return a.localeCompare(b, 'es');
  }).map(function (k) {
    return { clave: k, cuantas: mapa[k] };
  });
}

/** Suma el valor liquidado, saltando lo que esta vacio. Puro. */
function sumarValor(filas) {
  return (filas || []).reduce(function (t, o) {
    var n = Number(o.valor);
    return t + (isNaN(n) ? 0 : n);
  }, 0);
}

/**
 * Todas las cifras de la pantalla, a partir de las filas ya decoradas. Puro,
 * asi que se puede probar sin hojas.
 */
function agruparMetricas(filas) {
  var f = filas || [];

  var vencidas = f.filter(function (o) { return o.dias !== null && o.dias < 0; });
  var porVencer = f.filter(function (o) {
    return o.dias !== null && o.dias >= 0 && o.dias <= 4;
  });
  var esperanRevision = f.filter(function (o) { return o.estado === ESTADO.RESPONDIDA; });
  var cadenaCompleta = f.filter(function (o) {
    return o.cadena && o.cadena.soporte && o.cadena.envio && o.cadena.respuesta &&
           o.cadena.sellado;
  });
  var sinSoporte = f.filter(function (o) { return !(o.cadena && o.cadena.soporte); });
  var sinValor = f.filter(function (o) { return !o.valor; });

  // en la oficina vs en pagaduria, y con que se paga cada grupo
  var enOficina = f.filter(function (o) { return o.paga_quien === 'OFICINA'; });
  var enPagaduria = f.filter(function (o) { return o.paga_quien === 'PAGADURIA'; });

  return {
    total: f.length,
    vencidas: vencidas.length,
    por_vencer: porVencer.length,
    esperan_revision: esperanRevision.length,
    cadena_completa: cadenaCompleta.length,
    pct_cadena_completa: f.length
      ? Math.round((cadenaCompleta.length / f.length) * 100) : 0,
    sin_soporte: sinSoporte.length,
    sin_valor: sinValor.length,
    valor_total: sumarValor(f),

    por_estado: contarPor(f, 'estado'),
    por_impuesto: contarPor(f, 'impuesto'),
    por_municipio: contarPor(f, 'municipio'),
    por_responsable: contarPor(f, 'responsable'),
    por_periodo: contarPor(f, 'periodo'),

    pago: {
      oficina: {
        cuantas: enOficina.length,
        valor: sumarValor(enOficina),
        por_forma: contarPor(enOficina, 'forma_pago')
      },
      pagaduria: {
        cuantas: enPagaduria.length,
        valor: sumarValor(enPagaduria),
        por_forma: contarPor(enPagaduria, 'forma_pago')
      }
    },

    // lo que mas aprieta, para el titular de la pantalla
    peor_vencida: vencidas.slice().sort(function (a, b) {
      return a.dias - b.dias;
    })[0] || null
  };
}

/** La pantalla de metricas. Solo JEFE y ADMIN. */
function apiMetricas(periodo) {
  exige('verMetricas');

  var todas = listarTodas();
  var p = periodo ? normPeriodo(periodo) : '';
  var filas = p ? todas.filter(function (o) { return o.periodo === p; }) : todas;

  var periodos = {};
  todas.forEach(function (o) { if (o.periodo) periodos[o.periodo] = true; });

  return {
    periodo: p,
    periodos: Object.keys(periodos).sort().reverse(),
    metricas: agruparMetricas(filas),
    generado: fechaHoraTexto(new Date())
  };
}


// ═════ 17_Ejemplo.gs ═════

/**
 * SINAV · sembrar un escenario de ejemplo.
 *
 * Para probar el flujo completo con gente real sin tener que escribir a mano
 * treinta y dos columnas por fila, ni calcular el id, que tiene que quedar
 * exactamente cod_dane|impuesto|regimen|periodo.
 *
 * ESTO ES DATO DE PRUEBA. Borra las filas antes de salir a produccion: se
 * reconocen porque la nota empieza por "EJEMPLO".
 */

var MARCA_EJEMPLO = 'EJEMPLO';

/**
 * Municipios reales con su codigo DANE, para que el escenario se parezca al
 * trabajo de verdad. El codigo de oficina es inventado pero con la forma
 * correcta: cuatro digitos, texto.
 */
/*
 * A proposito NO se usan Bogota, Medellin ni Cali: esas tres ya las crea
 * asegurarPruebas() y el id (cod_dane|impuesto|regimen|periodo) chocaria, asi
 * que la fila se saltaria y el escenario quedaria incompleto.
 * Los codigos DANE son los reales; los de oficina y los NIT son de ejemplo.
 */
var MUNICIPIOS_EJEMPLO = [
  { dane: '08001', municipio: 'Barranquilla', oficina: '0415', nit: '890102018' },
  { dane: '68001', municipio: 'Bucaramanga',  oficina: '0628', nit: '890201222' },
  { dane: '13001', municipio: 'Cartagena',    oficina: '0519', nit: '890480184' },
  { dane: '66001', municipio: 'Pereira',      oficina: '0733', nit: '891480030' },
  { dane: '17001', municipio: 'Manizales',    oficina: '0260', nit: '890801053' },
  { dane: '47001', municipio: 'Santa Marta',  oficina: '0188', nit: '891780009' }
];

/**
 * El escenario: seis obligaciones que cubren los casos que hay que ver.
 * dias es contra hoy, asi que el escenario siempre esta "fresco".
 */
var ESCENARIO_EJEMPLO = [
  // SIN RESPONSABLE: es lo que la jefa ve en Asignación y en Alertas, y lo
  // que reparte. Hasta que alguien sea el dueño, nadie la ve en su pantalla.
  { i: 0, impuesto: 'ICA',          dias: 3,   soporte: false, periodicidad: 'BIMESTRAL',
    sinAsignar: true,
    que: 'SIN RESPONSABLE y vence en 3 días — para que la jefa la asigne' },
  { i: 3, impuesto: 'ICA',          dias: 12,  soporte: false, periodicidad: 'BIMESTRAL',
    sinAsignar: true,
    que: 'SIN RESPONSABLE, con más tiempo' },

  { i: 0, impuesto: 'RETEICA',      dias: 9,   soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte, con tiempo' },
  { i: 1, impuesto: 'AUTORRETEICA', dias: 3,   soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte, vence en 3 dias' },
  { i: 2, impuesto: 'ICA',          dias: 1,   soporte: false, periodicidad: 'BIMESTRAL',
    que: 'sin soporte, vence manana' },
  { i: 3, impuesto: 'RETEICA',      dias: -4,  soporte: false, periodicidad: 'MENSUAL',
    que: 'sin soporte y YA VENCIDA' },
  { i: 4, impuesto: 'AUTORRETEICA', dias: 15,  soporte: true,  periodicidad: 'MENSUAL',
    que: 'con soporte, lista para enviar' },
  { i: 5, impuesto: 'ICA',          dias: 25,  soporte: true,  periodicidad: 'BIMESTRAL',
    que: 'con soporte, lista para enviar' }
];

/** El periodo que le toca a una periodicidad, contando desde hoy. */
function periodoDeEjemplo(periodicidad) {
  var hoy = new Date();
  var anio = Number(Utilities.formatDate(hoy, TZ, 'yyyy'));
  var mes = Number(Utilities.formatDate(hoy, TZ, 'MM'));
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Siembra el escenario y se lo asigna a un profesional.
 * Desde el menu pide el correo; desde el editor se le pasa como argumento.
 *
 * Es idempotente por id: correrlo dos veces no duplica. Si quieres volver a
 * empezar, corre borrarEjemplo() primero.
 */
function sembrarEjemplo(correoProfesional) {
  // Sin argumento se asigna a quien la corre. Es lo que pasa al elegirla en el
  // desplegable del editor, que no permite pasar parametros: antes reventaba
  // con un error, y lo util es que el ADMIN se las asigne a si mismo para
  // probar. Desde el menu del Sheets si se pide el correo.
  var correo = normCorreo(correoProfesional) ||
               normCorreo(Session.getEffectiveUser().getEmail());
  if (!correo) {
    throw new Error('No se pudo leer ningún correo. Pásalo a mano: ' +
                    'sembrarEjemplo("nombre.apellido@davivienda.com")');
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var existentes = {};
    filas(HOJA.OBLIGACIONES).forEach(function (f) {
      existentes[String(f[ix.id]).trim()] = true;
    });

    var nuevas = [], eventos = [], hechas = [], saltadas = 0;

    ESCENARIO_EJEMPLO.forEach(function (caso) {
      var m = MUNICIPIOS_EJEMPLO[caso.i];
      var vence = new Date();
      vence.setDate(vence.getDate() + caso.dias);

      var n = normObligacion({
        cod_dane: m.dane, cod_oficina: m.oficina, municipio: m.municipio,
        impuesto: caso.impuesto, regimen: 'GENERAL',
        periodo: periodoDeEjemplo(caso.periodicidad),
        periodicidad: caso.periodicidad, vencimiento: vence,
        nit_municipio: m.nit,
        // en modo PRUEBA el correo igual llega a quien envia, no a la oficina
        correo_oficina: 'oficina.' + m.municipio.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z]/g, '') + '@davivienda.com',
        responsable: caso.sinAsignar ? '' : correo,
        tipo_presentacion: 'OFICINA', paga_quien: 'OFICINA', forma_pago: '',
        requiere_envio: 'SI', exogena: '', incluye_retencion: '',
        valor: '',
        nota: MARCA_EJEMPLO + ': ' + caso.que + '. Borrar antes de producción.'
      });

      if (n.problemas.length) {
        throw new Error('El escenario de ejemplo esta mal armado (' +
                        m.municipio + '): ' + n.problemas.join('; '));
      }
      if (existentes[n.fila.id]) { saltadas++; return; }

      var o = n.fila;
      o.soporte_id = caso.soporte ? soportePrueba(o) : '';
      o.estado = o.soporte_id ? ESTADO.LISTA : ESTADO.PENDIENTE;
      o.reprocesos = 0;

      nuevas.push(COLS.OBLIGACIONES.map(function (c) {
        return o[c] === undefined || o[c] === null ? '' : o[c];
      }));
      eventos.push({ id: o.id, quePaso: EVENTO.CREADA,
                     detalle: MARCA_EJEMPLO + ': ' + caso.que });
      if (!caso.sinAsignar) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'asignada a ' + correo });
      }
      if (o.soporte_id) {
        eventos.push({ id: o.id, quePaso: EVENTO.SOPORTE_CARGADO,
                       detalle: 'soporte de ejemplo' });
      }
      hechas.push(m.municipio + ' ' + caso.impuesto + ' ' + o.periodo +
                  ' — ' + caso.que);
    });

    if (nuevas.length) {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      registrarVarios(eventos);
    }

    var conDueno = ESCENARIO_EJEMPLO.filter(function (c) { return !c.sinAsignar; }).length;
    var sinDueno = ESCENARIO_EJEMPLO.length - conDueno;

    var resumen = [
      nuevas.length + ' obligaciones de ejemplo creadas',
      '  ' + conDueno + ' asignadas a ' + correo,
      '  ' + sinDueno + ' SIN responsable, para que el JEFE las reparta ' +
        'desde la pestaña Asignación',
      '',
      saltadas ? saltadas + ' ya existían y no se duplicaron' : ''
    ].concat(hechas.map(function (h) { return '  · ' + h; }))
     .filter(String).join('\n');

    Logger.log(resumen);
    return resumen;
  });
}

/** Borra todo lo que sembró sembrarEjemplo(). No toca nada más. */
function borrarEjemplo() {
  return conCerrojo(function () {
    var h = hoja(HOJA.OBLIGACIONES);
    var ix = indices(HOJA.OBLIGACIONES);
    var f = filas(HOJA.OBLIGACIONES);
    var borradas = 0;

    // de abajo hacia arriba, para que los indices no se corran al borrar
    for (var i = f.length - 1; i >= 0; i--) {
      if (String(f[i][ix.nota] || '').indexOf(MARCA_EJEMPLO) === 0) {
        h.deleteRow(i + 2);
        borradas++;
      }
    }
    var resumen = borradas
      ? borradas + ' filas de ejemplo borradas. Los EVENTOS se quedan: son el log.'
      : 'No había filas de ejemplo.';
    Logger.log(resumen);
    return resumen;
  });
}

/** Desde el menu: pide el correo y siembra. */
function sembrarEjemploDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt(
    'Sembrar escenario de ejemplo',
    'Correo del PROFESIONAL al que se le asignan las obligaciones:\n' +
    '(tiene que estar en la hoja USUARIOS)',
    ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  try {
    ui.alert('Listo', sembrarEjemplo(r.getResponseText()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('No se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}

/* ===========================================================================
   Generador de volumen.
   El escenario de arriba son 8 filas para seguir un caso a mano. Esto llena la
   hoja con decenas, para ver como se comporta la herramienta con trabajo de
   verdad: filtros, conteos, metricas, carga masiva de un lote entero.
   =========================================================================== */

/**
 * Capitales de departamento con su codigo DANE real.
 * El codigo de oficina y el NIT del municipio son de ejemplo: el calendario
 * real trae los suyos y hay que tomarlos de ahi.
 */
var CATALOGO_MUNICIPIOS = [
  ['11001', 'Bogotá D.C.',     '0851'], ['05001', 'Medellín',        '0742'],
  ['76001', 'Cali',            '0304'], ['08001', 'Barranquilla',    '0415'],
  ['13001', 'Cartagena',       '0519'], ['68001', 'Bucaramanga',     '0628'],
  ['66001', 'Pereira',         '0733'], ['17001', 'Manizales',       '0260'],
  ['47001', 'Santa Marta',     '0188'], ['50001', 'Villavicencio',   '0394'],
  ['73001', 'Ibagué',          '0477'], ['52001', 'Pasto',           '0561'],
  ['54001', 'Cúcuta',          '0203'], ['63001', 'Armenia',         '0318'],
  ['23001', 'Montería',        '0682'], ['70001', 'Sincelejo',       '0795'],
  ['20001', 'Valledupar',      '0837'], ['19001', 'Popayán',         '0146'],
  ['41001', 'Neiva',           '0252'], ['44001', 'Riohacha',        '0909'],
  ['81001', 'Arauca',          '0371'], ['85001', 'Yopal',           '0488'],
  ['18001', 'Florencia',       '0593'], ['27001', 'Quibdó',          '0624'],
  ['15001', 'Tunja',           '0170'], ['86001', 'Mocoa',           '0745'],
  ['91001', 'Leticia',         '0812'], ['88001', 'San Andrés',      '0901'],
  ['94001', 'Inírida',         '0933'], ['95001', 'San José del Guaviare', '0957']
];

/** Cada impuesto con la periodicidad que le corresponde. */
var IMPUESTOS_GEN = [
  { impuesto: 'RETEICA',      periodicidad: 'MENSUAL' },
  { impuesto: 'AUTORRETEICA', periodicidad: 'MENSUAL' },
  { impuesto: 'ICA',          periodicidad: 'BIMESTRAL' },
  { impuesto: 'EXOGENA',      periodicidad: 'ANUAL' }
];

/**
 * Numeros pseudoaleatorios con semilla, para que correrlo dos veces con la
 * misma semilla de el mismo resultado. Con Math.random() no se podria
 * reproducir un caso raro que salga.
 */
function azarConSemilla(semilla) {
  var s = semilla || 20261106;
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** El periodo de una periodicidad, n meses hacia atras desde hoy. */
function periodoAtras(periodicidad, mesesAtras) {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - (mesesAtras || 0));
  var anio = d.getFullYear(), mes = d.getMonth() + 1;
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Llena OBLIGACIONES con datos de prueba variados.
 *
 *   generarObligaciones()                         60 filas, repartidas entre
 *                                                 los profesionales activos
 *   generarObligaciones(150)                      150 filas
 *   generarObligaciones(40, "ana@davivienda.com") 40, todas para Ana
 *
 * Reparte a proposito: unas vencidas, unas venciendo esta semana, unas con
 * soporte y unas sin responsable, para que los filtros y las metricas tengan
 * algo que mostrar.
 *
 * Es idempotente por id: correrlo dos veces no duplica. Todo queda marcado
 * como EJEMPLO, asi que borrarEjemplo() lo limpia.
 */
function generarObligaciones(cuantas, correoResponsable, semilla) {
  var n = Number(cuantas) || 60;
  if (n < 1 || n > 2000) throw new Error('Pide entre 1 y 2000 filas, no ' + n);

  var azar = azarConSemilla(semilla);
  var deUno = function (lista) { return lista[Math.floor(azar() * lista.length)]; };

  // a quien se le asigna. Sin correo y sin profesionales en USUARIOS, se las
  // queda quien la corre: es lo que hace util correrla desde el editor.
  var fijo = normCorreo(correoResponsable);
  var equipo = fijo ? [fijo] : asignables()
    .filter(function (u) { return u.rol === ROL.PROFESIONAL; })
    .map(function (u) { return u.correo; });

  if (!fijo && !equipo.length) {
    var mio = normCorreo(Session.getEffectiveUser().getEmail());
    if (!mio) {
      throw new Error('No hay profesionales activos en USUARIOS y no se pudo ' +
        'leer tu correo. Pasa uno: generarObligaciones(60, "correo@davivienda.com")');
    }
    equipo = [mio];
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var existentes = {};
    filas(HOJA.OBLIGACIONES).forEach(function (f) {
      existentes[String(f[ix.id]).trim()] = true;
    });

    var nuevas = [], eventos = [], saltadas = 0;
    var cuenta = { sin_responsable: 0, con_soporte: 0, vencidas: 0, por_vencer: 0 };
    var intentos = 0, tope = n * 12;

    while (nuevas.length < n && intentos < tope) {
      intentos++;

      var mun = deUno(CATALOGO_MUNICIPIOS);
      var imp = deUno(IMPUESTOS_GEN);
      var atras = Math.floor(azar() * 4);               // hasta 3 meses atras
      var periodo = periodoAtras(imp.periodicidad, atras);

      // vencimiento: un 20% ya vencido, un 25% esta semana, el resto adelante
      var r = azar();
      var dias = r < 0.20 ? -(1 + Math.floor(azar() * 25))
               : r < 0.45 ? Math.floor(azar() * 5)
               : 5 + Math.floor(azar() * 40);
      var vence = new Date();
      vence.setDate(vence.getDate() + dias);

      var sinDueno = azar() < 0.18;
      var conSoporte = !sinDueno && azar() < 0.35;

      var norm = normObligacion({
        cod_dane: mun[0], cod_oficina: mun[2], municipio: mun[1],
        impuesto: imp.impuesto, regimen: 'GENERAL',
        periodo: periodo, periodicidad: imp.periodicidad, vencimiento: vence,
        nit_municipio: '89' + mun[0] + '00' + (1 + Math.floor(azar() * 8)),
        correo_oficina: 'oficina.' + mun[1].toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z]/g, '') + '@davivienda.com',
        responsable: sinDueno ? '' : deUno(equipo),
        tipo_presentacion: azar() < 0.25 ? 'VIRTUAL' : 'OFICINA',
        paga_quien: azar() < 0.3 ? 'PAGADURIA' : 'OFICINA',
        forma_pago: azar() < 0.5 ? deUno(FORMAS_PAGO) : '',
        requiere_envio: azar() < 0.08 ? 'NO' : 'SI',
        exogena: azar() < 0.3 ? 'SI' : 'NO',
        incluye_retencion: azar() < 0.3 ? 'SI' : 'NO',
        valor: azar() < 0.65
          ? Math.round((200000 + azar() * 9800000) / 50) * 50 : '',
        nota: MARCA_EJEMPLO + ': generada. Borrar antes de producción.'
      });

      if (norm.problemas.length) continue;          // combinacion invalida
      if (existentes[norm.fila.id]) { saltadas++; continue; }
      existentes[norm.fila.id] = true;

      var o = norm.fila;
      o.soporte_id = conSoporte ? soportePrueba(o) : '';
      o.estado = o.soporte_id ? ESTADO.LISTA : ESTADO.PENDIENTE;
      o.reprocesos = 0;

      nuevas.push(COLS.OBLIGACIONES.map(function (c) {
        return o[c] === undefined || o[c] === null ? '' : o[c];
      }));
      eventos.push({ id: o.id, quePaso: EVENTO.CREADA,
                     detalle: MARCA_EJEMPLO + ': generada' });
      if (o.responsable) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'asignada a ' + o.responsable });
      }

      if (!o.responsable) cuenta.sin_responsable++;
      if (o.soporte_id) cuenta.con_soporte++;
      if (dias < 0) cuenta.vencidas++;
      else if (dias <= 4) cuenta.por_vencer++;
    }

    if (nuevas.length) {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      registrarVarios(eventos);
    }

    var resumen = [
      nuevas.length + ' obligaciones generadas' +
        (fijo ? ' para ' + fijo : ' repartidas entre ' + equipo.length + ' profesionales'),
      '  ' + cuenta.vencidas + ' ya vencidas',
      '  ' + cuenta.por_vencer + ' vencen en 4 días o menos',
      '  ' + cuenta.sin_responsable + ' sin responsable (para la pestaña Asignación)',
      '  ' + cuenta.con_soporte + ' con soporte, listas para enviar',
      saltadas ? '  ' + saltadas + ' combinaciones repetidas que se saltaron' : '',
      '',
      'Todas quedan marcadas como ' + MARCA_EJEMPLO + '. Para quitarlas:',
      'menú SINAV → Datos de ejemplo → Borrar el ejemplo.'
    ].filter(String).join('\n');

    Logger.log(resumen);
    return resumen;
  });
}

/** Desde el menu: pide cuantas y las genera. */
function generarObligacionesDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Llenar OBLIGACIONES con datos de prueba',
    '¿Cuántas filas? (por ejemplo 60)\n\n' +
    'Se reparten entre los PROFESIONALES activos de la hoja USUARIOS.',
    ui.ButtonSet.OK_CANCEL);

  if (r.getSelectedButton() !== ui.Button.OK) return;

  try {
    ui.alert('Listo', generarObligaciones(r.getResponseText()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('No se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}


// ═════ 18_Asignacion.gs ═════

/**
 * SINAV · asignacion. Solo JEFE y ADMIN.
 *
 * La pregunta de esta pantalla: que no tiene dueño, y a quien se lo doy.
 *
 * El responsable es el CORREO CORPORATIVO, nunca una inicial ni un nombre:
 * en el origen real una letra ya sobrevivio a dos cambios de titular y nadie
 * supo de quien era el trabajo.
 */

/** Los profesionales activos a los que se les puede asignar trabajo. */
function asignables() {
  var ix = indices(HOJA.USUARIOS);
  return filas(HOJA.USUARIOS)
    .map(function (f) {
      return {
        correo: String(f[ix.correo]).trim().toLowerCase(),
        nombre: String(f[ix.nombre]).trim(),
        rol: normalizarRol(f[ix.rol]),
        area: 'area' in ix ? normalizarArea(f[ix.area]) : '',
        nivel: 'nivel' in ix ? normalizarNivel(f[ix.nivel]) : '',
        activo: esActivo(f[ix.activo])
      };
    })
    .filter(function (u) { return u.correo && u.activo && u.rol; })
    .map(function (u) {
      u.nombre = u.nombre || nombreDesdeCorreo(u.correo);
      u.perfil = perfilTexto(u);
      return u;
    })
    .sort(function (a, b) {
      // los profesionales primero: son los que hacen el trabajo
      if ((a.rol === ROL.PROFESIONAL) !== (b.rol === ROL.PROFESIONAL)) {
        return a.rol === ROL.PROFESIONAL ? -1 : 1;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    });
}

/**
 * La lista de la pantalla: todo lo que todavia se puede repartir.
 * Lo que no tiene dueño va primero, y dentro de eso lo que antes se vence.
 */
function apiListaAsignacion() {
  exige('asignar');

  var lista = listarTodas()
    .filter(function (o) { return o.estado !== ESTADO.APROBADA; })
    .map(function (o) {
      o.sin_responsable = !String(o.responsable || '').trim();
      return o;
    })
    .sort(function (a, b) {
      if (a.sin_responsable !== b.sin_responsable) return a.sin_responsable ? -1 : 1;
      var da = a.dias === null ? 9999 : a.dias;
      var db = b.dias === null ? 9999 : b.dias;
      if (da !== db) return da - db;
      return a.municipio.localeCompare(b.municipio, 'es');
    });

  // cuanto lleva cada quien, para no cargarle todo al mismo
  var carga = {};
  lista.forEach(function (o) {
    var r = String(o.responsable || '').trim().toLowerCase();
    if (r) carga[r] = (carga[r] || 0) + 1;
  });

  return {
    filas: lista,
    personas: asignables().map(function (u) {
      u.carga = carga[u.correo] || 0;
      return u;
    }),
    resumen: {
      todas: lista.length,
      sin_responsable: lista.filter(function (o) { return o.sin_responsable; }).length,
      vencidas: lista.filter(function (o) { return o.dias !== null && o.dias < 0; }).length,
      por_vencer: lista.filter(function (o) {
        return o.dias !== null && o.dias >= 0 && o.dias <= 4;
      }).length
    },
    generado: fechaHoraTexto(new Date())
  };
}

/**
 * Asigna una o varias obligaciones a un correo.
 * Pasar correo vacio las deja sin responsable, que es como se quita a alguien.
 */
function apiAsignar(ids, correo) {
  exige('asignar');

  var lista = (ids || []).filter(String);
  if (!lista.length) throw new Error('No llegó ninguna obligación que asignar.');

  var destino = String(correo || '').trim();
  if (destino) {
    destino = normCorreo(destino);
    if (!destino) throw new Error('Ese no es un correo válido: ' + correo);

    var existe = asignables().filter(function (u) { return u.correo === destino; })[0];
    if (!existe) {
      throw new Error('«' + destino + '» no está activo en la hoja USUARIOS. ' +
        'Inscríbelo antes de asignarle trabajo: si no, no va a poder entrar.');
    }
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var h = hoja(HOJA.OBLIGACIONES);
    var hechas = [], rechazadas = [];

    lista.forEach(function (id) {
      var fila = buscarFila(id);
      if (!fila) { rechazadas.push({ id: id, motivo: 'no existe' }); return; }

      var val = h.getRange(fila, 1, 1, h.getLastColumn()).getValues()[0];
      var estado = String(val[ix.estado]).toUpperCase();
      if (estado === ESTADO.APROBADA) {
        rechazadas.push({ id: id, motivo: 'está APROBADA: ya es evidencia cerrada' });
        return;
      }

      var antes = String(val[ix.responsable] || '').trim().toLowerCase();
      if (antes === destino) { return; }        // ya estaba asi

      escribirCampos(HOJA.OBLIGACIONES, fila, { responsable: destino });
      registrar(id, EVENTO.ASIGNADA, destino
        ? (antes ? 'de ' + antes + ' a ' + destino : 'asignada a ' + destino)
        : 'se quitó el responsable' + (antes ? ' (' + antes + ')' : ''));
      hechas.push(id);
    });

    return {
      asignadas: hechas.length,
      rechazadas: rechazadas,
      correo: destino,
      sin_cambio: lista.length - hechas.length - rechazadas.length
    };
  });
}


// ═════ 19_Vigencias.gs ═════

/**
 * SINAV · vigencias fiscales y carpetas de Drive (REQ-009, REQ-011).
 *
 * El equipo trabaja por ano vencido: en 2027 se presentan las obligaciones de
 * la vigencia 2026. Por eso son tres cosas distintas y no una:
 *
 *   vigencia fiscal      a que ano PERTENECE la obligacion  -> decide la carpeta
 *   ano de presentacion  cuando se presenta
 *   fecha de envio       cuando SINAV mando el correo
 *
 * La carpeta de destino sale SIEMPRE de la vigencia, nunca de la fecha de hoy.
 *
 * Estructura, que el equipo ya creo a mano en Drive:
 *
 *   Territoriales / <vigencia> / Exógenas
 *                              / Declaraciones / Soportes / <municipio> / <impuesto>
 *                                              / Sellados / Soportes
 *
 * Los ids de 2026 estan en VIGENCIAS_CONOCIDAS y se escriben una sola vez.
 * SINAV nunca reemplaza un id que ya este: si una carpeta no responde, avisa
 * en vez de crear otra, porque crear una carpeta nueva seria partir en dos el
 * archivo del equipo sin que nadie se entere.
 */

/** Todas las vigencias de la hoja, como objetos. */
function vigencias() {
  return registros(HOJA.VIGENCIAS)
    .filter(function (v) { return String(v.vigencia || '').trim(); })
    .map(function (v) {
      v.vigencia = String(v.vigencia).trim();
      v.activa = esActivo(v.activa);
      return v;
    });
}

/** La vigencia por defecto: CONFIG.vigencia_actual, o la mayor activa. */
function vigenciaActual() {
  var pedida = String(config('vigencia_actual') || '').trim();
  var todas = vigencias();
  if (pedida && todas.some(function (v) { return v.vigencia === pedida; })) return pedida;
  var activas = todas.filter(function (v) { return v.activa; })
    .map(function (v) { return v.vigencia; }).sort();
  if (activas.length) return activas[activas.length - 1];
  return String(new Date().getFullYear());
}

/** La fila de una vigencia. Lanza si no esta habilitada. */
function vigenciaDe(anio) {
  var a = String(anio || '').trim() || vigenciaActual();
  var v = vigencias().filter(function (x) { return x.vigencia === a; })[0];
  if (!v) {
    throw new Error('La vigencia ' + a + ' no está habilitada. ' +
      'Un PROFESIONAL-III la habilita desde Configuración, o con habilitarVigencia("' + a + '").');
  }
  return v;
}

/** Abre una carpeta por id, con un mensaje util si no responde. */
function carpetaPorId(id, queEs) {
  var limpio = String(id || '').trim();
  if (!limpio) {
    throw new Error('No hay id de Drive para ' + queEs + '. ' +
      'Revisa la hoja VIGENCIAS: SINAV no crea esa carpeta sola, a propósito.');
  }
  try {
    return DriveApp.getFolderById(limpio);
  } catch (e) {
    throw new Error('No se pudo abrir la carpeta de ' + queEs + ' (id ' + limpio + '). ' +
      'O se borró, o la cuenta que desplegó la aplicación no tiene acceso. ' +
      'SINAV no crea otra en su lugar.');
  }
}

/**
 * La carpeta donde va un documento.
 *   clase: 'soportes' | 'sellados' | 'exogenas' | 'sellados_soportes'
 *
 * Para soportes y sellados se baja a <municipio>/<impuesto>, que es como lo
 * pidio el equipo. Las exogenas se quedan en su carpeta por municipio.
 */
function carpetaDocumento(clase, vigencia, municipio, impuesto) {
  var v = vigenciaDe(vigencia);
  var raiz = {
    soportes:          ['carpeta_soportes', 'Soportes'],
    sellados:          ['carpeta_sellados', 'Sellados'],
    exogenas:          ['carpeta_exogenas', 'Exógenas'],
    sellados_soportes: ['carpeta_sellados_soportes', 'Sellados/Soportes']
  }[clase];
  if (!raiz) throw new Error('Clase de carpeta desconocida: ' + clase);

  var base = carpetaPorId(v[raiz[0]], raiz[1] + ' de ' + v.vigencia);
  if (clase === 'exogenas') {
    return carpetaCache(base, [nombreCarpeta(municipio)], clase, v.vigencia);
  }
  return carpetaCache(base, [nombreCarpeta(municipio), nombreCarpeta(impuesto)],
                      clase, v.vigencia);
}

/**
 * Baja por una ruta de subcarpetas creandolas si hacen falta, y se acuerda del
 * id. Buscar carpetas es lo lento de una carga de cuarenta PDF y en un lote
 * del mismo municipio se repetiria cuarenta veces.
 *
 * Solo se crean las subcarpetas de municipio e impuesto. Las carpetas del ano
 * nunca se crean aqui: esas son las que el equipo ya tiene.
 */
function carpetaCache(base, ruta, clase, vigencia) {
  var clave = 'carp:' + vigencia + ':' + clase + ':' + ruta.join('|');
  var props = PropertiesService.getScriptProperties();
  var guardado = props.getProperty(clave);
  if (guardado) {
    try {
      var c = DriveApp.getFolderById(guardado);
      if (!c.isTrashed()) return c;
    } catch (e) { /* la borraron: se vuelve a crear abajo */ }
  }
  var actual = base;
  for (var i = 0; i < ruta.length; i++) actual = carpetaPorNombre(actual, ruta[i]);
  props.setProperty(clave, actual.getId());
  return actual;
}

/**
 * REQ-011. Habilita una vigencia nueva: crea su estructura bajo Territoriales
 * y guarda los ids. No toca las vigencias que ya existen ni mueve nada.
 */
function habilitarVigencia(anio) {
  exige('habilitarVigencia');

  var a = String(anio || '').trim();
  if (!/^20\d{2}$/.test(a)) throw new Error('La vigencia es un año de cuatro dígitos: ' + anio);

  return conCerrojo(function () {
    if (vigencias().some(function (v) { return v.vigencia === a; })) {
      return 'La vigencia ' + a + ' ya estaba habilitada. No se tocó nada.';
    }

    var raiz = carpetaPorId(config('carpeta_territoriales') || CARPETA_TERRITORIALES,
                            'Territoriales');
    var anioDir = carpetaPorNombre(raiz, a);
    var exo = carpetaPorNombre(anioDir, SUBCARPETAS_VIGENCIA.exogenas);
    var dec = carpetaPorNombre(anioDir, SUBCARPETAS_VIGENCIA.declaraciones);
    var sop = carpetaPorNombre(dec, SUBCARPETAS_VIGENCIA.soportes);
    var sel = carpetaPorNombre(dec, SUBCARPETAS_VIGENCIA.sellados);
    var selSop = carpetaPorNombre(sel, SUBCARPETAS_VIGENCIA.sellados_soportes);

    var fila = {
      vigencia: a,
      carpeta_exogenas: exo.getId(),
      carpeta_declaraciones: dec.getId(),
      carpeta_soportes: sop.getId(),
      carpeta_sellados: sel.getId(),
      carpeta_sellados_soportes: selSop.getId(),
      activa: 'SI'
    };
    agregarFilas(HOJA.VIGENCIAS, [COLS.VIGENCIAS.map(function (c) {
      return fila[c] === undefined ? '' : fila[c];
    })]);
    registrar('', EVENTO.AVISO, 'vigencia ' + a + ' habilitada por ' + yo().correo);

    return 'Vigencia ' + a + ' habilitada en Territoriales/' + a + '.\n' +
           'Las vigencias anteriores no se tocaron.';
  });
}

/** Lo que la interfaz necesita saber de las vigencias. */
function apiVigencias() {
  return {
    actual: vigenciaActual(),
    vigencias: vigencias().map(function (v) {
      return { vigencia: v.vigencia, activa: v.activa };
    }),
    puedeHabilitar: puede('habilitarVigencia')
  };
}


// ═════ 99_Pruebas.gs ═════

/**
 * SINAV · pruebas.
 * Corren desde el editor (menu SINAV -> Correr pruebas, o la funcion pruebas())
 * y tambien en node con `node tools/pruebas.mjs`.
 * Solo tocan funciones puras: normalizacion y maquina de estados. Son las dos
 * donde un error silencioso se propaga.
 */

function pruebas() {
  var r = { pasa: 0, falla: 0, lineas: [] };

  var esIgual = function (titulo, obtenido, esperado) {
    var a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
    if (a === b) {
      r.pasa++;
      r.lineas.push('PASA  ' + titulo);
    } else {
      r.falla++;
      r.lineas.push('FALLA ' + titulo + '\n        esperaba ' + b + '\n        obtuvo   ' + a);
    }
  };

  pruebasPeriodicidad(esIgual);
  pruebasSinSoporte(esIgual);
  pruebasNormalizacionVaria(esIgual);
  pruebasTransiciones(esIgual);
  pruebasRoles(esIgual);
  pruebasPago(esIgual);
  pruebasCargaMasiva(esIgual);
  pruebasMetricas(esIgual);
  pruebasCarga(esIgual);

  var resumen = r.lineas.join('\n') + '\n\n' + r.pasa + ' pasan, ' + r.falla + ' fallan';
  if (typeof Logger !== 'undefined') Logger.log(resumen);
  r.resumen = resumen;
  return r;
}

/** La periodicidad llega sucia del origen: ANUAL, Anual, "MENSUAL " con espacio. */
function pruebasPeriodicidad(esIgual) {
  esIgual('periodicidad MENSUAL', normPeriodicidad('MENSUAL'), 'MENSUAL');
  esIgual('periodicidad con espacio al final', normPeriodicidad('MENSUAL '), 'MENSUAL');
  esIgual('periodicidad con espacio adelante', normPeriodicidad('  MENSUAL'), 'MENSUAL');
  esIgual('periodicidad en minusculas', normPeriodicidad('mensual'), 'MENSUAL');
  esIgual('periodicidad capitalizada', normPeriodicidad('Anual'), 'ANUAL');
  esIgual('periodicidad con acento', normPeriodicidad('Anúal'), 'ANUAL');
  esIgual('periodicidad con tabulador y salto', normPeriodicidad('\tBimestral\n'), 'BIMESTRAL');
  esIgual('periodicidad con espacios internos', normPeriodicidad('CUATRI MESTRAL'), 'CUATRIMESTRAL');
  esIgual('sinonimo BIMENSUAL', normPeriodicidad('Bimensual'), 'BIMESTRAL');
  esIgual('sinonimo ANO', normPeriodicidad('ANO'), 'ANUAL');
  esIgual('sinonimo ANIO con enie', normPeriodicidad('AÑO'), 'ANUAL');
  esIgual('trimestral', normPeriodicidad('trimestre'), 'TRIMESTRAL');
  esIgual('vacio no inventa nada', normPeriodicidad(''), '');
  esIgual('nulo no revienta', normPeriodicidad(null), '');
  esIgual('indefinido no revienta', normPeriodicidad(undefined), '');
  esIgual('SEMESTRAL no esta en el enum', normPeriodicidad('SEMESTRAL'), '');
  esIgual('basura no pasa', normPeriodicidad('x'), '');
  esIgual('normaliza una vez, no cada vez',
          normPeriodicidad(normPeriodicidad('  anual  ')), 'ANUAL');
}

/** LA REGLA: sin soporte no hay envio, sin excepcion. */
function pruebasSinSoporte(esIgual) {
  var base = {
    estado: ESTADO.LISTA,
    soporte_id: '1AbCdEf',
    requiere_envio: 'SI',
    correo_oficina: 'oficina@davivienda.com'
  };
  var con = function (cambios) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(cambios || {}).forEach(function (k) { o[k] = cambios[k]; });
    return o;
  };

  esIgual('con soporte y LISTA se envia', puedeEnviar(base).ok, true);

  esIgual('soporte vacio no se envia', puedeEnviar(con({ soporte_id: '' })).ok, false);
  esIgual('soporte vacio dice por que',
          puedeEnviar(con({ soporte_id: '' })).motivo, 'sin soporte');
  esIgual('soporte con solo espacios no se envia',
          puedeEnviar(con({ soporte_id: '   ' })).ok, false);
  esIgual('soporte nulo no se envia', puedeEnviar(con({ soporte_id: null })).ok, false);
  esIgual('soporte indefinido no se envia',
          puedeEnviar(con({ soporte_id: undefined })).ok, false);
  esIgual('fila vacia no se envia', puedeEnviar({}).ok, false);
  esIgual('nulo no revienta', puedeEnviar(null).ok, false);

  esIgual('requiere_envio NO no se envia',
          puedeEnviar(con({ requiere_envio: 'NO' })).ok, false);
  esIgual('requiere_envio REVISAR no se envia',
          puedeEnviar(con({ requiere_envio: 'REVISAR' })).ok, false);
  esIgual('sin correo de oficina no se envia',
          puedeEnviar(con({ correo_oficina: '' })).ok, false);
  esIgual('correo invalido no se envia',
          puedeEnviar(con({ correo_oficina: 'no-es-un-correo' })).ok, false);
  esIgual('estado PENDIENTE no se envia',
          puedeEnviar(con({ estado: ESTADO.PENDIENTE })).ok, false);
  esIgual('estado ENVIADA no se reenvia solo',
          puedeEnviar(con({ estado: ESTADO.ENVIADA })).ok, false);

  // la misma regla por el otro lado: no se puede llegar a LISTA sin soporte
  esIgual('PENDIENTE sin soporte no pasa a LISTA',
          validarPaso({ estado: ESTADO.PENDIENTE, soporte_id: '' }, ESTADO.LISTA, {}, ROL.ADMIN).ok,
          false);
  esIgual('PENDIENTE con soporte pasa a LISTA',
          validarPaso({ estado: ESTADO.PENDIENTE, soporte_id: '1Ab' }, ESTADO.LISTA, {}, ROL.ADMIN).ok,
          true);
  esIgual('DEVUELTA sin soporte no vuelve a LISTA',
          validarPaso({ estado: ESTADO.DEVUELTA, soporte_id: '  ' }, ESTADO.LISTA, {},
                      PERFIL.PROFESIONAL_III).ok,
          false);
  esIgual('ni un ADMIN puede enviar sin soporte',
          validarPaso(con({ soporte_id: '' }), ESTADO.ENVIADA, {}, ROL.ADMIN).ok, false);
}

function pruebasNormalizacionVaria(esIgual) {
  // los codigos son texto: "0851" no es 851
  esIgual('cod_oficina conserva ceros', normCodigo('0851'), '0851');
  esIgual('cod_oficina numerico recupera el cero', normCodigo(851, 4), '0851');
  esIgual('cod_dane de cinco recupera el cero', normCodigo(5001, 5), '05001');
  esIgual('cod_dane de cinco intacto', normCodigo('11001', 5), '11001');
  esIgual('codigo que vino como decimal', normCodigo('851.0', 4), '0851');
  esIgual('codigo en notacion cientifica', normCodigo('8.99999061E+8'), '899999061');
  esIgual('codigo vacio', normCodigo(''), '');

  esIgual('periodo mensual con un digito', normPeriodo('2026-9'), '2026-09');
  esIgual('periodo mensual con dos', normPeriodo('2026-09'), '2026-09');
  esIgual('periodo con barra', normPeriodo('2026/09'), '2026-09');
  esIgual('periodo bimestral', normPeriodo('2026-b4'), '2026-B4');
  esIgual('periodo trimestral', normPeriodo('2026-T3'), '2026-T3');
  esIgual('periodo anual', normPeriodo('2026'), '2026');
  esIgual('mes 13 no existe', normPeriodo('2026-13'), '');
  esIgual('bimestre 7 no existe', normPeriodo('2026-B7'), '');
  esIgual('periodo basura', normPeriodo('septiembre'), '');

  esIgual('regimen vacio es GENERAL', normRegimen(''), 'GENERAL');
  esIgual('regimen con espacios es GENERAL', normRegimen('   '), 'GENERAL');
  esIgual('regimen propio se respeta', normRegimen('comun'), 'COMUN');

  esIgual('correos sin repetidos y en minuscula',
          normCorreos('A@d.com, b@d.com; A@D.COM'), 'a@d.com,b@d.com');
  esIgual('correo invalido se cae', normCorreos('nada, b@d.com'), 'b@d.com');

  esIgual('valor con puntos de mil', normValor('1.234.567,89'), 1234567.89);
  esIgual('valor con comas de mil', normValor('1,234,567.89'), 1234567.89);
  esIgual('valor con signo de pesos', normValor('$ 4.820.350'), 4820350);
  esIgual('valor vacio no es cero', normValor(''), '');

  esIgual('exogena solo aplica a RETEICA',
          normObligacion({ cod_dane: '11001', municipio: 'Bogota', impuesto: 'ICA',
                           periodo: '2026-09', periodicidad: 'MENSUAL',
                           vencimiento: '2026-10-15', exogena: 'SI' }).fila.exogena, 'NO');
  esIgual('el id se arma con los cuatro campos',
          armarId(5001, 'reteica', '', '2026-9'), '05001|RETEICA|GENERAL|2026-09');
  esIgual('la periodicidad sucia se reporta como problema',
          normObligacion({ cod_dane: '11001', municipio: 'Bogota', impuesto: 'ICA',
                           periodo: '2026-09', periodicidad: 'SEMESTRAL',
                           vencimiento: '2026-10-15' }).problemas.length > 0, true);
}

function pruebasTransiciones(esIgual) {
  esIgual('PENDIENTE a LISTA', puedePasar('PENDIENTE', 'LISTA'), true);
  esIgual('LISTA a ENVIADA', puedePasar('LISTA', 'ENVIADA'), true);
  esIgual('ENVIADA a RESPONDIDA', puedePasar('ENVIADA', 'RESPONDIDA'), true);
  esIgual('RESPONDIDA a REVISADA', puedePasar('RESPONDIDA', 'REVISADA'), true);
  esIgual('REVISADA a APROBADA', puedePasar('REVISADA', 'APROBADA'), true);
  esIgual('DEVUELTA vuelve a LISTA', puedePasar('DEVUELTA', 'LISTA'), true);
  esIgual('REBOTADO vuelve a LISTA', puedePasar('REBOTADO', 'LISTA'), true);

  esIgual('PENDIENTE no salta a ENVIADA', puedePasar('PENDIENTE', 'ENVIADA'), false);
  esIgual('RESPONDIDA no salta a APROBADA', puedePasar('RESPONDIDA', 'APROBADA'), false);
  esIgual('APROBADA no va a ningun lado', puedePasar('APROBADA', 'DEVUELTA'), false);
  esIgual('estado inventado', puedePasar('LO_QUE_SEA', 'LISTA'), false);
  esIgual('estado con espacios se tolera', puedePasar(' lista ', 'ENVIADA'), true);

  // REVISADA y APROBADA solo PROFESIONAL-III o ADMIN (REQ-012)
  var respondida = { estado: ESTADO.RESPONDIDA, soporte_id: '1Ab' };
  esIgual('el PROFESIONAL no marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.PROFESIONAL).ok, false);
  esIgual('el PROFESIONAL-III si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.PROFESIONAL_III).ok, true);
  esIgual('un PROFESIONAL-I no marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.PROFESIONAL_I).ok, false);
  esIgual('el ADMIN si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, PERFIL.ADMIN).ok, true);
  esIgual('el ADMIN si marca REVISADA',
          validarPaso(respondida, ESTADO.REVISADA, {}, ROL.ADMIN).ok, true);
  esIgual('el PROFESIONAL no marca APROBADA',
          validarPaso({ estado: ESTADO.REVISADA, soporte_id: '1Ab' },
                      ESTADO.APROBADA, {}, ROL.PROFESIONAL).ok, false);

  // DEVUELTA exige motivo
  esIgual('DEVUELTA sin motivo no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, {}, PERFIL.PROFESIONAL_III).ok, false);
  esIgual('DEVUELTA con motivo en blanco no pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: '   ' },
                      PERFIL.PROFESIONAL_III).ok, false);
  esIgual('DEVUELTA con motivo pasa',
          validarPaso(respondida, ESTADO.DEVUELTA, { motivo: 'sello ilegible' },
                      PERFIL.PROFESIONAL_III).ok,
          true);

  esIgual('no se repite el mismo estado',
          validarPaso({ estado: ESTADO.LISTA, soporte_id: '1Ab' },
                      ESTADO.LISTA, {}, ROL.ADMIN).ok, false);
}

/**
 * Roles: el rol decide permisos, asi que un valor mal escrito en la hoja no
 * puede convertirse en un rol valido por accidente.
 */
function pruebasRoles(esIgual) {
  esIgual('rol PROFESIONAL', normalizarRol('PROFESIONAL'), 'PROFESIONAL');
  esIgual('rol en minusculas', normalizarRol('profesional'), 'PROFESIONAL');
  // REQ-012: el rol JEFE desaparecio; un libro sin migrar lo lee como
  // PROFESIONAL, y migrar() le pone nivel III para que no pierda permisos.
  esIgual('JEFE viejo se lee como PROFESIONAL', normalizarRol(' Jefe '), 'PROFESIONAL');
  esIgual('JEFA tambien', normalizarRol('JEFA'), 'PROFESIONAL');
  esIgual('JEFE se reconoce como rol viejo', esRolViejoJefe('Jefe'), true);
  esIgual('PROFESIONAL no es rol viejo', esRolViejoJefe('PROFESIONAL'), false);

  esIgual('perfil del supervisor',
          perfilDe({ rol: 'PROFESIONAL', nivel: 'III' }), 'PROFESIONAL-III');
  esIgual('perfil sin nivel cae al I, nunca de mas',
          perfilDe({ rol: 'PROFESIONAL', nivel: '' }), 'PROFESIONAL-I');
  esIgual('el ADMIN no lleva nivel', perfilDe({ rol: 'ADMIN', nivel: 'III' }), 'ADMIN');
  esIgual('sin rol no hay perfil', perfilDe({ rol: '', nivel: 'III' }), '');
  esIgual('ADMINISTRADOR es ADMIN', normalizarRol('Administrador'), 'ADMIN');
  esIgual('rol con acento', normalizarRol('Profesiónal'), 'PROFESIONAL');
  esIgual('rol mal escrito no pasa', normalizarRol('Profecional'), '');
  esIgual('rol vacio no pasa', normalizarRol(''), '');
  esIgual('rol nulo no revienta', normalizarRol(null), '');
  esIgual('un rol inventado no se cuela', normalizarRol('SUPERADMIN'), '');

  esIgual('area MUNICIPALES', normalizarArea('municipales'), 'MUNICIPALES');
  esIgual('area con acento y espacio', normalizarArea(' Municipáles '), 'MUNICIPALES');
  esIgual('area que no existe', normalizarArea('NACIONALES'), '');

  esIgual('nivel I', normalizarNivel('I'), 'I');
  esIgual('nivel en minusculas', normalizarNivel('ii'), 'II');
  esIgual('nivel como numero', normalizarNivel('3'), 'III');
  esIgual('nivel desde "Profesional I"', normalizarNivel('Profesional I'), 'I');
  esIgual('la raya es sin nivel', normalizarNivel('-'), '');
  esIgual('IV no es un nivel', normalizarNivel('IV'), '');

  // activo: solo un NO explicito bloquea
  esIgual('activo SI', esActivo('SI'), true);
  esIgual('activo vacio cuenta como activo', esActivo(''), true);
  esIgual('activo NO bloquea', esActivo('NO'), false);
  esIgual('activo no bloquea en minusculas', esActivo('no'), false);
  esIgual('activo Inactivo bloquea', esActivo('Inactivo'), false);

  esIgual('nombre desde correo', nombreDesdeCorreo('maria.lopez@davivienda.com'),
          'Maria Lopez');
  esIgual('perfil del profesional',
          perfilTexto({ rol: 'PROFESIONAL', nivel: 'I', area: 'MUNICIPALES' }),
          'Profesional-I de municipales');
  esIgual('perfil del jefe sin nivel',
          perfilTexto({ rol: 'PROFESIONAL', nivel: 'III', area: 'MUNICIPALES' }),
          'Profesional-III de municipales');
  esIgual('perfil sin rol', perfilTexto({ rol: '', nivel: '', area: '' }), 'sin rol');
}

/**
 * El pago son dos preguntas distintas: QUIEN paga y COMO se paga.
 * Antes vivian en una sola columna, asi que la migracion tiene que repartir
 * bien los valores viejos sin inventar ninguno.
 */
function pruebasPago(esIgual) {
  esIgual('paga_quien OFICINA', normPagaQuien('OFICINA'), 'OFICINA');
  esIgual('paga_quien PAGADURIA con acento', normPagaQuien('Pagaduría'), 'PAGADURIA');
  esIgual('paga_quien vacio cae a OFICINA', normPagaQuien(''), 'OFICINA');
  esIgual('PSE no es un pagador', normPagaQuien('PSE'), 'OFICINA');

  esIgual('forma_pago PSE', normFormaPago('PSE'), 'PSE');
  esIgual('forma_pago transferencia', normFormaPago('transferencia'), 'TRANSFERENCIA');
  esIgual('forma_pago abreviada', normFormaPago('Transf.'), 'TRANSFERENCIA');
  esIgual('forma_pago EFECTIVO', normFormaPago('efectivo'), 'EFECTIVO');
  esIgual('PAGADURIA no es una forma de pago', normFormaPago('PAGADURIA'), '');
  esIgual('forma_pago vacia se queda vacia', normFormaPago(''), '');

  // una fila vieja con medio_pago = PSE se tiene que repartir en las dos columnas
  var base = {
    cod_dane: '76001', municipio: 'Cali', impuesto: 'ICA', periodo: '2026-B5',
    periodicidad: 'Bimestral', vencimiento: '2026-11-01'
  };
  var con = function (extra) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return normObligacion(o).fila;
  };

  esIgual('medio_pago PSE -> paga_quien OFICINA',
          con({ medio_pago: 'PSE' }).paga_quien, 'OFICINA');
  esIgual('medio_pago PSE -> forma_pago PSE',
          con({ medio_pago: 'PSE' }).forma_pago, 'PSE');
  esIgual('medio_pago PAGADURIA -> paga_quien PAGADURIA',
          con({ medio_pago: 'PAGADURIA' }).paga_quien, 'PAGADURIA');
  esIgual('medio_pago PAGADURIA no inventa forma_pago',
          con({ medio_pago: 'PAGADURIA' }).forma_pago, '');
  esIgual('las columnas nuevas mandan sobre la vieja',
          con({ medio_pago: 'PSE', paga_quien: 'PAGADURIA',
                forma_pago: 'TRANSFERENCIA' }).paga_quien, 'PAGADURIA');
  esIgual('forma_pago explicita gana',
          con({ medio_pago: 'PSE', forma_pago: 'EFECTIVO' }).forma_pago, 'EFECTIVO');

  esIgual('tipo_presentacion VIRTUAL', normTipoPresentacion('virtual'), 'VIRTUAL');
  esIgual('tipo_presentacion por defecto OFICINA', normTipoPresentacion(''), 'OFICINA');

  // el correo va a las oficinas: no puede decir "undefined" ni "Pagaduria"
  esIgual('el correo nombra quien paga y con que',
          textoPago({ paga_quien: 'OFICINA', forma_pago: 'PSE' }), 'Oficina (PSE)');
  esIgual('sin forma de pago no inventa parentesis',
          textoPago({ paga_quien: 'PAGADURIA', forma_pago: '' }), 'Pagaduría');
  esIgual('pagaduria lleva tilde en el correo',
          textoPago({ paga_quien: 'PAGADURIA' }).indexOf('í') > 0, true);
  esIgual('una fila sin pago no escribe undefined',
          textoPago({}), 'sin definir');
  esIgual('un valor que no esta en el enum no se cuela',
          textoPago({ paga_quien: 'BASURA' }), 'sin definir');
}

/**
 * Carga masiva: emparejar un PDF con la obligacion equivocada es el error mas
 * caro de todo SINAV, porque se descubre cuando la oficina recibe la
 * declaracion de otro municipio. Asi que aqui se prueba que cuando hay duda,
 * NO se elige: se devuelve 'varios' o 'ninguno'.
 */
function pruebasCargaMasiva(esIgual) {
  var leer = leerNombreArchivo;

  esIgual('lee oficina e impuesto',
          [leer('0742 RETEICA 2026-11.pdf').cod_oficina,
           leer('0742 RETEICA 2026-11.pdf').impuesto,
           leer('0742 RETEICA 2026-11.pdf').periodo],
          ['0742', 'RETEICA', '2026-11']);
  esIgual('AUTORRET gana sobre RETEICA',
          leer('Declaracion AUTORRETEICA 0742 2026-11.pdf').impuesto, 'AUTORRETEICA');
  esIgual('AUTORRETENCION ICA tambien es AUTORRETEICA',
          leer('MEDELLIN AUTORRETENCION ICA 0742 2026.pdf').impuesto, 'AUTORRETEICA');
  esIgual('RTEICA abreviado', leer('RTEICA_0851_202611.pdf').impuesto, 'RETEICA');
  esIgual('periodo pegado sin guion', leer('RTEICA_0851_202611.pdf').periodo, '2026-11');
  esIgual('ICA sola no se confunde con RETEICA',
          leer('0304-ICA-2026-B5.pdf').impuesto, 'ICA');
  esIgual('periodo bimestral', leer('0304-ICA-2026-B5.pdf').periodo, '2026-B5');
  esIgual('exogena', leer('exogena 1234 2026.pdf').impuesto, 'EXOGENA');
  esIgual('el anio no se confunde con la oficina',
          leer('exogena 1234 2026.pdf').cod_oficina, '1234');
  esIgual('oficina de 3 digitos se rellena a 4',
          leer('oficina 851 reteica.pdf').cod_oficina, '0851');
  esIgual('un nombre sin datos no inventa oficina',
          leer('declaracion firmada.pdf').cod_oficina, '');
  esIgual('un nombre sin datos no inventa impuesto',
          leer('declaracion firmada.pdf').impuesto, '');

  var cand = [
    { id: 'A', cod_oficina: '0742', impuesto: 'RETEICA' },
    { id: 'B', cod_oficina: '0742', impuesto: 'AUTORRETEICA' },
    { id: 'C', cod_oficina: '0851', impuesto: 'RETEICA' }
  ];
  var par = function (nombre) { return emparejarArchivo(leer(nombre), cand); };

  esIgual('oficina + impuesto da uno solo', par('0742 RETEICA x.pdf').estado, 'listo');
  esIgual('y es el correcto', par('0742 RETEICA x.pdf').id, 'A');
  esIgual('solo oficina deja dos: no elige',
          par('0742 declaracion.pdf').estado, 'varios');
  esIgual('cuando hay varios no devuelve id',
          par('0742 declaracion.pdf').id, '');
  esIgual('pero si ofrece las opciones',
          par('0742 declaracion.pdf').opciones, ['A', 'B']);
  esIgual('una oficina que no existe no empareja',
          par('9999 RETEICA.pdf').estado, 'ninguno');
  esIgual('un nombre vacio de datos no empareja a ciegas',
          par('declaracion.pdf').estado, 'varios');
  esIgual('sin candidatas no hay emparejamiento',
          emparejarArchivo(leer('0742 RETEICA.pdf'), []).estado, 'ninguno');
  esIgual('impuesto que no esta entre las candidatas',
          par('0742 EXOGENA.pdf').estado, 'ninguno');
}

/** Metricas: una division por cero en un tablero vacio tumba la pantalla. */
function pruebasMetricas(esIgual) {
  var fila = function (extra) {
    var o = { estado: ESTADO.LISTA, impuesto: 'RETEICA', municipio: 'Medellín',
              responsable: 'a@d.com', periodo: '2026-11', dias: 5, valor: 1000,
              paga_quien: 'OFICINA', forma_pago: 'PSE',
              cadena: { soporte: true, envio: false, respuesta: false, sellado: false } };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  };

  var vacio = agruparMetricas([]);
  esIgual('metricas vacias: total 0', vacio.total, 0);
  esIgual('metricas vacias no dividen por cero', vacio.pct_cadena_completa, 0);
  esIgual('metricas vacias no tienen peor vencida', vacio.peor_vencida, null);
  esIgual('metricas de null no revientan', agruparMetricas(null).total, 0);

  var tres = [
    fila({ dias: -6, estado: ESTADO.APROBADA, valor: 2000,
           cadena: { soporte: true, envio: true, respuesta: true, sellado: true } }),
    fila({ dias: 2, estado: ESTADO.RESPONDIDA }),
    fila({ dias: 12, valor: '', paga_quien: 'PAGADURIA', forma_pago: '',
           cadena: { soporte: false, envio: false, respuesta: false, sellado: false } })
  ];
  var r = agruparMetricas(tres);
  esIgual('cuenta las vencidas', r.vencidas, 1);
  esIgual('cuenta las que vencen en 4 dias o menos', r.por_vencer, 1);
  esIgual('una vencida no cuenta tambien como por vencer',
          r.vencidas + r.por_vencer, 2);
  esIgual('cuenta las que esperan revision', r.esperan_revision, 1);
  esIgual('cuenta la cadena completa', r.cadena_completa, 1);
  esIgual('porcentaje de cadena completa', r.pct_cadena_completa, 33);
  esIgual('cuenta las que no tienen soporte', r.sin_soporte, 1);
  esIgual('cuenta las que no tienen valor', r.sin_valor, 1);
  esIgual('suma el valor saltando los vacios', r.valor_total, 3000);
  esIgual('un valor vacio no se suma como NaN', isNaN(r.valor_total), false);

  esIgual('separa lo que se paga en oficina', r.pago.oficina.cuantas, 2);
  esIgual('separa lo que se paga en pagaduria', r.pago.pagaduria.cuantas, 1);
  esIgual('desglosa la forma de pago de la oficina',
          r.pago.oficina.por_forma, [{ clave: 'PSE', cuantas: 2 }]);
  esIgual('una forma de pago vacia se declara sin dato',
          r.pago.pagaduria.por_forma, [{ clave: '(sin dato)', cuantas: 1 }]);
  esIgual('la peor vencida es la de mas dias',
          r.peor_vencida.dias, -6);

  esIgual('contarPor ordena de mayor a menor',
          contarPor([{ x: 'a' }, { x: 'b' }, { x: 'b' }], 'x'),
          [{ clave: 'b', cuantas: 2 }, { clave: 'a', cuantas: 1 }]);
  esIgual('contarPor nombra lo vacio', contarPor([{ x: '' }], 'x'),
          [{ clave: '(sin dato)', cuantas: 1 }]);
  esIgual('sumarValor de vacio es 0', sumarValor([]), 0);
}

/**
 * Carga del calendario. Un error aqui no se ve: se traduce en una obligacion
 * con el periodo equivocado o asignada a quien no es, y se descubre cuando
 * alguien reclama un vencimiento que nadie trabajo.
 */
function pruebasCarga(esIgual) {
  // el nombre del municipio viene de mil formas en los archivos
  esIgual('quita el sufijo de autorretenedor',
          claveMunicipio('MELGAR - AUTORETENEDOR'), 'MELGAR');
  esIgual('quita la marca de exogena', claveMunicipio('CAICEDONIA -Exogena'), 'CAICEDONIA');
  esIgual('quita la F suelta', claveMunicipio('PALMIRA F'), 'PALMIRA');
  esIgual('quita acentos y puntuacion', claveMunicipio('Medellín (Ant.)'), 'MEDELLIN ANT');
  esIgual('vacio no revienta', claveMunicipio(''), '');

  // el periodo depende de la periodicidad, no del mes a secas
  esIgual('mensual', periodoDe(2026, 3, 'MENSUAL'), '2026-03');
  esIgual('mensual rellena el cero', periodoDe(2026, 9, 'MENSUAL'), '2026-09');
  esIgual('bimestral', periodoDe(2026, 11, 'BIMESTRAL'), '2026-B6');
  esIgual('bimestral primer bimestre', periodoDe(2026, 1, 'BIMESTRAL'), '2026-B1');
  esIgual('trimestral', periodoDe(2026, 7, 'TRIMESTRAL'), '2026-T3');
  esIgual('cuatrimestral', periodoDe(2026, 12, 'CUATRIMESTRAL'), '2026-C3');
  esIgual('anual es solo el ano', periodoDe(2026, 5, 'ANUAL'), '2026');

  // las ultimas columnas del calendario son del ano siguiente: ano vencido
  var cab = ['NIT', 'Municipio', 'Impuesto'];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2].forEach(function (m) {
    cab.push(new Date(2000, m - 1, 1));
  });
  var cols = columnasDePeriodo(cab, '2026');
  esIgual('detecta las 14 columnas de periodo', cols.length, 14);
  esIgual('la primera es enero de la vigencia',
          [cols[0].anio, cols[0].mes], [2026, 1]);
  esIgual('la doce es diciembre de la vigencia',
          [cols[11].anio, cols[11].mes], [2026, 12]);
  esIgual('la trece ya es del ano siguiente',
          [cols[12].anio, cols[12].mes], [2027, 1]);
  esIgual('y la catorce tambien',
          [cols[13].anio, cols[13].mes], [2027, 2]);
  esIgual('sin columnas de fecha no inventa ninguna',
          columnasDePeriodo(['NIT', 'Municipio'], '2026').length, 0);

  // el responsable: el DANE manda, la entidad manda sobre el DANE
  esIgual('resuelve por codigo DANE',
          responsableDe('05001', '', 'Medellín', '') !== '', true);
  esIgual('un DANE que no existe no inventa responsable',
          responsableDe('99999', '', 'Nolandia', ''), '');
  esIgual('la entidad manda sobre el municipio',
          responsableDe('11001', '', 'Bogotá', 'CORPORACION FINANCIERA SA'),
          MATRIZ_ENTIDAD['CORPORACION FINANCIERA SA']);
  esIgual('BANCO DAVIVIENDA no es una entidad aparte',
          responsableDe('99999', '', 'Nolandia', 'BANCO DAVIVIENDA S.A'), '');

  // los impuestos que quedaron fuera del alcance
  esIgual('predial no entra', IMPUESTO_CALENDARIO['IMPUESTO PREDIAL'], undefined);
  esIgual('alumbrado no entra',
          IMPUESTO_CALENDARIO['IMPUESTO DE ALUMBRADO PUBLICO'], undefined);
  esIgual('industria y comercio es ICA',
          IMPUESTO_CALENDARIO['INDUSTRIA Y COMERCIO'], 'ICA');
  esIgual('medios magneticos es exogena',
          IMPUESTO_CALENDARIO['MEDIOS MAGNETICOS'], 'EXOGENA');

  // las filas de descuento no son obligaciones aparte
  esIgual('la fila sin descuento entra', DESCUENTOS_QUE_ENTRAN.indexOf('') >= 0, true);
  esIgual('la de fecha limite entra',
          DESCUENTOS_QUE_ENTRAN.indexOf('FECHA LIMITE') >= 0, true);
  esIgual('la de descuento no entra',
          DESCUENTOS_QUE_ENTRAN.indexOf('DESCUENTO 10%') >= 0, false);
}
