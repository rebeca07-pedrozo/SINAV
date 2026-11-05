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
adelante, sus disparadores, son suyos. La primera vez que entra queda inscrita
sola en USUARIOS como `PROFESIONAL` de `MUNICIPALES`, nivel `I`; ver
[Roles y acceso](#roles-y-acceso).

---

## Las pruebas

```
node tools/pruebas.mjs
```

173 aserciones sobre las reglas donde un error silencioso se propaga: la
normalización de periodicidad, "sin soporte no hay envío", la normalización de
roles, el reparto de `medio_pago` en dos columnas, el emparejamiento de la carga
masiva y las métricas. Son funciones puras, así que corren igual en node y
dentro de Apps Script (menú SINAV → Correr pruebas, o la función `pruebas()`).

Ya encontraron errores reales: `normValor('$ 4.820.350')` devolvía vacío porque
leía los puntos de mil como decimales, y `armarId` no rellenaba el código DANE a
cinco dígitos.

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
  00_Constantes   esquemas de las hojas, estados, transiciones, permisos, roles
  01_Instalar     instalar() y migrar(), ambos idempotentes + el menú del Sheets
  02_Hojas        lectura y escritura en bloque, LockService, config()
  03_Roles        yo(), puede(), exige(), asegurarAlta() — el rol se resuelve aquí y solo aquí
  04_Normalizar   funciones puras: periodicidad, periodo, códigos, correos, valor, pago
  05_Eventos      el log append-only
  06_Estados      puedePasar(), puedeEnviar(), validarPaso(), aplicar()
  07_Obligaciones listar filtrado por rol, conteos, apiInicio()
  08_Soportes     subir el adjunto a Drive (carpeta por municipio) y pasar a LISTA
  09_Enviar       Gmail, hilo_id, cuota por persona, lotes con guardia de tiempo
  10_WebApp       doGet, include(), apiLogo()
  14_Campos       digitalización manual: apiGuardarCampos(), apiListaCampos()
  15_Carga        carga masiva: leer el nombre del PDF y emparejarlo, apiCargaPlan()
  16_Metricas     apiMetricas() — solo JEFE y ADMIN
  99_Pruebas      pruebas()
  ui/             Index, Estilos, Comun, Enviar, Carga, Campos, Metricas, App
```

Los huecos 11, 12 y 13 están reservados a propósito para Respuestas, Alertas y
Disparadores, que es lo que sigue.

En Apps Script todo vive en un solo ámbito global, así que el orden de los
archivos no importa: ninguno ejecuta nada al cargarse.

### Lo que falta (en orden)

1. **RESPUESTAS** — `11_Respuestas.gs` + `ui/Respuestas.html`. Busca sobre el
   `hilo_id` guardado al enviar, con `GmailApp.search` acotado a la etiqueta
   `SINAV`. Ahí entran también los disparadores por persona (`13_Disparadores.gs`)
   y el botón "Revisar respuestas ahora".

   **Pendiente de decidir antes de escribirlo:** los requerimientos piden
   además detectar el correo de `noreply@davivienda.com` y adjuntar el soporte
   de pago que indique. Eso **no** pasa por el `hilo_id`: ese remitente manda un
   correo nuevo, no una respuesta al hilo, así que hace falta otro mecanismo de
   emparejamiento leyendo el cuerpo del mensaje. Sin un ejemplo real de ese
   correo no se puede diseñar.
2. **ALERTAS** — `12_Alertas.gs` + `ui/Alertas.html`.
3. **Asignación** (JEFE) y **Configuración** (ADMIN). Las pestañas ya están en la
   navegación, con su marco y una línea que dice qué va a ir ahí.

### Si algún día quieren un build de verdad

El camino es **Vite + clasp**: el código de `src/ui` pasa a módulos, Vite arma un
bundle y `clasp push` lo sube. Hoy no, por el plazo: React 18 + htm desde CDN no
necesita compilar nada y se pega directo en el editor.

---

## Roles y acceso

El rol se resuelve **en el servidor**, con `Session.getActiveUser().getEmail()`
contra la hoja USUARIOS. Nunca se confía en lo que mande el cliente.

| rol | quién lo tiene | qué puede |
|---|---|---|
| `PROFESIONAL` | por defecto, para cualquier correo nuevo | sus propias obligaciones: soportes, digitalizar, enviar |
| `JEFE` | Elizabeth, a mano | todo lo anterior sobre cualquier obligación, más asignar, revisar, devolver y ver métricas |
| `ADMIN` | a mano | lo del JEFE, más CONFIG y USUARIOS |

La hoja USUARIOS tiene `correo`, `nombre`, `rol`, `activo`, `area` y `nivel`.
**Solo `rol` decide permisos.** `area` (`MUNICIPALES`) y `nivel` (`I`, `II`,
`III`) se guardan y se muestran — el pie de la barra lateral dice
"Profesional-I de municipales" — pero hoy no cambian lo que alguien puede
hacer. Si algún día hay que diferenciar un `PROFESIONAL-I` de un
`PROFESIONAL-II`, la condición se agrega en `PERMISO` y en ningún otro sitio.

### Alta automática

Un correo que entra y no está en USUARIOS queda inscrito solo, con los valores
por defecto de CONFIG (`rol_defecto` = `PROFESIONAL`, `area_defecto` =
`MUNICIPALES`, `nivel_defecto` = `I`). El JEFE y el ADMIN se siguen poniendo a
mano. Un correo que ya está con `activo = NO` **no** se reactiva: si se lo
quitaron, fue a propósito.

Esto automatiza el **rol**, no la entrada: como la aplicación se despliega
ejecutando como el usuario que accede, cada persona necesita de todos modos
permiso de edición sobre el libro, y eso se da a mano en Drive.

Dejar `rol_defecto` vacío en CONFIG apaga el alta automática y deja la lista
cerrada.

## Migrar un libro que ya existe

El menú **SINAV → Migrar columnas** (o la función `migrar()`) pasa un libro del
esquema viejo al nuevo. Es idempotente: correrlo dos veces no rompe nada.

Corre primero **Instalar / verificar**, que agrega las columnas, y después
**Migrar columnas**, que reparte los datos.

Qué cambió y por qué la migración es segura:

- **USUARIOS gana `area` y `nivel`, al final.** `asegurarHojas()` reescribe la
  fila de encabezados sin mover los datos de abajo, así que una columna nueva
  insertada en la mitad desalinearía todo el libro. Por eso van al final,
  aunque en pantalla se lean en otro orden.
- **`medio_pago` se llama ahora `paga_quien`, en el mismo sitio, y se agregó
  `forma_pago` al final.** Eran dos preguntas distintas en una sola columna:
  *Oficina / Pagaduría* es **quién** paga y *PSE / transferencia* es **cómo** se
  paga. `migrar()` deja el pagador en `paga_quien` y mueve a `forma_pago` lo que
  era una forma de pago. Un `forma_pago` que ya tenga valor no se toca, que es
  lo que hace que correrlo dos veces no borre nada.
- **Drive pasa a `SINAV/Soportes/<municipio>/<impuesto>/`.** Las carpetas se
  crean cuando hacen falta y su id se cachea en las propiedades del script,
  porque buscar carpetas es lo lento de una carga de cuarenta PDF.
  `migrar()` **no mueve** los archivos que ya estaban: se quedan donde están y
  sus enlaces siguen funcionando. Solo los nuevos van a la carpeta del
  municipio.

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

- **El logo.** Sube el archivo oficial a Drive y pon su id en
  **Configuración del proyecto → Propiedades del script → `logo_id`**. Es
  cableado del despliegue, no un parámetro del negocio, así que no ocupa una
  fila de CONFIG que los usuarios ven. Se acepta el id o el enlace completo, y
  la cuenta que despliega tiene que poder ver el archivo (los usuarios finales
  no necesitan permiso). Se sigue leyendo `CONFIG.logo_id` como respaldo.
  Mientras no haya id, la interfaz muestra el espacio reservado punteado.
- Las tres filas de prueba de `instalar()` y su soporte `.txt` en Drive, incluidos
  los correos `oficina.*@davivienda.com`, que son inventados.
- Las columnas `motivo_devuelta`, `estado_previo` y `reprocesos` las agregué yo:
  la máquina de estados exige guardar desde qué estado volvió una DEVUELTA y
  contar reprocesos, y no estaban en la lista original de columnas.
