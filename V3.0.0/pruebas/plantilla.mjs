/**
 * La plantilla del correo y los datos que recibe tienen que cuadrar.
 *
 * Si correos.html usa d.algo y datosDelCorreo() no lo manda, el correo sale
 * con un hueco o revienta al enviarse, y eso se descubre con la alcaldia
 * esperando. Aqui se compara una lista contra la otra.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default function (S, es) {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const html = readFileSync(join(raiz, 'correos.html'), 'utf8');

  const usadas = [...new Set([...html.matchAll(/\bd\.(\w+)/g)].map((m) => m[1]))].sort();

  const o = {
    id: 'x', municipio: 'Nilo', cod_oficina: '1689', impuesto: 'AUTORRETEICA',
    periodicidad: 'MENSUAL', periodo: '2026-10', valor: 1773000,
    nit: '8999997078', consecutivo: 'LR-10-74', adhesivo: '55622944',
    forma_pago: 'OFICINA', vencimiento: new Date(2026, 10, 24), correos: ''
  };
  const d = S.datosDelCorreo(o, 'PRODUCCION');

  const faltan = usadas.filter((k) => !(k in d));
  es('la plantilla no usa nada que no se le mande', faltan, []);

  es('un <? por cada ?>', (html.match(/<\?/g) || []).length,
     (html.match(/\?>/g) || []).length);

  // los datos que la oficina necesita para girar la plata
  es('el valor va en pesos', d.valor, '$1.773.000');
  es('la dependencia sin cero', d.dependencia, '1689');
  es('la fecha en letras', d.vencimiento, '24 de noviembre de 2026');
  es('el impuesto con su nombre largo',
     d.impuesto_largo, 'Autorretención de Industria y comercio');
  es('la vigencia sale del periodo', d.vigencia, '2026');
}
