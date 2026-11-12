/**
 * build.js · genera dist/, que es LO UNICO que se pega en Apps Script.
 *
 *   dist/Codigo.gs        los 15 archivos de src/*.gs unidos, en orden
 *   dist/Index.html       los 8 de src/ui/*.html unidos, con los include() ya resueltos
 *   dist/appsscript.json  el manifiesto, tal cual
 *
 * Tres archivos en vez de veinticuatro. Y como el orden de union queda fijado
 * aqui, el "ReferenceError: X is not defined" por pegar los archivos en otro
 * orden deja de ser posible.
 *
 *   node build.js
 */
const fs = require('fs');
const path = require('path');

const raiz = __dirname;
const src = path.join(raiz, 'src');
const ui = path.join(src, 'ui');
const dist = path.join(raiz, 'dist');

/* ---- el orden de los .gs ------------------------------------------------- */
// 00_Constantes va primero porque todo lo demas lee sus constantes.
// 99_Pruebas va al final porque solo se usa a mano.
/**
 * Los .gs sin numero delante salen como archivo PROPIO en dist/, no dentro de
 * Codigo.gs. Hoy solo Carga.gs: se corre cuando entra una vigencia nueva, no
 * en el dia a dia, y conviene poder borrarlo del editor sin tocar la app.
 */
const todos = fs.readdirSync(src).filter((f) => f.endsWith('.gs'));
const aparte = todos.filter((f) => !/^\d/.test(f)).sort();
const gs = todos.filter((f) => /^\d/.test(f)).sort();   // 00_, 01_, ... 99_

if (!gs.length) {
  console.error('No hay archivos .gs en src/');
  process.exit(1);
}
if (gs[0] !== '00_Constantes.gs') {
  console.error('00_Constantes.gs tiene que ir primero y quedo:', gs[0]);
  process.exit(1);
}

/* ---- el orden de los .html ---------------------------------------------- */
// Index manda: trae los demas con include(), y esos include() se resuelven aqui.
const indexSrc = path.join(ui, 'Index.html');
if (!fs.existsSync(indexSrc)) {
  console.error('Falta src/ui/Index.html');
  process.exit(1);
}

const usados = new Set(['Index.html']);
let html = fs.readFileSync(indexSrc, 'utf8')
  .replace(/<\?!=\s*include\('ui\/(\w+)'\);?\s*\?>/g, (_, nombre) => {
    const f = path.join(ui, nombre + '.html');
    if (!fs.existsSync(f)) {
      console.error('Index.html incluye ui/' + nombre + ', que no existe');
      process.exit(1);
    }
    usados.add(nombre + '.html');
    return '<!-- ===== ui/' + nombre + '.html ===== -->\n' +
           fs.readFileSync(f, 'utf8');
  });

const sueltos = fs.readdirSync(ui).filter((f) => f.endsWith('.html') && !usados.has(f));
if (sueltos.length) {
  console.error('Estos .html de src/ui no los incluye Index.html, así que no');
  console.error('entrarian al paquete:', sueltos.join(', '));
  console.error('Agregalos con <?!= include(\'ui/Nombre\'); ?> o borralos.');
  process.exit(1);
}

if (/<\?!?=?/.test(html)) {
  console.error('Quedo una plantilla sin resolver en el HTML. Revisa los include().');
  process.exit(1);
}

/* ---- escribir ------------------------------------------------------------ */
// src/ tiene una mezcla de finales de linea CRLF y LF por su historia; lo que
// se pega en el editor sale siempre con LF, para que no quede revuelto.
const soloLF = (t) => t.replace(/\r\n/g, '\n');

const aviso = (que) =>
  '// AUTOGENERADO por build.js a partir de ' + que + '.\n' +
  '// No editar a mano: edita src/ y corre `npm run build`.\n\n';

const avisoHtml = (que) =>
  '<!-- AUTOGENERADO por build.js a partir de ' + que + '.\n' +
  '     No editar a mano: edita src/ y corre `npm run build`. -->\n';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

fs.writeFileSync(
  path.join(dist, 'Codigo.gs'),
  aviso('src/*.gs') +
  soloLF(gs.map((f) => '// ═════ ' + f + ' ═════\n\n' +
                     fs.readFileSync(path.join(src, f), 'utf8')).join('\n\n')),
  'utf8'
);

fs.writeFileSync(path.join(dist, 'Index.html'),
                 avisoHtml('src/ui/*.html') + soloLF(html), 'utf8');
aparte.forEach((f) => {
  fs.writeFileSync(path.join(dist, f),
    aviso('src/' + f) + soloLF(fs.readFileSync(path.join(src, f), 'utf8')), 'utf8');
});

fs.copyFileSync(path.join(raiz, 'appsscript.json'), path.join(dist, 'appsscript.json'));

/* ---- comprobaciones ------------------------------------------------------ */
const codigo = fs.readFileSync(path.join(dist, 'Codigo.gs'), 'utf8');

// 1. que compile
try {
  new Function(codigo);
} catch (e) {
  console.error('dist/Codigo.gs no compila:', e.message);
  process.exit(1);
}

// 2. que no reviente al cargar (el fallo del orden, ya unido)
try {
  new Function(codigo + '\n;' + aparte.map((f) =>
    fs.readFileSync(path.join(src, f), 'utf8')).join('\n;\n'))();
} catch (e) {
  console.error('dist/Codigo.gs revienta al cargar:', e.message);
  console.error('Hay un `var` en el nivel superior que lee una constante de otro archivo.');
  process.exit(1);
}

// 3. que no haya dos funciones con el mismo nombre
// Al unir los archivos, una funcion repetida pisa a la otra sin avisar: en
// archivos separados tambien pasaba, pero aqui es mas facil que ocurra por
// descuido, y es el tipo de error que se descubre en produccion.
const nombres = {};
const repetidas = [];
for (const f of gs.concat(aparte)) {
  const texto = fs.readFileSync(path.join(src, f), 'utf8');
  const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(texto)) !== null) {
    if (nombres[m[1]] && nombres[m[1]] !== f) {
      repetidas.push(m[1] + ' (en ' + nombres[m[1]] + ' y en ' + f + ')');
    }
    nombres[m[1]] = f;
  }
}
if (repetidas.length) {
  console.error('Hay funciones repetidas; al unir los archivos una pisa a la otra:');
  repetidas.forEach((r) => console.error('  ' + r));
  process.exit(1);
}

// 4. que las funciones del menu esten ahi
['instalar', 'migrar', 'pruebas', 'onOpen', 'doGet'].forEach((fn) => {
  if (!new RegExp('function\\s+' + fn + '\\s*\\(').test(codigo)) {
    console.error('Falta la funcion ' + fn + '() en dist/Codigo.gs');
    process.exit(1);
  }
});

const kb = (f) => Math.round(fs.statSync(path.join(dist, f)).size / 1024) + ' KB';
console.log('dist/ listo — esto es lo que se pega en Apps Script:');
console.log('  Codigo.gs         ' + kb('Codigo.gs') + '   (' + gs.length + ' archivos de src/*.gs)');
console.log('  Index.html        ' + kb('Index.html') + '   (' + usados.size + ' archivos de src/ui/*.html)');
aparte.forEach((f) => console.log('  ' + f.padEnd(18) + kb(f) + '   (aparte, se corre una vez por vigencia)'));
console.log('  appsscript.json   ' + kb('appsscript.json'));
