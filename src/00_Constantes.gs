/** SINAV · constantes y esquemas. Nada de esto se ejecuta al cargar. */

var TZ = 'America/Bogota';
var ETIQUETA = 'SINAV';
var CUOTA_DIARIA = 1500;      // destinatarios por persona por dia
var CARPETA_RAIZ = 'SINAV';
var SEGUNDOS_MAX = 270;       // 4m30s del limite de 6 minutos

/**
 * Cuantos archivos puede llevar un envio. Gmail corta en 25 MB en total, asi
 * que el tope de verdad es el peso, no la cantidad; esto es para que nadie
 * suba cuarenta por error.
 */
/**
 * Lo que tiene que pesar un adjunto para contar como evidencia. Por debajo
 * suelen ser firmas y logos incrustados, no documentos. Bajo a proposito: un
 * PDF de una pagina ronda los 10 KB, pero en una prueba puede ser menor.
 */
var MINIMO_ADJUNTO = 512;

var MAX_SOPORTES = 10;
var MAX_ADJUNTO_MB = 24;

/** Para escribir fechas en mensajes, sin depender del locale del servidor. */
var NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre',
                  'diciembre'];

var HOJA = {
  CONFIG: 'CONFIG',
  USUARIOS: 'USUARIOS',
  ROLES: 'ROLES',
  VIGENCIAS: 'VIGENCIAS',
  AUSENCIAS: 'AUSENCIAS',
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
  // 'backup' al final: a quien le pasan sus obligaciones cuando se ausenta.
  // Se escribe en la hoja y manda sobre los pares de abajo, para que no haya
  // que tocar codigo cuando cambie alguien del equipo.
  USUARIOS: ['correo', 'nombre', 'rol', 'activo', 'area', 'nivel', 'backup'],
  ROLES: ['rol', 'quien_lo_tiene', 'que_puede_hacer'],
  // REQ-009 y REQ-011. Una fila por vigencia fiscal, con los ids REALES de
  // Drive. Los ids se escriben una vez y no se vuelven a tocar: si alguna vez
  // quedan vacios, la vigencia se marca sin carpetas en vez de crear otras.
  VIGENCIAS: ['vigencia', 'carpeta_exogenas', 'carpeta_declaraciones',
              'carpeta_soportes', 'carpeta_sellados', 'carpeta_sellados_soportes',
              'activa'],
  // REQ-010. Una fila por ausencia. No se borran: son la trazabilidad de por
  // que una obligacion cambio de manos y cuando volvio.
  AUSENCIAS: ['id', 'correo_ausente', 'desde', 'hasta', 'correo_backup',
              'estado', 'movidas', 'registrada_por', 'registrada_el',
              'cerrada_el', 'nota'],
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
    // REQ-010. Mientras alguien cubre a otro, aqui queda a quien hay que
    // devolverle la obligacion cuando termine la ausencia. Vacio = nadie la
    // esta cubriendo. La asignacion ORIGINAL nunca se sobrescribe.
    'titular_original',
    // El ultimo mensaje del hilo que ya se proceso. Sin esto, cada revision
    // volveria a guardar el mismo adjunto una y otra vez.
    'ultimo_mensaje',
    // El soporte que alguien MIRO y dio por bueno. Guarda el soporte_id, no un
    // SI/NO: si se reemplaza el archivo, deja de coincidir y hay que volver a
    // revisarlo. Un visto bueno vale para el documento que se vio, no para
    // siempre.
    'soporte_revisado',
    // Bogota tiene varias entidades (Banco Davivienda, Corporacion Financiera...).
    // Vacio = Banco Davivienda, que es el caso normal.
    'entidad',
    // --- lo que se agrego despues va SIEMPRE aqui abajo, nunca en la mitad:
    // asegurarHojas() reescribe la fila 1 sin mover los datos, y una columna
    // insertada en medio desalinea todo lo que ya esta escrito.
    //
    // El envio FISICO por correspondencia interna, que no es lo mismo que el
    // correo: 'fecha_envio' la escribe SINAV cuando sale el correo,
    // 'fecha_despacho' la escribe la persona y es cuando se despacho el sobre.
    'fecha_despacho',
    // El numero del adhesivo de correspondencia (55285303). Es por municipio,
    // impuesto y MES: cambia en cada periodo, por eso vive en la obligacion y
    // no en PROGRAMACION.
    'adhesivo',
    // El consecutivo de giro del pago (LR-09-74). Va en el asunto y en el
    // cuerpo del correo.
    'consecutivo_giro'
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

/**
 * REQ-010. Los backups acordados por el equipo. Se cubren entre si.
 *
 * Esto es solo el RESPALDO: lo que manda es la columna 'backup' de USUARIOS,
 * que se edita en la hoja. Aqui estan los pares por si esa columna esta vacia.
 *
 * Cada lado lleva VARIAS claves —nombre y apellido— porque la persona puede
 * no llamarse como uno espera: el par de Andrea se escribio como 'liliana' y
 * la profesional resulto ser Yasneidy Ramirez, asi que nadie tenia backup.
 * Con el apellido ahi, el emparejamiento sobrevive a ese tipo de cambio.
 *
 * Elizabeth no tiene backup: cuando ella falta, cada quien se encarga de lo
 * suyo, que es otro asunto (REQ-013).
 */
var BACKUPS = [
  { a: ['jesus', 'jaimes'], b: ['helen', 'cuadros'] },
  { a: ['andrea', 'galvis'], b: ['liliana', 'yasneidy', 'ramirez'] }
];

/** Los estados de una ausencia. */
var AUSENCIA = {
  PROGRAMADA: 'PROGRAMADA',   // registrada, todavia no empieza
  ACTIVA: 'ACTIVA',           // el backup tiene las obligaciones
  TERMINADA: 'TERMINADA',     // ya se devolvieron
  CANCELADA: 'CANCELADA'
};

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
  ['dias_aviso', '7,4,2,0'],
  // Lo que es igual en todos los correos. Si cambia, se cambia aqui una vez.
  ['egreso', '25'],
  ['codigo_departamento', '9413'],
  ['nombre_recibe', 'Liliana Ramirez'],
  // Siempre en copia, en todos los envios. Si entra o sale alguien del
  // equipo, se cambia aqui y ya.
  ['copias_fijas', [
    'merodriguez@davivienda.com',
    'grpconceptosespeciales@davivienda.com',
    'sptellez@davivienda.com',
    'egomezg@davivienda.com',
    'yasneidy.ramirez@davivienda.com',
    'jesus.jaimes@davivienda.com',
    'helen.cuadros@davivienda.com'
  ].join(',')],
  // El consecutivo de giro respeta el prefijo que tienen definido, porque es
  // con el que concilia revisoria. SI = usa las iniciales de quien envia.
  ['giro_sigue_al_remitente', 'NO'],
  ['dominio_oficinas', 'davivienda.com'],
  ['modo', 'PRUEBA'],
  ['rol_defecto', 'PROFESIONAL'],
  ['area_defecto', 'MUNICIPALES'],
  ['nivel_defecto', 'I']
];
