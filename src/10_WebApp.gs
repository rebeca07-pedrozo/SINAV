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
 * El logo se sirve desde Drive por id.
 *
 * El id se pone en las propiedades del script (Configuracion del proyecto ->
 * Propiedades del script -> logo_id). Esta ahi y no en la hoja CONFIG porque
 * no es un parametro del negocio que alguien vaya a cambiar desde la
 * aplicacion: es cableado del despliegue, y asi no ocupa una fila de una hoja
 * que los usuarios ven.
 *
 * Se sigue leyendo CONFIG.logo_id como respaldo, para no romper un libro que
 * ya lo tuviera puesto ahi.
 *
 * El id es el texto entre /d/ y /view en el enlace de Drive; tambien se acepta
 * el enlace completo. La cuenta que despliega tiene que poder ver el archivo;
 * los usuarios finales no necesitan permiso.
 *
 * Mientras no haya id, la interfaz deja el espacio reservado punteado.
 */
function idLogo() {
  var v = '';
  try {
    v = PropertiesService.getScriptProperties().getProperty('logo_id') || '';
  } catch (e) {
    v = '';
  }
  if (!v) v = config('logo_id');
  var s = String(v || '').trim();
  var m = /\/d\/([A-Za-z0-9_-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_-]+)/.exec(s);
  return m ? m[1] : s;
}

function apiLogo() {
  var id = idLogo();
  if (!id) return '';
  var cache = CacheService.getScriptCache();
  var clave = 'logo:' + id;
  var guardado = cache.get(clave);
  if (guardado) return guardado;
  try {
    var b = DriveApp.getFileById(id).getBlob();
    var uri = 'data:' + b.getContentType() + ';base64,' +
              Utilities.base64Encode(b.getBytes());
    // CacheService admite ~100 KB por clave: si el logo pesa mas, no se cachea
    if (uri.length < 95000) cache.put(clave, uri, 21600);
    return uri;
  } catch (e) {
    return '';
  }
}
