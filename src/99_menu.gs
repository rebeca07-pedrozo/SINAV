/**
 * 99_menu.gs — menú en la hoja.
 * TODO(USUARIO): onOpen solo se dispara si el script está VINCULADO al libro (container-bound).
 * instalar() crea el libro desde un script independiente, así que este menú no aparecerá
 * hasta que decidas cómo vincularlo. Ver conclusiones.md, punto 1.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SINAV')
    .addItem('Verificar instalación', 'verificarInstalacion')
    .addItem('Activar observador', 'activarObservador')
    .addItem('Desactivar observador', 'desactivarObservador')
    .addToUi();
}
