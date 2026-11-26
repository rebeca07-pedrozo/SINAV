/**
 * SINAV · Arranque.gs — dejar el mes listo de una sola corrida.
 *
 * ---------------------------------------------------------------------------
 * QUE HACE
 *
 * prepararElMes() hace, en orden, todo lo que hay que hacer para que alguien
 * pueda sentarse a enviar:
 *
 *   1. crea las columnas y la configuracion que falten
 *   2. trae las obligaciones del mes en curso y del siguiente
 *   3. escribe los correos de las oficinas
 *   4. escribe los consecutivos de giro y las formas de pago
 *   5. reparte los adhesivos, si la hoja ADHESIVOS esta pegada
 *   6. cuenta lo que quedo listo y lo que falta
 *
 * Se puede correr las veces que haga falta: nada se duplica y nada se pisa.
 * Lo escrito a mano siempre gana.
 *
 * ---------------------------------------------------------------------------
 * LOS CORREOS
 *
 * Salen del «Directorio Oficinas ICA», de sus tres hojas: BASE_CORREOS, que
 * es la que trae director, subdirector y los otros correos separados, y las
 * de ICA y ReteIca, que completan los municipios que a la primera le faltan.
 * En total 317 municipios.
 *
 * El orden importa: primero el director, despues el subdirector, despues los
 * demas. Asi, si alguna vez hay que recortar la lista, se recorta por el
 * final y no por quien tiene que firmar.
 */

