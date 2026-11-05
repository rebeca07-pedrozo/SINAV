/** SINAV · roles. El rol se resuelve aqui, en el servidor, y en ningun otro lado. */

var _yo = null;

/** PROFESIONAL | JEFE | ADMIN. '' si no reconoce el valor. */
function normalizarRol(v) {
  var s = String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (s === 'PROFESIONAL') return ROL.PROFESIONAL;
  if (s === 'JEFE' || s === 'JEFA') return ROL.JEFE;
  if (s === 'ADMIN' || s === 'ADMINISTRADOR') return ROL.ADMIN;
  return '';
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
          activo: false, inscrito: false };

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
  var roles = PERMISO[accion];
  if (!roles) throw new Error('Acción desconocida: ' + accion);
  return roles.indexOf(q.rol) >= 0;
}

/** Corta la ejecucion si el usuario no puede. */
function exige(accion) {
  if (!puede(accion)) {
    throw new Error('Tu rol (' + (yo().rol || 'sin rol') + ') no puede: ' + accion);
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
    perfil: perfilTexto(q),
    activo: q.activo,
    puedeAsignar: q.activo && puede('asignar'),
    puedeRevisar: q.activo && puede('revisar'),
    puedeConfigurar: q.activo && puede('configurar'),
    puedeVerMetricas: q.activo && puede('verMetricas')
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
