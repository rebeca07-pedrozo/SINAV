/**
 * Corre src/99_Pruebas.gs en node, sin Apps Script.
 * Solo carga los archivos de funciones puras, que son los que se prueban.
 *   node tools/pruebas.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const archivos = ['00_Constantes.gs', '04_Normalizar.gs', '06_Estados.gs', '99_Pruebas.gs'];

const codigo = archivos
  .map((f) => readFileSync(join(raiz, 'src', f), 'utf8'))
  .join('\n;\n');

const correr = new Function(codigo + '\n;return pruebas();');
const r = correr();

console.log(r.resumen);
process.exit(r.falla ? 1 : 0);
