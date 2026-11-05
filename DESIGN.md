# SINAV — decisiones visuales

Pantalla de trabajo (modo Operate), no página. Se abre todos los días, en
sesiones largas, en computador. Estilo dealt: **achromatic-ledger**, seed
162057062, kind `support`, tema claro, `--keep palette,type`.
Reimprimir con `node <skill>/scripts/draw.mjs --show`.

## El movimiento del estilo

El cromo no lleva color. Los estados y los vencimientos sí. Es exactamente la
regla del cliente: si toda la interfaz es roja, las alertas rojas desaparecen.

Presupuesto de color: por debajo del 1% de los píxeles. El único color del cromo
es el rojo de marca en el botón principal y en el logo.

## La cara del producto

- **Fondo `#f7f5f5`** — un gris con una pizca de rojo, un nivel por debajo del
  blanco y de saturación muy baja. Es el mundo del producto sin pintarlo de rojo.
- **La cadena de evidencia** — el elemento que solo tiene SINAV: cuatro marcas
  por fila (soporte · envío · respuesta · sellado) que se llenan a medida que
  entran los eventos. Es la cadena que la herramienta existe para cerrar, y se
  lee igual en las tres pestañas.
- **Tipografía Archivo** (variable, Google Fonts). Un solo grotesco para títulos,
  datos y etiquetas, con `tabular-nums` en toda cifra. Nada de Inter, Roboto ni
  Arial.

## Desvío de la marca, declarado

El estilo pide un botón principal casi negro. La marca pide el rojo Davivienda.
**Gana la marca:** `Enviar seleccionadas (N)` va en `#E30518` con texto blanco
(4,88:1). Es el único relleno de marca de la pantalla. El secundario es la
píldora gris `#e9e9e9` del estilo.

## Color

```css
/* cromo — sin color */
--fondo:     #f7f5f5;   /* el lienzo */
--superficie:#ffffff;   /* tarjetas y tabla */
--realce:    #f9f9f9;
--activo:    #ededed;   /* la píldora del ítem de navegación */
--borde:     #e8e8e8;
--regla:     #f2f2f2;   /* filas de tabla */
--control:   #d1d5db;
--tinta:     #111111;
--apagado:   #5f6368;   /* 4,5:1 sobre blanco y sobre el fondo */

/* marca — solo cromo */
--marca:        #E30518;  /* 4,88:1 — botón principal, logo */
--marca-oscura: #B00510;  /* el hover del botón */

/* estado — a propósito distintos a los de marca */
--vencido:   #B00510;   /* crítico */
--porvencer: #B06C00;
--aldia:     #1F7A4D;
--neutro:    #7A756B;
```

El naranja `#FF8D00` y el amarillo `#FFE11B` de la marca son solo relleno: 2,32:1
y 1,31:1. No llevan texto encima sobre blanco. En esta pantalla no se usan.

El verde `#1F7A4D` no está en la paleta oficial de Davivienda; lo eligió la
clienta porque hace falta un "al día" y el amarillo y el naranja ya significan
advertencia.

**Cada estado lleva su etiqueta escrita al lado.** La identidad nunca va solo por
color: las píldoras son tinta oscura sobre tinte pálido del mismo tono, con la
palabra dentro.

## Tipo

Archivo. Escala 12 / 13 / 14 / 16 / 24. Título de pantalla 24/600, un sustantivo.
Valor de tarjeta 16/600. Cuerpo y celdas 14/400. Etiquetas y meta 12. Nada por
debajo de 11px, nada por encima de 24px, ningún número a 48px.
`font-variant-numeric: tabular-nums` en cifras, fechas y códigos.

## Estructura

Shell **plano abierto**: barra lateral etiquetada de 240px sobre el propio fondo,
sin barra superior. El logo y el nombre del producto arriba; el usuario, su rol y
el aviso de modo PRUEBA abajo. Lienzo fluido, canaleta de 32px, una sola.

Pantalla ENVIAR, patrón **tarjetas de conteo que filtran**: cuatro conteos pares
sobre la lista (por enviar · sin soporte · vence en ≤4 días · vencidas), la
seleccionada con borde de 1,5px, y la tabla debajo mostrando solo ese grupo.

Radios: tarjeta 8, control 6, chip 4. Un borde o una sombra, nunca los dos; las
sombras son solo de lo que flota.

## Reglas propias

- Las filas sin soporte no se pueden seleccionar: donde iría la casilla va el
  botón "Subir soporte". Ahí está el hueco que SINAV cierra.
- Números a la derecha, tabulares, decimales fijos por métrica.
- Un cero es un cero; un dato que falta es una raya gris.
- El vencimiento lleva la fecha ISO y debajo, en gris, cuánto falta, siempre
  nombrando contra qué ("en 4 días", "hace 6 días").
- Sin rayado de filas, sin encabezados en mayúscula, sin iconos en cuadros
  tintados, sin degradados, sin emoji.

## Logo

`assets/logo-davivienda.png`, el archivo oficial, referenciado con `<img>` y su
`alt`. **No se dibuja ni se recrea.** Mientras no esté, queda un espacio
reservado del tamaño correcto con borde punteado y la palabra "logo".
