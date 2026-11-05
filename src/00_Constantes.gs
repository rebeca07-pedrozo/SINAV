/** SINAV · constantes y esquemas. Nada de esto se ejecuta al cargar. */

var TZ = 'America/Bogota';
var ETIQUETA = 'SINAV';
var CUOTA_DIARIA = 1500;      // destinatarios por persona por dia
var CARPETA_RAIZ = 'SINAV';
var SEGUNDOS_MAX = 270;       // 4m30s del limite de 6 minutos

var HOJA = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  OBLIGACIONES: 'OBLIGACIONES',
  EVENTOS: 'EVENTOS'
};

var COLS = {
  CONFIG: ['parametro', 'valor'],
  USUARIOS: ['correo', 'nombre', 'rol', 'activo'],
  OBLIGACIONES: [
    'id', 'cod_dane', 'cod_oficina', 'municipio', 'impuesto', 'regimen',
    'periodo', 'periodicidad', 'vencimiento', 'nit_municipio', 'correo_oficina',
    'responsable', 'tipo_presentacion', 'medio_pago', 'requiere_envio',
    'exogena', 'incluye_retencion', 'estado', 'revision_fecha', 'revision_por',
    'presentacion_fecha', 'valor', 'soporte_id', 'fecha_envio', 'hilo_id',
    'fecha_respuesta', 'sellado_id', 'nota',
    'motivo_devuelta', 'estado_previo', 'reprocesos'
  ],
  EVENTOS: ['fecha', 'id_obligacion', 'actor', 'que_paso', 'detalle']
};

/** Columnas que se formatean como texto para no perder ceros a la izquierda. */
var COLS_TEXTO = {
  OBLIGACIONES: ['id', 'cod_dane', 'cod_oficina', 'periodo', 'nit_municipio',
                 'soporte_id', 'hilo_id', 'sellado_id'],
  EVENTOS: ['id_obligacion']
};

var ESTADO = {
  PENDIENTE: 'PENDIENTE',
  LISTA: 'LISTA',
  ENVIADA: 'ENVIADA',
  RESPONDIDA: 'RESPONDIDA',
  REVISADA: 'REVISADA',
  APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA',
  SIN_EVIDENCIA: 'SIN_EVIDENCIA',
  REBOTADO: 'REBOTADO'
};

/** A donde puede ir cada estado. Lo que no esta aqui, no pasa. */
var TRANSICIONES = {
  PENDIENTE: ['LISTA'],
  LISTA: ['ENVIADA'],
  ENVIADA: ['RESPONDIDA', 'REBOTADO', 'SIN_EVIDENCIA'],
  RESPONDIDA: ['REVISADA', 'DEVUELTA'],
  REVISADA: ['APROBADA', 'DEVUELTA'],
  APROBADA: [],
  DEVUELTA: ['LISTA'],
  SIN_EVIDENCIA: ['RESPONDIDA'],
  REBOTADO: ['LISTA']
};

var EVENTO = {
  CREADA: 'CREADA',
  ASIGNADA: 'ASIGNADA',
  SOPORTE_CARGADO: 'SOPORTE_CARGADO',
  ENVIADA: 'ENVIADA',
  RESPONDIDA: 'RESPONDIDA',
  REVISADA: 'REVISADA',
  APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA',
  ERROR: 'ERROR',
  AVISO: 'AVISO'
};

var ROL = { ADMIN: 'ADMIN', JEFE: 'JEFE', PROFESIONAL: 'PROFESIONAL' };

/** Quien puede hacer que. El servidor es el unico que lo decide. */
var PERMISO = {
  asignar: ['ADMIN', 'JEFE'],
  revisar: ['ADMIN', 'JEFE'],
  configurar: ['ADMIN'],
  editarAjenas: ['ADMIN', 'JEFE'],
  enviarAjenas: ['ADMIN', 'JEFE']
};

var IMPUESTOS = ['RETEICA', 'AUTORRETEICA', 'ICA', 'EXOGENA'];
var PERIODICIDADES = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'ANUAL'];

/** Sinonimos sucios del origen -> valor normalizado. */
var PERIODICIDAD_SINONIMOS = {
  MENSUAL: 'MENSUAL', MES: 'MENSUAL', MENSUALMENTE: 'MENSUAL',
  BIMESTRAL: 'BIMESTRAL', BIMENSUAL: 'BIMESTRAL', BIMESTRE: 'BIMESTRAL',
  TRIMESTRAL: 'TRIMESTRAL', TRIMESTRE: 'TRIMESTRAL',
  CUATRIMESTRAL: 'CUATRIMESTRAL', CUATRIMESTRE: 'CUATRIMESTRAL',
  ANUAL: 'ANUAL', ANIO: 'ANUAL', ANO: 'ANUAL', ANUALMENTE: 'ANUAL'
};

var CONFIG_BASE = [
  ['nombre_remitente', 'Impuestos Davivienda'],
  ['carpeta_soportes', ''],
  ['carpeta_sellados', ''],
  ['dias_aviso', '10,4,2,0'],
  ['modo', 'PRUEBA']
];
