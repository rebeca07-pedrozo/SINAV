// AUTOGENERADO por build.js a partir de src/*.gs.
// No editar a mano: edita src/ y corre `npm run build`.

// ═════ 00_Constantes.gs ═════

/** SINAV · constantes y esquemas. Nada de esto se ejecuta al cargar. */

var TZ = 'America/Bogota';
var ETIQUETA = 'SINAV';
var CUOTA_DIARIA = 1500;      // destinatarios por persona por dia
var CARPETA_RAIZ = 'SINAV';
var SEGUNDOS_MAX = 270;       // 4m30s del limite de 6 minutos

/**
 * Cuantos archivos puede llevar un envio. Gmail corta en 25 MB en total, asi
 * que el tope de verdad es el peso, no la cantidad; esto es para que nadie
 * suba cuarenta por error.
 */
/**
 * Lo que tiene que pesar un adjunto para contar como evidencia. Por debajo
 * suelen ser firmas y logos incrustados, no documentos. Bajo a proposito: un
 * PDF de una pagina ronda los 10 KB, pero en una prueba puede ser menor.
 */
var MINIMO_ADJUNTO = 512;

var MAX_SOPORTES = 10;
var MAX_ADJUNTO_MB = 24;

/** Para escribir fechas en mensajes, sin depender del locale del servidor. */
var NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
                  'diciembre'];

var HOJA = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  ROLES: 'ROLES',
  VIGENCIAS: 'VIGENCIAS',
  AUSENCIAS: 'AUSENCIAS',
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
  // 'backup' al final: a quien le pasan sus obligaciones cuando se ausenta.
  // Se escribe en la hoja y manda sobre los pares de abajo, para que no haya
  // que tocar codigo cuando cambie alguien del equipo.
  USUARIOS: ['correo', 'nombre', 'rol', 'activo', 'area', 'nivel', 'backup'],
  ROLES: ['rol', 'quien_lo_tiene', 'que_puede_hacer'],
  // REQ-009 y REQ-011. Una fila por vigencia fiscal, con los ids REALES de
  // Drive. Los ids se escriben una vez y no se vuelven a tocar: si alguna vez
  // quedan vacios, la vigencia se marca sin carpetas en vez de crear otras.
  VIGENCIAS: ['vigencia', 'carpeta_exogenas', 'carpeta_declaraciones',
              'carpeta_soportes', 'carpeta_sellados', 'carpeta_sellados_soportes',
              'activa'],
  // REQ-010. Una fila por ausencia. No se borran: son la trazabilidad de por
  // que una obligacion cambio de manos y cuando volvio.
  AUSENCIAS: ['id', 'correo_ausente', 'desde', 'hasta', 'correo_backup',
              'estado', 'movidas', 'registrada_por', 'registrada_el',
              'cerrada_el', 'nota'],
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
    // REQ-010. Mientras alguien cubre a otro, aqui queda a quien hay que
    // devolverle la obligacion cuando termine la ausencia. Vacio = nadie la
    // esta cubriendo. La asignacion ORIGINAL nunca se sobrescribe.
    'titular_original',
    // El ultimo mensaje del hilo que ya se proceso. Sin esto, cada revision
    // volveria a guardar el mismo adjunto una y otra vez.
    'ultimo_mensaje',
    // El soporte que alguien MIRO y dio por bueno. Guarda el soporte_id, no un
    // SI/NO: si se reemplaza el archivo, deja de coincidir y hay que volver a
    // revisarlo. Un visto bueno vale para el documento que se vio, no para
    // siempre.
    'soporte_revisado',
    // Bogota tiene varias entidades (Banco Davivienda, Corporacion Financiera...).
    // Vacio = Banco Davivienda, que es el caso normal.
    'entidad',
    // --- lo que se agrego despues va SIEMPRE aqui abajo, nunca en la mitad:
    // asegurarHojas() reescribe la fila 1 sin mover los datos, y una columna
    // insertada en medio desalinea todo lo que ya esta escrito.
    //
    // El envio FISICO por correspondencia interna, que no es lo mismo que el
    // correo: 'fecha_envio' la escribe SINAV cuando sale el correo,
    // 'fecha_despacho' la escribe la persona y es cuando se despacho el sobre.
    'fecha_despacho',
    // El numero del adhesivo de correspondencia (55285303). Es por municipio,
    // impuesto y MES: cambia en cada periodo, por eso vive en la obligacion y
    // no en PROGRAMACION.
    'adhesivo',
    // El consecutivo de giro del pago (LR-09-74). Va en el asunto y en el
    // cuerpo del correo.
    'consecutivo_giro'
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

/**
 * REQ-010. Los backups acordados por el equipo. Se cubren entre si.
 *
 * Esto es solo el RESPALDO: lo que manda es la columna 'backup' de USUARIOS,
 * que se edita en la hoja. Aqui estan los pares por si esa columna esta vacia.
 *
 * Cada lado lleva VARIAS claves —nombre y apellido— porque la persona puede
 * no llamarse como uno espera: el par de Andrea se escribio como 'liliana' y
 * la profesional resulto ser Yasneidy Ramirez, asi que nadie tenia backup.
 * Con el apellido ahi, el emparejamiento sobrevive a ese tipo de cambio.
 *
 * Elizabeth no tiene backup: cuando ella falta, cada quien se encarga de lo
 * suyo, que es otro asunto (REQ-013).
 */
var BACKUPS = [
  { a: ['jesus', 'jaimes'], b: ['helen', 'cuadros'] },
  { a: ['andrea', 'galvis'], b: ['liliana', 'yasneidy', 'ramirez'] }
];

