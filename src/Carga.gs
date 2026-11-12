/**
 * SINAV · Carga.gs — poblar el libro con los datos reales.
 *
 * Va en un archivo APARTE de Codigo.gs a proposito: esto se corre cuando entra
 * una vigencia nueva, no en el dia a dia. Si algun dia estorba, se borra del
 * editor sin tocar la aplicacion, y se vuelve a pegar desde dist/Carga.gs.
 *
 * ---------------------------------------------------------------------------
 * COMO FUNCIONA, Y POR QUE ASI
 *
 * La tentacion es volcar el Excel tal cual: 6.526 filas copiadas y listo. Eso
 * automatiza la copia, no el proceso: el ano que viene alguien tiene que armar
 * otro Excel de 2.285 filas y repetirlo todo.
 *
 * En vez de eso se parte en dos lo que cambia y lo que no:
 *
 *   PROGRAMACION   quien debe que y cada cuanto. 1.269 reglas.
 *                  NO cambia de un ano a otro. Se carga UNA vez.
 *
 *   OBLIGACIONES   una fila por regla y periodo, con su vencimiento.
 *                  Se GENERA a partir de PROGRAMACION mas las fechas del ano.
 *
 * Asi, para 2027 solo hacen falta las fechas nuevas: ni rehacer la matriz de
 * responsables, ni volver a decidir las mixtas, ni tocar los correos.
 *
 * ---------------------------------------------------------------------------
 * LOS TRES PASOS
 *
 *   1. Pegar el calendario en una hoja llamada CALENDARIO
 *   2. cargarProgramacion()        lee CALENDARIO -> escribe PROGRAMACION
 *   3. generarVigencia('2026')     lee PROGRAMACION -> escribe OBLIGACIONES
 *
 * El paso 3 se reanuda solo: si Apps Script lo corta por tiempo, se vuelve a
 * correr y sigue donde iba.
 */

var HOJA_CALENDARIO = 'CALENDARIO';
var HOJA_PROGRAMACION = 'PROGRAMACION';

var COLS_PROGRAMACION = [
  'cod_dane', 'cod_oficina', 'departamento', 'municipio', 'entidad',
  'impuesto', 'regimen', 'periodicidad', 'nit_municipio', 'correo_oficina',
  'responsable', 'requiere_envio', 'nota'
];

/**
 * Los impuestos que SINAV gestiona, y como se llaman en el calendario.
 * Lo que no este aqui se ignora a proposito: predial, alumbrado publico y
 * actualizacion de RIT quedaron fuera del alcance.
 */
var IMPUESTO_CALENDARIO = {
  'INDUSTRIA Y COMERCIO': 'ICA',
  'RETENCION ICA': 'RETEICA',
  'AUTORRETEICA': 'AUTORRETEICA',
  'MEDIOS MAGNETICOS': 'EXOGENA'
};

/**
 * Las filas de "descuento pronto pago" no son obligaciones distintas: son la
 * misma con una fecha anterior si se paga pronto. Solo se toma la fila base.
 * Comprobado que ninguna obligacion existe SOLO como fila de descuento, asi
 * que no se pierde ninguna.
 */
var DESCUENTOS_QUE_ENTRAN = ['', 'FECHA LIMITE'];

/* ---------------------------------------------------------------------------
   LA MATRIZ DE RESPONSABLES

   Sale de cruzar los cuatro archivos del equipo con la hoja Responsable del
   calendario, que es SOLO la de las mixtas. Las reglas, en orden:

     1. exclusiva  un solo profesional la declara en su archivo -> es suya
     2. mixta      dos la comparten -> recae SIEMPRE en Andrea o en Liliana
     3. oficial    lo que la hoja Responsable asigna sin conflicto se respeta

   La regla 2 funciona porque ninguna pareja mixta es Andrea + Liliana: siempre
   hay exactamente una de las dos.

   La clave es el CENTRO DE COSTO, no el nombre: hay municipios homonimos en
   departamentos distintos (Sucre, Armenia, Florencia) y los archivos escriben
   el mismo sitio de varias formas. Donde no hubo centro de costo se cae al
   nombre, que es el caso del archivo de Jesus.

   Aqui van iniciales, no correos: los correos se resuelven contra USUARIOS al
   cargar, para que esto no se rompa si alguien cambia de cuenta.
   --------------------------------------------------------------------------- */

/**
 * codigo DANE -> quien responde.
 *
 * Esta es la que de verdad usa la carga: el calendario trae DANE, no centro de
 * costo. Se construyo puenteando CC -> DANE con el diccionario de la hoja
 * Responsable, y por nombre contra el calendario donde no habia puente.
 * Cubre 290 de los 315 municipios del calendario; los otros 25 quedan sin
 * dueno a proposito y salen en Asignacion.
 */
