/**
 * 02_utiles.gs — lock y normalización de texto.
 * (Fechas, periodos y lotes se agregan en la Fase 1, cuando los necesite el generador.)
 */

/** Ejecuta fn bajo LockService. Dos triggers solapados corrompen las hojas. */
function conLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Mayúsculas, sin tildes, sin espacios repetidos. Para comparar, no para mostrar. */
function normalizarTexto(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}
