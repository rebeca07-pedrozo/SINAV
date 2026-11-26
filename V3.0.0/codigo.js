/**
 * SINAV · codigo.js — el núcleo.
 *
 * ---------------------------------------------------------------------------
 * LO QUE HAY QUE SABER ANTES DE TOCAR ESTO
 *
 * 1. Cada profesional tiene SU hoja, con el mes en curso y nada mas. Antes
 *    habia una sola con el año entero y el libro la leia completa en cada
 *    pantalla. Por eso iba lento.
 *
 * 2. Las reglas de estado son puras: reciben la fila y devuelven si se puede
 *    o no. Ni leen hojas ni escriben. Asi se pueden probar sin un libro.
 *
 * 3. Los permisos se validan AQUI, en el servidor. Que la interfaz esconda un
 *    boton no es seguridad: una llamada directa a la API tiene que fallar
 *    igual.
 *
 * 4. Las escrituras van por bloques. Una llamada a setValues con mil filas
 *    tarda lo mismo que una con una sola.
 */

/* ===========================================================================
   1. LAS HOJAS Y SUS COLUMNAS
   =========================================================================== */

var HOJA = {
  CALENDARIO: 'CALENDARIO',
  CODIGOS: 'CODIGOSYCORREOS',
  ADHESIVOS: 'ADHESIVOS',
  USUARIOS: 'USUARIOS',
  CONFIG: 'CONFIG',
  AUSENCIAS: 'AUSENCIAS',
  EVENTOS: 'EVENTOS'
};

/**
 * Las columnas de la hoja de cada profesional.
 *
 * El orden importa y lo nuevo va SIEMPRE al final: asegurarHojas() reescribe
 * la fila 1 sin mover los datos, y una columna metida en la mitad desalinea
 * todo lo que ya esta escrito debajo.
 */
var COLS_MES = [
  'id', 'cod_dane', 'municipio', 'impuesto', 'periodicidad', 'periodo',
  'vencimiento', 'nit', 'cod_oficina', 'correos', 'forma_pago',
  'consecutivo', 'adhesivo', 'valor', 'estado',
  'soporte_id', 'soporte_revisado', 'hilo_id', 'sellado_id',
  'fecha_envio', 'fecha_respuesta', 'ultimo_mensaje', 'nota'
];

/** Las que son codigos y tienen que quedarse en texto. */
var COLS_TEXTO_MES = ['cod_dane', 'cod_oficina', 'nit', 'periodo', 'consecutivo',
                      'adhesivo', 'soporte_id', 'soporte_revisado', 'hilo_id',
                      'sellado_id', 'ultimo_mensaje'];

var COLS_EVENTOS = ['fecha', 'id_obligacion', 'actor', 'que_paso', 'detalle'];

var COLS_AUSENCIAS = ['id', 'correo_ausente', 'desde', 'hasta', 'correo_backup',
                      'estado', 'movidas', 'registrada_por', 'registrada_el',
                      'cerrada_el', 'nota'];

/* ===========================================================================
   2. LOS ESTADOS
   =========================================================================== */

var ESTADO = {
  PENDIENTE: 'PENDIENTE',     // existe, falta el soporte
  LISTA: 'LISTA',             // tiene soporte, se puede enviar
  ENVIADA: 'ENVIADA',         // salio el correo
  RESPONDIDA: 'RESPONDIDA',   // la oficina contesto
  APROBADA: 'APROBADA',       // cerrada
  DEVUELTA: 'DEVUELTA'        // hay que rehacerla
};

/** A donde puede ir cada estado. Lo que no este aqui, no pasa. */
var TRANSICIONES = {
  PENDIENTE: ['LISTA'],
  LISTA: ['ENVIADA', 'PENDIENTE'],
  ENVIADA: ['RESPONDIDA', 'DEVUELTA'],
  RESPONDIDA: ['APROBADA', 'DEVUELTA'],
  APROBADA: [],
  DEVUELTA: ['LISTA', 'PENDIENTE']
};

/** En estos todavia se puede cambiar el soporte. */
var ESTADOS_ADMITEN_SOPORTE = ['PENDIENTE', 'LISTA', 'DEVUELTA'];

/** En estos todavia tiene sentido mirar el hilo del correo. */
function estadosEsperanRespuesta() {
  return [ESTADO.ENVIADA, ESTADO.RESPONDIDA];
}

var EVENTO = {
  CREADA: 'CREADA', ASIGNADA: 'ASIGNADA', SOPORTE_CARGADO: 'SOPORTE_CARGADO',
  ENVIADA: 'ENVIADA', RESPONDIDA: 'RESPONDIDA', APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA', CORREO_GUARDADO: 'CORREO_GUARDADO',
  ALTA_AUTOMATICA: 'ALTA_AUTOMATICA', ERROR: 'ERROR', AVISO: 'AVISO'
};

/* ===========================================================================
   3. LOS PERFILES
   =========================================================================== */

var PERFIL = {
  ADMIN: 'ADMIN',
  PROFESIONAL_I: 'PROFESIONAL-I',
  PROFESIONAL_II: 'PROFESIONAL-II',
  PROFESIONAL_III: 'PROFESIONAL-III'
};

/** Quien supervisa: ve las tres hojas y puede cerrar obligaciones. */
var SUPERVISORES = [PERFIL.ADMIN, PERFIL.PROFESIONAL_III];

var PERMISO = {
  verTodo: SUPERVISORES,
  aprobar: SUPERVISORES,
  enviarAjenas: SUPERVISORES,
  gestionarAusencias: SUPERVISORES,
  configurar: [PERFIL.ADMIN]
};

/* ===========================================================================
   4. ACCESO A LAS HOJAS

   Todo pasa por aqui. Nadie llama a SpreadsheetApp directamente fuera de
   esta seccion: asi hay un solo sitio donde arreglar las cosas.
   =========================================================================== */

var _libro = null;
var _cacheConfig = null;

function libro() {
  if (!_libro) _libro = SpreadsheetApp.getActive();
  return _libro;
}

function hoja(nombre) {
  var h = libro().getSheetByName(nombre);
  if (!h) throw new Error('No existe la hoja ' + nombre + '. Corre instalar().');
  return h;
}

/** Los encabezados de una hoja: nombre -> posicion. */
function indices(nombre) {
  var h = hoja(nombre);
  var cab = h.getRange(1, 1, 1, Math.max(h.getLastColumn(), 1)).getValues()[0];
  var ix = {};
  cab.forEach(function (c, i) {
    var k = String(c).trim();
    if (k && !(k in ix)) ix[k] = i;
  });
  return ix;
}

/** Corta con un mensaje util si falta una columna. */
function exigeColumna(ix, nombre, enHoja) {
  if (ix && typeof ix[nombre] === 'number') return ix[nombre];
  throw new Error('A la hoja ' + (enHoja || '') + ' le falta la columna «' +
    nombre + '».\n\nCorre instalar(): crea las columnas que falten sin tocar ' +
    'los datos que ya están escritos.');
}

/** Las filas de datos, sin el encabezado. Una sola lectura. */
function filas(nombre) {
  var h = hoja(nombre);
  var n = h.getLastRow() - 1;
  if (n < 1) return [];
  return h.getRange(2, 1, n, Math.max(h.getLastColumn(), 1)).getValues();
}

/** Lo mismo, pero como objetos. Trae _fila para poder escribir despues. */
function registros(nombre) {
  var ix = indices(nombre);
  var claves = Object.keys(ix);
  return filas(nombre).map(function (f, i) {
    var o = { _fila: i + 2, _hoja: nombre };
    claves.forEach(function (k) { o[k] = f[ix[k]]; });
    return o;
  });
}