var MATRIZ_DANE = {
  '05001':'ANDREA','05002':'ANDREA','05030':'ANDREA','05031':'ANDREA',
  '05034':'ANDREA','05045':'ANDREA','05088':'ANDREA','05093':'ANDREA',
  '05101':'ANDREA','05125':'HELEN','05129':'ANDREA','05138':'HELEN',
  '05148':'HELEN','05154':'ANDREA','05190':'HELEN','05197':'HELEN',
  '05209':'ANDREA','05212':'ANDREA','05264':'HELEN','05266':'ANDREA',
  '05282':'ANDREA','05306':'HELEN','05308':'HELEN','05318':'HELEN',
  '05360':'ANDREA','05364':'ANDREA','05368':'ANDREA','05376':'ANDREA',
  '05380':'ANDREA','05390':'HELEN','05440':'ANDREA','05543':'HELEN',
  '05579':'ANDREA','05607':'HELEN','05615':'ANDREA','05631':'ANDREA',
  '05642':'ANDREA','05656':'HELEN','05659':'HELEN','05667':'HELEN',
  '05679':'ANDREA','05697':'ANDREA','05756':'ANDREA','05761':'HELEN',
  '05789':'ANDREA','05792':'HELEN','05819':'HELEN','05837':'HELEN',
  '05854':'HELEN','05861':'ANDREA','05887':'ANDREA','05895':'HELEN',
  '08001':'LILIANA','08296':'JESUS','08433':'JESUS','08573':'LILIANA',
  '08638':'JESUS','08685':'JESUS','08758':'LILIANA','13001':'LILIANA',
  '13052':'HELEN','13244':'LILIANA','13430':'LILIANA','13667':'HELEN',
  '13670':'HELEN','13744':'HELEN','13836':'LILIANA','15001':'LILIANA',
  '15090':'HELEN','15176':'LILIANA','15238':'HELEN','15407':'HELEN',
  '15455':'LILIANA','15469':'LILIANA','15491':'HELEN','15516':'LILIANA',
  '15572':'LILIANA','15646':'LILIANA','15690':'HELEN','15759':'HELEN',
  '17001':'ANDREA','17013':'ANDREA','17042':'ANDREA','17050':'ANDREA',
  '17174':'ANDREA','17272':'ANDREA','17380':'LILIANA','17433':'ANDREA',
  '17486':'ANDREA','17513':'ANDREA','17524':'ANDREA','17541':'ANDREA',
  '17614':'ANDREA','17653':'ANDREA','17777':'ANDREA','17873':'ANDREA',
  '18001':'ANDREA','19001':'LILIANA','19698':'LILIANA','19701':'HELEN',
  '19785':'HELEN','19807':'HELEN','20001':'LILIANA','20011':'LILIANA',
  '20013':'LILIANA','20060':'JESUS','20175':'JESUS','20295':'JESUS',
  '20750':'JESUS','20770':'JESUS','23001':'LILIANA','23162':'JESUS',
  '23300':'JESUS','23417':'JESUS','23686':'JESUS','25035':'ANDREA',
  '25040':'JESUS','25126':'ANDREA','25151':'ANDREA','25175':'ANDREA',
  '25200':'JESUS','25214':'ANDREA','25245':'ANDREA','25260':'ANDREA',
  '25269':'ANDREA','25286':'ANDREA','25290':'ANDREA','25293':'JESUS',
  '25295':'JESUS','25307':'LILIANA','25312':'JESUS','25320':'ANDREA',
  '25322':'ANDREA','25377':'ANDREA','25386':'ANDREA','25402':'JESUS',
  '25430':'ANDREA','25473':'ANDREA','25488':'LILIANA','25489':'JESUS',
  '25513':'ANDREA','25592':'JESUS','25612':'JESUS','25645':'ANDREA',
  '25740':'ANDREA','25743':'JESUS','25754':'JESUS','25758':'ANDREA',
  '25769':'ANDREA','25799':'ANDREA','25817':'ANDREA','25843':'ANDREA',
  '25867':'ANDREA','25873':'JESUS','25875':'ANDREA','25899':'ANDREA',
  '27001':'HELEN','41001':'ANDREA','41298':'ANDREA','41396':'ANDREA',
  '41524':'ANDREA','41551':'ANDREA','41797':'JESUS','44001':'LILIANA',
  '44279':'JESUS','44650':'LILIANA','44874':'LILIANA','47001':'LILIANA',
  '47189':'LILIANA','47245':'JESUS','47288':'LILIANA','47551':'JESUS',
  '47555':'JESUS','47703':'JESUS','50001':'ANDREA','50006':'ANDREA',
  '50110':'HELEN','50245':'HELEN','50251':'HELEN','50313':'ANDREA',
  '50318':'HELEN','50325':'HELEN','50350':'HELEN','50450':'HELEN',
  '50568':'ANDREA','50573':'HELEN','50680':'HELEN','50711':'HELEN',
  '52001':'HELEN','52287':'HELEN','52349':'HELEN','52356':'HELEN',
  '52405':'HELEN','52835':'ANDREA','52838':'LILIANA','54001':'ANDREA',
  '54405':'HELEN','54498':'ANDREA','54518':'ANDREA','54660':'JESUS',
  '54874':'HELEN','63001':'LILIANA','63130':'LILIANA','63190':'JESUS',
  '63272':'JESUS','63302':'LILIANA','63401':'LILIANA','63470':'JESUS',
  '63594':'JESUS','63690':'JESUS','66001':'LILIANA','66045':'LILIANA',
  '66088':'HELEN','66170':'LILIANA','66400':'LILIANA','66440':'LILIANA',
  '66594':'LILIANA','66682':'LILIANA','66687':'HELEN','68001':'ANDREA',
  '68077':'ANDREA','68081':'ANDREA','68132':'JESUS','68167':'ANDREA',
  '68276':'ANDREA','68307':'ANDREA','68322':'JESUS','68406':'JESUS',
  '68500':'ANDREA','68547':'ANDREA','68575':'JESUS','68615':'ANDREA',
  '68679':'ANDREA','68689':'ANDREA','68745':'JESUS','68755':'ANDREA',
  '68770':'ANDREA','70001':'LILIANA','70110':'JESUS','70215':'JESUS',
  '70221':'JESUS','70265':'JESUS','70473':'JESUS','70508':'JESUS',
  '70702':'JESUS','70708':'JESUS','73001':'HELEN','73055':'HELEN',
  '73148':'HELEN','73168':'HELEN','73200':'HELEN','73268':'LILIANA',
  '73283':'LILIANA','73411':'HELEN','73443':'LILIANA','73449':'LILIANA',
  '73504':'HELEN','73671':'HELEN','76001':'LILIANA','76054':'LILIANA',
  '76109':'LILIANA','76111':'LILIANA','76113':'HELEN','76122':'LILIANA',
  '76147':'LILIANA','76233':'HELEN','76243':'HELEN','76246':'HELEN',
  '76248':'HELEN','76250':'LILIANA','76318':'HELEN','76364':'LILIANA',
  '76400':'LILIANA','76497':'LILIANA','76520':'LILIANA','76606':'HELEN',
  '76622':'LILIANA','76736':'LILIANA','76834':'HELEN','76863':'LILIANA',
  '76869':'HELEN','76890':'HELEN','76892':'HELEN','76895':'LILIANA',
  '81001':'ANDREA','81736':'ANDREA','81794':'ANDREA','85001':'ANDREA',
  '85010':'ANDREA','85410':'ANDREA','86573':'JESUS','88001':'LILIANA'
};

