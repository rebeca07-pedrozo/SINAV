// AUTOGENERADO por build.js a partir de src/Concepto25.gs.
// No editar a mano: edita src/ y corre `npm run build`.

/**
 * SINAV · Concepto25.gs — los consecutivos de giro y las formas de pago.
 *
 * ---------------------------------------------------------------------------
 * EL CONSECUTIVO NO SE INVENTA
 *
 * Revisoria busca estos numeros, asi que no se pueden generar al vuelo: cada
 * municipio tiene el SUYO, fijo, y lo unico que cambia de un periodo a otro
 * es el mes. LR-09-74 en octubre es LR-10-74.
 *
 *   LR-09-74     prefijo LR, mes 09, numero 74
 *   HC26-10-141  prefijo HC26, mes 10, numero 141
 *
 * El prefijo se respeta tal como lo tienen: no se cambia aunque la mande otra
 * persona, porque es con el que concilian. Si algun dia quieren que siga a
 * quien envia, se pone CONFIG.giro_sigue_al_remitente = SI.
 *
 * ---------------------------------------------------------------------------
 * DE DONDE SALEN ESTOS DATOS
 *
 *   ICA y RETEICA   del archivo «ICA - Rte ICA Concepto 25_10 Octubre 2026»,
 *                   que es el mas reciente y el mas completo.
 *   Lo que falta    del «ENVIO MASIVO DECLARACIONES-LILIANA RAMIREZ»,
 *                   hoja CONCEPTO 25, solo para los municipios que no estaban.
 *
 * Se cotejaron los dos: de 128 municipios comunes, 126 tienen el mismo
 * numero. Los dos que no (PALERMO y TUNJA) se quedaron con el de octubre.
 *
 * Las formas de pago salen de «REQ-019 — Información de Municipios», con sus
 * cinco hojas (IND/MIX x PSE/TRANSFERENCIA/OFICINA) refundidas en una sola
 * tabla: lo que importa es COMO se paga, no si el municipio es mixto.
 *
 * ---------------------------------------------------------------------------
 * COMO SE USA
 *
 *   Una vez:  SINAV · Mes -> Cargar consecutivos y formas de pago
 *
 * Escribe en PROGRAMACION (que es de donde heredan los meses siguientes) y en
 * las obligaciones abiertas. No pisa nada escrito a mano.
 */

