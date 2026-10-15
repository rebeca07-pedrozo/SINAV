/**
 * 31_correo.gs — arma el correo a la oficina desde PLANTILLAS (Fase 2, paso 5). No envía nada.
 * Marcadores: {nombre} en minúsculas. Si queda uno sin reemplazar o falta un dato, el correo NO se arma.
 */

const NOMBRE_PLANTILLA_INICIAL = 'NOTIFICACION_INICIAL';

// Texto del impuesto en el asunto y el cuerpo. TODO(USUARIO): faltan los otros tipos cuando se activen.
const NOMBRES_IMPUESTO = { RETEICA: 'Retención de ICA', AUTORRETEICA: 'Autorretención de ICA' };

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Texto inicial de la plantilla (sale del correo real del equipo). sembrarPlantillas() lo copia a la
// hoja PLANTILLAS una sola vez; desde ahí se edita en la hoja, no aquí.
const PLANTILLA_INICIAL = {
  asunto: '{cod_oficina} -Declaración {impuesto} - {municipio} - {periodicidad} - {valor} - Consecutivo Egreso 25 No- {consecutivo}',
  cuerpo_html: [
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">',
    '<p>{saludo},</p>',
    '<p>Les informo que enviamos por correo interno con el sticker No <b>{sticker}</b> Declaración de {impuesto} <b>{periodicidad}</b> de {anio}, del Municipio de <b>{municipio}</b>, por el valor de <b>{valor}</b> con el NIT {nit_municipio} a la dependencia <b>{cod_oficina}</b>.</p>',
    '<p>Favor realizar el pago por contingencia elaborando egreso 25, de acuerdo al consecutivo de giro asignado para este pago No <b>{consecutivo}</b>, realizar la presentación y el pago una vez reciban el soporte. Si el Banco posee recaudo con el Municipio, timbrar en efectivo con abono a cuenta del Municipio sin olvidar enviar el correo a GRP Conceptos Especiales, si no poseemos recaudo con ellos elaborar el cheque con el mismo egreso 25 y concepto 40 para pagar en otra entidad, o en la alcaldía.</p>',
    '<p>Fecha de vencimiento el <b>{vencimiento}</b>.</p>',
    '<p><b>ASPECTOS A TENER EN CUENTA:</b></p>',
    '<ul>',
    '<li>Por favor una vez presentada la declaración (ante la entidad recaudadora y sellada con fecha de recibido), enviar por este medio imagen del pago y enviar la declaración con el sello de recibido a Dpto. de impuestos, código {codigo_dependencia} a nombre de {responsable_soporte}, si el departamento de impuestos no es notificado mediante correo electrónico, se reportará como evento SARO.</li>',
    '<li><b>Responda sobre este mismo correo, sin abrir uno nuevo</b>, para que su respuesta quede asociada a este trámite.</li>',
    '<li>Si por alguna eventualidad el día anterior a la fecha del vencimiento de la declaración no ha recibido en su oficina el formulario, por favor comunicarse conmigo con carácter urgente. Solicitamos una vez recibido el correo tramitar el pago del mismo, no es necesario esperar a la fecha de vencimiento, para evitar sanciones tributarias; que de generarse, serán cargadas a la oficina responsable del trámite.</li>',
    '<li>Es responsabilidad de la oficina y/o área administrativa llevar a cabo el trámite satisfactorio.</li>',
    '<li>Sugerimos tomar fotocopia del recibido de la declaración y archivar para la oficina. Recuerde que esta documentación es soporte si a futuro se requiere.</li>',
    '</ul>',
    '<p>Cualquier información adicional con gusto atenderé.</p>',
    '<p>Cordialmente,<br>{remitente}</p>',
    '</div>'
  ].join('\n')
};

/** Copia la plantilla inicial a la hoja PLANTILLAS si no existe. Nunca pisa una que ya editaste. */
function sembrarPlantillas() {
  const existe = leerFilas(HOJAS.PLANTILLAS).some(function (p) { return p.nombre === NOMBRE_PLANTILLA_INICIAL; });
  if (existe) { Logger.log('PLANTILLAS ya tiene ' + NOMBRE_PLANTILLA_INICIAL + ': no se tocó.'); return; }
  agregarFilas(HOJAS.PLANTILLAS, [{ nombre: NOMBRE_PLANTILLA_INICIAL, asunto: PLANTILLA_INICIAL.asunto, cuerpo_html: PLANTILLA_INICIAL.cuerpo_html }]);
  Logger.log('Plantilla ' + NOMBRE_PLANTILLA_INICIAL + ' creada en PLANTILLAS.');
}