/** Los estados de una ausencia. */
var AUSENCIA = {
  PROGRAMADA: 'PROGRAMADA',   // registrada, todavia no empieza
  ACTIVA: 'ACTIVA',           // el backup tiene las obligaciones
  TERMINADA: 'TERMINADA',     // ya se devolvieron
  CANCELADA: 'CANCELADA'
};

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
  ['dias_aviso', '7,4,2,0'],
  // Lo que es igual en todos los correos. Si cambia, se cambia aqui una vez.
  ['egreso', '25'],
  ['codigo_departamento', '9413'],
  ['nombre_recibe', 'Liliana Ramirez'],
  // Siempre en copia, en todos los envios. Si entra o sale alguien del
  // equipo, se cambia aqui y ya.
  ['copias_fijas', [
    'merodriguez@davivienda.com',
    'grpconceptosespeciales@davivienda.com',
    'sptellez@davivienda.com',
    'egomezg@davivienda.com',
    'yasneidy.ramirez@davivienda.com',
    'jesus.jaimes@davivienda.com',
    'helen.cuadros@davivienda.com'
  ].join(',')],
  // El consecutivo de giro respeta el prefijo que tienen definido, porque es
  // con el que concilia revisoria. SI = usa las iniciales de quien envia.
  ['giro_sigue_al_remitente', 'NO'],
  ['dominio_oficinas', 'davivienda.com'],
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
    .addItem('¿Por qué no se envía?', 'porQueNoSeEnviaDesdeMenu')
    .addItem('¿Por qué no ve la respuesta?', 'porQueNoVeLaRespuestaDesdeMenu')
    .addSeparator()
    .addItem('Revisar antes de producción', 'revisarAntesDeProduccionDesdeMenu')
    .addItem('PASAR A PRODUCCIÓN', 'pasarAProduccionDesdeMenu')
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
  if (typeof menuMensuales === 'function') {
    try { menuMensuales(); } catch (e) { /* idem */ }
  }
  if (typeof menuConcepto25 === 'function') {
    try { menuConcepto25(); } catch (e) { /* idem */ }
  }
  if (typeof menuArranque === 'function') {
    try { menuArranque(); } catch (e) { /* idem */ }
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

      // REQ-010: rellena el backup de quien no lo tenga, con los pares del
      // codigo. Lo que ya este escrito no se toca: la hoja manda.
      if ('backup' in ixu && !String(fu[i][ixu.backup] || '').trim() &&
          rol === ROL.PROFESIONAL) {
        try {
          var b = backupDe(String(fu[i][ixu.correo]).trim().toLowerCase());
          if (b) cambios.backup = b;
        } catch (e) { /* si USUARIOS aun no esta lista, se hace en la siguiente */ }
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

function porQueNoSeEnviaDesdeMenu() {
  SpreadsheetApp.getUi().alert('SINAV · ¿por qué no se envía?', porQueNoSeEnvia(),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}

function revisarAntesDeProduccionDesdeMenu() {
  SpreadsheetApp.getUi().alert('SINAV · antes de producción',
                               revisarAntesDeProduccion(),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Pasar a produccion manda correos de verdad a las alcaldias, asi que se
 * pregunta dos veces: primero se muestra lo que esta a punto de salir.
 */
function pasarAProduccionDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('SINAV · pasar a PRODUCCIÓN',
    revisarAntesDeProduccion() +
    '\n\n¿Pasar a PRODUCCIÓN? Desde ese momento los correos salen a las ' +
    'alcaldías de verdad.',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) {
    ui.alert('Sigue en PRUEBA. No se cambió nada.');
    return;
  }
  try {
    ui.alert('SINAV', pasarAProduccion(), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('SINAV · no se pasó a producción', String(e.message || e), ui.ButtonSet.OK);
  }
}

function porQueNoVeLaRespuestaDesdeMenu() {
  SpreadsheetApp.getUi().alert('SINAV · ¿por qué no ve la respuesta?',
                               porQueNoVeLaRespuesta(),
                               SpreadsheetApp.getUi().ButtonSet.OK);
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

/**
 * Corta con un mensaje util si a la hoja le falta una columna.
 *
 * Sin esto, escribir en una columna que no existe da «La columna inicial del
 * intervalo es demasiado pequena», que no dice ni que columna ni que hacer.
 * Pasa siempre por lo mismo: se pego codigo nuevo y no se corrio instalar().
 */
function exigeColumna(ix, nombre, hojaNombre) {
  if (ix && typeof ix[nombre] === 'number') return ix[nombre];
  throw new Error('A la hoja ' + (hojaNombre || HOJA.OBLIGACIONES) +
    ' le falta la columna «' + nombre + '».\n\n' +
    'Corre SINAV → Instalar / verificar: crea las columnas que falten sin ' +
    'tocar los datos que ya están escritos.');
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

  // UNA FECHA. Pasa cuando la columna del codigo quedo con formato de fecha:
  // la hoja guarda 54001 pero devuelve «Mon Apr 05 2049», y entonces el DANE
  // del municipio se vuelve una fecha y el id de la obligacion con el. Se
  // deshace la conversion: el numero de serie de la hoja ES el codigo.
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    var serie = diasDesdeElOrigen(v);
    if (serie <= 0) return '';
    var t = String(serie);
    if (ancho) while (t.length < ancho) t = '0' + t;
    return t;
  }

  var s = String(v).trim();
  if (s.indexOf('E+') > 0 || s.indexOf('e+') > 0) s = Number(s).toFixed(0);
  s = s.replace(/\.0+$/, '');
  if (ancho && /^[0-9]+$/.test(s)) while (s.length < ancho) s = '0' + s;
  return s;
}

/**
 * El numero de serie que la hoja de calculo guarda detras de una fecha: los
 * dias desde el 30 de diciembre de 1899. Se cuenta con las piezas locales de
 * la fecha, no con getTime(), para que el huso horario no corra un dia.
 */
function diasDesdeElOrigen(d) {
  var utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  var origen = Date.UTC(1899, 11, 30);
  return Math.round((utc - origen) / 86400000);
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
  // vale el correo escrito a mano, o la dependencia: de ella se arman
  // director<dep>@ y subdirector<dep>@, que es el patron del banco
  if (!normCorreos(f.correo_oficina) &&
      !String(f.cod_oficina || '').trim().replace(/^0+/, '')) {
    return { ok: false, motivo: 'sin correo ni dependencia' };
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
    // el envio fisico por correspondencia, que el correo necesita nombrar
    fecha_despacho: fechaTexto(o.fecha_despacho),
    adhesivo: String(o.adhesivo || ''),
    consecutivo_giro: String(o.consecutivo_giro || ''),
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
    // REQ-010. Si esta lleno, esta obligacion es de otro y yo solo la estoy
    // cubriendo mientras esta de vacaciones.
    titular_original: String(o.titular_original || ''),
    cubriendo: !!String(o.titular_original || '').trim(),
    soportes: listaSoportes(o.soporte_id).length,
    // lo que hay que digitalizar antes de que el correo tenga sentido
    falta_correo: faltaParaElCorreo(o),
    sellados: listaIds(o.sellado_id).length,
    soporte_revisado: soporteRevisado(o),
    enviable: env.ok,
    motivo_no_enviable: env.motivo,
    nivel: nivel
  };
}

/**
 * LA VENTANA DE TRABAJO
 *
 * El libro tiene el ano entero: mas de seis mil obligaciones. Decorarlas todas
 * y mandarlas al navegador en cada pantalla es lo que la ponia lenta, y ademas
 * llenaba la lista de vencimientos de hace meses que nadie va a trabajar hoy.
 *
 * Asi que se filtra ANTES de decorar, que es la parte cara. El filtro se hace
 * sobre la fecha cruda de la hoja, sin construir el objeto de la interfaz.
 *
 *   'mes'       lo que vence este mes                      <- por defecto
 *   'proximo'   este mes y el siguiente
 *   'vencidas'  lo que ya vencio y sigue abierto
 *   'abiertas'  todo lo que no esta APROBADA
 *   'todo'      el ano entero, para cuando de verdad haga falta
 */
var VENTANA_POR_DEFECTO = 'mes';

/** Primer y ultimo dia del mes de una fecha, en zona Bogota. */
function limitesDelMes(desplazamiento) {
  var hoy = new Date();
  var a = Number(Utilities.formatDate(hoy, TZ, 'yyyy'));
  var m = Number(Utilities.formatDate(hoy, TZ, 'MM')) + (desplazamiento || 0);
  while (m > 12) { m -= 12; a++; }
  while (m < 1) { m += 12; a--; }
  return { desde: new Date(a, m - 1, 1), hasta: new Date(a, m, 0, 23, 59, 59) };
}

/** True si esta fila cruda entra en la ventana. No decora nada. */
function entraEnVentana(o, ventana) {
  var est = String(o.estado || '').toUpperCase();
  if (ventana === 'todo') return true;
  if (ventana === 'abiertas') return est !== ESTADO.APROBADA;

  var v = o.vencimiento instanceof Date ? o.vencimiento : new Date(o.vencimiento);
  if (isNaN(v.getTime())) return true;          // sin fecha: siempre se ve

  if (ventana === 'vencidas') {
    return est !== ESTADO.APROBADA && v < limitesDelMes(0).desde;
  }
  var lim = limitesDelMes(0);
  var hasta = ventana === 'proximo' ? limitesDelMes(1).hasta : lim.hasta;
  return v >= lim.desde && v <= hasta;
}

/**
 * Las obligaciones de la ventana, decoradas.
 * Sin ventana se usa la de por defecto: el mes en curso.
 */
function listarTodas(ventana) {
  var v = ventana || VENTANA_POR_DEFECTO;
  return registros(HOJA.OBLIGACIONES)
    .filter(function (o) {
      return String(o.id || '').trim() && entraEnVentana(o, v);
    })
    .map(decorar);
}

/** Cuantas hay en cada ventana, sin decorar ninguna. Es barato. */
function conteosDeVentana() {
  var todas = registros(HOJA.OBLIGACIONES)
    .filter(function (o) { return String(o.id || '').trim(); });
  var mio = puede('editarAjenas') ? null : yo().correo;
  var mias = mio
    ? todas.filter(function (o) {
        return String(o.responsable || '').trim().toLowerCase() === mio;
      })
    : todas;

  return {
    mes: mias.filter(function (o) { return entraEnVentana(o, 'mes'); }).length,
    proximo: mias.filter(function (o) { return entraEnVentana(o, 'proximo'); }).length,
    vencidas: mias.filter(function (o) { return entraEnVentana(o, 'vencidas'); }).length,
    abiertas: mias.filter(function (o) { return entraEnVentana(o, 'abiertas'); }).length,
    todo: mias.length
  };
}

/**
 * La pestana ENVIAR: solo requiere_envio = SI y estados por enviar.
 * El PROFESIONAL ve las suyas; JEFE y ADMIN ven las de todos.
 * Orden: lo que mas aprieta arriba.
 */
function listarParaEnviar(ventana) {
  var todas = puede('asignar') ? listarTodas(ventana)
            : listarTodas(ventana).filter(function (o) { return o.mia; });

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
  // REQ-010: lo que estaba cubierto y ya termino vuelve a su titular antes de
  // que nadie mire la lista. Es barato y evita tener que programar un
  // disparador para algo que solo importa justo antes de abrir la pantalla.
  try { cerrarAusenciasVencidas(); } catch (e) { /* no es critico */ }

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

  var ventana = VENTANA_POR_DEFECTO;
  var lista = listarParaEnviar(ventana);
  return {
    yo: q,
    ventana: ventana,
    ventanas: conteosDeVentana(),
    config: {
      modo: config('modo'),
      nombre_remitente: config('nombre_remitente'),
      dias_aviso: config('dias_aviso')
    },
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    filas: lista,
    conteos: conteos(lista),
    // la digitalizacion se hace dentro de Enviar, asi que las definiciones
    // tienen que venir en la PRIMERA carga, no solo al refrescar la lista
    campos: apiCamposOpciones(),
    orden_campos: camposDelCorreo(),
    generado: fechaHoraTexto(new Date())
  };
}

/** Refresca solo la lista de ENVIAR, en la ventana que pida el cliente. */
function apiListaEnviar(ventana) {
  var v = ventana || VENTANA_POR_DEFECTO;
  var lista = listarParaEnviar(v);
  return {
    ventana: v,
    ventanas: conteosDeVentana(),
    filas: lista,
    conteos: conteos(lista),
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    // la digitalizacion vive dentro de esta pantalla: se llena justo antes de
    // enviar, que es cuando la persona tiene los datos delante
    campos: apiCamposOpciones(),
    orden_campos: camposDelCorreo(),
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

/* El asunto y el cuerpo del correo viven en 23_Correo.gs: no son mecanica de
   envio, son una instruccion de trabajo para la oficina. */

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
    // la revision se comprueba aqui tambien, en el servidor: que el boton
    // este apagado no basta, una llamada directa a la API tiene que fallar
    var ok = puedeEnviar(o);
    if (ok.ok && !soporteRevisado(o)) {
      ok = { ok: false, motivo: 'falta revisar el soporte' };
    }
    if (!ok.ok) {
      rechazadas.push({ id: id, motivo: ok.motivo });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'envío rechazado: ' + ok.motivo });
      continue;
    }

    var destinos = modo === 'PRUEBA' ? miCorreo : destinatariosDe(o);
    var copias = modo === 'PRUEBA' ? '' : copiasFijas();
    var cuantos = destinos.split(',').length +
                  (copias ? copias.split(',').length : 0);

    if (cuotaUsada() + cuantos > CUOTA_DIARIA) {
      pendientes = ids.slice(i).map(String);
      rechazadas.push({ id: id,
        motivo: 'se agotó tu cuota diaria de ' + CUOTA_DIARIA + ' destinatarios' });
      break;
    }

    // el consecutivo de giro se toma AQUI, no antes: si se asignara al
    // digitalizar, una obligacion que luego no se manda dejaria un hueco en
    // la numeracion
    if (!String(o.consecutivo_giro || '').trim()) {
      try {
        var giro = giroPara(o, yo().nombre);
        if (giro) {
          o.consecutivo_giro = giro;
          escribirCampos(HOJA.OBLIGACIONES, buscarFila(o.id),
                         { consecutivo_giro: giro });
        }
      } catch (e) {
        registrar(id, EVENTO.ERROR, 'no se pudo asignar el consecutivo: ' + e.message);
      }
    }

    try {
      // todos los soportes de la obligacion: la declaracion y sus anexos
      var adjuntos = [], bytes = 0;
      listaSoportes(o.soporte_id).forEach(function (sid) {
        var f = DriveApp.getFileById(sid);
        bytes += f.getSize();
        adjuntos.push(f.getBlob());
      });
      if (!adjuntos.length) throw new Error('no se pudo abrir ningún soporte en Drive');
      if (bytes > MAX_ADJUNTO_MB * 1024 * 1024) {
        throw new Error('los adjuntos pesan ' + Math.round(bytes / 1024 / 1024) +
          ' MB y Gmail corta en 25 MB. Junta los archivos en uno más liviano.');
      }

      var opciones = {
        name: remitente,
        attachments: adjuntos,
        htmlBody: cuerpoHtmlOficina(o, modo)
      };
      if (copias) opciones.cc = copias;
      var logo = blobDelLogo();
      if (logo) opciones.inlineImages = { logo: logo };

      GmailApp.sendEmail(destinos, asuntoOficina(o), cuerpoOficina(o, modo), opciones);
      sumarCuota(cuantos);

      var hilo = hiloDelEnvio(o.id);
      var idFila = o.id;

      conCerrojo(function () {
        escribirCampos(HOJA.OBLIGACIONES, buscarFila(idFila), {
          estado: ESTADO.ENVIADA,
          // el despacho es el dia en que sale el correo: no hay que escribirlo
          fecha_despacho: hoy(),
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

/* ---------------------------------------------------------------------------
   DIAGNOSTICO

   Cuando una fila no se deja enviar, el motivo lo sabe el servidor pero no
   siempre es evidente en la pantalla. Esto lo escribe en claro.
   --------------------------------------------------------------------------- */

/**
 * Lista las obligaciones que YA tienen soporte y dice, una por una, por que
 * no se pueden enviar. Se corre desde el menu SINAV, o desde el editor.
 */
function porQueNoSeEnvia() {
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var conSoporte = 0, listas = 0, motivos = {}, ejemplos = {};

  todas.forEach(function (f) {
    if (!String(f[ix.soporte_id] || '').trim()) return;
    conSoporte++;

    var o = {
      estado: f[ix.estado],
      soporte_id: f[ix.soporte_id],
      soporte_revisado: f[ix.soporte_revisado],
      requiere_envio: f[ix.requiere_envio],
      correo_oficina: f[ix.correo_oficina]
    };
    var e = puedeEnviar(o);
    var clave = e.ok
      ? (soporteRevisado(o) ? 'LISTAS PARA ENVIAR' : 'listas, se revisan al enviar')
      : e.motivo;
    if (e.ok) listas++;

    motivos[clave] = (motivos[clave] || 0) + 1;
    if (!ejemplos[clave]) {
      ejemplos[clave] = String(f[ix.municipio]) + ' · ' + String(f[ix.impuesto]) +
                        ' · ' + String(f[ix.periodo]);
    }
  });

  var lineas = [conSoporte + ' obligaciones tienen soporte cargado.', ''];
  if (!conSoporte) {
    lineas.push('Ninguna tiene soporte todavía, así que no hay nada que enviar.');
  }
  Object.keys(motivos).sort().forEach(function (k) {
    lineas.push(motivos[k] + '  ' + k);
    lineas.push('      p.ej. ' + ejemplos[k]);
  });

  if (motivos['sin correo ni dependencia']) {
    lineas.push('', 'Esas no tienen a quién mandarse. El correo sale de dos sitios: ' +
      'de correo_oficina si está escrito, y si no, de la dependencia ' +
      '(cod_oficina), con la que se arman director<dep>@ y subdirector<dep>@. ' +
      'Sin ninguno de los dos no hay destinatario: escribe el código de ' +
      'dependencia en PROGRAMACION y corre «Refrescar los correos de oficina».');
  }

  var txt = lineas.join('\n');
  Logger.log(txt);
  return txt;
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


// ═════ 11_Respuestas.gs ═════

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
 * Decide si un mensaje del hilo cuenta como respuesta.
 *
 * La regla de antes era "lo mio no cuenta", y estaba mal planteada: el unico
 * mensaje que hay que descartar siempre es EL QUE MANDO SINAV, que es el
 * primero del hilo. Lo que venga despues es respuesta, venga de quien venga.
 *
 * De los mios se pide una condicion mas: que traigan adjunto. Asi un
 * recordatorio que yo escriba sobre el hilo no marca la obligacion como
 * respondida, pero el sellado que yo mismo reenvie —porque la alcaldia me lo
 * paso por otro lado— si queda archivado, que es lo que importa.
 *
 * El modo ya no cambia nada: en PRUEBA el correo se manda a la propia bandeja
 * y la respuesta tambien es propia, y con esta regla eso funciona solo.
 */
function cuentaComoRespuesta(mensaje, indice, miCorreo, modo) {
  if (indice === 0) return false;                // el que salio de SINAV
  if (!esMiMensaje(mensaje, miCorreo)) return true;
  return tieneAdjuntoUtil(mensaje);
}

/** Trae algo que valga como evidencia, no la firma ni un logo incrustado. */
function tieneAdjuntoUtil(mensaje) {
  try {
    var adj = mensaje.getAttachments();
    for (var i = 0; i < adj.length; i++) {
      if (adj[i].getSize() >= MINIMO_ADJUNTO) return true;
    }
  } catch (e) { /* si no se puede leer, no cuenta */ }
  return false;
}

/**
 * Revisa el hilo de una obligacion y recoge lo que haya llegado.
 * Devuelve lo que encontro, sin escribir en la hoja: quien escribe es
 * revisarRespuestas(), que agrupa.
 */
function leerHilo(o, miCorreo, modo) {
  var hilo;
  try {
    hilo = GmailApp.getThreadById(String(o.hilo_id).trim());
  } catch (e) {
    return { error: 'no se pudo abrir el hilo (' + e.message + ')', ajeno: true };
  }
  if (!hilo) return { error: 'el hilo no está en tu bandeja', ajeno: true };

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
    if (!cuentaComoRespuesta(m, j, miCorreo, modo)) continue;

    nuevos.push(m);
    fecha = m.getDate();
    de = String(m.getFrom() || '');
    m.getAttachments().forEach(function (a) {
      // las firmas y los logos incrustados no son el sellado. El minimo es
      // bajo a proposito: un PDF de una pagina ronda los 10 KB, pero en una
      // prueba puede ser mucho mas pequeno y tiene que verse igual.
      if (a.getSize() < MINIMO_ADJUNTO) return;
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
  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = registros(HOJA.OBLIGACIONES).filter(function (o) {
    if (!String(o.id || '').trim()) return false;
    if (!String(o.hilo_id || '').trim()) return false;
    if (estadosEsperanRespuesta().indexOf(String(o.estado).toUpperCase()) < 0) return false;

    // El hilo esta en la bandeja de QUIEN ENVIO, que no siempre es el
    // responsable: un PROFESIONAL-III puede enviar las de otro. Por eso el
    // supervisor mira todas las que tengan hilo, y Gmail se encarga del resto:
    // un hilo que no este en su bandeja simplemente no aparece.
    if (puede('enviarAjenas')) return true;
    return String(o.responsable || '').trim().toLowerCase() === q.correo;
  });

  var conRespuesta = 0, conSellado = 0, errores = [], pendientes = 0;

  for (var i = 0; i < todas.length; i++) {
    if ((new Date().getTime() - arranque) / 1000 > SEGUNDOS_MAX) {
      pendientes = todas.length - i;
      break;
    }
    var o = todas[i];
    var r = leerHilo(o, q.correo, modo);

    if (r.error) {
      // que un hilo no este en MI bandeja es lo normal cuando reviso las de
      // otro: no es un fallo, solo que no me toca a mi. No se registra ni se
      // reporta, o el resumen se llenaria de ruido.
      if (!r.ajeno) {
        registrar(o.id, EVENTO.ERROR, 'revisión del hilo: ' + r.error);
        errores.push(o.municipio + ' ' + o.impuesto + ': ' + r.error);
      }
      continue;
    }
    if (!r.respuestas && r.ultimo === String(o.ultimo_mensaje || '').trim()) continue;

    var campos = { ultimo_mensaje: r.ultimo };

    // Los adjuntos van a Sellados, en la carpeta del municipio y el impuesto.
    // TODOS los que vengan, y se SUMAN a los que ya hubiera: la oficina puede
    // mandar primero una queja sin nada, luego el sellado, y mas tarde el
    // recibo de pago en otro correo del mismo hilo. Cada uno es evidencia.
    var guardados = [];
    if (r.adjuntos.length) {
      var yaHabia = listaIds(o.sellado_id);
      try {
        var dir = carpetaSellado(o.vigencia, o.municipio, o.impuesto);
        var base = (o.municipio + ' ' + o.impuesto + ' ' + o.periodo + ' sellado')
          .replace(/[\\/:*?"<>|]/g, '-');
        for (var k = 0; k < r.adjuntos.length; k++) {
          var a = r.adjuntos[k];
          var ext = a.getName().indexOf('.') > 0
            ? a.getName().slice(a.getName().lastIndexOf('.')) : '';
          var cuantos = yaHabia.length + guardados.length;
          var nombre = base + (cuantos ? ' ' + (cuantos + 1) : '') + ext;
          guardados.push(dir.createFile(a.copyBlob().setName(nombre)));
        }
        campos.sellado_id = yaHabia.concat(guardados.map(function (f) {
          return f.getId();
        })).join(',');
        conSellado += guardados.length;
      } catch (e) {
        registrar(o.id, EVENTO.ERROR, 'no se pudo guardar el sellado: ' + e.message);
        errores.push(o.municipio + ' ' + o.impuesto + ': ' + e.message);
        if (guardados.length) {
          campos.sellado_id = yaHabia.concat(guardados.map(function (f) {
            return f.getId();
          })).join(',');
        }
      }
    }

    if (r.respuestas) {
      conRespuesta++;
      if (!o.fecha_respuesta && r.fecha) campos.fecha_respuesta = r.fecha;
      escribirCampos(HOJA.OBLIGACIONES, o._fila, campos);
      registrar(o.id, EVENTO.RESPONDIDA,
        r.respuestas + ' mensaje(s) de ' + r.de +
        (guardados.length
          ? ' · ' + guardados.length + ' adjunto(s) guardado(s): ' +
            guardados.map(function (f) { return f.getName(); }).join(', ')
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
  var cuales = o ? listaIds(o.sellado_id) : [];
  if (!cuales.length) {
    throw new Error('Esa obligación todavía no tiene sellado.');
  }
  exigeMia(o.responsable, 'editarAjenas');
  // si guardaron varios, se abre el primero; los demas estan en la misma
  // carpeta de Sellados, y el hilo de Gmail los tiene todos
  return 'https://drive.google.com/file/d/' + cuales[0] + '/view';
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

/* ---------------------------------------------------------------------------
   DIAGNOSTICO

   «Respondi y no lo ve» tiene media docena de causas distintas y ninguna se
   nota desde la pantalla. Esto las enseña todas de una vez.
   --------------------------------------------------------------------------- */

/**
 * Cuenta, mensaje por mensaje, que esta viendo SINAV en el hilo de una
 * obligacion y por que descarta lo que descarta.
 *
 *   porQueNoVeLaRespuesta()                  la primera ENVIADA que encuentre
 *   porQueNoVeLaRespuesta('13001|ICA|...')   una concreta
 */
function porQueNoVeLaRespuesta(idObligacion) {
  var q = yo();
  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  var todas = registros(HOJA.OBLIGACIONES);

  var o = String(idObligacion || '').trim()
    ? todas.filter(function (r) { return String(r.id) === String(idObligacion).trim(); })[0]
    : todas.filter(function (r) {
        return String(r.hilo_id || '').trim() &&
               estadosEsperanRespuesta().indexOf(String(r.estado).toUpperCase()) >= 0;
      })[0];

  if (!o) {
    return 'No encontré ninguna obligación enviada con hilo guardado.\n' +
           'Pásame el id: porQueNoVeLaRespuesta("13001|ICA|GENERAL|2026-B6")';
  }

  var l = [
    o.municipio + ' · ' + o.impuesto + ' · ' + o.periodo,
    'Estado: ' + o.estado + '   ·   Modo: ' + modo,
    'Tu cuenta: ' + q.correo,
    ''
  ];

  if (!String(o.hilo_id || '').trim()) {
    l.push('NO TIENE hilo_id. Al enviar no se encontró el hilo en tus enviados,');
    l.push('así que la respuesta no se puede asociar sola. Busca un ERROR en');
    l.push('EVENTOS con esta obligación.');
    return avisoDiagnostico(l);
  }
  if (estadosEsperanRespuesta().indexOf(String(o.estado).toUpperCase()) < 0) {
    l.push('El estado ' + o.estado + ' ya no mira el hilo. Solo se revisan ' +
           estadosEsperanRespuesta().join(', ') + '.');
    return avisoDiagnostico(l);
  }

  var hilo;
  try {
    hilo = GmailApp.getThreadById(String(o.hilo_id).trim());
  } catch (e) {
    l.push('El hilo ' + o.hilo_id + ' no abre desde tu cuenta: ' + e.message);
    l.push('Si lo envió otra persona, el hilo está en SU bandeja, no en la tuya.');
    return avisoDiagnostico(l);
  }
  if (!hilo) {
    l.push('El hilo ' + o.hilo_id + ' no está en tu bandeja.');
    return avisoDiagnostico(l);
  }

  var mensajes = hilo.getMessages();
  var visto = String(o.ultimo_mensaje || '').trim();
  l.push('El hilo tiene ' + mensajes.length + ' mensaje(s).');
  l.push(visto ? 'Ya se procesó hasta el mensaje ' + visto : 'No se ha procesado ninguno.');
  l.push('');

  var procesado = !visto;
  var cuentan = 0, conAdjunto = 0;

  for (var i = 0; i < mensajes.length; i++) {
    var m = mensajes[i];
    var de = String(m.getFrom() || '');
    var nuevo = procesado;
    if (visto && m.getId() === visto) procesado = true;

    var vale = cuentaComoRespuesta(m, i, q.correo, modo);
    var adj = m.getAttachments().filter(function (a) {
      return a.getSize() >= MINIMO_ADJUNTO;
    });

    var por = [];
    if (!nuevo) por.push('ya procesado antes');
    if (!vale) {
      por.push(i === 0
        ? 'es el primero del hilo, el que mandó SINAV'
        : 'salió de tu cuenta y no trae ningún adjunto');
    }
    if (nuevo && vale) { cuentan++; conAdjunto += adj.length; }

    l.push((i + 1) + '. de ' + de);
    l.push('   ' + (nuevo && vale ? 'CUENTA' : 'se descarta: ' + por.join(' y ')));
    l.push('   adjuntos útiles: ' + adj.length +
           (adj.length ? ' (' + adj.map(function (a) {
             return a.getName() + ' ' + Math.round(a.getSize() / 1024) + ' KB';
           }).join(', ') + ')' : ''));
  }

  l.push('');
  if (cuentan) {
    l.push('Hay ' + cuentan + ' mensaje(s) sin procesar que SÍ cuentan, con ' +
           conAdjunto + ' adjunto(s).');
    l.push('Dale a «Revisar respuestas ahora» y deberían entrar.');
  } else {
    l.push('No hay mensajes nuevos que contar.');
  }
  return avisoDiagnostico(l);
}

function avisoDiagnostico(lineas) {
  var txt = lineas.join('\n');
  Logger.log(txt);
  return txt;
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

  // 'abiertas' y no 'mes': una alerta tiene que incluir lo ya vencido que
  // sigue sin cerrar, que es justo lo que no se puede dejar pasar.
  var mias = puede('asignar') ? listarTodas('abiertas')
           : listarTodas('abiertas').filter(function (o) { return o.mia; });

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
  // Solo el valor. Todo lo demas esta definido en los datos y no se vuelve a
  // preguntar: quien paga, la forma de pago y el tipo de presentacion los
  // carga Concepto25.gs; el adhesivo, repartirAdhesivos(); el consecutivo
  // sale de la tabla de conceptos; y la fecha de despacho la pone el envio.
  return ['valor'];
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
  return ['valor', 'adhesivo'];
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

  // El codigo del municipio. Se aceptan los dos que existen:
  //   5 digitos -> codigo DANE, que es lo que trae el calendario y lo que
  //                tienen TODAS las obligaciones cargadas
  //   3 o 4     -> codigo de oficina, que solo tienen algunas
  // Se descartan los anios y el periodo que ya se leyo, para no confundirlos.
  var dane = '', oficina = '';
  var grupos = limpio.match(/\d{3,5}/g) || [];
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    if (/^(19|20)\d{2}$/.test(g)) continue;              // es un anio
    if (periodo && periodo.indexOf(g) === 0) continue;    // es el periodo
    if (g.length === 5 && !dane) dane = g;
    else if (g.length <= 4 && !oficina) oficina = normCodigo(g, 4);
  }

  return { cod_dane: dane, cod_oficina: oficina, impuesto: impuesto,
           periodo: periodo, nombre: s };
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

  // El DANE manda: lo tienen todas. El codigo de oficina es el respaldo.
  var porCodigo = cs;
  if (leido.cod_dane) {
    porCodigo = cs.filter(function (o) {
      return String(o.cod_dane) === leido.cod_dane;
    });
  } else if (leido.cod_oficina) {
    porCodigo = cs.filter(function (o) {
      return String(o.cod_oficina) === leido.cod_oficina;
    });
  }
  var porOficina = porCodigo;
  var porImpuesto = leido.impuesto
    ? porOficina.filter(function (o) { return String(o.impuesto) === leido.impuesto; })
    : porOficina;

  var ids = porImpuesto.map(function (o) { return o.id; });

  if (ids.length === 1) {
    var faltan = [];
    if (!leido.cod_dane && !leido.cod_oficina) faltan.push('el nombre no trae código de municipio');
    if (!leido.impuesto) faltan.push('el nombre no trae el impuesto');
    return { estado: 'listo', id: ids[0], opciones: ids,
             motivo: faltan.length ? 'Único candidato, aunque ' + faltan.join(' y ') + '.' : '' };
  }

  if (ids.length > 1) {
    return { estado: 'varios', id: '', opciones: ids,
             motivo: ids.length + ' obligaciones encajan. Elige cuál.' };
  }

  var porque = [];
  if (leido.cod_dane && !cs.some(function (o) {
    return String(o.cod_dane) === leido.cod_dane;
  })) {
    porque.push('ninguna obligación del periodo tiene el código DANE ' + leido.cod_dane);
  }
  if (!leido.cod_dane && leido.cod_oficina && !cs.some(function (o) {
    return String(o.cod_oficina) === leido.cod_oficina;
  })) {
    porque.push('ninguna obligación del periodo tiene la oficina ' + leido.cod_oficina);
  }
  if (leido.impuesto && porOficina.length && !porImpuesto.length) {
    porque.push('ninguna es de ' + leido.impuesto);
  }
  if (!leido.cod_dane && !leido.cod_oficina && !leido.impuesto) {
    porque.push('del nombre no se pudo leer ni el código del municipio ni el impuesto');
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

  // las metricas son agregadas: aqui si hace falta el ano entero
  var todas = listarTodas('todo');
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
        backup: 'backup' in ix ? String(f[ix.backup] || '').trim().toLowerCase() : '',
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

  // 'abiertas': para repartir hay que ver todo lo que sigue sin cerrar,
  // no solo lo del mes en curso.
  var lista = listarTodas('abiertas')
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


// ═════ 20_Ausencias.gs ═════

/**
 * SINAV · ausencias y backups (REQ-010). Solo PROFESIONAL-III y ADMIN.
 *
 * Cuando alguien se va de vacaciones, sus obligaciones que vencen en ese rango
 * pasan temporalmente a su backup. Al terminar la ausencia vuelven solas.
 *
 * Tres cosas que no se negocian:
 *
 *   La asignacion ORIGINAL no se pierde. El responsable pasa a ser el backup,
 *   pero en titular_original queda a quien hay que devolversela. Sin eso, al
 *   volver de vacaciones nadie sabria de quien era cada cosa.
 *
 *   Solo se mueve lo que VENCE dentro del rango. Lo que vence despues sigue
 *   siendo del titular: no esta de vacaciones cuando toque trabajarlo.
 *
 *   La devolucion conserva lo hecho. Si el backup subio el soporte y envio, la
 *   obligacion vuelve con su soporte y su envio: se devuelve la propiedad, no
 *   se deshace el trabajo.
 */

/**
 * Las claves del backup de alguien, segun los pares de respaldo. Pura.
 * Devuelve una lista: el par puede estar escrito por nombre o por apellido.
 * Se busca dentro del correo y tambien del nombre, para que un cambio de
 * persona o de formato de cuenta no deje a nadie sin backup en silencio.
 */
function clavesBackup(correo, nombre) {
  var texto = (String(correo || '').split('@')[0] + ' ' + String(nombre || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!texto.trim()) return [];

  for (var i = 0; i < BACKUPS.length; i++) {
    var par = BACKUPS[i];
    var enA = par.a.some(function (k) { return texto.indexOf(k) >= 0; });
    if (enA) return par.b;
    var enB = par.b.some(function (k) { return texto.indexOf(k) >= 0; });
    if (enB) return par.a;
  }
  return [];
}

/**
 * El correo del backup de alguien. '' si no tiene o no esta inscrito.
 *
 * Manda la columna 'backup' de USUARIOS: es la que el equipo edita cuando
 * alguien entra o sale. Los pares del codigo son solo el respaldo.
 */
function backupDe(correo) {
  var gente = asignables();
  var c = String(correo || '').trim().toLowerCase();
  var quien = gente.filter(function (u) { return u.correo === c; })[0];

  // 1. lo que diga la hoja
  if (quien && quien.backup) {
    var puesto = gente.filter(function (u) { return u.correo === quien.backup; })[0];
    if (puesto) return puesto.correo;
  }

  // 2. los pares del codigo
  var claves = clavesBackup(c, quien ? quien.nombre : '');
  if (!claves.length) return '';
  var pareja = gente.filter(function (u) {
    var texto = (u.correo.split('@')[0] + ' ' + u.nombre)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return claves.some(function (k) { return texto.indexOf(k) >= 0; });
  })[0];
  return pareja ? pareja.correo : '';
}

/** Las ausencias de la hoja, como objetos. */
function ausencias() {
  return registros(HOJA.AUSENCIAS)
    .filter(function (a) { return String(a.id || '').trim(); })
    .map(function (a) {
      a.id = String(a.id).trim();
      a.correo_ausente = String(a.correo_ausente || '').trim().toLowerCase();
      a.correo_backup = String(a.correo_backup || '').trim().toLowerCase();
      a.estado = String(a.estado || '').trim().toUpperCase();
      a.desde_txt = fechaTexto(a.desde);
      a.hasta_txt = fechaTexto(a.hasta);
      a.movidas = Number(a.movidas) || 0;
      return a;
    });
}

/** Las obligaciones de alguien que vencen dentro de un rango. */
function obligacionesEnRango(correo, desde, hasta) {
  var c = String(correo || '').trim().toLowerCase();
  var d = normFecha(desde), h = normFecha(hasta);
  if (!c || !d || !h) return [];

  var finDia = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59);
  var ix = indices(HOJA.OBLIGACIONES);

  return filas(HOJA.OBLIGACIONES).map(function (f, i) {
    return { fila: i + 2, id: String(f[ix.id]).trim(),
             responsable: String(f[ix.responsable] || '').trim().toLowerCase(),
             titular: String(f[ix.titular_original] || '').trim().toLowerCase(),
             estado: String(f[ix.estado] || '').toUpperCase(),
             municipio: String(f[ix.municipio] || ''),
             impuesto: String(f[ix.impuesto] || ''),
             periodo: String(f[ix.periodo] || ''),
             vence: f[ix.vencimiento] };
  }).filter(function (o) {
    if (!o.id || o.responsable !== c) return false;
    if (o.estado === ESTADO.APROBADA) return false;   // cerrada: no se mueve
    var v = o.vence instanceof Date ? o.vence : new Date(o.vence);
    if (isNaN(v.getTime())) return false;
    return v >= d && v <= finDia;
  });
}

/**
 * Lo que la pantalla necesita ANTES de confirmar: a quien se le mueve, a quien
 * le llega y cuantas son. No escribe nada.
 */
function apiPrevisualizarAusencia(correo, desde, hasta) {
  exige('gestionarAusencias');

  var c = normCorreo(correo);
  if (!c) throw new Error('Elige a la persona que estará ausente.');
  var d = normFecha(desde), h = normFecha(hasta);
  if (!d) throw new Error('Falta la fecha de inicio.');
  if (!h) throw new Error('Falta la fecha de finalización.');
  if (h < d) throw new Error('La fecha final es anterior a la inicial.');

  var backup = backupDe(c);
  var persona = asignables().filter(function (u) { return u.correo === c; })[0];
  var elBackup = backup
    ? asignables().filter(function (u) { return u.correo === backup; })[0] : null;

  var afectadas = obligacionesEnRango(c, d, h);
  var porImpuesto = {};
  afectadas.forEach(function (o) {
    porImpuesto[o.impuesto] = (porImpuesto[o.impuesto] || 0) + 1;
  });

  return {
    correo: c,
    nombre: persona ? persona.nombre : c,
    backup: backup,
    nombre_backup: elBackup ? elBackup.nombre : '',
    desde: fechaTexto(d), hasta: fechaTexto(h),
    dias: Math.round((h - d) / 86400000) + 1,
    cuantas: afectadas.length,
    por_impuesto: Object.keys(porImpuesto).sort().map(function (k) {
      return { impuesto: k, cuantas: porImpuesto[k] };
    }),
    ejemplos: afectadas.slice(0, 6).map(function (o) {
      return o.municipio + ' · ' + o.impuesto + ' · vence ' + fechaTexto(o.vence);
    }),
    puede: !!backup && afectadas.length > 0,
    aviso: !backup
      ? 'Esta persona no tiene backup asignado, así que no hay a quién pasarle el trabajo.'
      : (!afectadas.length
          ? 'No tiene ninguna obligación que venza en esas fechas. No hay nada que mover.'
          : '')
  };
}

/** Registra la ausencia y mueve las obligaciones al backup. */
function apiRegistrarAusencia(correo, desde, hasta, nota) {
  exige('gestionarAusencias');

  var p = apiPrevisualizarAusencia(correo, desde, hasta);
  if (!p.backup) throw new Error(p.aviso);
  if (!p.cuantas) throw new Error(p.aviso);

  return conCerrojo(function () {
    var d = normFecha(desde), h = normFecha(hasta);
    var afectadas = obligacionesEnRango(p.correo, d, h);
    var id = 'AUS-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss');

    afectadas.forEach(function (o) {
      // el titular original solo se escribe la primera vez: si ya estaba
      // cubriendo a alguien, el dueno de verdad es el de antes
      var campos = { responsable: p.backup };
      if (!o.titular) campos.titular_original = p.correo;
      escribirCampos(HOJA.OBLIGACIONES, o.fila, campos);
      registrar(o.id, EVENTO.ASIGNADA,
        'ausencia ' + id + ': de ' + p.correo + ' a ' + p.backup +
        ' hasta ' + p.hasta);
    });

    var fila = {
      id: id, correo_ausente: p.correo, desde: d, hasta: h,
      correo_backup: p.backup, estado: AUSENCIA.ACTIVA,
      movidas: afectadas.length, registrada_por: yo().correo,
      registrada_el: new Date(), cerrada_el: '',
      nota: String(nota || '').trim()
    };
    agregarFilas(HOJA.AUSENCIAS, [COLS.AUSENCIAS.map(function (c) {
      return fila[c] === undefined ? '' : fila[c];
    })]);

    return { id: id, movidas: afectadas.length, backup: p.backup,
             nombre_backup: p.nombre_backup, hasta: p.hasta };
  });
}

/**
 * Devuelve a su titular las obligaciones de las ausencias ya terminadas.
 * Se llama sola al entrar a la aplicacion: es barato y asi no hace falta un
 * disparador para algo que solo tiene que pasar antes de que alguien mire.
 *
 * Lo hecho durante la ausencia se conserva: se devuelve la propiedad, no se
 * deshace el trabajo.
 */
function cerrarAusenciasVencidas() {
  var hoyTxt = fechaTexto(new Date());
  var vencidas = ausencias().filter(function (a) {
    return a.estado === AUSENCIA.ACTIVA && a.hasta_txt && a.hasta_txt < hoyTxt;
  });
  if (!vencidas.length) return 0;

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var devueltas = 0;

    vencidas.forEach(function (a) {
      filas(HOJA.OBLIGACIONES).forEach(function (f, i) {
        var titular = String(f[ix.titular_original] || '').trim().toLowerCase();
        var resp = String(f[ix.responsable] || '').trim().toLowerCase();
        if (titular !== a.correo_ausente || resp !== a.correo_backup) return;

        escribirCampos(HOJA.OBLIGACIONES, i + 2,
                       { responsable: titular, titular_original: '' });
        registrar(String(f[ix.id]).trim(), EVENTO.ASIGNADA,
          'fin de la ausencia ' + a.id + ': vuelve a ' + titular);
        devueltas++;
      });
      escribirCampos(HOJA.AUSENCIAS, a._fila,
                     { estado: AUSENCIA.TERMINADA, cerrada_el: new Date() });
    });

    if (devueltas) {
      registrar('', EVENTO.AVISO,
        devueltas + ' obligaciones devueltas al terminar ' + vencidas.length + ' ausencia(s)');
    }
    return devueltas;
  });
}

/** Cancela una ausencia activa y devuelve todo ya. */
function apiCancelarAusencia(id) {
  exige('gestionarAusencias');

  var a = ausencias().filter(function (x) { return x.id === String(id).trim(); })[0];
  if (!a) throw new Error('No existe la ausencia ' + id);
  if (a.estado !== AUSENCIA.ACTIVA) {
    throw new Error('Esa ausencia ya está ' + a.estado.toLowerCase() + '.');
  }

  return conCerrojo(function () {
    var ix = indices(HOJA.OBLIGACIONES);
    var devueltas = 0;
    filas(HOJA.OBLIGACIONES).forEach(function (f, i) {
      var titular = String(f[ix.titular_original] || '').trim().toLowerCase();
      var resp = String(f[ix.responsable] || '').trim().toLowerCase();
      if (titular !== a.correo_ausente || resp !== a.correo_backup) return;
      escribirCampos(HOJA.OBLIGACIONES, i + 2,
                     { responsable: titular, titular_original: '' });
      registrar(String(f[ix.id]).trim(), EVENTO.ASIGNADA,
                'ausencia ' + a.id + ' cancelada: vuelve a ' + titular);
      devueltas++;
    });
    escribirCampos(HOJA.AUSENCIAS, a._fila,
                   { estado: AUSENCIA.CANCELADA, cerrada_el: new Date() });
    return { devueltas: devueltas };
  });
}

/** La pantalla de ausencias. */
function apiAusencias() {
  exige('gestionarAusencias');
  cerrarAusenciasVencidas();

  var gente = asignables().filter(function (u) {
    return u.rol === ROL.PROFESIONAL && u.nivel !== 'III';
  }).map(function (u) {
    var b = backupDe(u.correo);
    var elB = b ? asignables().filter(function (x) { return x.correo === b; })[0] : null;
    return { correo: u.correo, nombre: u.nombre, perfil: u.perfil,
             backup: b, nombre_backup: elB ? elB.nombre : '' };
  });

  return {
    personas: gente,
    sinBackup: gente.filter(function (u) { return !u.backup; })
                    .map(function (u) { return u.nombre; }),
    ausencias: ausencias().sort(function (a, b) {
      return String(b.desde_txt).localeCompare(String(a.desde_txt));
    }),
    generado: fechaHoraTexto(new Date())
  };
}


// ═════ 21_Calendario.gs ═════

/**
 * SINAV · el calendario tributario: leerlo y entenderlo.
 *
 * Esto lo usan las DOS cargas, asi que vive en el nucleo y no en Carga.gs:
 *
 *   Carga.gs      una vez por vigencia: CALENDARIO -> PROGRAMACION
 *   Mensuales.gs  el 1 de cada mes: CALENDARIO + PROGRAMACION -> OBLIGACIONES
 *
 * Carga.gs se puede borrar del editor cuando ya no haga falta; la carga
 * mensual sigue funcionando porque lo que necesita esta aqui.
 */

var HOJA_CALENDARIO = 'CALENDARIO';
var HOJA_PROGRAMACION = 'PROGRAMACION';

var COLS_PROGRAMACION = [
  'cod_dane', 'cod_oficina', 'departamento', 'municipio', 'entidad',
  'impuesto', 'regimen', 'periodicidad', 'nit_municipio', 'correo_oficina',
  'responsable', 'requiere_envio', 'nota'
];

/**
 * Los impuestos que SINAV gestiona, y como se llaman en el calendario.
 * Lo que no este aqui se ignora a proposito: predial, alumbrado publico y
 * actualizacion de RIT quedaron fuera del alcance.
 */
var IMPUESTO_CALENDARIO = {
  'INDUSTRIA Y COMERCIO': 'ICA',
  'RETENCION ICA': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'MEDIOS MAGNETICOS': 'EXOGENA'
};

/**
 * Las filas de "descuento pronto pago" no son obligaciones distintas: son la
 * misma con una fecha anterior si se paga pronto. Solo se toma la fila base.
 * Comprobado que ninguna obligacion existe SOLO como fila de descuento, asi
 * que no se pierde ninguna.
 */
var DESCUENTOS_QUE_ENTRAN = ['', 'FECHA LIMITE'];

/** Lee la hoja CALENDARIO y devuelve sus filas como objetos, ya filtradas. */
function leerCalendario() {
  var h = libro().getSheetByName(HOJA_CALENDARIO);
  if (!h) {
    throw new Error('Falta la hoja ' + HOJA_CALENDARIO + '. Pega ahí la hoja ' +
      'CALENDARIO_TRIBUTARIO del Excel, con sus encabezados en la fila 1.');
  }
  var n = h.getLastRow() - 1;
  if (n < 1) throw new Error('La hoja ' + HOJA_CALENDARIO + ' está vacía.');

  var todo = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var cab = todo[0];
  var ix = {};
  for (var i = 0; i < cab.length; i++) {
    var k = limpiar(cab[i]);
    if (k && !(k in ix)) ix[k] = i;
  }
  ['CODIGO DANE', 'MUNICIPIO', 'IMPUESTO', 'PERIODICIDAD'].forEach(function (c) {
    if (!(c in ix)) {
      throw new Error('A la hoja ' + HOJA_CALENDARIO + ' le falta la columna «' + c + '».');
    }
  });

  return { cabecera: cab, indices: ix, filas: todo.slice(1) };
}

/**
 * Las columnas de periodo del calendario, con el periodo que les toca.
 *
 * El encabezado es el PERIODO y la celda es el VENCIMIENTO. Las ultimas
 * columnas pertenecen al ano siguiente (es el ano vencido): se detecta porque
 * el mes deja de crecer.
 */
function columnasDePeriodo(cabecera, vigencia) {
  var salida = [];
  var anio = Number(vigencia);
  var mesAnterior = 0;

  for (var i = 0; i < cabecera.length; i++) {
    var v = cabecera[i];
    var mes = 0;
    if (v instanceof Date) mes = v.getMonth() + 1;
    else {
      var m = String(v).match(/^(\d{1,2})[-\/]?([A-Za-z]{3})/);
      if (m) {
        var meses = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7,
                      AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
                      JAN: 1, APR: 4, AUG: 8, DEC: 12 };
        mes = meses[m[2].toUpperCase()] || 0;
      }
    }
    if (!mes) continue;
    if (mes <= mesAnterior) anio++;          // el mes dejo de crecer: ano siguiente
    mesAnterior = mes;
    salida.push({ col: i, anio: anio, mes: mes });
  }
  return salida;
}

/** El periodo que le corresponde a un mes segun la periodicidad. */
function periodoDe(anio, mes, periodicidad) {
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}


// ═════ 22_Produccion.gs ═════

/**
 * SINAV · el paso a produccion.
 *
 * Pasar a produccion es UNA celda: CONFIG.modo de PRUEBA a PRODUCCION. Pero
 * en el segundo siguiente los correos salen de verdad a las alcaldias, y lo
 * enviado no se puede desenviar.
 *
 * Asi que no se edita a mano: se corre revisarAntesDeProduccion(), que mira
 * lo que esta a punto de salir, y despues pasarAProduccion(), que se niega
 * si encuentra algo de prueba listo para enviarse.
 */

/** Una declaracion de verdad es un PDF. Lo demas es de prueba. */
var EXTENSIONES_REALES = ['.pdf'];

/** Un correo inventado por los datos de ejemplo: oficina.algo@davivienda.com */
function correoInventado(correos) {
  var c = String(correos || '').toLowerCase();
  if (!c) return false;
  return c.indexOf('oficina.') === 0 || c.indexOf(',oficina.') >= 0 ||
         c.indexOf('tesoreria.cali@') >= 0;
}

/** El nombre de un archivo que NO es una declaracion de verdad. */
function soporteNoReal(nombre) {
  var n = String(nombre || '').toLowerCase();
  if (!n) return true;
  if (n.indexOf('(prueba)') >= 0 || n.indexOf('prueba') >= 0) return true;
  for (var i = 0; i < EXTENSIONES_REALES.length; i++) {
    if (n.slice(-EXTENSIONES_REALES[i].length) === EXTENSIONES_REALES[i]) return false;
  }
  return true;                                   // ni PDF: no es una declaracion
}

/**
 * Lo que pasaria si ahora mismo se pasara a produccion. No cambia nada.
 *
 * Mira solo lo que esta en LISTA, que es lo unico que puede salir: una
 * obligacion en PENDIENTE no se envia aunque el modo cambie.
 */
function revisarAntesDeProduccion() {
  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  var ix = indices(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var listas = [], riesgos = [], sinCorreo = 0;

  todas.forEach(function (f) {
    if (String(f[ix.estado] || '').trim().toUpperCase() !== ESTADO.LISTA) return;

    var quien = String(f[ix.municipio]) + ' · ' + String(f[ix.impuesto]) +
                ' · ' + String(f[ix.periodo]);
    var correo = String(f[ix.correo_oficina] || '').trim();
    if (!correo) { sinCorreo++; return; }         // no sale: ya lo frena puedeEnviar

    listas.push(quien + '  →  ' + correo);

    if (correoInventado(correo)) {
      riesgos.push(quien + ': el correo ' + correo + ' es inventado, de los datos de ejemplo');
    }
    listaSoportes(f[ix.soporte_id]).forEach(function (sid) {
      var nombre = '';
      try { nombre = DriveApp.getFileById(sid).getName(); } catch (e) { nombre = ''; }
      if (soporteNoReal(nombre)) {
        riesgos.push(quien + ': el soporte «' + (nombre || 'no se pudo abrir') +
                     '» no parece una declaración real');
      }
    });
  });

  var l = ['Modo actual: ' + modo, ''];

  if (!listas.length) {
    l.push('Ahora mismo no hay ninguna obligación en LISTA, así que al pasar a');
    l.push('PRODUCCION no saldría ningún correo hasta que alguien suba un soporte.');
  } else {
    l.push(listas.length + ' obligaciones están en LISTA. Al pasar a PRODUCCION,');
    l.push('en cuanto alguien le dé a enviar, estos correos salen de verdad:');
    l.push('');
    listas.slice(0, 15).forEach(function (x) { l.push('   ' + x); });
    if (listas.length > 15) l.push('   … y ' + (listas.length - 15) + ' más');
  }

  if (sinCorreo) {
    l.push('', sinCorreo + ' en LISTA no tienen correo de oficina: esas no salen,');
    l.push('se quedan esperando a que alguien escriba el correo.');
  }

  if (riesgos.length) {
    l.push('', 'OJO — esto hay que arreglarlo ANTES:');
    riesgos.forEach(function (x) { l.push('   ' + x); });
    l.push('', 'Borra esas filas de prueba o cámbiales el soporte. pasarAProduccion()');
    l.push('se va a negar mientras sigan en LISTA.');
  } else if (modo === 'PRUEBA') {
    l.push('', 'No hay datos de prueba a punto de salir. Puedes correr pasarAProduccion().');
  }

  var logo = '';
  try {
    logo = PropertiesService.getScriptProperties().getProperty('logo_id') || '';
  } catch (e) { logo = ''; }
  if (!String(logo || config('logo_id') || '').trim()) {
    l.push('', 'Menor: no hay logo. La interfaz muestra el espacio punteado. Se arregla');
    l.push('en Configuración del proyecto → Propiedades del script → logo_id.');
  }
  if (!idDeLogoCorreo()) {
    l.push('', 'Menor: no hay logo_correo_id. El correo usa el logo de la aplicación,');
    l.push('que es oscuro, así que la cabecera sale blanca en vez de roja. Para la');
    l.push('cabecera roja hace falta una versión clara del logo en esa propiedad.');
  }

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/**
 * Pasa a PRODUCCION. Desde ese momento los correos salen a las alcaldias.
 *
 * Se niega si hay algo de prueba en LISTA. Queda registrado en EVENTOS con
 * quien lo hizo y cuando.
 */
function pasarAProduccion() {
  exige('configurar');

  var modo = String(config('modo') || 'PRUEBA').toUpperCase();
  if (modo === 'PRODUCCION') {
    return 'Ya estaba en PRODUCCION. No se cambió nada.';
  }

  var informe = revisarAntesDeProduccion();
  if (informe.indexOf('OJO — esto hay que arreglarlo ANTES:') >= 0) {
    throw new Error('No se pasó a PRODUCCION: hay datos de prueba a punto de ' +
      'salir a una alcaldía.\n\n' + informe);
  }

  guardarConfig('modo', 'PRODUCCION');
  registrar('', EVENTO.AVISO, 'modo PRUEBA -> PRODUCCION');

  return 'SINAV está en PRODUCCION.\n\n' +
         'Desde ahora los correos salen a las alcaldías, desde el buzón de cada\n' +
         'persona. El aviso de «ambiente de pruebas» desaparece de la interfaz al\n' +
         'recargarla.\n\n' +
         'Para volver atrás: volverAPruebas().';
}

/** El camino de vuelta, por si hay que parar todo. */
function volverAPruebas() {
  exige('configurar');
  guardarConfig('modo', 'PRUEBA');
  registrar('', EVENTO.AVISO, 'modo PRODUCCION -> PRUEBA');
  return 'De vuelta en PRUEBA: los correos vuelven a la bandeja de cada quien.\n' +
         'Lo que ya se envió no se puede deshacer.';
}


// ═════ 23_Correo.gs ═════

/**
 * SINAV · el correo que recibe la oficina.
 *
 * El texto no es decorativo: es una instrucción de trabajo. Dice qué egreso
 * elaborar, con qué consecutivo de giro, a qué código devolver el sellado y
 * qué pasa si no lo devuelven (evento SARO). Por eso vive en su propio archivo
 * y no mezclado con la mecánica del envío.
 *
 * Lo que cambia por obligación sale de la fila. Lo que es igual en todos los
 * correos (el egreso, el código del departamento, a nombre de quién se manda,
 * las copias) sale de CONFIG y se cambia una sola vez.
 */

/** Los nombres largos, como los escribe el equipo en el asunto. */
var IMPUESTO_LARGO = {
  ICA: 'Industria y Comercio',
  RETEICA: 'Retención de Industria y Comercio',
  AUTORRETEICA: 'Autorretención de Industria y comercio',
  EXOGENA: 'Medios magnéticos'
};

var IMPUESTO_ASUNTO = {
  ICA: 'Declaración de ICA',
  RETEICA: 'Declaración Retención de ICA',
  AUTORRETEICA: 'Declaración Autorretención de ICA',
  EXOGENA: 'Medios magnéticos'
};

/**
 * La dependencia, sin el cero de relleno.
 *
 * En la hoja el codigo de oficina se guarda con cuatro posiciones ('0851')
 * porque es un codigo y no un numero, pero las direcciones de correo no lo
 * llevan: director851@, no director0851@.
 */
function dependenciaDe(o) {
  var c = String(o.cod_oficina || '').trim().replace(/^0+/, '');
  return c;
}

/**
 * A quien va el correo.
 *
 * Si la obligacion tiene correo_oficina escrito, manda ese: alguien lo puso a
 * proposito. Si no, se arma desde la dependencia, que es el patron del banco:
 * director<dep>@ y subdirector<dep>@.
 *
 * Esto es lo que permite enviar a los municipios que nunca tuvieron correo
 * escrito, que eran la mayoria.
 */
function destinatariosDe(o) {
  var escrito = normCorreos(o.correo_oficina);
  if (escrito) return escrito;

  var dep = dependenciaDe(o);
  if (!dep) return '';
  var dominio = config('dominio_oficinas') || 'davivienda.com';
  return ['director' + dep + '@' + dominio,
          'subdirector' + dep + '@' + dominio].join(',');
}

/** Las copias fijas de CONFIG. Vacio si no hay. */
function copiasFijas() {
  return normCorreos(config('copias_fijas'));
}

/**
 * El asunto, con el formato que usa el equipo:
 *   1689 -Declaración Autorretención de ICA NILO - MENSUAL - $1.773.000 -
 *   EGRESO 25 No - LR-09-74
 *
 * Al final va la marca SINAV-..., que es con la que luego se encuentra el
 * hilo. Sin eso la respuesta de la oficina no se detecta sola.
 */
function asuntoOficina(o) {
  var partes = [
    dependenciaDe(o) + ' -' + (IMPUESTO_ASUNTO[o.impuesto] || o.impuesto) +
      ' ' + String(o.municipio || '').toUpperCase(),
    String(o.periodicidad || '').toUpperCase(),
    pesosCortos(o.valor)
  ];
  var egreso = String(config('egreso') || '').trim();
  var giro = String(o.consecutivo_giro || '').trim();
  if (egreso) partes.push('EGRESO ' + egreso + ' No');
  if (giro) partes.push(giro);
  return partes.join(' - ') + ' [' + marcador(o.id) + ']';
}

/** $1.773.000 — sin decimales, que es como lo escriben en el asunto. */
function pesosCortos(v) {
  if (v === '' || v === null || v === undefined) return '$0';
  var n = Math.round(Number(v) || 0);
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** El mes y el ano en letras: "24 de noviembre de 2026". */
function fechaLarga(v) {
  var d = v instanceof Date ? v : normFecha(v);
  if (!d) return 'sin fecha';
  return d.getDate() + ' de ' + NOMBRE_MES[d.getMonth()] + ' de ' + d.getFullYear();
}

/**
 * El parrafo de apertura. Es el que lleva los datos del envio fisico: el
 * adhesivo con el que viaja el sobre, el valor, el NIT y la dependencia.
 */
function parrafoEnvio(o) {
  var adhesivo = String(o.adhesivo || '').trim();
  return 'Reciban un cordial saludo, les informo que enviamos por correo interno ' +
    (adhesivo ? 'con el sticker No ' + adhesivo + ' ' : '') +
    'la ' + (IMPUESTO_LARGO[o.impuesto] || o.impuesto) + ' ' +
    String(o.periodicidad || '').toUpperCase() + ' del ' +
    (o.vigencia || new Date().getFullYear()) + ', del Municipio ' +
    String(o.municipio || '').toUpperCase() + ', por el valor de ' +
    pesosCortos(o.valor) + ' con el NIT ' + (o.nit_municipio || '-') +
    ' a la dependencia ' + (dependenciaDe(o) || '-') + '.';
}

/** El parrafo de instrucciones de pago. */
function parrafoPago(o) {
  var egreso = String(config('egreso') || '25').trim();
  var giro = String(o.consecutivo_giro || '').trim();
  return 'Favor realizar el pago por contingencia elaborando egreso ' + egreso +
    (giro ? ', de acuerdo al consecutivo de giro asignado para este pago No ' + giro : '') +
    ', realizar la presentación y el pago una vez reciban el soporte. Si el Banco ' +
    'posee recaudo con el Municipio, timbrar en efectivo con abono a cuenta del ' +
    'Municipio sin olvidar enviar el correo a GRP Conceptos Especiales; si no ' +
    'poseemos recaudo con ellos elaborar el cheque con el mismo egreso ' + egreso +
    ' y concepto 40 para pagar en otra entidad, o en la alcaldía.';
}

/** Los cuatro puntos de «aspectos a tener en cuenta». */
function aspectos(o) {
  var codigo = String(config('codigo_departamento') || '').trim();
  var recibe = String(config('nombre_recibe') || '').trim();
  return [
    'Por favor una vez presentada la declaración (ante la entidad recaudadora y ' +
      'sellada con fecha de recibido), enviar por este medio imagen del pago y ' +
      'enviar la declaración con el sello de recibido a Dpto. de impuestos' +
      (codigo ? ', código ' + codigo : '') +
      (recibe ? ' a nombre de ' + recibe : '') +
      '. Si el departamento de impuestos no es notificado mediante correo ' +
      'electrónico, se reportará como evento SARO.',
    'Si por alguna eventualidad el día anterior a la fecha del vencimiento de la ' +
      'declaración no ha recibido en su oficina el formulario, por favor ' +
      'comunicarse conmigo con carácter urgente. Solicitamos una vez recibido el ' +
      'correo tramitar el pago del mismo, no es necesario esperar a la fecha de ' +
      'vencimiento, para evitar sanciones tributarias; que de generarse, serán ' +
      'cargadas a la oficina responsable del trámite.',
    'Es responsabilidad de la oficina y/o área administrativa llevar a cabo el ' +
      'trámite satisfactorio.',
    'Sugerimos tomar fotocopia del recibido de la declaración y archivar para la ' +
      'oficina. Recuerde que esta documentación es soporte si a futuro se requiere.'
  ];
}

/** El correo en texto plano, para quien lea sin HTML. */
function cuerpoOficina(o, modo) {
  var l = [];
  if (modo === 'PRUEBA') {
    l.push('[MODO PRUEBA] Este correo iba para: ' + (destinatariosDe(o) || '-'), '');
  }
  l.push('Buenos días,', '', parrafoEnvio(o), '', parrafoPago(o), '',
         'Fecha de vencimiento el ' + fechaLarga(o.vencimiento) + '.', '',
         'ASPECTOS A TENER EN CUENTA:');
  aspectos(o).forEach(function (a) { l.push('• ' + a); });
  l.push('',
    'Agradecemos dar respuesta SOBRE ESTE MISMO CORREO, sin iniciar uno nuevo,',
    'adjuntando la declaración con el sello de recibido. De esta manera el',
    'soporte queda asociado automáticamente a la obligación y debidamente',
    'archivado.',
    '', 'Cordialmente,', config('nombre_remitente'));
  return l.join('\n');
}

/**
 * El correo en HTML, con el logo del banco arriba.
 *
 * El logo se incrusta como imagen en linea (cid) desde el archivo de Drive que
 * apunta logo_id. Se incrusta y no se enlaza porque Gmail bloquea las imagenes
 * remotas hasta que el que lee da permiso, y entonces el correo llega roto.
 */
function cuerpoHtmlOficina(o, modo) {
  var ROJO = '#e30518';
  var TINTA = '#111111';
  var APAGADO = '#5f6368';
  var BORDE = '#e8e8e8';
  var FUENTE = "-apple-system,'Segoe UI',Arial,Helvetica,sans-serif";

  var aviso = modo === 'PRUEBA'
    ? '<tr><td style="padding:0 0 16px">' +
      '<div style="background:#fff6e0;border:1px solid #f0d9a0;color:#8a5500;' +
      'padding:10px 14px;font-size:13px;border-radius:4px">' +
      '<b>MODO PRUEBA.</b> Este correo iba para: ' +
      (destinatariosDe(o) || '-') + '</div></td></tr>'
    : '';

  // cada dato en su celda, para que no se amontonen en el movil
  var dato = function (k, v, ancho) {
    return '<td width="' + (ancho || '50%') + '" valign="top" ' +
      'style="padding:10px 14px;border:1px solid ' + BORDE + '">' +
      '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;' +
      'color:' + APAGADO + ';padding-bottom:3px">' + k + '</div>' +
      '<div style="font-size:15px;color:' + TINTA + ';font-weight:700">' +
      v + '</div></td>';
  };

  var punto = function (n, txt) {
    return '<tr>' +
      '<td valign="top" width="26" style="padding:0 0 12px">' +
      '<div style="width:19px;height:19px;border-radius:10px;background:' + ROJO + ';' +
      'color:#fff;font-size:11px;font-weight:700;text-align:center;' +
      'line-height:19px">' + n + '</div></td>' +
      '<td valign="top" style="padding:0 0 12px;font-size:13px;line-height:1.55;' +
      'color:' + TINTA + '">' + txt + '</td></tr>';
  };

  var puntos = '';
  aspectos(o).forEach(function (a, k) { puntos += punto(k + 1, a); });

  var sticker = String(o.adhesivo || '').trim();
  var giro = String(o.consecutivo_giro || '').trim();

  return '' +
  '<div style="background:#f1f3f4;padding:24px 12px;font-family:' + FUENTE + '">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
    'width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;' +
    'border-radius:8px;overflow:hidden;border:1px solid ' + BORDE + '">' +

    // ---- cabecera.
    // Sobre rojo solo si hay un logo HECHO para el correo (claro). Con el
    // logo de la aplicacion, que es oscuro, la franja roja se lo come: en ese
    // caso la cabecera va blanca con una regla roja debajo.
    (function () {
      var propio = !!idDeLogoCorreo() && tieneLogo();
      var fondo = propio ? ROJO : '#ffffff';
      var texto = propio ? '#ffffff' : APAGADO;
      var regla = propio ? '' : ';border-bottom:3px solid ' + ROJO;
      return '<tr><td style="background:' + fondo + ';padding:18px 28px' +
          regla + '">' +
        '<table role="presentation" width="100%"><tr>' +
          '<td valign="middle">' +
            (tieneLogo()
              ? '<img src="cid:logo" alt="Davivienda" height="26" ' +
                'style="height:26px;display:block">'
              : '<div style="color:' + (propio ? '#fff' : ROJO) +
                ';font-size:17px;font-weight:700;letter-spacing:.02em">' +
                'Davivienda</div>') +
          '</td>' +
          '<td valign="middle" align="right" style="color:' + texto +
            ';font-size:12px">Departamento de Impuestos</td>' +
        '</tr></table></td></tr>';
    })() +

    '<tr><td style="padding:26px 28px 0">' +
      '<table role="presentation" width="100%">' + aviso +

      // ---- de que se trata
      '<tr><td style="padding:0 0 4px;font-size:11px;letter-spacing:.06em;' +
        'text-transform:uppercase;color:' + APAGADO + '">' +
        (IMPUESTO_LARGO[o.impuesto] || o.impuesto) + ' &middot; ' +
        String(o.periodicidad || '').toLowerCase() + '</td></tr>' +
      '<tr><td style="padding:0 0 18px;font-size:23px;line-height:1.25;' +
        'font-weight:700;color:' + TINTA + '">' +
        String(o.municipio || '').toUpperCase() +
        '<span style="color:' + APAGADO + ';font-weight:400"> &middot; ' +
        o.periodo + '</span></td></tr>' +

      // ---- el vencimiento, que es lo que no se puede pasar por alto
      '<tr><td style="padding:0 0 20px">' +
        '<div style="background:#fce9e9;border-left:4px solid ' + ROJO + ';' +
        'padding:12px 16px;border-radius:0 4px 4px 0">' +
          '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;' +
          'color:' + APAGADO + '">Fecha de vencimiento</div>' +
          '<div style="font-size:18px;font-weight:700;color:' + ROJO + ';' +
          'padding-top:2px">' + fechaLarga(o.vencimiento) + '</div>' +
        '</div></td></tr>' +

      '<tr><td style="padding:0 0 18px;font-size:14px;line-height:1.6;color:' +
        TINTA + '">Buenos días,<br><br>' + parrafoEnvio(o) + '</td></tr>' +

      // ---- la ficha
      '<tr><td style="padding:0 0 20px">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
          'width="100%" style="border-collapse:collapse">' +
          '<tr>' + dato('Valor a girar', pesosCortos(o.valor)) +
                   dato('NIT del municipio', o.nit_municipio || '—') + '</tr>' +
          '<tr>' + dato('Dependencia', dependenciaDe(o) || '—') +
                   dato('Sticker de correspondencia', sticker || '—') + '</tr>' +
          '<tr>' + dato('Consecutivo de giro', giro || '—') +
                   dato('Presentación', (o.tipo_presentacion || '—') +
                        ' &middot; paga ' + textoPago(o)) + '</tr>' +
        '</table></td></tr>' +

      '<tr><td style="padding:0 0 22px;font-size:14px;line-height:1.6;color:' +
        TINTA + '">' + parrafoPago(o) + '</td></tr>' +

      // ---- los cuatro aspectos, numerados
      '<tr><td style="padding:0 0 6px;font-size:12px;letter-spacing:.06em;' +
        'text-transform:uppercase;color:' + APAGADO + ';font-weight:700">' +
        'Aspectos a tener en cuenta</td></tr>' +
      '<tr><td style="padding:0 0 10px;border-top:1px solid ' + BORDE + '"></td></tr>' +
      '<tr><td style="padding:0 0 8px">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
        'width="100%">' + puntos + '</table></td></tr>' +

      // ---- la instruccion que hace que todo lo demas funcione
      '<tr><td style="padding:4px 0 22px">' +
        '<div style="background:#f7f5f5;border:1px solid ' + BORDE + ';' +
        'padding:14px 16px;border-radius:4px;font-size:13px;line-height:1.55;' +
        'color:' + TINTA + '">' +
        'Agradecemos dar respuesta <b>sobre este mismo correo</b>, sin iniciar ' +
        'uno nuevo, adjuntando la declaración con el sello de recibido. De esta ' +
        'manera el soporte queda asociado automáticamente a la obligación y ' +
        'debidamente archivado.</div></td></tr>' +

      '<tr><td style="padding:0 0 26px;font-size:14px;color:' + TINTA + '">' +
        'Cordialmente,<br><b>' + config('nombre_remitente') + '</b></td></tr>' +
      '</table>' +
    '</td></tr>' +

    '<tr><td style="background:#f7f5f5;border-top:1px solid ' + BORDE + ';' +
      'padding:14px 28px;font-size:11px;color:' + APAGADO + ';line-height:1.5">' +
      'Comunicación generada por SINAV, sistema de control de obligaciones ' +
      'tributarias territoriales del Departamento de Impuestos.</td></tr>' +

  '</table></div>';
}

/** Hay logo configurado y se puede abrir. */
function tieneLogo() {
  return !!blobDelLogo();
}

/**
 * El logo PARA EL CORREO. Sale de la propiedad del script 'logo_correo_id',
 * con CONFIG.logo_correo_id de respaldo. Acepta el id o el enlace de Drive.
 */
function idDeLogoCorreo() {
  var v = '';
  try {
    v = PropertiesService.getScriptProperties().getProperty('logo_correo_id') || '';
  } catch (e) {
    v = '';
  }
  if (!v) v = config('logo_correo_id');
  var s = String(v || '').trim();
  if (!s) return '';
  var m = /\/d\/([A-Za-z0-9_-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  return m ? m[1] : s;
}

/**
 * El logo como blob, para incrustarlo en el correo. Se cachea en memoria
 * durante la ejecucion: en un envio de 50 correos seria abrir Drive 50 veces.
 */
var _blobLogo;
var _blobLogoBuscado = false;

function blobDelLogo() {
  if (_blobLogoBuscado) return _blobLogo;
  _blobLogoBuscado = true;
  _blobLogo = null;

  // El logo del correo va sobre la franja roja; el de la aplicacion, sobre
  // blanco. Casi nunca es el mismo archivo: uno tiene que ser claro y el otro
  // oscuro. Por eso 'logo_correo_id' manda aqui, y si no esta, se cae al de
  // la aplicacion, que al menos ensena algo.
  var id = idDeLogoCorreo() || idLogo();
  if (!id) return null;
  try {
    _blobLogo = DriveApp.getFileById(id).getBlob().setName('logo');
  } catch (e) {
    _blobLogo = null;                 // sin logo el correo sale igual, sin imagen
  }
  return _blobLogo;
}

/* ===========================================================================
   EL CONSECUTIVO DE GIRO

   LR-09-74 se lee asi:

     LR   las iniciales de QUIEN ENVIA, en el momento de enviar. Si Andrea
          cubre a Yasneidy y es Andrea quien manda, el giro dice AG.
     09   el mes del PERIODO, no el mes en que se manda. Aqui se trabaja mes
          vencido: lo que se presenta en diciembre es de noviembre.
     74   un consecutivo que arranca de nuevo cada mes, por persona.

   Se asigna en el momento del envio, no antes: si se asignara al digitalizar,
   una obligacion que luego no se manda dejaria un hueco en la numeracion.
   =========================================================================== */

/** 'Liliana Ramirez' -> 'LR'. Primer nombre y primer apellido. */
function inicialesDe(nombre) {
  var partes = String(nombre || '')
    .normalize ? String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
               : String(nombre || '');
  var trozos = partes.toUpperCase().split(/[^A-Z]+/).filter(function (x) { return x; });
  if (!trozos.length) return '';
  if (trozos.length === 1) return trozos[0].slice(0, 2);
  return trozos[0].charAt(0) + trozos[1].charAt(0);
}

/**
 * El mes al que corresponde el periodo. Es el ULTIMO mes del periodo, que es
 * el que se declara: el bimestre 5 son septiembre y octubre, y se declara
 * octubre.
 *
 *   2026-09  -> 9      2026-B5 -> 10     2026-T3 -> 9
 *   2026-C2  -> 8      2026    -> 12
 */
function mesDelPeriodo(periodo) {
  var p = String(periodo || '').trim().toUpperCase();
  var m = p.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return Number(m[2]);
  m = p.match(/^(\d{4})-B(\d)$/);
  if (m) return Number(m[2]) * 2;
  m = p.match(/^(\d{4})-T(\d)$/);
  if (m) return Number(m[2]) * 3;
  m = p.match(/^(\d{4})-C(\d)$/);
  if (m) return Number(m[2]) * 4;
  if (/^\d{4}$/.test(p)) return 12;              // anual: se declara el cierre
  return 0;
}

/** LR + mes de dos cifras + consecutivo. */
function formatoGiro(iniciales, mes, n) {
  var mm = mes < 10 ? '0' + mes : String(mes);
  var nn = n < 10 ? '0' + n : String(n);
  return String(iniciales || '').toUpperCase() + '-' + mm + '-' + nn;
}

/** La clave del contador: por persona y por mes del periodo. */
function claveGiro(iniciales, anio, mes) {
  return 'giro:' + String(iniciales).toUpperCase() + ':' + anio + '-' +
         (mes < 10 ? '0' + mes : mes);
}

/**
 * Toma el siguiente numero de la cuenta y lo guarda. Bajo cerrojo, que dos
 * envios a la vez no se lleven el mismo.
 */
function siguienteConsecutivoGiro(iniciales, anio, mes) {
  return conCerrojo(function () {
    var props = PropertiesService.getScriptProperties();
    var clave = claveGiro(iniciales, anio, mes);
    var n = Number(props.getProperty(clave) || 0) + 1;
    props.setProperty(clave, String(n));
    return n;
  });
}

/**
 * El consecutivo de una obligacion. Si ya tiene uno escrito, ese manda: no se
 * renumera nada que ya haya salido.
 */
function giroPara(o, nombreQuienEnvia) {
  var ya = String(o.consecutivo_giro || '').trim();
  if (ya) return ya;

  // LO NORMAL: el numero que ese municipio tiene definido, con el mes de su
  // periodo. Revisoria busca estos numeros, asi que no se inventan.
  if (String(config('giro_sigue_al_remitente') || 'NO').toUpperCase() !== 'SI') {
    var deTabla = consecutivoDe(o.municipio, o.impuesto, o.periodo);
    if (deTabla) return deTabla;
  }

  var ini = inicialesDe(nombreQuienEnvia);
  if (!ini) return '';
  var mes = mesDelPeriodo(o.periodo);
  if (!mes) return '';
  var anio = Number(String(o.periodo || '').slice(0, 4)) ||
             Number(o.vigencia) || new Date().getFullYear();

  return formatoGiro(ini, mes, siguienteConsecutivoGiro(ini, anio, mes));
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
  pruebasAusencias(esIgual);
  pruebasCargaMensual(esIgual);
  pruebasProduccion(esIgual);
  pruebasVariosSoportes(esIgual);
  pruebasVariosSellados(esIgual);
  pruebasCorreoOficina(esIgual);
  pruebasConcepto25(esIgual);
  pruebasCorreosOficina(esIgual);
  pruebasCodigoComoFecha(esIgual);

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
    soporte_revisado: '1AbCdEf',
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

  // La revision NO entra en puedeEnviar(): si lo hiciera, la fila no se
  // podria seleccionar para llegar a revisarla. Se selecciona igual.
  esIgual('sin revisar la fila SI se puede seleccionar',
          puedeEnviar(con({ soporte_revisado: '' })).ok, true);

  // pero es la ultima puerta antes de que salga el correo
  esIgual('sin revisar no se llega a ENVIADA',
          validarPaso(con({ soporte_revisado: '' }), ESTADO.ENVIADA, {},
                      PERFIL.PROFESIONAL_I).ok, false);
  esIgual('y lo dice',
          validarPaso(con({ soporte_revisado: '' }), ESTADO.ENVIADA, {},
                      PERFIL.PROFESIONAL_I).motivo, 'falta revisar el soporte');
  esIgual('un visto bueno de OTRO archivo no sirve',
          soporteRevisado(con({ soporte_revisado: 'otroArchivo' })), false);
  esIgual('revisado el archivo que es, si pasa',
          validarPaso(con({ soporte_revisado: '1AbCdEf' }), ESTADO.ENVIADA, {},
                      PERFIL.PROFESIONAL_I).ok, true);
  esIgual('sin soporte no hay nada que revisar',
          soporteRevisado(con({ soporte_id: '', soporte_revisado: '' })), false);
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

/**
 * Ausencias (REQ-010). Emparejar mal a un backup significa darle el trabajo de
 * alguien a quien no le toca, y que el titular no se entere.
 */
function pruebasAusencias(esIgual) {
  var cubre = function (correo, nombre) {
    return clavesBackup(correo, nombre || '');
  };
  var tiene = function (lista, clave) { return lista.indexOf(clave) >= 0; };

  esIgual('a Jesús lo cubre Helen',
          tiene(cubre('jesus.jaimes@davivienda.com'), 'helen'), true);
  esIgual('a Helen la cubre Jesús',
          tiene(cubre('helen.cuadros@davivienda.com'), 'jesus'), true);
  esIgual('a Andrea la cubre su par',
          tiene(cubre('andrea.galvis@davivienda.com'), 'ramirez'), true);

  // LA REGRESION: el par de Andrea se escribio como 'liliana' y la profesional
  // resulto llamarse Yasneidy Ramirez, asi que nadie tenia backup. Ahora el
  // apellido tambien cuenta, en el correo y en el nombre.
  esIgual('Yasneidy Ramírez encuentra a Andrea',
          tiene(cubre('yasneidy.ramirez@davivienda.com'), 'andrea'), true);
  esIgual('y la encuentra aunque el correo no diga el apellido',
          tiene(cubre('yramirez@davivienda.com', 'Yasneidy Ramírez'), 'andrea'), true);
  esIgual('a Andrea la cubre Yasneidy',
          tiene(cubre('andrea.galvis@davivienda.com'), 'yasneidy'), true);

  esIgual('el emparejamiento no depende del dominio',
          tiene(cubre('jesus.jaimes@otracosa.com'), 'helen'), true);
  esIgual('ni de mayúsculas',
          tiene(cubre('ANDREA.GALVIS@davivienda.com'), 'ramirez'), true);
  esIgual('ni de los acentos del nombre',
          tiene(cubre('x@y.com', 'Yasneidy Ramírez'), 'andrea'), true);

  esIgual('Elizabeth no tiene backup', cubre('elizabeth@davivienda.com').length, 0);
  esIgual('alguien de fuera tampoco', cubre('pepito@davivienda.com').length, 0);
  esIgual('vacío no revienta', cubre('').length, 0);
  esIgual('nulo no revienta', clavesBackup(null, null).length, 0);

  // los pares tienen que ser simetricos: si A cubre a B, B cubre a A
  var simetrico = true;
  BACKUPS.forEach(function (par) {
    par.a.forEach(function (k) {
      if (!tiene(cubre(k + '@x.com'), par.b[0])) simetrico = false;
    });
    par.b.forEach(function (k) {
      if (!tiene(cubre(k + '@x.com'), par.a[0])) simetrico = false;
    });
  });
  esIgual('los pares de backup son simétricos', simetrico, true);

  // nadie puede aparecer en dos pares, o el backup seria ambiguo
  var vistos = {}, repetido = false;
  BACKUPS.forEach(function (par) {
    par.a.concat(par.b).forEach(function (k) {
      if (vistos[k]) repetido = true;
      vistos[k] = true;
    });
  });
  esIgual('nadie está en dos pares a la vez', repetido, false);

  // REQ-010: en PRUEBA la respuesta llega de uno mismo, y tiene que contar
  var falso = { getFrom: function () { return 'yo@davivienda.com'; } };
  // el unico que se descarta siempre es el primero: el que mando SINAV
  var adjunto = function (kb) {
    return { getFrom: function () { return 'yo@davivienda.com'; },
             getAttachments: function () {
               return kb ? [{ getSize: function () { return kb * 1024; } }] : [];
             } };
  };
  var oficina = { getFrom: function () { return 'hacienda@cali.gov.co'; },
                  getAttachments: function () { return []; } };

  esIgual('el primero del hilo nunca cuenta',
          cuentaComoRespuesta(adjunto(0), 0, 'yo@davivienda.com', 'PRODUCCION'), false);
  esIgual('la oficina cuenta, traiga o no adjunto',
          cuentaComoRespuesta(oficina, 1, 'yo@davivienda.com', 'PRODUCCION'), true);
  esIgual('lo mio sin adjunto no cuenta: es un recordatorio',
          cuentaComoRespuesta(adjunto(0), 1, 'yo@davivienda.com', 'PRODUCCION'), false);
  esIgual('lo mio CON adjunto si cuenta: es el sellado reenviado',
          cuentaComoRespuesta(adjunto(80), 1, 'yo@davivienda.com', 'PRODUCCION'), true);
  esIgual('una firma incrustada no es un adjunto',
          cuentaComoRespuesta(adjunto(0.2), 1, 'yo@davivienda.com', 'PRODUCCION'), false);
  esIgual('y en PRUEBA vale lo mismo, sin reglas aparte',
          cuentaComoRespuesta(adjunto(80), 1, 'yo@davivienda.com', 'PRUEBA'), true);
}

/**
 * La carga mensual se para sobre un filtro de una linea: si ese filtro falla,
 * o se cargan 6.000 obligaciones o no se carga ninguna. Asi que se prueba.
 */
function pruebasCargaMensual(esIgual) {
  var f = function (a, m, d) { return new Date(a, m - 1, d); };

  esIgual('el 1 del mes entra', venceEnElMes(f(2026, 11, 1), 2026, 11), true);
  esIgual('el 30 del mes entra', venceEnElMes(f(2026, 11, 30), 2026, 11), true);
  esIgual('el ultimo dia del mes anterior no',
          venceEnElMes(f(2026, 10, 31), 2026, 11), false);
  esIgual('el 1 del mes siguiente no',
          venceEnElMes(f(2026, 12, 1), 2026, 11), false);
  esIgual('el mismo mes de otro ano no',
          venceEnElMes(f(2025, 11, 15), 2026, 11), false);

  // enero contra diciembre: es el salto que rompe las cargas de ano vencido
  esIgual('enero del ano siguiente no entra en diciembre',
          venceEnElMes(f(2027, 1, 15), 2026, 12), false);
  esIgual('y enero si entra en enero',
          venceEnElMes(f(2027, 1, 15), 2027, 1), true);

  // el mes llega como texto desde el menu
  esIgual('el mes como texto tambien sirve',
          venceEnElMes(f(2026, 11, 18), '2026', '11'), true);

  // basura: mejor no cargar nada que cargar lo que no es
  esIgual('sin fecha no entra', venceEnElMes('', 2026, 11), false);
  esIgual('nulo no entra', venceEnElMes(null, 2026, 11), false);
  esIgual('texto que parece fecha no entra',
          venceEnElMes('18/11/2026', 2026, 11), false);
  esIgual('una fecha invalida no entra',
          venceEnElMes(new Date('x'), 2026, 11), false);

  esIgual('hay doce nombres de mes', NOMBRE_MES.length, 12);
  esIgual('noviembre es el 11', NOMBRE_MES[10], 'noviembre');
}

/**
 * El paso a produccion se niega si hay algo de prueba a punto de salir. Estas
 * dos funciones son las que lo deciden, asi que se prueban.
 */
function pruebasProduccion(esIgual) {
  // correos inventados por instalar() y por el generador de ejemplo
  esIgual('oficina.chapinero es inventado',
          correoInventado('oficina.chapinero@davivienda.com'), true);
  esIgual('tambien el segundo de una lista',
          correoInventado('alcaldia@cali.gov.co,oficina.granada@davivienda.com'), true);
  esIgual('un correo de alcaldia de verdad no',
          correoInventado('hacienda@barranquilla.gov.co'), false);
  esIgual('una cuenta del banco que no es oficina.* tampoco',
          correoInventado('elizabeth@davivienda.com'), false);
  esIgual('vacio no es inventado', correoInventado(''), false);
  esIgual('nulo no revienta', correoInventado(null), false);

  // soportes
  esIgual('el txt de prueba no es real',
          soporteNoReal('Chapinero RETEICA 2026-09 (prueba).txt'), true);
  esIgual('cualquier txt tampoco',
          soporteNoReal('declaracion.txt'), true);
  esIgual('un PDF si es real',
          soporteNoReal('05001_ICA_2026-10.pdf'), false);
  esIgual('un PDF en mayusculas tambien',
          soporteNoReal('05001_ICA_2026-10.PDF'), false);
  esIgual('un PDF que se llama prueba, no',
          soporteNoReal('prueba.pdf'), true);
  esIgual('sin nombre no es real', soporteNoReal(''), true);
}

/**
 * Una obligacion puede llevar varios archivos: la declaracion y sus anexos,
 * todos en la misma celda separados por coma. El visto bueno es POR ARCHIVO,
 * asi que anadir un anexo despues vuelve a frenar el envio.
 */
function pruebasVariosSoportes(esIgual) {
  esIgual('un solo archivo', listaSoportes('abc'), ['abc']);
  esIgual('dos separados por coma', listaSoportes('abc,def'), ['abc', 'def']);
  esIgual('con espacios de sobra', listaSoportes(' abc , def '), ['abc', 'def']);
  esIgual('con punto y coma tambien', listaSoportes('abc;def'), ['abc', 'def']);
  esIgual('no repite el mismo archivo', listaSoportes('abc,abc'), ['abc']);
  esIgual('vacio es ninguno', listaSoportes(''), []);
  esIgual('nulo no revienta', listaSoportes(null), []);
  esIgual('tambien acepta la fila entera',
          listaSoportes({ soporte_id: 'abc,def' }), ['abc', 'def']);

  // el visto bueno tiene que cubrirlos TODOS
  esIgual('los dos revisados, pasa',
          soporteRevisado({ soporte_id: 'a,b', soporte_revisado: 'a,b' }), true);
  esIgual('en otro orden, igual pasa',
          soporteRevisado({ soporte_id: 'a,b', soporte_revisado: 'b,a' }), true);
  esIgual('falta revisar el anexo, no pasa',
          soporteRevisado({ soporte_id: 'a,b', soporte_revisado: 'a' }), false);
  esIgual('se anadio un anexo despues del visto bueno, no pasa',
          soporteRevisado({ soporte_id: 'a,b,c', soporte_revisado: 'a,b' }), false);
  esIgual('un visto bueno de un archivo que ya no esta no cuenta',
          soporteRevisado({ soporte_id: 'b', soporte_revisado: 'a' }), false);
  esIgual('sin archivos no hay nada revisado',
          soporteRevisado({ soporte_id: '', soporte_revisado: 'a' }), false);

  // y el envio sigue abierto a la seleccion con varios archivos
  esIgual('con dos archivos la fila se puede seleccionar',
          puedeEnviar({ estado: ESTADO.LISTA, soporte_id: 'a,b',
                        requiere_envio: 'SI',
                        correo_oficina: 'x@muni.gov.co' }).ok, true);
}

/**
 * La oficina puede mandar primero una queja sin nada, despues el sellado, y
 * mas tarde el recibo en otro correo del mismo hilo. Cada adjunto es
 * evidencia y se SUMA: ninguno pisa al anterior.
 */
function pruebasVariosSellados(esIgual) {
  esIgual('un sellado', listaIds('abc'), ['abc']);
  esIgual('dos sellados', listaIds('abc,def'), ['abc', 'def']);
  esIgual('sin sellado todavia', listaIds(''), []);
  esIgual('nulo no revienta', listaIds(null), []);
  esIgual('no cuenta dos veces el mismo archivo',
          listaIds('abc,abc,def').length, 2);

  // RESPONDIDA sigue en la lista de estados que miran el hilo: por eso una
  // respuesta sin adjunto no cierra la puerta al sellado que venga despues
  esIgual('ENVIADA mira el hilo',
          estadosEsperanRespuesta().indexOf(ESTADO.ENVIADA) >= 0, true);
  esIgual('RESPONDIDA SIGUE mirando el hilo',
          estadosEsperanRespuesta().indexOf(ESTADO.RESPONDIDA) >= 0, true);
  esIgual('SIN_EVIDENCIA tambien, por si contestan tarde',
          estadosEsperanRespuesta().indexOf(ESTADO.SIN_EVIDENCIA) >= 0, true);
  esIgual('APROBADA ya no',
          estadosEsperanRespuesta().indexOf(ESTADO.APROBADA) >= 0, false);
}

/**
 * El correo a la oficina. Lo que se prueba aqui no es la redaccion sino los
 * datos que la oficina necesita para girar la plata: a quien va, cuanto es y
 * con que consecutivo.
 */
function pruebasCorreoOficina(esIgual) {
  var base = {
    id: '25488|AUTORRETEICA|GENERAL|2026-11',
    municipio: 'Nilo', cod_dane: '25488', cod_oficina: '1689',
    impuesto: 'AUTORRETEICA', periodicidad: 'MENSUAL', periodo: '2026-11',
    valor: 1773000, nit_municipio: '8999997078', consecutivo_giro: 'LR-09-74',
    paga_quien: 'OFICINA', tipo_presentacion: 'OFICINA',
    adhesivo: '55622944', correo_oficina: '', vigencia: '2026'
  };
  var con = function (extra) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  };

  // la dependencia pierde el cero de relleno: director851@, no director0851@
  esIgual('dependencia sin cero', dependenciaDe({ cod_oficina: '0851' }), '851');
  esIgual('dependencia de cuatro cifras', dependenciaDe({ cod_oficina: '1689' }), '1689');
  esIgual('sin oficina, nada', dependenciaDe({ cod_oficina: '' }), '');

  // los pesos del asunto: sin decimales y con punto de mil
  esIgual('el valor se escribe como lo escriben ellos',
          pesosCortos(1773000), '$1.773.000');
  esIgual('un valor chico', pesosCortos(5000), '$5.000');
  esIgual('sin valor no revienta', pesosCortos(''), '$0');

  esIgual('la fecha en letras', fechaLarga(new Date(2026, 10, 24)),
          '24 de noviembre de 2026');
  esIgual('sin fecha lo dice', fechaLarga(''), 'sin fecha');

  // el asunto, con el formato del equipo
  var asunto = asuntoOficina(con({}));
  esIgual('el asunto empieza por la dependencia', asunto.indexOf('1689 -') === 0, true);
  esIgual('nombra el impuesto largo',
          asunto.indexOf('Declaración Autorretención de ICA NILO') > 0, true);
  esIgual('lleva la periodicidad', asunto.indexOf('MENSUAL') > 0, true);
  esIgual('lleva el valor', asunto.indexOf('$1.773.000') > 0, true);
  esIgual('lleva el consecutivo de giro', asunto.indexOf('LR-09-74') > 0, true);
  esIgual('y la marca, que es como se encuentra el hilo',
          asunto.indexOf('[SINAV-') > 0, true);

  // lo que falta para que el correo tenga sentido
  esIgual('completa no falta nada', faltaParaElCorreo(con({})).length, 0);
  esIgual('sin valor falta el valor',
          faltaParaElCorreo(con({ valor: '' })).length, 1);
  esIgual('un valor en cero tampoco sirve',
          faltaParaElCorreo(con({ valor: 0 })).length, 1);
  // el sobre viaja con ese numero: sin el, la oficina no sabe que recibe
  esIgual('sin adhesivo no sale el correo',
          faltaParaElCorreo(con({ adhesivo: '' }))[0], 'Sticker de correspondencia');
  // el consecutivo de giro NO se pide: lo asigna el envio
  esIgual('sin giro no se bloquea: se asigna al enviar',
          faltaParaElCorreo(con({ consecutivo_giro: '' })).length, 0);

  // LR-09-74: iniciales de quien envia, mes del PERIODO, consecutivo del mes
  esIgual('iniciales de nombre y apellido', inicialesDe('Liliana Ramirez'), 'LR');
  esIgual('con tilde tambien', inicialesDe('Andrea Galvis Díaz'), 'AG');
  esIgual('en minusculas', inicialesDe('jesus jaimes'), 'JJ');
  esIgual('un solo nombre', inicialesDe('Elizabeth'), 'EL');
  esIgual('vacio no revienta', inicialesDe(''), '');
  esIgual('nulo no revienta', inicialesDe(null), '');

  // aqui se trabaja MES VENCIDO: el mes es el del periodo, no el del envio,
  // y en los periodos largos es el ultimo mes, que es el que se declara
  esIgual('mensual', mesDelPeriodo('2026-09'), 9);
  esIgual('mensual de un digito', mesDelPeriodo('2026-9'), 9);
  esIgual('bimestre 5 son sept-oct: se declara octubre',
          mesDelPeriodo('2026-B5'), 10);
  esIgual('bimestre 1', mesDelPeriodo('2026-B1'), 2);
  esIgual('trimestre 3', mesDelPeriodo('2026-T3'), 9);
  esIgual('cuatrimestre 2', mesDelPeriodo('2026-C2'), 8);
  esIgual('anual cierra en diciembre', mesDelPeriodo('2026'), 12);
  esIgual('basura no inventa un mes', mesDelPeriodo('xyz'), 0);
  esIgual('vacio tampoco', mesDelPeriodo(''), 0);

  esIgual('el formato del ejemplo', formatoGiro('LR', 9, 74), 'LR-09-74');
  esIgual('mes de dos cifras', formatoGiro('AG', 11, 3), 'AG-11-03');
  esIgual('consecutivo largo', formatoGiro('HC', 12, 140), 'HC-12-140');

  // la cuenta es por persona y por mes del periodo
  esIgual('la clave separa personas',
          claveGiro('LR', 2026, 9) === claveGiro('AG', 2026, 9), false);
  esIgual('y separa meses',
          claveGiro('LR', 2026, 9) === claveGiro('LR', 2026, 10), false);

  // la dependencia vale como destinatario: es lo que desbloquea los
  // municipios que nunca tuvieron correo escrito
  esIgual('con dependencia se puede enviar',
          puedeEnviar({ estado: ESTADO.LISTA, soporte_id: 'x', requiere_envio: 'SI',
                        correo_oficina: '', cod_oficina: '1689' }).ok, true);
  esIgual('sin correo NI dependencia, no',
          puedeEnviar({ estado: ESTADO.LISTA, soporte_id: 'x', requiere_envio: 'SI',
                        correo_oficina: '', cod_oficina: '' }).ok, false);
  esIgual('y lo dice',
          puedeEnviar({ estado: ESTADO.LISTA, soporte_id: 'x', requiere_envio: 'SI',
                        correo_oficina: '', cod_oficina: '' }).motivo,
          'sin correo ni dependencia');

  // los adhesivos del archivo de correspondencia
  esIgual('ADHESIVO Sept es septiembre', mesDeEncabezado('ADHESIVO Sept'), 9);
  esIgual('con espacio al final tambien', mesDeEncabezado('ADHESIVO Agosto '), 8);
  esIgual('Label Febrero tambien cuenta', mesDeEncabezado('Label Febrero '), 2);
  esIgual('una columna que no es de adhesivos, no',
          mesDeEncabezado('DESCRIPCION CARTERO'), 0);
  esIgual('un numero de adhesivo', adhesivoValido('55285303.0'), '55285303');
  esIgual('REGISTRADO EN CARTERO no es un adhesivo',
          adhesivoValido('REGISTRADO EN CARTERO'), '');
  esIgual('#N/A tampoco', adhesivoValido('#N/A'), '');
  esIgual('vacio tampoco', adhesivoValido(''), '');
}

/**
 * Los consecutivos no se inventan: cada municipio tiene el suyo y lo unico
 * que cambia de un periodo a otro es el mes. Revisoria busca esos numeros.
 */
function pruebasConcepto25(esIgual) {
  esIgual('solo cambia el mes', giroDesdePlantilla('LR-09-74', 10), 'LR-10-74');
  esIgual('el mes se rellena a dos cifras',
          giroDesdePlantilla('LR-09-74', 3), 'LR-03-74');
  esIgual('un prefijo con año tambien funciona',
          giroDesdePlantilla('HC26-10-141', 11), 'HC26-11-141');
  esIgual('el numero del municipio no se toca',
          giroDesdePlantilla('AG-10-116', 12), 'AG-12-116');
  esIgual('sin mes se devuelve igual',
          giroDesdePlantilla('LR-09-74', 0), 'LR-09-74');
  esIgual('algo que no es una plantilla no revienta',
          giroDesdePlantilla('XYZ', 10), 'XYZ');
  esIgual('vacio tampoco', giroDesdePlantilla('', 10), '');

  // las claves se escriben sin tildes y sin dobles espacios
  esIgual('clave normal', claveConcepto('NILO', 'ICA'), 'NILO|ICA');
  esIgual('con tilde', claveConcepto('Medellín', 'ICA'), 'MEDELLIN|ICA');
  esIgual('con enie', claveConcepto('Muña', 'ICA'), 'MUNA|ICA');
  esIgual('con espacios de sobra', claveConcepto('  SAN  GIL ', 'ICA'), 'SAN GIL|ICA');
  esIgual('sin impuesto, solo el municipio', claveConcepto('NILO', ''), 'NILO');

  // las tablas de verdad, que son las que se van a usar
  esIgual('NILO tiene consecutivo de ICA',
          !!CONSECUTIVOS['NILO|ICA'], true);
  esIgual('y su numero es el 74',
          CONSECUTIVOS['NILO|ICA'].split('-').pop(), '74');
  esIgual('ABEJORRAL tiene el de RETEICA',
          CONSECUTIVOS['ABEJORRAL|RETEICA'].split('-').pop(), '141');
  esIgual('hay mas de 300 consecutivos',
          Object.keys(CONSECUTIVOS).length > 300, true);

  esIgual('TOCANCIPA paga por PSE', formaPagoDe('TOCANCIPA'), 'PSE');
  esIgual('FILANDIA por transferencia', formaPagoDe('FILANDIA'), 'TRANSFERENCIA');
  esIgual('PALESTINA en oficina', formaPagoDe('PALESTINA'), 'OFICINA');
  esIgual('un municipio que no esta, vacio', formaPagoDe('NARNIA'), '');

  // el consecutivo de una obligacion lleva el mes de SU periodo
  esIgual('bimestre 5 se declara en octubre',
          consecutivoDe('NILO', 'ICA', '2026-B5').split('-')[1], '10');
  esIgual('mensual de noviembre',
          consecutivoDe('NILO', 'ICA', '2026-11').split('-')[1], '11');
  esIgual('un municipio sin tabla no inventa nada',
          consecutivoDe('NARNIA', 'ICA', '2026-11'), '');
}

/** El directorio de oficinas: 317 municipios con sus correos. */
function pruebasCorreosOficina(esIgual) {
  // el DANE se escribe con cinco cifras: 5002 es 05002, no 5002
  esIgual('cinco cifras con cero delante', dane5('5002'), '05002');
  esIgual('el que ya viene bien no cambia', dane5('19698'), '19698');
  esIgual('acepta numero', dane5(5002), '05002');
  esIgual('el .0 que deja Sheets se cae', dane5('05002.0'), '05002');
  esIgual('vacio no revienta', dane5(''), '');
  esIgual('nulo tampoco', dane5(null), '');

  esIgual('Santander de Quilichao tiene correos',
          !!correosDeOficina('19698'), true);
  esIgual('y el director va primero',
          correosDeOficina('19698').split(',')[0], 'director0118@davivienda.com');
  esIgual('el subdirector va segundo',
          correosDeOficina('19698').split(',')[1], 'subdirector0118@davivienda.com');
  esIgual('un municipio que no esta, vacio', correosDeOficina('99999'), '');

  esIgual('hay mas de 300 municipios con correo',
          Object.keys(CORREOS_OFICINA).length > 300, true);
  esIgual('todos los correos son del banco o de una alcaldia',
          Object.keys(CORREOS_OFICINA).every(function (k) {
            return CORREOS_OFICINA[k].indexOf('@') > 0;
          }), true);
  esIgual('ningun municipio quedo con la lista vacia',
          Object.keys(CORREOS_OFICINA).every(function (k) {
            return CORREOS_OFICINA[k].length > 5;
          }), true);

  esIgual('Quilichao paga en oficina', pagoDeOficina('19698'), 'OFICINA');
}

/**
 * El DANE leido como fecha.
 *
 * Si la columna del codigo en CALENDARIO quedo con formato de fecha, la hoja
 * guarda 5659 pero devuelve «29 de junio de 1915», y entonces el municipio de
 * una obligacion es una fecha y su id tambien. Se deshace la conversion: el
 * numero de serie de la hoja ES el codigo.
 */
function pruebasCodigoComoFecha(esIgual) {
  esIgual('el origen de la hoja es el 30/12/1899',
          diasDesdeElOrigen(new Date(1899, 11, 30)), 0);
  esIgual('el 31/12/1899 es el dia 1',
          diasDesdeElOrigen(new Date(1899, 11, 31)), 1);

  esIgual('29/06/1915 era el DANE 05659',
          normCodigo(new Date(1915, 5, 29), 5), '05659');
  esIgual('01/11/1942 era el 15646',
          normCodigo(new Date(1942, 10, 1), 5), '15646');
  esIgual('05/04/2049 era el 54518',
          normCodigo(new Date(2049, 3, 5), 5), '54518');
  esIgual('y dane5 tambien lo deshace',
          dane5(new Date(1915, 5, 29)), '05659');

  esIgual('una fecha invalida no inventa un codigo',
          normCodigo(new Date('x'), 5), '');
  esIgual('una fecha anterior al origen tampoco',
          normCodigo(new Date(1800, 0, 1), 5), '');

  // lo de siempre sigue igual
  esIgual('un codigo normal no se toca', normCodigo('05001', 5), '05001');
  esIgual('y se rellena con ceros', normCodigo('851', 4), '0851');

  // los ids mal formados se reconocen
  esIgual('un id bueno', idEsValido('05001|ICA|GENERAL|2026-11'), true);
  esIgual('uno con fecha por DANE',
          idEsValido('Mon Apr 05 2049 00:00:00 GMT-0500|RETEICA|GENERAL|2026-11'), false);
  esIgual('vacio no es valido', idEsValido(''), false);
}