var CONSECUTIVOS = {
  'AGUACHICA|ICA':'AG-10-01','AGUAZUL|ICA':'AG-10-02',
  'AGUSTIN CODAZZI|ICA':'AG-10-03','AMAGA|ICA':'AG-10-04',
  'ANAPOIMA|ICA':'AG-10-05','ANDES|ICA':'AG-10-06','APARTADO|ICA':'AG-10-07',
  'APIA|ICA':'AG-10-08','ARANZAZU|ICA':'AG-10-09','ARAUCA|ICA':'AG-10-10',
  'ARGELIA|ICA':'AG-10-11','ARMENIA|ICA':'AG-10-12',
  'BARRANCABERMEJA|ICA':'AG-10-13','BARRANQUILLA|ICA':'AG-10-14',
  'BELLO|ICA':'AG-10-15','BETULIA|ICA':'AG-10-16','BOGOTA|ICA':'AG-10-17',
  'BUCARAMANGA|ICA':'AG-10-18','BUENAVENTURA|ICA':'AG-10-19',
  'CAJICA|ICA':'AG-10-20','CAICEDONIA|ICA':'AG-10-21',
  'CALARCA|ICA':'AG-10-22','CALDAS|ICA':'AG-10-23','CALI|ICA':'AG-10-24',
  'CARTAGENA|ICA':'AG-10-25','CARTAGO|ICA':'AG-10-26',
  'CHARALA|ICA':'AG-10-27','CHIA|ICA':'AG-10-28','CHINCHINA|ICA':'AG-10-29',
  'CHIQUINQUIRA|ICA':'AG-10-30','CIENAGA|ICA':'AG-10-31',
  'CIUDAD BOLIVAR|ICA':'AG-10-32','CONCORDIA|ICA':'AG-10-33',
  'DOSQUEBRADAS|ICA':'AG-10-34','EL CARMEN DE BOLIVAR|ICA':'AG-10-35',
  'EL COLEGIO|ICA':'AG-10-36','EL DOVIO|ICA':'AG-10-37',
  'EL ROSAL|ICA':'AG-10-38','EL SANTUARIO|ICA':'AG-10-39',
  'ESPINAL|ICA':'AG-10-40','FACATATIVA|ICA':'AG-10-41',
  'FLORENCIA|ICA':'AG-10-42','FRESNO|ICA':'AG-10-43',
  'FUNDACION|ICA':'AG-10-44','FUNZA|ICA':'AG-10-45',
  'FUSAGASUGA|ICA':'AG-10-46','GARZON|ICA':'AG-10-47','GENOVA|ICA':'AG-10-48',
  'GIRARDOT|ICA':'AG-10-49','GIRON|ICA':'AG-10-50',
  'GUADALAJARA DE BUGA|ICA':'AG-10-51','GUASCA|ICA':'AG-10-52',
  'ITAGUI|ICA':'AG-10-53','JAMUNDI|ICA':'AG-10-54','JERICO|ICA':'AG-10-55',
  'LA CEJA|ICA':'AG-10-56','LA ESTRELLA|ICA':'AG-10-57',
  'LA PLATA|ICA':'AG-10-58','LA TEBAIDA|ICA':'AG-10-59',
  'LA UNION [VALLE]|ICA':'AG-10-60','LA VIRGINIA|ICA':'AG-10-61',
  'MAGANGUE|ICA':'AG-10-62','MANIZALES|ICA':'AG-10-63',
  'MARINILLA|ICA':'AG-10-64','MARIQUITA|ICA':'AG-10-65',
  'MARSELLA|ICA':'AG-10-66','MEDELLIN|ICA':'AG-10-67','MELGAR|ICA':'AG-10-68',
  'MIRAFLORES [BOYACA]|ICA':'AG-10-69','MONIQUIRA|ICA':'AG-10-70',
  'MONTERIA|ICA':'AG-10-71','NEIRA|ICA':'AG-10-72','NEIVA|ICA':'AG-10-73',
  'NILO|ICA':'AG-10-74','OBANDO|ICA':'AG-10-75','PACHO|ICA':'AG-10-76',
  'PAIPA|ICA':'AG-10-77','PALERMO|ICA':'AG-10-79','PALMIRA|ICA':'AG-10-80',
  'PAMPLONA|ICA':'AG-10-81','PENSILVANIA|ICA':'AG-10-82',
  'PEREIRA|ICA':'AG-10-83','PIEDECUESTA|ICA':'AG-10-84',
  'PITALITO|ICA':'AG-10-85','POPAYAN|ICA':'AG-10-86',
  'PUERTO BOYACA|ICA':'AG-10-87','PUERTO COLOMBIA|ICA':'AG-10-88',
  'QUINCHIA|ICA':'AG-10-89','RIOHACHA|ICA':'AG-10-90',
  'RIONEGRO [SANTANDER]|ICA':'AG-10-91','ROLDANILLO|ICA':'AG-10-92',
  'SABANETA|ICA':'AG-10-93','SAMACA|ICA':'AG-10-94','CUCUTA|ICA':'AG-10-95',
  'SAN JUAN DEL CESAR|ICA':'AG-10-96','SAN VICENTE DE CHUCURI|ICA':'AG-10-97',
  'SANTA BARBARA|ICA':'AG-10-98','SANTA MARTA|ICA':'AG-10-99',
  'SANTA ROSA DE CABAL|ICA':'AG-10-100',
  'SANTANDER DE QUILICHAO|ICA':'AG-10-101','SARAVENA|ICA':'AG-10-102',
  'SEVILLA|ICA':'AG-10-103','SIBATE|ICA':'AG-10-104',
  'SINCELEJO|ICA':'AG-10-105','SOACHA|ICA':'AG-10-106',
  'SOLEDAD|ICA':'AG-10-107','SONSON|ICA':'AG-10-108','SOPO|ICA':'AG-10-109',
  'SUBACHOQUE|ICA':'AG-10-110','TAMESIS|ICA':'AG-10-111',
  'TAURAMENA|ICA':'AG-10-112','TENJO|ICA':'AG-10-113',
  'TOCANCIPA|ICA':'AG-10-114','TUNJA|ICA':'HC26-10-106',
  'TUQUERRES|ICA':'AG-10-116','TURBACO|ICA':'AG-10-117',
  'VALLEDUPAR|ICA':'AG-10-118','VERSALLES|ICA':'AG-10-119',
  'VILLA DE SAN DIEGO DE UBATE|ICA':'AG-10-120','VILLAMARIA|ICA':'AG-10-121',
  'VILLANUEVA|ICA':'AG-10-122','VILLAVICENCIO|ICA':'AG-10-123',
  'YARUMAL|ICA':'AG-10-124','YOPAL|ICA':'AG-10-125','ZARZAL|ICA':'AG-10-126',
  'ZIPAQUIRA|ICA':'AG-10-127','LA CALERA|ICA':'AG-10-128',
  'LA DORADA|ICA':'AG-10-129','MADRID|ICA':'AG-10-130',
  'FACTURAS|ICA':'FACTURAS','124 FREDONIA|ICA':'AG-10-131',
  '125 VENECIA|ICA':'AG-10-132','126 RIONEGRO|ICA':'AG-10-133',
  '127 ITAGUI|ICA':'AG-10-134','128 COPACABANA|ICA':'AG-10-135',
  '129 APIA|ICA':'AG-10-136','130 ENVIGADO|ICA':'AG-10-137',
  '131 CALDAS|ICA':'AG-10-138','132 LA CEJA|ICA':'AG-10-139',
  '134 EL SANTUARIO|ICA':'AG-10-140','135 BELLO|ICA':'AG-10-141',
  '136 MARINILLA|ICA':'AG-10-142','184 YUMBO|ICA':'AG-10-143',
  '138 SINCELEJO|ICA':'AG-10-144','140 ABEJORRAL|ICA':'AG-10-145',
  '3990 BETULIA|ICA':'AG-10-146','3985 EL JARDIN|ICA':'AG-10-147',
  '3975 SALGAR|ICA':'AG-10-148','ABEJORRAL|RETEICA':'HC26-10-141',
  'ACACIAS|RETEICA':'HC26-10-71','AMALFI|RETEICA':'HC26-10-134',
  'ANDES|RETEICA':'HC26-10-132','APIA|RETEICA':'HC26-10-85',
  'ARJONA|RETEICA':'HC26-10-209','ARMENIA ANT|RETEICA':'HC26-10-232',
  'PUERTO COLOMBIA|RETEICA':'JJ26-10-187','ARMERO|RETEICA':'HC26-10-222',
  'BARRANCA DE UPIA|RETEICA':'HC26-10-218',
  'BELEN DE UMBRIA|RETEICA':'HC26-10-81','BERBEO|RETEICA':'HC26-10-237',
  'CAICEDO|RETEICA':'HC26-10-291','GIRON|RETEICA':'JJ26-10-182',
  'SAN GIL|RETEICA':'JJ26-10-30','SOCORRO|RETEICA':'JJ26-10-31',
  'SAN VICENTE DE CHUCURI|RETEICA':'JJ26-10-32',
  'BARBOSA SANTANDER|RETEICA':'JJ26-10-35','OIBA|RETEICA':'JJ26-10-38',
  'CALI|RETEICA':'HC26-10-13','CANASGORDAS|RETEICA':'HC26-10-287',
  'CARMEN DE APICALA|RETEICA':'HC26-10-249','CAUCASIA|RETEICA':'HC26-10-129',
  'CHACHAGUI|RETEICA':'HC26-10-314','CHAPARRAL|RETEICA':'HC26-10-104',
  'CHIQUINQUIRA|RETEICA':'HC26-10-128','CISNEROS|RETEICA':'HC26-10-228',
  'CIUDAD BOLIVAR|RETEICA':'HC26-10-136','COCORNA|RETEICA':'HC26-10-233',
  'COELLO|RETEICA':'HC26-10-248','LA PLATA|RETEICA':'JJ26-10-49',
  'ANSERMA|RETEICA':'JJ26-10-52','SUPIA|RETEICA':'JJ26-10-54',
  'SALAMINA|RETEICA':'JJ26-10-56','AGUADAS|RETEICA':'JJ26-10-58',
  'VILLAMARIA|RETEICA':'JJ26-10-59','PACORA|RETEICA':'JJ26-10-60',
  'PENSILVANIA|RETEICA':'JJ26-10-61','ARANZAZU|RETEICA':'JJ26-10-62',
  'MANZANARES|RETEICA':'JJ26-10-63','FILADELFIA|RETEICA':'JJ26-10-64',
  'PALESTINA|RETEICA':'JJ26-10-65','CUCUTA|RETEICA':'HC26-10-42',
  'DAGUA|RETEICA':'HC26-10-313','DUITAMA|RETEICA':'HC26-10-118',
  'EL AGUILA|RETEICA':'HC26-10-292','EL CAIRO|RETEICA':'HC26-10-87',
  'EL CALVARIO|RETEICA':'HC26-10-290',
  'EL CARMEN DE BOLIVAR|RETEICA':'HC26-10-41',
  'EL CASTILLO|RETEICA':'HC26-10-245','EL DOVIO|RETEICA':'HC26-10-12',
  'EL PENOL NARINO|RETEICA':'HC26-10-246',
  'EL PENON-BOLIVAR|RETEICA':'HC26-10-239','EL RETIRO|RETEICA':'HC26-10-301',
  'EL SANTUARIO|RETEICA':'HC26-10-80','ENTRERRIOS|RETEICA':'HC26-10-286',
  'FLANDES|RETEICA':'HC26-10-302','FREDONIA|RETEICA':'HC26-10-138',
  'FUNES|RETEICA':'HC26-10-247','GIRALDO|RETEICA':'HC26-10-234',
  'GRANADA|RETEICA':'HC26-10-67','GRANADA ANTIOQUIA|RETEICA':'HC26-10-264',
  'GUAMAL|RETEICA':'HC26-10-217','MONTENEGRO|RETEICA':'JJ26-10-91',
  'LA TEBAIDA|RETEICA':'JJ26-10-95','LORICA|RETEICA':'JJ26-10-188',
  'MONTERIA|RETEICA':'JJ26-10-97','CERETE|RETEICA':'JJ26-10-191',
  'IBAGUE|RETEICA':'HC26-10-100','IPIALES|RETEICA':'HC26-10-125',
  'JARDIN|RETEICA':'HC26-10-144','JERICO|RETEICA':'HC26-10-147',
  'LA DORADA|RETEICA':'HC26-10-57','LA ESTRELLA|RETEICA':'HC26-10-195',
  'LA MACARENA|RETEICA':'HC26-10-293','LA PINTADA|RETEICA':'HC26-10-309',
  'LA UNION NARINO|RETEICA':'HC26-10-196','LEIVA|RETEICA':'HC26-10-294',
  'LIBANO|RETEICA':'HC26-10-102','MAGANGUE|RETEICA':'HC26-10-215',
  'MANI|RETEICA':'HC26-10-202','MAPIRIPAN|RETEICA':'HC26-10-242',
  'MARIQUITA|RETEICA':'HC26-10-98','MEDELLIN|RETEICA':'HC26-10-21',
  'MOMPOS|RETEICA':'HC26-10-227','SINCELEJO|RETEICA':'JJ26-10-114',
  'MONIQUIRA|RETEICA':'HC26-10-107','NECHI ANTIOQUIA|RETEICA':'HC26-10-271',
  'FONSECA|RETEICA':'JJ26-10-184','AGUSTIN CODAZZI|RETEICA':'JJ26-10-120',
  'SAN JUAN DEL CESAR|RETEICA':'JJ26-10-121',
  'VILLANUEVA|RETEICA':'JJ26-10-122','NOBSA|RETEICA':'HC26-10-111',
  'OCANA|RETEICA':'HC26-10-116','ORTEGA|RETEICA':'HC26-10-103',
  'PAIPA|RETEICA':'HC26-10-150','PAMPLONA|RETEICA':'HC26-10-45',
  'PASTO|RETEICA':'HC26-10-73','PEQUE|RETEICA':'HC26-10-250',
  'PUERTO BERRIO|RETEICA':'HC26-10-179','PUERTO BOYACA|RETEICA':'HC26-10-99',
  'PUERTO CONCORDIA|RETEICA':'HC26-10-243',
  'PUERTO GAITAN|RETEICA':'HC26-10-69','PUERTO LOPEZ|RETEICA':'HC26-10-210',
  'QUIBDO|RETEICA':'HC26-10-194','QUINCHIA|RETEICA':'HC26-10-82',
  'RESTREPO|RETEICA':'HC26-10-10','RESTREPO META|RETEICA':'HC26-10-308',
  'SABANALARGA ANTIOQUIA|RETEICA':'HC26-10-272',
  'SALDANA|RETEICA':'HC26-10-204','SALGAR|RETEICA':'HC26-10-140',
  'SAMACA|RETEICA':'HC26-10-110','SAN ANDRES DE TUMACO|RETEICA':'HC26-10-208',
  'SAN CARLOS DE GUAROA|RETEICA':'HC26-10-241',
  'SAN JERONIMO|RETEICA':'HC26-10-230',
  'SAN JUAN DE URABA|RETEICA':'HC26-10-251','SAN LUIS|RETEICA':'HC26-10-252',
  'SAN MARTIN DE LOBA|RETEICA':'HC26-10-240',
  'SAN MARTIN-META|RETEICA':'HC26-10-203','SAN PABLO|RETEICA':'HC26-10-312',
  'SAN PEDRO DE URABA|RETEICA':'HC26-10-288',
  'SAN RAFAEL|RETEICA':'HC26-10-231','SANTA BARBARA|RETEICA':'HC26-10-142',
  'SANTA MARIA|RETEICA':'HC26-10-254','SANTA ROSA|RETEICA':'HC26-10-307',
  'GUADUAS|RETEICA':'JJ26-10-164','LA MESA|RETEICA':'JJ26-10-165',
  'SAN ANTONIO DEL TEQUENDAMA|RETEICA':'JJ26-10-166',
  'VILLA DE SAN DIEGO DE UBATE|RETEICA':'JJ26-10-168',
  'ANAPOIMA|RETEICA':'JJ26-10-169','VILLETA|RETEICA':'JJ26-10-173',
  'VIANI|RETEICA':'JJ26-10-174','SANTAFE DE ANTIOQUIA|RETEICA':'HC26-10-200',
  'SANTANDER DE QUILICHAO|RETEICA':'HC26-10-5','SIMITI|RETEICA':'HC26-10-236',
  'SOCHA BOYACA|RETEICA':'HC26-10-275','SOGAMOSO|RETEICA':'HC26-10-112',
  'SONSON|RETEICA':'HC26-10-137','SOPETRAN|RETEICA':'HC26-10-285',
  'SUCRE|RETEICA':'HC26-10-305','TAME|RETEICA':'HC26-10-178',
  'TARSO|RETEICA':'HC26-10-310','TAURAMENA|RETEICA':'HC26-10-109',
  'TIMBIO|RETEICA':'HC26-10-306','TOLEDO|RETEICA':'HC26-10-295',
  'TULUA|RETEICA':'HC26-10-127','TUNJA|RETEICA':'HC26-10-106',
  'TURBO|RETEICA':'HC26-10-183','VALDIVIA|RETEICA':'HC26-10-253',
  'VENECIA|RETEICA':'HC26-10-145','VERSALLES|RETEICA':'HC26-10-16',
  'VIJES|RETEICA':'HC26-10-284','VILLA DE LEYVA|RETEICA':'HC26-10-180',
  'VILLANUEVA CASANARE|RETEICA':'HC26-10-201',
  'VISTA HERMOSA|RETEICA':'HC26-10-244','YOPAL|RETEICA':'HC26-10-124',
  'YOTOCO|RETEICA':'HC26-10-223','YUMBO|RETEICA':'HC26-10-17',
  'ZARAGOZA|RETEICA':'HC26-10-289'
};