/** centro de costo -> quien responde. Respaldo, por si llega el CC. */
var MATRIZ_CC = {
  '0023':'ANDREA','0041':'ANDREA','0076':'ANDREA','0118':'LILIANA',
  '0119':'LILIANA','0125':'LILIANA','0133':'LILIANA','0134':'LILIANA',
  '0135':'HELEN','0139':'LILIANA','0148':'LILIANA','0152':'LILIANA',
  '0160':'LILIANA','0162':'LILIANA','0164':'LILIANA','0184':'HELEN',
  '0252':'LILIANA','0260':'LILIANA','0275':'JESUS','0297':'LILIANA',
  '0304':'HELEN','0314':'ANDREA','0315':'ANDREA','0360':'ANDREA',
  '0363':'ANDREA','0365':'ANDREA','0375':'ANDREA','0384':'ANDREA',
  '0385':'ANDREA','0391':'ANDREA','0422':'ANDREA','0460':'ANDREA',
  '0462':'ANDREA','0479':'ANDREA','0480':'ANDREA','0481':'ANDREA',
  '0483':'ANDREA','0485':'ANDREA','0486':'ANDREA','0488':'ANDREA',
  '0489':'ANDREA','0490':'ANDREA','0529':'HELEN','0536':'HELEN',
  '0537':'HELEN','0538':'HELEN','0556':'HELEN','0560':'LILIANA',
  '0565':'LILIANA','0589':'LILIANA','0591':'LILIANA','0626':'HELEN',
  '0660':'ANDREA','0673':'LILIANA','0674':'JESUS','0680':'ANDREA',
  '0689':'HELEN','0760':'ANDREA','0767':'ANDREA','0768':'ANDREA',
  '0772':'ANDREA','0773':'ANDREA','0809':'HELEN','0842':'ANDREA',
  '0844':'ANDREA','0846':'ANDREA','0847':'ANDREA','0848':'ANDREA',
  '0849':'ANDREA','0850':'LILIANA','0851':'ANDREA','0852':'ANDREA',
  '0853':'ANDREA','0854':'ANDREA','0855':'ANDREA','0857':'ANDREA',
  '0858':'ANDREA','0859':'ANDREA','0860':'ANDREA','0915':'ANDREA',
  '0916':'ANDREA','0917':'ANDREA','0946':'HELEN','0947':'HELEN',
  '0948':'HELEN','0949':'HELEN','0951':'HELEN','0952':'HELEN',
  '0953':'HELEN','0954':'HELEN','0955':'HELEN','0956':'HELEN',
  '0957':'HELEN','0959':'HELEN','0960':'ANDREA','0971':'ANDREA',
  '1004':'HELEN','1007':'ANDREA','1013':'LILIANA','1043':'HELEN',
  '1060':'HELEN','1064':'HELEN','1105':'LILIANA','1160':'LILIANA',
  '1166':'LILIANA','1260':'LILIANA','1262':'LILIANA','1275':'LILIANA',
  '1277':'HELEN','1279':'HELEN','1281':'LILIANA','1282':'LILIANA',
  '1283':'LILIANA','1285':'LILIANA','1286':'LILIANA','1287':'HELEN',
  '1360':'LILIANA','1364':'LILIANA','1369':'JESUS','1373':'JESUS',
  '1374':'LILIANA','1375':'LILIANA','1376':'LILIANA','1381':'LILIANA',
  '1462':'ANDREA','1495':'JESUS','1517':'JESUS','1560':'LILIANA',
  '1569':'JESUS','1612':'HELEN','1625':'LILIANA','1626':'LILIANA',
  '1636':'HELEN','1638':'HELEN','1641':'HELEN','1660':'HELEN',
  '1662':'LILIANA','1668':'HELEN','1669':'HELEN','1674':'HELEN',
  '1676':'LILIANA','1689':'LILIANA','1738':'HELEN','1739':'HELEN',
  '1758':'HELEN','1760':'LILIANA','1767':'LILIANA','1768':'LILIANA',
  '1769':'ANDREA','1772':'LILIANA','1776':'HELEN','1777':'HELEN',
  '1860':'HELEN','1950':'HELEN','1951':'HELEN','1960':'LILIANA',
  '2060':'LILIANA','2160':'LILIANA','2260':'ANDREA','2360':'LILIANA',
  '2460':'HELEN','2560':'LILIANA','2566':'LILIANA','2567':'LILIANA',
  '2568':'LILIANA','2660':'LILIANA','2860':'ANDREA','3401':'ANDREA',
  '3460':'HELEN','3560':'LILIANA','3760':'HELEN','3776':'LILIANA',
  '3860':'LILIANA','3919':'ANDREA','3936':'ANDREA','3937':'ANDREA',
  '3960':'ANDREA','3964':'ANDREA','3965':'ANDREA','3966':'ANDREA',
  '3968':'ANDREA','3969':'ANDREA','3971':'ANDREA','3972':'ANDREA',
  '3974':'ANDREA','3975':'ANDREA','3976':'ANDREA','3977':'ANDREA',
  '3981':'ANDREA','3985':'ANDREA','3987':'ANDREA','3990':'ANDREA',
  '3992':'ANDREA','3994':'ANDREA','4042':'HELEN','4043':'HELEN',
  '4044':'HELEN','4045':'HELEN','4047':'HELEN','4048':'HELEN',
  '4049':'HELEN','4051':'HELEN','4052':'HELEN','4053':'HELEN',
  '4060':'ANDREA','4115':'HELEN','4116':'HELEN','4117':'HELEN',
  '4130':'HELEN','4160':'LILIANA','4460':'LILIANA','4504':'ANDREA',
  '4561':'ANDREA','4593':'ANDREA','4621':'ANDREA','4625':'ANDREA',
  '4626':'ANDREA','4631':'ANDREA','4634':'ANDREA','4635':'ANDREA',
  '4659':'ANDREA','4665':'ANDREA','4666':'ANDREA','4670':'ANDREA',
  '4680':'ANDREA','4681':'ANDREA','4683':'ANDREA','4684':'ANDREA',
  '4685':'ANDREA','4694':'ANDREA','4697':'ANDREA','4759':'ANDREA',
  '4760':'ANDREA','4774':'ANDREA','4784':'ANDREA','4960':'ANDREA',
  '5060':'ANDREA','5061':'ANDREA','5064':'ANDREA','5791':'HELEN',
  '6902':'HELEN','6903':'HELEN','6904':'HELEN','6905':'HELEN',
  '6906':'HELEN','6907':'HELEN','6908':'HELEN','6909':'HELEN',
  '6910':'ANDREA','6911':'HELEN','6912':'HELEN','6913':'HELEN',
  '6914':'HELEN','6915':'HELEN','6916':'HELEN','6917':'HELEN',
  '6918':'HELEN','6920':'HELEN','6922':'HELEN','6923':'HELEN',
  '7002':'HELEN','7603':'HELEN','7700':'HELEN','7706':'HELEN',
  '7707':'HELEN','7708':'HELEN','7709':'HELEN','7710':'HELEN',
  '7718':'HELEN','8351':'HELEN','8353':'HELEN','8910':'HELEN',
  '9261':'HELEN'
};

