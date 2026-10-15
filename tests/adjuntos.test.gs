/** Pruebas de la búsqueda de adjuntos con variantes. Corre pruebasAdjuntos(). Usa igual() de calendario.test.gs. */

function pruebasAdjuntos() {
  const ob = function (dane, regimen, periodo, tipo) {
    const r = regimen || 'GENERAL', t = tipo || 'RETEICA';
    return { id: [dane, t, r, periodo].join('|'), cod_dane: dane, tipo_obligacion: t, regimen: r, periodo: periodo, municipio: 'X' };
  };
  const medellin = ob('5001', '', '2026-09');
  const bimestral = ob('13430', '', '2026-B4');
  const dosRegimenes = [ob('8001', '', '2026-09'), ob('8001', '15 DIA CALENDARIO', '2026-09')];
  const exogena = ob('5001', '', '2026-09', 'EXOGENA');
  const indice = {};
  [medellin, bimestral, dosRegimenes[0], dosRegimenes[1], exogena].forEach(function (o) {
    (indice[sinCeros(o.cod_dane)] = indice[sinCeros(o.cod_dane)] || []).push(o);
  });
  const id = function (nombre, solo) {
    const x = obligacionDeArchivo(nombre, indice, solo === undefined ? 'RETEICA' : solo);
    return x.estado === 'OK' ? x.obligacion.id : x.estado;
  };

  // El nombre sugerido siempre se encuentra a sí mismo
  igual(nombreAdjuntoEsperado(medellin), '05001_RETEICA_GENERAL_2026-09_X.pdf', 'nombre sugerido');
  igual(id(nombreAdjuntoEsperado(medellin)), medellin.id, 'se encuentra su propio nombre');
  igual(id(nombreAdjuntoEsperado(bimestral)), bimestral.id, 'bimestral');

  // Variantes que se inventa la gente
  igual(id('5001 retEica septiembre... 2026-09 medellín.PDF'), medellin.id, 'minúsculas, tildes, puntos');
  igual(id('05001-RETE ICA-2026 9.pdf'), medellin.id, 'rete ica separado, mes sin cero');
  igual(id('2026-09 Medellin 05001.pdf'), medellin.id, 'otro orden');
  igual(id('202609_5001.pdf'), medellin.id, 'periodo pegado, sin tipo (único activo)');
  igual(id('13430 RETENCION ICA 2026-B4.pdf'), bimestral.id, 'retención ica');
  igual(id('13430_2026 b4_final v2.pdf'), bimestral.id, 'texto extra');

  // Lo que NO debe encontrar
  igual(id('05001_RETEICA_2026-10.pdf'), 'NINGUNA', 'otro periodo');
  igual(id('05002_RETEICA_2026-09.pdf'), 'NINGUNA', 'otro municipio');
  igual(id('05001_2026-09.pdf', ''), 'NINGUNA', 'sin tipo y hay varios tipos activos');
  igual(id('05001_AUTORRETEICA_2026-09.pdf'), 'NINGUNA', 'autorreteica no es reteica');
  igual(id('0483-EXÓGENA 05001 2026-09.pdf'), exogena.id, 'exógena va a su obligación');

  // Dos regímenes en el mismo municipio y periodo
  igual(id('08001_RETEICA_15 DIA CALENDARIO_2026-09.pdf'), dosRegimenes[1].id, 'régimen nombrado');
  igual(id('08001_RETEICA_2026-09.pdf'), dosRegimenes[0].id, 'sin régimen = GENERAL');
  igual(id('08001_RETEICA_GENERAL_2026-09.pdf'), dosRegimenes[0].id, 'GENERAL escrito');

  // El link y el id son intercambiables
  igual(enlaceDrive('abc_123-X'), 'https://drive.google.com/file/d/abc_123-X/view', 'enlace');
  igual(idDriveDe('https://drive.google.com/file/d/abc_123-X/view'), 'abc_123-X', 'id desde enlace');
  igual(idDriveDe('https://drive.google.com/open?id=abc_123-X'), 'abc_123-X', 'id desde enlace antiguo');
  igual(idDriveDe('abc_123-X'), 'abc_123-X', 'id suelto');

  // Cruce completo: una obligación con dos PDF queda con dos
  const r = buscarAdjuntos([medellin, bimestral], [
    { id: 'a', nombre: '05001_RETEICA_2026-09.pdf' }, { id: 'b', nombre: '5001 reteica 2026-09 corregida.pdf' },
    { id: 'c', nombre: '13430_RETEICA_2026-B4.pdf' }, { id: 'd', nombre: 'notas.pdf' }], 'RETEICA');
  igual(r.porObligacion[medellin.id].length, 2, 'dos PDF para una obligación');
  igual(r.porObligacion[bimestral.id].length, 1, 'un PDF');
  igual(r.sinObligacion.length, 1, 'un PDF suelto');

  Logger.log('pruebasAdjuntos(): todo OK');
}
