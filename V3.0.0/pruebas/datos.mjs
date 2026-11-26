/** Normalizar: los mismos datos llegan escritos de cinco formas. */
export default function (S, es) {
  es('Industria y Comercio es ICA', S.normImpuesto('Industria y Comercio'), 'ICA');
  es('Autorreteica', S.normImpuesto('Autorreteica'), 'AUTORRETEICA');
  es('Medios magneticos es exógena', S.normImpuesto('Medios magneticos'), 'EXOGENA');
  es('lo que no conozco, vacío', S.normImpuesto('Predial'), '');

  es('SEMESTRAL existe', S.normPeriodicidad('Semestral'), 'SEMESTRAL');
  es('bimensual es bimestral', S.normPeriodicidad('bimensual'), 'BIMESTRAL');

  es('el DANE se rellena', S.normCodigo('5002', 5), '05002');
  es('el que ya viene bien no cambia', S.normCodigo(54518, 5), '54518');
  es('el .0 de Sheets se cae', S.normCodigo('5002.0', 5), '05002');

  // el fallo que nos tumbó una carga entera
  es('un DANE leído como fecha se recupera',
     S.normCodigo(new Date(1915, 5, 29), 5), '05659');
  es('y otro', S.normCodigo(new Date(2049, 3, 5), 5), '54518');
  es('una fecha inválida no inventa un código',
     S.normCodigo(new Date('x'), 5), '');

  es('los correos en minúsculas y sin repetir',
     S.normCorreos('Director3976@DAVIVIENDA.com, director3976@davivienda.com, basura'),
     'director3976@davivienda.com');
  es('lo que no es un correo se cae', S.normCorreos('pepito'), '');

  es('PSE', S.normFormaPago('pse'), 'PSE');
  es('ventanilla es oficina', S.normFormaPago('Ventanilla'), 'OFICINA');

  es('el valor acepta puntos de mil', S.normValor('$1.773.000'), 1773000);
  es('y un número pelado', S.normValor(1773000), 1773000);
  es('vacío no es cero', S.normValor(''), '');

  es('los pesos se escriben como ellos', S.pesos(1773000), '$1.773.000');

  es('varios ids en una celda', S.listaIds('a, b ,a'), ['a', 'b']);
  es('vacío es ninguno', S.listaIds(''), []);
}
