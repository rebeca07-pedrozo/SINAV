/** Pruebas del importador con los casos reales que confirmaste. Corre pruebasCalendario(). */

function igual(real, esperado, nombre) {
  if (real !== esperado) throw new Error('FALLÓ ' + nombre + ': esperado "' + esperado + '", real "' + real + '"');
}

function pruebasCalendario() {
  // Periodicidad: variantes reales de la fuente
  ['ANUAL', 'Anual', 'MENSUAL', 'MENSUAL ', 'Mensual'].forEach(function (t) {
    igual(normalizarPeriodicidad(t), t.trim().toUpperCase(), 'periodicidad ' + t);
  });
  igual(normalizarPeriodicidad('ANUAL - Con la última declaración de retención'), 'ANUAL', 'anual largo');
  igual(normalizarPeriodicidad('quincenal'), '', 'desconocida');

  // Mensual: mes del vencimiento menos 1 (Aguadas vence 14/10/2026 → SEPTIEMBRE 2026)
  igual(derivarPeriodo('MENSUAL', 2026, 10), '2026-09', 'aguadas');
  igual(derivarPeriodo('MENSUAL', 2026, 1), '2025-12', 'mensual enero');
  igual(derivarPeriodo('MENSUAL', 2027, 1), '2026-12', 'pamplona X');

  // Bimestral (Montenegro vence 16/09/2026 → 4BIM 2026)
  igual(derivarPeriodo('BIMESTRAL', 2026, 9), '2026-B4', 'montenegro');
  igual(derivarPeriodo('BIMESTRAL', 2026, 3), '2026-B1', 'B1');
  igual(derivarPeriodo('BIMESTRAL', 2027, 1), '2026-B6', 'B6 año anterior');
  igual(derivarPeriodo('BIMESTRAL', 2026, 4), '', 'mes sin regla');

  // Fila completa: Pamplona mensual, solo L y X llenas; T (septiembre) llega como fecha
  const fila = new Array(25).fill('');
  fila[3] = 'PAMPLONA'; fila[4] = 'Retención ICA'; fila[8] = 'MENSUAL ';
  fila[letraAIndice('L')] = new Date(2026, 0, 15);
  fila[letraAIndice('X')] = new Date(2027, 0, 15);
  const r = aplanarFila(fila, 2);
  igual(r.filas.length, 2, 'dos vencimientos');
  igual(r.filas[0].periodo, '2025-12', 'L → periodo');
  igual(r.filas[1].periodo, '2026-12', 'X → periodo');
  igual(r.filas[0].tipo_obligacion, 'RETEICA', 'tipo');
  igual(r.excepciones.length, 0, 'sin excepciones');

  // Guarda: fecha que no cuadra con su columna se rechaza, no se corrige
  const mala = fila.slice(); mala[letraAIndice('M')] = new Date(2026, 4, 14);
  igual(aplanarFila(mala, 3).excepciones[0][0], 'MES_NO_CUADRA', 'mes no cuadra');

  Logger.log('pruebasCalendario(): todo OK');
}