var CORREOS_OFICINA = {
  
  '19698':'director0118@davivienda.com,subdirector0118@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '05002':'director3976@davivienda.com,subdirector3976@davivienda.com',
  '50006':'director0971@davivienda.com,subdirector0971@davivienda.com,amriveros@davivienda.com',
  '05031':'director3966@davivienda.com,subdirector3966@davivienda.com,gospina@davivienda.com',
  '05034':'director3964@davivienda.com,subdirector3964@davivienda.com,crestrada@davivienda.com',
  '66045':'director1285@davivienda.com,subdirector1285@davivienda.com,dlpereira@davivienda.com',
  '13052':'director4563@davivienda.com,subdirector4563@davivienda.com,director0571@davivienda.com,subdirector0571@davivienda.com',
  '05059':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '73055':'director1666@davivienda.com,subdirector1666@davivienda.com,cazuniga@davivienda.com',
  '66088':'director1279@davivienda.com,subdirector1279@davivienda.com,cnaranjo@davivienda.com',
  '76113':'director3760@davivienda.com,subdirector3760@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '05129':'director0385@davivienda.com,subdirector0385@davivienda.com,crestrada@davivienda.com',
  '76001':'director0160@davivienda.com,subdirector0160@davivienda.com,jumvelas@davivienda.com',
  '05138':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '73148':'director4460@davivienda.com,subdirector4460@davivienda.com,cazuniga@davivienda.com',
  '05154':'director3936@davivienda.com,subdirector3936@davivienda.com,luicasas@davivienda.com',
  '73168':'director1674@davivienda.com,subdirector1674@davivienda.com,cazuniga@davivienda.com',
  '15176':'director3860@davivienda.com,subdirector3860@davivienda.com,mavarond@davivienda.com',
  '05190':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05101':'director3969@davivienda.com,subdirector3969@davivienda.com,cazuniga@davivienda.com',
  '05197':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '73200':'director1666@davivienda.com,subdirector1666@davivienda.com,cazuniga@davivienda.com,subdirector1687@davivienda.com',
  '05212':'director0391@davivienda.com,subdirector0391@davivienda.com,mmarroyave@davivienda.com',
  '54001':'director0660@davivienda.com,subdirector0660@davivienda.com,wlaguado@davivienda.com',
  '15238':'director2460@davivienda.com,subdirector2460@davivienda.com,mavarond@davivienda.com',
  '76246':'director1287@davivienda.com,subdirector1287@davivienda.com,jevelasq@davivienda.com',
  '50251':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '76250':'director0148@davivienda.com,subdirector0148@davivienda.com,jocarmon@davivienda.com',
  '05264':'subdirector0335@davivienda.com,crestrada@davivienda.com,hgrisale@davivienda.com',
  '05282':'director3972@davivienda.com,subdirector3972@davivienda.com,mzuluaga@davivienda.com',
  '50313':'director0915@davivienda.com,subdirector0915@davivienda.com,johjdaza@davivienda.com',
  '50318':'director0960@davivienda.com,subdirector0960@davivienda.com',
  '73001':'director1660@davivienda.com,subdirector1660@davivienda.com,cazuniga@davivienda.com',
  '52356':'director3460@davivienda.com,subdirector3460@davivienda.com',
  '05364':'director3985@davivienda.com,subdirector3985@davivienda.com,crestrada@davivienda.com',
  '05368':'director3992@davivienda.com,subdirector3992@davivienda.com,crestrada@davivienda.com',
  '17380':'director0850@davivienda.com,subdirector0850@davivienda.com,cazuniga@davivienda.com',
  '05380':'lfmorale@davivienda.com,director3919@davivienda.com,subdirector3919@davivienda.com',
  '50350':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com,director4685@davivienda.com,subdirector4685@davivienda.com',
  '52399':'director1064@davivienda.com,subdirector1064@davivienda.com,crestrada@davivienda.com',
  '66400':'director1283@davivienda.com,subdirector1283@davivienda.com,cnaranjo@davivienda.com',
  '73411':'director1668@davivienda.com,subdirector1668@davivienda.com,cazuniga@davivienda.com',
  '13430':'director0591@davivienda.com,subdirector0591@davivienda.com,ronylgil@davivienda.com',
  '50325':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '73443':'director1625@davivienda.com,subdirector1625@davivienda.com,cazuniga@davivienda.com',
  '05001':'director0360@davivienda.com,subdirector0360@davivienda.com,crestrada@davivienda.com,director0335@davivienda.com,subdirector0335@davivienda.com',
  '13468':'director0571@davivienda.com,subdirector0571@davivienda.com,ronylgil@davivienda.com',
  '15469':'director1767@davivienda.com,subdirector1767@davivienda.com,mavarond@davivienda.com',
  '05495':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '15491':'director1860@davivienda.com,subdirector1860@davivienda.com,mavarond@davivienda.com',
  '54498':'director2260@davivienda.com,subdirector2260@davivienda.com,wlaguado@davivienda.com',
  '73504':'director1669@davivienda.com,subdirector1669@davivienda.com,cazuniga@davivienda.com',
  '15516':'director4160@davivienda.com,subdirector4160@davivienda.com,mavarond@davivienda.com',
  '05579':'director0314@davivienda.com,subdirector0314@davivienda.com,mzuluaga@davivienda.com',
  '15572':'director4563@davivienda.com,subdirector4563@davivienda.com,director1626@davivienda.com,subdirector1626@davivienda.com',
  '50568':'director0917@davivienda.com,subdirector0917@davivienda.com,amriveros@davivienda.com',
  '50573':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '66594':'director1281@davivienda.com,subdirector1281@davivienda.com,cnaranjo@davivienda.com',
  '76606':'director0135@davivienda.com,subdirector0135@davivienda.com,elicardo@davivienda.com',
  '05615':'director3960@davivienda.com,subdirector3960@davivienda.com',
  '05628':'crestrada@davivienda.com,subdirector0335@davivienda.com',
  '05642':'director3975@davivienda.com,subdirector3975@davivienda.com,crestrada@davivienda.com',
  '15646':'director1772@davivienda.com,subdirector1772@davivienda.com,mavarond@davivienda.com',
  '50680':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '05656':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05659':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05660':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05664':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com',
  '05667':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05679':'director3977@davivienda.com,subdirector3977@davivienda.com,crestrada@davivienda.com',
  '05042':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '66687':'director1277@davivienda.com,subdirector1277@davivienda.com,cnaranjo@davivienda.com',
  '15757':'director1860@davivienda.com,subdirector1860@davivienda.com,mavarond@davivienda.com',
  '15759':'director1860@davivienda.com,subdirector1860@davivienda.com,mavarond@davivienda.com',
  '05756':'director3971@davivienda.com,subdirector3971@davivienda.com,crestrada@davivienda.com',
  '05761':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '81794':'director5064@davivienda.com,subdirector5064@davivienda.com,wlaguado@davivienda.com',
  '85410':'director1769@davivienda.com,subdirector1769@davivienda.com,amriveros@davivienda.com',
  '76834':'director3760@davivienda.com,subdirector3760@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '52835':'director1007@davivienda.com,subdirector1007@davivienda.com,bmunozg@davivienda.com',
  '15001':'director1760@davivienda.com,subdirector1760@davivienda.com',
  '05837':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05854':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '05861':'director3987@davivienda.com,subdirector3987@davivienda.com,nmospin@davivienda.com',
  '76863':'director0152@davivienda.com,subdirector0152@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '76869':'director0160@davivienda.com,subdirector0160@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '15407':'director1777@davivienda.com,subdirector1777@davivienda.com,mavarond@davivienda.com',
  '50001':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '50711':'director0960@davivienda.com,subdirector0960@davivienda.com,amriveros@davivienda.com',
  '85001':'director2860@davivienda.com,subdirector2860@davivienda.com,amriveros@davivienda.com',
  '76892':'director0184@davivienda.com,subdirector0184@davivienda.com,mjtoro@davivienda.com,mcruiz@davivienda.com',
  '05895':'director0335@davivienda.com,subdirector0335@davivienda.com,hgrisale@davivienda.com,crestrada@davivienda.com',
  '62330':'director0160@davivienda.com,subdirector0160@davivienda.com,jumvelas@davivienda.com',
  '53900':'director0360@davivienda.com,subdirector0360@davivienda.com,crestrada@davivienda.com,director0335@davivienda.com,subdirector0335@davivienda.com',
  '50020':'director3976@davivienda.com,subdirector3976@davivienda.com',
  '00060':'director0971@davivienda.com,subdirector0971@davivienda.com',
  '00110':'director0673@davivienda.com,subdirector0673@davivienda.com',
  '70130':'director0851@davivienda.com,subdirector0851@davivienda.com',
  '50100':'director0916@davivienda.com,subdirector0916@davivienda.com',
  '00130':'director2566@davivienda.com,subdirector2566@davivienda.com',
  '50300':'director3974@davivienda.com,subdirector3974@davivienda.com',
  '50310':'director3966@davivienda.com,subdirector3966@davivienda.com',
  '50340':'director3964@davivienda.com,subdirector3964@davivienda.com',
  '70420':'director0844@davivienda.com,subdirector0844@davivienda.com',
  '50450':'director3937@davivienda.com,subdirector3937@davivienda.com',
  '60450':'director1285@davivienda.com,subdirector1285@davivienda.com',
  '70500':'director0855@davivienda.com,subdirector0855@davivienda.com',
  '10010':'director5060@davivienda.com,subdirector5060@davivienda.com,director0760@davivienda.com,subdirector0760@davivienda.com',
  '60540':'director0119@davivienda.com,subdirector0119@davivienda.com',
  '30010':'director1366@davivienda.com,subdirector1366@davivienda.com,director0560@davivienda.com,subdirector0560@davivienda.com,director1660@davivienda.com,subdirector1660@davivienda.com,director1560@davivienda.com,subdirector1560@davivienda.com',
  '80770':'director0486@davivienda.com,subdirector0486@davivienda.com',
  '80810':'director1462@davivienda.com,subdirector1462@davivienda.com',
  '80010':'director0260@davivienda.com,subdirector0260@davivienda.com,director0460@davivienda.com,subdirector0460@davivienda.com,director4960@davivienda.com,subdirector4960@davivienda.com,director2660@davivienda.com,subdirector2660@davivienda.com',
  '60880':'director1279@davivienda.com,subdirector1279@davivienda.com',
  '50880':'director0375@davivienda.com,subdirector0375@davivienda.com',
  '50930':'director3990@davivienda.com,subdirector3990@davivienda.com',
  '61090':'director2160@davivienda.com',
  '61110':'director0164@davivienda.com,subdirector0164@davivienda.com',
  '61220':'director1375@davivienda.com,subdirector1375@davivienda.com',
  '51260':'director4625@davivienda.com,subdirector4625@davivienda.com',
  '31300':'director1364@davivienda.com,subdirector1364@davivienda.com',
  '51290':'director0385@davivienda.com,subdirector0385@davivienda.com',
  '60010':'director0160@davivienda.com,subdirector0160@davivienda.com,jumvelas@davivienda.com,director1260@davivienda.com,subdirector1260@davivienda.com',
  '51510':'director4694@davivienda.com,subdirector4694@davivienda.com',
  '32440':'damartin@davivienda.com,director0589@davivienda.com',
  '61470':'director1286@davivienda.com,subdirector1286@davivienda.com',
  '51540':'director3936@davivienda.com,subdirector3936@davivienda.com',
  '31620':'director1569@davivienda.com,subdirector1569@davivienda.com',
  '31680':'director1674@davivienda.com,subdirector1674@davivienda.com',
  '81670':'director0488@davivienda.com,subdirector0488@davivienda.com',
  '51750':'director0041@davivienda.com,subdirector0041@davivienda.com',
  '71740':'director0846@davivienda.com,subdirector0846@davivienda.com',
  '51760':'director3860@davivienda.com,subdirector3860@davivienda.com',
  '71890':'director1105@davivienda.com,subdirector1105@davivienda.com',
  '51010':'director3969@davivienda.com,subdirector3969@davivienda.com',
  '52090':'director3968@davivienda.com,subdirector3968@davivienda.com',
  '52120':'director0391@davivienda.com,subdirector0391@davivienda.com',
  '52140':'director4635@davivienda.com,subdirector4635@davivienda.com',
  '40010':'director0660@davivienda.com,subdirector0660@davivienda.com,director2360@davivienda.com,subdirector2360@davivienda.com',
  '61700':'director1262@davivienda.com,subdirector1262@davivienda.com',
  '52380':'director2460@davivienda.com,subdirector2460@davivienda.com',
  '62460':'director1287@davivienda.com,subdirector1287@davivienda.com',
  '52450':'director4759@davivienda.com,subdirector4759@davivienda.com',
  '62500':'director0148@davivienda.com,subdirector0148@davivienda.com',
  '32680':'director1662@davivienda.com,subdirector1662@davivienda.com',
  '52600':'director4634@davivienda.com,subdirector4634@davivienda.com',
  '56970':'director3981@davivienda.com,subdirector3981@davivienda.com',
  '52660':'director0363@davivienda.com,subdirector0363@davivienda.com',
  '52690':'director4504@davivienda.com,subdirector4504@davivienda.com',
  '72720':'director0858@davivienda.com,subdirector0858@davivienda.com',
  '82760':'director0462@davivienda.com,subdirector0462@davivienda.com',
  '52820':'director3972@davivienda.com,subdirector3972@davivienda.com',
  '32830':'director1676@davivienda.com,subdirector1676@davivienda.com',
  '72880':'director1166@davivienda.com,subdirector1166@davivienda.com',
  '52860':'director4621@davivienda.com,subdirector4621@davivienda.com',
  '52900':'director4060@davivienda.com,subdirector4060@davivienda.com',
  '02950':'director0674@davivienda.com,subdirector0674@davivienda.com',
  '12980':'director0773@davivienda.com,subdirector0773@davivienda.com',
  '33020':'director1374@davivienda.com,subdirector1374@davivienda.com',
  '53070':'director3560@davivienda.com,subdirector3560@davivienda.com',
  '83070':'director0422@davivienda.com,subdirector0422@davivienda.com',
  '03130':'director0915@davivienda.com,subdirector0915@davivienda.com',
  '53200':'director4670@davivienda.com,subdirector4670@davivienda.com',
  '53220':'director4697@davivienda.com,subdirector4697@davivienda.com',
  '23560':'director3460@davivienda.com,subdirector3460@davivienda.com',
  '53600':'director0365@davivienda.com,subdirector0365@davivienda.com',
  '63640':'director0134@davivienda.com,subdirector0134@davivienda.com',
  '53640':'director3985@davivienda.com,subdirector3985@davivienda.com',
  '53680':'director3992@davivienda.com,subdirector3992@davivienda.com',
  '53770':'director4626@davivienda.com,subdirector4626@davivienda.com',
  '53760':'director0315@davivienda.com,subdirector0315@davivienda.com',
  '73800':'director0850@davivienda.com,subdirector0850@davivienda.com',
  '53800':'director3919@davivienda.com,subdirector3919@davivienda.com',
  '53860':'director4680@davivienda.com,subdirector4680@davivienda.com',
  '13960':'director0772@davivienda.com,subdirector0772@davivienda.com',
  '34010':'director1381@davivienda.com,subdirector1381@davivienda.com',
  '64000':'director1064@davivienda.com,subdirector1064@davivienda.com,director3776@davivienda.com,subdirector3776@davivienda.com,director1283@davivienda.com,subdirector1283@davivienda.com',
  '34110':'director1668@davivienda.com,subdirector1668@davivienda.com',
  '34170':'director1517@davivienda.com,subdirector1517@davivienda.com',
  '54300':'director4561@davivienda.com,subdirector4561@davivienda.com',
  '34300':'director0591@davivienda.com,subdirector0591@davivienda.com',
  '70010':'director0860@davivienda.com,subdirector0860@davivienda.com,director1160@davivienda.com,subdirector1160@davivienda.com',
  '74330':'director0857@davivienda.com,subdirector0857@davivienda.com',
  '34430':'subdirector1625@davivienda.com,director1625@davivienda.com',
  '64400':'director1282@davivienda.com,subdirector1282@davivienda.com',
  '50010':'subdirector0335@davivienda.com,crestrada@davivienda.com,director1760@davivienda.com,subdirector1760@davivienda.com,director2860@davivienda.com,subdirector2860@davivienda.com',
  '34490':'director4460@davivienda.com,subdirector4460@davivienda.com',
  '54550':'director1768@davivienda.com,subdirector1768@davivienda.com,altorres@davivienda.com',
  '54690':'director1767@davivienda.com,subdirector1767@davivienda.com',
  '34700':'director1373@davivienda.com,subdirector1373@davivienda.com',
  '54730':'director4760@davivienda.com,subdirector4760@davivienda.com',
  '74860':'director0848@davivienda.com,subdirector0848@davivienda.com',
  '54880':'director1689@davivienda.com,subdirector1689@davivienda.com',
  '54910':'director1776@davivienda.com,subdirector1776@davivienda.com',
  '64970':'director0139@davivienda.com,subdirector0139@davivienda.com',
  '44980':'director2260@davivienda.com,subdirector2260@davivienda.com',
  '85000':'director0490@davivienda.com,subdirector0490@davivienda.com',
  '35040':'director1669@davivienda.com,subdirector1669@davivienda.com',
  '55130':'director4659@davivienda.com,subdirector4659@davivienda.com',
  '75130':'director0853@davivienda.com,subdirector0853@davivienda.com',
  '55160':'director4160@davivienda.com,subdirector4160@davivienda.com',
  '15240':'director0768@davivienda.com,subdirector0768@davivienda.com',
  '75240':'director0859@davivienda.com,subdirector0859@davivienda.com',
  '65200':'director0162@davivienda.com,subdirector0162@davivienda.com',
  '45180':'director0680@davivienda.com,subdirector0680@davivienda.com',
  '20010':'director1060@davivienda.com,subdirector1060@davivienda.com',
  '75410':'director0854@davivienda.com,subdirector0854@davivienda.com',
  '85470':'director0444@davivienda.com,subdirector0444@davivienda.com',
  '15510':'director0767@davivienda.com,subdirector0767@davivienda.com',
  '90010':'director1960@davivienda.com,subdirector1960@davivienda.com',
  '55790':'director0314@davivienda.com,subdirector0314@davivienda.com',
  '55720':'director1626@davivienda.com,subdirector1626@davivienda.com',
  '85730':'director0252@davivienda.com,subdirector0252@davivienda.com',
  '05680':'director0917@davivienda.com,subdirector0917@davivienda.com',
  '35940':'director1369@davivienda.com,subdirector1369@davivienda.com',
  '65940':'director1281@davivienda.com,subdirector1281@davivienda.com',
  '66060':'director0135@davivienda.com,subdirector0135@davivienda.com',
  '56150':'director3960@davivienda.com,subdirector3960@davivienda.com',
  '86150':'director0485@davivienda.com,subdirector0485@davivienda.com',
  '76140':'director0125@davivienda.com,subdirector0125@davivienda.com',
  '66220':'director0125@davivienda.com,subdirector0125@davivienda.com',
  '56310':'director0384@davivienda.com,subdirector0384@davivienda.com',
  '76530':'director0849@davivienda.com,subdirector0849@davivienda.com',
  '56420':'director3975@davivienda.com,subdirector3975@davivienda.com',
  '56460':'director1772@davivienda.com,subdirector1772@davivienda.com,yuli.rojas@davivienda.com',
  '56450':'director4681@davivienda.com,subdirector4681@davivienda.com',
  '86790':'director0479@davivienda.com,subdirector0479@davivienda.com',
  '46500':'director2567@davivienda.com,subdirector2567@davivienda.com',
  '86890':'director0481@davivienda.com,subdirector0481@davivienda.com',
  '56790':'director3977@davivienda.com,subdirector3977@davivienda.com',
  '66820':'director1275@davivienda.com,subdirector1275@davivienda.com',
  '96980':'director0118@davivienda.com,subdirector0118@davivienda.com,mcruiz@davivienda.com,leguevarah@davivienda.com',
  '66870':'director1277@davivienda.com,subdirector1277@davivienda.com',
  '17360':'director5061@davivienda.com,subdirector5061@davivienda.com',
  '67360':'director1376@davivienda.com,subdirector1376@davivienda.com',
  '57400':'director4666@davivienda.com,subdirector4666@davivienda.com',
  '00010':'director2060@davivienda.com,subdirector2060@davivienda.com,director2560@davivienda.com,subdirector2560@davivienda.com,director0960@davivienda.com,subdirector0960@davivienda.com',
  '57540':'director0023@davivienda.com,subdirector0023@davivienda.com',
  '87550':'director0480@davivienda.com,subdirector0480@davivienda.com',
  '57590':'director1860@davivienda.com,subdirector1860@davivienda.com',
  '87580':'director0297@davivienda.com,subdirector0297@davivienda.com',
  '57560':'director3971@davivienda.com,subdirector3971@davivienda.com',
  '57580':'director4631@davivienda.com,subdirector4631@davivienda.com',
  '87700':'director0489@davivienda.com,subdirector0489@davivienda.com',
  '57690':'director4593@davivienda.com,subdirector4593@davivienda.com',
  '77770':'director0847@davivienda.com',
  '17940':'director5064@davivienda.com,subdirector5064@davivienda.com',
  '57890':'director3994@davivienda.com,subdirector3994@davivienda.com',
  '54100':'director1769@davivienda.com,subdirector1769@davivienda.com',
  '57990':'director4683@davivienda.com,subdirector4683@davivienda.com',
  '58170':'director4665@davivienda.com,subdirector4665@davivienda.com',
  '68340':'director3760@davivienda.com,subdirector3760@davivienda.com',
  '28350':'director1007@davivienda.com,subdirector1007@davivienda.com',
  '28380':'director1013@davivienda.com,subdirector1013@davivienda.com',
  '38360':'director0565@davivienda.com,subdirector0565@davivienda.com',
  '58430':'director4684@davivienda.com,subdirector4684@davivienda.com',
  '58610':'director3987@davivienda.com,subdirector3987@davivienda.com',
  '68630':'director0152@davivienda.com,subdirector0152@davivienda.com',
  '58670':'director4784@davivienda.com,subdirector4784@davivienda.com',
  '54070':'director1777@davivienda.com,subdirector1777@davivienda.com',
  '78730':'director0852@davivienda.com,subdirector0852@davivienda.com',
  '48740':'director2568@davivienda.com,subdirector2568@davivienda.com',
  '58750':'director4774@davivienda.com,subdirector4774@davivienda.com',
  '58870':'director3965@davivienda.com,subdirector3965@davivienda.com',
  '68920':'director0184@davivienda.com,subdirector0184@davivienda.com',
  '68950':'director0133@davivienda.com,subdirector0133@davivienda.com',
  '58990':'director0076@davivienda.com,subdirector0076@davivienda.com',
  '68755':'director0480@davivienda.com,subdirector0480@davivienda.com',
  '68770':'director0489@davivienda.com,subdirector0489@davivienda.com',
  '17013':'director0851@davivienda.com,subdirector0851@davivienda.com',
  '68307':'director0422@davivienda.com,subdirector0422@davivienda.com',
  '76122':'director1375@davivienda.com,subdirector1375@davivienda.com',
  '25645':'harendon@davivienda.com,subdirector4681@davivienda.com',
  '68679':'director0479@davivienda.com,subdirector0479@davivienda.com',
  '20295':'yursanch@davivienda.com,subdirector0674@davivienda.com',
  '17433':'director0857@davivienda.com,subdirector0857@davivienda.com',
  '25473':'director4760@davivienda.com,subdirector4760@davivienda.com',
  '68547':'director0444@davivienda.com,subdirector0444@davivienda.com',
  '17541':'director0854@davivienda.com,subdirector0854@davivienda.com',
  '17272':'director0858@davivienda.com,subdirector0858@davivienda.com',
  '17653':'director0849@davivienda.com,subdirector0849@davivienda.com',
  '68077':'director0486@davivienda.com,subdirector0486@davivienda.com',
  '17513':'director0853@davivienda.com,subdirector0853@davivienda.com',
  '17524':'director0859@davivienda.com,subdirector0859@davivienda.com',
  '17614':'director0842@davivienda.com,subdirector0842@davivienda.com',
  '63401':'director1381@davivienda.com,subdirector1381@davivienda.com',
  '63470':'director1373@davivienda.com,subdirector1373@davivienda.com',
  '17050':'director0855@davivienda.com,subdirector0855@davivienda.com',
  '23162':'director1569@davivienda.com,subdirector1569@davivienda.com',
  '25386':'director4680@davivienda.com,subdirector4680@davivienda.com',
  '23417':'director1517@davivienda.com,subdirector1517@davivienda.com',
  '68500':'director0490@davivienda.com,subdirector0490@davivienda.com',
  '17777':'director0847@davivienda.com,subdirector0847@davivienda.com',
  '25843':'director4684@davivienda.com,subdirector4684@davivienda.com',
  '17873':'director0852@davivienda.com,subdirector0852@davivienda.com',
  '44874':'director2568@davivienda.com,subdirector2568@davivienda.com',
  '25214':'director4635@davivienda.com,subdirector4635@davivienda.com',
  '68689':'director0481@davivienda.com,subdirector0481@davivienda.com',
  '25035':'director4685@davivienda.com,subdirector4685@davivienda.com',
  '17042':'director0844@davivienda.com,subdirector0844@davivienda.com',
  '25320':'director4670@davivienda.com,subdirector4670@davivienda.com',
  '25377':'director4626@davivienda.com,subdirector4626@davivienda.com',
  '44650':'director2567@davivienda.com,subdirector2567@davivienda.com',
  '25875':'director4774@davivienda.com,subdirector4774@davivienda.com',
  '05792':'director0335@davivienda.com,subdirector0335@davivienda.com',
  '05819':'director0335@davivienda.com,subdirector0335@davivienda.com',
  '73671':'director1660@davivienda.com,subdirector1660@davivienda.com',
  '05665':'crestrada@davivienda.com,subdirector0335@davivienda.com',
  '76243':'director0160@davivienda.com,subdirector0160@davivienda.com',
  '15690':'mavarond@davivienda.com,subdirector1760@davivienda.com',
  '76890':'director0160@davivienda.com,subdirector0160@davivienda.com',
  '27001':'subdirector0335@davivienda.com,hgrisale@davivienda.com',
  '13268':'director0591@davivienda.com,subdirector0591@davivienda.com',
  '73275':'cazuniga@davivienda.com',
  '05887':'director3965@davivienda.com,subdirector3965@davivienda.com',
  '97850':'director1060@davivienda.com,subdirector1060@davivienda.com',
  '36700':'director0560@davivienda.com,subdirector0560@davivienda.com'
};

