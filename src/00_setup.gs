/**
 * 00_setup.gs — instalar() y verificarInstalacion().
 * instalar() es idempotente: puedes correrla varias veces; solo crea lo que falte.
 */

const NOMBRE_LIBRO = 'SINAV - Operación';
const NOMBRE_CARPETA_RAIZ = 'SINAV';
const NOMBRE_CARPETA_SALIDA = 'Declaraciones por enviar';
const NOMBRE_CARPETA_EVIDENCIA = 'Evidencia';

function instalar() {
  const props = PropertiesService.getScriptProperties();
  const libro = obtenerOCrearLibro(props);

  Object.keys(HOJAS).forEach(function (k) { asegurarHoja(libro, HOJAS[k]); });
  quitarHojaPorDefecto(libro);
  asegurarConfig(libro);
  _cacheConfig = null;

  const raiz = obtenerOCrearCarpetaRaiz(props);
  const salida = asegurarCarpeta(raiz, NOMBRE_CARPETA_SALIDA, 'carpeta_salida_id', libro);
  const evidencia = asegurarCarpeta(raiz, NOMBRE_CARPETA_EVIDENCIA, 'carpeta_evidencia_id', libro);

  const etiqueta = configOpcional('etiqueta_respuestas');
  if (etiqueta && !GmailApp.getUserLabelByName(etiqueta)) GmailApp.createLabel(etiqueta);

  Logger.log('=== SINAV instalado ===');
  Logger.log('Libro OPERACIÓN: ' + libro.getUrl() + '  (id ' + libro.getId() + ')');
  Logger.log('Carpeta raíz: ' + raiz.getUrl());
  Logger.log('Declaraciones por enviar: ' + salida.getUrl() + '  (id ' + salida.getId() + ')');
  Logger.log('Evidencia: ' + evidencia.getUrl() + '  (id ' + evidencia.getId() + ')');
  Logger.log('Modo actual: ' + config('modo') + ' (el instalador nunca lo cambia)');
  Logger.log('Siguiente paso: completa CONFIG y corre verificarInstalacion().');
  // TODO(USUARIO): el filtro de Gmail que etiqueta las respuestas de las oficinas con
  // `etiqueta_respuestas` NO lo crea este script (requiere un servicio avanzado de Gmail).
  // Créalo a mano: ver docs/instalacion.md.
}

function obtenerOCrearLibro(props) {
  const id = props.getProperty(PROP.LIBRO_ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {
      throw new Error('El libro guardado (' + id + ') no se puede abrir: ' + e.message +
        '. Si lo borraste, elimina la propiedad ' + PROP.LIBRO_ID + ' y corre instalar() de nuevo.');
    }
  }
  // Script vinculado al libro (Extensiones → Apps Script): se adopta ese libro, no se crea otro.
  const vinculado = SpreadsheetApp.getActiveSpreadsheet();
  if (vinculado) {
    props.setProperty(PROP.LIBRO_ID, vinculado.getId());
    return vinculado;
  }
  const libro = SpreadsheetApp.create(NOMBRE_LIBRO);
  props.setProperty(PROP.LIBRO_ID, libro.getId());
  return libro;
}

function asegurarHoja(libro, nombre) {
  const hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  const enc = ENCABEZADOS[nombre];
  if (enc.length && hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  } else if (enc.length) {
    // Migración: si el encabezado actual es un prefijo del esquema, solo se agregan las columnas nuevas al final.
    const real = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const esPrefijo = real.length < enc.length && real.every(function (c, i) { return c === enc[i]; });
    if (esPrefijo) hoja.getRange(1, real.length + 1, 1, enc.length - real.length).setValues([enc.slice(real.length)]).setFontWeight('bold');
  }
  return hoja;
}

function quitarHojaPorDefecto(libro) {
  const h = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (h && libro.getSheets().length > 1 && h.getLastRow() === 0) libro.deleteSheet(h);
}

/** Agrega a CONFIG los parámetros que falten, sin tocar los que ya tienen valor. */
function asegurarConfig(libro) {
  const hoja = libro.getSheetByName(HOJAS.CONFIG);
  const existentes = hoja.getLastRow() > 1
    ? hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues().map(function (f) { return String(f[0]).trim(); })
    : [];
  const faltan = CONFIG_DEFECTO.filter(function (p) { return existentes.indexOf(p[0]) === -1; });
  if (faltan.length) hoja.getRange(hoja.getLastRow() + 1, 1, faltan.length, 2).setValues(faltan);
}

