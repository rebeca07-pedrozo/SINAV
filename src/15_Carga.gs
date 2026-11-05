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