var PAGO_POR_DANE = {
  '19698':'OFICINA','05002':'OFICINA','50006':'OFICINA','05031':'OFICINA',
  '05034':'OFICINA','66045':'OFICINA','13052':'OFICINA','05059':'OFICINA',
  '73055':'OFICINA','05079':'PSE','66088':'OFICINA','76113':'OFICINA',
  '05129':'OFICINA','76001':'OFICINA','05138':'OFICINA','73148':'OFICINA',
  '05154':'OFICINA','73168':'OFICINA','15176':'OFICINA','05190':'OFICINA',
  '05101':'OFICINA','05197':'OFICINA','73200':'OFICINA','05212':'OFICINA',
  '54001':'OFICINA','15238':'OFICINA','76246':'OFICINA','05148':'PSE',
  '50251':'OFICINA','76248':'PSE','76250':'OFICINA','05541':'PSE',
  '05697':'PSE','05264':'PSE','05266':'PSE','05282':'OFICINA','05308':'PSE',
  '50313':'OFICINA','76318':'PSE','50318':'PSE','05318':'PSE',
  '73001':'OFICINA','52356':'OFICINA','05364':'OFICINA','05368':'OFICINA',
  '05376':'PSE','17380':'OFICINA','05380':'PSE','50350':'OFICINA',
  '52399':'OFICINA','66400':'OFICINA','73411':'OFICINA','54405':'PSE',
  '13430':'OFICINA','50325':'OFICINA','05440':'PSE','73443':'OFICINA',
  '05001':'OFICINA','13468':'OFICINA','15469':'OFICINA','05495':'OFICINA',
  '15491':'OFICINA','54498':'OFICINA','73504':'OFICINA','15516':'OFICINA',
  '52001':'PSE','05543':'PSE','05579':'OFICINA','15572':'OFICINA',
  '50568':'OFICINA','50573':'OFICINA','66594':'OFICINA','76606':'OFICINA',
  '05615':'OFICINA','05628':'PSE','05642':'OFICINA','15646':'OFICINA',
  '50680':'OFICINA','05656':'OFICINA','05659':'OFICINA','05660':'OFICINA',
  '05664':'OFICINA','05667':'OFICINA','05679':'OFICINA','05042':'OFICINA',
  '66687':'OFICINA','15757':'OFICINA','15759':'OFICINA','05756':'OFICINA',
  '05761':'OFICINA','81794':'OFICINA','85410':'OFICINA','76834':'OFICINA',
  '52835':'OFICINA','15001':'OFICINA','05837':'OFICINA','05854':'OFICINA',
  '05861':'OFICINA','76863':'OFICINA','76869':'OFICINA','15407':'OFICINA',
  '50001':'OFICINA','50711':'OFICINA','85001':'OFICINA','76892':'OFICINA',
  '05895':'OFICINA','62330':'OFICINA','53900':'OFICINA'
};

