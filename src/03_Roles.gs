/** SINAV · roles. El rol se resuelve aqui, en el servidor, y en ningun otro lado. */

var _yo = null;

/** Quien esta usando la app ahora. Nunca se confia en lo que mande el cliente. */
function yo() {
  if (_yo) return _yo;

  var correo = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  _yo = { correo: correo, nombre: correo, rol: '', activo: false };

  if (!correo) return _yo;

  var ix = indices(HOJA.USUARIOS);
  var f = filas(HOJA.USUARIOS);
  for (var i = 0; i < f.length; i++) {
    if (String(f[i][ix.correo]).trim().toLowerCase() === correo) {
      _yo.nombre = String(f[i][ix.nombre]).trim() || correo;
      _yo.rol = String(f[i][ix.rol]).trim().toUpperCase();
      _yo.activo = String(f[i][ix.activo]).trim().toUpperCase() === 'SI';
      break;
    }
  }
  return _yo;
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
    activo: q.activo,
    puedeAsignar: q.activo && puede('asignar'),
    puedeRevisar: q.activo && puede('revisar'),
    puedeConfigurar: q.activo && puede('configurar')
  };
}
