/**
 * Corre src/99_Pruebas.gs en node, sin Apps Script.
 * Solo carga los archivos de funciones puras, que son los que se prueban.
 *   node tools/pruebas.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const archivos = ['00_Constantes.gs', '03_Roles.gs', '04_Normalizar.gs',
                 '06_Estados.gs', '09_Enviar.gs', '15_Carga.gs',
                 '16_Metricas.gs',
                 '20_Ausencias.gs', 'Carga.gs', '99_Pruebas.gs'];

const codigo = archivos
  .map((f) => readFileSync(join(raiz, 'src', f), 'utf8'))
  .join('\n;\n');

/**
 * En Apps Script el orden de los archivos NO esta garantizado: el editor los
 * carga en el orden en que aparecen en la lista, que es el orden en que se
 * crearon. Un `var` en el nivel superior que lea una constante de otro archivo
 * revienta todo el proyecto si ese otro archivo carga despues, con un
 * "ReferenceError: X is not defined" que no dice cual es el archivo culpable.
 *
 * Ya paso una vez: 07_Obligaciones tenia ESTADOS_POR_ENVIAR leyendo ESTADO de
 * 00_Constantes en el nivel superior.
 *
 * Esta comprobacion carga TODOS los .gs al reves. Si alguno vuelve a depender
 * del orden, falla aqui y no en el editor de alguien.
 */
function comprobarOrdenDeCarga() {
  const todos = readdirSync(join(raiz, 'src'))
    .filter((f) => f.endsWith('.gs'))
    .sort()
    .reverse();

  const alReves = todos
    .map((f) => readFileSync(join(raiz, 'src', f), 'utf8'))
    .join('\n;\n');

  try {
    new Function(alReves)();
    return { ok: true, orden: todos.length };
  } catch (e) {
    return { ok: false, mensaje: e.message, orden: todos.length };
  }
}

const orden = comprobarOrdenDeCarga();
if (!orden.ok) {
  console.error('FALLA  los ' + orden.orden + ' archivos .gs no cargan en orden inverso');
  console.error('       ' + orden.mensaje);
  console.error('');
  console.error('       Hay un `var` en el nivel superior de algun archivo que lee una');
  console.error('       constante de otro. En Apps Script eso revienta si los archivos');
  console.error('       quedan en otro orden. Conviertelo en funcion.');
  process.exit(1);
}
console.log('PASA  los ' + orden.orden + ' archivos .gs cargan en cualquier orden\n');

const correr = new Function(codigo + '\n;return pruebas();');
const r = correr();

console.log(r.resumen);
process.exit(r.falla ? 1 : 0);
