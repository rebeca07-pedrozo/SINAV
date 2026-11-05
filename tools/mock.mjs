/**
 * Arma .taste-skill/mock/index.html a partir de los archivos reales de src/ui,
 * con un google.script.run de mentiras.
 * Sirve para ver y medir las pantallas sin desplegar en Apps Script.
 *   node tools/mock.mjs
 *
 * Las respuestas del stub NO se escriben a mano: se calculan aqui con las
 * mismas funciones puras del servidor (agruparMetricas, apiCamposOpciones,
 * leerNombreArchivo, emparejarArchivo). Asi el mock no puede quedar diciendo
 * una cosa distinta de la que dira Apps Script.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ui = join(raiz, 'src', 'ui');

/* ---- las funciones puras del servidor, cargadas de verdad ---------------- */
const puros = ['00_Constantes', '03_Roles', '04_Normalizar', '06_Estados',
               '14_Campos', '15_Carga', '16_Metricas'];
const codigo = puros.map((f) => readFileSync(join(raiz, 'src', f + '.gs'), 'utf8'))
  .join('\n;\n');
const S = new Function(codigo +
  '\n;return { agruparMetricas, apiCamposOpciones, leerNombreArchivo,' +
  ' emparejarArchivo, ESTADO, ESTADOS_ADMITEN_SOPORTE };')();

const dia = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const yoCorreo = 'rebeca.pedrozo@davivienda.com';

const filas = [
  {
    id: '76001|ICA|GENERAL|2026-B5', cod_dane: '76001', cod_oficina: '0304',
    municipio: 'Cali', impuesto: 'ICA', regimen: 'GENERAL', periodo: '2026-B5',
    periodicidad: 'BIMESTRAL', vencimiento: dia(-6), dias: -6,
    nit_municipio: '890399011',
    correo_oficina: 'oficina.granada@davivienda.com,tesoreria.cali@davivienda.com',
    responsable: yoCorreo, tipo_presentacion: 'VIRTUAL',
    paga_quien: 'OFICINA', forma_pago: 'PSE', requiere_envio: 'SI',
    exogena: 'NO', incluye_retencion: 'NO', presentacion_fecha: '',
    revision_fecha: '', revision_por: '',
    estado: 'LISTA', valor: 7905100,
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: true, envio: false, respuesta: false, sellado: false },
    mia: true, enviable: true, motivo_no_enviable: '', nivel: 'vencido'
  },
  {
    id: '05001|AUTORRETEICA|GENERAL|2026-11', cod_dane: '05001', cod_oficina: '0742',
    municipio: 'Medellín', impuesto: 'AUTORRETEICA', regimen: 'GENERAL',
    periodo: '2026-11', periodicidad: 'MENSUAL', vencimiento: dia(3), dias: 3,
    nit_municipio: '890905211', correo_oficina: 'oficina.poblado@davivienda.com',
    responsable: yoCorreo, tipo_presentacion: 'OFICINA',
    paga_quien: 'PAGADURIA', forma_pago: '', requiere_envio: 'SI',
    exogena: 'NO', incluye_retencion: 'SI', presentacion_fecha: '',
    revision_fecha: '', revision_por: '',
    estado: 'PENDIENTE', valor: '',
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: false, envio: false, respuesta: false, sellado: false },
    mia: true, enviable: false, motivo_no_enviable: 'sin soporte', nivel: 'porvencer'
  },
  {
    id: '11001|RETEICA|GENERAL|2026-11', cod_dane: '11001', cod_oficina: '0851',
    municipio: 'Bogotá D.C.', impuesto: 'RETEICA', regimen: 'GENERAL',
    periodo: '2026-11', periodicidad: 'MENSUAL', vencimiento: dia(12), dias: 12,
    nit_municipio: '899999061', correo_oficina: 'oficina.chapinero@davivienda.com',
    responsable: yoCorreo, tipo_presentacion: 'OFICINA',
    paga_quien: 'OFICINA', forma_pago: 'TRANSFERENCIA', requiere_envio: 'REVISAR',
    exogena: 'SI', incluye_retencion: 'NO', presentacion_fecha: '',
    revision_fecha: dia(-1), revision_por: 'elizabeth@davivienda.com',
    estado: 'RESPONDIDA', valor: 4820350,
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: true, envio: true, respuesta: true, sellado: false },
    mia: true, enviable: false, motivo_no_enviable: 'el estado es RESPONDIDA, no LISTA',
    nivel: 'aldia'
  }
];