/** Escribe unos campos de una fila. Una llamada por campo, pocas filas. */
function escribirCampos(nombre, fila, campos) {
  var ix = indices(nombre);
  var h = hoja(nombre);
  Object.keys(campos).forEach(function (k) {
    if (!(k in ix)) return;
    h.getRange(fila, ix[k] + 1).setValue(campos[k]);
  });
}

/** Agrega filas al final de una hoja, de un golpe. */
function agregarFilas(nombre, matriz) {
  if (!matriz.length) return;
  var h = hoja(nombre);
  h.getRange(h.getLastRow() + 1, 1, matriz.length, matriz[0].length).setValues(matriz);
}

/**
 * Dos personas escribiendo a la vez se pisan. El cerrojo las pone en fila.
 * Treinta segundos: si en treinta segundos no se pudo, algo esta mal y es
 * mejor fallar que escribir encima.
 */
function conCerrojo(fn) {
  var cerrojo = LockService.getScriptLock();
  if (!cerrojo.tryLock(30000)) {
    throw new Error('El libro está ocupado. Vuelve a intentarlo en un momento.');
  }
  try {
    return fn();
  } finally {
    cerrojo.releaseLock();
  }
}

/** Un parametro de CONFIG. Se lee una vez por ejecucion. */
function config(clave) {
  if (!_cacheConfig) {
    _cacheConfig = {};
    var h = libro().getSheetByName(HOJA.CONFIG);
    if (h && h.getLastRow() > 1) {
      h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach(function (f) {
        var k = String(f[0]).trim();
        if (k) _cacheConfig[k] = f[1];
      });
    }
  }
  var v = _cacheConfig[clave];
  return v === undefined || v === null ? '' : String(v).trim();
}

function guardarConfig(clave, valor) {
  exige('configurar');
  escribirParametro(clave, valor);      // de ENTORNO.js
  _cacheConfig = null;
  return true;
}

function hoy() { return new Date(); }

/**
 * La zona horaria, como FUNCION y no como var.
 *
 * Un `var` en el nivel superior que llama a un servicio se evalua al cargar
 * el archivo, y en Apps Script el orden de carga no esta garantizado: si ese
 * servicio no esta listo, revienta el proyecto entero con un error que no
 * dice cual es el archivo culpable. Ya paso una vez.
 */
function TZ() {
  return Session.getScriptTimeZone();
}

function fechaTexto(d) {
  if (!d) return '';
  var f = d instanceof Date ? d : normFecha(d);
  return f ? Utilities.formatDate(f, TZ(), 'yyyy-MM-dd') : '';
}

function fechaHoraTexto(d) {
  if (!d) return '';
  var f = d instanceof Date ? d : normFecha(d);
  return f ? Utilities.formatDate(f, TZ(), 'yyyy-MM-dd HH:mm') : '';
}

/** Una fecha de verdad, venga como venga. */
function normFecha(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = String(v).trim();
  if (!s) return null;
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Un valor en pesos, venga con $ o con puntos. */
function normValor(v) {
  if (v === null || v === undefined || v === '') return '';
  var s = String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '')
                   .replace(',', '.');
  var n = Number(s);
  return isNaN(n) ? '' : Math.round(n);
}

/* ===========================================================================
   5. QUIEN SOY Y QUE PUEDO

   El rol se resuelve aqui y solo aqui. Si algun dia hay que cambiar como se
   decide quien puede que, se cambia en un sitio.
   =========================================================================== */

var _yo = null;

/** Quien esta usando la aplicacion, con su perfil ya resuelto. */
function yo() {
  if (_yo) return _yo;

  var correo = '';
  try { correo = String(Session.getActiveUser().getEmail() || '').toLowerCase(); }
  catch (e) { correo = ''; }

  _yo = { correo: correo, nombre: '', rol: '', area: '', nivel: '',
          perfil: '', activo: false, hoja: '' };
  if (!correo) return _yo;

  var ix = indices(HOJA.USUARIOS);
  var fila = filas(HOJA.USUARIOS).filter(function (f) {
    return String(f[ix.correo] || '').trim().toLowerCase() === correo;
  })[0];
  if (!fila) return _yo;

  _yo.nombre = String(fila[ix.nombre] || '');
  _yo.rol = limpiar(fila[ix.rol]);
  _yo.area = 'area' in ix ? limpiar(fila[ix.area]) : '';
  _yo.nivel = 'nivel' in ix ? limpiar(fila[ix.nivel]) : '';
  _yo.activo = limpiar(fila[ix.activo]) !== 'NO';
  _yo.perfil = perfilDe(_yo);
  _yo.hoja = hojaDe(correo);
  return _yo;
}

/** El perfil es el rol mas el nivel: ADMIN, PROFESIONAL-I, -II, -III. */
function perfilDe(q) {
  if (!q || !q.rol) return '';
  if (q.rol === PERFIL.ADMIN) return PERFIL.ADMIN;
  var n = (q.nivel || 'I').replace(/[^IV]/g, '') || 'I';
  return 'PROFESIONAL-' + n;
}

function puede(accion) {
  var q = yo();
  if (!q.activo) return false;
  var perfiles = PERMISO[accion];
  if (!perfiles) throw new Error('Acción desconocida: ' + accion);
  return perfiles.indexOf(q.perfil) >= 0;
}

function exige(accion) {
  if (!puede(accion)) {
    throw new Error('Tu perfil (' + (yo().perfil || 'sin perfil') +
                    ') no puede: ' + accion);
  }
  return true;
}

/**
 * El correo que entra por primera vez queda inscrito solo, con el perfil por
 * defecto. Subirlo de nivel es a mano, en USUARIOS: dar permisos solo se hace
 * a proposito.
 */
function asegurarAlta() {
  var correo = '';
  try { correo = String(Session.getActiveUser().getEmail() || '').toLowerCase(); }
  catch (e) { return false; }
  if (!correo) return false;

  var dominio = config('dominio_oficinas') || 'davivienda.com';
  if (correo.slice(-(dominio.length + 1)) !== '@' + dominio) return false;

  var ix = indices(HOJA.USUARIOS);
  var existe = filas(HOJA.USUARIOS).some(function (f) {
    return String(f[ix.correo] || '').trim().toLowerCase() === correo;
  });
  if (existe) return false;

  var nueva = [];
  for (var i = 0; i < Object.keys(ix).length; i++) nueva.push('');
  nueva[ix.correo] = correo;
  if ('nombre' in ix) nueva[ix.nombre] = correo.split('@')[0].replace(/[._]/g, ' ');
  if ('rol' in ix) nueva[ix.rol] = config('rol_defecto') || 'PROFESIONAL';
  if ('area' in ix) nueva[ix.area] = config('area_defecto') || 'MUNICIPALES';
  if ('nivel' in ix) nueva[ix.nivel] = config('nivel_defecto') || 'I';
  if ('activo' in ix) nueva[ix.activo] = 'SI';

  agregarFilas(HOJA.USUARIOS, [nueva]);
  registrar('', EVENTO.ALTA_AUTOMATICA, 'alta automática de ' + correo);
  _yo = null;
  return true;
}

/* ---------------------------------------------------------------------------
   LAS HOJAS DE CADA PROFESIONAL

   Cada uno declara la suya en su propio archivo (yasneidy.js, jesus.js,
   helen.js). Se consultan con typeof y no con una lista escrita aqui, para
   que agregar a alguien sea crear un archivo y nada mas.
   --------------------------------------------------------------------------- */

/**
 * Los profesionales declarados.
 *
 * Se pregunta con typeof por cada uno, que es lo unico seguro: typeof sobre
 * algo que no existe no revienta, asi que si un archivo no esta pegado
 * simplemente no aparece, y el resto sigue funcionando.
 */
function profesionales() {
  var salida = [];
  if (typeof perfilYasneidy === 'function') salida.push(perfilYasneidy());
  if (typeof perfilJesus === 'function') salida.push(perfilJesus());
  if (typeof perfilHelen === 'function') salida.push(perfilHelen());
  return salida.filter(function (p) { return p && p.hoja; });
}