/** El codigo DANE como esta escrito en las tablas: cinco cifras con ceros. */
function dane5(v) {
  // normCodigo sabe deshacer una fecha, que es como vuelve el DANE cuando la
  // columna quedo con formato de fecha en la hoja
  var s = normCodigo(v, 5).replace(/[^\d]/g, '');
  if (!s) return '';
  while (s.length < 5) s = '0' + s;
  return s.slice(-5);
}

/** Los correos de la oficina de un municipio, o vacio. */
function correosDeOficina(codDane) {
  return CORREOS_OFICINA[dane5(codDane)] || '';
}

/** La forma de pago que trae el directorio, o vacio. */
function pagoDeOficina(codDane) {
  return PAGO_POR_DANE[dane5(codDane)] || '';
}

/* ---------------------------------------------------------------------------
   LA CORRIDA
   --------------------------------------------------------------------------- */

/**
 * Deja el mes listo para trabajar. Es la unica funcion que hay que correr.
 *
 * Cada paso cuenta lo que hizo y, si alguno falla, lo dice y sigue con los
 * demas: mejor quedarse a medias sabiendo donde, que no hacer nada.
 */
function prepararElMes() {
  exige('configurar');

  var l = ['SINAV · preparación del mes', ''];
  var paso = function (titulo, fn) {
    try {
      var r = fn();
      l.push(titulo, '   ' + String(r).split('\n').join('\n   '), '');
    } catch (e) {
      l.push(titulo, '   NO SE PUDO: ' + (e.message || e), '');
    }
  };

  paso('1 · Columnas y configuración', function () {
    return instalar();
  });

  paso('2 · Las obligaciones del mes', function () {
    return cargarMesVigente();
  });

  paso('3 · Los correos de las oficinas', function () {
    return cargarCorreosOficina();
  });

  paso('4 · Consecutivos de giro y formas de pago', function () {
    return cargarConcepto25();
  });

  paso('5 · Los adhesivos del mes', function () {
    if (!libro().getSheetByName(HOJA_ADHESIVOS)) {
      return 'No hay hoja ADHESIVOS. Pega ahí la hoja de correspondencia y ' +
             'corre SINAV · Mes → Repartir los adhesivos del mes.';
    }
    return repartirAdhesivos();
  });

  paso('6 · Cómo quedó', function () {
    return resumenDelMes();
  });

  registrar('', EVENTO.AVISO, 'preparación del mes ejecutada');
  var txt = l.join('\n');
  Logger.log(txt);
  return txt;
}