var FORMA_PAGO_MUNICIPIO = {
  'TOCANCIPA':'PSE','BOSCONIA':'PSE','ZIPAQUIRA':'PSE','MADRID':'PSE',
  'PLATO':'PSE','MOSQUERA':'PSE','PIEDECUESTA':'PSE','LEBRIJA':'PSE',
  'CAJICA':'PSE','COROZAL':'PSE','SAN MARCOS':'PSE','FACATATIVA':'PSE',
  'SAN MARTIN':'PSE','TENJO':'PSE','JUAN DE ACOSTA':'PSE','CHIA':'PSE',
  'GALAPA':'PSE','CHIMICHAGUA':'PSE','CORPORACION FINANCIERA SA':'PSE',
  'FLORIDABLANCA':'PSE','BOGOTA':'PSE','DATIO':'PSE',
  'INVERSIONES CFD SAS':'PSE','RENTING DAVIVIENDA SAS':'PSE',
  'VC INVESTMENTS SAS':'PSE','COTA':'PSE','SABANALARGA':'PSE','SOPO':'PSE',
  'SANTA MARTA':'PSE','VALLEDUPAR':'PSE','SOACHA':'PSE','FUSAGASUGA':'PSE',
  'FILANDIA':'TRANSFERENCIA','SALENTO':'TRANSFERENCIA',
  'SUAITA':'TRANSFERENCIA','SALAZAR DE LAS PALMAS':'TRANSFERENCIA',
  'MALAMBO':'TRANSFERENCIA','PUERTO WILCHES':'TRANSFERENCIA',
  'PUERTO LEGUIZAMO':'TRANSFERENCIA','RIOSUCIO':'TRANSFERENCIA',
  'SIMACOTA':'TRANSFERENCIA','GAMARRA':'TRANSFERENCIA',
  'GACHANCIPA':'TRANSFERENCIA','OVEJAS':'TRANSFERENCIA',
  'RICAURTE':'TRANSFERENCIA','GACHALA':'TRANSFERENCIA',
  'NIMAIMA':'TRANSFERENCIA','ANOLAIMA':'TRANSFERENCIA',
  'QUEBRADANEGRA':'TRANSFERENCIA','TESALIA':'TRANSFERENCIA',
  'GUARANDA':'TRANSFERENCIA','LA VEGA':'TRANSFERENCIA',
  'CALIFORNIA':'TRANSFERENCIA','SAN PELAYO':'TRANSFERENCIA',
  'COGUA':'TRANSFERENCIA','COTORRA':'TRANSFERENCIA',
  'SILVANIA':'TRANSFERENCIA','BUENAVISTA':'TRANSFERENCIA',
  'COVENAS':'TRANSFERENCIA','MORROA':'TRANSFERENCIA',
  'CIRCASIA':'TRANSFERENCIA','SAN JUAN DE BETULIA':'TRANSFERENCIA',
  'SAN ZENON':'TRANSFERENCIA','GUAPOTA':'TRANSFERENCIA',
  'PUERTO PARRA':'TRANSFERENCIA','SANTO TOMAS':'TRANSFERENCIA',
  'VILLAPINZON':'TRANSFERENCIA','PIVIJAY':'TRANSFERENCIA',
  'JUNIN':'TRANSFERENCIA','CAQUEZA':'TRANSFERENCIA',
  'SAN BENITO DE ABAD':'TRANSFERENCIA','SAN DIEGO':'TRANSFERENCIA',
  'EL BANCO':'TRANSFERENCIA','GRANADA':'TRANSFERENCIA',
  'QUIMBAYA':'TRANSFERENCIA','PALESTINA':'OFICINA','PACORA':'OFICINA',
  'AGUSTIN CODAZZI':'OFICINA','GIRON':'OFICINA','ANSERMA':'OFICINA',
  'LA TEBAIDA':'OFICINA','AGUADAS':'OFICINA','SAN GIL':'OFICINA',
  'MONTENEGRO':'OFICINA','SAN VICENTE DEL CHUCURI':'OFICINA',
  'ARANZAZU':'OFICINA','OIBA':'OFICINA','SUPIA':'OFICINA','UBATE':'OFICINA',
  'MANZANARES':'OFICINA','PENSILVANIA':'OFICINA','VILLAMARIA':'OFICINA',
  'SAN ANTONIO DEL TEQUENDAMA':'OFICINA','CERETE':'OFICINA',
  'LA MESA':'OFICINA','LORICA':'OFICINA','LA PLATA':'OFICINA',
  'MONTERIA':'OFICINA','FILADELFIA':'OFICINA','SALAMINA':'OFICINA',
  'BARBOSA':'OFICINA','VIANI':'OFICINA','VILLANUEVA':'OFICINA',
  'FONSECA':'OFICINA','PUERTO COLOMBIA':'OFICINA','SINCELEJO':'OFICINA',
  'ANAPOIMA':'OFICINA','GUADUAS':'OFICINA','SAN JUAN DEL CESAR':'OFICINA',
  'VILLETA':'OFICINA','SOCORRO':'OFICINA','BOJACA':'OFICINA','SOLEDAD':'PSE',
  'CIENAGA':'PSE','FLORENCIA':'PSE','PITALITO':'PSE','AGUACHICA':'PSE',
  'NEIVA':'PSE','SUBACHOQUE':'PSE','BARRANCABERMEJA':'PSE','RIOHACHA':'PSE',
  'FUNZA':'PSE','LA CALERA':'OFICINA','CHARALA':'OFICINA',
  'CAICEDONIA':'OFICINA','BUCARAMANGA':'OFICINA','PALERMO':'OFICINA',
  'GENOVA':'OFICINA','RIONEGRO':'OFICINA','BARRANQUILLA':'OFICINA',
  'FUNDACION':'OFICINA','MANIZALES':'OFICINA','GARZON':'OFICINA',
  'NEIRA':'OFICINA','CALARCA':'OFICINA','EL ROSAL':'OFICINA',
  'CHINCHINA':'OFICINA','EL COLEGIO':'OFICINA','PACHO':'OFICINA',
  'ARMENIA':'OFICINA','SEVILLA':'OFICINA','SIBATE':'OFICINA',
  'GUASCA':'OFICINA'
};

