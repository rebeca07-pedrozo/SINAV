/** Leer el calendario: una columna por mes, el encabezado es el periodo. */
export default function (S, es) {
  /* --- de que mes es cada columna --- */
  es('OCT-2026', S.mesDeColumna('OCT-2026'), { anio: 2026, mes: 10 });
  es('NOV-2026', S.mesDeColumna('NOV-2026'), { anio: 2026, mes: 11 });
  es('con el mes entero', S.mesDeColumna('OCTUBRE 2026'), { anio: 2026, mes: 10 });
  es('al revés', S.mesDeColumna('2026-11'), { anio: 2026, mes: 11 });
  es('una fecha de verdad en el encabezado',
     S.mesDeColumna(new Date(2026, 10, 1)), { anio: 2026, mes: 11 });
  es('una columna que no es de mes', S.mesDeColumna('municipio'), null);
  es('vacío tampoco', S.mesDeColumna(''), null);

  /* --- el periodo que le toca --- */
  es('mensual', S.periodoDe(2026, 11, 'MENSUAL'), '2026-11');
  es('con cero delante', S.periodoDe(2026, 9, 'MENSUAL'), '2026-09');
  es('octubre es el bimestre 5', S.periodoDe(2026, 10, 'BIMESTRAL'), '2026-B5');
  es('noviembre es el 6', S.periodoDe(2026, 11, 'BIMESTRAL'), '2026-B6');
  es('trimestre', S.periodoDe(2026, 9, 'TRIMESTRAL'), '2026-T3');
  es('cuatrimestre', S.periodoDe(2026, 8, 'CUATRIMESTRAL'), '2026-C2');
  es('semestre', S.periodoDe(2026, 11, 'SEMESTRAL'), '2026-S2');
  es('anual es solo el año', S.periodoDe(2026, 11, 'ANUAL'), '2026');

  /* --- el id sale de los datos, no de un contador --- */
  es('el id', S.idObligacion('5002', 'ICA', '2026-11'), '05002|ICA|2026-11');
  es('el mismo municipio dos veces da el mismo id',
     S.idObligacion(5002, 'ICA', '2026-11'), S.idObligacion('05002', 'ICA', '2026-11'));

  /* --- el consecutivo: solo cambia el mes --- */
  es('LR-09-74 en octubre', S.giroConMes('LR-09-74', 10), 'LR-10-74');
  es('un prefijo con año', S.giroConMes('HC26-10-141', 11), 'HC26-11-141');
  es('el número del municipio no se toca', S.giroConMes('AG-10-148', 3), 'AG-03-148');
  es('algo que no es un consecutivo no se rompe', S.giroConMes('PENDIENTE', 10), 'PENDIENTE');
  es('vacío tampoco', S.giroConMes('', 10), '');
}