/**
 * Escribe los correos del directorio en PROGRAMACION y en las obligaciones
 * abiertas. No pisa un correo ya escrito: el de la hoja manda.
 */
function cargarCorreosOficina() {
  var puestos = 0, pagos = 0, enProg = 0;

  // PROGRAMACION, que es de donde heredan los meses siguientes
  var hp = libro().getSheetByName(HOJA_PROGRAMACION);
  if (hp && hp.getLastRow() > 1) {
    var cab = hp.getRange(1, 1, 1, hp.getLastColumn()).getValues()[0]
                .map(function (v) { return String(v).trim(); });
    var cDane = cab.indexOf('cod_dane');
    var cCorreo = cab.indexOf('correo_oficina');
    if (cDane >= 0 && cCorreo >= 0) {
      var n = hp.getLastRow() - 1;
      var col = hp.getRange(2, cCorreo + 1, n, 1).getValues();
      var danes = hp.getRange(2, cDane + 1, n, 1).getValues();
      for (var i = 0; i < n; i++) {
        if (String(col[i][0] || '').trim()) continue;
        var c = correosDeOficina(danes[i][0]);
        if (c) { col[i][0] = c; enProg++; }
      }
      if (enProg) hp.getRange(2, cCorreo + 1, n, 1).setValues(col);
    }
  }

  // las obligaciones que ya existen
  var ix = indices(HOJA.OBLIGACIONES);
  exigeColumna(ix, 'correo_oficina');
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var sinCorreo = {};

  filas(HOJA.OBLIGACIONES).forEach(function (f, k) {
    if (String(f[ix.estado] || '').trim().toUpperCase() === ESTADO.APROBADA) return;

    if (!String(f[ix.correo_oficina] || '').trim()) {
      var c = correosDeOficina(f[ix.cod_dane]);
      if (c) { h.getRange(k + 2, ix.correo_oficina + 1).setValue(c); puestos++; }
      else sinCorreo[dane5(f[ix.cod_dane]) + ' ' + String(f[ix.municipio])] = true;
    }
    if (!String(f[ix.forma_pago] || '').trim()) {
      var p = pagoDeOficina(f[ix.cod_dane]);
      if (p) { h.getRange(k + 2, ix.forma_pago + 1).setValue(p); pagos++; }
    }
  });

  var r = [enProg + ' correos escritos en PROGRAMACION.',
           puestos + ' correos y ' + pagos + ' formas de pago en las obligaciones abiertas.'];
  var faltan = Object.keys(sinCorreo);
  if (faltan.length) {
    r.push(faltan.length + ' municipios no están en el directorio. No quedan');
    r.push('bloqueados: el destino se arma con director<dep>@ y subdirector<dep>@.');
    faltan.sort().slice(0, 15).forEach(function (x) { r.push('   ' + x); });
    if (faltan.length > 15) r.push('   … y ' + (faltan.length - 15) + ' más');
  }
  return r.join('\n');
}

