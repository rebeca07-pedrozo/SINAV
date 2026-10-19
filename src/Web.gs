/**
 * Web.gs — la app web (HtmlService) y los ajustes que se editan desde la interfaz.
 */

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.logo = logoComoDatos();
  return t.evaluate()
    .setTitle('Obligaciones de impuestos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Apps Script no sirve archivos sueltos como assets/logo-davivienda.png.
 * El logo oficial se sube a Drive y su id va en CONFIG (logo_id). Si falta, la página
 * muestra el espacio reservado "logo".
 */
function logoComoDatos() {
  try {
    const id = leerConfig().logo_id;
    if (!id) return '';
    const blob = DriveApp.getFileById(id).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

// ---------- Ajustes (destinatarios) ----------
// El modo NO se puede cambiar desde aquí: solo se edita a mano en CONFIG.

function leerAjustes() {
  const cfg = leerConfig();
  return {
    copia_oculta: cfg.copia_oculta, responder_a: cfg.responder_a, usar_alias: cfg.usar_alias,
    correo_remitente: cfg.correo_remitente, modo: cfg.esPrueba ? 'PRUEBA' : 'PRODUCCION',
    aliasDisponibles: GmailApp.getAliases()
  };
}

function guardarAjustes(ajustes) {
  const copia = listaCorreos(ajustes.copia_oculta);
  const responder = listaCorreos(ajustes.responder_a);
  if (ajustes.responder_a && !responder.length) throw new Error('El correo para respuestas no es válido.');
  conLock(function () {
    guardarConfig('copia_oculta', copia.join(', '));
    guardarConfig('responder_a', responder.join(', '));
    guardarConfig('usar_alias', ajustes.usar_alias === 'SI' ? 'SI' : 'NO');
    registrarEventos([['AJUSTES', 'AVISO', 'Copia oculta: ' + copia.length + ' correos · usar_alias: ' + (ajustes.usar_alias === 'SI' ? 'SI' : 'NO')]]);
  });
  return leerAjustes();
}