/** municipios sin centro de costo conocido, por nombre normalizado */
var MATRIZ_NOMBRE = {
  'ANOLAIMA':'JESUS','BOJACA':'JESUS','BOSCONIA':'JESUS',
  'BUENAVISTA':'JESUS','CALIFORNIA':'JESUS','CHIMICHAGUA':'JESUS',
  'CIRCASIA':'JESUS','COGUA':'JESUS','COROZAL':'JESUS',
  'COTORRA':'JESUS','COVENAS':'JESUS','DATIO':'JESUS',
  'EL BANCO':'JESUS','FILANDIA':'JESUS','FONSECA':'JESUS',
  'GACHALA':'JESUS','GACHANCIPA':'JESUS','GALAPA':'JESUS',
  'GRANADA':'JESUS','GUAPOTA':'JESUS','GUARANDA':'JESUS',
  'JUAN DE ACOSTA':'JESUS','JUNIN':'JESUS','LA VEGA':'JESUS',
  'LEBRIJA':'JESUS','MALAMBO':'JESUS','MORROA':'JESUS',
  'NIMAIMA':'JESUS','OVEJAS':'JESUS','PIVIJAY':'JESUS','PLATO':'JESUS',
  'PUERTO LEGUIZAMO':'JESUS','PUERTO PARRA':'JESUS',
  'PUERTO WILCHES':'JESUS','QUEBRADANEGRA':'JESUS','RICAURTE':'JESUS',
  'SABANALARGA':'JESUS','SALAZAR DE LAS PALMAS':'JESUS',
  'SALENTO':'JESUS','SAN BENITO DE ABAD':'JESUS','SAN DIEGO':'JESUS',
  'SAN JUAN DE BETULIA':'JESUS','SAN MARCOS':'JESUS',
  'SAN MARTIN':'JESUS','SAN PELAYO':'JESUS','SAN ZENON':'JESUS',
  'SANTO TOMAS':'JESUS','SILVANIA':'JESUS','SIMACOTA':'JESUS',
  'SOACHA':'JESUS','TESALIA':'JESUS','VILLAPINZON':'JESUS'
};

