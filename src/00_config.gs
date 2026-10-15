/**
 * 00_config.gs — lectura de la hoja CONFIG y de ScriptProperties.
 * Regla: ningún correo, id ni carpeta vive quemado en el código. Todo sale de CONFIG.
 */

const PROP = {
  LIBRO_ID: 'libro_operacion_id',
  CARPETA_RAIZ_ID: 'carpeta_raiz_id'
};

// Valores por defecto al instalar. Nunca pisan lo que ya escribiste en CONFIG.
const CONFIG_DEFECTO = [
  // TODO(USUARIO): confirma estos valores en la hoja CONFIG después de instalar().
  ['alias_envio', 'impuestosdavivienda@davivienda.com'],
  ['modo_remitente', 'CUENTA_QUE_ENVIA'], // CUENTA_QUE_ENVIA | ALIAS (ver docs/decisiones.md, 2026-10-15)
  ['nombre_remitente', ''],               // lo que ven las oficinas, p. ej. Impuestos Davivienda
  ['responsable_soporte', ''],            // nombre al que la oficina envía el soporte sellado (va en el cuerpo del correo)
  ['codigo_dependencia', '9413'],         // código del Dpto. de impuestos que va en el cuerpo del correo
  ['correo_administrador', ''],
  ['etiqueta_respuestas', ''],
  ['carpeta_salida_id', ''],
  ['carpeta_evidencia_id', ''],
  ['calendario_libro_id', ''],
  ['calendario_hoja', ''],
  ['hoja_reteica', 'Retención ICA'],      // hoja del libro del calendario con CC, Pago, Presentacion y responsable
  ['hoja_responsable', 'Responsable'],    // hoja que traduce la inicial del responsable a su nombre
  ['etiqueta_gmail', ''],
  ['dias_alerta', '10,4,2,0'],
  ['dias_aviso_sin_adjunto', 10],         // una obligación por enviar sin PDF se avisa en EXCEPCIONES cuando vence en ≤ estos días
  ['tipos_activos', 'RETEICA'],
  ['modo', 'OBSERVACION'],   // no lo cambies desde código: solo tú, en la hoja
  ['tope_correos_dia', 1500]
];

const MODOS_VALIDOS = ['OBSERVACION', 'PRUEBA', 'PRODUCCION'];

let _cacheConfig = null;

function cargarConfig() {
  if (_cacheConfig) return _cacheConfig;
  const filas = hojaDe(HOJAS.CONFIG).getDataRange().getValues().slice(1);
  _cacheConfig = {};
  filas.forEach(function (f) { if (f[0] !== '') _cacheConfig[String(f[0]).trim()] = f[1]; });
  return _cacheConfig;
}

/** Valor de un parámetro. Falla si la clave no existe en CONFIG. */
function config(clave) {
  const c = cargarConfig();
  if (!(clave in c)) throw new Error('Falta el parámetro "' + clave + '" en CONFIG.');
  return c[clave];
}

/** Igual que config() pero devuelve '' si está vacío o no existe. */
function configOpcional(clave) {
  const v = cargarConfig()[clave];
  return v === undefined || v === null ? '' : String(v).trim();
}