/** Cuantas obligaciones del mes estan listas para enviar y que les falta. */
function resumenDelMes() {
  var ix = indices(HOJA.OBLIGACIONES);
  var hoy = new Date();
  var anio = hoy.getFullYear(), mes = hoy.getMonth() + 1;

  var total = 0, listas = 0, motivos = {};
  filas(HOJA.OBLIGACIONES).forEach(function (f) {
    var v = f[ix.vencimiento];
    if (!venceEnElMes(v instanceof Date ? v : normFecha(v), anio, mes)) return;
    total++;

    var o = {
      estado: f[ix.estado], soporte_id: f[ix.soporte_id],
      requiere_envio: f[ix.requiere_envio], correo_oficina: f[ix.correo_oficina],
      cod_oficina: f[ix.cod_oficina], valor: f[ix.valor], adhesivo: f[ix.adhesivo]
    };
    var falta = faltaParaElCorreo(o);
    var e = puedeEnviar(o);
    if (e.ok && !falta.length) { listas++; return; }

    var k = !e.ok ? e.motivo : 'faltan datos: ' + falta.join(', ');
    motivos[k] = (motivos[k] || 0) + 1;
  });

  var l = [NOMBRE_MES[mes - 1] + ' de ' + anio + ': ' + total + ' obligaciones.',
           listas + ' están listas para enviar en cuanto tengan el soporte.'];
  if (Object.keys(motivos).length) {
    l.push('', 'Lo que falta en las demás:');
    Object.keys(motivos).sort().forEach(function (k) {
      l.push('   ' + motivos[k] + '  ' + k);
    });
  }
  return l.join('\n');
}