/** Bogota tiene mas entidades que el banco. Estas no son municipios. */
var MATRIZ_ENTIDAD = {
  'CORPORACION FINANCIERA SA':'JESUS','INVERSIONES CFD SAS':'JESUS',
  'RENTING DAVIVIENDA SAS':'JESUS','VC INVESTMENTS SAS':'JESUS'
};

/** Las iniciales de la matriz, para resolverlas contra la hoja USUARIOS. */
var PROFESIONALES = {
  ANDREA: 'Andrea Galvis',
  HELEN: 'Helen Cuadros',
  JESUS: 'Jesús Jaimes',
  LILIANA: 'Liliana Ramírez'
};

/* ===========================================================================
   PASO 2 · cargarProgramacion()
   Lee la hoja CALENDARIO y deja en PROGRAMACION una fila por regla.
   =========================================================================== */

/** Mayusculas, sin acentos, sin adornos. Para comparar nombres de municipio. */
function claveMunicipio(v) {
  var s = limpiar(v);
  // el dato trae AUTORETENEDOR con una R y AUTORRETENEDOR con dos: las dos
  s = s.replace(/\s*-?\s*AUTOR{1,2}ETENEDOR\s*$/, '');
  s = s.replace(/[-( ]*EXOGENA[)]*/g, '');
  s = s.replace(/\s+F$/, '');
  return s.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Quien responde por una fila del calendario. '' si la matriz no la cubre. */
function responsableDe(codDane, codOficina, municipio, entidad) {
  // una entidad de Bogota manda sobre el municipio: no es Bogota, es la entidad
  if (entidad) {
    var e = MATRIZ_ENTIDAD[limpiar(entidad)];
    if (e) return e;
  }
  var dane = normCodigo(codDane, 5);
  if (dane && MATRIZ_DANE[dane]) return MATRIZ_DANE[dane];

  var cc = normCodigo(codOficina, 4);
  if (cc && MATRIZ_CC[cc]) return MATRIZ_CC[cc];

  return MATRIZ_NOMBRE[claveMunicipio(municipio)] || '';
}

/**
 * Las iniciales de la matriz a correos reales, buscando por nombre en USUARIOS.
 * Si alguien no esta inscrito, sus obligaciones quedan SIN responsable y salen
 * en Asignacion: es preferible a inventarle un correo que no existe.
 */
function correosDeProfesionales() {
  var ix = indices(HOJA.USUARIOS);
  var gente = filas(HOJA.USUARIOS).map(function (f) {
    return { correo: String(f[ix.correo]).trim().toLowerCase(),
             nombre: limpiar(f[ix.nombre]),
             activo: esActivo(f[ix.activo]) };
  }).filter(function (u) { return u.correo && u.activo; });

  var mapa = {}, faltan = [];
  Object.keys(PROFESIONALES).forEach(function (ini) {
    var buscado = limpiar(PROFESIONALES[ini]);
    var apellido = buscado.split(' ').slice(-1)[0];
    var hit = gente.filter(function (u) {
      return u.nombre === buscado ||
             (u.nombre.indexOf(buscado.split(' ')[0]) >= 0 && u.nombre.indexOf(apellido) >= 0);
    })[0];
    if (hit) mapa[ini] = hit.correo;
    else faltan.push(PROFESIONALES[ini]);
  });
  return { mapa: mapa, faltan: faltan };
}

/** Lee la hoja CALENDARIO y devuelve sus filas como objetos, ya filtradas. */
function leerCalendario() {
  var h = libro().getSheetByName(HOJA_CALENDARIO);
  if (!h) {
    throw new Error('Falta la hoja ' + HOJA_CALENDARIO + '. Pega ahí la hoja ' +
      'CALENDARIO_TRIBUTARIO del Excel, con sus encabezados en la fila 1.');
  }
  var n = h.getLastRow() - 1;
  if (n < 1) throw new Error('La hoja ' + HOJA_CALENDARIO + ' está vacía.');

  var todo = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var cab = todo[0];
  var ix = {};
  for (var i = 0; i < cab.length; i++) {
    var k = limpiar(cab[i]);
    if (k && !(k in ix)) ix[k] = i;
  }
  ['CODIGO DANE', 'MUNICIPIO', 'IMPUESTO', 'PERIODICIDAD'].forEach(function (c) {
    if (!(c in ix)) {
      throw new Error('A la hoja ' + HOJA_CALENDARIO + ' le falta la columna «' + c + '».');
    }
  });

  return { cabecera: cab, indices: ix, filas: todo.slice(1) };
}

/**
 * Las columnas de periodo del calendario, con el periodo que les toca.
 *
 * El encabezado es el PERIODO y la celda es el VENCIMIENTO. Las ultimas
 * columnas pertenecen al ano siguiente (es el ano vencido): se detecta porque
 * el mes deja de crecer.
 */
function columnasDePeriodo(cabecera, vigencia) {
  var salida = [];
  var anio = Number(vigencia);
  var mesAnterior = 0;

  for (var i = 0; i < cabecera.length; i++) {
    var v = cabecera[i];
    var mes = 0;
    if (v instanceof Date) mes = v.getMonth() + 1;
    else {
      var m = String(v).match(/^(\d{1,2})[-\/]?([A-Za-z]{3})/);
      if (m) {
        var meses = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7,
                      AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
                      JAN: 1, APR: 4, AUG: 8, DEC: 12 };
        mes = meses[m[2].toUpperCase()] || 0;
      }
    }
    if (!mes) continue;
    if (mes <= mesAnterior) anio++;          // el mes dejo de crecer: ano siguiente
    mesAnterior = mes;
    salida.push({ col: i, anio: anio, mes: mes });
  }
  return salida;
}