function obtenerOCrearCarpetaRaiz(props) {
  const id = props.getProperty(PROP.CARPETA_RAIZ_ID);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* cae a crear */ }
  }
  // Proyecto nuevo sin propiedades: la raíz es la carpeta padre de la que ya está en CONFIG.
  const idSalida = configOpcional('carpeta_salida_id');
  if (idSalida) {
    try {
      const padres = DriveApp.getFolderById(idSalida).getParents();
      if (padres.hasNext()) {
        const existente = padres.next();
        props.setProperty(PROP.CARPETA_RAIZ_ID, existente.getId());
        return existente;
      }
    } catch (e) { /* cae a crear */ }
  }
  const raiz = DriveApp.createFolder(NOMBRE_CARPETA_RAIZ);
  props.setProperty(PROP.CARPETA_RAIZ_ID, raiz.getId());
  return raiz;
}

/** Usa la carpeta que ya esté en CONFIG si existe; si no, la busca/crea y la escribe en CONFIG. */
function asegurarCarpeta(raiz, nombre, claveConfig, libro) {
  const hoja = libro.getSheetByName(HOJAS.CONFIG);
  const filas = hoja.getDataRange().getValues();
  let fila = -1;
  for (let i = 1; i < filas.length; i++) if (String(filas[i][0]).trim() === claveConfig) fila = i + 1;

  const actual = fila > 0 ? String(filas[fila - 1][1]).trim() : '';
  if (actual) {
    try { return DriveApp.getFolderById(actual); } catch (e) { /* id inválido: se reemplaza abajo */ }
  }
  const it = raiz.getFoldersByName(nombre);
  const carpeta = it.hasNext() ? it.next() : raiz.createFolder(nombre);
  hoja.getRange(fila, 2).setValue(carpeta.getId());
  return carpeta;
}

/** Revisa que todo exista y esté bien configurado. Devuelve y registra lo que falta. */
function verificarInstalacion() {
  const problemas = [];
  const props = PropertiesService.getScriptProperties();

  if (!props.getProperty(PROP.LIBRO_ID)) {
    problemas.push('No hay libro instalado. Corre instalar().');
    return reportarVerificacion(problemas);
  }

  let libro;
  try { libro = abrirLibro(); } catch (e) {
    problemas.push('No se puede abrir el libro: ' + e.message);
    return reportarVerificacion(problemas);
  }

  Object.keys(HOJAS).forEach(function (k) {
    const hoja = libro.getSheetByName(HOJAS[k]);
    if (!hoja) problemas.push('Falta la hoja ' + HOJAS[k]);
    else revisarEncabezados(hoja, HOJAS[k]).forEach(function (p) { problemas.push(p); });
  });
  if (problemas.length) return reportarVerificacion(problemas);

  _cacheConfig = null;
  CONFIG_DEFECTO.forEach(function (p) {
    if (!(p[0] in cargarConfig())) problemas.push('Falta el parámetro ' + p[0] + ' en CONFIG');
  });

  ['correo_administrador', 'nombre_remitente', 'carpeta_salida_id', 'carpeta_evidencia_id']
    .forEach(function (k) { if (!configOpcional(k)) problemas.push('CONFIG: "' + k + '" está vacío'); });

  const modoRem = configOpcional('modo_remitente');
  if (MODOS_REMITENTE.indexOf(modoRem) === -1) {
    problemas.push('CONFIG: modo_remitente debe ser ' + MODOS_REMITENTE.join(' | '));
  }

  if (MODOS_VALIDOS.indexOf(configOpcional('modo')) === -1) {
    problemas.push('CONFIG: modo debe ser ' + MODOS_VALIDOS.join(' | '));
  }

  ['carpeta_salida_id', 'carpeta_evidencia_id'].forEach(function (k) {
    const id = configOpcional(k);
    if (!id) return;
    try { DriveApp.getFolderById(id); } catch (e) { problemas.push('CONFIG: ' + k + ' no apunta a una carpeta accesible'); }
  });

  // El alias solo es obligatorio en modo ALIAS. Si falta, NO se envía (nunca se cae a otro remitente).
  if (modoRem === 'ALIAS') {
    const alias = configOpcional('alias_envio');
    if (!alias) problemas.push('CONFIG: "alias_envio" está vacío y modo_remitente es ALIAS');
    else if (GmailApp.getAliases().indexOf(alias) === -1) {
      problemas.push('El alias ' + alias + ' no está en "Enviar como" de esta cuenta (GmailApp.getAliases()). No se puede enviar.');
    }
  }

  return reportarVerificacion(problemas);
}

/** Bloqueo de envío: los motores de envío (Fase 2) deben llamar esto antes de cada corrida. */
function aliasDisponible() {
  return GmailApp.getAliases().indexOf(configOpcional('alias_envio')) !== -1;
}

function reportarVerificacion(problemas) {
  if (!problemas.length) {
    Logger.log('OK: instalación completa y bien configurada.');
  } else {
    Logger.log('Faltan ' + problemas.length + ' cosas:');
    problemas.forEach(function (p) { Logger.log(' - ' + p); });
  }
  return problemas;
}
