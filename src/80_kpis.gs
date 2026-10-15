/**
 * 80_kpis.gs — indicadores. Por ahora solo "sin evidencia" (Fase 1).
 * TODO (Fase 3): cachear el resultado con CacheService + respaldo en PropertiesService.
 */

/** COMPLETA = fecha y valor · INCOMPLETA = uno de los dos · SIN_RASTRO = ninguno. */
function categoriaEvidencia(fechaPresentacion, valor) {
  const f = fechaPresentacion instanceof Date;
  const v = valor !== '' && valor !== null && valor !== undefined;
  return f && v ? 'COMPLETA' : (f || v) ? 'INCOMPLETA' : 'SIN_RASTRO';
}

/**
 * Cuenta las obligaciones YA VENCIDAS por categoría de evidencia.
 * opciones: { tipos: [..], desde: 'yyyy-MM-dd', hasta: 'yyyy-MM-dd', soloGeneral: bool }
 */
function indicadorEvidencia(obligaciones, hoy, opciones) {
  const r = { total: 0, completa: 0, incompleta: 0, sinRastro: 0 };
  obligaciones.forEach(function (o) {
    if (!(o.vencimiento instanceof Date)) return;
    const dia = fechaIso(o.vencimiento);
    if (dia >= fechaIso(hoy)) return;                                   // no vencida
    if (opciones.tipos && opciones.tipos.indexOf(o.tipo_obligacion) === -1) return;
    if (opciones.desde && dia < opciones.desde) return;
    if (opciones.hasta && dia > opciones.hasta) return;
    if (opciones.soloGeneral && o.regimen !== REGIMEN_GENERAL) return;
    r.total++;
    const c = categoriaEvidencia(o.fecha_presentacion, o.valor);
    if (c === 'COMPLETA') r.completa++; else if (c === 'INCOMPLETA') r.incompleta++; else r.sinRastro++;
  });
  return r;
}

function textoIndicador(r) {
  const pct = function (n) { return r.total ? (100 * n / r.total).toFixed(1) + '%' : '-'; };
  return r.total + ' vencidas · completa ' + r.completa + ' (' + pct(r.completa) + ') · incompleta ' +
    r.incompleta + ' (' + pct(r.incompleta) + ') · SIN RASTRO ' + r.sinRastro + ' (' + pct(r.sinRastro) + ')';
}

function mostrarIndicador() {
  const hoy = new Date();
  const obligaciones = leerFilas(HOJAS.OBLIGACIONES);
  const tipos = String(config('tipos_activos')).split(',').map(normalizarTexto).filter(Boolean);

  Logger.log('TODAS las vencidas (' + tipos.join(', ') + '): ' + textoIndicador(indicadorEvidencia(obligaciones, hoy, { tipos: tipos })));
  // TODO(USUARIO): ventana de validación, no es parte del sistema. Corresponde a las cifras de tu análisis
  // (hoja "Retención ICA", ENERO..AGOSTO = vencimientos de febrero a septiembre de 2026), solo régimen GENERAL.
  Logger.log('Comparable con tu análisis (feb-sep 2026, GENERAL): ' +
    textoIndicador(indicadorEvidencia(obligaciones, hoy, { tipos: tipos, desde: '2026-02-01', hasta: '2026-09-30', soloGeneral: true })));
}