const conteos = filas.reduce((c, o) => {
  c.todas++;
  if (!o.cadena.soporte) c.sin_soporte++;
  if (o.dias !== null && o.dias < 0) c.vencidas++;
  else if (o.dias !== null && o.dias <= 4) c.por_vencer++;
  if (o.enviable) c.listas++;
  return c;
}, { todas: 0, sin_soporte: 0, por_vencer: 0, vencidas: 0, listas: 0 });

const ahora = new Date().toISOString().slice(0, 16).replace('T', ' ');

const inicio = {
  yo: {
    correo: yoCorreo, nombre: 'Rebeca Pedrozo',
    rol: 'ADMIN', area: 'MUNICIPALES', nivel: '',
    perfil: 'Admin de municipales', activo: true,
    puedeAsignar: true, puedeRevisar: true, puedeConfigurar: true,
    puedeVerMetricas: true
  },
  config: { modo: 'PRUEBA', nombre_remitente: 'Impuestos Davivienda', dias_aviso: '10,4,2,0' },
  cuota: { usada: 0, tope: 1500 },
  filas: filas.filter((o) => o.requiere_envio === 'SI' &&
    ['PENDIENTE', 'LISTA', 'DEVUELTA', 'REBOTADO'].indexOf(o.estado) >= 0),
  conteos, generado: ahora
};
inicio.conteos = inicio.filas.reduce((c, o) => {
  c.todas++;
  if (!o.cadena.soporte) c.sin_soporte++;
  if (o.dias !== null && o.dias < 0) c.vencidas++;
  else if (o.dias !== null && o.dias <= 4) c.por_vencer++;
  if (o.enviable) c.listas++;
  return c;
}, { todas: 0, sin_soporte: 0, por_vencer: 0, vencidas: 0, listas: 0 });

/* ---- lo que devuelven las pantallas nuevas, calculado de verdad ---------- */

const conFaltan = filas
  .filter((o) => o.estado !== 'APROBADA')
  .map((o) => {
    const faltan = [];
    if (!o.valor) faltan.push('valor');
    if (!o.forma_pago) faltan.push('forma de pago');
    if (o.requiere_envio === 'REVISAR') faltan.push('si se envía');
    if (!o.periodicidad) faltan.push('periodicidad');
    return Object.assign({}, o, { faltan });
  })
  .sort((a, b) => b.faltan.length - a.faltan.length ||
    (a.dias === null ? 9999 : a.dias) - (b.dias === null ? 9999 : b.dias));

const listaCampos = {
  filas: conFaltan,
  opciones: S.apiCamposOpciones(),
  resumen: {
    todas: conFaltan.length,
    incompletas: conFaltan.filter((o) => o.faltan.length).length,
    sin_valor: conFaltan.filter((o) => !o.valor).length,
    por_revisar: conFaltan.filter((o) => o.requiere_envio === 'REVISAR').length
  },
  generado: ahora
};

const periodosCarga = Object.entries(
  filas.reduce((m, o) => { m[o.periodo] = (m[o.periodo] || 0) + 1; return m; }, {})
).sort().reverse().map(([periodo, cuantas]) => ({ periodo, cuantas }));

/** El plan de carga, con el mismo emparejador del servidor. */
function planDe(periodo, nombres) {
  const candidatas = filas
    .filter((o) => o.periodo === periodo)
    .map((o) => ({
      id: o.id, cod_dane: o.cod_dane, cod_oficina: o.cod_oficina,
      municipio: o.municipio, impuesto: o.impuesto, regimen: o.regimen,
      periodo: o.periodo, estado: o.estado, vencimiento: o.vencimiento,
      dias: o.dias, tiene_soporte: o.cadena.soporte,
      admite: S.ESTADOS_ADMITEN_SOPORTE.indexOf(o.estado) >= 0,
      responsable: o.responsable, mia: o.mia
    }));
  const admitidas = candidatas.filter((o) => o.admite);
  const usados = {};
  const plan = nombres.map((n) => {
    const leido = S.leerNombreArchivo(n);
    let m = S.emparejarArchivo(leido, admitidas);
    if (m.estado === 'listo' && usados[m.id]) {
      m = { estado: 'varios', id: '', opciones: m.opciones,
            motivo: 'Otro archivo del lote ya apunta a esta obligación.' };
    }
    if (m.estado === 'listo') usados[m.id] = true;
    return { archivo: n, leido, estado: m.estado, id: m.id,
             opciones: m.opciones, motivo: m.motivo,
             aviso: leido.periodo && leido.periodo !== periodo
               ? 'El nombre dice ' + leido.periodo + ' y estás cargando ' + periodo + '.'
               : '' };
  });
  return {
    periodo, plan, candidatas,
    resumen: {
      archivos: plan.length,
      listos: plan.filter((x) => x.estado === 'listo').length,
      varios: plan.filter((x) => x.estado === 'varios').length,
      ninguno: plan.filter((x) => x.estado === 'ninguno').length,
      sin_soporte: admitidas.filter((o) => !o.tiene_soporte).length,
      candidatas: candidatas.length
    }
  };
}

