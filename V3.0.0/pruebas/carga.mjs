/**
 * Carga masiva: el emparejamiento por el nombre del archivo.
 *
 * La regla de oro es que cuando duda NO elige. Un soporte en la obligacion
 * equivocada se descubre cuando la alcaldia recibe la declaracion de otro
 * municipio, y eso es meses despues.
 */
export default function (S, es) {
  const n = S.leerNombre;

  es('DANE, impuesto y periodo',
     n('05001 ICA 2026-11.pdf'),
     { dane: '05001', impuesto: 'ICA', periodo: '2026-11' });
  es('con guiones bajos',
     n('05001_RETEICA_2026-11.pdf'),
     { dane: '05001', impuesto: 'RETEICA', periodo: '2026-11' });
  es('con guiones',
     n('19698-AUTORRETEICA-2026-B5.pdf').impuesto, 'AUTORRETEICA');
  es('un bimestre', n('19698 ICA 2026-B5.pdf').periodo, '2026-B5');
  es('medios magnéticos es exógena', n('11001 MEDIOS MAGNETICOS 2026.pdf').impuesto, 'EXOGENA');
  es('industria y comercio es ICA', n('05001 Industria y Comercio 2026-11.pdf').impuesto, 'ICA');

  // autorretención tiene que ganarle a retención: las dos traen «RET»
  es('autorretención no se confunde con retención',
     n('05001 AUTORRETENCION 2026-11.pdf').impuesto, 'AUTORRETEICA');

  es('el mes de un dígito se rellena', n('05001 ICA 2026-9.pdf').periodo, '2026-09');
  es('sin DANE no inventa uno', n('ICA noviembre.pdf').dane, '');
  es('cuatro cifras no son un DANE', n('0742 ICA 2026-11.pdf').dane, '');
  es('la extensión no estorba', n('05001 ICA 2026-11.PDF').dane, '05001');
  es('un nombre cualquiera', n('documento.pdf'), { dane: '', impuesto: '', periodo: '' });

  /* --- los cortes de las alertas --- */
  es('los cortes salen ordenados de mayor a menor',
     S.diasDeAviso(), [7, 4, 2, 0]);
}
