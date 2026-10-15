/** Pruebas del importador con los casos reales que confirmaste. Corre pruebasCalendario(). */

function igual(real, esperado, nombre) {
  if (real !== esperado) throw new Error('FALLÓ ' + nombre + ': esperado "' + esperado + '", real "' + real + '"');
}

function periodoDe(periodicidad, anio, mes, dia) {
  return derivarPeriodo(periodicidad, new Date(anio, mes - 1, dia));
}

function pruebasCalendario() {
  // Periodicidad: variantes reales de la fuente
  ['ANUAL', 'Anual', 'MENSUAL', 'MENSUAL ', 'Mensual'].forEach(function (t) {
    igual(normalizarPeriodicidad(t), t.trim().toUpperCase(), 'periodicidad ' + t);
  });
  igual(normalizarPeriodicidad('ANUAL - Con la última declaración de retención'), 'ANUAL', 'anual largo');
  igual(normalizarPeriodicidad('quincenal'), '', 'desconocida');

  // Mensual (Aguadas vence 14/10/2026 → septiembre 2026)
  igual(periodoDe('MENSUAL', 2026, 10, 14).periodo, '2026-09', 'aguadas');
  igual(periodoDe('MENSUAL', 2026, 1, 15).periodo, '2025-12', 'mensual enero');
  igual(periodoDe('MENSUAL', 2027, 1, 15).periodo, '2026-12', 'pamplona X');

  // Bimestral: fecha − 7 días (Montenegro vence 16/09/2026 → 4BIM 2026)
  igual(periodoDe('BIMESTRAL', 2026, 9, 16).periodo, '2026-B4', 'montenegro');
  igual(periodoDe('BIMESTRAL', 2026, 1, 23).periodo, '2025-B6', 'mani enero');
  igual(periodoDe('BIMESTRAL', 2026, 3, 20).periodo, '2026-B1', 'mani marzo');
  igual(periodoDe('BIMESTRAL', 2026, 6, 1).periodo, '2026-B2', 'pasto');
  igual(periodoDe('BIMESTRAL', 2026, 8, 1).periodo, '2026-B3', 'sabaneta');
  igual(periodoDe('BIMESTRAL', 2026, 2, 2).periodo, '2025-B6', 'la calera 02/02');
  igual(periodoDe('BIMESTRAL', 2026, 4, 6).periodo, '2026-B1', 'la calera 06/04');
  // Mes impar con fecha en los primeros días: NO se resta (casos reales del Excel)
  igual(periodoDe('BIMESTRAL', 2026, 3, 4).periodo, '2026-B1', 'jerico 04/03');
  igual(periodoDe('BIMESTRAL', 2026, 3, 6).periodo, '2026-B1', 'salento 06/03');
  igual(periodoDe('BIMESTRAL', 2026, 1, 5).periodo, '2025-B6', 'timbio 05/01');
  igual(periodoDe('BIMESTRAL', 2027, 1, 5).periodo, '2026-B6', 'viani 05/01/2027');
  igual(periodoDe('BIMESTRAL', 2026, 12, 14).periodo, '', 'diciembre sin regla');
  igual(periodoDe('BIMESTRAL', 2026, 4, 17).periodo, '', 'simiti 17/04 sin regla');
  const feb = periodoDe('BIMESTRAL', 2026, 2, 13);
  igual(feb.periodo, '2025-B6', 'febrero');
  igual(feb.porConfirmar, true, 'febrero por confirmar');

  // Trimestral y cuatrimestral
  igual(periodoDe('TRIMESTRAL', 2026, 1, 15).periodo, '2025-T4', 'T4');
  igual(periodoDe('TRIMESTRAL', 2026, 4, 15).periodo, '2026-T1', 'T1');
  igual(periodoDe('TRIMESTRAL', 2026, 10, 15).periodo, '2026-T3', 'T3');
  igual(periodoDe('CUATRIMESTRAL', 2027, 1, 15).periodo, '2026-C3', 'C3');
  igual(periodoDe('CUATRIMESTRAL', 2026, 5, 15).periodo, '2026-C1', 'C1');
  igual(periodoDe('CUATRIMESTRAL', 2026, 9, 15).periodo, '2026-C2', 'C2');

  // Fila completa: Pamplona mensual, solo L y X llenas
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