const periodos = [...new Set(filas.map((o) => o.periodo))].sort().reverse();
const metricasPorPeriodo = { '': S.agruparMetricas(filas) };
periodos.forEach((p) => {
  metricasPorPeriodo[p] = S.agruparMetricas(filas.filter((o) => o.periodo === p));
});

/* ---- el stub ------------------------------------------------------------- */

const datos = {
  INICIO: inicio,
  LISTA_CAMPOS: listaCampos,
  PERIODOS_CARGA: periodosCarga,
  PERIODOS: periodos,
  METRICAS: metricasPorPeriodo,
  // un lote de ejemplo, para poder ver la pantalla de carga sin tocar un archivo
  PLAN_EJEMPLO: planDe('2026-11', [
    '0742 AUTORRETEICA 2026-11.pdf',
    '0851 RETEICA 2026-11.pdf',
    'declaracion firmada.pdf',
    '9999 ICA 2026-11.pdf'
  ]),
  AHORA: ahora
};

const stub = `<script>
/* google.script.run de mentiras, solo para ver las pantallas fuera de Apps Script */
const D = ${JSON.stringify(datos, null, 2)};
window.google = { script: { run: (function () {
  const api = {
    apiInicio: () => D.INICIO,
    apiLogo: () => '',
    apiListaEnviar: () => ({ filas: D.INICIO.filas, conteos: D.INICIO.conteos,
                             cuota: D.INICIO.cuota, generado: D.INICIO.generado }),
    apiSubirSoporte: () => ({ ok: true }),
    apiEnviar: (ids) => ({ enviadas: ids.map((id) => ({ id })), rechazadas: [],
                           pendientes: [], modo: 'PRUEBA',
                           cuota: { usada: ids.length, tope: 1500 } }),
    apiListaCampos: () => D.LISTA_CAMPOS,
    apiCamposOpciones: () => D.LISTA_CAMPOS.opciones,
    apiGuardarCampos: (id, campos) => ({
      id, cambios: Object.keys(campos || {}).length,
      detalle: Object.keys(campos || {}).join(', ') + ' (mock: no se guardó nada)' }),
    apiPeriodosCarga: () => D.PERIODOS_CARGA,
    // OJO: el mock devuelve siempre el mismo plan, sin mirar los nombres que
    // le pasen. Sirve para ver la pantalla; el emparejamiento de verdad lo
    // calcula el servidor y lo cubren las pruebas de leerNombreArchivo y
    // emparejarArchivo en 99_Pruebas.gs.
    apiCargaPlan: () => D.PLAN_EJEMPLO,
    apiMetricas: (p) => ({ periodo: p || '', periodos: D.PERIODOS,
                           metricas: D.METRICAS[p || ''] || D.METRICAS[''],
                           generado: D.AHORA })
  };
  // como el de verdad: cada llamada lleva sus propios manejadores
  function corredor(exito, falla) {
    const c = {
      withSuccessHandler: (f) => corredor(f, falla),
      withFailureHandler: (f) => corredor(exito, f)
    };
    Object.keys(api).forEach((k) => {
      c[k] = (...args) => setTimeout(() => {
        try { exito && exito(api[k](...args)); }
        catch (e) { falla && falla(e); }
      }, 60);
    });
    return c;
  }
  return corredor(null, null);
})() } };
<\/script>`;

let doc = readFileSync(join(ui, 'Index.html'), 'utf8');
doc = doc.replace(/<\?!=\s*include\('ui\/(\w+)'\);?\s*\?>/g,
  (_, n) => readFileSync(join(ui, n + '.html'), 'utf8'));
doc = doc.replace('<div id="raiz"></div>', '<div id="raiz"></div>\n  ' + stub);

const salida = join(raiz, '.taste-skill', 'mock');
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'index.html'), doc, 'utf8');
console.log('escrito ' + join(salida, 'index.html'));
