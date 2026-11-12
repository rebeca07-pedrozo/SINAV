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
