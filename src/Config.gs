/**
 * Config.gs — constantes, hoja, CONFIG, contador de correos y lock.
 */

const COLUMNAS = [
  'municipio', 'cod_oficina', 'impuesto', 'periodo', 'vence', 'nit_municipio',
  'correo_oficina', 'responsable', 'consecutivo', 'sticker', 'valor', 'periodicidad', 'egreso',
  'estado', 'soporte_link', 'fecha_envio', 'hilo', 'fecha_respuesta', 'sellado_link',
  'enviado_por', 'respondio_por', 'enviado_a'
];
const PRIMERA_DEL_PROGRAMA = 14; // columna "estado" (1-based): de aquí en adelante las llena el programa
const COLUMNAS_DIRECTORIO = ['cod_oficina', 'municipio', 'correos_para', 'contacto'];
const COLUMNAS_RESPONSABLES = ['responsable', 'correo', 'cargo', 'celular'];
const ESTADOS = ['PENDIENTE', 'ENVIADA', 'RESPONDIDA', 'ERROR'];
const COLUMNAS_EVENTOS = ['fecha', 'obligacion', 'que_paso', 'detalle'];
const LIMITE_CORREOS = 1500;
const DIAS_VENCIDA_AVISO = 30; // las vencidas siguen en el aviso diario hasta este tope
const TIEMPO_MAX_MS = 4.5 * 60 * 1000; // margen bajo los 6 min de Apps Script

// Los ids de Drive no van en el código ni en la hoja: viven en Propiedades del script
// (Configuración del proyecto → Propiedades del script): carpeta_soportes, carpeta_sellados, logo_id.
const PROPIEDADES_DRIVE = ['carpeta_soportes', 'carpeta_sellados', 'logo_id'];

const CONFIG_INICIAL = [
  ['correo_remitente', 'impuestosdavivienda@davivienda.com'],
  ['nombre_remitente', 'Departamento de impuestos - Banco Davivienda'],
  ['dias_aviso', '10,4,2,0'],
  ['modo', 'PRUEBA'],
  // Agregados en esta fase (ver LEEME):
  ['copia_visible', ''],       // correos en CC que la oficina sí ve (ej. grpconceptosespeciales@...)
  ['copia_oculta', ''],        // correos que reciben copia sin que nadie los vea (BCC)
  ['responder_a', ''],         // vacío = las respuestas llegan a la cuenta que envía (recomendado)
  ['codigo_depto', '9413'],    // código del Dpto. de Impuestos que va en el cuerpo del correo
  ['concepto', '40'],          // concepto del cheque que va en el cuerpo del correo
  ['direccion_firma', 'Avenida El Dorado # 68B - 31. Piso 5. Bogotá'],
  ['usar_alias', 'NO'],        // SI solo cuando "Enviar como" ya esté autorizado en Gmail
  ['dias_respuesta', '3'],     // días hábiles que se espera que tarde la oficina en responder
  ['avisar_equipo', 'SI'],     // al llegar un sellado, avisar también a la lista en copia oculta
  ['copia_a_mi', 'SI']         // el dueño de la app recibe copia de cada aviso y de cada sellado
  // Correos de oficinas: pestaña DIRECTORIO. Responsables (aviso y firma): pestaña RESPONSABLES.
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
  const props = PropertiesService.getScriptProperties();
  PROPIEDADES_DRIVE.forEach(function (k) { cfg[k] = (props.getProperty(k) || '').trim(); });
  // Seguro por defecto: cualquier cosa distinta de PRODUCCION es PRUEBA.
  cfg.esPrueba = String(cfg.modo).toUpperCase() !== 'PRODUCCION';
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
