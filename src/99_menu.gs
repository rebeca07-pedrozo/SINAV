/**
 * 99_menu.gs — menú en la hoja.
 * onOpen solo se dispara si el script está VINCULADO al libro (Extensiones → Apps Script
 * desde el libro OPERACIÓN). Ver docs/decisiones.md, 2026-10-15.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SINAV')
    .addItem('Verificar instalación', 'verificarInstalacion')
    .addItem('Activar observador', 'activarObservador')
    .addItem('Desactivar observador', 'desactivarObservador')
    .addToUi();
}