/* ---------------------------------------------------------------------------
   LAS PIEZAS PURAS
   --------------------------------------------------------------------------- */

/** Como se escribe un municipio en estas tablas: sin tildes, sin dobles espacios. */
function claveConcepto(municipio, impuesto) {
  var s = String(municipio || '')
    .replace(/[\u00c1\u00e1]/g, 'A').replace(/[\u00c9\u00e9]/g, 'E')
    .replace(/[\u00cd\u00ed]/g, 'I').replace(/[\u00d3\u00f3]/g, 'O')
    .replace(/[\u00da\u00fa\u00dc\u00fc]/g, 'U').replace(/[\u00d1\u00f1]/g, 'N')
    .toUpperCase().replace(/\s+/g, ' ').trim();
  return impuesto ? s + '|' + String(impuesto).toUpperCase().trim() : s;
}

/**
 * Cambia el mes de una plantilla y deja lo demas igual.
 *
 *   LR-09-74     + mes 10 -> LR-10-74
 *   HC26-10-141  + mes 11 -> HC26-11-141
 *
 * El mes es siempre el penultimo trozo: lo de antes es el prefijo (que puede
 * llevar guiones) y lo de despues es el numero del municipio.
 */
function giroDesdePlantilla(plantilla, mes) {
  var partes = String(plantilla || '').trim().split('-');
  if (partes.length < 3 || !mes) return String(plantilla || '').trim();
  partes[partes.length - 2] = mes < 10 ? '0' + mes : String(mes);
  return partes.join('-');
}