function formatoPesos(n) {
  return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fechaLarga(fecha, zona) {
  const d = Number(Utilities.formatDate(fecha, zona, 'd'));
  const m = Number(Utilities.formatDate(fecha, zona, 'M'));
  return d + ' de ' + MESES_ES[m - 1] + ' de ' + Utilities.formatDate(fecha, zona, 'yyyy');
}

function escaparHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlATexto(html) {
  return html.replace(/<\/(p|li|div|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Datos de los marcadores. Pura. Devuelve {datos, faltan}: si falta algo no se inventa, se lista.
 * cfg = {responsable_soporte, codigo_dependencia, remitente}; zona y ahora salen de fuera para poder probarla.
 */
function datosCorreo(o, cfg, zona, ahora) {
  const faltan = [];
  const texto = function (campo, valor) {
    const t = String(valor === null || valor === undefined ? '' : valor).trim();
    if (t === '') faltan.push(campo);
    return t;
  };
  const datos = {
    cod_oficina: texto('cod_oficina', o.cod_oficina),
    municipio: texto('municipio', o.municipio).toUpperCase(),
    periodicidad: texto('periodicidad', o.periodicidad),
    nit_municipio: texto('nit_municipio', o.nit_municipio),
    sticker: texto('sticker', o.sticker),
    consecutivo: texto('consecutivo_egreso', o.consecutivo_egreso),
    anio: texto('periodo', o.periodo).slice(0, 4),
    responsable_soporte: texto('CONFIG responsable_soporte', cfg.responsable_soporte),
    codigo_dependencia: texto('CONFIG codigo_dependencia', cfg.codigo_dependencia),
    remitente: texto('CONFIG nombre_remitente', cfg.remitente),
    saludo: Number(Utilities.formatDate(ahora, zona, 'H')) < 12 ? 'Buenos días' : 'Buenas tardes'
  };
  datos.impuesto = NOMBRES_IMPUESTO[o.tipo_obligacion] || '';
  if (!datos.impuesto) faltan.push('nombre del impuesto para ' + o.tipo_obligacion);
  if (typeof o.valor === 'number' && o.valor > 0) datos.valor = formatoPesos(o.valor); else faltan.push('valor');
  if (o.vencimiento instanceof Date) datos.vencimiento = fechaLarga(o.vencimiento, zona); else faltan.push('vencimiento');
  return { datos: datos, faltan: faltan };
}

function rellenar(texto, datos, escapar) {
  return texto.replace(/\{([a-z_]+)\}/g, function (m, k) {
    if (!(k in datos)) return m;
    return escapar ? escaparHtml(datos[k]) : datos[k];
  });
}

/**
 * Arma asunto, HTML y texto plano. Pura. Devuelve {ok:true, asunto, html, texto, adjuntoId}
 * o {ok:false, faltan:[...]}: nunca sale un correo con un dato en blanco o un {marcador} suelto.
 */
function armarCorreoCon(o, plantilla, cfg, zona, ahora) {
  const d = datosCorreo(o, cfg, zona, ahora);
  const adjuntoId = idDriveDe(o.adjunto_salida_id);
  if (!adjuntoId) d.faltan.push('adjunto_salida_id');
  if (d.faltan.length) return { ok: false, faltan: d.faltan };

  const asunto = rellenar(plantilla.asunto, d.datos, false);
  const html = rellenar(plantilla.cuerpo_html, d.datos, true);
  const sueltos = (asunto + html).match(/\{[a-z_]+\}/g);
  if (sueltos) return { ok: false, faltan: ['marcador sin datos en la plantilla: ' + sueltos.join(', ')] };
  return { ok: true, asunto: asunto, html: html, texto: htmlATexto(html), adjuntoId: adjuntoId };
}

/** Arma el correo de una obligación con la plantilla de la hoja y los datos de CONFIG. */
function armarCorreo(o) {
  const p = leerFilas(HOJAS.PLANTILLAS).filter(function (f) { return f.nombre === NOMBRE_PLANTILLA_INICIAL; })[0];
  if (!p) throw new Error('Falta la plantilla ' + NOMBRE_PLANTILLA_INICIAL + ' en PLANTILLAS. Corre sembrarPlantillas().');
  const cfg = {
    responsable_soporte: configOpcional('responsable_soporte'),
    codigo_dependencia: configOpcional('codigo_dependencia'),
    remitente: configOpcional('nombre_remitente')
  };
  return armarCorreoCon(o, { asunto: p.asunto, cuerpo_html: p.cuerpo_html }, cfg, Session.getScriptTimeZone(), new Date());
}

/** Muestra en el log cómo quedaría el correo de la primera obligación de la cola. No envía nada. */
function vistaPreviaCorreo() {
  const r = colaEnvio();
  if (!r.cola.length) { Logger.log('La cola está vacía: no hay correo que mostrar. Corre resumirCola().'); return; }
  const item = r.cola[0];
  const c = armarCorreo(item.obligacion);
  Logger.log('Obligación: ' + item.obligacion.id + ' · destinatarios: ' + item.clasificacion.destinatarios.join(', ') +
    ' (' + item.clasificacion.fuente + ')');
  if (!c.ok) { Logger.log('NO SE PUEDE ARMAR. Faltan: ' + c.faltan.join(' | ')); return; }
  Logger.log('ASUNTO: ' + c.asunto);
  Logger.log('--- CUERPO ---\n' + c.texto);
  Logger.log('Adjunto (id Drive): ' + c.adjuntoId);
}
