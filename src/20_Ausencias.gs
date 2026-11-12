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
 * La clave del backup de alguien, segun los pares acordados. Pura.
 * Se busca por el nombre dentro del correo y no por el correo entero, para que
 * un cambio de dominio o de formato de cuenta no rompa los pares.
 */
function claveBackup(correo) {
  var yo_ = String(correo || '').trim().toLowerCase().split('@')[0];
  if (!yo_) return '';
  for (var i = 0; i < BACKUPS.length; i++) {
    var par = BACKUPS[i];
    for (var j = 0; j < par.length; j++) {
      if (yo_.indexOf(par[j]) >= 0) return par[1 - j];
    }
  }
  return '';
}

/** El correo del backup de alguien. '' si no tiene o no esta inscrito. */
function backupDe(correo) {
  var clave = claveBackup(correo);
  if (!clave) return '';
  var pareja = asignables().filter(function (u) {
    return u.correo.split('@')[0].indexOf(clave) >= 0;
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
