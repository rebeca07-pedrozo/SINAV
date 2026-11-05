# SINAV

Control de obligaciones tributarias territoriales · Departamento de Impuestos,
Banco Davivienda. Google Sheets + Apps Script + una aplicación web.

Contexto de producto en [PRODUCT.md](PRODUCT.md). Decisiones visuales en
[DESIGN.md](DESIGN.md).

---

## Poner esto a andar

Abre el Sheets **SINAV** → Extensiones → Apps Script. El script tiene que quedar
enlazado a ese archivo, no suelto, para que `SpreadsheetApp.getActive()` funcione
sin ids.

En el editor, crea los archivos con estos nombres exactos y pega el contenido de
`src/`. Los `.gs` van sin extensión; los de `ui/` van como HTML y el nombre
lleva la barra:

| En el editor | En este repo |
|---|---|
| `00_Constantes` … `99_Pruebas` | `src/*.gs` |
| `ui/Index`, `ui/Estilos`, `ui/Comun`, `ui/Enviar`, `ui/App` | `src/ui/*.html` |
| `appsscript.json` | `appsscript.json` (activa "Mostrar archivo de manifiesto" en Configuración) |

Corre `instalar()` una vez y autoriza los permisos. Crea las cuatro hojas con sus
encabezados, las carpetas `SINAV/Soportes` y `SINAV/Sellados` en tu Drive, te
inscribe como ADMIN, deja `modo = PRUEBA` y mete tres filas de prueba. Correrlo
otra vez no duplica nada.

Después queda también el menú **SINAV** dentro del Sheets, con "Instalar /
verificar" y "Correr pruebas".

### Desplegar la aplicación web

Implementar → Nueva implementación → Aplicación web:

- **Ejecutar como:** `Usuario que accede a la aplicación web` ← esto no es opcional
- **Quién tiene acceso:** `Cualquier usuario de Banco Davivienda`

Es lo que hace que el correo salga de la cuenta de quien envía y que la respuesta
vuelva a SU bandeja. Como consecuencia, **todos necesitan permiso de edición
sobre el libro**: el control de roles lo hace el servidor contra la hoja USUARIOS
(ver §5 del encargo), no los permisos del archivo.

Cada persona entra una vez al enlace y autoriza. Su cuota de Gmail y, más
adelante, sus disparadores, son suyos.

---

## Las pruebas

```
node tools/pruebas.mjs
```

84 aserciones sobre las dos reglas donde un error silencioso se propaga: la
normalización de periodicidad y "sin soporte no hay envío". Son funciones puras,
así que corren igual en node y dentro de Apps Script (menú SINAV → Correr
pruebas, o la función `pruebas()`).

Ya encontraron dos errores reales: `normValor('$ 4.820.350')` devolvía vacío
porque leía los puntos de mil como decimales, y `armarId` no rellenaba el código
DANE a cinco dígitos.

## Ver la interfaz sin desplegar

```
node tools/mock.mjs      # arma .taste-skill/mock/index.html con las 3 filas
```

Usa los archivos reales de `src/ui` con un `google.script.run` de mentiras.
Sirve para abrir la pantalla en el navegador y para medirla:

```
node <skill>/scripts/inspect.mjs --app .taste-skill/mock/index.html
```

---

## Cómo está armado

```
src/
  00_Constantes   esquemas de las hojas, estados, transiciones, permisos
  01_Instalar     instalar() idempotente + el menú del Sheets
  02_Hojas        lectura y escritura en bloque, LockService, config()
  03_Roles        yo(), puede(), exige() — el rol se resuelve aquí y solo aquí
  04_Normalizar   funciones puras: periodicidad, periodo, códigos, correos, valor
  05_Eventos      el log append-only
  06_Estados      puedePasar(), puedeEnviar(), validarPaso(), aplicar()
  07_Obligaciones listar filtrado por rol, conteos, apiInicio()
  08_Soportes     subir el adjunto a Drive y pasar a LISTA
  09_Enviar       Gmail, hilo_id, cuota por persona, lotes con guardia de tiempo
  10_WebApp       doGet, include()
  99_Pruebas      pruebas()
  ui/             Index, Estilos, Comun, Enviar, App
```

En Apps Script todo vive en un solo ámbito global, así que el orden de los
archivos no importa: ninguno ejecuta nada al cargarse.

### Lo que falta (en orden)

1. **RESPUESTAS** — `11_Respuestas.gs` + `ui/Respuestas.html`. Busca sobre el
   `hilo_id` guardado al enviar, con `GmailApp.search` acotado a la etiqueta
   `SINAV`. Ahí entran también los disparadores por persona (`13_Disparadores.gs`)
   y el botón "Revisar respuestas ahora".
2. **ALERTAS** — `12_Alertas.gs` + `ui/Alertas.html`.
3. **Asignación** (JEFE) y **Configuración** (ADMIN). Las pestañas ya están en la
   navegación, con su marco y una línea que dice qué va a ir ahí.

### Si algún día quieren un build de verdad

El camino es **Vite + clasp**: el código de `src/ui` pasa a módulos, Vite arma un
bundle y `clasp push` lo sube. Hoy no, por el plazo: React 18 + htm desde CDN no
necesita compilar nada y se pega directo en el editor.

---

## Decisiones que conviene no deshacer

- **`modo = PRUEBA`** manda todos los correos al propio usuario. Es el valor por
  defecto y el código nunca lo cambia. Para producción se edita a mano en CONFIG.
- **El `hilo_id` se guarda en el envío**, buscando el hilo por una marca ASCII en
  el asunto (`SINAV-05001-RETEICA-GENERAL-2026-09`) con `in:sent`. Si no lo
  encuentra, la fila queda sin `hilo_id` y se escribe un ERROR en EVENTOS, porque
  sin eso la respuesta no se detecta sola.
- **Sin soporte no hay envío**, en dos puntos: no se puede llegar a `LISTA` sin
  `soporte_id`, y `apiEnviar` vuelve a verificarlo antes de cada correo. En la
  interfaz la casilla de esas filas está apagada.
- **Los códigos son texto.** `cod_dane`, `cod_oficina`, `periodo`, `nit_municipio`,
  `soporte_id`, `hilo_id` y `sellado_id` tienen formato `@` en la hoja.
- **Nada de fórmulas vivas en el maestro.** Los valores se copian al crear la fila.
- **El NIT es del municipio**, no del banco. La columna se llama `nit_municipio`.

## Lo que hay que reemplazar antes de producción

- `assets/logo-davivienda.png` — el archivo oficial. Mientras no esté, la interfaz
  muestra un espacio reservado punteado con la palabra "logo". Si prefieres
  cargarlo en Drive, pon su id en CONFIG como `logo_id` y `apiLogo()` lo sirve.
- Las tres filas de prueba de `instalar()` y su soporte `.txt` en Drive, incluidos
  los correos `oficina.*@davivienda.com`, que son inventados.
- Las columnas `motivo_devuelta`, `estado_previo` y `reprocesos` las agregué yo:
  la máquina de estados exige guardar desde qué estado volvió una DEVUELTA y
  contar reprocesos, y no estaban en la lista original de columnas.
