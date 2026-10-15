/**
 * 32_enviar.gs — envía lo que hay en la cola (Fase 2, paso 6).
 * OBSERVACION: no envía nada, solo muestra qué haría. PRUEBA: todo va a correo_administrador.
 * PRODUCCION: bloqueado a propósito hasta el paso siguiente (no está probado).
 */

const MOTIVO_DATOS_INCOMPLETOS = 'DATOS_INCOMPLETOS';
const MOTIVO_ERROR_ENVIO = 'ERROR_ENVIO';

/**
 * Qué hacer según `modo`. Pura. Devuelve {accion:'SIMULAR'} o {accion:'ENVIAR', para:[correos]}.
 * En PRUEBA el destino es siempre el administrador, nunca una oficina.
 */
function decidirDestino(modo, correoAdmin) {
  if (modo === 'OBSERVACION') return { accion: 'SIMULAR' };
  if (modo === 'PRUEBA') {
    const para = correosDe(correoAdmin);
    if (!para.length) throw new Error('CONFIG: correo_administrador está vacío o no es un correo. En modo PRUEBA no hay a quién enviar.');
    return { accion: 'ENVIAR', para: para };
  }
  if (modo === 'PRODUCCION') throw new Error('El modo PRODUCCION todavía no está habilitado en el código (paso siguiente). Vuelve modo a PRUEBA u OBSERVACION.');
  throw new Error('CONFIG: modo debe ser ' + MODOS_VALIDOS.join(' | ') + ' (hoy: "' + modo + '").');
}

/** Marca el correo como de prueba y dice a quién habría ido. Pura. */
function marcarComoPrueba(correo, destinatariosReales) {
  const aviso = 'PRUEBA: este correo habría ido a ' + destinatariosReales.join(', ');
  return {
    asunto: '[PRUEBA] ' + correo.asunto,
    html: '<p style="background:#fff3cd;padding:8px;border:1px solid #b06c00"><b>' + escaparHtml(aviso) + '</b></p>' + correo.html,
    texto: aviso + '\n\n' + correo.texto
  };
}

/** ¿Caben `nuevos` destinatarios en el tope del día y en la cuota real de Gmail? Pura. */
function cabeEnTope(usados, nuevos, tope, cuotaReal) {
  return usados + nuevos <= tope && nuevos <= cuotaReal;
}

function claveContadorDia() { return 'envios_' + fechaIso(new Date()); }

/** Destinatarios ya enviados hoy por la cuenta que ejecuta (la cuota de Gmail es por cuenta). */
function enviadosHoy() {
  return Number(PropertiesService.getUserProperties().getProperty(claveContadorDia()) || 0);
}

function sumarEnviadosHoy(n) {
  const props = PropertiesService.getUserProperties();
  const hoy = claveContadorDia();
  Object.keys(props.getProperties()).forEach(function (k) { if (k.indexOf('envios_') === 0 && k !== hoy) props.deleteProperty(k); });
  props.setProperty(hoy, String(enviadosHoy() + n));
}

function siguienteIntento(idObligacion, modo) {
  return leerFilas(HOJAS.ENVIOS).filter(function (e) { return e.id_obligacion === idObligacion && e.modo === modo; }).length + 1;
}

/**
 * Envía hasta `maximo` obligaciones de la cola (por defecto 1, para probar de a una).
 * No cambia el estado de la obligación en PRUEBA: una prueba no es la notificación real.
 */
function enviarCola(maximo) {
  const modo = configOpcional('modo');
  const tope = Number(configOpcional('tope_correos_dia') || 0);
  const limite = maximo || 1;
  const opciones = remitente();          // si falla (nombre, cuenta, alias), se aborta toda la corrida
  const cuenta = Session.getActiveUser().getEmail();
  const admin = configOpcional('correo_administrador');
  decidirDestino(modo, admin);           // falla pronto si el modo no se puede ejecutar

  let hechos = 0;
  const r = colaEnvio();
  Logger.log('Modo ' + modo + ' · cola de ' + r.cola.length + ' · máximo ' + limite + ' en esta corrida');

  for (let i = 0; i < r.cola.length && hechos < limite; i++) {
    const o = r.cola[i].obligacion, clas = r.cola[i].clasificacion;
    const c = armarCorreo(o);
    if (!c.ok) {
      registrarExcepcionesGenerador([{ id_obligacion: o.id, motivo: MOTIVO_DATOS_INCOMPLETOS, detalle: 'Falta: ' + c.faltan.join(', ') }]);
      Logger.log('  SALTADA ' + o.id + ': falta ' + c.faltan.join(', '));
      continue;
    }

    const destino = decidirDestino(modo, admin);
    if (destino.accion === 'SIMULAR') {
      Logger.log('  SIMULADO ' + o.id + ' → ' + clas.destinatarios.join(', ') + ' (' + clas.fuente + ') · ' + c.asunto);
      hechos++;
      continue;
    }

    if (!cabeEnTope(enviadosHoy(), destino.para.length, tope, MailApp.getRemainingDailyQuota())) {
      Logger.log('  FRENADO: tope diario (' + tope + ') o cuota de Gmail alcanzados. Hoy van ' + enviadosHoy() + '.');
      break;
    }
    try {
      const correo = marcarComoPrueba(c, clas.destinatarios);
      const adjunto = DriveApp.getFileById(c.adjuntoId).getBlob();
      const opcionesEnvio = Object.assign({}, opciones, { htmlBody: correo.html, attachments: [adjunto] });
      // createDraft().send() devuelve el mensaje; sendEmail() no, y sin el threadId no hay emparejamiento.
      const mensaje = GmailApp.createDraft(destino.para.join(','), correo.asunto, correo.texto, opcionesEnvio).send();
      sumarEnviadosHoy(destino.para.length);
      agregarFilas(HOJAS.ENVIOS, [{
        id_envio: Utilities.getUuid().slice(0, 8), id_obligacion: o.id, intento_n: siguienteIntento(o.id, modo),
        fecha_envio: new Date(), thread_id: mensaje.getThread().getId(), message_id: mensaje.getId(),
        destinatarios: destino.para.join(', '), asunto: correo.asunto, adjunto_id: c.adjuntoId, modo: modo,
        resultado: 'ENVIADO', enviado_por: cuenta
      }]);
      Logger.log('  ENVIADO ' + o.id + ' → ' + destino.para.join(', ') + ' · hilo ' + mensaje.getThread().getId());
      hechos++;
    } catch (e) {
      registrarExcepcionesGenerador([{ id_obligacion: o.id, motivo: MOTIVO_ERROR_ENVIO, detalle: e.message }]);
      Logger.log('  ERROR ' + o.id + ': ' + e.message + ' (se detiene la corrida)');
      break;
    }
  }
  Logger.log('Listo: ' + hechos + ' ' + (modo === 'OBSERVACION' ? 'simulados' : 'enviados') + '.');
}
