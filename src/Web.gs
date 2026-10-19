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

/** Permite partir la interfaz en varios archivos .html con <?!= incluir('Nombre') ?>. */
function incluir(nombre) {
  return HtmlService.createTemplateFromFile(nombre).evaluate().getContent();
}

/**
 * Apps Script no sirve archivos sueltos como assets/logo-davivienda.png.
 * El logo oficial se sube a Drive y su id va en la propiedad del script logo_id.
 * Si falta, la página muestra el espacio reservado "logo".
 */
function logoComoDatos() {
  try {
    const id = idDeLink(leerConfig().logo_id);
    if (!id) return '';
    const blob = DriveApp.getFileById(id).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

// ---------- Ajustes: equipo y avisos ----------
// El modo NO se puede cambiar desde aquí: solo se edita a mano en CONFIG.

function leerAjustes() {
  const cfg = leerConfig();
  return {
    nombre: cfg.nombre_remitente,
    correoDepto: cfg.correo_remitente,
    copia: listaCorreos(cfg.copia_oculta),
    avisarEquipo: String(cfg.avisar_equipo).toUpperCase() !== 'NO',
    diasRespuesta: Number(cfg.dias_respuesta) || 3,
    yo: quienSoy(),
    dueno: correoDueno(),
    copiaAMi: String(cfg.copia_a_mi).toUpperCase() !== 'NO',
    modo: cfg.esPrueba ? 'PRUEBA' : 'PRODUCCION'
  };
}

function guardarAjustes(a) {
  const copia = (a.copia || []).map(function (c) { return String(c).trim(); }).filter(Boolean);
  copia.forEach(function (c) {
    if (listaCorreos(c).length !== 1) throw new Error('«' + c + '» no parece un correo válido.');
  });
  const dias = Math.round(Number(a.diasRespuesta));
  if (!(dias >= 1 && dias <= 30)) throw new Error('Los días de espera deben estar entre 1 y 30.');
  conLock(function () {
    guardarConfig('copia_oculta', copia.join(', '));
    guardarConfig('avisar_equipo', a.avisarEquipo ? 'SI' : 'NO');
    guardarConfig('dias_respuesta', String(dias));
    guardarConfig('copia_a_mi', a.copiaAMi ? 'SI' : 'NO');
    registrarEventos([['AJUSTES', 'AVISO', quienSoy() + ' dejó ' + copia.length + ' correos en copia oculta, avisar al equipo: ' +
      (a.avisarEquipo ? 'SI' : 'NO') + ', días de espera: ' + dias]]);
  });
  return leerAjustes();
}