/** La hoja de una persona, o '' si no tiene. */
function hojaDe(correo) {
  var c = String(correo || '').trim().toLowerCase();
  var p = profesionales().filter(function (x) {
    return String(x.correo || '').toLowerCase() === c;
  })[0];
  return p ? p.hoja : '';
}

/** Las hojas que yo puedo ver: la mia, o todas si superviso. */
function misHojas() {
  var q = yo();
  if (puede('verTodo')) {
    return profesionales().map(function (p) { return p.hoja; });
  }
  return q.hoja ? [q.hoja] : [];
}

/* ===========================================================================
   6. EL REGISTRO

   Append-only: nadie borra ni edita EVENTOS, solo agrega. Es lo que permite
   explicar meses despues por que una declaracion salio cuando salio.
   =========================================================================== */

function registrar(idObligacion, quePaso, detalle) {
  try {
    agregarFilas(HOJA.EVENTOS, [[new Date(), String(idObligacion || ''),
      yo().correo || 'sistema', quePaso, String(detalle || '')]]);
  } catch (e) {
    // que no se pueda anotar no puede tumbar lo que se estaba haciendo
  }
}

function registrarVarios(lista) {
  if (!lista.length) return;
  try {
    var actor = yo().correo || 'sistema';
    var ahora = new Date();
    agregarFilas(HOJA.EVENTOS, lista.map(function (e) {
      return [ahora, String(e.id || ''), actor, e.quePaso, String(e.detalle || '')];
    }));
  } catch (e) { /* idem */ }
}

/* ===========================================================================
   7. LAS REGLAS

   Puras: reciben la fila y devuelven si se puede o no. Ni leen hojas ni
   escriben. Se pueden probar sin un libro delante.
   =========================================================================== */

function puedePasar(de, a) {
  var salidas = TRANSICIONES[String(de || '').trim().toUpperCase()];
  return !!salidas && salidas.indexOf(String(a || '').trim().toUpperCase()) >= 0;
}

/** Varios ids de Drive en una celda, separados por coma. */
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
 * Se puede SELECCIONAR esta fila para enviarla.
 *
 * La revision del soporte NO entra aqui a proposito: si entrara, no se podria
 * seleccionar nada para llegar a revisarlo. Es la ultima puerta, no la
 * primera.
 */
function puedeEnviar(fila) {
  var f = fila || {};

  if (!listaIds(f.soporte_id).length) {
    return { ok: false, motivo: 'pendiente cargar el soporte' };
  }
  if (String(f.estado || '').toUpperCase() !== ESTADO.LISTA) {
    return { ok: false, motivo: 'en estado ' + (f.estado || 'vacío') +
                                '. El envío solo procede desde LISTA' };
  }
  if (!normCorreos(f.correos) && !destinoPorDependencia(f)) {
    return { ok: false, motivo: 'sin correo de oficina registrado' };
  }
  return { ok: true, motivo: '' };
}

/** TODOS los archivos adjuntos tienen que estar revisados. */
function soporteRevisado(fila) {
  var f = fila || {};
  var tiene = listaIds(f.soporte_id);
  if (!tiene.length) return false;
  var vistos = {};
  listaIds(f.soporte_revisado).forEach(function (x) { vistos[x] = true; });
  for (var i = 0; i < tiene.length; i++) if (!vistos[tiene[i]]) return false;
  return true;
}

/** Lo que le falta a una obligacion para que el correo tenga sentido. */
function faltaParaElCorreo(fila) {
  var f = fila || {};
  var falta = [];
  if (!Number(normValor(f.valor))) falta.push('valor liquidado');
  if (!String(f.adhesivo || '').trim()) falta.push('sticker de correspondencia');
  return falta;
}

/** Valida un cambio de estado contra el grafo y contra los datos. */
function validarPaso(fila, a, perfil) {
  var de = String(fila.estado || '').toUpperCase();
  a = String(a || '').toUpperCase();

  if (de === a) return { ok: false, motivo: 'ya está en ' + a };
  if (!puedePasar(de, a)) {
    return { ok: false, motivo: 'no se puede pasar de ' + de + ' a ' + a };
  }
  if (a === ESTADO.LISTA && !listaIds(fila.soporte_id).length) {
    return { ok: false, motivo: 'sin soporte no hay envío' };
  }
  if (a === ESTADO.ENVIADA) {
    var e = puedeEnviar(fila);
    if (!e.ok) return { ok: false, motivo: e.motivo };
    if (!soporteRevisado(fila)) {
      return { ok: false, motivo: 'falta verificar el soporte' };
    }
    var falta = faltaParaElCorreo(fila);
    if (falta.length) return { ok: false, motivo: 'faltan datos: ' + falta.join(', ') };
  }
  if (a === ESTADO.APROBADA && SUPERVISORES.indexOf(perfil) < 0) {
    return { ok: false, motivo: 'solo un supervisor cierra una obligación' };
  }
  return { ok: true, motivo: '' };
}

/* ===========================================================================
   8. A QUIEN LE LLEGA EL CORREO

   Dos caminos, en este orden:
     1. los correos escritos en CODIGOSYCORREOS para ese municipio
     2. si no hay, la dependencia: director<dep>@ y subdirector<dep>@
   Si no hay ninguno de los dos, la pantalla pide el correo y lo guarda.
   =========================================================================== */

/** El destino que se puede armar con la dependencia, o ''. */
function destinoPorDependencia(fila) {
  var dep = String((fila || {}).cod_oficina || '').trim().replace(/^0+/, '');
  if (!dep) return '';
  var dominio = config('dominio_oficinas') || 'davivienda.com';
  return 'director' + dep + '@' + dominio + ',' +
         'subdirector' + dep + '@' + dominio;
}

/** A donde va el correo de una obligacion. */
function destinatariosDe(fila) {
  return normCorreos((fila || {}).correos) || destinoPorDependencia(fila);
}

/** Las copias fijas de CONFIG. */
function copiasFijas() {
  return normCorreos(config('copias_fijas'));
}

/**
 * CODIGOSYCORREOS indexada: 'DANE|IMPUESTO' y 'DANE|TODAS'.
 * Se lee una vez por ejecucion.
 */
var _cacheCodigos = null;

function codigosYCorreos() {
  if (_cacheCodigos) return _cacheCodigos;
  _cacheCodigos = {};
  var h = libro().getSheetByName(HOJA.CODIGOS);
  if (!h || h.getLastRow() < 2) return _cacheCodigos;

  var ix = indices(HOJA.CODIGOS);
  filas(HOJA.CODIGOS).forEach(function (f) {
    var dane = normCodigo(f[ix.cod_dane], 5);
    if (!dane) return;
    var imp = normImpuesto(f[ix.obligacion]) || 'TODAS';
    _cacheCodigos[dane + '|' + imp] = {
      cod_oficina: normCodigo(f[ix.cod_oficina], 4),
      municipio: String(f[ix.municipio] || '').trim(),
      correos: normCorreos(f[ix.correos]),
      forma_pago: normFormaPago(f[ix.forma_pago])
    };
  });
  return _cacheCodigos;
}

/** Lo que sabemos de un municipio para un impuesto. Lo especifico manda. */
function datosDe(codDane, impuesto) {
  var t = codigosYCorreos();
  var dane = normCodigo(codDane, 5);
  return t[dane + '|' + impuesto] || t[dane + '|TODAS'] ||
         { cod_oficina: '', municipio: '', correos: '', forma_pago: '' };
}

/**
 * Guarda un correo que faltaba, para no volver a pedirlo nunca.
 *
 * Escribe en CODIGOSYCORREOS, que es la memoria, y de paso en la obligacion
 * que se esta trabajando, para que se pueda enviar ya mismo.
 */
