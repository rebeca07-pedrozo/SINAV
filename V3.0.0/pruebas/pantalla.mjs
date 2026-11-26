/**
 * La pantalla, de verdad, en un navegador.
 *
 * Una pagina en blanco no da error en ningun lado: hay que abrirla y mirar.
 * Aqui se monta pagina.html con un google.script.run de mentiras, se carga en
 * Chromium y se comprueba que pinte, que los campos esten y que no haya un
 * solo error en consola.
 *
 * Se corre aparte:  node V3.0.0/pruebas/pantalla.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
// playwright esta instalado en el sistema, no en el proyecto
const { chromium } = createRequire('/opt/node-tools/')('playwright');

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = '/tmp/claude-0/-home-user-sinav/187277aa-4453-5fa1-8f3d-33b963eed9f8/scratchpad';
const LIBS = SALIDA + '/mmd/node_modules';

const fila = (e) => Object.assign({
  id: '05001|ICA|2026-11', cod_dane: '05001', municipio: 'Medellín',
  impuesto: 'ICA', periodicidad: 'MENSUAL', periodo: '2026-11',
  vencimiento: '2026-11-28', dias: 3, nit: '890905211', cod_oficina: '0742',
  correos: 'director742@davivienda.com', destinatarios: 'director742@davivienda.com',
  pide_correo: false, forma_pago: 'OFICINA', consecutivo: 'LR-11-01',
  adhesivo: '55285300', valor: 1230000, estado: 'LISTA', soportes: 1,
  soporte_revisado: false, enviable: true, motivo: '', falta: [],
  tiene_envio: false, tiene_sellado: false, fecha_envio: '', fecha_respuesta: '',
  nota: '', nivel: 'porvencer'
}, e);

const INICIO = {
  yo: { correo: 'yasneidy.ramirez@davivienda.com', nombre: 'Yasneidy Ramirez',
        perfil: 'PROFESIONAL-I', supervisa: false },
  modo: 'PRUEBA',
  filas: [
    fila({}),
    fila({ id: '19698|RETEICA|2026-11', municipio: 'Santander de Quilichao',
           impuesto: 'RETEICA', cod_dane: '19698', cod_oficina: '0118',
           valor: null, falta: ['valor liquidado'], enviable: true }),
    fila({ id: '13001|ICA|2026-B6', municipio: 'Cartagena', cod_dane: '13001',
           periodo: '2026-B6', periodicidad: 'BIMESTRAL', estado: 'PENDIENTE',
           soportes: 0, enviable: false, motivo: 'pendiente cargar el soporte',
           correos: '', destinatarios: '', pide_correo: true, cod_oficina: '' }),
    fila({ id: '76001|ICA|2026-11', municipio: 'Cali', cod_dane: '76001',
           estado: 'ENVIADA', tiene_envio: true, tiene_sellado: true,
           fecha_respuesta: '2026-11-26 10:10', enviable: false,
           motivo: 'en estado ENVIADA. El envío solo procede desde LISTA' })
  ],
  conteos: {}, cuota: { usada: 12, tope: 1400 }, logo: '',
  generado: '2026-11-26 15:00'
};

const RESPUESTAS = {
  apiInicio: INICIO,
  apiLista: { filas: INICIO.filas, conteos: {}, cuota: INICIO.cuota },
  apiGuardarValor: { id: 'x' },
  apiGuardarCorreo: { id: 'x' },
  apiSoportesParaRevisar: { soportes: [{
    id: '05001|ICA|2026-11', soporte_id: 'S1', municipio: 'Medellín',
    impuesto: 'ICA', periodo: '2026-11', vencimiento: '2026-11-28',
    cod_oficina: '0742', nit: '890905211', valor_texto: '$1.230.000',
    consecutivo: 'LR-11-01', adhesivo: '55285300', forma_pago: 'OFICINA',
    destinatarios: 'director742@davivienda.com', copias_cuantas: 7,
    nombre: 'Medellín ICA 2026-11.pdf', peso_kb: 142, cual: 1, de: 1,
    vista: '', enlace: '#', revisado: false
  }] },
  apiMarcarSoporte: { id: 'x', revisado: true },
  apiEnviar: { enviadas: [{ id: 'x' }], rechazadas: [], pendientes: [],
               modo: 'PRUEBA', cuota: { usada: 13, tope: 1400 } },
  apiRevisarRespuestas: { con_respuesta: 1, con_sellado: 1, pendientes: 0, errores: [] }
};

const stub = `<script>
window.google = { script: { run: new Proxy({}, {
  get: (_, fn) => {
    if (fn === 'withSuccessHandler') return (ok) => { window.__ok = ok; return google.script.run; };
    if (fn === 'withFailureHandler') return () => google.script.run;
    return (...a) => setTimeout(() => window.__ok(
      JSON.parse(JSON.stringify(${JSON.stringify(RESPUESTAS)}))[fn] || {}), 10);
  }
}) } };
</script>`;

let doc = readFileSync(join(raiz, 'pagina.html'), 'utf8')
  .replace('https://unpkg.com/react@18.3.1/umd/react.production.min.js',
           'file://' + LIBS + '/react/umd/react.development.js')
  .replace('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
           'file://' + LIBS + '/react-dom/umd/react-dom.development.js')
  .replace('https://unpkg.com/htm@3.1.1/dist/htm.umd.js',
           'file://' + LIBS + '/htm/dist/htm.umd.js')
  .replace('<div id="raiz"></div>', () => stub + '\n<div id="raiz"></div>');

const archivo = SALIDA + '/pagina-prueba.html';
writeFileSync(archivo, doc, 'utf8');

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
const graves = [];
pg.on('pageerror', (e) => graves.push(e.message));
pg.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  // React en su version de DESARROLLO avisa de `class` en vez de `className`.
  // Las clases se aplican igual —esta prueba las encuentra por selector— y la
  // version de produccion, que es la que carga Apps Script, no dice nada.
  // Cualquier otro error si cuenta.
  if (/Invalid DOM property/.test(t)) return;
  graves.push('CONSOLA: ' + t.slice(0, 200));
});

await pg.goto('file://' + archivo);
await pg.waitForTimeout(1500);

let pasa = 0, falla = 0;
const es = (t, a, b2) => {
  if (JSON.stringify(a) === JSON.stringify(b2)) { pasa++; console.log('PASA  ' + t); }
  else { falla++; console.log('FALLA ' + t + '\n      esperaba ' + JSON.stringify(b2) +
                              ' y llegó ' + JSON.stringify(a)); }
};

es('la página pinta', await pg.locator('table tbody tr').count(), 4);
es('sin errores en consola', graves, []);
es('sale el aviso de modo prueba',
   (await pg.textContent('.aviso')).indexOf('Ambiente de pruebas') >= 0, true);
es('hay un campo de valor por fila', await pg.locator('input.entrada').count() >= 4, true);
es('el que no tiene correo lo pide',
   await pg.locator('button', { hasText: 'Guardar correo' }).count(), 1);
es('solo se pueden seleccionar las completas',
   await pg.locator('tbody input[type=checkbox]:not(:disabled)').count(), 1);

await pg.locator('tbody input[type=checkbox]:not(:disabled)').first().check();
await pg.locator('button', { hasText: /Enviar seleccionadas/ }).click();
await pg.waitForTimeout(600);
es('la ventana de envío abre', await pg.locator('.modal').isVisible(), true);
es('con los datos al lado', (await pg.locator('.ficha').allTextContents()).length, 7);
es('y el consecutivo entre ellos',
   (await pg.locator('.ficha').allTextContents()).some((t) => t.indexOf('LR-11-01') >= 0), true);

await pg.screenshot({ path: SALIDA + '/v3-envio.png' });
await pg.locator('button', { hasText: 'El documento es correcto' }).click();
await pg.waitForTimeout(400);
await pg.locator('button', { hasText: /Autorizar el envío/ }).click();
await pg.waitForTimeout(800);
es('al autorizar, se envía', (await pg.textContent('main')).indexOf('comunicaciones enviadas') > 0, true);

await pg.locator('.nav button', { hasText: 'Respuestas' }).click();
await pg.waitForTimeout(400);
es('la pestaña de respuestas pinta', await pg.locator('table tbody tr').count(), 1);
await pg.screenshot({ path: SALIDA + '/v3-lista.png', fullPage: false });

console.log('\n' + pasa + ' pasan, ' + falla + ' fallan');
await b.close();
process.exit(falla ? 1 : 0);