/** El periodo que le corresponde a un mes segun la periodicidad. */
function periodoDe(anio, mes, periodicidad) {
  if (periodicidad === 'BIMESTRAL') return anio + '-B' + Math.ceil(mes / 2);
  if (periodicidad === 'TRIMESTRAL') return anio + '-T' + Math.ceil(mes / 3);
  if (periodicidad === 'CUATRIMESTRAL') return anio + '-C' + Math.ceil(mes / 4);
  if (periodicidad === 'ANUAL') return String(anio);
  return anio + '-' + (mes < 10 ? '0' + mes : String(mes));
}

/**
 * Carga PROGRAMACION desde CALENDARIO. Idempotente: reescribe la hoja entera,
 * asi que correrlo dos veces deja lo mismo.
 */
function cargarProgramacion() {
  exige('configurar');

  return conCerrojo(function () {
    var cal = leerCalendario();
    var ix = cal.indices;
    var g = function (f, k) { return k in ix && ix[k] < f.length ? f[ix[k]] : ''; };

    var profes = correosDeProfesionales();
    var vistas = {}, prog = [], descartes = {}, sinDueno = [];

    cal.filas.forEach(function (f) {
      var impCrudo = limpiar(g(f, 'IMPUESTO'));
      var impuesto = IMPUESTO_CALENDARIO[impCrudo];
      if (!impuesto) {
        descartes[impCrudo || '(vacío)'] = (descartes[impCrudo || '(vacío)'] || 0) + 1;
        return;
      }
      var desc = limpiar(g(f, 'DESCUENTO PRONTO PAGO'));
      if (DESCUENTOS_QUE_ENTRAN.indexOf(desc) < 0) return;

      var dane = normCodigo(g(f, 'CODIGO DANE'), 5);
      var municipio = String(g(f, 'MUNICIPIO') || '').trim();
      if (!dane || !municipio) return;

      var periodicidad = normPeriodicidad(g(f, 'PERIODICIDAD'));
      if (!periodicidad) return;

      var entidad = normEntidad(g(f, 'EMPRESA'));
      var clave = dane + '|' + impuesto + '|' + periodicidad + '|' + entidad;
      if (vistas[clave]) return;
      vistas[clave] = true;

      var cc = normCodigo(g(f, 'CODIGO OFICINA') || g(f, 'CC') || '', 4);
      var ini = responsableDe(dane, cc, municipio, entidad);
      var correo = ini ? (profes.mapa[ini] || '') : '';
      if (!correo) sinDueno.push(municipio + ' · ' + impuesto);

      var fila = {
        cod_dane: dane, cod_oficina: cc, municipio: municipio,
        departamento: String(g(f, 'DEPARTAMENTO') || '').trim(),
        entidad: entidad, impuesto: impuesto, regimen: 'GENERAL',
        periodicidad: periodicidad,
        nit_municipio: normCodigo(g(f, 'NIT')),
        correo_oficina: normCorreos(g(f, 'CORREO') || g(f, 'CORREO OFICINA') || ''),
        responsable: correo,
        requiere_envio: impuesto === 'EXOGENA' ? 'REVISAR' : 'SI',
        nota: 'Importada del calendario' + (ini && !correo ? ' · ' + ini + ' no está en USUARIOS' : '')
      };
      prog.push(COLS_PROGRAMACION.map(function (c) { return fila[c] || ''; }));
    });

    var h = libro().getSheetByName(HOJA_PROGRAMACION) ||
            libro().insertSheet(HOJA_PROGRAMACION);
    h.clear();
    h.getRange(1, 1, 1, COLS_PROGRAMACION.length).setValues([COLS_PROGRAMACION])
     .setFontWeight('bold');
    h.setFrozenRows(1);
    ['cod_dane', 'cod_oficina', 'nit_municipio'].forEach(function (c) {
      var i = COLS_PROGRAMACION.indexOf(c);
      if (i >= 0) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    if (prog.length) h.getRange(2, 1, prog.length, COLS_PROGRAMACION.length).setValues(prog);

    registrar('', EVENTO.AVISO, 'PROGRAMACION cargada: ' + prog.length + ' reglas');

    var resumen = [
      prog.length + ' reglas cargadas en ' + HOJA_PROGRAMACION + '.',
      '',
      'Impuestos que quedaron fuera (a propósito):'
    ];
    Object.keys(descartes).sort().forEach(function (k) {
      resumen.push('   ' + descartes[k] + '  ' + k);
    });
    if (profes.faltan.length) {
      resumen.push('', 'OJO: no están en USUARIOS y sus obligaciones quedarán sin dueño:');
      profes.faltan.forEach(function (n) { resumen.push('   ' + n); });
    }
    if (sinDueno.length) {
      resumen.push('', sinDueno.length + ' reglas sin responsable. Saldrán en Asignación.');
    }
    resumen.push('', 'Ahora corre: generarVigencia("' + vigenciaActual() + '")');

    Logger.log(resumen.join('\n'));
    return resumen.join('\n');
  });
}

/* ===========================================================================
   PASO 3 · generarVigencia()
   PROGRAMACION + las fechas del calendario -> filas en OBLIGACIONES.

   Son del orden de 6.500 obligaciones y Apps Script corta a los 6 minutos,
   asi que esto va por lotes y se reanuda solo: guarda por donde iba y al
   volver a correrlo sigue ahi. Si se interrumpe a mitad, lo ya escrito queda
   bien escrito: cada fila se crea una sola vez, identificada por su id.
   =========================================================================== */

var CLAVE_AVANCE = 'carga:avance';

/** Lo que lleva hecho la generacion en curso. */
function avanceCarga() {
  try {
    var v = PropertiesService.getScriptProperties().getProperty(CLAVE_AVANCE);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function guardarAvance(a) {
  PropertiesService.getScriptProperties()
    .setProperty(CLAVE_AVANCE, JSON.stringify(a));
}

function olvidarAvance() {
  PropertiesService.getScriptProperties().deleteProperty(CLAVE_AVANCE);
}

/**
 * Genera las obligaciones de una vigencia. Se puede correr las veces que haga
 * falta: lo que ya existe no se duplica.
 *
 *   generarVigencia()        la vigencia actual de CONFIG
 *   generarVigencia('2027')  una concreta
 *
 * Si devuelve "quedan N por hacer", vuelve a correrlo.
 */
function generarVigencia(anio) {
  exige('configurar');

  var vig = String(anio || '').trim() || vigenciaActual();
  vigenciaDe(vig);                               // revienta si no esta habilitada

  var arranque = new Date().getTime();
  var previo = avanceCarga();
  var desde = (previo && previo.vigencia === vig) ? previo.fila : 0;
  var creadas = (previo && previo.vigencia === vig) ? previo.creadas : 0;
  var saltadas = (previo && previo.vigencia === vig) ? previo.saltadas : 0;

  var cal = leerCalendario();
  var ix = cal.indices;
  var g = function (f, k) { return k in ix && ix[k] < f.length ? f[ix[k]] : ''; };
  var cols = columnasDePeriodo(cal.cabecera, vig);
  if (!cols.length) {
    throw new Error('No se reconoció ninguna columna de periodo en ' + HOJA_CALENDARIO +
      '. Los encabezados de las fechas tienen que ser fechas, no texto.');
  }

  // PROGRAMACION, indexada para buscar sin recorrerla cada vez
  var prog = {};
  var hp = libro().getSheetByName(HOJA_PROGRAMACION);
  if (!hp || hp.getLastRow() < 2) {
    throw new Error('La hoja ' + HOJA_PROGRAMACION + ' está vacía. ' +
      'Corre cargarProgramacion() primero.');
  }
  var ipx = {};
  var cabP = hp.getRange(1, 1, 1, hp.getLastColumn()).getValues()[0];
  for (var i = 0; i < cabP.length; i++) ipx[String(cabP[i]).trim()] = i;
  hp.getRange(2, 1, hp.getLastRow() - 1, hp.getLastColumn()).getValues().forEach(function (f) {
    var k = [f[ipx.cod_dane], f[ipx.impuesto], f[ipx.periodicidad], f[ipx.entidad] || ''].join('|');
    prog[k] = f;
  });

  // lo que ya existe, para no duplicar
  var ixo = indices(HOJA.OBLIGACIONES);
  var existentes = {};
  filas(HOJA.OBLIGACIONES).forEach(function (f) {
    var id = String(f[ixo.id]).trim();
    if (id) existentes[id] = true;
  });

  var nuevas = [], eventos = [], fila = desde, corto = false;

  for (; fila < cal.filas.length; fila++) {
    // guardia de tiempo: se corta limpio antes de que Apps Script lo mate
    if ((new Date().getTime() - arranque) / 1000 > SEGUNDOS_MAX) { corto = true; break; }

    var f = cal.filas[fila];
    var impuesto = IMPUESTO_CALENDARIO[limpiar(g(f, 'IMPUESTO'))];
    if (!impuesto) continue;
    if (DESCUENTOS_QUE_ENTRAN.indexOf(limpiar(g(f, 'DESCUENTO PRONTO PAGO'))) < 0) continue;

    var dane = normCodigo(g(f, 'CODIGO DANE'), 5);
    var periodicidad = normPeriodicidad(g(f, 'PERIODICIDAD'));
    if (!dane || !periodicidad) continue;

    var entidad = normEntidad(g(f, 'EMPRESA'));
    var regla = prog[[dane, impuesto, periodicidad, entidad].join('|')];
    if (!regla) continue;                         // no esta programada: se ignora

    var periodosHechos = {};
    for (var c = 0; c < cols.length; c++) {
      var celda = cols[c].col < f.length ? f[cols[c].col] : '';
      var vence = normFecha(celda);
      if (!vence) continue;

      var periodo = periodoDe(cols[c].anio, cols[c].mes, periodicidad);
      // una anual tiene el mismo periodo en varias columnas: solo la primera
      if (periodosHechos[periodo]) continue;
      periodosHechos[periodo] = true;

      var n = normObligacion({
        cod_dane: dane,
        cod_oficina: regla[ipx.cod_oficina],
        municipio: regla[ipx.municipio],
        impuesto: impuesto,
        regimen: regla[ipx.regimen],
        periodo: periodo,
        periodicidad: periodicidad,
        vencimiento: vence,
        vigencia: vig,
        entidad: entidad,
        nit_municipio: regla[ipx.nit_municipio],
        correo_oficina: regla[ipx.correo_oficina],
        responsable: regla[ipx.responsable],
        requiere_envio: regla[ipx.requiere_envio],
        tipo_presentacion: '', paga_quien: '', forma_pago: '',
        exogena: '', incluye_retencion: '', valor: '',
        nota: ''
      });
      if (n.problemas.length) continue;
      if (existentes[n.fila.id]) { saltadas++; continue; }
      existentes[n.fila.id] = true;

      var o = n.fila;
      o.estado = ESTADO.PENDIENTE;
      o.reprocesos = 0;
      nuevas.push(COLS.OBLIGACIONES.map(function (k) {
        return o[k] === undefined || o[k] === null ? '' : o[k];
      }));
      if (o.responsable) {
        eventos.push({ id: o.id, quePaso: EVENTO.ASIGNADA,
                       detalle: 'del calendario, a ' + o.responsable });
      }
      creadas++;
    }
  }

  // escribir lo del lote, siempre: si se corto, esto ya queda guardado
  if (nuevas.length) {
    conCerrojo(function () {
      agregarFilas(HOJA.OBLIGACIONES, nuevas);
      if (eventos.length) registrarVarios(eventos);
    });
  }

  if (corto) {
    guardarAvance({ vigencia: vig, fila: fila, creadas: creadas, saltadas: saltadas });
    var faltan = cal.filas.length - fila;
    var msg = 'Vigencia ' + vig + ': van ' + creadas + ' obligaciones.\n' +
      'Se cortó por tiempo con ' + faltan + ' filas del calendario pendientes.\n\n' +
      'VUELVE A CORRER generarVigencia("' + vig + '"): sigue donde iba.';
    Logger.log(msg);
    return msg;
  }

  olvidarAvance();
  registrar('', EVENTO.AVISO,
            'vigencia ' + vig + ' generada: ' + creadas + ' obligaciones');

  var fin = 'Vigencia ' + vig + ' lista.\n' +
    '   ' + creadas + ' obligaciones creadas\n' +
    (saltadas ? '   ' + saltadas + ' ya existían y no se duplicaron\n' : '') +
    '\nLas que quedaron sin responsable salen en Asignación.';
  Logger.log(fin);
  return fin;
}

/** Empezar de cero una vigencia que quedo a medias. No borra obligaciones. */
function reiniciarAvanceCarga() {
  olvidarAvance();
  return 'Avance olvidado. La próxima generación empieza desde la primera fila. ' +
         'Las obligaciones ya creadas se conservan y no se duplican.';
}

/* ---- menu ---------------------------------------------------------------- */

function menuCarga() {
  SpreadsheetApp.getUi().createMenu('SINAV · Carga')
    .addItem('1 · Cargar PROGRAMACION desde CALENDARIO', 'cargarProgramacion')
    .addItem('2 · Generar la vigencia actual', 'generarVigenciaDesdeMenu')
    .addSeparator()
    .addItem('Reiniciar el avance', 'reiniciarAvanceCarga')
    .addToUi();
}

function generarVigenciaDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Generar obligaciones',
    'Vigencia a generar (por ejemplo ' + vigenciaActual() + '):',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try {
    ui.alert('Carga', generarVigencia(r.getResponseText()), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('No se pudo', String(e.message || e), ui.ButtonSet.OK);
  }
}