function apiGuardarCorreo(id, correosEscritos) {
  var correos = normCorreos(correosEscritos);
  if (!correos) throw new Error('Eso no parece un correo. Ejemplo: alguien@municipio.gov.co');

  var o = buscarObligacion(id);
  if (!o) throw new Error('No existe la obligación ' + id);
  exigeMia(o);

  return conCerrojo(function () {
    // 1. la memoria
    var h = libro().getSheetByName(HOJA.CODIGOS);
    var ix = indices(HOJA.CODIGOS);
    var dane = normCodigo(o.cod_dane, 5);
    var fila = 0;
    filas(HOJA.CODIGOS).forEach(function (f, i) {
      if (fila) return;
      if (normCodigo(f[ix.cod_dane], 5) !== dane) return;
      var imp = normImpuesto(f[ix.obligacion]);
      if (imp === o.impuesto || imp === 'TODAS') fila = i + 2;
    });

    if (fila) {
      h.getRange(fila, ix.correos + 1).setValue(correos);
    } else {
      var nueva = [];
      for (var i = 0; i < Object.keys(ix).length; i++) nueva.push('');
      nueva[ix.cod_dane] = dane;
      if ('cod_oficina' in ix) nueva[ix.cod_oficina] = o.cod_oficina || '';
      if ('municipio' in ix) nueva[ix.municipio] = o.municipio || '';
      if ('obligacion' in ix) nueva[ix.obligacion] = o.impuesto || '';
      nueva[ix.correos] = correos;
      agregarFilas(HOJA.CODIGOS, [nueva]);
    }
    _cacheCodigos = null;

    // 2. la obligacion que se esta trabajando
    escribirCampos(o._hoja, o._fila, { correos: correos });
    registrar(id, EVENTO.CORREO_GUARDADO,
              o.municipio + ' ' + o.impuesto + ': ' + correos);

    return { id: id, correos: correos };
  });
}

/* ===========================================================================
   9. LAS OBLIGACIONES DEL MES
   =========================================================================== */

/** Busca una obligacion por id en las hojas que puedo ver. */
function buscarObligacion(id) {
  var buscado = String(id || '').trim();
  var hojas = misHojas();
  for (var i = 0; i < hojas.length; i++) {
    var ix = indices(hojas[i]);
    var datos = filas(hojas[i]);
    for (var f = 0; f < datos.length; f++) {
      if (String(datos[f][ix.id]).trim() === buscado) {
        var o = { _fila: f + 2, _hoja: hojas[i] };
        Object.keys(ix).forEach(function (k) { o[k] = datos[f][ix[k]]; });
        return o;
      }
    }
  }
  return null;
}

/** Corta si la obligacion no es mia y no tengo permiso para las ajenas. */
function exigeMia(o) {
  if (puede('enviarAjenas')) return true;
  if (o._hoja === yo().hoja) return true;
  throw new Error('Esa obligación es de otra persona.');
}

/** Lo que la pantalla necesita de cada obligacion. */
function decorar(o) {
  var vence = normFecha(o.vencimiento);
  var dias = null;
  if (vence) {
    var h0 = new Date(); h0.setHours(0, 0, 0, 0);
    var v0 = new Date(vence); v0.setHours(0, 0, 0, 0);
    dias = Math.round((v0 - h0) / 86400000);
  }

  var env = puedeEnviar(o);
  var soportes = listaIds(o.soporte_id);

  var nivel = 'neutro';
  if (o.estado === ESTADO.APROBADA) nivel = 'aldia';
  else if (dias !== null && dias < 0) nivel = 'vencido';
  else if (dias !== null && dias <= 4) nivel = 'porvencer';
  else if (o.estado === ESTADO.ENVIADA || o.estado === ESTADO.RESPONDIDA) nivel = 'aldia';

  return {
    id: String(o.id),
    hoja: o._hoja,
    cod_dane: String(o.cod_dane || ''),
    municipio: String(o.municipio || ''),
    impuesto: String(o.impuesto || ''),
    periodicidad: String(o.periodicidad || ''),
    periodo: String(o.periodo || ''),
    vencimiento: fechaTexto(o.vencimiento),
    dias: dias,
    nit: String(o.nit || ''),
    cod_oficina: String(o.cod_oficina || ''),
    correos: normCorreos(o.correos),
    destinatarios: destinatariosDe(o),
    pide_correo: !normCorreos(o.correos) && !destinoPorDependencia(o),
    forma_pago: String(o.forma_pago || ''),
    consecutivo: String(o.consecutivo || ''),
    adhesivo: String(o.adhesivo || ''),
    valor: o.valor === '' || o.valor === null ? null : Number(o.valor),
    estado: String(o.estado || ''),
    soportes: soportes.length,
    soporte_revisado: soporteRevisado(o),
    enviable: env.ok,
    motivo: env.motivo,
    falta: faltaParaElCorreo(o),
    tiene_envio: !!String(o.hilo_id || '').trim(),
    tiene_sellado: !!listaIds(o.sellado_id).length,
    fecha_envio: fechaHoraTexto(o.fecha_envio),
    fecha_respuesta: fechaHoraTexto(o.fecha_respuesta),
    nota: String(o.nota || ''),
    nivel: nivel
  };
}

/** Todas las obligaciones que puedo ver, ya decoradas. */
function listarMias() {
  var salida = [];
  misHojas().forEach(function (nombre) {
    var h = libro().getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;
    registros(nombre).forEach(function (o) {
      if (!String(o.id || '').trim()) return;
      salida.push(decorar(o));
    });
  });
  salida.sort(function (a, b) {
    return String(a.vencimiento).localeCompare(String(b.vencimiento));
  });
  return salida;
}

/* ===========================================================================
   10. EL SOPORTE

   Un PDF con el nombre correcto puede llevar dentro la declaracion de otro
   municipio. Eso no se descubre hasta que la oficina lo recibe, y para
   entonces ya se mando lo de un municipio a la alcaldia de otro. Por eso hay
   que VERLO antes de que salga el correo.
   =========================================================================== */

var MINIMO_ADJUNTO = 512;      // por debajo son firmas y logos, no documentos
var MAX_SOPORTES = 10;
var MAX_ADJUNTO_MB = 24;       // Gmail corta en 25

/** La carpeta donde va el soporte: <clase>/<municipio>/<impuesto>. */
function carpetaDe(clase, municipio, impuesto) {
  var id = config(clase === 'sellados' ? 'carpeta_sellados'
                : (impuesto === 'EXOGENA' ? 'carpeta_exogenas' : 'carpeta_soportes'));
  if (!id) throw new Error('Falta la carpeta ' + clase + ' en CONFIG.');

  var raiz;
  try { raiz = DriveApp.getFolderById(String(id).trim()); }
  catch (e) { throw new Error('No se pudo abrir la carpeta ' + id + ': ' + e.message); }

  return subcarpeta(subcarpeta(raiz, nombreCarpeta(municipio)), nombreCarpeta(impuesto));
}

