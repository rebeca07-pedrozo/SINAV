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
