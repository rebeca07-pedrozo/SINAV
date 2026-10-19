/**
 * Plantilla.gs — el correo que reciben las oficinas (mismo texto que se manda hoy desde Outlook).
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(d) {
  return d ? d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() : '';
}

/** $722.000 (sin espacio, como en el correo actual). */
function pesosPegado(n) {
  return '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escapar(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Datos que el cuerpo del correo necesita y que no pueden ir vacíos. */
function camposFaltantes(o) {
  const f = [];
  if (!o.impuesto) f.push('impuesto');
  if (!o.periodicidad) f.push('periodicidad');
  if (!o.periodo) f.push('periodo');
  if (!o.vence) f.push('vence');
  if (!o.nit_municipio) f.push('nit_municipio');
  if (!o.consecutivo) f.push('consecutivo');
  if (!o.sticker) f.push('sticker');
  if (!o.egreso) f.push('egreso');
  if (!(Number(o.valor) > 0)) f.push('valor');
  if (!o.responsable) f.push('responsable');
  return f;
}

/**
 * oficina = lista de correos a los que iría; responsable = fila de RESPONSABLES (puede faltar).
 * Devuelve { asunto, texto, html }.
 */
function armarCorreo(o, cfg, oficina, responsable) {
  const valor = pesosPegado(o.valor);
  const anio = (String(o.periodo).match(/(\d{4})/) || [])[1] || '';
  const periodicidad = String(o.periodicidad).toUpperCase();
  const asunto = (cfg.esPrueba ? '[PRUEBA] ' : '') + o.cod_oficina + ' -Declaración ' + o.impuesto + '- ' + o.municipio + ' - ' +
    periodicidad + ' - ' + valor + ' - Consecutivo Egreso ' + o.egreso + ' No- ' + o.consecutivo;

  const parrafos = [
    'Buenas tardes,',
    'Les informo que enviamos por correo interno con el sticker No ' + o.sticker + ' Declaración de ' + o.impuesto + ' ' + periodicidad +
      (anio ? ' de ' + anio : '') + ', del Municipio de ' + o.municipio + ', por el valor de ' + valor + ' con el NIT ' + o.nit_municipio +
      ' a la dependencia ' + o.cod_oficina,
    'Favor realizar el pago por contingencia elaborando egreso ' + o.egreso + ', de acuerdo al consecutivo de giro asignado para este pago No ' +
      o.consecutivo + ', realizar la presentación y el pago una vez reciban el soporte. Si el Banco posee recaudo con el Municipio, timbrar en ' +
      'efectivo con abono a cuenta del Municipio sin olvidar enviar el correo a GRP Conceptos Especiales, si no poseemos recaudo con ellos ' +
      'elaborar el cheque con el mismo egreso ' + o.egreso + ' y concepto ' + cfg.concepto + ' para pagar en otra entidad, o en la alcaldía.',
    'Fecha de vencimiento el ' + fechaLarga(o.vence) + '.'
  ];
  const aspectos = [
    'Por favor una vez presentada la declaración (ante la entidad recaudadora y sellada con fecha de recibido), enviar por este medio imagen del pago y ' +
      ' enviar la declaración con el sello de recibido a Dpto. de impuestos, código ' + cfg.codigo_depto + ' a nombre de ' + o.responsable +
      ', si el departamento de impuestos no es notificado mediante correo electrónico, se reportará como evento SARO. ' +
      'Responda sobre este mismo correo, no abra uno nuevo.',
    'Si por alguna eventualidad el día anterior a la fecha del vencimiento de la declaración no ha recibido en su oficina el formulario, por favor ' +
      'comunicarse conmigo con carácter urgente. Solicitamos una vez recibido el correo tramitar el pago del mismo, no es necesario esperar a la fecha ' +
      'de vencimiento,  para evitar sanciones tributarias; que de generarse, serán cargadas a la oficina responsable del trámite.',
    'Es responsabilidad de la oficina y/o área administrativa llevar a cabo el trámite satisfactorio.',
    'Sugerimos tomar fotocopia del recibido de la declaración y archivar para la oficina, Recuerde que esta documentación es soporte si a futuro se requiere.'
  ];
  const cierre = 'Cualquier información adicional con gusto atenderé.';

  const firma = ['--', 'Cordialmente,', o.responsable];
  if (responsable && responsable.cargo) firma.push(responsable.cargo);
  if (responsable && responsable.celular) firma.push('Cel. ' + responsable.celular);
  if (responsable && responsable.correo) firma.push(responsable.correo);
  if (cfg.direccion_firma) firma.push(cfg.direccion_firma);
  firma.push('Banco Davivienda S.A.');

  const nota = cfg.esPrueba ? 'MODO PRUEBA. Habría ido a: ' + (oficina.join(', ') || '(sin correo)') : '';

  const texto = (nota ? nota + '\n\n' : '') + parrafos.join('\n\n') + '\n\nASPECTOS A TENER EN CUENTA:\n' +
    aspectos.map(function (a) { return '•  ' + a; }).join('\n') + '\n\n' + cierre + '\n' + firma.join('\n');

  const html = '<div style="font-family:Calibri,Segoe UI,Helvetica,sans-serif;font-size:14px;color:#000">' +
    (nota ? '<p style="background:#FFE11B;color:#000;padding:8px 12px;margin:0 0 12px"><b>MODO PRUEBA</b> — habría ido a: ' + escapar(oficina.join(', ') || '(sin correo)') + '</p>' : '') +
    parrafos.map(function (p) { return '<p>' + escapar(p) + '</p>'; }).join('') +
    '<p><b>ASPECTOS A TENER EN CUENTA:</b></p><ul>' + aspectos.map(function (a) { return '<li style="margin-bottom:6px">' + escapar(a) + '</li>'; }).join('') + '</ul>' +
    '<p>' + escapar(cierre) + '</p><p>' + firma.map(escapar).join('<br>') + '</p></div>';
  return { asunto: asunto, texto: texto, html: html };
}