function subcarpeta(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function nombreCarpeta(v) {
  var s = String(v || '').replace(/[\\\/]+/g, '-').replace(/\s+/g, ' ').trim();
  return s || 'SIN DATO';
}

/**
 * Sube un soporte. agregar = true lo añade a los que ya hay.
 *
 * El visto bueno es POR ARCHIVO: los que ya se revisaron siguen revisados y
 * el nuevo nace sin revisar, asi que el envio se vuelve a frenar hasta que
 * alguien lo mire.
 */
function apiSubirSoporte(id, nombre, tipo, datosBase64, agregar) {
  if (!id) throw new Error('Falta el id de la obligación.');
  if (!datosBase64) throw new Error('Llegó vacío el archivo ' + nombre);

  var o = buscarObligacion(id);
  if (!o) throw new Error('No existe la obligación ' + id);
  exigeMia(o);

  var estado = String(o.estado || '').toUpperCase();
  if (ESTADOS_ADMITEN_SOPORTE.indexOf(estado) < 0) {
    throw new Error('No se cambia el soporte de una obligación en ' + estado + '.');
  }

  // Drive FUERA del cerrojo: es lo lento de todo esto
  var blob = Utilities.newBlob(Utilities.base64Decode(datosBase64),
                               tipo || 'application/octet-stream',
                               nombre || ('soporte-' + id));
  var ext = (nombre || '').indexOf('.') > 0
    ? nombre.slice(nombre.lastIndexOf('.')) : '';
  blob.setName((o.municipio + ' ' + o.impuesto + ' ' + o.periodo)
    .replace(/[\\\/:*?"<>|]/g, '-') + ext);
  var archivo = carpetaDe('soportes', o.municipio, o.impuesto).createFile(blob);

  return conCerrojo(function () {
    var f = buscarObligacion(id);
    var previos = agregar ? listaIds(f.soporte_id) : [];
    if (previos.length >= MAX_SOPORTES) {
      throw new Error('Ya hay ' + previos.length + ' archivos. Si de verdad hacen ' +
                      'falta más, júntalos en un solo PDF.');
    }
    var todos = previos.concat([archivo.getId()]);

    var revisadosAntes = {};
    listaIds(f.soporte_revisado).forEach(function (x) { revisadosAntes[x] = true; });

    var campos = {
      soporte_id: todos.join(','),
      soporte_revisado: previos.filter(function (x) { return revisadosAntes[x]; }).join(',')
    };
    if (estado !== ESTADO.LISTA) campos.estado = ESTADO.LISTA;

    escribirCampos(f._hoja, f._fila, campos);
    registrar(id, EVENTO.SOPORTE_CARGADO,
              (agregar ? 'anexo ' + todos.length + ': ' : '') + archivo.getName());

    return { id: id, soportes: todos.length, estado: campos.estado || estado };
  });
}

/** Lo que la ventana de envio necesita: un renglon por ARCHIVO. */
function apiSoportesParaRevisar(ids) {
  var buscados = {};
  (ids || []).forEach(function (x) { buscados[String(x)] = true; });

  var salida = [];
  misHojas().forEach(function (nombre) {
    var h = libro().getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;
    registros(nombre).forEach(function (o) {
      if (!buscados[String(o.id)]) return;

      var archivos = listaIds(o.soporte_id);
      var vistos = {};
      listaIds(o.soporte_revisado).forEach(function (x) { vistos[x] = true; });
      var copias = copiasFijas();

      archivos.forEach(function (sid, k) {
        var nombreArchivo = '', pesoKB = 0;
        try {
          var a = DriveApp.getFileById(sid);
          nombreArchivo = a.getName();
          pesoKB = Math.round(a.getSize() / 1024);
        } catch (e) { nombreArchivo = '(no se pudo abrir en Drive)'; }

        salida.push({
          id: String(o.id), soporte_id: sid,
          municipio: String(o.municipio), impuesto: String(o.impuesto),
          periodo: String(o.periodo), vencimiento: fechaTexto(o.vencimiento),
          cod_oficina: String(o.cod_oficina || ''), nit: String(o.nit || ''),
          valor_texto: pesos(o.valor), consecutivo: String(o.consecutivo || ''),
          adhesivo: String(o.adhesivo || ''), forma_pago: String(o.forma_pago || ''),
          destinatarios: destinatariosDe(o),
          copias_cuantas: copias ? copias.split(',').length : 0,
          nombre: nombreArchivo, peso_kb: pesoKB, cual: k + 1, de: archivos.length,
          vista: 'https://drive.google.com/file/d/' + sid + '/preview',
          enlace: 'https://drive.google.com/file/d/' + sid + '/view',
          revisado: !!vistos[sid]
        });
      });
    });
  });
  return { soportes: salida };
}

/**
 * Marca un archivo como correcto o no.
 *
 * NO CORRESPONDE quita ESE archivo y su visto bueno: dejarlo puesto solo
 * invita a que alguien lo mande sin mirar. Si era el unico, la obligacion
 * vuelve a PENDIENTE.
 */
function apiMarcarSoporte(id, correcto, soporteId) {
  if (!id) throw new Error('Falta el id de la obligación.');

  return conCerrojo(function () {
    var o = buscarObligacion(id);
    if (!o) throw new Error('No existe la obligación ' + id);
    exigeMia(o);

    var archivos = listaIds(o.soporte_id);
    if (!archivos.length) throw new Error('Esa obligación no tiene soporte.');

    var cual = String(soporteId || '').trim() || archivos[0];
    if (archivos.indexOf(cual) < 0) {
      throw new Error('Ese archivo ya no está en la obligación. Recarga la pantalla.');
    }

    var revisados = listaIds(o.soporte_revisado);
    var estado = String(o.estado || '').toUpperCase();

    if (correcto) {
      if (revisados.indexOf(cual) < 0) revisados.push(cual);
      revisados = revisados.filter(function (x) { return archivos.indexOf(x) >= 0; });
      escribirCampos(o._hoja, o._fila, { soporte_revisado: revisados.join(',') });
      return { id: id, revisado: true, soporte_id: cual };
    }

    var quedan = archivos.filter(function (x) { return x !== cual; });
    var campos = {
      soporte_id: quedan.join(','),
      soporte_revisado: revisados.filter(function (x) {
        return x !== cual && quedan.indexOf(x) >= 0;
      }).join(',')
    };
    if (!quedan.length && estado === ESTADO.LISTA) campos.estado = ESTADO.PENDIENTE;

    escribirCampos(o._hoja, o._fila, campos);
    registrar(id, EVENTO.ERROR, 'soporte marcado como no válido. Quedan ' +
              quedan.length + ' archivos.');

    return { id: id, revisado: false, soporte_id: cual, quedan: quedan.length,
             estado: campos.estado || estado };
  });
}

/** $1.773.000, sin decimales, como lo escriben ellos. */
function pesos(v) {
  var n = Number(normValor(v)) || 0;
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ===========================================================================
   11. EL ENVIO

   El correo sale de la cuenta de QUIEN ENVIA, con su cuota y su bandeja. Por
   eso la aplicacion se despliega «ejecutando como el usuario que accede»: la
   respuesta de la alcaldia vuelve a su buzon, no a uno compartido.

   Lo mas importante de aqui: se guarda el hilo_id en el momento del envio.
   Sin eso, la respuesta no se puede asociar despues a nada.
   =========================================================================== */

var CUOTA_DIARIA = 1400;       // Workspace da 1.500; se deja margen
var SEGUNDOS_MAX = 270;        // Apps Script corta a los 6 minutos

/** La marca del asunto. Es con esto que luego se encuentra el hilo. */
function marcador(id) {
  return 'SINAV-' + String(id).replace(/[^A-Za-z0-9]+/g, '-');
}

function cuotaUsada() {
  var k = 'cuota_' + Utilities.formatDate(new Date(), TZ(), 'yyyy-MM-dd');
  return Number(PropertiesService.getUserProperties().getProperty(k)) || 0;
}

function sumarCuota(n) {
  var k = 'cuota_' + Utilities.formatDate(new Date(), TZ(), 'yyyy-MM-dd');
  PropertiesService.getUserProperties().setProperty(k, String(cuotaUsada() + n));
}

/**
 * Envia las obligaciones seleccionadas.
 *
 * Va por lotes con guardia de tiempo: si se acerca el limite, devuelve lo que
 * falta y el cliente vuelve a llamar. Lo ya enviado queda enviado.
 */
function apiEnviar(ids) {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var arranque = Date.now();
  var modo = entorno();
  var remitente = config('nombre_remitente') || 'Impuestos Davivienda';
  var copias = modo === 'PRUEBA' ? '' : copiasFijas();

  var enviadas = [], rechazadas = [], pendientes = [], eventos = [];

  for (var i = 0; i < (ids || []).length; i++) {
    var id = String(ids[i]);

    if ((Date.now() - arranque) / 1000 > SEGUNDOS_MAX) {
      pendientes = ids.slice(i).map(String);
      break;
    }

    var o = buscarObligacion(id);
    if (!o) { rechazadas.push({ id: id, motivo: 'no existe' }); continue; }

    if (!puede('enviarAjenas') && o._hoja !== q.hoja) {
      rechazadas.push({ id: id, motivo: 'es de otra persona' });
      continue;
    }

    var paso = validarPaso(o, ESTADO.ENVIADA, q.perfil);
    if (!paso.ok) {
      rechazadas.push({ id: id, motivo: paso.motivo });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'no se envió: ' + paso.motivo });
      continue;
    }

    var destinos = modo === 'PRUEBA' ? q.correo : destinatariosDe(o);
    var cuantos = destinos.split(',').length + (copias ? copias.split(',').length : 0);
    if (cuotaUsada() + cuantos > CUOTA_DIARIA) {
      pendientes = ids.slice(i).map(String);
      rechazadas.push({ id: id, motivo: 'se agotó tu cuota diaria de correos' });
      break;
    }

    try {
      var adjuntos = [], bytes = 0;
      listaIds(o.soporte_id).forEach(function (sid) {
        var a = DriveApp.getFileById(sid);
        bytes += a.getSize();
        adjuntos.push(a.getBlob());
      });
      if (!adjuntos.length) throw new Error('no se pudo abrir ningún soporte en Drive');
      if (bytes > MAX_ADJUNTO_MB * 1024 * 1024) {
        throw new Error('los adjuntos pesan ' + Math.round(bytes / 1048576) +
                        ' MB y Gmail corta en 25');
      }

      var opciones = { name: remitente, attachments: adjuntos,
                       htmlBody: cuerpoHtmlOficina(o, modo) };
      if (copias) opciones.cc = copias;
      var logo = blobDelLogo();
      if (logo) opciones.inlineImages = { logo: logo };

      GmailApp.sendEmail(destinos, asuntoOficina(o), cuerpoTextoOficina(o, modo), opciones);
      sumarCuota(cuantos);

      var hilo = hiloDelEnvio(o.id);
      escribirCampos(o._hoja, o._fila, {
        estado: ESTADO.ENVIADA,
        fecha_envio: new Date(),
        hilo_id: hilo
      });

      eventos.push({ id: id, quePaso: EVENTO.ENVIADA,
                     detalle: (modo === 'PRUEBA' ? '[PRUEBA] ' : '') + 'a ' + destinos });
      if (!hilo) {
        eventos.push({ id: id, quePaso: EVENTO.ERROR,
          detalle: 'no se encontró el hilo: la respuesta no se va a detectar sola' });
      }
      enviadas.push({ id: id, destinos: destinos });

    } catch (e) {
      rechazadas.push({ id: id, motivo: String(e.message || e) });
      eventos.push({ id: id, quePaso: EVENTO.ERROR, detalle: 'falló el envío: ' + e });
    }
  }

  if (eventos.length) registrarVarios(eventos);

  return { enviadas: enviadas, rechazadas: rechazadas, pendientes: pendientes,
           modo: modo, cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA } };
}

/** Busca el hilo recien salido por la marca del asunto, y lo etiqueta. */
function hiloDelEnvio(id) {
  var q = 'in:sent subject:"' + marcador(id) + '"';
  for (var intento = 0; intento < 3; intento++) {
    var hilos = GmailApp.search(q, 0, 1);
    if (hilos.length) {
      try {
        var et = GmailApp.getUserLabelByName('SINAV') || GmailApp.createLabel('SINAV');
        hilos[0].addLabel(et);
      } catch (e) { /* la etiqueta no es critica */ }
      return hilos[0].getId();
    }
    Utilities.sleep(1500);
  }
  return '';
}

/* ===========================================================================
   12. LAS RESPUESTAS

   Se lee EL HILO que mandamos, no la bandeja: el hilo ya dice a que
   obligacion pertenece la respuesta. Buscar por asunto o por remitente seria
   adivinar, y una declaracion sellada archivada en el municipio equivocado es
   un error que se descubre meses despues.
   =========================================================================== */

/**
 * Que cuenta como respuesta.
 *
 * El primer mensaje del hilo nunca: es el que mando SINAV. Lo de la oficina
 * siempre. Lo propio solo si trae adjunto, que es el caso del sellado que la
 * alcaldia manda por fuera y alguien reenvia sobre el hilo.
 */
function cuentaComoRespuesta(mensaje, indice, miCorreo) {
  if (indice === 0) return false;
  var de = String(mensaje.getFrom() || '').toLowerCase();
  if (de.indexOf(String(miCorreo || '').toLowerCase()) < 0) return true;
  return tieneAdjuntoUtil(mensaje);
}

function tieneAdjuntoUtil(mensaje) {
  try {
    var adj = mensaje.getAttachments();
    for (var i = 0; i < adj.length; i++) {
      if (adj[i].getSize() >= MINIMO_ADJUNTO) return true;
    }
  } catch (e) { /* si no se puede leer, no cuenta */ }
  return false;
}

/** Revisa los hilos y guarda lo que haya llegado. Por lotes. */
function apiRevisarRespuestas() {
  var q = yo();
  if (!q.activo) throw new Error('Tu usuario está inactivo en SINAV.');

  var arranque = Date.now();
  var conRespuesta = 0, conSellado = 0, errores = [], pendientes = 0;

  misHojas().forEach(function (nombre) {
    var h = libro().getSheetByName(nombre);
    if (!h || h.getLastRow() < 2) return;

    registros(nombre).forEach(function (o) {
      if ((Date.now() - arranque) / 1000 > SEGUNDOS_MAX) { pendientes++; return; }
      if (!String(o.hilo_id || '').trim()) return;
      if (estadosEsperanRespuesta().indexOf(String(o.estado).toUpperCase()) < 0) return;

      var hilo;
      try { hilo = GmailApp.getThreadById(String(o.hilo_id).trim()); }
      catch (e) { return; }                 // no esta en mi bandeja: no me toca
      if (!hilo) return;

      var mensajes = hilo.getMessages();
      var visto = String(o.ultimo_mensaje || '').trim();
      var desde = 0;
      if (visto) {
        for (var i = 0; i < mensajes.length; i++) {
          if (mensajes[i].getId() === visto) { desde = i + 1; break; }
        }
      }

      var nuevos = 0, adjuntos = [], ultimo = visto, fecha = null, de = '';
      for (var j = desde; j < mensajes.length; j++) {
        var m = mensajes[j];
        ultimo = m.getId();
        if (!cuentaComoRespuesta(m, j, q.correo)) continue;
        nuevos++;
        fecha = m.getDate();
        de = String(m.getFrom() || '');
        m.getAttachments().forEach(function (a) {
          if (a.getSize() >= MINIMO_ADJUNTO) adjuntos.push(a);
        });
      }

      if (!nuevos && ultimo === visto) return;

      var campos = { ultimo_mensaje: ultimo };

      if (adjuntos.length) {
        try {
          var dir = carpetaDe('sellados', o.municipio, o.impuesto);
          var yaHabia = listaIds(o.sellado_id);
          var guardados = [];
          var base = (o.municipio + ' ' + o.impuesto + ' ' + o.periodo + ' sellado')
            .replace(/[\\\/:*?"<>|]/g, '-');
          adjuntos.forEach(function (a) {
            var ext = a.getName().indexOf('.') > 0
              ? a.getName().slice(a.getName().lastIndexOf('.')) : '';
            var cuantos = yaHabia.length + guardados.length;
            guardados.push(dir.createFile(a.copyBlob()
              .setName(base + (cuantos ? ' ' + (cuantos + 1) : '') + ext)));
          });
          campos.sellado_id = yaHabia.concat(guardados.map(function (f) {
            return f.getId();
          })).join(',');
          conSellado += guardados.length;
        } catch (e) {
          errores.push(o.municipio + ' ' + o.impuesto + ': ' + e.message);
        }
      }

      if (nuevos) {
        conRespuesta++;
        if (!o.fecha_respuesta && fecha) campos.fecha_respuesta = fecha;
        if (String(o.estado).toUpperCase() === ESTADO.ENVIADA) {
          campos.estado = ESTADO.RESPONDIDA;
        }
        registrar(o.id, EVENTO.RESPONDIDA, nuevos + ' mensaje(s) de ' + de +
          (adjuntos.length ? ' · ' + adjuntos.length + ' adjunto(s)' : ' · sin adjunto'));
      }

      escribirCampos(nombre, o._fila, campos);
    });
  });

  return { con_respuesta: conRespuesta, con_sellado: conSellado,
           pendientes: pendientes, errores: errores };
}

/** El enlace para abrir un sellado desde la pantalla. */
function apiEnlaceSellado(id) {
  var o = buscarObligacion(id);
  var l = o ? listaIds(o.sellado_id) : [];
  if (!l.length) throw new Error('Esa obligación todavía no tiene sellado.');
  exigeMia(o);
  return 'https://drive.google.com/file/d/' + l[0] + '/view';
}

/* ===========================================================================
   13. EL CORREO QUE RECIBE LA OFICINA

   El texto vive en correos.html. No es decoracion: es una instruccion de
   trabajo que dice que egreso elaborar, con que consecutivo girar y a donde
   devolver el sellado.
   =========================================================================== */

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

var NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
                  'diciembre'];

/** La dependencia sin el cero de relleno: director851@, no director0851@. */
function dependenciaDe(o) {
  return String((o || {}).cod_oficina || '').trim().replace(/^0+/, '');
}

function fechaLarga(v) {
  var d = normFecha(v);
  if (!d) return 'sin fecha';
  return d.getDate() + ' de ' + NOMBRE_MES[d.getMonth()] + ' de ' + d.getFullYear();
}

/**
 * El asunto, con el formato del equipo:
 *   1689 -Declaración Autorretención de ICA NILO - MENSUAL - $1.773.000 -
 *   EGRESO 25 No - LR-10-74 [SINAV-…]
 */
function asuntoOficina(o) {
  var partes = [
    dependenciaDe(o) + ' -' + (IMPUESTO_ASUNTO[o.impuesto] || o.impuesto) +
      ' ' + String(o.municipio || '').toUpperCase(),
    String(o.periodicidad || '').toUpperCase(),
    pesos(o.valor)
  ];
  var egreso = String(config('egreso') || '').trim();
  var giro = String(o.consecutivo || '').trim();
  if (egreso) partes.push('EGRESO ' + egreso + ' No');
  if (giro) partes.push(giro);
  return partes.join(' - ') + ' [' + marcador(o.id) + ']';
}

/** Los datos que correos.html necesita para pintarse. */
function datosDelCorreo(o, modo) {
  var egreso = String(config('egreso') || '25').trim();
  var codigo = String(config('codigo_departamento') || '').trim();
  var recibe = String(config('nombre_recibe') || '').trim();

  return {
    modo: modo,
    municipio: String(o.municipio || '').toUpperCase(),
    impuesto_largo: IMPUESTO_LARGO[o.impuesto] || o.impuesto,
    periodicidad: String(o.periodicidad || '').toUpperCase(),
    periodo: String(o.periodo || ''),
    vigencia: String(o.periodo || '').slice(0, 4),
    valor: pesos(o.valor),
    nit: String(o.nit || '—'),
    dependencia: dependenciaDe(o) || '—',
    adhesivo: String(o.adhesivo || ''),
    consecutivo: String(o.consecutivo || ''),
    forma_pago: String(o.forma_pago || '—'),
    vencimiento: fechaLarga(o.vencimiento),
    egreso: egreso,
    codigo_departamento: codigo,
    nombre_recibe: recibe,
    remitente: config('nombre_remitente') || 'Impuestos Davivienda',
    destinatarios: destinatariosDe(o),
    hay_logo: !!blobDelLogo()
  };
}

function cuerpoHtmlOficina(o, modo) {
  var t = HtmlService.createTemplateFromFile('correos');
  t.d = datosDelCorreo(o, modo);
  return t.evaluate().getContent();
}

/** La version en texto, para quien lea sin HTML. */
function cuerpoTextoOficina(o, modo) {
  var d = datosDelCorreo(o, modo);
  var l = [];
  if (modo === 'PRUEBA') {
    l.push('[MODO PRUEBA] Este correo iba para: ' + d.destinatarios, '');
  }
  l.push('Buenos días,', '',
    'Reciban un cordial saludo, les informo que enviamos por correo interno ' +
    (d.adhesivo ? 'con el sticker No ' + d.adhesivo + ' ' : '') +
    'la ' + d.impuesto_largo + ' ' + d.periodicidad + ' del ' + d.vigencia +
    ', del Municipio ' + d.municipio + ', por el valor de ' + d.valor +
    ' con el NIT ' + d.nit + ' a la dependencia ' + d.dependencia + '.', '',
    'Favor realizar el pago por contingencia elaborando egreso ' + d.egreso +
    (d.consecutivo ? ', de acuerdo al consecutivo de giro asignado para este pago No ' +
      d.consecutivo : '') + ', realizar la presentación y el pago una vez reciban ' +
    'el soporte.', '',
    'Fecha de vencimiento el ' + d.vencimiento + '.', '',
    'Agradecemos dar respuesta SOBRE ESTE MISMO CORREO, sin iniciar uno nuevo,',
    'adjuntando la declaración con el sello de recibido.', '',
    'Cordialmente,', d.remitente);
  return l.join('\n');
}

/* ---- el logo ------------------------------------------------------------- */

var _blobLogo, _blobLogoBuscado = false;

/**
 * El logo se INCRUSTA, no se enlaza: Gmail bloquea las imagenes remotas hasta
 * que quien lee da permiso, y entonces el correo llega roto.
 */
function blobDelLogo() {
  if (_blobLogoBuscado) return _blobLogo;
  _blobLogoBuscado = true;
  _blobLogo = null;

  var id = idDePropiedad('logo_correo_id') || idDePropiedad('logo_id');
  if (!id) return null;
  try { _blobLogo = DriveApp.getFileById(id).getBlob().setName('logo'); }
  catch (e) { _blobLogo = null; }
  return _blobLogo;
}

/** Acepta el id pelado o el enlace completo de Drive. */
function idDePropiedad(nombre) {
  var v = '';
  try { v = PropertiesService.getScriptProperties().getProperty(nombre) || ''; }
  catch (e) { v = ''; }
  if (!v) v = config(nombre);
  var s = String(v || '').trim();
  if (!s) return '';
  var m = /\/d\/([A-Za-z0-9_-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  return m ? m[1] : s;
}

/* ===========================================================================
   14. LO QUE LLAMA LA PANTALLA
   =========================================================================== */

function doGet() {
  return HtmlService.createTemplateFromFile('pagina')
    .evaluate()
    .setTitle('SINAV')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

/** Lo primero que pide la pantalla al abrirse. */
function apiInicio() {
  asegurarAlta();
  var q = yo();

  if (!q.correo) {
    return { error: 'No se pudo identificar tu cuenta. Entra con tu correo corporativo.' };
  }
  if (!q.activo) {
    return { yo: q, error: 'Tu correo está en USUARIOS con activo = NO.' };
  }
  if (!q.hoja && !puede('verTodo')) {
    return { yo: q, error: 'Tu correo no tiene una hoja asignada. Habla con el administrador.' };
  }

  var lista = listarMias();
  return {
    yo: { correo: q.correo, nombre: q.nombre, perfil: q.perfil,
          supervisa: puede('verTodo') },
    modo: entorno(),
    filas: lista,
    conteos: conteos(lista),
    cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
    logo: apiLogo(),
    generado: fechaHoraTexto(new Date())
  };
}

function apiLista() {
  var lista = listarMias();
  return { filas: lista, conteos: conteos(lista),
           cuota: { usada: cuotaUsada(), tope: CUOTA_DIARIA },
           generado: fechaHoraTexto(new Date()) };
}

function conteos(lista) {
  var c = { todas: lista.length, sin_soporte: 0, listas: 0, enviadas: 0,
            respondidas: 0, vencidas: 0, faltan_datos: 0 };
  lista.forEach(function (o) {
    if (!o.soportes) c.sin_soporte++;
    if (o.enviable) c.listas++;
    if (o.estado === ESTADO.ENVIADA) c.enviadas++;
    if (o.estado === ESTADO.RESPONDIDA) c.respondidas++;
    if (o.dias !== null && o.dias < 0 && o.estado !== ESTADO.APROBADA) c.vencidas++;
    if (o.falta.length) c.faltan_datos++;
  });
  return c;
}

/** El valor, escrito en la propia tabla. Devuelve la fila ya actualizada. */
function apiGuardarValor(id, valor) {
  var o = buscarObligacion(id);
  if (!o) throw new Error('No existe la obligación ' + id);
  exigeMia(o);

  var limpio = normValor(valor);
  escribirCampos(o._hoja, o._fila, { valor: limpio });
  var fresca = buscarObligacion(id);
  return { id: id, fila: decorar(fresca) };
}

/** El logo de la aplicacion, como data URI. Se cachea seis horas. */
function apiLogo() {
  var id = idDePropiedad('logo_id');
  if (!id) return '';
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('logo:' + id);
  if (guardado) return guardado;
  try {
    var b = DriveApp.getFileById(id).getBlob();
    var uri = 'data:' + b.getContentType() + ';base64,' +
              Utilities.base64Encode(b.getBytes());
    if (uri.length < 95000) cache.put('logo:' + id, uri, 21600);
    return uri;
  } catch (e) {
    return '';
  }
}

/* ===========================================================================
   15. INSTALAR

   Crea lo que falte y no toca lo que ya este. Se puede correr las veces que
   haga falta.
   =========================================================================== */

/** Los parametros base. Los que ya existan no se pisan. */
var CONFIG_BASE = [
  ['modo', 'PRUEBA'],
  ['nombre_remitente', 'Impuestos Davivienda'],
  ['dominio_oficinas', 'davivienda.com'],
  ['dias_aviso', '7,4,2,0'],
  ['egreso', '25'],
  ['codigo_departamento', '9413'],
  ['rol_defecto', 'PROFESIONAL'],
  ['area_defecto', 'MUNICIPALES'],
  ['nivel_defecto', 'I'],
  ['copias_fijas', '']
];

function instalar() {
  exige('configurar');

  var l = ['SINAV · instalación', ''];
  l.push(asegurarHojasBase());
  l.push(asegurarHojasDeProfesionales());
  l.push(asegurarConfig());

  var faltan = parametrosQueFaltan(leerConfigEntera());
  if (faltan.length) l.push('', 'OJO, faltan en CONFIG: ' + faltan.join(', '));

  registrar('', EVENTO.AVISO, 'instalación ejecutada');
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/** Las hojas que la aplicacion escribe y que tienen esquema fijo. */
function asegurarHojasBase() {
  var l = [];
  [[HOJA.EVENTOS, COLS_EVENTOS], [HOJA.AUSENCIAS, COLS_AUSENCIAS]].forEach(function (par) {
    l.push(ponerEncabezados(par[0], par[1], []));
  });

  // las que son de datos: se avisa si faltan, pero no se inventan
  [HOJA.CALENDARIO, HOJA.CODIGOS, HOJA.ADHESIVOS, HOJA.USUARIOS, HOJA.CONFIG]
    .forEach(function (n) {
      if (!libro().getSheetByName(n)) l.push('FALTA la hoja ' + n + '.');
    });

  return l.join('\n');
}

/** Una hoja por profesional declarado. */
function asegurarHojasDeProfesionales() {
  var lista = profesionales();
  if (!lista.length) {
    return 'No hay profesionales declarados. Pega yasneidy.js, jesus.js y helen.js.';
  }
  return lista.map(function (p) {
    return ponerEncabezados(p.hoja, COLS_MES, COLS_TEXTO_MES);
  }).join('\n');
}

/**
 * Pone los encabezados de una hoja, creandola si no existe.
 *
 * Reescribe SOLO la fila 1. Los datos de abajo no se mueven, que es por lo
 * que las columnas nuevas tienen que ir siempre al final.
 */
function ponerEncabezados(nombre, cols, colsTexto) {
  var h = libro().getSheetByName(nombre);
  var creada = false;
  if (!h) { h = libro().insertSheet(nombre); creada = true; }

  var ancho = Math.max(h.getLastColumn(), cols.length);
  var cab = h.getRange(1, 1, 1, ancho).getValues()[0]
             .slice(0, cols.length).map(function (v) { return String(v).trim(); });

  var cambio = cab.join('|') !== cols.join('|');
  if (cambio) h.getRange(1, 1, 1, cols.length).setValues([cols]);

  h.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  if (h.getFrozenRows() < 1) h.setFrozenRows(1);

  (colsTexto || []).forEach(function (c) {
    var i = cols.indexOf(c);
    if (i >= 0) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('@');
  });

  return nombre + ': ' + (creada ? 'creada' : (cambio ? 'encabezados al día' : 'ya estaba'));
}

function asegurarConfig() {
  var actual = leerConfigEntera();
  var nuevos = [];
  CONFIG_BASE.forEach(function (par) {
    if (String(actual[par[0]] === undefined ? '' : actual[par[0]]).trim()) return;
    escribirParametro(par[0], par[1]);
    nuevos.push(par[0]);
  });
  _cacheConfig = null;
  return nuevos.length ? 'CONFIG: se agregó ' + nuevos.join(', ')
                       : 'CONFIG: ya estaba completa';
}

/* ---- el menu ------------------------------------------------------------- */

/**
 * UN menu. Antes eran seis y era imposible encontrar nada.
 * Google llama a onOpen sola al abrir el libro: nunca se corre a mano.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('SINAV')
    .addItem('Preparar el mes', 'prepararElMesDesdeMenu')
    .addSeparator()
    .addItem('Instalar / verificar', 'instalarDesdeMenu')
    .addItem('Normalizar los datos', 'normalizarDesdeMenu')
    .addSeparator()
    .addItem('¿En qué modo está?', 'verEntornoDesdeMenu')
    .addToUi();
}

function instalarDesdeMenu() { aviso('Instalación', instalar()); }
function normalizarDesdeMenu() { aviso('Normalización', normalizarHojas()); }
function verEntornoDesdeMenu() { aviso('Entorno', verEntorno()); }

function prepararElMesDesdeMenu() {
  if (typeof prepararElMes !== 'function') {
    aviso('Preparar el mes', 'Falta pegar cargaMes.js.');
    return;
  }
  aviso('Preparar el mes', prepararElMes());
}

/** Los resumenes son largos: el texto completo queda en Ejecuciones. */
function aviso(titulo, texto) {
  var t = String(texto);
  SpreadsheetApp.getUi().alert('SINAV · ' + titulo,
    t.length > 1400 ? t.slice(0, 1400) + '\n\n[…] El texto completo está en ' +
      'Ejecuciones, en el editor.' : t,
    SpreadsheetApp.getUi().ButtonSet.OK);
}