/** El consecutivo que le toca a una obligacion, con el mes de su periodo. */
function consecutivoDe(municipio, impuesto, periodo) {
  var plantilla = CONSECUTIVOS[claveConcepto(municipio, impuesto)];
  if (!plantilla) return '';
  return giroDesdePlantilla(plantilla, mesDelPeriodo(periodo));
}

/** La forma de pago que tiene definida un municipio. */
function formaPagoDe(municipio) {
  return FORMA_PAGO_MUNICIPIO[claveConcepto(municipio, '')] || '';
}

/* ---------------------------------------------------------------------------
   LA CARGA
   --------------------------------------------------------------------------- */

/**
 * Escribe consecutivos y formas de pago donde tienen que estar.
 *
 * En PROGRAMACION, que es de donde heredan los meses que vienen, y en las
 * obligaciones que siguen abiertas, que ya existen y no heredan solas.
 *
 * No pisa nada que ya tenga valor: lo escrito a mano manda.
 */
function cargarConcepto25() {
  exige('configurar');

  var l = [];
  l.push(enProgramacion());
  l.push(enObligaciones());

  registrar('', EVENTO.AVISO, 'consecutivos y formas de pago cargados');
  var txt = l.join('\n\n');
  Logger.log(txt);
  return txt;
}

/** PROGRAMACION: la plantilla sin mes, que es lo que se hereda. */
function enProgramacion() {
  var h = libro().getSheetByName(HOJA_PROGRAMACION);
  if (!h || h.getLastRow() < 2) {
    return 'PROGRAMACION está vacía: no se tocó. Corre cargarProgramacion() primero.';
  }

  var ancho = h.getLastColumn();
  var cab = h.getRange(1, 1, 1, ancho).getValues()[0].map(function (v) {
    return String(v).trim();
  });
  var col = function (nombre) {
    var i = cab.indexOf(nombre);
    if (i >= 0) return i;
    cab.push(nombre);
    h.getRange(1, cab.length).setValue(nombre).setFontWeight('bold');
    return cab.length - 1;
  };
  var cMun = cab.indexOf('municipio');
  var cImp = cab.indexOf('impuesto');
  if (cMun < 0 || cImp < 0) {
    return 'A PROGRAMACION le faltan las columnas municipio o impuesto.';
  }
  var cCons = col('consecutivo');
  var cForma = col('forma_pago');

  var n = h.getLastRow() - 1;
  var datos = h.getRange(2, 1, n, Math.max(ancho, cab.length)).getValues();
  var puestos = 0, pagos = 0, sinConsecutivo = {};

  for (var i = 0; i < datos.length; i++) {
    var mun = datos[i][cMun], imp = datos[i][cImp];
    if (!mun) continue;

    if (!String(datos[i][cCons] || '').trim()) {
      var plantilla = CONSECUTIVOS[claveConcepto(mun, imp)];
      if (plantilla) { datos[i][cCons] = plantilla; puestos++; }
      else if (String(imp).toUpperCase() !== 'EXOGENA') {
        sinConsecutivo[claveConcepto(mun, imp)] = true;
      }
    }
    if (!String(datos[i][cForma] || '').trim()) {
      var forma = formaPagoDe(mun);
      if (forma) { datos[i][cForma] = forma; pagos++; }
    }
  }

  h.getRange(2, 1, n, cab.length).setValues(datos.map(function (f) {
    var fila = f.slice(0, cab.length);
    while (fila.length < cab.length) fila.push('');
    return fila;
  }));

  var r = ['PROGRAMACION: ' + puestos + ' consecutivos y ' + pagos +
           ' formas de pago escritas.'];
  var faltan = Object.keys(sinConsecutivo);
  if (faltan.length) {
    r.push(faltan.length + ' reglas sin consecutivo en las tablas:');
    faltan.sort().slice(0, 20).forEach(function (x) { r.push('   ' + x); });
    if (faltan.length > 20) r.push('   … y ' + (faltan.length - 20) + ' más');
  }
  return r.join('\n');
}