/* ---- menu ---------------------------------------------------------------- */

function menuArranque() {
  SpreadsheetApp.getUi().createMenu('SINAV · Preparar el mes')
    .addItem('DEJAR EL MES LISTO (todo de una vez)', 'prepararElMesDesdeMenu')
    .addSeparator()
    .addItem('Solo los correos de las oficinas', 'cargarCorreosOficinaDesdeMenu')
    .addItem('¿Cómo quedó el mes?', 'resumenDelMesDesdeMenu')
    .addSeparator()
    .addItem('Borrar obligaciones mal formadas', 'borrarObligacionesInvalidasDesdeMenu')
    .addToUi();
}

function prepararElMesDesdeMenu() { avisoLargo('Preparar el mes', prepararElMes()); }
function cargarCorreosOficinaDesdeMenu() { avisoLargo('Correos', cargarCorreosOficina()); }
function resumenDelMesDesdeMenu() { avisoLargo('Cómo quedó el mes', resumenDelMes()); }

/** Los resumenes son largos: tambien quedan en el registro de ejecuciones. */
function avisoLargo(titulo, texto) {
  var t = String(texto);
  SpreadsheetApp.getUi().alert('SINAV · ' + titulo,
    t.length > 1400 ? t.slice(0, 1400) + '\n\n[…] El texto completo está en ' +
      'Ejecuciones, en el editor.' : t,
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------------------------------------------------------------------------
   LIMPIEZA

   Si la columna del DANE en CALENDARIO quedo con formato de fecha, las
   obligaciones se crearon con una fecha por codigo y un id que no sirve.
   Esto las quita para poder volver a cargarlas bien.
   --------------------------------------------------------------------------- */

/** El id empieza por el DANE: cinco cifras. Lo que no, nacio mal. */
function idEsValido(id) {
  return /^\d{5}\|/.test(String(id || '').trim());
}

/**
 * Borra las obligaciones cuyo id no empieza por un DANE de cinco cifras.
 *
 * Solo toca las que nadie ha trabajado: en PENDIENTE, sin soporte y sin
 * correo enviado. Si alguna ya tiene trabajo encima, la deja y lo dice, para
 * que alguien decida a mano.
 */
function borrarObligacionesInvalidas() {
  exige('configurar');

  var ix = indices(HOJA.OBLIGACIONES);
  var h = libro().getSheetByName(HOJA.OBLIGACIONES);
  var todas = filas(HOJA.OBLIGACIONES);

  var aBorrar = [], conTrabajo = [];
  todas.forEach(function (f, k) {
    if (idEsValido(f[ix.id])) return;
    var tocada = String(f[ix.soporte_id] || '').trim() ||
                 String(f[ix.hilo_id] || '').trim() ||
                 String(f[ix.estado] || '').trim().toUpperCase() !== ESTADO.PENDIENTE;
    if (tocada) conTrabajo.push(String(f[ix.id]).slice(0, 40));
    else aBorrar.push(k + 2);
  });

  if (!aBorrar.length && !conTrabajo.length) {
    return 'No hay obligaciones con el id mal formado. No se borró nada.';
  }

  // de abajo hacia arriba: borrar una fila mueve las de abajo
  conCerrojo(function () {
    for (var i = aBorrar.length - 1; i >= 0; i--) h.deleteRow(aBorrar[i]);
  });

  registrar('', EVENTO.AVISO, 'borradas ' + aBorrar.length + ' obligaciones mal formadas');

  var l = [aBorrar.length + ' obligaciones con el id mal formado fueron borradas.'];
  if (conTrabajo.length) {
    l.push('', conTrabajo.length + ' NO se tocaron porque ya tienen trabajo encima');
    l.push('(soporte, envío o un estado distinto de PENDIENTE). Míralas a mano:');
    conTrabajo.slice(0, 10).forEach(function (x) { l.push('   ' + x); });
    if (conTrabajo.length > 10) l.push('   … y ' + (conTrabajo.length - 10) + ' más');
  }
  l.push('', 'Ahora vuelve a correr SINAV · Preparar el mes → DEJAR EL MES LISTO.');
  return l.join('\n');
}

function borrarObligacionesInvalidasDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('SINAV · limpiar',
    'Esto borra las obligaciones cuyo código DANE quedó como una fecha, ' +
    'siempre que nadie las haya trabajado todavía. ¿Seguir?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  avisoLargo('Limpieza', borrarObligacionesInvalidas());
}
