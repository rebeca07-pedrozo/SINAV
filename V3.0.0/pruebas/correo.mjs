/** El asunto que lee la oficina, con el formato que usa el equipo. */
export default function (S, es) {
  const o = {
    id: '25488|AUTORRETEICA|2026-10', municipio: 'Nilo', cod_oficina: '1689',
    impuesto: 'AUTORRETEICA', periodicidad: 'MENSUAL', periodo: '2026-10',
    valor: 1773000, consecutivo: 'LR-10-74'
  };
  const asunto = S.asuntoOficina(o);

  es('empieza por la dependencia', asunto.indexOf('1689 -') === 0, true);
  es('nombra el impuesto largo',
     asunto.indexOf('Declaración Autorretención de ICA NILO') > 0, true);
  es('lleva la periodicidad', asunto.indexOf('MENSUAL') > 0, true);
  es('lleva el valor', asunto.indexOf('$1.773.000') > 0, true);
  es('lleva el egreso', asunto.indexOf('EGRESO 25 No') > 0, true);
  es('lleva el consecutivo', asunto.indexOf('LR-10-74') > 0, true);
  es('y la marca, que es como se encuentra el hilo luego',
     asunto.indexOf('[SINAV-') > 0, true);

  es('la fecha en letras',
     S.fechaLarga(new Date(2026, 10, 24)), '24 de noviembre de 2026');
  es('sin fecha lo dice', S.fechaLarga(''), 'sin fecha');

  /* --- que cuenta como respuesta --- */
  const mio = (kb) => ({
    getFrom: () => 'yo@davivienda.com',
    getAttachments: () => (kb ? [{ getSize: () => kb * 1024 }] : [])
  });
  const oficina = { getFrom: () => 'hacienda@nilo.gov.co', getAttachments: () => [] };

  es('el primero del hilo nunca cuenta: es el nuestro',
     S.cuentaComoRespuesta(mio(0), 0, 'yo@davivienda.com'), false);
  es('lo de la oficina siempre',
     S.cuentaComoRespuesta(oficina, 1, 'yo@davivienda.com'), true);
  es('lo mío sin adjunto no: es un recordatorio',
     S.cuentaComoRespuesta(mio(0), 1, 'yo@davivienda.com'), false);
  es('lo mío CON adjunto sí: es el sellado reenviado',
     S.cuentaComoRespuesta(mio(80), 1, 'yo@davivienda.com'), true);
  es('una firma incrustada no es un adjunto',
     S.cuentaComoRespuesta(mio(0.2), 1, 'yo@davivienda.com'), false);
}
