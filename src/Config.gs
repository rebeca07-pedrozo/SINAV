/**
 * Config.gs — constantes, hoja, CONFIG, contador de correos y lock.
 */

const COLUMNAS = [
  'municipio', 'cod_oficina', 'impuesto', 'periodo', 'vence', 'nit_municipio',
  'correo_oficina', 'responsable', 'consecutivo', 'sticker', 'valor',
  'estado', 'soporte_id', 'fecha_envio', 'hilo', 'fecha_respuesta', 'sellado_id'
];
const PRIMERA_DEL_PROGRAMA = 12; // columna "estado" (1-based)
const ESTADOS = ['PENDIENTE', 'ENVIADA', 'RESPONDIDA', 'ERROR'];
const COLUMNAS_EVENTOS = ['fecha', 'obligacion', 'que_paso', 'detalle'];
const LIMITE_CORREOS = 1500;
const TIEMPO_MAX_MS = 4.5 * 60 * 1000; // margen bajo los 6 min de Apps Script

const CONFIG_INICIAL = [
  ['correo_remitente', 'impuestosdavivienda@davivienda.com'],
  ['nombre_remitente', 'Departamento de Impuestos'],
  ['carpeta_soportes', ''],
  ['carpeta_sellados', ''],
  ['dias_aviso', '10,4,2,0'],
  ['modo', 'PRUEBA'],
  // Agregados en esta fase (ver LEEME):
  ['copia_oculta', ''],        // correos que reciben copia sin que nadie los vea (BCC)
  ['responder_a', ''],         // si está vacío se usa correo_remitente
  ['usar_alias', 'NO'],        // SI solo cuando "Enviar como" ya esté autorizado en Gmail
  ['logo_id', '']              // id de Drive del logo oficial
];

// ---------- Libro y hojas ----------

function libro() {
  const id = PropertiesService.getScriptProperties().getProperty('libro_id');
  if (!id) throw new Error('Falta ejecutar instalar() una vez.');
  return SpreadsheetApp.openById(id);
}

function hoja(nombre) {
  const h = libro().getSheetByName(nombre);
  if (!h) throw new Error('No existe la pestaña ' + nombre + '. Ejecuta instalar().');
  return h;
}

// ---------- CONFIG ----------

function leerConfig() {
  const h = hoja('CONFIG');
  const ultima = h.getLastRow();
  const cfg = {};
  if (ultima >= 2) {
    h.getRange(2, 1, ultima - 1, 2).getValues().forEach(function (f) {
      if (f[0] !== '') cfg[String(f[0]).trim()] = String(f[1]).trim();
    });
  }
  CONFIG_INICIAL.forEach(function (p) { if (cfg[p[0]] === undefined) cfg[p[0]] = p[1]; });
  // Seguro por defecto: cualquier cosa distinta de PRODUCCION es PRUEBA.
  cfg.esPrueba = String(cfg.modo).toUpperCase() !== 'PRODUCCION';
  cfg.responder_a = cfg.responder_a || cfg.correo_remitente;
  return cfg;
}

function guardarConfig(parametro, valor) {
  const h = hoja('CONFIG');
  const ultima = h.getLastRow();
  const datos = ultima >= 2 ? h.getRange(2, 1, ultima - 1, 1).getValues() : [];
  for (let i = 0; i < datos.length; i++) {
    if (String(datos[i][0]).trim() === parametro) {
      h.getRange(i + 2, 2).setValue(valor);
      return;
    }
  }
  h.appendRow([parametro, valor]);
}

// ---------- Contador diario de correos ----------
// Se llama siempre dentro de un lock (lo toma quien envía).

function hoyTexto() {
  return Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd');
}

function correosHoy() {
  const crudo = PropertiesService.getScriptProperties().getProperty('contador');
  const c = crudo ? JSON.parse(crudo) : null;
  return (c && c.dia === hoyTexto()) ? c.n : 0;
}

function sumarCorreos(cuantos) {
  const n = correosHoy() + cuantos;
  PropertiesService.getScriptProperties().setProperty('contador', JSON.stringify({ dia: hoyTexto(), n: n }));
  return n;
}

function cupoRestante() {
  let real = LIMITE_CORREOS;
  try { real = MailApp.getRemainingDailyQuota(); } catch (e) { /* sin permiso: usa el contador */ }
  return Math.max(0, Math.min(LIMITE_CORREOS - correosHoy(), real));
}

// ---------- Lock ----------

function conLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Hay otra operación en curso. Espera unos segundos e intenta de nuevo.');
  }
  try { return fn(); } finally { lock.releaseLock(); }
}
