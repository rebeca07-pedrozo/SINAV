/**
 * Las pruebas de SINAV v3, fuera de Apps Script.
 *
 * Carga los .js de verdad y les pone delante un SpreadsheetApp de mentiras:
 * si una prueba empieza a depender de lo que diga una hoja, deja de ser una
 * prueba del codigo y pasa a ser una prueba del libro.
 *
 *   node V3.0.0/pruebas/correr.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVOS = ['ENTORNO.js', 'normalizar.js', 'codigo.js', 'cargaMes.js',
                  'yasneidy.js', 'jesus.js', 'helen.js'];

const CONFIG = {
  modo: 'PRUEBA', nombre_remitente: 'Impuestos Davivienda',
  dominio_oficinas: 'davivienda.com', egreso: '25',
  codigo_departamento: '9413', copias_fijas: 'a@x.com,b@x.com',
  dias_aviso: '7,4,2,0'
};

const preludio = `
  var SpreadsheetApp = { getActive: function () { return { getSheetByName: function () { return null; } }; } };
  var Session = { getScriptTimeZone: function () { return 'America/Bogota'; },
                  getActiveUser: function () { return { getEmail: function () { return ''; } }; } };
  var Utilities = { formatDate: function (d) { return d.toISOString().slice(0, 16).replace('T', ' '); } };
  var Logger = { log: function () {} };
  var PropertiesService = { getScriptProperties: function () { return { getProperty: function () { return ''; } }; },
                            getUserProperties: function () { return { getProperty: function () { return '0'; },
                                                                      setProperty: function () {} }; } };
  var CONFIG_PRUEBAS = ${JSON.stringify(CONFIG)};
  function config(k) { return CONFIG_PRUEBAS[k] || ''; }
`;

const codigo = ARCHIVOS.map((f) => readFileSync(join(raiz, f), 'utf8')).join('\n;\n')
  // config() lo define el preludio: aqui estorbaria
  .replace(/^function config\(clave\) \{[\s\S]*?\n\}/m, '');

/* ---- que carguen en cualquier orden ------------------------------------- */
try {
  const alReves = ARCHIVOS.slice().reverse()
    .map((f) => readFileSync(join(raiz, f), 'utf8')).join('\n;\n');
  new Function(preludio + alReves)();
} catch (e) {
  console.error('FALLA  los archivos no cargan al revés: ' + e.message);
  console.error('       Hay un `var` en el nivel superior que llama a un servicio');
  console.error('       o lee una constante de otro archivo. Conviértelo en función.');
  process.exit(1);
}
console.log('PASA  los ' + ARCHIVOS.length + ' archivos cargan en cualquier orden\n');

/* ---- las pruebas --------------------------------------------------------- */
// Las funciones declaradas dentro de un new Function son locales: no quedan
// en this. Hay que devolverlas a mano, y la lista se saca del propio codigo
// para que no haya que mantenerla.
const nombres = [...codigo.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
  .map((m) => m[1]);
const devolver = 'return {' + [...new Set(nombres)]
  .map((n) => n + ': ' + n).join(',') + '};';
const S = new Function(preludio + codigo + '\n;' + devolver)();

let pasa = 0, falla = 0;
const es = (titulo, obtenido, esperado) => {
  const a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
  if (a === b) { pasa++; console.log('PASA  ' + titulo); }
  else { falla++; console.log('FALLA ' + titulo + '\n      esperaba ' + b + ' y llegó ' + a); }
};

for (const archivo of readdirSync(join(raiz, 'pruebas')).filter((f) => f.endsWith('.mjs'))) {
  if (archivo === 'correr.mjs') continue;
  const mod = await import(join(raiz, 'pruebas', archivo));
  mod.default(S, es);
}

console.log('\n' + pasa + ' pasan, ' + falla + ' fallan');
process.exit(falla ? 1 : 0);
