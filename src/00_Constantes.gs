/** SINAV · constantes y esquemas. Nada de esto se ejecuta al cargar. */

var TZ = 'America/Bogota';
var ETIQUETA = 'SINAV';
var CUOTA_DIARIA = 1500;      // destinatarios por persona por dia
var CARPETA_RAIZ = 'SINAV';
var SEGUNDOS_MAX = 270;       // 4m30s del limite de 6 minutos

var HOJA = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  ROLES: 'ROLES',
  VIGENCIAS: 'VIGENCIAS',
  OBLIGACIONES: 'OBLIGACIONES',
  EVENTOS: 'EVENTOS'
};

/**
 * OJO con el orden: asegurarHojas() reescribe la fila 1 sin mover los datos.
 * Una columna nueva SIEMPRE se agrega al final; insertarla en la mitad
 * desalinearia todo lo que ya este escrito debajo.
 *   USUARIOS: area y nivel se agregaron al final por eso.
 *   OBLIGACIONES: medio_pago se renombro a paga_quien EN SU MISMO SITIO y
 *   forma_pago se agrego al final. Correr migrar() reparte los valores viejos.
 */
var COLS = {
  CONFIG: ['parametro', 'valor'],
  USUARIOS: ['correo', 'nombre', 'rol', 'activo', 'area', 'nivel'],
  ROLES: ['rol', 'quien_lo_tiene', 'que_puede_hacer'],
  // REQ-009 y REQ-011. Una fila por vigencia fiscal, con los ids REALES de
  // Drive. Los ids se escriben una vez y no se vuelven a tocar: si alguna vez
  // quedan vacios, la vigencia se marca sin carpetas en vez de crear otras.
  VIGENCIAS: ['vigencia', 'carpeta_exogenas', 'carpeta_declaraciones',
              'carpeta_soportes', 'carpeta_sellados', 'carpeta_sellados_soportes',
              'activa'],
  OBLIGACIONES: [
    'id', 'cod_dane', 'cod_oficina', 'municipio', 'impuesto', 'regimen',
    'periodo', 'periodicidad', 'vencimiento', 'nit_municipio', 'correo_oficina',
    'responsable', 'tipo_presentacion', 'paga_quien', 'requiere_envio',
    'exogena', 'incluye_retencion', 'estado', 'revision_fecha', 'revision_por',
    'presentacion_fecha', 'valor', 'soporte_id', 'fecha_envio', 'hilo_id',
    'fecha_respuesta', 'sellado_id', 'nota',
    'motivo_devuelta', 'estado_previo', 'reprocesos', 'forma_pago',
    // REQ-011: la vigencia fiscal manda sobre el ano de presentacion. Una
    // declaracion de la vigencia 2026 presentada en 2027 se guarda en 2026.
    'vigencia',
    // Bogota tiene varias entidades (Banco Davivienda, Corporacion Financiera...).
    // Vacio = Banco Davivienda, que es el caso normal.
    'entidad'
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

/**
 * Los estados en los que todavia se puede poner o cambiar el soporte.
 * Vive aqui y no en 08_Soportes porque lo usan tambien la carga masiva y la
 * pantalla de digitalizacion.
 */
var ESTADOS_ADMITEN_SOPORTE = [ESTADO.PENDIENTE, ESTADO.LISTA, ESTADO.DEVUELTA,
                               ESTADO.REBOTADO];

var EVENTO = {
  CREADA: 'CREADA',
  ASIGNADA: 'ASIGNADA',
  SOPORTE_CARGADO: 'SOPORTE_CARGADO',
  ENVIADA: 'ENVIADA',
  RESPONDIDA: 'RESPONDIDA',
  REVISADA: 'REVISADA',
  APROBADA: 'APROBADA',
  DEVUELTA: 'DEVUELTA',
  CAMPOS_EDITADOS: 'CAMPOS_EDITADOS',
  ALTA_AUTOMATICA: 'ALTA_AUTOMATICA',
  ERROR: 'ERROR',
  AVISO: 'AVISO'
};

var ROL = { ADMIN: 'ADMIN', PROFESIONAL: 'PROFESIONAL' };

var AREA = { MUNICIPALES: 'MUNICIPALES' };
var AREAS = ['MUNICIPALES'];
var NIVELES = ['I', 'II', 'III'];

/**
 * El PERFIL es lo que decide los permisos: el rol y, para los profesionales,
 * tambien el nivel. 'PROFESIONAL-III' es el cargo de supervision del equipo
 * (hoy Elizabeth); 'PROFESIONAL-I' es quien trabaja sus obligaciones.
 *
 * Los permisos estan atados al PERFIL, nunca al nombre de una persona: si
 * manana el cargo lo ocupa otra, se cambia su nivel en USUARIOS y ya.
 */
var PERFIL = {
  ADMIN: 'ADMIN',
  PROFESIONAL_I: 'PROFESIONAL-I',
  PROFESIONAL_II: 'PROFESIONAL-II',
  PROFESIONAL_III: 'PROFESIONAL-III'
};

/** Los perfiles que supervisan al equipo. */
var SUPERVISORES = [PERFIL.ADMIN, PERFIL.PROFESIONAL_III];

/** Quien puede hacer que. El servidor es el unico que lo decide. */
var PERMISO = {
  asignar:      SUPERVISORES,
  revisar:      SUPERVISORES,
  editarAjenas: SUPERVISORES,
  enviarAjenas: SUPERVISORES,
  verMetricas:  SUPERVISORES,
  gestionarAusencias: SUPERVISORES,   // REQ-010
  habilitarVigencia:  SUPERVISORES,   // REQ-011
  configurar:   [PERFIL.ADMIN]
};

/** Se vuelca a la hoja ROLES como referencia, para no tener que adivinar. */
var ROLES_DEFINICION = [
  ['PROFESIONAL-I',
   'Por defecto para cualquier correo del dominio que entre y no este ya en USUARIOS.',
   'Trabaja sus propias obligaciones: sube soportes (uno o en lote), digitaliza los campos manuales y envia a las oficinas. Las ajenas las ve, no las toca.'],
  ['PROFESIONAL-II',
   'Mismo trabajo que el I. Se asigna a mano en USUARIOS.',
   'Lo mismo que PROFESIONAL-I. El nivel se guarda y se muestra, pero hoy no cambia permisos.'],
  ['PROFESIONAL-III',
   'El cargo de supervision del equipo. Hoy lo ocupa Elizabeth. Se asigna a mano en USUARIOS.',
   'Todo lo del profesional sobre CUALQUIER obligacion, mas asignar responsables, dar el visto bueno (REVISADA / APROBADA), devolver con motivo, ver las metricas, registrar ausencias y habilitar una vigencia nueva.'],
  ['ADMIN',
   'Quien administra la herramienta. Uno solo. Se asigna a mano en USUARIOS.',
   'Todo lo del PROFESIONAL-III, mas editar CONFIG y USUARIOS desde la aplicacion.']
];

var IMPUESTOS = ['RETEICA', 'AUTORRETEICA', 'ICA', 'EXOGENA'];
var PERIODICIDADES = ['MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'ANUAL'];

var TIPOS_PRESENTACION = ['OFICINA', 'VIRTUAL'];

/** Quien paga la declaracion. Distinto de COMO se paga. */
var PAGA_QUIEN = ['OFICINA', 'PAGADURIA'];
/** Con que se paga. Lo llenan los profesionales a mano. */
var FORMAS_PAGO = ['TRANSFERENCIA', 'PSE', 'EFECTIVO', 'OTRO'];

/** Sinonimos sucios del origen -> valor normalizado. */
var PERIODICIDAD_SINONIMOS = {
  MENSUAL: 'MENSUAL', MES: 'MENSUAL', MENSUALMENTE: 'MENSUAL',
  BIMESTRAL: 'BIMESTRAL', BIMENSUAL: 'BIMESTRAL', BIMESTRE: 'BIMESTRAL',
  TRIMESTRAL: 'TRIMESTRAL', TRIMESTRE: 'TRIMESTRAL',
  CUATRIMESTRAL: 'CUATRIMESTRAL', CUATRIMESTRE: 'CUATRIMESTRAL',
  ANUAL: 'ANUAL', ANIO: 'ANUAL', ANO: 'ANUAL', ANUALMENTE: 'ANUAL'
};

/**
 * REQ-009. La raiz de Drive que ya existe, con su id REAL. No se crea ni se
 * reemplaza: SINAV se cuelga de lo que el equipo ya organizo a mano.
 *
 *   Territoriales / <vigencia> / Exogenas
 *                              / Declaraciones / Soportes / <municipio> / <impuesto>
 *                                              / Sellados / Soportes
 */
var CARPETA_TERRITORIALES = '1A5j3j-zTw90YPl0cUgZ06vAtQ_D31cn9';

/** Los ids que el equipo ya tiene creados para 2026. */
var VIGENCIAS_CONOCIDAS = [
  { vigencia: '2026',
    carpeta_exogenas:          '1g7S9Lz_Brl4TyQdNdtmkpVySMfZlRqw0',
    carpeta_declaraciones:     '1tPuJWPVvWETyWX7PLlZ1Q_M4c14WtM1t',
    carpeta_soportes:          '1B8XXc9cuHu475vUDq0gpqKKU0nw_54iW',
    carpeta_sellados:          '1WZuxykHsrEQf3c65nTE5RkwFpAUvuPgS',
    carpeta_sellados_soportes: '1lmDCfzEPxdDlpYT-A9lOnhMg7nwZ5vBp',
    activa: 'SI' }
];

/** Los nombres de las subcarpetas, para cuando haya que crear una vigencia. */
var SUBCARPETAS_VIGENCIA = {
  exogenas: 'Exógenas',
  declaraciones: 'Declaraciones',
  soportes: 'Soportes',
  sellados: 'Sellados',
  sellados_soportes: 'Soportes'
};

var CONFIG_BASE = [
  ['nombre_remitente', 'Impuestos Davivienda'],
  ['carpeta_territoriales', CARPETA_TERRITORIALES],
  ['vigencia_actual', '2026'],
  ['dias_aviso', '10,4,2,0'],
  ['modo', 'PRUEBA'],
  ['rol_defecto', 'PROFESIONAL'],
  ['area_defecto', 'MUNICIPALES'],
  ['nivel_defecto', 'I']
];
