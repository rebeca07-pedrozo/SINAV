/**
 * Arma .taste-skill/mock/index.html a partir de los archivos reales de src/ui,
 * con un google.script.run de mentiras y las tres filas de prueba.
 * Sirve para ver y medir la pantalla sin desplegar en Apps Script.
 *   node tools/mock.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ui = join(raiz, 'src', 'ui');

const dia = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const filas = [
  {
    id: '76001|ICA|GENERAL|2026-B5', cod_dane: '76001', cod_oficina: '0304',
    municipio: 'Cali', impuesto: 'ICA', regimen: 'GENERAL', periodo: '2026-B5',
    periodicidad: 'BIMESTRAL', vencimiento: dia(-6), dias: -6,
    nit_municipio: '890399011',
    correo_oficina: 'oficina.granada@davivienda.com,tesoreria.cali@davivienda.com',
    responsable: 'rebeca.pedrozo@davivienda.com', tipo_presentacion: 'OFICINA',
    medio_pago: 'PSE', requiere_envio: 'SI', estado: 'LISTA', valor: 7905100,
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: true, envio: false, respuesta: false, sellado: false },
    mia: true, enviable: true, motivo_no_enviable: '', nivel: 'vencido'
  },
  {
    id: '05001|AUTORRETEICA|GENERAL|2026-11', cod_dane: '05001', cod_oficina: '0742',
    municipio: 'Medellín', impuesto: 'AUTORRETEICA', regimen: 'GENERAL',
    periodo: '2026-11', periodicidad: 'MENSUAL', vencimiento: dia(3), dias: 3,
    nit_municipio: '890905211', correo_oficina: 'oficina.poblado@davivienda.com',
    responsable: 'rebeca.pedrozo@davivienda.com', tipo_presentacion: 'OFICINA',
    medio_pago: 'PAGADURIA', requiere_envio: 'SI', estado: 'PENDIENTE', valor: 1230000,
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: false, envio: false, respuesta: false, sellado: false },
    mia: true, enviable: false, motivo_no_enviable: 'sin soporte', nivel: 'porvencer'
  },
  {
    id: '11001|RETEICA|GENERAL|2026-11', cod_dane: '11001', cod_oficina: '0851',
    municipio: 'Bogotá D.C.', impuesto: 'RETEICA', regimen: 'GENERAL',
    periodo: '2026-11', periodicidad: 'MENSUAL', vencimiento: dia(12), dias: 12,
    nit_municipio: '899999061', correo_oficina: 'oficina.chapinero@davivienda.com',
    responsable: 'rebeca.pedrozo@davivienda.com', tipo_presentacion: 'OFICINA',
    medio_pago: 'OFICINA', requiere_envio: 'SI', estado: 'LISTA', valor: 4820350,
    nota: '', reprocesos: 0, motivo_devuelta: '', fecha_envio: '', fecha_respuesta: '',
    cadena: { soporte: true, envio: false, respuesta: false, sellado: false },
    mia: true, enviable: true, motivo_no_enviable: '', nivel: 'neutro'
  }
];

// los conteos salen de las filas, no se escriben a mano
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
    correo: 'rebeca.pedrozo@davivienda.com', nombre: 'Rebeca Pedrozo',
    rol: 'ADMIN', activo: true,
    puedeAsignar: true, puedeRevisar: true, puedeConfigurar: true
  },
  config: { modo: 'PRUEBA', nombre_remitente: 'Impuestos Davivienda', dias_aviso: '10,4,2,0' },
  cuota: { usada: 0, tope: 1500 },
  filas, conteos, generado: ahora
};

const stub = `<script>
/* google.script.run de mentiras, solo para ver la pantalla fuera de Apps Script */
const INICIO = ${JSON.stringify(inicio, null, 2)};
window.google = { script: { run: (function () {
  const api = {
    apiInicio: () => INICIO,
    apiLogo: () => '',
    apiListaEnviar: () => ({ filas: INICIO.filas, conteos: INICIO.conteos,
                             cuota: INICIO.cuota, generado: INICIO.generado }),
    apiSubirSoporte: () => ({ ok: true }),
    apiEnviar: (ids) => ({ enviadas: ids.map((id) => ({ id })), rechazadas: [],
                           pendientes: [], modo: 'PRUEBA',
                           cuota: { usada: ids.length, tope: 1500 } })
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
// el stub tiene que existir antes de que corra App
doc = doc.replace('<div id="raiz"></div>', '<div id="raiz"></div>\n  ' + stub);

const salida = join(raiz, '.taste-skill', 'mock');
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'index.html'), doc, 'utf8');
console.log('escrito ' + join(salida, 'index.html'));