/** Las obligaciones abiertas: la plantilla ya con el mes de su periodo. */
function enObligaciones() {
  var ix = indices(HOJA.OBLIGACIONES);
  exigeColumna(ix, 'consecutivo_giro');
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var giros = 0, pagos = 0;
  todas.forEach(function (f, k) {
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;

    if (!String(f[ix.consecutivo_giro] || '').trim()) {
      var g = consecutivoDe(f[ix.municipio], f[ix.impuesto], f[ix.periodo]);
      if (g) { h.getRange(k + 2, ix.consecutivo_giro + 1).setValue(g); giros++; }
    }
    if (!String(f[ix.forma_pago] || '').trim()) {
      var forma = formaPagoDe(f[ix.municipio]);
      if (forma) { h.getRange(k + 2, ix.forma_pago + 1).setValue(forma); pagos++; }
    }
  });

  return 'OBLIGACIONES: ' + giros + ' consecutivos y ' + pagos +
         ' formas de pago escritas en las que siguen abiertas.';
}

/* ---- menu ---------------------------------------------------------------- */

function menuConcepto25() {
  SpreadsheetApp.getUi().createMenu('SINAV · Concepto 25')
    .addItem('Cargar consecutivos y formas de pago', 'cargarConcepto25DesdeMenu')
    .addToUi();
}

