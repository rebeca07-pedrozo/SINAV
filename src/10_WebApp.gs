/**
 * SINAV · la aplicacion web.
 * Se despliega ejecutando como el usuario que accede, porque el correo tiene que
 * salir de su cuenta y la respuesta tiene que volver a su bandeja.
 */

function doGet() {
  var t = HtmlService.createTemplateFromFile('ui/Index');
  return t.evaluate()
    .setTitle('SINAV')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Pega un archivo de ui/ dentro de otro. */
function include(archivo) {
  return HtmlService.createHtmlOutputFromFile(archivo).getContent();
}

/**
 * El logo oficial vive en assets/logo-davivienda.png, fuera del script.
 * Si algun dia se sube a Drive, se pone su id aqui en CONFIG como logo_id y la
 * interfaz lo usa; mientras no exista, queda el espacio reservado.
 */
function apiLogo() {
  var id = config('logo_id');
  if (!id) return '';
  try {
    var b = DriveApp.getFileById(id).getBlob();
    return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
  } catch (e) {
    return '';
  }
}
