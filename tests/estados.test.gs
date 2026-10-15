/** Pruebas de estados e indicador. Corre pruebasEstados(). Usa igual() de calendario.test.gs. */

function pruebasEstados() {
  const hoy = new Date(2026, 9, 14);   // 14/10/2026

  // Estado según evidencia
  igual(derivarEstado('PENDIENTE', new Date(2026, 2, 4), new Date(2026, 2, 11), hoy), 'PRESENTADA', 'presentada');
  igual(derivarEstado('PENDIENTE', '', new Date(2026, 2, 11), hoy), 'SIN_EVIDENCIA', 'vencida sin rastro');
  igual(derivarEstado('PENDIENTE', '', new Date(2026, 9, 14), hoy), 'PENDIENTE', 'vence hoy: aún no vencida');
  igual(derivarEstado('PENDIENTE', '', new Date(2026, 10, 13), hoy), 'PENDIENTE', 'futura');
  igual(derivarEstado('SIN_EVIDENCIA', new Date(2026, 2, 4), new Date(2026, 2, 11), hoy), 'PRESENTADA', 'aparece evidencia tarde');
  igual(derivarEstado('DEVUELTA', '', new Date(2026, 2, 11), hoy), 'DEVUELTA', 'manual no se pisa');
  igual(derivarEstado('APROBADA', new Date(2026, 2, 4), new Date(2026, 2, 11), hoy), 'APROBADA', 'aprobada no se pisa');

  // Bloques de la hoja real (encabezado normalizado: ENERO..., DICIEMBRE con 2DA FECHA, y un bloque final con fecha)
  const enc = ['RESPONSABLE', 'CC', 'CODIGO DANE', 'MUNICIPIO', 'PRESENTACION', 'PAGO', 'EXOGENA', 'PERIODICIDAD',
    'ENERO', 'REVISION', 'PRESENTACION', 'VALOR', 'FEBRERO', 'REVISION', 'PRESENTACION', 'VALOR',
    'DICIEMBRE', '2DA FECHA DICIEMBRE', 'REVISION', 'PRESENTACION', 'VALOR',
    'FECHA SUELTA', 'REVISION', 'PRESENTACION', 'VALOR', 'TOTAL'];
  const b = ubicarBloques(enc);
  igual(b.length, 3, 'tres bloques (diciembre omitido)');
  igual(b[0].vence, 8, 'enero vence'); igual(b[0].presentacion, 10, 'enero pres'); igual(b[0].valor, 11, 'enero valor');
  igual(b[1].vence, 12, 'febrero vence');
  igual(b[2].vence, 21, 'bloque final');

  // Categorías de evidencia
  igual(categoriaEvidencia(new Date(), 5000), 'COMPLETA', 'completa');
  igual(categoriaEvidencia('', 5000), 'INCOMPLETA', 'valor sin fecha');
  igual(categoriaEvidencia(new Date(), ''), 'INCOMPLETA', 'fecha sin valor');
  igual(categoriaEvidencia('', ''), 'SIN_RASTRO', 'sin rastro');

  // Indicador: solo cuenta vencidas
  const obl = [
    { vencimiento: new Date(2026, 2, 11), tipo_obligacion: 'RETEICA', regimen: 'GENERAL', fecha_presentacion: new Date(2026, 2, 4), valor: 5000 },
    { vencimiento: new Date(2026, 3, 9), tipo_obligacion: 'RETEICA', regimen: 'GENERAL', fecha_presentacion: '', valor: 8000 },
    { vencimiento: new Date(2026, 4, 9), tipo_obligacion: 'RETEICA', regimen: 'GENERAL', fecha_presentacion: '', valor: '' },
    { vencimiento: new Date(2026, 4, 9), tipo_obligacion: 'RETEICA', regimen: '15 DIA CALENDARIO', fecha_presentacion: '', valor: '' },
    { vencimiento: new Date(2026, 10, 9), tipo_obligacion: 'RETEICA', regimen: 'GENERAL', fecha_presentacion: '', valor: '' }
  ];
  const todas = indicadorEvidencia(obl, hoy, { tipos: ['RETEICA'] });
  igual(todas.total, 4, 'total vencidas'); igual(todas.completa, 1, 'completas');
  igual(todas.incompleta, 1, 'incompletas'); igual(todas.sinRastro, 2, 'sin rastro');
  igual(indicadorEvidencia(obl, hoy, { tipos: ['RETEICA'], soloGeneral: true }).total, 3, 'solo GENERAL');

  Logger.log('pruebasEstados(): todo OK');
}
