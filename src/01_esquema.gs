/**
 * 01_esquema.gs — nombres de hojas y columnas, y lectura/escritura tipada.
 * Nadie escribe en un rango directamente desde la lógica de negocio: todo pasa por acá.
 */

const HOJAS = {
  CONFIG: 'CONFIG',
  CALENDARIO: 'CALENDARIO',
  OBLIGACIONES: 'OBLIGACIONES',
  ENVIOS: 'ENVIOS',
  EVENTOS: 'EVENTOS',
  CONTACTOS: 'CONTACTOS',
  PLANTILLAS: 'PLANTILLAS',
  CONCILIAR: 'CONCILIAR',
  EXCEPCIONES: 'EXCEPCIONES',
  MUESTRAS: 'MUESTRAS'
};

const ENCABEZADOS = {
  CONFIG: ['parámetro', 'valor'],

  // Formato largo: una fila por obligación y vencimiento. Ver 10_calendario.gs.
  CALENDARIO: [
    'nit', 'cod_dane', 'departamento', 'municipio', 'impuesto', 'tipo_obligacion',
    'descuento_pronto_pago', 'estado_fuente', 'comentario', 'periodicidad',
    'periodicidad_original', 'resolucion', 'empresa', 'columna_fuente', 'vencimiento', 'periodo',
    'periodo_por_confirmar'
  ],

  // Esquema tomado literal de BRIEF §3.
  // id = cod_dane|tipo_obligacion|regimen|periodo  (la oficina es consecuencia, no identidad)
  OBLIGACIONES: [
    'id', 'cod_oficina', 'cod_dane', 'municipio', 'empresa', 'nit_municipio', 'tipo_obligacion',
    'regimen', 'regimen_texto', 'periodo', 'periodo_por_confirmar', 'periodicidad', 'vencimiento',
    'presentacion_texto', 'correo_municipio', 'forma_pago', 'requiere_envio_oficina',
    'profesional', 'jefe',
    'consecutivo_egreso', 'sticker', 'valor', 'estado', 'estado_desde', 'devuelta_desde',
    'motivo_devolucion', 'reprocesos', 'adjunto_salida_id', 'thread_id', 'fecha_envio',
    'evidencia_id', 'evidencia_hash',
    'fecha_presentacion'   // se agrega al final: instalar() la añade sin tocar las filas existentes
  ],

  // TODO(USUARIO): el brief no define las columnas de ENVIOS más allá de "intento_n".
  // Propuesta mía; confírmala o cámbiala antes de la Fase 2.
  ENVIOS: [
    'id_envio', 'id_obligacion', 'intento_n', 'fecha_envio', 'thread_id', 'message_id',
    'destinatarios', 'asunto', 'adjunto_id', 'modo', 'resultado'
  ],

  EVENTOS: [
    'timestamp', 'id_obligacion', 'estado_anterior', 'estado_nuevo', 'origen', 'actor',
    'detalle', 'hash_evidencia'
  ],

  // TODO(USUARIO): propuesta mía (el brief solo dice "código de oficina → correos autorizados").
  CONTACTOS: ['cod_oficina', 'municipio', 'correos', 'activo'],

  // TODO(USUARIO): propuesta mía. Los marcadores de las plantillas los defines tú en la Fase 2.
  PLANTILLAS: ['nombre', 'asunto', 'cuerpo_html'],

  // TODO(USUARIO): propuesta mía.
  CONCILIAR: ['fecha_llegada', 'thread_id', 'message_id', 'remitente', 'asunto', 'motivo', 'id_obligacion_sugerida', 'resuelto'],

  // TODO(USUARIO): propuesta mía. Motivo inicial previsto: SIN_ADJUNTO.
  EXCEPCIONES: ['timestamp', 'id_obligacion', 'motivo', 'detalle', 'resuelta'],

  // Fase 0 (BRIEF §12).
  MUESTRAS: [
    'thread_id', 'message_id', 'remitente', 'asunto', 'fecha', 'es_respuesta_a_envio',
    'tiene_adjunto', 'tipos_adjunto', 'cuerpo_texto'
  ]
};

// Columnas que deben guardarse como TEXTO: Sheets convierte "2026-09" en fecha y borra el cero de "0851".
const COLUMNAS_TEXTO = {
  CALENDARIO: ['nit', 'cod_dane', 'periodo'],
  OBLIGACIONES: ['id', 'cod_oficina', 'cod_dane', 'nit_municipio', 'regimen', 'regimen_texto', 'periodo']
};

/** Pone formato texto a esas columnas en el rango de filas que se va a escribir. */
function marcarTexto(hoja, nombreHoja, filaInicial, nFilas) {
  (COLUMNAS_TEXTO[nombreHoja] || []).forEach(function (col) {
    hoja.getRange(filaInicial, ENCABEZADOS[nombreHoja].indexOf(col) + 1, nFilas, 1).setNumberFormat('@');
  });
}

/** Abre el libro de OPERACIÓN guardado por instalar(). */
function abrirLibro() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP.LIBRO_ID);
  if (!id) throw new Error('No hay libro instalado. Corre instalar() primero.');
  return SpreadsheetApp.openById(id);
}

function hojaDe(nombre) {
  const hoja = abrirLibro().getSheetByName(nombre);
  if (!hoja) throw new Error('Falta la hoja ' + nombre + '. Corre instalar() o verificarInstalacion().');
  return hoja;
}

/** Devuelve las filas como objetos {columna: valor}. Lectura en bloque. */
function leerFilas(nombreHoja) {
  const hoja = hojaDe(nombreHoja);
  const enc = ENCABEZADOS[nombreHoja];
  const n = hoja.getLastRow() - 1;
  if (n < 1 || !enc.length) return [];
  const valores = hoja.getRange(2, 1, n, enc.length).getValues();
  return valores.map(function (fila) {
    const o = {};
    enc.forEach(function (col, i) { o[col] = fila[i]; });
    return o;
  });
}

/** Agrega objetos al final de la hoja, bajo lock. Las columnas que falten quedan vacías. */
function agregarFilas(nombreHoja, objetos) {
  if (!objetos.length) return;
  const enc = ENCABEZADOS[nombreHoja];
  const filas = objetos.map(function (o) {
    return enc.map(function (col) { return o[col] === undefined ? '' : o[col]; });
  });
  conLock(function () {
    const hoja = hojaDe(nombreHoja);
    const inicio = hoja.getLastRow() + 1;
    marcarTexto(hoja, nombreHoja, inicio, filas.length);
    hoja.getRange(inicio, 1, filas.length, enc.length).setValues(filas);
  });
}

/** Reescribe una sola columna completa (en bloque, bajo lock). `valores` = un valor por fila de datos. */
function escribirColumna(nombreHoja, columna, valores) {
  if (!valores.length) return;
  const col = ENCABEZADOS[nombreHoja].indexOf(columna) + 1;
  conLock(function () {
    hojaDe(nombreHoja).getRange(2, col, valores.length, 1).setValues(valores.map(function (v) { return [v]; }));
  });
}

/** Valida que los encabezados reales coincidan con el esquema. Devuelve lista de problemas. */
function revisarEncabezados(hoja, nombre) {
  const esperado = ENCABEZADOS[nombre];
  if (!esperado.length) return [];
  const real = hoja.getRange(1, 1, 1, esperado.length).getValues()[0];
  const mal = esperado.filter(function (col, i) { return real[i] !== col; });
  return mal.length ? ['Hoja ' + nombre + ': encabezados distintos al esquema (' + mal.join(', ') + ')'] : [];
}