function cargarConcepto25DesdeMenu() {
  SpreadsheetApp.getUi().alert('SINAV · Concepto 25', cargarConcepto25(),
                               SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------------------------------------------------------------------------
   TRASPASOS

   Cuando alguien sale del equipo hay que mover lo suyo, y no es solo cambiar
   el responsable: queda rastro en EVENTOS de cada obligacion que cambio de
   manos, que es lo que permite explicar meses despues por que una declaracion
   la presento quien la presento.
   --------------------------------------------------------------------------- */

/**
 * Pasa a otra persona todo lo que tenga alguien, en PROGRAMACION y en las
 * obligaciones que siguen abiertas.
 *
 *   traspasar('andrea.galvis@davivienda.com', 'liliana.ramirez@davivienda.com')
 *
 * Las ya APROBADAS no se tocan: son historia y tienen que seguir diciendo
 * quien las hizo.
 */
function traspasar(correoSale, correoEntra) {
  exige('configurar');

  var sale = String(correoSale || '').trim().toLowerCase();
  var entra = String(correoEntra || '').trim().toLowerCase();
  if (!sale || !entra) {
    throw new Error('Hacen falta los dos correos: traspasar("sale@...", "entra@...")');
  }
  if (sale === entra) throw new Error('Son el mismo correo.');

  var l = [];

  // 1. PROGRAMACION, que es de donde nacen los meses siguientes
  var hp = libro().getSheetByName(HOJA_PROGRAMACION);
  if (hp && hp.getLastRow() > 1) {
    var cab = hp.getRange(1, 1, 1, hp.getLastColumn()).getValues()[0]
                .map(function (v) { return String(v).trim(); });
    var c = cab.indexOf('responsable');
    if (c >= 0) {
      var col = hp.getRange(2, c + 1, hp.getLastRow() - 1, 1).getValues();
      var n = 0;
      for (var i = 0; i < col.length; i++) {
        if (String(col[i][0] || '').trim().toLowerCase() === sale) {
          col[i][0] = entra;
          n++;
        }
      }
      if (n) hp.getRange(2, c + 1, col.length, 1).setValues(col);
      l.push('PROGRAMACION: ' + n + ' reglas pasaron a ' + entra + '.');
    }
  }

  // 2. las obligaciones abiertas
  var ix = indices(HOJA.OBLIGACIONES);
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var eventos = [], movidas = 0;

  filas(HOJA.OBLIGACIONES).forEach(function (f, k) {
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;
    if (String(f[ix.responsable] || '').trim().toLowerCase() !== sale) return;

    h.getRange(k + 2, ix.responsable + 1).setValue(entra);
    // si estaba cubriendo a alguien, eso se termina aqui: el titular ya no
    // trabaja, asi que no hay a quien devolversela
    if (String(f[ix.titular_original] || '').trim()) {
      h.getRange(k + 2, ix.titular_original + 1).setValue('');
    }
    eventos.push({ id: String(f[ix.id]), quePaso: EVENTO.ASIGNADA,
                   detalle: 'traspaso: de ' + sale + ' a ' + entra });
    movidas++;
  });

  if (eventos.length) registrarVarios(eventos);
  l.push('OBLIGACIONES: ' + movidas + ' abiertas pasaron a ' + entra + '.');
  l.push('', 'Las APROBADAS no se tocaron: siguen diciendo quién las hizo.');
  l.push('Revisa la hoja USUARIOS: a quien sale ponle activo = NO, y mira los');
  l.push('backups, que pueden haber quedado apuntando a una persona que ya no está.');

  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}
