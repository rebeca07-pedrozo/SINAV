/** Las reglas que deciden si una obligacion se puede enviar o no. */
export default function (S, es) {
  const base = {
    id: '25488|AUTORRETEICA|2026-10', estado: 'LISTA',
    soporte_id: 'a', soporte_revisado: 'a',
    correos: '', cod_oficina: '1689', valor: 1773000, adhesivo: '55622944',
    consecutivo: 'LR-10-74', municipio: 'Nilo', impuesto: 'AUTORRETEICA',
    periodicidad: 'MENSUAL', periodo: '2026-10', nit: '8999997078'
  };
  const con = (e) => Object.assign({}, base, e);

  /* --- a quien le llega --- */
  es('con dependencia se arma el destino',
     S.destinoPorDependencia(base),
     'director1689@davivienda.com,subdirector1689@davivienda.com');
  es('el cero de relleno no va en el correo',
     S.destinoPorDependencia({ cod_oficina: '0851' }).split(',')[0],
     'director851@davivienda.com');
  es('sin dependencia, nada', S.destinoPorDependencia({ cod_oficina: '' }), '');
  es('el correo escrito manda sobre la dependencia',
     S.destinatariosDe(con({ correos: 'hacienda@nilo.gov.co' })),
     'hacienda@nilo.gov.co');

  /* --- se puede seleccionar para enviar --- */
  es('completa, se puede', S.puedeEnviar(base).ok, true);
  es('sin soporte, no', S.puedeEnviar(con({ soporte_id: '' })).motivo,
     'pendiente cargar el soporte');
  es('en PENDIENTE, no',
     S.puedeEnviar(con({ estado: 'PENDIENTE' })).motivo.indexOf('LISTA') > 0, true);
  es('sin correo NI dependencia, no',
     S.puedeEnviar(con({ cod_oficina: '' })).motivo, 'sin correo de oficina registrado');

  /* --- la revision es la ultima puerta, no la primera --- */
  es('sin revisar SI se puede seleccionar',
     S.puedeEnviar(con({ soporte_revisado: '' })).ok, true);
  es('pero no se llega a ENVIADA',
     S.validarPaso(con({ soporte_revisado: '' }), 'ENVIADA', 'PROFESIONAL-I').motivo,
     'falta verificar el soporte');
  es('todos los adjuntos, no solo uno',
     S.soporteRevisado(con({ soporte_id: 'a,b', soporte_revisado: 'a' })), false);
  es('los dos revisados, sí',
     S.soporteRevisado(con({ soporte_id: 'a,b', soporte_revisado: 'b,a' })), true);

  /* --- lo que el correo necesita nombrar --- */
  es('completa no falta nada', S.faltaParaElCorreo(base).length, 0);
  es('sin valor falta el valor',
     S.faltaParaElCorreo(con({ valor: '' }))[0], 'valor liquidado');
  es('un valor en cero tampoco sirve',
     S.faltaParaElCorreo(con({ valor: 0 })).length, 1);
  es('sin sticker falta el sticker',
     S.faltaParaElCorreo(con({ adhesivo: '' }))[0], 'sticker de correspondencia');
  es('y no se llega a ENVIADA',
     S.validarPaso(con({ valor: '' }), 'ENVIADA', 'PROFESIONAL-I').ok, false);

  /* --- quien cierra --- */
  es('un PROFESIONAL-I no aprueba',
     S.validarPaso(con({ estado: 'RESPONDIDA' }), 'APROBADA', 'PROFESIONAL-I').motivo,
     'solo un supervisor cierra una obligación');
  es('un PROFESIONAL-III sí',
     S.validarPaso(con({ estado: 'RESPONDIDA' }), 'APROBADA', 'PROFESIONAL-III').ok, true);
  es('no se salta pasos',
     S.validarPaso(con({ estado: 'PENDIENTE' }), 'ENVIADA', 'ADMIN').ok, false);
}
